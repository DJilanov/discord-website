import { z } from "zod";
import {
  auditChannelSchema,
  auditRoleSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  discordId,
} from "@/lib/discord-audit";
import { HttpError } from "@/lib/security";
import { pilotDiscordIds } from "./config";
import {
  raidDiscordDestinations,
  raidDiscordDestination,
  raidDiscordGuildIds,
  raidDiscordSettings,
  type RaidDiscordDestination,
  type RaidDiscordDestinationView,
} from "./discord-settings";

export const raidChannelGuildSchema = z.object({
  id: discordId,
  name: z.string(),
  owner_id: discordId,
});
export const raidChannelMemberSchema = z.object({
  user: z.object({ id: discordId, bot: z.boolean().optional() }),
  roles: z.array(discordId),
  pending: z.boolean().optional(),
  communication_disabled_until: z.iso
    .datetime({ offset: true })
    .nullable()
    .optional(),
});
type Channel = z.infer<typeof auditChannelSchema>;
type Member = z.infer<typeof raidChannelMemberSchema>;
type Guild = z.infer<typeof raidChannelGuildSchema>;
const viewAndSend = (1n << 10n) | (1n << 11n);
const postPermissions = viewAndSend | (1n << 14n) | (1n << 15n) | (1n << 16n);

export function pilotPrivateChannel(
  channel: Pick<Channel, "permission_overwrites">,
  guildId: string,
  botId: string,
): boolean {
  const everyone = channel.permission_overwrites.find(
    (entry) => entry.id === guildId && entry.type === 0,
  );
  const viewers = new Set([...pilotDiscordIds(), botId]);
  return (
    !!everyone &&
    (BigInt(everyone.deny) & 1024n) === 1024n &&
    !channel.permission_overwrites.some(
      (entry) =>
        (BigInt(entry.allow) & 1024n) !== 0n &&
        (entry.type !== 1 || !viewers.has(entry.id)),
    )
  );
}

export function raidChannelEligible(
  channel: Channel,
  guild: Guild,
  roles: z.infer<typeof auditRoleSchema>[],
  bot: Member,
  organizer: Member,
  forumParent?: Channel,
): boolean {
  const forumThread =
    channel.type === 11 &&
    forumParent?.type === 15 &&
    channel.parent_id === forumParent.id &&
    channel.guild_id === forumParent.guild_id;
  if (
    (![0, 5].includes(channel.type) && !forumThread) ||
    channel.nsfw ||
    forumParent?.nsfw ||
    (channel.guild_id !== undefined && channel.guild_id !== guild.id) ||
    !bot.user.bot ||
    organizer.user.bot ||
    bot.pending ||
    organizer.pending ||
    [bot, organizer].some(
      (member) =>
        member.communication_disabled_until &&
        new Date(member.communication_disabled_until) > new Date(),
    )
  )
    return false;
  const permissions = (member: Member): bigint =>
    channelPermissions(
      member.user.id === guild.owner_id
        ? 8n
        : guildPermissions(roles, guild.id, member.roles),
      forumThread ? forumParent! : channel,
      guild.id,
      member.roles,
      member.user.id,
    );
  return (
    hasDiscordPermission(
      permissions(bot),
      forumThread
        ? (postPermissions & ~(1n << 11n)) | (1n << 38n)
        : postPermissions,
    ) &&
    hasDiscordPermission(
      permissions(organizer),
      forumThread ? (viewAndSend & ~(1n << 11n)) | (1n << 38n) : viewAndSend,
    )
  );
}

