import { createHash } from "node:crypto";
import type { EventInput } from "./contracts";

export function eventCreationHash(input: EventInput): string {
  const {
    eventType,
    game,
    realm,
    discordChannelId,
    confirmDiscordPublication,
    leaderName,
    assistantName,
    ...legacyInput
  } = input;
  // Preserve pre-event-type request hashes for retries of existing events.
  const hashInput = {
    ...legacyInput,
    ...(eventType !== "raid" ? { eventType } : {}),
    ...(game !== "forever" ? { game, realm } : {}),
    ...(discordChannelId !== null ? { discordChannelId } : {}),
    ...(confirmDiscordPublication ? { confirmDiscordPublication } : {}),
    ...(leaderName ? { leaderName } : {}),
    ...(assistantName ? { assistantName } : {}),
  };
  return createHash("sha256").update(JSON.stringify(hashInput)).digest("hex");
}
