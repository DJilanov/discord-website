export interface ForeverOpeningRaid {
  key: string;
  title: string;
  raidName: "Barrow Deeps" | "Hyjal Summit" | "Onyxia's Lair";
  localStart: string;
  durationMinutes: number;
  leader: "DJ" | "Psy";
  capacity: 10 | 20 | 40;
  pace: "Semi-hardcore" | "Normal";
  morning: boolean;
  assistant?: string;
  introduction: string;
}

export const foreverOpeningRaids: readonly ForeverOpeningRaid[] = [
  {
    key: "2026-12-10-barrow-evening",
    title: "Barrow Deeps · Semi-hardcore · DJ",
    raidName: "Barrow Deeps",
    localStart: "2026-12-10T20:00",
    durationMinutes: 120,
    leader: "DJ",
    capacity: 10,
    pace: "Semi-hardcore",
    morning: false,
    introduction:
      "KFC's first semi-hardcore Barrow Deeps run. Come ready to listen, adapt and work through the new encounters together. Opening-week progress and clean execution come first; this is not advertised as a speedrun.",
  },
  {
    key: "2026-12-11-barrow-morning",
    title: "Barrow Deeps · Morning normal · DJ",
    raidName: "Barrow Deeps",
    localStart: "2026-12-11T11:00",
    durationMinutes: 120,
    leader: "DJ",
    capacity: 10,
    pace: "Normal",
    morning: true,
    assistant: "Vargos",
    introduction:
      "A proper morning raid for players who prefer daylight hours. We will take Barrow Deeps at a steady, organized pace, with clear calls and room to learn the new encounters.",
  },
  {
    key: "2026-12-11-hyjal-evening",
    title: "Hyjal · Semi-hardcore · DJ",
    raidName: "Hyjal Summit",
    localStart: "2026-12-11T20:00",
    durationMinutes: 120,
    leader: "DJ",
    capacity: 20,
    pace: "Semi-hardcore",
    morning: false,
    introduction:
      "Opening-week Hyjal with KFC's semi-hardcore group. Bring your preparation and focus; expect coordinated pulls, useful feedback and adjustments as we learn the new content. Clean progress matters more than a stopwatch in week one.",
  },
  {
    key: "2026-12-12-barrow-evening",
    title: "Barrow Deeps · Normal · Psy",
    raidName: "Barrow Deeps",
    localStart: "2026-12-12T20:00",
    durationMinutes: 120,
    leader: "Psy",
    assistant: "DJ",
    capacity: 10,
    pace: "Normal",
    morning: false,
    introduction:
      "An organized evening Barrow Deeps run with Psyrogue. A normal community pace: listen to calls, help the group and enjoy the first raid week. New encounters will be explained as we work through them.",
  },
  {
    key: "2026-12-13-hyjal-evening",
    title: "Hyjal · Normal · Psy",
    raidName: "Hyjal Summit",
    localStart: "2026-12-13T20:00",
    durationMinutes: 120,
    leader: "Psy",
    assistant: "DJ",
    capacity: 20,
    pace: "Normal",
    morning: false,
    introduction:
      "Sunday evening Hyjal with Psyrogue and the KFC community. A steady normal run focused on teamwork, clear calls and learning together, without a speedrun requirement.",
  },
  {
    key: "2026-12-14-onyxia-morning",
    title: "Onyxia · Morning normal · DJ",
    raidName: "Onyxia's Lair",
    localStart: "2026-12-14T11:00",
    durationMinutes: 30,
    leader: "DJ",
    capacity: 40,
    pace: "Normal",
    morning: true,
    assistant: "Vargos",
    introduction:
      "Start the morning with Onyxia and DJ. This is a scheduled 30-minute raid slot, so arrive ready to go. Hyjal follows at 11:30 CET with a separate signup; joining this run does not automatically sign you up for Hyjal.",
  },
  {
    key: "2026-12-14-hyjal-morning",
    title: "Hyjal · Morning normal · DJ",
    raidName: "Hyjal Summit",
    localStart: "2026-12-14T11:30",
    durationMinutes: 120,
    leader: "DJ",
    capacity: 20,
    pace: "Normal",
    morning: true,
    assistant: "Vargos",
    introduction:
      "Morning Hyjal with DJ, following the earlier Onyxia run. You are welcome to join just Hyjal or sign up for both sessions separately. We will use an organized normal pace with clear calls and time to learn.",
  },
  {
    key: "2026-12-14-onyxia-evening",
    title: "Onyxia · Evening · Psy",
    raidName: "Onyxia's Lair",
    localStart: "2026-12-14T20:00",
    durationMinutes: 30,
    leader: "Psy",
    assistant: "DJ",
    capacity: 40,
    pace: "Normal",
    morning: false,
    introduction:
      "Evening Onyxia with Psyrogue and the KFC community. A scheduled 30-minute slot: be ready at the start, listen to the raid calls and update your signup if your plans change.",
  },
];

