import { createHash } from "node:crypto";
import {
  REST,
  DiscordAPIError,
  HTTPError,
  RateLimitError,
} from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";
import {
  auditChannelSchema,
  auditRoleSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
} from "../../../lib/discord-audit.js";
import {
  applicationId,
  parseMessageLink,
  snowflake,
  sourceSchema,
  type Bridge,
  type Projection,
  type SourceMessage,
} from "../../../lib/discord-bridge/contracts.js";
import type { RenderedMessage } from "../../../lib/discord-bridge/policy.js";
import { bridgeCommand } from "../../../lib/discord-bridge/commands.js";

export class DiscordFailure extends Error {
  constructor(
    public code:
      | "rate_limited"
      | "forbidden"
      | "unauthorized"
      | "not_found"
      | "invalid"
      | "unavailable",
    public retryAfter = 5,
  ) {
    super(code);
  }
}
export interface BridgeTransport {
  validate(bridge: Bridge): Promise<string>;
  eligible(bridge: Bridge, actorId: string): Promise<boolean>;
  source(
    guildId: string,
    channelId: string,
    messageId: string,
  ): Promise<SourceMessage | null>;
  output(projection: Projection): Promise<SourceMessage | null>;
  create(projection: Projection, body: RenderedMessage): Promise<string>;
  edit(projection: Projection, body: RenderedMessage): Promise<void>;
  remove(projection: Projection): Promise<void>;
  respond(token: string, content: string): Promise<void>;
}
const memberSchema = z.object({
  user: z.object({ id: snowflake }),
  roles: z.array(snowflake),
  communication_disabled_until: z.iso
    .datetime({ offset: true })
    .nullable()
    .optional(),
  pending: z.boolean().optional(),
});
const guildSchema = z.object({ id: snowflake, owner_id: snowflake });
type Member = z.infer<typeof memberSchema>;
interface Endpoint {
  channel: z.infer<typeof auditChannelSchema>;
  roles: z.infer<typeof auditRoleSchema>[];
  guild: z.infer<typeof guildSchema>;
  bot: Member;
}
const speak = (1n << 10n) | (1n << 11n);
const history = 1n << 16n;

