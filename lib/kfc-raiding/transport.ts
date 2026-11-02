import { z } from "zod";
import { kfcGuildId } from "../../content/kfc-community";
import { discordId } from "../discord-audit";
import {
  editions,
  type DiscordMethod,
  type RaidingConfig,
  type RaidingRequest,
} from "./contracts";

export class RaidingHttpError extends Error {
  constructor(readonly status: number) {
    super(`Raiding Discord HTTP ${status}`);
  }
}

export interface RaidingClient {
  request: RaidingRequest;
  allowChannel(id: string): void;
  allowOwnedThread(id: string): void;
  allowSubscriber(id: string): void;
}

export function raidingClient(
  config: RaidingConfig,
  token: string,
  requestFetch: typeof fetch = fetch,
  options: { createNativeEvents?: boolean } = {},
): RaidingClient {
  if (token.length < 20)
    throw new Error("Raiding bot credentials are unavailable.");
  const channels = new Set<string>([
    config.hub.channelId,
    ...editions.flatMap((game): string[] => {
      const space = config.spaces[game];
      return [
        space.schedule.channelId,
        space.alerts.channelId,
        space.forumId,
        space.chatId,
        ...(space.helpId ? [space.helpId] : []),
      ];
    }),
  ]);
  const subscribers = new Set<string>();
  const writable = new Set([
    config.hub.channelId,
    ...editions.map((game): string => config.spaces[game].schedule.channelId),
  ]);
  const forums = new Set(
    editions.map((game): string => config.spaces[game].forumId),
  );
  const roles = new Set(
    editions.map((game): string => config.spaces[game].alertRoleId),
  );
  const sleep = async (ms: number): Promise<void> =>
    new Promise((resolve): void => {
      setTimeout(resolve, ms);
    });
  return {
    allowChannel(id: string): void {
      channels.add(discordId.parse(id));
    },
    allowOwnedThread(id: string): void {
      const parsed = discordId.parse(id);
      channels.add(parsed);
      writable.add(parsed);
    },
    allowSubscriber(id: string): void {
      subscribers.add(discordId.parse(id));
    },
    async request(
      route: string,
      method: DiscordMethod = "GET",
      body?: unknown,
    ): Promise<unknown> {
      const channelMatch = /^\/channels\/([1-9]\d{16,19})(.*)$/.exec(route);
      const channel = channelMatch?.[1];
      const suffix = channelMatch?.[2];
      const member = new RegExp(
        `^/guilds/${kfcGuildId}/members/([1-9]\\d{16,19})(?:/roles/([1-9]\\d{16,19}))?$`,
      ).exec(route);
      const guildRead = [
        "/users/@me",
        `/guilds/${kfcGuildId}/channels`,
        `/guilds/${kfcGuildId}/roles`,
        `/guilds/${kfcGuildId}/threads/active`,
        `/guilds/${kfcGuildId}/scheduled-events`,
      ].includes(route);
      const channelRead =
        !!channel &&
        channels.has(channel) &&
        (suffix === "" ||
          /^\/messages(?:\?limit=100|\/[1-9]\d{16,19}(?:\/reactions\/%F0%9F%94%94\?limit=100(?:&after=[1-9]\d{16,19})?)?)$/.test(
            suffix!,
          ) ||
          suffix === "/threads/archived/public?limit=100");
      const roleRoute =
        !!member &&
        subscribers.has(member[1]) &&
        (!member[2] || roles.has(member[2]));
      const nativeRoute = new RegExp(
        `^/guilds/${kfcGuildId}/scheduled-events/([1-9]\\d{16,19})$`,
      ).exec(route);
      const boundNative =
        !!nativeRoute &&
        Object.values(config.managedNativeEvents).includes(nativeRoute[1]);
      let allowed =
        method === "GET" &&
        (guildRead || channelRead || boundNative || (roleRoute && !member![2]));
      if (method === "PATCH" && boundNative) {
        z.object({
          name: z.string().min(1).max(100).optional(),
          scheduled_start_time: z
            .string()
            .datetime({ offset: true })
            .optional(),
          scheduled_end_time: z.string().datetime({ offset: true }).optional(),
          status: z.literal(4).optional(),
        })
          .strict()
          .parse(body);
        allowed = true;
      }
      if (
        method === "POST" &&
        options.createNativeEvents &&
        route === `/guilds/${kfcGuildId}/scheduled-events`
      ) {
        const event = z
          .object({
            name: z.string().min(1).max(100),
            description: z.string().max(1000),
            scheduled_start_time: z.string().datetime({ offset: true }),
            scheduled_end_time: z.string().datetime({ offset: true }),
            privacy_level: z.literal(2),
            entity_type: z.literal(3),
            entity_metadata: z.object({
              location: z
                .string()
                .regex(
                  /^https:\/\/discord\.com\/channels\/1411533815356194968\/[1-9]\d{16,19}\/[1-9]\d{16,19}$/,
                ),
            }),
          })
          .strict()
          .parse(body);
        if (
          Date.parse(event.scheduled_end_time) <=
          Date.parse(event.scheduled_start_time)
        )
          throw new Error("Invalid native event finish.");
        allowed = true;
      }
      if (method === "PATCH" && channel && writable.has(channel)) {
        allowed = /^\/messages\/[1-9]\d{16,19}$/.test(suffix!) || suffix === "";
        if (suffix === "")
          z.object({
            name: z.string().max(100).optional(),
            archived: z.boolean().optional(),
            locked: z.boolean().optional(),
            applied_tags: z.array(discordId).max(5).optional(),
          })
            .strict()
            .parse(body);
      }
      if (method === "POST" && channel) {
        allowed = suffix === "/threads" && forums.has(channel);
        if (suffix === "/messages")
          allowed = editions.some(
            (game): boolean =>
              config.spaces[game].schedule.channelId === channel,
          );
      }
      if ((method === "PUT" || method === "DELETE") && roleRoute && member![2])
        allowed = true;
      if (
        method === "PUT" &&
        editions.some(
          (game): boolean =>
            route ===
            `/channels/${config.spaces[game].alerts.channelId}/messages/${config.spaces[game].alerts.messageId}/reactions/%F0%9F%94%94/@me`,
        )
      )
        allowed = true;
      if (!allowed) throw new Error("Raiding route outside approved scope.");
      if (method === "GET" && body !== undefined)
        throw new Error("Raiding reads cannot include a body.");
      if (body && typeof body === "object") {
        const payload = "message" in body ? body.message : body;
        if (
          payload &&
          typeof payload === "object" &&
          ("content" in payload || "embeds" in payload)
        ) {
          const mentions = z
            .object({
              parse: z.array(z.never()),
              roles: z.array(discordId).max(1).optional(),
            })
            .strict()
            .parse(
              "allowed_mentions" in payload
                ? payload.allowed_mentions
                : undefined,
            );
          if (
            mentions.roles?.some((id): boolean => !roles.has(id)) ||
            (mentions.roles?.length &&
              !(method === "POST" && suffix === "/messages"))
          )
            throw new Error("Unapproved raiding mention.");
        }
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        let response: Response;
        try {
          response = await requestFetch(`https://discord.com/api/v10${route}`, {
            method,
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json",
              "User-Agent":
                "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
              ...(method === "GET"
                ? {}
                : {
                    "X-Audit-Log-Reason":
                      "Owner-requested KFC raid schedule and opt-in alerts",
                  }),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
        } catch {
          throw new Error(
            method === "GET"
              ? "Raiding lookup unavailable."
              : "Raiding write outcome uncertain; reconciliation required.",
          );
        }
        if (response.status === 204) return null;
        const text = await response.text();
        if (text.length > 4_000_000)
          throw new Error("Raiding response exceeds budget.");
        let result: unknown;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error("Unreadable raiding response.");
        }
        if (response.status === 429) {
          const retry = z
            .object({ retry_after: z.number().min(0).max(30) })
            .safeParse(result);
          if (attempt < 2 && retry.success) {
            await sleep(Math.ceil(retry.data.retry_after * 1000) + 100);
            continue;
          }
        }
        if (!response.ok) throw new RaidingHttpError(response.status);
        return result;
      }
      throw new Error("Raiding rate-limit retry budget exhausted.");
    },
  };
}
