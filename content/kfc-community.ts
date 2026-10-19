export const kfcGuildId = "1411533815356194968";
export const foreverGuildId = "1554316932948172940";
export const kfcApplicationId = "1554796912673169428";
export const kfcManagementRoleId = "1411709733366403213";
export const kfcArchiveId = "1465900977256140905";
export const kfcRulesId = "1556204779531673723";
export const scheduledEventBindings = [
  {
    eventId: "cmuz20aal0000fu4s0vf3f2wx",
    projections: [
      { guildId: kfcGuildId, scheduledId: "1550723826864889886" },
      { guildId: foreverGuildId, scheduledId: "1560892325117435904" },
    ],
  },
] as const;
export const kfcNativeEventEditions: Readonly<
  Record<string, "tbc" | "forever">
> = { "1557893502585667654": "tbc" };

export interface KfcChannelTarget {
  id: string;
  name: string;
  topic?: string;
  readOnly?: boolean;
  public?: boolean;
}

export const kfcTargets: KfcChannelTarget[] = [
  { id: "1411592694404218991", name: "raid-voice-1", public: true },
  { id: "1412555658108211280", name: "Start Here" },
  { id: "1441654698519040114", name: "TBC Raids" },
  { id: "1548517693957869619", name: "WoW Forever" },
  { id: "1411600830251012096", name: "Raid Resources" },
  { id: "1411616134356009021", name: "Guides & Tools" },
  { id: "1411601777932894301", name: "Community" },
  { id: "1411564696644882552", name: "Staff" },
  { id: "1413349255263031458", name: "Optional News" },
  { id: "1411533816060842014", name: "Guild Members" },
  { id: kfcArchiveId, name: "Archives" },
  {
    id: kfcRulesId,
    name: "rules",
    public: true,
    readOnly: true,
    topic:
      "Community rules. Read the current resource below. Each event keeps its own published raid and loot terms.",
  },
  {
    id: "1411545639392645192",
    name: "announcements",
    public: true,
    readOnly: true,
    topic:
      "Important KFC community updates. Questions and discussion belong in general or raid-chat.",
  },
  {
    id: "1412553351874215976",
    name: "general",
    public: true,
    topic:
      "Chat, meet people and share your week. Keep disputes and personal evidence in private staff support.",
  },
  {
    id: "1411545672313737346",
    name: "joining-kfc",
    public: true,
    readOnly: true,
    topic:
      "Current guild profile and joining information below. EU Alliance PvP, English, flexible hosting. https://kfcguild.online/",
  },
  {
    id: "1411570010534449173",
    name: "raid-and-loot-policy",
    public: true,
    readOnly: true,
    topic:
      "Read your event's published rules, reserves, named HR items and roster policy before signup. Existing runs keep their existing agreement.",
  },
  {
    id: "1411616311477534803",
    name: "tools-and-addons",
    public: true,
    readOnly: true,
    topic:
      "Tools, safe project links and edition/build compatibility. Maintainer: Open source contributors. https://helper.kfcguild.online/",
  },
  {
    id: "1428013966176550962",
    name: "raid-preparation",
    public: true,
    readOnly: true,
    topic:
      "Preparation depends on the game, raid and host. Check your event requirements; old expansion posts are historical, not universal requirements.",
  },
  {
    id: "1411616667879997530",
    name: "class-guides",
    public: true,
    readOnly: true,
    topic:
      "Class and spec resources: identify TBC or Forever and the client/build before following a guide. Ask questions in new-player-help or raid-chat.",
  },
  {
    id: "1411617535966843000",
    name: "raid-guides",
    public: true,
    readOnly: true,
    topic:
      "Reviewed raid guides: https://kfcguild.online/guides . Check game edition and your host's preparation requirements.",
  },
  {
    id: "1547041622993281135",
    name: "attendance-help",
    topic:
      "Use Tentative or Absent on your event if plans change; rejoin when available. Notify your host if late. Personal explanations are not required in public.",
  },
  {
    id: "1548518038314295296",
    name: "character-plans",
    topic:
      "Forever character and class plans. Include faction and ruleset. This channel is not part of the shared-channel relay.",
  },
  {
    id: "1548519535177629707",
    name: "forever-discussion",
    public: true,
    topic:
      "WoW Forever discussion, questions and guild plans. Separate game facts from speculation. Existing shared-channel participation preferences remain unchanged.",
  },
  {
    id: "1548747530790248610",
    name: "forever-group-leveling",
    public: true,
    topic:
      "Forever leveling plans and current events. Use the event post for signup, roster and attendance changes; its time and loot terms are authoritative.",
  },
  {
    id: "1550970060812587028",
    name: "guild-invite",
    public: true,
    topic:
      "KFC Forever: EU, Alliance, PvP, English. Ask for an in-game invite with character name and availability; never post passwords or personal data.",
  },
  {
    id: "1460899582824153140",
    name: "tbc-announcements",
    public: true,
    readOnly: true,
    topic:
      "TBC run announcements. Open the linked signup for schedule, requirements, roster and loot; Discord Interested is not a character signup.",
  },
  {
    id: "1463110825790148639",
    name: "arena-partners",
    public: true,
    topic:
      "Arena partner requests remain here; the new pvp-groups board also supports structured requests. Include game, faction, spec, goal and timezone.",
  },
  {
    id: "1463605381342429195",
    name: "pvp-premades",
    public: true,
    topic:
      "Existing premade discussions remain here; use pvp-groups for a structured new request with start time, timezone and roles needed.",
  },
];

