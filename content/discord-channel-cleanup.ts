export interface ChannelCleanupTarget {
  id: string;
  type: 0 | 5 | 15;
  topic: string;
  tags?: string[];
}

export const cleanupApplicationId = "1554796912673169428";
export const cleanupGuildId = "1554316932948172940";
const site = "https://www.wowforeverdiscord.online";

const targets: ChannelCleanupTarget[] = [
  {
    id: "1554316934252593245",
    type: 0,
    topic: `Welcome to WoW Forever Discord, an independent community for Alliance and Horde. Choose your interests in Channels & Roles, read the server rules, and find a guild or group in your faction's channels. New to Forever? Questions are welcome. Start here: ${site}/discord`,
  },
  {
    id: "1554319918714060840",
    type: 5,
    topic: `Community announcements and confirmed activities from the WoW Forever Discord team. Check each event's region, ruleset, faction and timezone. This is an unofficial community, not Blizzard support. Website: ${site}`,
  },
  {
    id: "1554319934077669428",
    type: 0,
    topic: `Read the community rules before participating. Treat players from every guild and faction respectfully. Public report forums are member-readable; use the website for private evidence. Community policies: ${site}/rules`,
  },
  {
    id: "1554321078988574791",
    type: 0,
    topic: `Community website: ${site} | Guides: ${site}/guides | Guilds: ${site}/guild-recruitment | Groups: ${site}/lfg | Private player reports: ${site}/reports/new. Check links before signing in; never share passwords or account tokens.`,
  },
  {
    id: "1554321234332885032",
    type: 0,
    topic: `WoW Forever community FAQ and getting-started resources. Separate official information from beta observations and include a source when sharing game changes. FAQ: ${site}/faq | Joining and finding channels: ${site}/guides/join-wow-forever-discord`,
  },
  {
    id: "1554322593589235732",
    type: 0,
    topic:
      "WoW Forever discussion for both factions and all playstyles. Ask questions, compare experiences and meet people. Include the game version or beta build when discussing mechanics. Use faction LFG and recruitment channels for group requests; keep disagreements respectful.",
  },
  {
    id: "1554322842114461787",
    type: 0,
    topic:
      "Discuss WoW Forever PvP tactics, classes, objectives and experiences. Include your region, ruleset and game version where relevant. Use your faction's lfg-pvp channel for premades. Debate strategies, not people; follow the community rules.",
  },
  {
    id: "1554322870753034321",
    type: 0,
    topic:
      "Hardcore discussion and planning. Blizzard currently lists Forever Hardcore for after launch; check official updates before arranging sessions. Label Classic and Forever information clearly. Share advice respectfully and never encourage harassment over another player's mistakes.",
  },
  {
    id: "1554323326598647940",
    type: 5,
    topic:
      "Read the addon posting rules here. Include the project source, supported game/client version and known limitations. Do not present untested compatibility as confirmed. Ask setup questions in addon helpdesk-support.",
  },
  {
    id: "1554323354574389431",
    type: 0,
    topic:
      "Share your addon project with its purpose, maintainer/source link, supported game version, release status and known limitations. Clearly label untested Forever compatibility. Follow the addon posting rules and avoid duplicate promotion.",
  },
  {
    id: "1554323429182673047",
    type: 0,
    topic:
      "Discuss addons, UI setup and compatibility. Name the addon, version and game/client build so others can reproduce the issue. Prefer maintainer release pages and verified sources. Keep credentials and private logs out of posts.",
  },
  {
    id: "1554323491241594930",
    type: 0,
    topic:
      "Addon and UI help. Include the addon/version, game build, steps to reproduce and any error text with personal information removed. Explain what you already tried. This is community help, not official Blizzard support.",
  },
  {
    id: "1554324262972563596",
    type: 0,
    topic:
      "WoW news and linked coverage. Wowhead is a third-party publication; distinguish its reporting and datamining from official Blizzard announcements. Follow the original source for dates, requirements and confirmed changes.",
  },
  {
    id: "1554324532171505744",
    type: 5,
    topic: `Read the report and appeal rules before posting. Discord report forums are member-readable; an allegation is not a confirmed finding. Do not publish personal information or organize harassment. Private player evidence: ${site}/reports/new | Review process: ${site}/safety`,
  },
  {
    id: "1554325308318941316",
    type: 0,
    topic:
      "Read the moderation context and current status of each published entry. A public report is not itself a confirmed finding. Do not contact, harass or coordinate action against named players. Corrections and appeals belong in the appropriate review process, not general chat.",
  },
  {
    id: "1554324869452144681",
    type: 15,
    topic: `PUBLIC TO SERVER MEMBERS. Do not post private conversations, personal information or unredacted evidence here. Submit private player evidence at ${site}/reports/new. A Discord forum post is separate from a website case and is not a confirmed finding.

Use a factual title and include:
- Game/version, region, character ruleset and faction.
- Full character name; distinguish people with similar names.
- Incident date, time and timezone.
- What happened, the agreed rules and relevant context.
- A brief redacted summary only; send sensitive evidence through the private form.

Describe actions rather than demanding punishment. Do not harass, contact or coordinate action against the people involved. Moderators may request further context. For an existing website case, retain its reference and access key privately.`,
  },
  {
    id: "1554324724765433968",
    type: 15,
    topic: `PUBLIC TO SERVER MEMBERS. Do not post private conversations, personal information, receipt access keys or unredacted evidence here.

For an existing website player-report case, use ${site}/appeals with its FG reference. That form is not a general Discord-ban appeal service.

For a Discord forum report, include:
- Link to the original public report.
- Game/version, region, ruleset and full character name.
- The specific claim or decision you want reconsidered.
- A factual explanation, correction or redacted summary of new context.

Do not attach sensitive evidence publicly; ask a moderator for the appropriate private route. Wait for moderators before continuing discussion. State if you need translation or clarification. A report is not a confirmed finding; harassment and coordinated action are not acceptable.`,
  },
];

