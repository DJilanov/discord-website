import { z } from "zod";

export const snowflake = z.string().regex(/^[1-9]\d{16,19}$/);
export const guilds = {
  kfc: "1411533815356194968",
  forever: "1554316932948172940",
} as const;
export const applicationId = "1554796912673169428";
export const policyVersion = 1;
export const bridgeStates = [
  "draft",
  "validating",
  "ready",
  "active",
  "paused",
  "retiring",
  "retired",
] as const;
export type BridgeState = (typeof bridgeStates)[number];
export type Mode = "cleanup_only" | "running" | "hard_stop";
export type MessageState = "held" | "live" | "removed";
export type ProjectionState =
  "pending" | "sending" | "live" | "uncertain" | "suppressed" | "removed";

export interface Bridge {
  id: string;
  name: string;
  guildA: string;
  channelA: string;
  guildB: string;
  channelB: string;
  direction: "two_way";
  state: BridgeState;
  reviewRequired: boolean;
  version: number;
  generation: number;
  policyVersion: number;
  activatedAt: Date | null;
  validatedAt: Date | null;
  fingerprint: string | null;
  approvalA: string | null;
  approvalB: string | null;
  noticeA: string | null;
  noticeB: string | null;
  moderatorIds: string[];
  blockedTerms: string[];
  reason: string | null;
  createdAt: Date;
}
export interface Consent {
  bridgeId: string;
  guildId: string;
  actorId: string;
  generation: number;
  policyVersion: number;
  optedAt: Date;
  withdrawnAt: Date | null;
  blocked: boolean;
}
export interface Root {
  id: string;
  bridgeId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  generation: number;
  revision: number;
  approvedRevision: number;
  state: MessageState;
  reason: string | null;
  parentId: string | null;
  sourceAt: Date;
  editedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}
export interface Projection {
  id: string;
  rootId: string;
  guildId: string;
  channelId: string;
  messageId: string | null;
  candidateId: string | null;
  nonce: string;
  state: ProjectionState;
  appliedRevision: number;
  fingerprint: string | null;
  checkedAt: Date | null;
  removedAt: Date | null;
}
export interface Job {
  id: string;
  bridgeId: string;
  rootId: string | null;
  operation: "deliver" | "remove" | "validate" | "resolve";
  revision: number;
  state: "pending" | "leased" | "done" | "cancelled" | "failed" | "uncertain";
  leaseToken: string | null;
  leaseUntil: Date | null;
  startedAt: Date | null;
  attempts: number;
  dueAt: Date;
  error: string | null;
}
export interface Runtime {
  id: string;
  mode: Mode;
  version: number;
  heartbeatAt: Date | null;
  build: string | null;
  gateway: string;
  leaderId: string | null;
  gapAt: Date | null;
  error: string | null;
}
export const sourceSchema = z.object({
  id: snowflake,
  channel_id: snowflake,
  guild_id: snowflake.optional(),
  author: z.object({
    id: snowflake,
    username: z.string().max(128),
    bot: z.boolean().optional(),
  }),
  content: z.string().max(16000),
  timestamp: z.iso.datetime({ offset: true }),
  edited_timestamp: z.iso.datetime({ offset: true }).nullable().optional(),
  type: z.number().int(),
  flags: z.number().int().optional(),
  webhook_id: snowflake.optional(),
  attachments: z.array(z.unknown()),
  sticker_items: z.array(z.unknown()).optional(),
  poll: z.unknown().optional(),
  message_snapshots: z.array(z.unknown()).optional(),
  message_reference: z
    .object({
      message_id: snowflake.optional(),
      channel_id: snowflake.optional(),
      type: z.number().optional(),
    })
    .optional(),
  nonce: z.union([z.string(), z.number()]).optional(),
});
export type SourceMessage = z.infer<typeof sourceSchema>;

export const createBridgeSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    channelA: snowflake,
    channelB: snowflake,
    direction: z.literal("two_way"),
  })
  .strict()
  .refine((v) => v.channelA !== v.channelB, "Select two different channels.");
export const controlSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    action: z.enum([
      "validate",
      "approve",
      "activate",
      "pause",
      "retire",
      "review",
      "suppress",
      "block",
      "unblock",
      "resolve",
      "configure",
    ]),
    rootId: z.uuid().optional(),
    actorId: snowflake.optional(),
    side: z.enum(["a", "b"]).optional(),
    link: z.string().max(200).optional(),
    reason: z.string().trim().min(5).max(300),
    reviewRequired: z.boolean().optional(),
    moderatorIds: z.array(z.string().min(1).max(80)).max(20).optional(),
    blockedTerms: z.array(z.string().trim().min(2).max(80)).max(40).optional(),
    approvals: z
      .object({
        membership: z.literal(true),
        retention: z.literal(true),
        moderation: z.literal(true),
        tests: z.literal(true),
      })
      .optional(),
  })
  .strict();
export type Control = z.infer<typeof controlSchema>;
export const modeSchema = z
  .object({
    mode: z.enum(["cleanup_only", "running", "hard_stop"]),
    version: z.number().int().positive(),
    reason: z.string().trim().min(5).max(300),
  })
  .strict();

export function opposite(
  bridge: Bridge,
  channelId: string,
): { guildId: string; channelId: string } | null {
  if (channelId === bridge.channelA)
    return { guildId: bridge.guildB, channelId: bridge.channelB };
  if (channelId === bridge.channelB)
    return { guildId: bridge.guildA, channelId: bridge.channelA };
  return null;
}
export function messageLink(
  guild: string,
  channel: string,
  message: string,
): string {
  return `https://discord.com/channels/${guild}/${channel}/${message}`;
}
export function parseMessageLink(
  value: string,
): { guildId: string; channelId: string; messageId: string } | null {
  const match =
    /^https:\/\/discord\.com\/channels\/([1-9]\d{16,19})\/([1-9]\d{16,19})\/([1-9]\d{16,19})$/.exec(
      value,
    );
  return match
    ? { guildId: match[1], channelId: match[2], messageId: match[3] }
    : null;
}
