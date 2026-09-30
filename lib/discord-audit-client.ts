import { z } from "zod";
import {
  auditApplicationSchema,
  auditBotSchema,
  auditChannelSchema,
  auditCredentialsSchema,
  auditGuildSchema,
  auditMemberSchema,
  auditOnboardingSchema,
  auditRoleSchema,
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "./discord-audit";

export class DiscordAuditError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "DiscordAuditError";
  }
}

interface AuditTransport {
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new DiscordAuditError(
      "Discord returned an unexpected configuration shape. No audit was saved.",
    );
  return parsed.data;
}

export async function collectDiscordAudit(
  input: AuditCredentials,
  transport: AuditTransport = {},
): Promise<DiscordAuditSnapshot> {
  const configured = auditCredentialsSchema.safeParse(input);
  if (!configured.success)
    throw new DiscordAuditError(
      "Configure valid KFCBOT_APPLICATION_ID, KFCBOT_GUILD_ID and KFCBOT_TOKEN values in .env.local. Do not pass tokens as command arguments.",
    );
  const { applicationId, guildId, token } = configured.data;
  const request = transport.fetch ?? fetch;
  const sleep =
    transport.sleep ??
    ((milliseconds: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));

  // No arbitrary URL, method, body, or redirect can be supplied to this reader.
  // It is intentionally separate from the existing slash-command writer.
  async function get(path: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await request(`https://discord.com/api/v10${path}`, {
          method: "GET",
          redirect: "error",
          headers: {
            Authorization: `Bot ${token}`,
            "User-Agent":
              "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
          },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new DiscordAuditError(
          "Discord could not be reached securely or the request timed out. No audit was saved.",
        );
      }
      if (response.status === 429) {
        const body: unknown = await response.json().catch(() => null);
        const parsed = z
          .object({ retry_after: z.number().finite().nonnegative() })
          .safeParse(body);
        const header = response.headers.get("Retry-After");
        const seconds = parsed.success
          ? parsed.data.retry_after
          : header === null
            ? NaN
            : Number(header);
        if (
          attempt >= 2 ||
          !Number.isFinite(seconds) ||
          seconds < 0 ||
          seconds > 30
        ) {
          throw new DiscordAuditError(
            "Discord rate-limited the audit. Wait before running it again; no complete audit was saved.",
            429,
          );
        }
        await sleep(Math.ceil(seconds * 1000) + 100);
        continue;
      }
      if (!response.ok) {
        // Never include raw upstream bodies, headers, or fetch errors in logs.
        await response.body?.cancel();
        throw new DiscordAuditError(
          `Discord read failed (HTTP ${response.status}). Check the bot token, server installation and access.`,
          response.status,
        );
      }
      try {
        return await response.json();
      } catch {
        throw new DiscordAuditError(
          "Discord returned an unreadable response. No audit was saved.",
        );
      }
    }
  }

  const bot = parseResponse(auditBotSchema, await get("/users/@me"));
  const application = parseResponse(
    auditApplicationSchema,
    await get("/applications/@me"),
  );
  if (application.id !== applicationId)
    throw new DiscordAuditError(
      "The bot token belongs to a different application. No server configuration was read.",
    );
  const guild = parseResponse(
    auditGuildSchema,
    await get(`/guilds/${guildId}`),
  );
  if (guild.id !== guildId)
    throw new DiscordAuditError(
      "Discord returned a different server. Audit stopped.",
    );
  const roles = parseResponse(
    z.array(auditRoleSchema),
    await get(`/guilds/${guildId}/roles`),
  );
  const member = parseResponse(
    auditMemberSchema,
    await get(`/guilds/${guildId}/members/${bot.id}`),
  );
  if (
    member.user.id !== bot.id ||
    !roles.some((role) => role.id === guildId) ||
    member.roles.some((id) => !roles.some((role) => role.id === id))
  ) {
    throw new DiscordAuditError(
      "Bot membership or role configuration changed during the audit. Run a fresh audit.",
    );
  }
  const channels = parseResponse(
    z.array(auditChannelSchema),
    await get(`/guilds/${guildId}/channels`),
  );
  if (
    channels.some(
      (channel) => channel.guild_id && channel.guild_id !== guildId,
    ) ||
    new Set(channels.map((channel) => channel.id)).size !== channels.length ||
    new Set(roles.map((role) => role.id)).size !== roles.length
  ) {
    throw new DiscordAuditError(
      "Discord returned inconsistent channel or role identifiers. Audit stopped.",
    );
  }
  let onboarding: DiscordAuditSnapshot["onboarding"];
  try {
    const data = parseResponse(
      auditOnboardingSchema,
      await get(`/guilds/${guildId}/onboarding`),
    );
    if (data.guild_id !== guildId)
      throw new DiscordAuditError(
        "Onboarding belongs to a different server. Audit stopped.",
      );
    onboarding = { status: "available", data };
  } catch (error: unknown) {
    if (
      error instanceof DiscordAuditError &&
      (error.httpStatus === 403 || error.httpStatus === 404)
    ) {
      onboarding = { status: "unavailable", httpStatus: error.httpStatus };
    } else {
      throw error;
    }
  }
  return {
    capturedAt: new Date().toISOString(),
    application,
    bot,
    guild,
    roles,
    channels,
    botRoleIds: member.roles,
    onboarding,
  };
}
