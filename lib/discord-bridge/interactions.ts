import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  applicationId,
  guilds,
  parseMessageLink,
  snowflake,
  type Root,
} from "./contracts";
import { ephemeral, type EphemeralResponse } from "./commands";
import { encryptToken } from "./crypto";
import { audit, BridgeError, BridgeStore, one, removeRoots } from "./store";

const schema = z.object({
  type: z.union([z.literal(2), z.literal(3)]),
  id: snowflake,
  application_id: z.literal(applicationId),
  guild_id: z.enum([guilds.kfc, guilds.forever]),
  channel_id: snowflake,
  token: z.string().min(10).max(1024),
  member: z.object({
    user: z.object({ id: snowflake, bot: z.boolean().optional() }),
  }),
  data: z.object({
    name: z.string().optional(),
    custom_id: z.string().max(100).optional(),
    options: z
      .array(
        z.object({
          name: z.string(),
          type: z.number(),
          options: z
            .array(
              z.object({
                name: z.string(),
                type: z.number(),
                value: z.string().max(200),
              }),
            )
            .optional(),
        }),
      )
      .max(1)
      .optional(),
  }),
});
interface Receipt {
  id: string;
  actorId: string;
  guildId: string;
  bridgeId: string;
  generation: number;
  policyVersion: number;
  state: string;
  expiresAt: Date;
  ack: EphemeralResponse;
}
export function isBridgeInteraction(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || !("data" in raw)) return false;
  const data = raw.data;
  return (
    !!data &&
    typeof data === "object" &&
    (("name" in data && data.name === "bridge") ||
      ("custom_id" in data &&
        typeof data.custom_id === "string" &&
        data.custom_id.startsWith("bridge:")))
  );
}
export async function bridgeInteraction(
  raw: unknown,
  store: BridgeStore,
  secret: string | undefined,
): Promise<EphemeralResponse> {
  const value = schema.parse(raw);
  if (value.member.user.bot)
    throw new BridgeError(403, "human_participants_only");
  const actor = value.member.user.id;
  return store.transaction(async (sql) => {
    // Receipt locking makes Discord retries return the same response without replaying side effects.
    await sql.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,193003002))",
      [value.id],
    );
    const previous = await one<Receipt>(
      sql,
      'SELECT * FROM "ForeverDiscordInteraction" WHERE "id"=$1',
      [value.id],
    );
    if (previous) {
      const previousBridge = await store.bridge(previous.bridgeId, sql);
      if (
        previous.actorId !== actor ||
        previous.guildId !== value.guild_id ||
        value.channel_id !==
          (value.guild_id === previousBridge.guildA
            ? previousBridge.channelA
            : previousBridge.channelB)
      )
        throw new BridgeError(403, "receipt_identity_mismatch");
      return previous.ack;
    }
    const selected = await store.pairForChannel(
      value.guild_id,
      value.channel_id,
      sql,
    );
    if (!selected)
      return ephemeral(
        "This channel is not connected. Run /bridge inside the specific shared channel. No participation was changed. Contact a moderator privately if you can no longer access it and need copies removed.",
      );
    const bridge = await store.bridge(selected.id, sql, true);
    const recent = await one<{ count: number }>(
      sql,
      'SELECT COUNT(*)::int AS count FROM "ForeverDiscordInteraction" WHERE "actorId"=$1 AND "bridgeId"=$2 AND "createdAt">NOW()-INTERVAL \'1 minute\'',
      [actor, bridge.id],
    );
    if ((recent?.count || 0) >= 20)
      return ephemeral(
        "Too many bridge commands. Wait one minute and try again.",
      );
    const operation =
      value.type === 3 ? "confirm" : value.data.options?.[0]?.name;
    if (
      !["join", "status", "leave", "remove", "confirm"].includes(
        operation || "",
      )
    )
      throw new BridgeError(400, "unsupported_bridge_command");
    let ack: EphemeralResponse;
    let state = "done",
      tokenCipher: string | null = null,
      challengeId: string | null = null;
    const runtime = await store.runtime(sql);
    const healthy =
      runtime.gateway === "ready" &&
      runtime.mode === "running" &&
      !!runtime.heartbeatAt &&
      Date.now() - runtime.heartbeatAt.getTime() < 60000;
    if (operation === "status") {
      const consent = await store.consent(
        bridge.id,
        value.guild_id,
        actor,
        sql,
      );
      const outstanding = await one<{ count: number }>(
        sql,
        `SELECT COUNT(*)::int AS count FROM "ForeverBridgeProjection" p JOIN "ForeverBridgeMessage" m ON m."id"=p."rootId"
        WHERE m."bridgeId"=$1 AND m."authorId"=$2 AND m."state"='removed' AND p."state" NOT IN ('removed','suppressed')`,
        [bridge.id, actor],
      );
      const participating =
        consent &&
        !consent.withdrawnAt &&
        !consent.blocked &&
        consent.generation === bridge.generation;
      ack = ephemeral(
        `Channel pair: ${bridge.name} (${bridge.state}). Your participation from this channel: ${consent?.blocked ? "blocked by staff" : participating ? "opted in" : "not opted in"}. Copies awaiting removal: ${outstanding?.count || 0}. Other pairs have separate participation.`,
      );
    } else if (operation === "leave") {
      await store.withdraw(sql, bridge, actor);
      ack = ephemeral(
        "Sharing has stopped for you in both directions of this channel pair. Removal of its managed copies and reply chains is queued. Other pairs are unchanged; use /bridge leave in each pair you want to leave. Your originals remain. Cleanup can be delayed by outages or a hard stop.",
      );
      await audit(sql, `discord:${actor}`, bridge.id, "consent_withdrawn");
    } else if (operation === "remove") {
      const link = parseMessageLink(
        value.data.options?.[0]?.options?.find((v) => v.name === "message")
          ?.value || "",
      );
      if (!link) throw new BridgeError(400, "invalid_message_link");
      const root = await one<Root>(
        sql,
        `SELECT m.* FROM "ForeverBridgeMessage" m JOIN "ForeverBridgeProjection" p ON p."rootId"=m."id"
        WHERE m."bridgeId"=$1 AND m."authorId"=$2 AND ((m."guildId"=$3 AND m."channelId"=$4 AND m."messageId"=$5) OR (p."guildId"=$3 AND p."channelId"=$4 AND p."messageId"=$5))`,
        [bridge.id, actor, link.guildId, link.channelId, link.messageId],
      );
      if (!root) throw new BridgeError(404, "owned_relay_not_found");
      await removeRoots(sql, bridge.id, [root.id], "author_removed");
      await audit(sql, `discord:${actor}`, bridge.id, "author_removal", {
        rootId: root.id,
      });
      ack = ephemeral(
        "Removal is queued for that shared copy and its managed reply chain. Human originals are not deleted.",
      );
    } else if (!healthy || bridge.state !== "active" || !secret) {
      ack = ephemeral(
        "New participation is currently unavailable. No consent was recorded. Leave and removal requests remain available.",
      );
    } else if (operation === "join") {
      const consent = await store.consent(
        bridge.id,
        value.guild_id,
        actor,
        sql,
      );
      if (consent?.blocked)
        return ephemeral(
          "Your participation is blocked by staff. Contact a shared-channel moderator.",
        );
      challengeId = randomBytes(18).toString("hex");
      state = "challenge";
      ack = ephemeral(
        `This is a TWO-WAY shared conversation between KFC Global Pugs and WoW Forever Discord. This confirmation covers only <#${bridge.channelA}> and <#${bridge.channelB}>. Only new eligible text after you opt in is copied, with your Discord name and a source link. You must belong to and be able to speak in BOTH channels. Readers in the other community may not have access to your original channel. Copies expire after 30 days. The service stores IDs and consent, not a chat transcript. Use /bridge leave or /bridge remove in this channel to request cleanup; outages can delay it.\nTerms, privacy and removal: https://www.wowforeverdiscord.online/bot/shared-channels\nConfirm only if you accept both audiences (policy ${bridge.policyVersion}). Opt in separately in each channel you want to share from; other pairs are not included.`,
      );
      ack.data.components = [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "I agree to share new messages",
              custom_id: `bridge:${challengeId}`,
            },
          ],
        },
      ];
    } else {
      const challenge = await one<Receipt>(
        sql,
        'SELECT * FROM "ForeverDiscordInteraction" WHERE "challengeId"=$1 FOR UPDATE',
        [value.data.custom_id?.slice(7)],
      );
      if (
        !challenge ||
        challenge.state !== "challenge" ||
        challenge.actorId !== actor ||
        challenge.guildId !== value.guild_id ||
        challenge.bridgeId !== bridge.id ||
        challenge.generation !== bridge.generation ||
        challenge.policyVersion !== bridge.policyVersion ||
        challenge.expiresAt.getTime() <= Date.now()
      )
        throw new BridgeError(
          403,
          "consent_confirmation_expired_or_mismatched",
        );
      await sql.query(
        'UPDATE "ForeverDiscordInteraction" SET "state"=\'done\' WHERE "id"=$1',
        [challenge.id],
      );
      ack = { type: 5, data: { flags: 64 } };
      tokenCipher = encryptToken(value.token, secret, value.id);
      state = "pending";
    }
    await sql.query(
      'INSERT INTO "ForeverDiscordInteraction" ("id","applicationId","guildId","actorId","bridgeId","operation","generation","policyVersion","ack","state","tokenCipher","challengeId","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()+INTERVAL \'5 minutes\')',
      [
        value.id,
        applicationId,
        value.guild_id,
        actor,
        bridge.id,
        operation,
        bridge.generation,
        bridge.policyVersion,
        JSON.stringify(ack),
        state,
        tokenCipher,
        challengeId,
      ],
    );
    return ack;
  });
}
