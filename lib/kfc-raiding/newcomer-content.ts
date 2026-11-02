import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import {
  auditChannelSchema,
  auditRoleSchema,
  guildPermissions,
  channelPermissions,
  hasDiscordPermission,
} from "../discord-audit";
import {
  kfcForeverJoiningComponents,
  kfcForeverJoiningDescription,
  kfcForeverJoiningFooter,
} from "../../content/kfc-forever-joining";
import { forumGuide } from "../../content/kfc-raiding";
import {
  kfcNewcomerFooter,
  kfcWelcomeDescription,
  kfcWelcomeComponents,
  kfcWelcomeTopic,
  kfcForeverApplicationGuide,
  kfcForeverDiscussionGuide,
  kfcForeverInviteGuide,
  kfcTbcJoiningSummary,
} from "../../content/kfc-raid-welcome";
import {
  discordMessageSchema,
  type MessagePayload,
  type RaidingConfig,
} from "./contracts";
import { z } from "zod";

export interface NewcomerMessage {
  key: string;
  channelId: string;
  messageId: string;
  payload: MessagePayload;
  topic?: string;
}

export function newcomerMessages(config: RaidingConfig): NewcomerMessage[] {
  const payload = (
    title: string,
    description: string,
    joining = false,
  ): MessagePayload => ({
    content: "",
    embeds: [
      {
        title,
        description,
        color: 0xe7b65b,
        footer: { text: joining ? kfcForeverJoiningFooter : kfcNewcomerFooter },
      },
    ],
    components: joining
      ? kfcForeverJoiningComponents()
      : kfcWelcomeComponents(),
    allowed_mentions: { parse: [] },
  });
  return [
    {
      key: "welcome",
      channelId: "1557974301095755900",
      messageId: "1557974307580420160",
      payload: payload("Welcome to KFC", kfcWelcomeDescription),
      topic: kfcWelcomeTopic,
    },
    {
      key: "joining",
      channelId: "1411545672313737346",
      messageId: "1557974330955145330",
      payload: payload(
        "Joining KFC",
        `${kfcForeverJoiningDescription}\n\n${kfcTbcJoiningSummary}\n\n**Upcoming events**\n<#1557974287602819164>\n\nhttps://kfcguild.online/`,
        true,
      ),
    },
    {
      key: "application",
      channelId: "1558008778732077090",
      messageId: "1558008811728666706",
      payload: payload(
        "Join KFC | WoW Forever",
        kfcForeverApplicationGuide,
        true,
      ),
    },
    {
      key: "discussion",
      channelId: "1548519535177629707",
      messageId: "1565750725009604731",
      payload: payload(
        "Forever · Raids and community",
        kfcForeverDiscussionGuide,
      ),
      topic:
        "Forever community chat. Raids: <#1565932272631283853>. Questions about a specific raid belong in its post. Guild joining: <#1411545672313737346>.",
    },
    {
      key: "invite",
      channelId: "1550970060812587028",
      messageId: "1565750737655304374",
      payload: payload("Forever · Guild invites", kfcForeverInviteGuide, true),
      topic:
        "Guild invites after officer acceptance: Djilanov, psyrogue, nelf, nunk or Animagigel. Apply: <#1411545672313737346>. Public raid signups: <#1565932272631283853>.",
    },
    ...(["forever", "tbc"] as const).map((game): NewcomerMessage => ({
      key: `guide:${game}`,
      channelId: config.spaces[game].forumGuideId,
      messageId: config.spaces[game].forumGuideId,
      payload: forumGuide(game),
    })),
  ];
}

export function assertNewcomerMessage(
  raw: unknown,
  target: NewcomerMessage,
): void {
  const message = discordMessageSchema
    .extend({ pinned: z.literal(true) })
    .parse(raw);
  if (
    message.author.id !== kfcApplicationId ||
    !message.author.bot ||
    message.id !== target.messageId ||
    message.channel_id !== target.channelId
  )
    throw new Error(`Newcomer message identity changed: ${target.key}`);
}

export function assertRaidDiscoveryAccess(
  channelsRaw: unknown,
  rolesRaw: unknown,
  onboarding: unknown,
  config: RaidingConfig,
): void {
  const channels = z.array(auditChannelSchema).parse(channelsRaw);
  const roles = z.array(auditRoleSchema).parse(rolesRaw);
  const defaults = z
    .object({ default_channel_ids: z.array(z.string()) })
    .parse(onboarding).default_channel_ids;
  const base = guildPermissions(roles, kfcGuildId, []);
  const destinations = [
    ...defaults,
    ...(["forever", "tbc"] as const).flatMap((game) => {
      const space = config.spaces[game];
      return [space.schedule.channelId, space.forumId, space.chatId];
    }),
  ];
  let writableDefaults = 0;
  for (const id of new Set(destinations)) {
    const channel = channels.find((item) => item.id === id);
    if (!channel) throw new Error("A newcomer destination is missing.");
    const permissions = channelPermissions(base, channel, kfcGuildId, []);
    if (!hasDiscordPermission(permissions, (1n << 10n) | (1n << 16n)))
      throw new Error(`A newcomer destination is hidden: ${channel.name}`);
    if (defaults.includes(id) && hasDiscordPermission(permissions, 1n << 11n))
      writableDefaults++;
    if (channel.type === 15 && !hasDiscordPermission(permissions, 1n << 38n))
      throw new Error("Newcomers cannot reply in the raid forum.");
  }
  if (new Set(defaults).size < 7 || writableDefaults < 5)
    throw new Error(
      "Discord onboarding requires seven defaults, including five writable channels.",
    );
}
