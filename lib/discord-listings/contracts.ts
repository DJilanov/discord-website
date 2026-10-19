import { createHash } from "node:crypto";
import { z } from "zod";
import type { groupSchema, guildSchema } from "../validation";
import { formatGroupStart } from "../group-time";

export const listingGuildId = "1554316932948172940";
export const listingBotId = "1554796912673169428";
export const listingForums = {
  Alliance: {
    guild: "1554327206396690432",
    pve: "1555114488229797928",
    pvp: "1555115561028157460",
    scheduled: "1554327396990320741",
  },
  Horde: {
    guild: "1554327927750000661",
    pve: "1555115605986779228",
    pvp: "1555115622935822336",
    scheduled: "1554327956329865256",
  },
} as const;
export const listingForumIds: readonly string[] = Object.values(
  listingForums,
).flatMap((forums) => Object.values(forums));
export const discordId = z.string().regex(/^[1-9]\d{16,19}$/);
export const listingForumSchema = z.object({
  id: discordId,
  type: z.literal(15),
  guild_id: z.literal(listingGuildId),
  available_tags: z
    .array(
      z.object({
        id: discordId,
        name: z.string(),
        moderated: z.boolean(),
        emoji_id: z.string().nullable().optional(),
        emoji_name: z.string().nullable().optional(),
      }),
    )
    .max(20),
});
export const listingThreadSchema = z.object({
  id: discordId,
  type: z.literal(11),
  guild_id: z.literal(listingGuildId),
  parent_id: discordId,
  applied_tags: z.array(discordId).max(5).default([]),
});
export const listingMessageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
  attachments: z.array(z.object({ filename: z.string() })).default([]),
});
export interface ListingDraft {
  forumId: string;
  title: string;
  content: string;
  attachment: string | null;
  tagNames: string[];
}
export interface ListingJob extends ListingDraft {
  id: string;
  kind: "guild" | "group";
  entityId: string;
  status: string;
  threadId: string | null;
  verifiedTagId: string | null;
  lastAuditId: string | null;
  reviewNotificationStatus: string;
  reviewNotificationMessageId: string | null;
  reviewNotificationAttempts: number;
  reviewNotificationNextAttemptAt: Date;
  reviewNotificationError: string | null;
  reviewNotifiedAt: Date | null;
}

function plain(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[@`*_~\\]/g, "")
    .replace(/\r/g, "");
}
function draft(
  forumId: string,
  title: string,
  text: string,
  tagNames: string[],
  reference: string,
): ListingDraft {
  const marker = `Website reference: ${reference}\nContent checksum: ${createHash("sha256").update(text).digest("hex")}`;
  const footer = `\n\nSubmitted through wowforeverdiscord.online and published immediately.\nAdministrators: review this listing and hide or reject it on the website if needed.\n${marker}`;
  const full = `${text}${footer}`;
  const visible = plain(text);
  const attached = full.length > 1900 || visible !== text;
  return {
    forumId,
    title: plain(title).replace(/\n/g, " ").slice(0, 100) || "Website listing",
    content: attached
      ? `${visible.slice(0, 1900 - footer.length - 45)}\n[Full submitted details in listing.txt]${footer}`
      : full,
    attachment: attached ? full : null,
    tagNames,
  };
}

export function guildListingDraft(
  data: z.infer<typeof guildSchema>,
  reference: string,
): ListingDraft {
  const text = [
    data.name,
    `${data.region} | ${data.faction} | ${data.gameRuleset}`,
    `Language: ${data.language} | Playstyle: ${data.playstyle}`,
    `Raid days: ${data.raidDays.join(", ") || "Flexible"}`,
    `Raid time: ${data.raidTime} | Loot: ${data.lootSystem}`,
    `Recruiting: ${data.recruitingClasses.join(", ")}`,
    `Discord contact: ${data.contactDiscord}`,
    data.inviteUrl ? `Guild invite: ${data.inviteUrl}` : "",
    data.websiteUrl ? `Website: ${data.websiteUrl}` : "",
    "",
    data.description,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return draft(
    listingForums[data.faction].guild,
    data.name,
    text,
    [
      data.region === "OCE" ? "Other" : data.region,
      data.gameRuleset === "PvP" ? "PvP ruleset" : data.gameRuleset,
      "Recruiting",
    ],
    reference,
  );
}

export function groupListingDraft(
  data: z.infer<typeof groupSchema>,
  reference: string,
): ListingDraft {
  const kind =
    data.gameRuleset === "PvP" || data.activity === "PvP premade"
      ? "pvp"
      : ["Raid", "RP event"].includes(data.activity)
        ? "scheduled"
        : "pve";
  const text = [
    data.title,
    `${data.activity} | ${data.region} | ${data.faction} | ${data.gameRuleset}`,
    `Starts: ${formatGroupStart(data.startsAt, data.region)}`,
    `Discord contact: ${data.contactDiscord}`,
    "",
    data.description,
  ].join("\n");
  const tags = [data.region === "OCE" ? "Other" : data.region, "Open"];
  if (kind === "scheduled")
    tags.push(data.activity === "RP event" ? "RP" : "PvE");
  else {
    tags.push(data.gameRuleset === "PvP" ? "PvP ruleset" : data.gameRuleset);
    if (data.activity !== "PvP premade") tags.push(data.activity);
  }
  return draft(
    listingForums[data.faction][kind],
    data.title,
    text,
    tags,
    reference,
  );
}

export function listingDiscordUrl(threadId: string): string {
  return `https://discord.com/channels/${listingGuildId}/${discordId.parse(threadId)}`;
}

export function listingReviewNotification(job: ListingJob): string {
  const section = job.kind === "guild" ? "guilds" : "groups";
  const lines = [
    `New ${job.kind} listing is live and needs review.`,
    `**${plain(job.title)}**`,
    `Review or hide it: https://www.wowforeverdiscord.online/admin/${section}?edit=${encodeURIComponent(job.entityId)}`,
  ];
  if (job.threadId)
    lines.push(`Discord post: ${listingDiscordUrl(job.threadId)}`);
  else lines.push(`Discord forum delivery: ${job.status}.`);
  lines.push(`Reference: ${job.id}`);
  return lines.join("\n");
}

export function listingReviewNonce(jobId: string): string {
  return createHash("sha256")
    .update(`listing-review:${jobId}`)
    .digest("hex")
    .slice(0, 24);
}
