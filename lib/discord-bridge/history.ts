import { z } from "zod";
import {
  snowflake,
  type Bridge,
  type HistoryWindow,
  type SourceMessage,
} from "./contracts.ts";
import type { Sql } from "./store.ts";
import { payloadFingerprint } from "./policy.ts";

export const historyCreateSchema = z
  .object({
    bridgeId: z.uuid(),
    direction: z.enum(["both", "a_to_b", "b_to_a"]),
    fromAt: z.iso.datetime({ offset: true }),
    untilAt: z.iso.datetime({ offset: true }),
    limit: z.number().int().min(1).max(10000),
    reason: z.string().trim().min(5).max(300),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.fromAt) >= Date.parse("2015-01-01T00:00:00Z") &&
      Date.parse(v.fromAt) < Date.parse(v.untilAt) &&
      Date.parse(v.untilAt) <= Date.now(),
    "Select a past date range.",
  );
export const historyControlSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    action: z.enum(["start", "pause", "resume", "rollback"]),
    reason: z.string().trim().min(5).max(300),
    reviewed: z.literal(true).optional(),
    actorIds: z
      .array(snowflake)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
  })
  .strict();

export function historyPublicationAllowed(bridge: Bridge): boolean {
  return (
    ["ready", "active"].includes(bridge.state) &&
    Boolean(bridge.fingerprint && bridge.approvalA && bridge.approvalB)
  );
}

export function historyFingerprint(
  message: SourceMessage,
  key: string,
): string {
  return payloadFingerprint(
    JSON.stringify([
      message.id,
      message.channel_id,
      message.guild_id,
      message.author,
      message.content,
      message.timestamp,
      message.edited_timestamp || null,
      message.type,
      message.flags || 0,
      message.attachments,
      message.sticker_items || [],
      message.poll || null,
      message.webhook_id || null,
      message.message_reference || null,
      message.message_snapshots || [],
    ]),
    key,
  );
}

export async function historyWindow(
  sql: Sql,
  batchId: string | null,
  bridgeId: string,
  guildId: string,
  actorId: string,
): Promise<HistoryWindow | null> {
  if (!batchId) return null;
  return (
    (
      await sql.query<HistoryWindow>(
        `SELECT b."fromAt",b."untilAt",c."expiresAt" FROM "ForeverBridgeImport" b
    JOIN "ForeverBridgeImportConsent" c ON c."batchId"=b.id
    JOIN "ForeverDiscordBridge" p ON p.id=b."bridgeId"
    WHERE b.id=$1 AND b."bridgeId"=$2 AND c."guildId"=$3 AND c."actorId"=$4
    AND b.state IN ('importing','completed') AND c."withdrawnAt" IS NULL AND c."expiresAt">NOW() AND c."policyVersion"=p."policyVersion"
    AND b.fingerprint=p.fingerprint AND p.state IN ('ready','active') AND p."approvalA" IS NOT NULL AND p."approvalB" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "ForeverBridgeConsent" v WHERE v."bridgeId"=p.id AND v."actorId"=$4 AND v.blocked)
    AND ((c."guildId"=p."guildA" AND b.direction IN ('both','a_to_b')) OR (c."guildId"=p."guildB" AND b.direction IN ('both','b_to_a')))`,
        [batchId, bridgeId, guildId, actorId],
      )
    ).rows[0] || null
  );
}