export const kfcClasses = [
  ["Warrior", "1411703120328790037"],
  ["Paladin", "1411706066554716240"],
  ["Hunter", "1411704606521823273"],
  ["Rogue", "1411706263577825341"],
  ["Priest", "1411706345547108362"],
  ["Mage", "1411708444305522758"],
  ["Warlock", "1411705756524351669"],
  ["Druid", "1411705928130105464"],
] as const;
export const kfcCombatRoles = [
  ["Tank", "1412601223617577011"],
  ["Healer", "1412601325585436865"],
  ["DPS", "1412601403091714162"],
] as const;

export interface KfcNewChannel {
  key: string;
  name: string;
  parentId: string | null;
  parentKey?: "groups";
  type: 0 | 4 | 15;
  topic?: string;
  readOnly?: boolean;
  tags?: string[];
}
export const kfcNewChannels: KfcNewChannel[] = [
  {
    key: "groups",
    name: "Find a Group",
    type: 4,
    parentId: null,
  },
  {
    key: "calendar",
    name: "raid-calendar",
    type: 0,
    parentId: null,
    parentKey: "groups",
    readOnly: true,
    topic:
      "Upcoming TBC and Forever groups, labelled by game. Open an event for time, preparation, loot and signup. Interested is not a character signup.",
  },
  {
    key: "introductions",
    name: "introductions",
    type: 0,
    parentId: "1411601777932894301",
    topic:
      "Say hello if you like: character/class, game and what you enjoy. Real names and personal details are not required.",
  },
  {
    key: "help",
    name: "new-player-help",
    type: 0,
    parentId: "1411601777932894301",
    topic:
      "New or returning to WoW? Ask here. Mention TBC or Forever, level and spec so answers fit your game. Help is voluntary; never share account credentials.",
  },
  {
    key: "raidChat",
    name: "raid-chat",
    type: 0,
    parentId: null,
    parentKey: "groups",
    topic:
      "TBC and Forever run questions: mention your game and event. A public signup does not automatically guarantee a selected raid seat.",
  },
  {
    key: "lfg",
    name: "looking-for-group",
    type: 0,
    parentId: null,
    parentKey: "groups",
    topic:
      "Include game, activity, faction/ruleset, start time, timezone and roles needed. Update your request when full or finished.",
  },
  {
    key: "start",
    name: "start-here",
    type: 0,
    parentId: "1412555658108211280",
    readOnly: true,
    topic:
      "Welcome, activity destinations and private staff-contact instructions. Classes and interests are optional in Channels & Roles.",
  },
  {
    key: "pvp",
    name: "pvp-groups",
    type: 15,
    parentId: null,
    parentKey: "groups",
    topic:
      "One post per group. Title: game - activity - start time. Include region, faction/ruleset, class/spec, roles needed, goal and timezone. Tag Arena, Battleground or World PvP and TBC or Forever. Edit when full; no public dispute evidence or mass mentions.",
    tags: [
      "Arena",
      "Battleground",
      "World PvP",
      "TBC",
      "Forever",
      "EU",
      "NA",
      "Open",
      "Full",
      "Finished",
    ],
  },
];

