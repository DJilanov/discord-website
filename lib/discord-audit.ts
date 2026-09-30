import { z } from "zod";

export const discordId = z.string().regex(/^[1-9]\d{16,19}$/);
const permissions = z.string().regex(/^\d{1,32}$/);
export const auditIdentitySchema = z.object({
  applicationId: discordId,
  guildId: discordId,
});
export const auditCredentialsSchema = auditIdentitySchema.extend({
  token: z
    .string()
    .min(20)
    .max(512)
    .regex(/^[A-Za-z0-9._-]+$/),
});
export type AuditCredentials = z.infer<typeof auditCredentialsSchema>;

export const auditBotSchema = z.object({
  id: discordId,
  username: z.string(),
  bot: z.literal(true),
});
export const auditApplicationSchema = z.object({
  id: discordId,
  name: z.string(),
});
export const auditGuildSchema = z.object({
  id: discordId,
  name: z.string(),
  description: z.string().nullable(),
  features: z.array(z.string()),
  verification_level: z.number().int().nonnegative(),
  default_message_notifications: z.number().int(),
  explicit_content_filter: z.number().int(),
  mfa_level: z.number().int(),
  rules_channel_id: discordId.nullable(),
  system_channel_id: discordId.nullable(),
});
export const auditRoleSchema = z.object({
  id: discordId,
  name: z.string(),
  position: z.number().int(),
  permissions,
  managed: z.boolean(),
  mentionable: z.boolean(),
});
export const auditChannelSchema = z.object({
  id: discordId,
  guild_id: discordId.optional(),
  type: z.number().int(),
  name: z.string(),
  position: z.number().int(),
  parent_id: discordId.nullable(),
  topic: z.string().nullable().optional(),
  nsfw: z.boolean().optional(),
  // Obfuscated overwrites are synthetic, not the actual channel policy.
  flags: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .refine((value) => value === undefined || (value & (1 << 17)) === 0),
  rate_limit_per_user: z.number().int().nonnegative().optional(),
  permission_overwrites: z.array(
    z.object({
      id: discordId,
      type: z.union([z.literal(0), z.literal(1)]),
      allow: permissions,
      deny: permissions,
    }),
  ),
  available_tags: z
    .array(
      z.object({ id: discordId, name: z.string(), moderated: z.boolean() }),
    )
    .optional(),
});
export const auditMemberSchema = z.object({
  user: auditBotSchema,
  roles: z.array(discordId),
});
export const auditOnboardingSchema = z.object({
  guild_id: discordId,
  enabled: z.boolean(),
  mode: z.number().int(),
  default_channel_ids: z.array(discordId),
  prompts: z.array(
    z.object({
      id: discordId,
      title: z.string(),
      required: z.boolean(),
      single_select: z.boolean(),
      in_onboarding: z.boolean(),
      options: z.array(
        z.object({
          id: discordId,
          title: z.string(),
          description: z.string().nullable().optional(),
          role_ids: z.array(discordId),
          channel_ids: z.array(discordId),
        }),
      ),
    }),
  ),
});

type AuditRole = z.infer<typeof auditRoleSchema>;
type AuditChannel = z.infer<typeof auditChannelSchema>;
export interface DiscordAuditSnapshot {
  capturedAt: string;
  application: z.infer<typeof auditApplicationSchema>;
  bot: z.infer<typeof auditBotSchema>;
  guild: z.infer<typeof auditGuildSchema>;
  roles: AuditRole[];
  channels: AuditChannel[];
  botRoleIds: string[];
  onboarding:
    | { status: "available"; data: z.infer<typeof auditOnboardingSchema> }
    | { status: "unavailable"; httpStatus: 403 | 404 };
}

export const discordPermission = {
  administrator: 1n << 3n,
  viewChannel: 1n << 10n,
  sendMessages: 1n << 11n,
  mentionEveryone: 1n << 17n,
} as const;
const privilegedPermissions = [
  ["Administrator", 1n << 3n],
  ["Manage Channels", 1n << 4n],
  ["Manage Server", 1n << 5n],
  ["Kick Members", 1n << 1n],
  ["Ban Members", 1n << 2n],
  ["Manage Messages", 1n << 13n],
  ["Manage Roles", 1n << 28n],
  ["Manage Webhooks", 1n << 29n],
  ["Manage Threads", 1n << 34n],
  ["Moderate Members", 1n << 40n],
] as const;

