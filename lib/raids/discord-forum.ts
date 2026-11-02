import { z } from "zod";
import { auditChannelSchema, discordId } from "@/lib/discord-audit";
import {
  listingForums,
  listingGuildId,
} from "@/lib/discord-listings/contracts";
import { kfcGuildId } from "../../content/kfc-community";
import { kfcRaidForumIds } from "../../content/kfc-raiding";

const groupForums: readonly string[] = Object.values(listingForums).flatMap(
  ({ pve, pvp, scheduled }) => [pve, pvp, scheduled],
);

export const raidForumThreadSchema = z
  .object({
    id: discordId,
    guild_id: z.union([z.literal(listingGuildId), z.literal(kfcGuildId)]),
    parent_id: discordId,
    owner_id: discordId,
    type: z.literal(11),
    name: z.string(),
    thread_metadata: z.object({ archived: z.boolean(), locked: z.boolean() }),
  })
  .refine((thread): boolean =>
    thread.guild_id === listingGuildId
      ? groupForums.includes(thread.parent_id)
      : Object.values(kfcRaidForumIds).some(
          (id): boolean => id === thread.parent_id,
        ),
  );

export type RaidForumThread = z.infer<typeof raidForumThreadSchema>;

export function raidForumChannel(
  thread: RaidForumThread,
  rawParent: unknown,
  botId: string,
): z.infer<typeof auditChannelSchema> {
  const parent = auditChannelSchema.parse(rawParent);
  if (
    parent.type !== 15 ||
    parent.id !== thread.parent_id ||
    parent.guild_id !== thread.guild_id ||
    thread.owner_id !== botId ||
    thread.thread_metadata.locked
  )
    throw new Error("raid_forum_thread_identity_or_access_mismatch");
  // Public forum threads inherit the forum's overwrites, not category overwrites.
  return {
    ...parent,
    id: thread.id,
    type: 11,
    name: thread.name,
    parent_id: parent.id,
  };
}