export const foreverRaidLootPolicy = {
  title: "KFC Forever · Raid & loot rules",
  description:
    "Shared rules for KFC Forever guild and community raids. KFC guild members have roster priority over PUGs. TBC events keep their own published agreements.",
  color: 0xe7b65b,
  fields: [
    {
      name: "Semi-hardcore · DJ's arena team",
      value:
        "Our semi-hardcore squad is affectionately known among KFC guildies as DJ's arena team.\n\nMembers are expected to bring full pre-BiS, including reputation epics wherever they are BiS for their class/spec. Consistent consumable use and proper preparation are required; slacking or skipping consumables will not be tolerated. Our performance target is 95+ parses for every member. Week one prioritizes learning and clean progress.",
    },
    {
      name: "The combined raid night once we are up to speed",
      value:
        "Start with one shared 40-player Onyxia run, bringing the semi-hardcore and casual groups together. The 20-player semi-hardcore group then continues into Hyjal. After Hyjal, those 20 players split into two simultaneous 10-player semi-hardcore Barrow Deeps runs. This covers all three raids in one evening for the semi-hardcore group. The combined schedule will be announced when ready; opening-week events keep their published dates.",
    },
    {
      name: "Tank preparation",
      value:
        "One item per run is hard reserved for the tanks. The exact item will be declared before the raid, once the patch's loot has been datamined. No named tank HR is being guessed now.",
    },
    {
      name: "Recipes and BoEs support guild raid preparation",
      value:
        "Recipes are hard reserved and distributed to guild members based on activity, so KFC has a reliable network of active crafters and members can find a crafter online. BoEs are hard reserved and disenchanted. Those materials support resistance sets and tank preparation, helping our groups progress through new raids.",
    },
    {
      name: "Soft reserves and rolls",
      value:
        "The Softres link, reserve allowance and exact tank HR will be published after patch datamining and before the raid. Published hard reserves and valid soft reserves take priority; remaining drops use MS > OS. The future loot list is not available yet.",
    },
    {
      name: "Reserve for the role you are playing",
      value:
        "Off-role BiS reserves need the raid leader's approval in advance. For example, a warrior reserving a rogue's BiS dagger or a hunter's bow must ask first. Unapproved inappropriate reserves will not be honored.",
    },
    {
      name: "Before you commit",
      value:
        "Read your event's final loot details and deadlines when they are published. Sign up with the character/spec you intend to play, and tell the leader about any approved role or reserve exceptions before the raid.",
    },
    {
      name: "Guild priority and PUG places",
      value:
        "KFC guild members have roster priority over PUGs. PUG players are welcome to fill available places, and regular raiders are encouraged to join KFC. Open registration is not a confirmed seat; the raid leader selects the final roster. Joining the guild: <#1411545672313737346>.",
    },
    {
      name: "Normal runs",
      value:
        "Normal events follow the preparation and pace in their own description. The full pre-BiS and 95+ parse targets above apply to events explicitly labeled Semi-hardcore.",
    },
  ],
  footer: { text: "Forever loot policy v1 · Owner-confirmed 31 October 2026" },
};

export function openingRaidDescription(
  raid: ForeverOpeningRaid,
  policyUrl: string,
): string {
  const semi = raid.pace === "Semi-hardcore";
  const joke = semi
    ? "\n\nKFC guildies affectionately call this semi-hardcore squad **DJ’s arena team**."
    : "";
  const pace =
    raid.pace === "Semi-hardcore"
      ? "\n\n**The combined night once we are up to speed:** start with a shared 40-player Onyxia run with the casual group. The semi-hardcore group then runs Hyjal as 20 players, followed by two simultaneous 10-player Barrow Deeps groups. All three raids fit into one evening for the semi-hardcore team. We aim to move to this efficient combined schedule from week two when ready; opening-week dates stay as listed."
      : "";
  const preparation = semi
    ? "Level 60 with full pre-BiS, including all reputation epics that are BiS for your class/spec. Arrive repaired and fully prepared, use your consumables consistently, and join voice to hear the calls. Slacking or not consuming will not be tolerated. **Performance target: 95+ parses for every member.**"
    : "Be level 60, repaired and ready with suitable gear and basic consumables. Join voice to hear the calls.";
  const assistant = raid.assistant ? `Assistant: ${raid.assistant}.\n\n` : "";
  return `KFC guild & community raid · Guild members have roster priority.\n\n${assistant}${raid.introduction}${joke}${pace}\n\n**Host:** ${raid.leader === "DJ" ? "Djilanov" : "Psyrogue"}.\n**Group:** ${raid.capacity} players · EU Alliance PvP · ${raid.pace}${raid.morning ? " morning raid" : ""}.\n\n**Preparation**\n${preparation} The posted finish is the planned end of the slot, not a guaranteed full clear.\n\n**Signups**\nOpen registration; the raid leader selects the final roster. KFC guild members have priority over PUGs. PUGs are welcome where places remain; regular raiders are encouraged to join KFC. Signing up is not a confirmed seat. Choose your real character/spec and use Tentative or Absent if plans change. Do not join overlapping lockouts you cannot attend.\n\n**Raid rules v1:** [Read the shared Forever raid policy](${policyUrl}).\nOne tank HR per run; BoEs and recipes reserved for guild raid preparation. Softres links, reserve allowances and named tank HRs will be published after patch datamining and before the raid.`;
}