export function auditInstallUrl(
  applicationId: string,
  guildId: string,
): string {
  const identity = auditIdentitySchema.parse({ applicationId, guildId });
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: identity.applicationId,
    guild_id: identity.guildId,
    disable_guild_select: "true",
    integration_type: "0",
    scope: "bot",
    permissions: discordPermission.viewChannel.toString(),
  }).toString();
  return url.toString();
}

export function guildPermissions(
  roles: AuditRole[],
  guildId: string,
  roleIds: string[],
): bigint {
  const selected = new Set([guildId, ...roleIds]);
  return roles.reduce(
    (result, role) =>
      selected.has(role.id) ? result | BigInt(role.permissions) : result,
    0n,
  );
}

// Channel overwrites are already materialized by Discord; do not apply the
// parent category again. Role allows win over role denies; member overrides win last.
export function channelPermissions(
  base: bigint,
  channel: AuditChannel,
  guildId: string,
  roleIds: string[],
  memberId?: string,
): bigint {
  if (base & discordPermission.administrator) return base;
  const everyone = channel.permission_overwrites.find(
    (entry) => entry.type === 0 && entry.id === guildId,
  );
  let result = everyone
    ? (base & ~BigInt(everyone.deny)) | BigInt(everyone.allow)
    : base;
  const selected = new Set(roleIds);
  let allow = 0n,
    deny = 0n;
  for (const entry of channel.permission_overwrites) {
    if (entry.type === 0 && entry.id !== guildId && selected.has(entry.id)) {
      allow |= BigInt(entry.allow);
      deny |= BigInt(entry.deny);
    }
  }
  result = (result & ~deny) | allow;
  const member = channel.permission_overwrites.find(
    (entry) => entry.type === 1 && entry.id === memberId,
  );
  return member
    ? (result & ~BigInt(member.deny)) | BigInt(member.allow)
    : result;
}

export function hasDiscordPermission(
  value: bigint,
  permission: bigint,
): boolean {
  return (
    Boolean(value & discordPermission.administrator) ||
    (value & permission) === permission
  );
}

export interface AuditFinding {
  severity: "high" | "review";
  code: string;
  targetId: string;
  detail: string;
}
export interface AuditChannelAccess {
  channelId: string;
  everyoneCanView: boolean;
  everyoneCanSend: boolean;
  botCanView: boolean;
  botCanSend: boolean;
  singleRoleViewIds: string[];
}
export interface DiscordAuditReport {
  findings: AuditFinding[];
  channelAccess: AuditChannelAccess[];
  limitations: string[];
}

