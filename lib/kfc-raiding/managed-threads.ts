import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import { checksum, managedThreadTitle } from "./presentation";
import type { RaidSession, RaidingConfig, RaidingState } from "./contracts";
import type { RaidingClient } from "./transport";
import type { RaidingStore } from "./storage";

export const managedThreadSchema = z.object({
  id: z.string(),
  guild_id: z.literal(kfcGuildId),
  type: z.literal(11),
  parent_id: z.string(),
  owner_id: z.literal(kfcApplicationId),
  name: z.string(),
  thread_metadata: z.object({ archived: z.boolean(), locked: z.boolean() }),
});

export async function syncManagedThread(
  session: RaidSession,
  raw: unknown,
  config: RaidingConfig,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
  now: Date,
): Promise<void> {
  const thread = managedThreadSchema.parse(raw);
  if (
    thread.id !== session.sourceChannelId ||
    thread.parent_id !== config.spaces[session.game].forumId
  )
    throw new Error("Managed thread identity changed.");
  if (
    thread.thread_metadata.locked ||
    Date.parse(session.startsAt) <= now.getTime()
  )
    return;
  const desired = managedThreadTitle(session),
    key = `managed-thread:${thread.id}`;
  const actual = checksum(thread.name);
  if (
    thread.name !== desired &&
    state.panels[key] &&
    state.panels[key] !== actual
  ) {
    await store.journal({
      operation: "managed-thread-held",
      threadId: thread.id,
      reason: "Thread title changed outside synchronization.",
    });
    return;
  }
  if (thread.name !== desired || thread.thread_metadata.archived) {
    client.allowOwnedThread(thread.id);
    await store.journal({
      operation: "managed-thread-edit",
      threadId: thread.id,
      before: thread.name,
      desired,
    });
    const after = managedThreadSchema.parse(
      await client.request(`/channels/${thread.id}`, "PATCH", {
        name: desired,
        ...(thread.thread_metadata.archived ? { archived: false } : {}),
      }),
    );
    if (
      after.id !== thread.id ||
      after.name !== desired ||
      after.thread_metadata.archived
    )
      throw new Error("Managed thread update readback mismatch.");
  }
  state.panels[key] = checksum(desired);
}