export class DiscordTransport implements BridgeTransport {
  readonly rest: REST;
  private endpoints = new Map<string, { value: Endpoint; expiresAt: number }>();
  constructor(
    token: string,
    private readonly canWrite: () => Promise<boolean> = async () => true,
  ) {
    this.rest = new REST({
      version: "10",
      retries: 0,
      timeout: 7000,
      rejectOnRateLimit: () => true,
    }).setToken(token);
  }
  private async request<T>(
    work: () => Promise<unknown>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    try {
      return schema.parse(await work());
    } catch (error) {
      if (error instanceof RateLimitError)
        throw new DiscordFailure(
          "rate_limited",
          Math.ceil(error.retryAfter / 1000) + 1,
        );
      if (error instanceof DiscordAPIError || error instanceof HTTPError) {
        if (error.status === 401) throw new DiscordFailure("unauthorized");
        if (error.status === 403) throw new DiscordFailure("forbidden");
        if (error.status === 404) throw new DiscordFailure("not_found");
        if (error.status >= 400 && error.status < 500)
          throw new DiscordFailure("invalid");
      }
      throw new DiscordFailure("unavailable");
    }
  }
  async identity(): Promise<void> {
    const bot = await this.request(
      () => this.rest.get(Routes.user("@me")),
      z.object({ id: z.literal(applicationId), bot: z.literal(true) }),
    );
    if (!bot.bot) throw new DiscordFailure("unauthorized");
    await this.request(
      () => this.rest.get(Routes.oauth2CurrentApplication()),
      z.object({ id: z.literal(applicationId) }),
    );
  }
  private async endpoint(
    guildId: string,
    channelId: string,
  ): Promise<Endpoint> {
    const cached = this.endpoints.get(channelId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const guild = await this.request(
      () => this.rest.get(Routes.guild(guildId)),
      guildSchema,
    );
    const channel = await this.request(
      () => this.rest.get(Routes.channel(channelId)),
      auditChannelSchema,
    );
    if (channel.guild_id !== guildId || channel.type !== 0 || channel.nsfw)
      throw new DiscordFailure("forbidden");
    const roles = await this.request(
      () => this.rest.get(Routes.guildRoles(guildId)),
      z.array(auditRoleSchema),
    );
    const bot = await this.request(
      () => this.rest.get(Routes.guildMember(guildId, applicationId)),
      memberSchema,
    );
    const endpoint = { guild, channel, roles, bot };
    if (!this.canSpeak(endpoint, bot, true))
      throw new DiscordFailure("forbidden");
    this.endpoints.set(channelId, {
      value: endpoint,
      expiresAt: Date.now() + 5000,
    });
    return endpoint;
  }
  invalidate(): void {
    this.endpoints.clear();
  }
  private canSpeak(
    endpoint: Endpoint,
    member: Member,
    requireHistory = false,
  ): boolean {
    if (
      member.pending ||
      (member.communication_disabled_until &&
        Date.parse(member.communication_disabled_until) > Date.now())
    )
      return false;
    if (member.user.id === endpoint.guild.owner_id) return true;
    const base = guildPermissions(
      endpoint.roles,
      endpoint.guild.id,
      member.roles,
    );
    return hasDiscordPermission(
      channelPermissions(
        base,
        endpoint.channel,
        endpoint.guild.id,
        member.roles,
        member.user.id,
      ),
      speak | (requireHistory ? history : 0n),
    );
  }
  async validate(bridge: Bridge): Promise<string> {
    const fingerprints: unknown[] = [];
    for (const [guild, channel, notice] of [
      [bridge.guildA, bridge.channelA, bridge.noticeA],
      [bridge.guildB, bridge.channelB, bridge.noticeB],
    ]) {
      if (!guild || !channel) throw new DiscordFailure("invalid");
      const endpoint = await this.endpoint(guild, channel);
      const everyone = channelPermissions(
        guildPermissions(endpoint.roles, guild, []),
        endpoint.channel,
        guild,
        [],
      );
      if (
        !hasDiscordPermission(everyone, 1n << 10n) ||
        !/^forever-shared-chat(?:-[a-z0-9-]+)?$/.test(endpoint.channel.name)
      )
        throw new DiscordFailure("forbidden");
      const topic = endpoint.channel.topic || "";
      if (
        !topic.includes(
          "https://www.wowforeverdiscord.online/bot/shared-channels",
        )
      )
        throw new DiscordFailure("invalid");
      const link = notice ? parseMessageLink(notice) : null;
      if (!link || link.guildId !== guild || link.channelId !== channel)
        throw new DiscordFailure("invalid");
      const message = await this.source(guild, channel, link.messageId);
      if (
        !message ||
        !message.content.includes(
          "https://www.wowforeverdiscord.online/bot/shared-channels",
        ) ||
        !/two.way/i.test(message.content) ||
        !/\/bridge join/i.test(message.content)
      )
        throw new DiscordFailure("invalid");
      const commands = await this.request(
        () =>
          this.rest.get(Routes.applicationGuildCommands(applicationId, guild)),
        z.array(
          z.object({ name: z.string(), options: z.unknown().optional() }),
        ),
      );
      const command = commands.find((v) => v.name === "bridge");
      if (
        !command ||
        !Array.isArray(command.options) ||
        bridgeCommand.options.some(
          (option) =>
            !(command.options as { name?: string }[]).some(
              (v) => v.name === option.name,
            ),
        )
      )
        throw new DiscordFailure("invalid");
      fingerprints.push({
        guild: endpoint.guild,
        channel: endpoint.channel,
        botRoles: endpoint.bot.roles.slice().sort(),
        roles: endpoint.roles
          .map((r) => ({ id: r.id, permissions: r.permissions }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        notice: link.messageId,
      });
    }
    return createHash("sha256")
      .update(JSON.stringify(fingerprints))
      .digest("hex");
  }
  async eligible(bridge: Bridge, actorId: string): Promise<boolean> {
    for (const [guild, channel] of [
      [bridge.guildA, bridge.channelA],
      [bridge.guildB, bridge.channelB],
    ]) {
      const endpoint = await this.endpoint(guild, channel);
      let member: Member;
      try {
        member = await this.request(
          () => this.rest.get(Routes.guildMember(guild, actorId)),
          memberSchema,
        );
      } catch (error) {
        if (error instanceof DiscordFailure && error.code === "not_found")
          return false;
        throw error;
      }
      if (!this.canSpeak(endpoint, member)) return false;
    }
    return true;
  }
  async source(
    guildId: string,
    channelId: string,
    messageId: string,
  ): Promise<SourceMessage | null> {
    try {
      const message = await this.request(
        () => this.rest.get(Routes.channelMessage(channelId, messageId)),
        sourceSchema,
      );
      if (message.id !== messageId || message.channel_id !== channelId)
        throw new DiscordFailure("invalid");
      return { ...message, guild_id: guildId };
    } catch (error) {
      if (!(error instanceof DiscordFailure) || error.code !== "not_found")
        throw error;
      // Unknown-message is only deletion evidence while the channel is independently accessible.
      this.endpoints.delete(channelId);
      await this.endpoint(guildId, channelId);
      return null;
    }
  }
  async output(projection: Projection): Promise<SourceMessage | null> {
    if (!projection.messageId) return null;
    const message = await this.source(
      projection.guildId,
      projection.channelId,
      projection.messageId,
    );
    if (
      message &&
      (message.author.id !== applicationId ||
        !message.author.bot ||
        !message.content.endsWith(`Relay ${projection.nonce}`))
    )
      throw new DiscordFailure("forbidden");
    return message;
  }
  async create(projection: Projection, body: RenderedMessage): Promise<string> {
    if (!(await this.canWrite())) throw new DiscordFailure("forbidden");
    const result = await this.request(
      () =>
        this.rest.post(Routes.channelMessages(projection.channelId), {
          body: { ...body, nonce: projection.nonce, enforce_nonce: true },
        }),
      z.object({ id: snowflake }),
    );
    return result.id;
  }
  async edit(projection: Projection, body: RenderedMessage): Promise<void> {
    if (!(await this.canWrite())) throw new DiscordFailure("forbidden");
    if (!projection.messageId) throw new DiscordFailure("invalid");
    // Discord does not support changing a native reply reference on edit.
    await this.request(
      () =>
        this.rest.patch(
          Routes.channelMessage(projection.channelId, projection.messageId!),
          {
            body: {
              content: body.content,
              flags: 4,
              allowed_mentions: body.allowed_mentions,
            },
          },
        ),
      z.unknown(),
    );
  }
  async remove(projection: Projection): Promise<void> {
    if (!(await this.canWrite())) throw new DiscordFailure("forbidden");
    if (!projection.messageId) return;
    await this.request(
      () =>
        this.rest.delete(
          Routes.channelMessage(projection.channelId, projection.messageId!),
        ),
      z.unknown(),
    );
  }
  async respond(token: string, content: string): Promise<void> {
    if (!(await this.canWrite())) throw new DiscordFailure("forbidden");
    await this.request(
      () =>
        this.rest.patch(
          Routes.webhookMessage(applicationId, token, "@original"),
          {
            auth: false,
            body: { content, allowed_mentions: { parse: [] }, components: [] },
          },
        ),
      z.unknown(),
    );
  }
}
