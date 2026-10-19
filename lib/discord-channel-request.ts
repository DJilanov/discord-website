import { z } from "zod";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import type { AuditCredentials } from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";

export type ChannelRequestMethod = "GET" | "PATCH" | "POST" | "PUT";
export interface ChannelRequestOptions {
  reason: string;
  recheck?: () => Promise<void>;
  transport?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

export async function discordChannelRequest(
  credentials: AuditCredentials,
  route: string,
  method: ChannelRequestMethod,
  body: unknown,
  options: ChannelRequestOptions,
): Promise<unknown> {
  const historyRead =
    method === "GET" &&
    (new RegExp(`^/guilds/${experienceGuildId}/threads/active$`).test(route) ||
      /^\/channels\/[1-9]\d{16,19}\/threads\/archived\/(?:public|private)\?limit=100(?:&before=[0-9TZ:.%+-]+)?$/.test(
        route,
      ));
  if (
    credentials.applicationId !== experienceApplicationId ||
    credentials.guildId !== experienceGuildId
  )
    throw new DiscordAuditError(
      "Channel changes are restricted to the approved Forever application and server.",
    );
  if (
    !historyRead &&
    !new RegExp(`^/guilds/${experienceGuildId}/(?:channels|onboarding)$`).test(
      route,
    ) &&
    !/^\/channels\/[1-9]\d{16,19}(?:\/threads|\/messages(?:\/[1-9]\d{16,19}|\/pins(?:\/[1-9]\d{16,19})?)?)?$/.test(
      route,
    )
  )
    throw new DiscordAuditError("Unexpected channel operator route.");
  if (
    !options.reason.length ||
    options.reason.length > 200 ||
    /[\r\n]/.test(options.reason)
  )
    throw new DiscordAuditError("Invalid audit reason.");
  const transport = options.transport ?? fetch;
  const sleep =
    options.sleep ??
    ((milliseconds: number): Promise<void> =>
      new Promise<void>((resolve): void => {
        setTimeout(resolve, milliseconds);
      }));
  for (let attempt = 0; ; attempt++) {
    await options.recheck?.();
    let response: Response;
    try {
      response = await transport(`https://discord.com/api/v10${route}`, {
        method,
        redirect: "error",
        headers: {
          Authorization: `Bot ${credentials.token}`,
          "Content-Type": "application/json",
          "User-Agent":
            "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
          ...(method !== "GET" ? { "X-Audit-Log-Reason": options.reason } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new DiscordAuditError(
        "Discord request could not be confirmed. Inspect recovery state before retrying a creation.",
      );
    }
    if (response.status === 429) {
      const retry = z
        .object({ retry_after: z.number().finite().nonnegative().max(30) })
        .safeParse(await response.json().catch((): null => null));
      if (attempt >= 2 || !retry.success)
        throw new DiscordAuditError(
          "Discord rate-limited the operation; review its journal.",
          429,
        );
      await sleep(Math.ceil(retry.data.retry_after * 1000) + 100);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new DiscordAuditError(
        `Discord operation failed (HTTP ${response.status}); raw response suppressed.`,
        response.status,
      );
    }
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      throw new DiscordAuditError(
        "Discord returned unreadable data. Reconcile recovery state before retrying.",
      );
    }
  }
}
