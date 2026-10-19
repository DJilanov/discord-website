import { z } from "zod";
import { raidsEnabled, memberBetaEnabled } from "./config";
import { HttpError } from "@/lib/security";

const settingsSchema = z.object({
  guildId: z.string().regex(/^\d{17,20}$/),
  applicationId: z.string().regex(/^\d{17,20}$/),
  channelId: z.string().regex(/^\d{17,20}$/),
  origin: z.string().url(),
  token: z.string().min(1),
});
export type RaidDiscordSettings = z.infer<typeof settingsSchema> & {
  visibility?: "private" | "community";
};
export interface RaidDiscordDestination extends RaidDiscordSettings {
  label: string;
}
export interface RaidDiscordDestinationView {
  guildId: string;
  channelId: string;
  label: string;
  visibility: "private" | "community";
}

export function raidDiscordSettings(): RaidDiscordSettings | null {
  if (!raidsEnabled() || process.env.FOREVER_RAIDS_DISCORD_ENABLED !== "true")
    return null;
  const result = settingsSchema.safeParse({
    guildId: process.env.DISCORD_GUILD_ID || process.env.KFCBOT_GUILD_ID,
    applicationId:
      process.env.DISCORD_APPLICATION_ID || process.env.KFCBOT_APPLICATION_ID,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
    channelId: process.env.FOREVER_RAIDS_DISCORD_CHANNEL_ID,
    origin: process.env.FOREVER_RAIDS_PUBLIC_ORIGIN,
  });
  if (!result.success) return null;
  const url = new URL(result.data.origin);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    (process.env.NODE_ENV === "production" && local)
  )
    return null;
  return { ...result.data, origin: url.origin };
}

export function raidDiscordDestinations(): RaidDiscordDestination[] {
  const settings = raidDiscordSettings();
  if (!settings) return [];
  const raw = process.env.FOREVER_RAIDS_DISCORD_DESTINATIONS;
  let extra: unknown = [];
  try {
    if (raw?.trim()) extra = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid raid Discord destinations JSON.");
  }
  const result = z
    .array(
      z
        .object({
          channelId: settingsSchema.shape.channelId,
          guildId: settingsSchema.shape.guildId.optional(),
          label: z.string().trim().min(1).max(80),
        })
        .strict(),
    )
    .max(20)
    .safeParse(extra);
  if (!result.success)
    throw new Error("Invalid raid Discord destinations configuration.");
  const betaChannel = process.env.FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID;
  const destinations: RaidDiscordDestination[] = [
    ...(memberBetaEnabled() && betaChannel
      ? [
          {
            ...settings,
            channelId: settingsSchema.shape.channelId.parse(betaChannel),
            label:
              process.env.FOREVER_RAIDS_BETA_DISCORD_CHANNEL_LABEL ||
              "Community event beta",
            visibility: "community" as const,
          },
        ]
      : []),
    { ...settings, label: "Private raid-manager test", visibility: "private" },
    ...result.data.map((entry) => ({
      ...settings,
      ...entry,
      guildId: entry.guildId ?? settings.guildId,
      visibility: "private" as const,
    })),
  ];
  if (
    new Set(destinations.map((entry) => entry.channelId)).size !==
    destinations.length
  )
    throw new Error("Raid Discord destinations must have unique channel IDs.");
  return destinations;
}

export function raidDiscordDestination(
  channelId: string | null,
): RaidDiscordDestination | null {
  const destinations = raidDiscordDestinations();
  if (channelId === null) return destinations[0] ?? null;
  const selected = destinations.find((entry) => entry.channelId === channelId);
  if (!selected)
    throw new HttpError(400, "Choose an approved private Discord channel.");
  return selected;
}

export function raidDestinationForPost(post: {
  guildId: string;
  channelId: string;
  origin: string;
  visibility?: string;
  confirmedAt?: Date | null;
  label?: string;
}): RaidDiscordDestination | null {
  if (post.visibility === "community") {
    const settings = raidDiscordSettings();
    return settings &&
      post.confirmedAt &&
      raidDiscordGuildIds().includes(post.guildId) &&
      post.origin === settings.origin
      ? {
          ...settings,
          guildId: post.guildId,
          channelId: post.channelId,
          label: post.label || "Community channel",
          visibility: "community",
        }
      : null;
  }
  return (
    raidDiscordDestinations().find(
      (entry) =>
        entry.guildId === post.guildId &&
        entry.channelId === post.channelId &&
        entry.origin === post.origin,
    ) ?? null
  );
}

export function raidDiscordDestinationViews(): RaidDiscordDestinationView[] {
  return raidDiscordDestinations().map(
    ({ guildId, channelId, label, visibility }) => ({
      guildId,
      channelId,
      label,
      visibility: visibility ?? "private",
    }),
  );
}

export function raidDiscordGuildIds(): string[] {
  if (!raidDiscordSettings()) return [];
  const feedback =
    process.env.FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS ??
    "1411533815356194968";
  const ids = z
    .array(settingsSchema.shape.guildId)
    .max(10)
    .parse(
      feedback
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  return [
    ...new Set([
      ...raidDiscordDestinations().map((entry) => entry.guildId),
      ...ids,
    ]),
  ];
}