export type RaidChannelRequest = (route: string) => Promise<unknown>;
export function raidChannelRequest(organizerId: string): RaidChannelRequest {
  const settings = raidDiscordSettings();
  if (!settings) throw new HttpError(503, "Discord posting is not configured.");
  discordId.parse(organizerId);
  const routes = new Set(
    raidDiscordGuildIds().flatMap((id) => [
      `/guilds/${id}`,
      `/guilds/${id}/roles`,
      `/guilds/${id}/channels`,
      `/guilds/${id}/members/${settings.applicationId}`,
      `/guilds/${id}/members/${organizerId}`,
    ]),
  );
  return async (route: string): Promise<unknown> => {
    if (!routes.has(route))
      throw new Error("raid_channel_discovery_out_of_scope");
    const response = await fetch(`https://discord.com/api/v10${route}`, {
      headers: { Authorization: `Bot ${settings.token}` },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new HttpError(
        response.status === 429 ? 429 : 503,
        "Discord channel lookup is unavailable. Refresh the list before posting.",
      );
    }
    const text = await response.text();
    if (text.length > 2097152)
      throw new Error("raid_channel_response_too_large");
    return JSON.parse(text) as unknown;
  };
}

export async function canManageRaidChannels(
  organizerId: string,
  request?: RaidChannelRequest,
): Promise<boolean> {
  const settings = raidDiscordSettings();
  if (!settings) return false;
  const read = request ?? raidChannelRequest(organizerId);
  try {
    const guild = raidChannelGuildSchema.parse(
      await read(`/guilds/${settings.guildId}`),
    );
    const member = raidChannelMemberSchema.parse(
      await read(`/guilds/${settings.guildId}/members/${organizerId}`),
    );
    if (guild.id !== settings.guildId || member.user.id !== organizerId)
      throw new Error("raid_admin_identity_mismatch");
    if (
      member.user.bot ||
      member.pending ||
      (member.communication_disabled_until &&
        new Date(member.communication_disabled_until) > new Date())
    )
      return false;
    if (guild.owner_id === organizerId) return true;
    const roles = z
      .array(auditRoleSchema)
      .parse(await read(`/guilds/${settings.guildId}/roles`));
    return hasDiscordPermission(
      guildPermissions(roles, guild.id, member.roles),
      8n,
    );
  } catch {
    throw new HttpError(
      503,
      "Discord administrator permissions could not be verified. Try again shortly.",
    );
  }
}

async function requireChannelAdministrator(
  organizerId: string,
  request?: RaidChannelRequest,
): Promise<void> {
  if (!(await canManageRaidChannels(organizerId, request)))
    throw new HttpError(
      403,
      "Only Discord server administrators can choose a posting channel.",
    );
}

export async function discoverRaidChannels(
  organizerId: string,
  request?: RaidChannelRequest,
): Promise<{
  channels: RaidDiscordDestinationView[];
  warnings: string[];
}> {
  const settings = raidDiscordSettings();
  if (!settings) return { channels: [], warnings: [] };
  await requireChannelAdministrator(organizerId, request);
  const read = request ?? raidChannelRequest(organizerId);
  const channels: RaidDiscordDestinationView[] = [];
  const warnings: string[] = [];
  const configured = new Map(
    raidDiscordDestinations().map((entry) => [entry.channelId, entry]),
  );
  for (const guildId of raidDiscordGuildIds()) {
    try {
      const guild = raidChannelGuildSchema.parse(
        await read(`/guilds/${guildId}`),
      );
      if (guild.id !== guildId) throw new Error("raid_guild_identity_mismatch");
      const organizer = raidChannelMemberSchema.parse(
        await read(`/guilds/${guildId}/members/${organizerId}`),
      );
      const bot = raidChannelMemberSchema.parse(
        await read(`/guilds/${guildId}/members/${settings.applicationId}`),
      );
      if (
        organizer.user.id !== organizerId ||
        bot.user.id !== settings.applicationId
      )
        throw new Error("raid_member_identity_mismatch");
      const roles = z
        .array(auditRoleSchema)
        .parse(await read(`/guilds/${guildId}/roles`));
      const list = z
        .array(auditChannelSchema)
        .parse(await read(`/guilds/${guildId}/channels`));
      for (const channel of list.sort((a, b) => a.position - b.position)) {
        if (!raidChannelEligible(channel, guild, roles, bot, organizer))
          continue;
        const privateTarget = configured.get(channel.id);
        const isPrivate =
          privateTarget?.guildId === guildId &&
          privateTarget.visibility !== "community" &&
          pilotPrivateChannel(channel, guildId, bot.user.id);
        const category = list.find(
          (entry) => entry.id === channel.parent_id && entry.type === 4,
        )?.name;
        channels.push({
          guildId,
          channelId: channel.id,
          label: `${guild.name}${category ? ` / ${category}` : ""} / #${channel.name}`,
          visibility: isPrivate ? "private" : "community",
        });
      }
    } catch {
      warnings.push(
        `Channel lookup unavailable for server ${guildId}. You and the bot must both be members.`,
      );
    }
  }
  channels.sort(
    (a, b) =>
      Number(b.channelId === settings.channelId) -
      Number(a.channelId === settings.channelId),
  );
  return { channels, warnings };
}

export async function resolveRaidDestination(
  channelId: string | null,
  organizerId: string,
  confirmed: boolean,
  request?: RaidChannelRequest,
): Promise<RaidDiscordDestination | null> {
  if (channelId === null) {
    const destination = raidDiscordDestination(null);
    if (!destination || destination.visibility !== "community")
      return destination;
    if (!confirmed)
      throw new HttpError(
        400,
        "Confirm that the event and its roster will be visible in the Discord beta channel.",
      );
    const read = request ?? raidChannelRequest(organizerId);
    const guild = raidChannelGuildSchema.parse(
      await read(`/guilds/${destination.guildId}`),
    );
    const organizer = raidChannelMemberSchema.parse(
      await read(`/guilds/${destination.guildId}/members/${organizerId}`),
    );
    const bot = raidChannelMemberSchema.parse(
      await read(
        `/guilds/${destination.guildId}/members/${destination.applicationId}`,
      ),
    );
    const roles = z
      .array(auditRoleSchema)
      .parse(await read(`/guilds/${destination.guildId}/roles`));
    const channel = z
      .array(auditChannelSchema)
      .parse(await read(`/guilds/${destination.guildId}/channels`))
      .find((entry) => entry.id === destination.channelId);
    if (
      guild.id !== destination.guildId ||
      organizer.user.id !== organizerId ||
      bot.user.id !== destination.applicationId ||
      !channel ||
      !raidChannelEligible(channel, guild, roles, bot, organizer)
    )
      throw new HttpError(
        403,
        "The beta Discord channel is unavailable or posting permission is missing.",
      );
    return destination;
  }
  if (
    !confirmed &&
    raidDiscordDestinations().some(
      (entry) =>
        entry.channelId === channelId && entry.visibility !== "community",
    )
  ) {
    await requireChannelAdministrator(organizerId, request);
    return raidDiscordDestination(channelId);
  }
  const settings = raidDiscordSettings();
  if (!settings) throw new HttpError(503, "Discord posting is not configured.");
  if (!confirmed)
    throw new HttpError(
      400,
      "Confirm that the event and its roster will be visible in the selected Discord channel.",
    );
  const { channels } = await discoverRaidChannels(organizerId, request);
  const selected = channels.find((entry) => entry.channelId === channelId);
  if (!selected)
    throw new HttpError(
      400,
      "This Discord channel is unavailable or you or the bot lack permission to post there. Refresh the list.",
    );
  if (selected.visibility === "private")
    return raidDiscordDestination(channelId);
  return {
    ...settings,
    guildId: selected.guildId,
    channelId,
    label: selected.label,
    visibility: "community",
  };
}
