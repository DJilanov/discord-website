import { z } from "zod";
import {
  foreverGuildId,
  kfcApplicationId,
  kfcGuildId,
  scheduledEventBindings,
} from "../content/kfc-community";
import { auditCredentialsSchema, type AuditCredentials } from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";

const approvedGuildIds = new Set<string>([foreverGuildId, kfcGuildId]);
const approvedEventRoutes = new Set<string>(
  scheduledEventBindings.flatMap((binding) =>
    binding.projections.map(
      (projection): string =>
        `/guilds/${projection.guildId}/scheduled-events/${projection.scheduledId}`,
    ),
  ),
);
const scheduledEventPatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    scheduled_start_time: z.iso.datetime({ offset: true }).optional(),
    scheduled_end_time: z.iso.datetime({ offset: true }).optional(),
    status: z.literal(4).optional(),
  })
  .strict()
  .refine((patch): boolean => Object.keys(patch).length > 0);

interface ScheduledEventTransport {
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  recheck?: () => Promise<void>;
}

export async function scheduledEventRequest(
  credentials: AuditCredentials,
  route: string,
  method: "GET" | "PATCH" = "GET",
  body?: unknown,
  transport: ScheduledEventTransport = {},
): Promise<unknown> {
  const parsed = auditCredentialsSchema.parse(credentials);
  if (
    parsed.applicationId !== kfcApplicationId ||
    parsed.guildId !== kfcGuildId
  )
    throw new DiscordAuditError(
      "Scheduled-event credentials do not match the approved application.",
    );
  const listMatch = /^\/guilds\/([1-9]\d{16,19})\/scheduled-events$/.exec(
    route,
  );
  const approvedList = Boolean(listMatch && approvedGuildIds.has(listMatch[1]));
  if (!approvedList && !approvedEventRoutes.has(route))
    throw new DiscordAuditError("Unapproved scheduled-event route.");
  if (method === "PATCH") {
    if (!approvedEventRoutes.has(route))
      throw new DiscordAuditError(
        "Only a bound scheduled event can be edited.",
      );
    scheduledEventPatchSchema.parse(body);
  } else if (body !== undefined) {
    throw new DiscordAuditError("Scheduled-event reads cannot include a body.");
  }

  const request = transport.fetch ?? fetch;
  const sleep =
    transport.sleep ??
    ((milliseconds: number): Promise<void> =>
      new Promise((resolve): void => {
        setTimeout(resolve, milliseconds);
      }));
  for (let attempt = 0; ; attempt++) {
    await transport.recheck?.();
    let response: Response;
    try {
      response = await request(`https://discord.com/api/v10${route}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bot ${parsed.token}`,
          "Content-Type": "application/json",
          "User-Agent":
            "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
          ...(method === "PATCH"
            ? {
                "X-Audit-Log-Reason":
                  "Synchronize approved native event projection from the canonical schedule",
              }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new DiscordAuditError(
        "Scheduled-event request outcome uncertain; reconcile both projections before retrying.",
      );
    }
    if (response.status === 429) {
      const retry = z
        .object({ retry_after: z.number().finite().nonnegative().max(30) })
        .safeParse(await response.json().catch((): null => null));
      if (attempt >= 2 || !retry.success)
        throw new DiscordAuditError(
          "Scheduled-event synchronization was rate-limited; retry later.",
          429,
        );
      await sleep(Math.ceil(retry.data.retry_after * 1000) + 100);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new DiscordAuditError(
        `Scheduled-event operation failed (HTTP ${response.status}); upstream body suppressed.`,
        response.status,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new DiscordAuditError(
        "Discord returned an unreadable scheduled-event response.",
      );
    }
  }
}
