import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import { discordId } from "../discord-audit";
import {
  discordMessageSchema,
  type MessagePayload,
  type RaidSession,
  type RaidingConfig,
  type RaidingState,
} from "./contracts";
import {
  checksum,
  sessionMarker,
  sessionPanel,
  sessionTitle,
} from "./presentation";
import type { RaidingClient } from "./transport";
import type { RaidingStore } from "./storage";

export function editableMessage(raw: unknown): unknown {
  const message = z
    .object({
      content: z.string().default(""),
      embeds: z
        .array(
          z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            color: z.number().optional(),
            footer: z.object({ text: z.string() }).optional(),
            fields: z
              .array(
                z.object({
                  name: z.string(),
                  value: z.string(),
                  inline: z.boolean().default(false),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
      components: z
        .array(
          z.object({
            type: z.literal(1),
            components: z.array(
              z.object({
                type: z.literal(2),
                style: z.literal(5),
                label: z.string(),
                url: z.string(),
                disabled: z.boolean().default(false),
              }),
            ),
          }),
        )
        .default([]),
    })
    .parse(raw);
  return message;
}

export async function updateOwnedMessage(
  key: string,
  channelId: string,
  messageId: string,
  payload: MessagePayload,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
): Promise<void> {
  const route = `/channels/${channelId}/messages/${messageId}`;
  const before = discordMessageSchema.parse(await client.request(route));
  if (
    before.author.id !== kfcApplicationId ||
    !before.author.bot ||
    before.id !== messageId ||
    before.channel_id !== channelId
  )
    throw new Error("Raiding message ownership mismatch.");
  const current = checksum(editableMessage(before));
  const desired = checksum(editableMessage(payload));
  if (current === desired) {
    state.panels[key] = desired;
    return;
  }
  if (state.panels[key] && state.panels[key] !== current)
    throw new Error(`Raiding message ${key} changed outside this worker.`);
  await store.journal({
    operation: "edit",
    key,
    channelId,
    messageId,
    before: current,
    desired,
  });
  await client.request(route, "PATCH", payload);
  const after = discordMessageSchema.parse(await client.request(route));
  if (
    after.id !== messageId ||
    after.author.id !== kfcApplicationId ||
    checksum(editableMessage(after)) !== desired
  )
    throw new Error("Raiding message readback mismatch.");
  state.panels[key] = desired;
  await store.save(state);
}

const threadSchema = z.object({
  id: discordId,
  guild_id: z.literal(kfcGuildId),
  parent_id: discordId,
  owner_id: z.literal(kfcApplicationId),
  name: z.string(),
  type: z.literal(11),
  applied_tags: z.array(discordId).default([]),
  thread_metadata: z.object({ archived: z.boolean(), locked: z.boolean() }),
});

async function recoverThread(
  forumId: string,
  marker: string,
  client: RaidingClient,
): Promise<string | null> {
  const found: string[] = [];
  for (const route of [
    `/guilds/${kfcGuildId}/threads/active`,
    `/channels/${forumId}/threads/archived/public?limit=100`,
  ]) {
    const list = z
      .object({ threads: z.array(z.unknown()) })
      .parse(await client.request(route));
    for (const raw of list.threads) {
      const parsed = threadSchema.safeParse(raw);
      if (
        !parsed.success ||
        parsed.data.parent_id !== forumId ||
        found.includes(parsed.data.id)
      )
        continue;
      client.allowChannel(parsed.data.id);
      const starter = discordMessageSchema.parse(
        await client.request(
          `/channels/${parsed.data.id}/messages/${parsed.data.id}`,
        ),
      );
      if (
        starter.author.id === kfcApplicationId &&
        starter.embeds.some((embed): boolean => embed.footer?.text === marker)
      )
        found.push(parsed.data.id);
    }
  }
  if (found.length > 1)
    throw new Error(
      "Multiple forum posts match a session; manual reconciliation required.",
    );
  return found[0] ?? null;
}

export async function deliverSession(
  session: RaidSession,
  config: RaidingConfig,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
  now: Date,
): Promise<void> {
  const space = config.spaces[session.game];
  const previous = state.posts[session.key];
  if (
    !previous &&
    (session.status === "cancelled" ||
      Date.parse(session.startsAt) <= now.getTime())
  )
    return;
  let threadId = previous?.threadId;
  if (!threadId && previous) {
    threadId =
      (await recoverThread(
        space.forumId,
        sessionMarker(session.key),
        client,
      )) ?? undefined;
    if (!threadId)
      throw new Error(
        `Uncertain forum creation for ${session.key}; not repeated.`,
      );
  }
  if (!threadId) {
    state.posts[session.key] = {
      status: "creating",
      createdAt: now.toISOString(),
    };
    await store.save(state);
    await store.journal({
      operation: "create-session",
      key: session.key,
      forumId: space.forumId,
    });
    const tags = [space.tags.Open].filter((id): id is string => !!id);
    const created = threadSchema.parse(
      await client.request(`/channels/${space.forumId}/threads`, "POST", {
        name: sessionTitle(session),
        auto_archive_duration: 10080,
        applied_tags: tags,
        message: sessionPanel(session),
      }),
    );
    if (created.parent_id !== space.forumId)
      throw new Error("Created raid thread has a different destination.");
    threadId = created.id;
    state.posts[session.key] = {
      status: "sent",
      threadId,
      createdAt: now.toISOString(),
    };
    await store.save(state);
  }
  client.allowChannel(threadId);
  const thread = threadSchema.parse(
    await client.request(`/channels/${threadId}`),
  );
  if (thread.id !== threadId || thread.parent_id !== space.forumId)
    throw new Error("Raid thread destination changed.");
  client.allowOwnedThread(threadId);
  const finished =
    session.status === "cancelled" || session.status === "finished";
  const desired = sessionPanel(session);
  const panelKey = `session:${session.key}`;
  if (thread.thread_metadata.locked && !finished)
    throw new Error("Raid thread was locked by a moderator; not reopened.");
  const starter = discordMessageSchema.parse(
    await client.request(`/channels/${threadId}/messages/${threadId}`),
  );
  if (
    !starter.embeds.some(
      (embed): boolean => embed.footer?.text === sessionMarker(session.key),
    )
  )
    throw new Error("Raid thread marker changed.");
  const changed =
    checksum(editableMessage(starter)) !== checksum(editableMessage(desired));
  if (
    thread.thread_metadata.archived &&
    (changed || (!finished && Date.parse(session.startsAt) > now.getTime()))
  )
    await client.request(`/channels/${threadId}`, "PATCH", { archived: false });
  await updateOwnedMessage(
    panelKey,
    threadId,
    threadId,
    desired,
    state,
    store,
    client,
  );
  const statusTag =
    space.tags[
      session.status === "cancelled"
        ? "Cancelled"
        : session.status === "locked"
          ? "Signup closed"
          : session.status === "finished"
            ? "Finished"
            : "Open"
    ];
  const name = sessionTitle(session);
  const closing =
    finished && Date.parse(session.startsAt) + 7 * 86400000 <= now.getTime();
  if (
    thread.name !== name ||
    (statusTag && !thread.applied_tags.includes(statusTag)) ||
    (closing && !thread.thread_metadata.archived)
  )
    await client.request(`/channels/${threadId}`, "PATCH", {
      name,
      ...(statusTag ? { applied_tags: [statusTag] } : {}),
      ...(closing ? { archived: true } : {}),
    });
  state.posts[session.key] = {
    ...state.posts[session.key],
    status: "sent",
    threadId,
  };
  await store.save(state);
}
