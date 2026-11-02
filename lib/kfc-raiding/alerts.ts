import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import { discordId } from "../discord-audit";
import {
  discordMessageSchema,
  editionLabels,
  editions,
  type Edition,
  type RaidSession,
  type RaidingConfig,
  type RaidingState,
} from "./contracts";
import { localDigestDate, safeText, upcomingSessions } from "./presentation";
import type { RaidingStore } from "./storage";
import { RaidingHttpError, type RaidingClient } from "./transport";

export async function syncAlertSubscriptions(
  game: Edition,
  config: RaidingConfig,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
): Promise<void> {
  const space = config.spaces[game];
  const guide = discordMessageSchema.parse(
    await client.request(
      `/channels/${space.alerts.channelId}/messages/${space.alerts.messageId}`,
    ),
  );
  if (guide.author.id !== kfcApplicationId || !guide.author.bot)
    throw new Error("Alert guide ownership mismatch.");
  const users = new Set<string>();
  let after = "";
  for (let page = 0; page < 20; page++) {
    const batch = z
      .array(z.object({ id: discordId, bot: z.boolean().optional() }))
      .parse(
        await client.request(
          `/channels/${space.alerts.channelId}/messages/${space.alerts.messageId}/reactions/%F0%9F%94%94?limit=100${after ? `&after=${after}` : ""}`,
        ),
      );
    for (const user of batch) if (!user.bot) users.add(user.id);
    if (batch.length < 100) break;
    if (page === 19)
      throw new Error(
        "Alert subscriptions exceed the review budget; no partial role changes applied.",
      );
    after = batch[batch.length - 1].id;
  }
  const records = state.subscriptions[game];
  for (const id of new Set([...users, ...Object.keys(records)])) {
    // Stable opt-ins need no member lookup and do not undo a moderator's role edit.
    if (users.has(id) && records[id] === "assigned") continue;
    client.allowSubscriber(id);
    let member: { roles: string[] };
    try {
      member = z
        .object({ roles: z.array(discordId) })
        .parse(await client.request(`/guilds/${kfcGuildId}/members/${id}`));
    } catch (error: unknown) {
      if (error instanceof RaidingHttpError && error.status === 404) {
        delete records[id];
        continue;
      }
      throw error;
    }
    const assigned = member.roles.includes(space.alertRoleId);
    if (users.has(id)) {
      if (assigned) {
        if (records[id]) records[id] = "assigned";
        continue;
      }
      records[id] = "pending";
      await store.save(state);
      await client.request(
        `/guilds/${kfcGuildId}/members/${id}/roles/${space.alertRoleId}`,
        "PUT",
      );
      records[id] = "assigned";
      await store.save(state);
    } else if (records[id]) {
      if (assigned)
        await client.request(
          `/guilds/${kfcGuildId}/members/${id}/roles/${space.alertRoleId}`,
          "DELETE",
        );
      delete records[id];
      await store.save(state);
    }
  }
}

export async function deliverDigests(
  sessions: readonly RaidSession[],
  config: RaidingConfig,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
  now: Date,
): Promise<void> {
  if (!config.digestsEnabled) return;
  const date = localDigestDate(now, config.digestHour);
  if (!date) return;
  for (const game of editions) {
    const space = config.spaces[game];
    const key = `${game}:${date}`;
    if (
      state.digests[key]?.status === "sent" ||
      state.digests[key]?.status === "held"
    )
      continue;
    const marker = `KFC raid digest ${key}`;
    if (state.digests[key]?.status === "creating") {
      const messages = z
        .array(discordMessageSchema)
        .parse(
          await client.request(
            `/channels/${space.schedule.channelId}/messages?limit=100`,
          ),
        );
      const matching = messages.filter(
        (message): boolean =>
          message.author.id === kfcApplicationId &&
          message.embeds.some(
            (embed): boolean => embed.footer?.text === marker,
          ),
      );
      state.digests[key] =
        matching.length === 1
          ? { status: "sent", messageId: matching[0].id }
          : { status: "held" };
      await store.save(state);
      continue;
    }
    const upcoming = upcomingSessions(sessions, game, now, 1).filter(
      (session): boolean =>
        session.eventType === "raid" &&
        Date.parse(session.startsAt) > now.getTime(),
    );
    if (!upcoming.length || !Object.keys(state.subscriptions[game]).length)
      continue;
    state.digests[key] = { status: "creating" };
    await store.save(state);
    await store.journal({ operation: "digest", key, stage: "creating" });
    const message = discordMessageSchema.parse(
      await client.request(
        `/channels/${space.schedule.channelId}/messages`,
        "POST",
        {
          content: `<@&${space.alertRoleId}>`,
          embeds: [
            {
              title: `${editionLabels[game]} · Next 24 hours`,
              description: upcoming
                .slice(0, 8)
                .map(
                  (session): string =>
                    `[${safeText(session.title, 90)}](${session.signupUrl}) · <t:${Math.floor(Date.parse(session.startsAt) / 1000)}:f>`,
                )
                .join("\n\n"),
              footer: { text: marker },
            },
          ],
          components: [],
          allowed_mentions: { parse: [], roles: [space.alertRoleId] },
        },
      ),
    );
    if (
      message.author.id !== kfcApplicationId ||
      message.channel_id !== space.schedule.channelId
    )
      throw new Error("Digest identity mismatch.");
    state.digests[key] = { status: "sent", messageId: message.id };
    await store.save(state);
  }
}
