import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { HttpError, rateLimit } from "@/lib/security";
import { ephemeral } from "@/lib/discord-bridge/commands";
import { requireRaidPilot } from "./config";
import { raidService } from "./service";
import { jsonChecksum } from "./json";
import { eventTypeDefinitions } from "./event-types";
import { characterCanJoin } from "./policy";
import { raidDiscordGuildIds } from "./discord-settings";
import { requestRaidRepost } from "./repost";

const snowflake = z.string().regex(/^\d{17,20}$/);
const interactionSchema = z.object({
  id: snowflake,
  type: z.literal(2),
  application_id: snowflake,
  guild_id: snowflake,
  channel_id: snowflake.optional(),
  member: z.object({
    permissions: z
      .string()
      .regex(/^\d{1,30}$/)
      .optional(),
    user: z.object({ id: snowflake, bot: z.boolean().optional() }),
  }),
  data: z.object({
    name: z.literal("raid"),
    options: z
      .array(
        z.object({
          type: z.literal(1),
          name: z.enum([
            "create",
            "status",
            "join",
            "leave",
            "reserves",
            "repost",
          ]),
          options: z
            .array(
              z.object({
                name: z.enum([
                  "event",
                  "character",
                  "specialization",
                  "role",
                  "accept_rules",
                ]),
                type: z.union([z.literal(3), z.literal(5)]),
                value: z.union([z.string().min(1).max(500), z.boolean()]),
              }),
            )
            .max(5)
            .optional(),
        }),
      )
      .length(1),
  }),
});
export function isRaidInteraction(raw: unknown): boolean {
  return z
    .object({ type: z.literal(2), data: z.object({ name: z.literal("raid") }) })
    .safeParse(raw).success;
}
export function eventIdFromOption(value: string): string {
  if (/^[a-z0-9]{20,40}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(SITE_URL).origin || url.search || url.hash)
      throw new Error();
    const match = /^\/raids\/([a-z0-9]{20,40})$/.exec(url.pathname);
    if (match) return match[1];
  } catch {
    /* Invalid links are rejected below. */
  }
  throw new HttpError(
    400,
    "Use the exact raid event ID or website event link.",
  );
}
export async function raidInteraction(
  raw: unknown,
  database: PrismaClient = db,
): Promise<ReturnType<typeof ephemeral>> {
  const input = interactionSchema.parse(raw);
  if (
    input.application_id !== process.env.DISCORD_APPLICATION_ID ||
    (input.data.options[0].name === "repost"
      ? !raidDiscordGuildIds().includes(input.guild_id)
      : input.guild_id !== process.env.DISCORD_GUILD_ID) ||
    input.member.user.bot
  )
    throw new HttpError(
      403,
      "This command belongs to a different server or bot account.",
    );
  requireRaidPilot(input.member.user.id);
  const current = await database.foreverMember.findUnique({
    where: { discordId: input.member.user.id },
  });
  if (current && !current.active)
    throw new HttpError(403, "Member access is disabled.");
  const hash = jsonChecksum(input);
  return database.$transaction(
    async (client) => {
      await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"raid-interaction:" + input.id}, 0))`;
      const old = await client.foreverRaidInteraction.findUnique({
        where: { id: input.id },
      });
      if (old) {
        if (old.actorId !== input.member.user.id || old.requestHash !== hash)
          throw new HttpError(
            409,
            "Interaction ID does not match its original request.",
          );
        return z
          .object({
            type: z.literal(4),
            data: z.object({
              content: z.string(),
              flags: z.literal(64),
              allowed_mentions: z.object({ parse: z.array(z.never()) }),
            }),
          })
          .parse(old.response);
      }
      await rateLimit(`raid-command:${input.member.user.id}`, 60, 60, client);
      const command = input.data.options[0],
        options = Object.fromEntries(
          (command.options || []).map((option) => [option.name, option.value]),
        );
      let content: string;
      try {
        const member = await client.foreverMember.upsert({
          where: { discordId: input.member.user.id },
          create: {
            discordId: input.member.user.id,
            displayName: "Community member",
          },
          update: {},
        });
        if (!member.active)
          throw new HttpError(403, "Member access is disabled.");
        const service = raidService(database, client);
        if (command.name === "create")
          content = `Create your private Forever or TBC event: ${SITE_URL}/raids/new`;
        else if (command.name === "repost") {
          if (!input.channel_id || input.member.permissions === undefined)
            throw new HttpError(
              400,
              "Repost must be invoked inside a server event channel.",
            );
          const id = eventIdFromOption(
            typeof options.event === "string" ? options.event : "",
          );
          await requestRaidRepost(client, id, {
            discordId: input.member.user.id,
            guildId: input.guild_id,
            channelId: input.channel_id,
            administrator: (BigInt(input.member.permissions) & 8n) === 8n,
          });
          content = `Repost queued in this channel. Signups, reserves and event settings stay unchanged. ${SITE_URL}/raids/${id}`;
        } else {
          const id = eventIdFromOption(
            typeof options.event === "string" ? options.event : "",
          );
          const event = await service.get(member, id);
          const definition = eventTypeDefinitions[event.eventType];
          if (command.name === "join") {
            if (event.discord?.visibility === "community")
              throw new HttpError(
                400,
                `This event shares its character roster in Discord. Review and confirm participation on the event page: ${SITE_URL}/raids/${id}`,
              );
            const matches = (await service.characters(member)).filter(
              (character) =>
                character.name.toLowerCase() ===
                  (typeof options.character === "string"
                    ? options.character.toLowerCase()
                    : "") && characterCanJoin(character, event),
            );
            if (matches.length !== 1)
              throw new HttpError(
                400,
                `Register one matching character first: ${SITE_URL}/account/characters`,
              );
            await service.signup(member, id, {
              acknowledge: options.accept_rules === true,
              characterId: matches[0].id,
              specialization:
                options.specialization ??
                (definition.combatRoles ? undefined : null),
              role:
                options.role ??
                (definition.combatRoles ? undefined : "participant"),
            });
            content = `Signup saved. Review your ${event.eventType === "raid" ? "seat and reserves" : "event participation"}: ${SITE_URL}/raids/${id}`;
          } else if (command.name === "leave") {
            await service.withdraw(member, id);
            content = `Signup withdrawn: ${SITE_URL}/raids/${id}`;
          } else if (command.name === "reserves")
            content =
              event.eventType === "raid"
                ? `Your soft reserves: ${SITE_URL}/raids/${id}/reserves`
                : `This event does not use soft reserves: ${SITE_URL}/raids/${id}`;
          else
            content = `${definition.label}: ${event.signups.filter((signup) => signup.status === "accepted").length}/${event.capacity} accepted. ${event.status}. ${event.timeLabel}\n${SITE_URL}/raids/${id}`;
        }
      } catch (error) {
        if (error instanceof HttpError) content = error.message;
        else if (error instanceof z.ZodError)
          content =
            "Invalid event options. Combat events require a class-matching specialization and role; social events use participant.";
        else throw error;
      }
      const response = ephemeral(content);
      await client.foreverRaidInteraction.create({
        data: {
          id: input.id,
          actorId: input.member.user.id,
          requestHash: hash,
          response: {
            type: 4,
            data: { content, flags: 64, allowed_mentions: { parse: [] } },
          },
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return response;
    },
    { timeout: 2500, maxWait: 1000 },
  );
}
