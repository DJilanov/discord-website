import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  classLabs,
  classLabBotId,
  classLabDiscussionId,
  classLabGuildId,
  type ClassLabMessage,
} from "../content/kfc-class-labs";

const id = z.string().regex(/^[1-9]\d{16,19}$/);
const linkButton = z.object({
  type: z.literal(2),
  style: z.literal(5),
  label: z.string().min(1).max(80),
  url: z.string().url(),
});
const embedSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1).max(4096),
  color: z.number().int().min(0).max(0xffffff),
  thumbnail: z.object({ url: z.string().url() }).optional(),
  fields: z
    .array(
      z.object({
        name: z.string().min(1).max(256),
        value: z.string().min(1).max(1024),
        inline: z.boolean().default(false),
      }),
    )
    .max(25),
  footer: z.object({ text: z.string().max(2048) }),
});

const presentation = z.object({
  content: z.string().max(2000),
  embeds: z.array(embedSchema).max(10),
  components: z
    .array(
      z.object({
        type: z.literal(1),
        components: z.array(linkButton).min(1).max(5),
      }),
    )
    .max(5),
});

export const classLabChannelSchema = z.object({
  id,
  guild_id: id,
  type: z.number().int(),
  name: z.string(),
  parent_id: id.nullable().optional(),
  topic: z.string().nullable().optional(),
  owner_id: id.optional(),
  thread_metadata: z
    .object({ archived: z.boolean(), locked: z.boolean().optional() })
    .optional(),
  permission_overwrites: z
    .array(
      z.object({
        id,
        type: z.union([z.literal(0), z.literal(1)]),
        allow: z.string().regex(/^\d+$/),
        deny: z.string().regex(/^\d+$/),
      }),
    )
    .default([]),
});
export type ClassLabChannel = z.infer<typeof classLabChannelSchema>;

export const classLabReadMessageSchema = z.object({
  id,
  channel_id: id,
  author: z.object({ id, bot: z.boolean().optional() }),
  content: z.string(),
  embeds: z.array(z.unknown()),
  components: z.array(z.unknown()).default([]),
  pinned: z.boolean(),
  mention_everyone: z.boolean(),
  mentions: z.array(z.unknown()),
  mention_roles: z.array(z.string()),
});
export type ClassLabReadMessage = z.infer<typeof classLabReadMessageSchema>;

export function assertClassLabUrl(value: string): void {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Unsafe class resource URL");
  const allowed =
    (url.hostname === "www.wowforeverdiscord.online" &&
      /^\/guides(?:\/[a-z0-9-]+)?$/.test(url.pathname)) ||
    (url.hostname === "kfcguild.online" &&
      /^\/tools\/forever\/(?:simulator(?:\/[a-z0-9-]+)?|encyclopedia\/talents\/[a-z]+|tier-list(?:\/[a-z/-]+)?)$/.test(
        url.pathname,
      )) ||
    (url.hostname === "kfcguild.online" &&
      /^\/tools\/wow-assets\/classes\/[a-z]+\.jpg$/.test(url.pathname)) ||
    (url.hostname === "discord.com" &&
      new RegExp(
        `^/channels/${classLabGuildId}/[1-9]\\d{16,19}(?:/[1-9]\\d{16,19})?$`,
      ).test(url.pathname));
  const selector =
    url.hostname === "kfcguild.online" &&
    url.pathname === "/tools/forever/simulator";
  const query = [...url.searchParams];
  if (
    !allowed ||
    (query.length > 0 &&
      (!selector ||
        query.length !== 1 ||
        query[0]?.[0] !== "class" ||
        !classLabs.some((lab): boolean => lab.slug === query[0]?.[1]))) ||
    (url.hash && (!selector || url.hash !== "#simulator-profiles"))
  )
    throw new Error("Unapproved class resource URL");
}

export function classLabPayloadUrls(payload: ClassLabMessage): string[] {
  const texts = [
    payload.content,
    ...payload.embeds.flatMap((embed): string[] => [
      embed.title,
      embed.description,
      embed.footer.text,
      ...embed.fields.flatMap((field): string[] => [field.name, field.value]),
    ]),
  ];
  return [
    ...new Set([
      ...texts.flatMap((text): string[] =>
        [...text.matchAll(/https?:\/\/[^\s)>]+/g)].map(
          (match): string => match[0],
        ),
      ),
      ...payload.components.flatMap((row): string[] =>
        row.components.map((button): string => button.url),
      ),
      ...payload.embeds.flatMap((embed): string[] =>
        embed.thumbnail ? [embed.thumbnail.url] : [],
      ),
    ]),
  ];
}