for (const [id, className] of [
  ["1554323564205973644", "Druid"],
  ["1554323577002524772", "Paladin"],
  ["1554323589921243207", "Rogue"],
  ["1554323600058621962", "Mage"],
  ["1554323608287846470", "Warlock"],
  ["1554323618983448667", "Shaman"],
  ["1554323634368020611", "Warrior"],
  ["1554323646653137016", "Hunter"],
  ["1554323760780152902", "Priest"],
]) {
  targets.push({
    id,
    type: 0,
    topic: `${className} discussion: questions, builds, roles and practical experience. Specify WoW version or beta build and PvE/PvP context. Link sources for confirmed changes and label theory or untested advice. New and returning players are welcome.`,
  });
}

for (const faction of [
  {
    name: "Alliance",
    rules: "1554325566856106036",
    recruitment: "1554327206396690432",
    looking: "1554327239733157958",
    pugs: "1554327396990320741",
    pve: "1554327593560318052",
    pvp: "1554327610589450250",
  },
  {
    name: "Horde",
    rules: "1554327700909592628",
    recruitment: "1554327927750000661",
    looking: "1554327900998869092",
    pugs: "1554327956329865256",
    pve: "1554327821604888596",
    pvp: "1554327854471184455",
  },
]) {
  targets.push(
    {
      id: faction.rules,
      type: 5,
      topic: `${faction.name} recruitment and group-posting rules. Use guild-recruitment to advertise a guild, lf-guild to find one, pugs-adverts for scheduled runs and LFG for immediate groups. Include region, character ruleset, faction, date/timezone and expectations. Follow each forum's posting and bump limits.`,
    },
    {
      id: faction.recruitment,
      type: 15,
      tags: [
        "EU",
        "NA",
        "Other",
        "Normal",
        "PvP ruleset",
        "Roleplaying",
        "Social",
        "Recruiting",
        "Paused",
      ],
      topic: `${faction.name} guild recruitment. One active post per guild; edit your existing post when needs change. Keep the existing six-hour bump cooldown.

Include guild name, region, character ruleset, language, usual days and named timezone, expected finish time, playstyle, current class/role needs, preparation and loot expectations, and a public recruiter contact. State which details are undecided; do not invent a traditional Forever realm.

Choose region, ruleset and current recruitment status tags as appropriate. Ruleset is distinct from activity: a PvP-ruleset guild can also run PvE. Keep information current and mark the listing Paused when recruitment closes. All guilds follow the same posting rules.`,
    },
    {
      id: faction.looking,
      type: 15,
      tags: [
        "EU",
        "NA",
        "Other",
        "Normal",
        "PvP ruleset",
        "Roleplaying",
        "Social",
        "Looking",
        "Found",
      ],
      topic: `${faction.name} players looking for a guild. Include region, character ruleset, class/role, relevant experience, preferred activities and pace, available days/times with a named timezone, and a public contact.

Explain what you want from a group: learning, relaxed play, progression, PvP, RP or social company. State undecided choices clearly. Do not include personal details or account credentials. Choose the relevant region/ruleset tags, and update your post to Found when your search is complete.`,
    },
    {
      id: faction.pugs,
      type: 15,
      tags: [
        "EU",
        "NA",
        "Other",
        "PvE",
        "PvP",
        "RP",
        "Learning",
        "Relaxed",
        "Progression",
        "Open",
        "Full",
        "Cancelled",
      ],
      topic: `${faction.name} scheduled groups and PUG advertisements. One advert per run; do not create duplicates. Keep the existing six-hour bump cooldown. Edit your existing advert when planning the next run and clearly update its date.

Include game/version, region, character ruleset, faction, activity, exact date, start and expected finish, named timezone, host, roles needed, preparation, loot rules and voice expectations. Link one signup destination and explain whether a place is confirmed or waitlisted.

Use region, activity, pace and status tags as appropriate. Update Full or Cancelled promptly. There are no raid/day/role tags to select, and these guidelines do not promise automatic deletion of old adverts. Do not bypass posting rules with alternate accounts; this will result in permanent loss of access to faction chat channels.`,
    },
    {
      id: faction.pve,
      type: 0,
      topic: `${faction.name} PvE group finding. Include region, character ruleset, activity, date/start/timezone, class/role, preparation and a contact. Use pugs-adverts for scheduled runs. Label the game version clearly; do not mix Classic/TBC examples with Forever.`,
    },
    {
      id: faction.pvp,
      type: 0,
      topic: `${faction.name} PvP premades. Include region, character ruleset, activity, date/timezone, class/role and a contact. Existing server policy allows PvP boosts for in-game gold only; post those advertisements in alliance-trade or horde-trade, not here. Follow the server and trading rules.`,
    },
  );
}

export const channelCleanupTargets: readonly ChannelCleanupTarget[] = targets;