export const kfcDescription =
  "KFC: an English-speaking WoW guild and raid-hosting community. TBC runs, WoW Forever EU Alliance PvP, friendly groups and flexible schedules. Public runs and guild-priority events are clearly labelled.";

export interface KfcResource {
  key: string;
  channelId: string;
  title: string;
  description: string;
}
export function kfcResources(channels: Record<string, string>): KfcResource[] {
  const mention = (key: string): string => {
    if (!channels[key])
      throw new Error(`Missing KFC resource destination: ${key}`);
    return `<#${channels[key]}>`;
  };
  return [
    {
      key: "welcome",
      channelId: channels.start,
      title: "Welcome to KFC",
      description: `Find a run that fits your week, ask for help or just hang out. We respect each other's time without making WoW a second job.\n\n**Pick your game**\n**TBC Raids** - <#1460899582824153140> and existing raid signups\n**WoW Forever** - <#1548519535177629707> and <#1548747530790248610>\n**Find a Group** - shared calendar, LFG and PvP requests; include TBC or Forever in your post\n\n**Find your people**\n${mention("calendar")} - current signup destinations\n${mention("lfg")} - dungeon and questing groups\n${mention("pvp")} - arena, battleground and world PvP groups\n${mention("introductions")} / ${mention("help")} - say hello or ask a question\n\n**Before a raid**\nRead <#1411570010534449173> and the event's own requirements. Public runs and guild-priority runs are separate.\n\n**Private staff contact**\nFor a report, appeal or guild application, open the member list and DM a member of KFC Management. Include the event/message link and a short description. Do not post personal evidence in public. Staff will never ask for your game or Discord password. Response times depend on available volunteers.\n\nChoose optional classes and interests in **Channels & Roles**. KFC guild: https://kfcguild.online/ . The independent, open-faction Forever community: https://www.wowforeverdiscord.online/ .`,
    },
    {
      key: "conduct",
      channelId: kfcRulesId,
      title: "Community rules",
      description:
        "Respect people. No harassment, threats, discrimination, doxxing or scams.\n\nKeep discussion suitable for the community. No explicit sexual content.\n\nNo spam, unsolicited mass DMs, impersonation, real-money trading or prohibited software.\n\nRead an event's requirements, loot and timing before joining. Communicate availability changes; do not deliberately sabotage groups.\n\nSend disputes privately to KFC Management. No public dogpiles or retaliatory reports.\n\nFollow Discord's Community Guidelines and the applicable game's rules. These conduct rules do not change an existing raid's loot agreement.\n\nhttps://discord.com/guidelines",
    },
    {
      key: "joining",
      channelId: "1411545672313737346",
      title: "Joining KFC",
      description:
        "**KFC | WoW Forever EU Alliance PvP**\nAn English-speaking guild for raiders, social players and PvPers who enjoy good company and a relaxed atmosphere.\n\n**Experienced hosts. Flexible schedules.**\nWe've hosted nearly 500 TBC raids, with guild members organising runs throughout the week. Choose the groups that suit your schedule and enjoy the game together.\n\n**Join us for WoW Forever**\nPost your character name in <#1550970060812587028> or message KFC Management. New and returning players are welcome.\n\n**Find your next group**\nCheck <#1557974287602819164> for upcoming events. Each signup has the host's times, requirements and loot rules. You don't need to join the guild to take part in an open run.\n\nhttps://kfcguild.online/",
    },
    {
      key: "loot",
      channelId: "1411570010534449173",
      title: "Read the event before signing up",
      description:
        "**Your event is the agreement**\nCheck game edition, raid, start/finish time, roster-selection mode, gear/preparation, loot mode, role-specific reserve limits, named hard-reserved items and reserve deadline. If something is missing, ask the host before committing.\n\n**Signup is not always a seat**\nAn open signup pool may be rostered later. Tentative and Absent are availability choices, not confirmed attendance; you can rejoin when plans change.\n\n**Existing raids keep their terms**\nThis navigation resource does not replace a run's original Raid-Helper, SR or loot policy. Do not sign up twice across tools unless the host explicitly migrates the group. Material changes should be visible in event history.\n\n**Problems or appeals**\nDM KFC Management privately with the event and message links. No public personal evidence or retaliatory reporting.",
    },
    {
      key: "preparation",
      channelId: "1428013966176550962",
      title: "Prepare for your specific run",
      description:
        "**Check the event**\nConfirm game/edition, level, entry or attunement requirements, role/spec, meeting place, time and timezone, expected finish, voice requirements and the host's consumable/gear rules.\n\n**Bring the basics**\nRepair, free bag space, class reagents and the consumables the host actually requests. Read the linked strategy and ask about mechanics you have not seen. No blanket log or gear gate is implied for social/learning events.\n\n**Before the pull**\nCheck loot and reserve rules, declare any timing limits, and update Tentative/Absent if plans change. Old Classic posts and TBC-pending notes are historical; they are not current Forever preparation requirements.\n\nGuides: https://kfcguild.online/guides",
    },
    {
      key: "tools",
      channelId: "1411616311477534803",
      title: "Tools and addons",
      description:
        "**Browser tools**\nhttps://helper.kfcguild.online/ - maintained tools and item resources.\nhttps://helper.kfcguild.online/forever/trader - Forever auction observations. Select the correct faction/market and check the accepted scan time; stale prices are not trading advice or guaranteed profit.\n\n**Addon compatibility**\nCheck your exact game edition, client/build and the project's installation notes. WoW Trader has been tested by the maintainers on Forever; other guild raid addons are not yet verified on Forever while raids are unavailable. A TBC addon is not automatically a Forever addon.\n\n**For a raid**\nUse the host's required boss/raid addons for the supported edition. Optional UI tools are not universal signup requirements. Download from the maintained project or a reputable addon source; never disable account/OS security or share pairing codes.\n\nMaintainer: **Open source contributors**. Ask in new-player-help with edition, version and a redacted error.",
    },
    {
      key: "guides",
      channelId: "1411617535966843000",
      title: "Raid guides by edition",
      description:
        "Find maintained guild raid and attunement guides at https://kfcguild.online/guides .\n\nCheck the game's edition and publication/update date, then your event's preparation and loot requirements. A TBC strategy or loot table is not evidence of Forever raid behaviour.\n\nFor current Forever community onboarding and confirmed information: https://www.wowforeverdiscord.online/guides .\n\nAsk raid questions in raid-chat; report corrections with a guide link and the specific mechanic. Older channel posts remain available as historical references.",
    },
    {
      key: "class",
      channelId: "1411616667879997530",
      title: "Class and spec help",
      description: `Choose your class and combat-role interests in **Channels & Roles**; these roles do not grant a raid seat or staff privileges.\n\nAsk in ${mention("help")} or ${mention("raidChat")} with your game/edition, level, specialization and goal. Keep advice edition-specific and distinguish tested builds from speculation.\n\nGuides and tools: https://kfcguild.online/guides and https://helper.kfcguild.online/ . Do not paste account credentials or private character exports.`,
    },
    {
      key: "calendar",
      channelId: channels.calendar,
      title: "Find an upcoming run",
      description:
        "**TBC runs**\n<#1460899582824153140> - host announcements and their authoritative signup links. Existing dated raid channels and Raid-Helper signups remain active until the host closes or migrates the run.\n\n**WoW Forever**\n<#1548747530790248610> - guild group-leveling plans and current event posts.\n<#1548519535177629707> - discussion and questions.\n\n**Quick groups**\nUse looking-for-group for dungeon/questing requests and pvp-groups for structured PvP posts.\n\nDiscord's Events/Interested helps you remember a run; it does not reserve a character slot or loot. Open the actual signup for class/spec, roster, time and loot. Never sign up twice across tools unless the host explicitly asks you to.",
    },
  ];
}