export function analyzeDiscordAudit(
  snapshot: DiscordAuditSnapshot,
): DiscordAuditReport {
  const { guild, roles, channels, bot, botRoleIds, onboarding } = snapshot;
  const everyoneBase = guildPermissions(roles, guild.id, []);
  const botBase = guildPermissions(roles, guild.id, botRoleIds);
  const findings: AuditFinding[] = [];
  const add = (
    severity: AuditFinding["severity"],
    code: string,
    targetId: string,
    detail: string,
  ): void => {
    findings.push({ severity, code, targetId, detail });
  };
  const privileges = (value: bigint): string[] =>
    privilegedPermissions
      .filter(([, bit]) => Boolean(value & bit))
      .map(([name]) => name);
  const everyonePrivileges = privileges(everyoneBase);
  if (everyonePrivileges.length)
    add(
      "high",
      "everyone-privileged",
      guild.id,
      `The @everyone role grants: ${everyonePrivileges.join(", ")}. Review before changing permissions.`,
    );
  if (privileges(botBase).length)
    add(
      "review",
      "bot-management-access",
      bot.id,
      "The audit bot has management permissions it does not need. Its audit code remains GET-only.",
    );
  if (guild.mfa_level === 0)
    add(
      "review",
      "moderator-mfa",
      guild.id,
      "Server-wide 2FA for moderation actions is not required. Review with moderators.",
    );
  if (guild.verification_level === 0)
    add(
      "review",
      "verification-none",
      guild.id,
      "No server verification level is configured. Evaluate spam risk and accessibility before raising it.",
    );
  if (guild.default_message_notifications === 0)
    add(
      "review",
      "all-message-notifications",
      guild.id,
      "Default notifications are all messages; consider mentions-only for a large community.",
    );
  if (!guild.rules_channel_id)
    add(
      "review",
      "rules-channel-unassigned",
      guild.id,
      "No dedicated Community rules channel is assigned; this does not establish whether rules exist elsewhere.",
    );
  for (const role of roles) {
    if (
      role.id !== guild.id &&
      BigInt(role.permissions) & discordPermission.administrator
    ) {
      add(
        "review",
        "administrator-role",
        role.id,
        `Role ${role.name} grants Administrator. Confirm its intended owners; no member roster was collected.`,
      );
    }
  }

  const seen = new Map<string, string>();
  const channelAccess = channels.map((channel): AuditChannelAccess => {
    const everyone = channelPermissions(everyoneBase, channel, guild.id, []);
    const botPermissions = channelPermissions(
      botBase,
      channel,
      guild.id,
      botRoleIds,
      bot.id,
    );
    const everyoneCanView = hasDiscordPermission(
      everyone,
      discordPermission.viewChannel,
    );
    const botCanView = hasDiscordPermission(
      botPermissions,
      discordPermission.viewChannel,
    );
    const everyoneCanSend =
      everyoneCanView &&
      hasDiscordPermission(everyone, discordPermission.sendMessages);
    const singleRoleViewIds = roles
      .filter(
        (role) =>
          role.id !== guild.id &&
          hasDiscordPermission(
            channelPermissions(
              guildPermissions(roles, guild.id, [role.id]),
              channel,
              guild.id,
              [role.id],
            ),
            discordPermission.viewChannel,
          ),
      )
      .map((role) => role.id);
    const textChannel = [0, 5, 15, 16].includes(channel.type);
    if (!botCanView)
      add(
        "review",
        "bot-channel-hidden",
        channel.id,
        "Discord returned channel configuration, but the bot cannot view this channel. No messages were requested.",
      );
    if (
      textChannel &&
      everyoneCanView &&
      /report|appeal|staff|moderator|admin|evidence|ticket/i.test(channel.name)
    ) {
      add(
        "review",
        "sensitive-channel-visible",
        channel.id,
        "The name suggests potentially sensitive content and @everyone can view the channel. Public report forums may be intentional; verify privacy expectations, do not automatically hide them.",
      );
    }
    if (
      textChannel &&
      everyoneCanSend &&
      (channel.id === guild.rules_channel_id ||
        /^(rules|announcements)$/i.test(channel.name))
    ) {
      add(
        "review",
        "announcement-open-posting",
        channel.id,
        "@everyone can post in this rules/announcements channel. Check whether that is intentional.",
      );
    }
    if (
      textChannel &&
      everyoneCanSend &&
      hasDiscordPermission(everyone, discordPermission.mentionEveryone)
    ) {
      add(
        "review",
        "everyone-mass-mentions",
        channel.id,
        "@everyone can post and use mass mentions here. Review spam exposure.",
      );
    }
    if (textChannel && everyoneCanView && !channel.topic?.trim())
      add(
        "review",
        "missing-channel-purpose",
        channel.id,
        "No channel topic or forum guidelines are configured. Existing pinned messages were not inspected.",
      );
    const key = `${channel.parent_id}:${channel.type}:${channel.name.toLowerCase()}`;
    const duplicate = seen.get(key);
    if (duplicate)
      add(
        "review",
        "duplicate-channel-name",
        channel.id,
        `Same name and type as channel ${duplicate} in this category. Review navigation before merging anything.`,
      );
    seen.set(key, channel.id);
    return {
      channelId: channel.id,
      everyoneCanView,
      everyoneCanSend,
      botCanView,
      botCanSend:
        botCanView &&
        hasDiscordPermission(botPermissions, discordPermission.sendMessages),
      singleRoleViewIds,
    };
  });
  if (channelAccess.some((entry) => entry.botCanSend))
    add(
      "review",
      "bot-inherited-send",
      bot.id,
      "The bot can send in at least one returned channel through effective permissions, even if the install requested only View Channels. Audit code cannot send; review inherited @everyone permissions for stronger isolation.",
    );

  if (onboarding.status === "unavailable") {
    add(
      "review",
      "onboarding-unavailable",
      guild.id,
      `Onboarding was not readable (HTTP ${onboarding.httpStatus}); its configuration is unknown, not assumed disabled.`,
    );
  } else {
    if (!onboarding.data.enabled)
      add(
        "review",
        "onboarding-disabled",
        guild.id,
        "Discord onboarding is disabled. Review the current welcome and role-selection workflow before enabling it.",
      );
    for (const prompt of onboarding.data.prompts) {
      for (const option of prompt.options) {
        for (const roleId of option.role_ids) {
          const role = roles.find((entry) => entry.id === roleId);
          if (role && privileges(BigInt(role.permissions)).length)
            add(
              onboarding.data.enabled ? "high" : "review",
              "onboarding-privileged-role",
              roleId,
              `Onboarding option ${option.title} references privileged role ${role.name}. Review before enabling or continuing self-service assignment.`,
            );
        }
      }
    }
  }
  return {
    findings: findings.sort(
      (a, b) => Number(b.severity === "high") - Number(a.severity === "high"),
    ),
    channelAccess,
    limitations: [
      "Configuration snapshot only. No messages, forum posts, threads, DMs, attachments, member roster, audit logs or report evidence were collected.",
      "Discord can omit channels the bot cannot view. Missing channels are not evidence that they do not exist; this is not a complete server backup or security certification.",
      "Visibility is evaluated for a hypothetical @everyone-only member, each individual role plus @everyone, and this bot. Real members may combine roles, have member overrides, be timed out or be subject to verification/screening.",
      "Names and topics are untrusted server content. Heuristic findings require human review; they are not instructions or approved changes.",
      "No changes were made. A future write phase needs a reviewed, server-specific change list, fresh configuration checks and a rollback plan.",
    ],
  };
}