export function assertClassLabPayload(payload: ClassLabMessage): void {
  const parsed = presentation.parse(payload);
  if (
    !isDeepStrictEqual(payload.allowed_mentions, {
      parse: [],
      users: [],
      roles: [],
      replied_user: false,
    })
  )
    throw new Error("Class resources must not ping members");
  const text =
    parsed.content +
    parsed.embeds
      .map(
        (embed): string =>
          embed.title +
          embed.description +
          embed.footer.text +
          embed.fields
            .map((field): string => field.name + field.value)
            .join(""),
      )
      .join("");
  if (/<@|@everyone|@here/.test(text))
    throw new Error("Unapproved mention in class resources");
  const length = parsed.embeds.reduce(
    (total, embed): number =>
      total +
      embed.title.length +
      embed.description.length +
      embed.footer.text.length +
      embed.fields.reduce(
        (sum, field): number => sum + field.name.length + field.value.length,
        0,
      ),
    0,
  );
  if (length > 6000)
    throw new Error("Class embed exceeds Discord's total character limit");
  for (const url of classLabPayloadUrls(payload)) assertClassLabUrl(url);
}

export function classLabMessageChecksum(value: unknown): string {
  const message = classLabReadMessageSchema.parse(value);
  return createHash("sha256")
    .update(
      JSON.stringify({
        content: message.content,
        embeds: message.embeds,
        components: message.components,
        pinned: message.pinned,
      }),
    )
    .digest("hex");
}

export function assertClassLabOwner(
  value: unknown,
  channelId: string,
  messageId: string,
): ClassLabReadMessage {
  const message = classLabReadMessageSchema.parse(value);
  if (
    message.id !== messageId ||
    message.channel_id !== channelId ||
    message.author.id !== classLabBotId ||
    message.author.bot !== true ||
    !message.pinned
  )
    throw new Error("The class guide is not the expected pinned bot message");
  return message;
}

export function classLabReadbackMatches(
  value: unknown,
  expected: ClassLabMessage,
): boolean {
  const message = classLabReadMessageSchema.parse(value);
  const actual = presentation.safeParse(message);
  if (!actual.success) return false;
  return (
    isDeepStrictEqual(actual.data, presentation.parse(expected)) &&
    !message.mention_everyone &&
    !message.mentions.length &&
    !message.mention_roles.length
  );
}

export function classLabPermissionFingerprint(
  channel: ClassLabChannel,
): string {
  return JSON.stringify(
    channel.permission_overwrites
      .map((entry) => ({ ...entry }))
      .sort((a, b): number => a.id.localeCompare(b.id) || a.type - b.type),
  );
}

export function assertClassLabDiscussion(channel: ClassLabChannel): void {
  if (
    channel.id !== classLabDiscussionId ||
    channel.guild_id !== classLabGuildId ||
    channel.type !== 0
  )
    throw new Error("Wrong class discussion destination");
  const everyone = channel.permission_overwrites.find(
    (entry): boolean => entry.id === classLabGuildId && entry.type === 0,
  );
  const needed = (1n << 10n) | (1n << 11n) | (1n << 16n) | (1n << 38n);
  if (
    !everyone ||
    (BigInt(everyone.allow) & needed) !== needed ||
    (BigInt(everyone.deny) & needed) !== 0n
  )
    throw new Error(
      "The existing discussion audience cannot reply; do not change permissions automatically",
    );
}

export function assertClassLabThread(value: unknown): ClassLabChannel {
  const channel = classLabChannelSchema.parse(value);
  if (
    channel.guild_id !== classLabGuildId ||
    channel.parent_id !== classLabDiscussionId ||
    channel.type !== 11 ||
    channel.owner_id !== classLabBotId ||
    !channel.thread_metadata ||
    channel.thread_metadata.archived ||
    channel.thread_metadata.locked
  )
    throw new Error("Wrong or closed class discussion thread");
  return channel;
}
