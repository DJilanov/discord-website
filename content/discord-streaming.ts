export const streamingParentId = "1554318911082856538";
export const streamersChannelId = "1554324295143133184";
export const streamcordRoleId = "1554648480323084301";
export const streamingModeratorId = "1554333297704706098";
export const streamingBanRoleId = "1554617887912890378";
export const streamingPromptTitle = "Interested in streams and creators?";

export const streamingChannels = [
  {
    key: "alerts",
    name: "live-now",
    type: 0,
    pinGuide: true,
    topic:
      "Twitch go-live alerts for approved WoW Forever creators. Discuss sessions and introduce your channel in streamers. Alerts are optional; no @everyone or @here. Creator onboarding and alert configuration are managed by moderators.",
  },
  { key: "voice", name: "Community Streams", type: 2, pinGuide: false },
] as const;

export type StreamingChannelKey = (typeof streamingChannels)[number]["key"];
export interface StreamingChannelIds {
  alerts: string;
  voice: string;
}

export function streamingGuide(
  key: StreamingChannelKey,
  channels: StreamingChannelIds,
): string {
  if (key === "alerts")
    return [
      "**WoW Forever live streams**",
      "This feed is reserved for approved Twitch go-live alerts. Creator alerts still need to be configured in Streamcord; creating this channel does not automatically enable them.",
      `Introduce your channel or discuss a session in <#${streamersChannelId}>. Include your Twitch link, language, region and session focus. Manual promotion remains limited to one post per creator per rolling 24 hours.`,
      "The pilot alert policy is at most one promotional alert per creator per rolling 24 hours. Reconnects must not generate repeat promotions. No @everyone, @here or role pings. Where supported, mark the original alert ended instead of posting another notification.",
      `For native Discord gameplay sharing and conversation, join <#${channels.voice}>. Discord streaming is separate from Twitch; you do not need a Twitch account to participate.`,
      "Creators from any guild, faction or region are welcome under the same community rules. Ask a moderator to review your channel; never share passwords or stream keys.",
    ].join("\n\n");
  return [
    "**Community Streams**",
    "Share your own gameplay, show an addon, ask for help or watch and chat with other members. Alliance, Horde, EU and NA players are all welcome.",
    "Join this voice room and use Discord's Share Your Screen / Go Live button. Prefer your game or application window rather than your entire desktop. A Twitch account is not required.",
    "Keep microphones considerate, avoid speaking over the host and use this room's text chat for questions. Never display passwords, private conversations or another person's personal information.",
    "Before broadcasting or recording members' voices or messages outside Discord, tell everyone what will be shared and obtain their permission. Do not rebroadcast another creator's stream without permission.",
    `Twitch streams are listed in <#${channels.alerts}>; introduce yourself and arrange sessions in <#${streamersChannelId}>. Twitch and Discord broadcasts are separate and must be started separately.`,
    "Contact a moderator about disruption or inappropriate content. This room is not recorded or automatically relayed by WoWForeverBot.",
  ].join("\n\n");
}
