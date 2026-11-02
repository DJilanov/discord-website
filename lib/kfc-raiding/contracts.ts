import { z } from "zod";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import { discordId } from "../discord-audit";

export const editions = ["forever", "tbc"] as const;
export type Edition = (typeof editions)[number];
export const raidHelperId = "579155972115660803";
export const editionLabels: Record<Edition, string> = {
  forever: "WoW Forever",
  tbc: "TBC",
};
export const messageBindingSchema = z.object({
  channelId: discordId,
  messageId: discordId,
});
const spaceSchema = z.object({
  categoryId: discordId,
  schedule: messageBindingSchema,
  forumId: discordId,
  forumGuideId: discordId,
  chatId: discordId,
  alertRoleId: discordId,
  alerts: messageBindingSchema,
  tags: z.record(z.string(), discordId),
  helpId: discordId.optional(),
});
export const raidingConfigSchema = z.object({
  version: z.literal(1),
  guildId: z.literal(kfcGuildId),
  applicationId: z.literal(kfcApplicationId),
  hub: messageBindingSchema,
  spaces: z.object({ forever: spaceSchema, tbc: spaceSchema }),
  digestHour: z.number().int().min(0).max(23).default(18),
  digestsEnabled: z.boolean().default(false),
  explicitManagedIds: z
    .array(z.string().regex(/^[a-z0-9]{20,40}$/))
    .default([]),
  externalEditions: z.record(discordId, z.enum(editions)).default({}),
  managedNativeEvents: z
    .record(z.string().regex(/^[a-z0-9]{20,40}$/), discordId)
    .default({}),
});
export type RaidingConfig = z.infer<typeof raidingConfigSchema>;

export interface RaidSession {
  key: string;
  game: Edition;
  title: string;
  activity: string;
  eventType: string;
  startsAt: string;
  endsAt: string | null;
  status: "open" | "locked" | "cancelled" | "finished";
  signupUrl: string;
  sourceChannelId: string;
  sourceGuildId?: string;
  sourceMessageId: string;
  sourceForumId?: string;
  host: string | null;
  capacity: number | null;
  confirmed: number | null;
  registered: number | null;
  source: "managed" | "raid-helper";
}

export const raidSessionSchema: z.ZodType<RaidSession> = z.object({
  key: z.string(),
  game: z.enum(editions),
  title: z.string(),
  activity: z.string(),
  eventType: z.string(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(["open", "locked", "cancelled", "finished"]),
  signupUrl: z.string().url(),
  sourceChannelId: discordId,
  sourceGuildId: discordId.optional(),
  sourceMessageId: discordId,
  sourceForumId: discordId.optional(),
  host: z.string().nullable(),
  capacity: z.number().int().nullable(),
  confirmed: z.number().int().nullable(),
  registered: z.number().int().nullable(),
  source: z.enum(["managed", "raid-helper"]),
});

const deliverySchema = z.object({
  status: z.enum(["creating", "sent", "held"]),
  threadId: discordId.optional(),
  checksum: z.string().optional(),
  createdAt: z.string().optional(),
  error: z.string().optional(),
});
export const raidingStateSchema = z.object({
  posts: z.record(z.string(), deliverySchema).default({}),
  panels: z.record(z.string(), z.string()).default({}),
  subscriptions: z
    .object({
      forever: z.record(discordId, z.enum(["pending", "assigned"])).default({}),
      tbc: z.record(discordId, z.enum(["pending", "assigned"])).default({}),
    })
    .default({ forever: {}, tbc: {} }),
  digests: z
    .record(
      z.string(),
      z.object({
        status: z.enum(["creating", "sent", "held"]),
        messageId: discordId.optional(),
      }),
    )
    .default({}),
  lastSuccessAt: z.string().nullable().default(null),
  cachedSessions: z.array(raidSessionSchema).default([]),
  nativeChecksums: z.record(z.string(), z.string()).default({}),
});
export type RaidingState = z.infer<typeof raidingStateSchema>;
export const openingPublicationSchema = z.object({
  policy: messageBindingSchema.optional(),
  creatingPolicy: z.boolean().default(false),
  events: z
    .record(
      z.string(),
      z.object({
        eventId: z.string().optional(),
        threadId: discordId.optional(),
        nativeId: discordId.optional(),
        creatingForum: z.boolean().default(false),
        creatingNative: z.boolean().default(false),
      }),
    )
    .default({}),
});
export type OpeningPublication = z.infer<typeof openingPublicationSchema>;
export interface LinkButton {
  type: 2;
  style: 5;
  label: string;
  url: string;
}
export interface MessagePayload {
  content: string;
  embeds: Array<{
    title: string;
    description?: string;
    color?: number;
    footer?: { text: string };
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
  components: Array<{ type: 1; components: LinkButton[] }>;
  allowed_mentions: { parse: never[]; roles?: string[] };
  flags?: number;
}
export type DiscordMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type RaidingRequest = (
  route: string,
  method?: DiscordMethod,
  body?: unknown,
) => Promise<unknown>;

export const discordMessageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId, bot: z.boolean().optional() }),
  content: z.string().default(""),
  embeds: z
    .array(
      z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          footer: z.object({ text: z.string() }).optional(),
          fields: z
            .array(
              z.object({
                name: z.string(),
                value: z.string(),
                inline: z.boolean().optional(),
              }),
            )
            .optional(),
        })
        .passthrough(),
    )
    .default([]),
  components: z.array(z.unknown()).default([]),
});
