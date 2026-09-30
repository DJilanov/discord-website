import { createHmac } from "node:crypto";
import {
  messageLink,
  type Bridge,
  type Consent,
  type SourceMessage,
} from "./contracts.ts";

export function publicationAllowed(
  bridge: Bridge,
  actorId: string,
  now = Date.now(),
): boolean {
  return (
    bridge.state === "active" ||
    (bridge.state === "pilot" &&
      bridge.reviewRequired &&
      !!bridge.pilotUntil &&
      bridge.pilotUntil.getTime() > now &&
      bridge.pilotActorIds.includes(actorId))
  );
}

export function eligibility(
  bridge: Bridge,
  consent: Consent | null,
  message: SourceMessage,
  now = Date.now(),
): string | null {
  if (
    !publicationAllowed(bridge, message.author.id, now) ||
    !bridge.activatedAt
  )
    return "not_active";
  if (
    !consent ||
    consent.blocked ||
    consent.withdrawnAt ||
    consent.actorId !== message.author.id ||
    consent.bridgeId !== bridge.id ||
    consent.guildId !== message.guild_id ||
    consent.generation !== bridge.generation ||
    consent.policyVersion !== bridge.policyVersion
  )
    return "no_consent";
  const created = Date.parse(message.timestamp);
  if (
    !Number.isFinite(created) ||
    created <
      Math.max(consent.optedAt.getTime(), bridge.activatedAt.getTime()) ||
    created > now + 5000
  )
    return "outside_epoch";
  if (!(
    (message.guild_id === bridge.guildA &&
      message.channel_id === bridge.channelA) ||
    (message.guild_id === bridge.guildB &&
      message.channel_id === bridge.channelB)
  ))
    return "wrong_endpoint";
  return contentPolicy(message, bridge.blockedTerms);
}

export function contentPolicy(
  message: SourceMessage,
  blockedTerms: readonly string[],
): string | null {
  if (message.author.bot || message.webhook_id) return "bot_or_webhook";
  if (
    ![0, 19].includes(message.type) ||
    message.message_reference?.type === 1 ||
    message.message_snapshots?.length
  )
    return "unsupported_type";
  if (
    message.attachments.length ||
    message.sticker_items?.length ||
    message.poll ||
    (message.flags || 0) & ((1 << 13) | 1 | 2)
  )
    return "unsupported_media";
  if (!message.content.trim()) return "empty_text";
  if (/@(?:everyone|here)\b|<@!?\d+>|<@&\d+>/i.test(message.content))
    return "mentions";
  // The reviewed pilot accepts plain discussion, not obfuscated links or invite advertising.
  const normalized = message.content
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "")
    .toLowerCase();
  if (
    /(?:https?:|www\.|discord\.(?:gg|com\/invite)|\]\s*\(|[a-z0-9-]+\.(?:com|net|org|xyz|ru|io)\b)/i.test(
      normalized,
    )
  )
    return "links_require_review";
  if (
    blockedTerms.some((term) =>
      normalized.includes(term.normalize("NFKC").toLowerCase()),
    )
  )
    return "prohibited_text";
  return null;
}

function plain(value: string): string {
  return value
    .normalize("NFKC")
    .replace(
      /[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
      "",
    )
    .replace(/<[^>]*>/g, "[reference]")
    .replace(/@/g, "[at]")
    .replace(/[\\`*_~|>#\[\]()]/g, (char) => `\\${char}`);
}

export interface RenderedMessage {
  content: string;
  flags: number;
  allowed_mentions: { parse: never[]; replied_user: false };
  message_reference?: { message_id: string; fail_if_not_exists: false };
}
export function renderMessage(
  message: SourceMessage,
  bridge: Bridge,
  reference: string,
  replyId?: string,
): RenderedMessage {
  const source =
    message.guild_id === bridge.guildA
      ? "KFC Global Pugs"
      : "WoW Forever Discord";
  const author = plain(message.author.username)
    .replace(/[\r\n]/g, " ")
    .slice(0, 80);
  const header = `**Shared from ${source} | ${author}**\n`;
  const footer = `\n[Source](<${messageLink(message.guild_id!, message.channel_id, message.id)}>) · Relay ${reference}`;
  const context =
    message.message_reference && !replyId
      ? "[Reply context unavailable]\n"
      : "";
  const text = plain(message.content);
  const budget = 2000 - header.length - context.length - footer.length;
  const suffix = "\n[Truncated; see source]";
  const body =
    text.length > budget
      ? Array.from(text.slice(0, budget - suffix.length - 2)).join("") + suffix
      : text;
  return {
    content: header + context + body + footer,
    flags: 4,
    allowed_mentions: { parse: [], replied_user: false },
    ...(replyId
      ? {
          message_reference: {
            message_id: replyId,
            fail_if_not_exists: false as const,
          },
        }
      : {}),
  };
}
export function payloadFingerprint(content: string, key: string): string {
  return createHmac("sha256", key).update(content).digest("hex");
}
