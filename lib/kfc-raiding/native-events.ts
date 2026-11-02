import { z } from "zod";
import { kfcGuildId } from "../../content/kfc-community";
import { discordId } from "../discord-audit";
import type { RaidSession, RaidingConfig, RaidingState } from "./contracts";
import { checksum } from "./presentation";
import type { RaidingStore } from "./storage";
import type { RaidingClient } from "./transport";

export const managedNativeEventSchema = z.object({
  id: discordId,
  guild_id: z.literal(kfcGuildId),
  entity_type: z.literal(3),
  name: z.string(),
  scheduled_start_time: z.string().datetime({ offset: true }),
  scheduled_end_time: z.string().datetime({ offset: true }),
  status: z.number().int(),
});

export function nativeOwnedFields(
  raw: z.infer<typeof managedNativeEventSchema>,
): object {
  return {
    name: raw.name,
    scheduled_start_time: new Date(raw.scheduled_start_time).toISOString(),
    scheduled_end_time: new Date(raw.scheduled_end_time).toISOString(),
    status: raw.status,
  };
}

export async function syncManagedNativeEvents(
  sessions: readonly RaidSession[],
  config: RaidingConfig,
  state: RaidingState,
  store: RaidingStore,
  client: RaidingClient,
  now: Date,
  nativeRaw?: unknown,
): Promise<void> {
  if (!Object.keys(config.managedNativeEvents).length) return;
  const list = z
    .array(z.unknown())
    .parse(
      nativeRaw ??
        (await client.request(`/guilds/${kfcGuildId}/scheduled-events`)),
    );
  const nativeEvents = list.flatMap(
    (raw): z.infer<typeof managedNativeEventSchema>[] => {
      const parsed = managedNativeEventSchema.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    },
  );
  for (const [eventId, nativeId] of Object.entries(
    config.managedNativeEvents,
  )) {
    const session = sessions.find(
      (entry): boolean => entry.key === `managed:${eventId}`,
    );
    if (!session?.endsAt || Date.parse(session.startsAt) <= now.getTime())
      continue;
    const route = `/guilds/${kfcGuildId}/scheduled-events/${nativeId}`;
    const current = nativeEvents.find(
      (entry): boolean => entry.id === nativeId,
    );
    if (!current || current.status !== 1) continue;
    const desired = {
      name: [...session.title].slice(0, 100).join(""),
      scheduled_start_time: new Date(session.startsAt).toISOString(),
      scheduled_end_time: new Date(session.endsAt).toISOString(),
      status: session.status === "cancelled" ? 4 : 1,
    };
    const currentHash = checksum(nativeOwnedFields(current));
    const desiredHash = checksum(desired);
    if (currentHash === desiredHash) {
      state.nativeChecksums[nativeId] = currentHash;
      continue;
    }
    if (state.nativeChecksums[nativeId] !== currentHash) {
      await store.journal({
        operation: "native-held",
        eventId,
        nativeId,
        reason: "Native event changed outside synchronization.",
      });
      continue;
    }
    const patch =
      session.status === "cancelled"
        ? { status: 4 }
        : {
            name: desired.name,
            scheduled_start_time: desired.scheduled_start_time,
            scheduled_end_time: desired.scheduled_end_time,
          };
    await store.journal({
      operation: "native-edit",
      eventId,
      nativeId,
      before: currentHash,
      desired: desiredHash,
    });
    await client.request(route, "PATCH", patch);
    const after = managedNativeEventSchema.parse(await client.request(route));
    if (
      after.id !== nativeId ||
      checksum(nativeOwnedFields(after)) !== desiredHash
    )
      throw new Error("Native event readback mismatch.");
    state.nativeChecksums[nativeId] = desiredHash;
    await store.save(state);
  }
}