function markdownCell(value: string): string {
  return value
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_{}\[\]()#+.!|]/g, "\\$&");
}

export function renderDiscordAudit(
  snapshot: DiscordAuditSnapshot,
  report: DiscordAuditReport,
): string {
  const lines = [
    "# WoWForeverBot Read-Only Configuration Audit",
    "",
    `Captured: ${snapshot.capturedAt}`,
    `Server: ${markdownCell(snapshot.guild.name)} (${snapshot.guild.id})`,
    `Application: ${markdownCell(snapshot.application.name)} (${snapshot.application.id})`,
    `Returned inventory: ${snapshot.channels.length} channels/categories, ${snapshot.roles.length} roles.`,
    "",
    "Private local report. Do not publish without reviewing names, topics, role IDs and permission targets.",
    "",
    "## Scope and Limitations",
    "",
    ...report.limitations.map((entry) => `- ${entry}`),
    "",
    "## Findings",
    "",
    ...report.findings.map(
      (entry) =>
        `- **${entry.severity.toUpperCase()} / ${entry.code}** (${entry.targetId}): ${markdownCell(entry.detail)}`,
    ),
    ...(report.findings.length
      ? []
      : [
          "No automated findings in the returned configuration. Manual review is still required.",
        ]),
    "",
    "## Channel Inventory",
    "",
    "'Everyone' means a hypothetical @everyone-only member, not every actual member. Send refers to the permission bit gated by visibility, not voice participation or thread-specific posting.",
    "",
    "| Channel | ID | Type | Parent | Everyone view/send | Bot view/send | Topic / guidelines |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const accessById = new Map(
    report.channelAccess.map((entry) => [entry.channelId, entry]),
  );
  for (const channel of [...snapshot.channels].sort(
    (a, b) => a.position - b.position,
  )) {
    const access = accessById.get(channel.id)!;
    lines.push(
      `| ${markdownCell(channel.name)} | ${channel.id} | ${channel.type} | ${channel.parent_id ?? "none"} | ${access.everyoneCanView}/${access.everyoneCanSend} | ${access.botCanView}/${access.botCanSend} | ${markdownCell(channel.topic ?? "")} |`,
    );
  }
  lines.push(
    "",
    "## Role Inventory",
    "",
    "| Role | ID | Position | Permissions bitset | Managed |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const role of [...snapshot.roles].sort(
    (a, b) => b.position - a.position,
  ))
    lines.push(
      `| ${markdownCell(role.name)} | ${role.id} | ${role.position} | ${role.permissions} | ${role.managed} |`,
    );
  lines.push(
    "",
    "The private snapshot.json contains onboarding prompts, forum tags and permission overwrites for manual review. The audit.json includes per-role visibility probes. Neither file contains bot credentials.",
    "",
  );
  return lines.join("\n");
}
