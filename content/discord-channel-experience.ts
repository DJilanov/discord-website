export const experienceGuildId = "1554316932948172940";
export const experienceApplicationId = "1554796912673169428";

export interface ExperienceTarget {
  id: string;
  type: 0 | 4 | 5 | 15;
  name?: string;
  topic?: string;
}

export const experienceTargets: readonly ExperienceTarget[] = [
  { id: "1554318324257521735", type: 4, name: "Start Here" },
  { id: "1554318429115392080", type: 4, name: "Community" },
  { id: "1554318866291757077", type: 4, name: "Classes" },
  { id: "1554318911082856538", type: 4, name: "Social & Media" },
  { id: "1554318933941690529", type: 4, name: "Safety & Appeals" },
  {
    id: "1554316934252593245",
    type: 0,
    name: "introductions",
    topic:
      "Say hello and share what you enjoy playing. Region, faction and usual play times are optional; personal details and guild membership are not required.",
  },
  {
    id: "1555036794016243773",
    type: 0,
    name: "new-player-help",
    topic:
      "Ask setup, ruleset or getting-started questions. Tell us your game version when it affects the answer. Never post passwords, login codes or account details.",
  },
  {
    id: "1554322593589235732",
    type: 0,
    topic:
      "Everyday Forever conversation. Find teammates in your faction's LFG channels; use tool-support for technical problems. Brief questions are welcome.",
  },
  {
    id: "1554322842114461787",
    type: 0,
    topic:
      "Discuss PvP tactics, builds and experiences. Find teammates in your faction's lfg-pvp channel. Identify the client/build when discussing mechanics.",
  },
  {
    id: "1554322870753034321",
    type: 0,
    name: "hardcore",
    topic:
      "Discuss Hardcore plans and experiences. Identify the client and whether the content is currently available; planned Forever features are not released features.",
  },
  {
    id: "1554349669008678994",
    type: 0,
    name: "off-topic",
    topic:
      "Off-topic conversation, with the same respect and safety rules as the rest of the community. No harassment or personal attacks.",
  },
  {
    id: "1554319918714060840",
    type: 5,
    topic:
      "Confirmed community news, hosted sessions and meaningful tool or guide releases. Dates and source links belong in each update.",
  },
  {
    id: "1554319934077669428",
    type: 0,
    topic:
      "Community conduct and posting rules. Read the existing rules below; ask staff when a rule or access requirement is unclear.",
  },
  {
    id: "1554321078988574791",
    type: 0,
    name: "useful-links",
    topic:
      "Community destinations and authoritative resources. Guides: https://www.wowforeverdiscord.online/guides Tools: https://www.wowforeverdiscord.online/addons",
  },
  {
    id: "1554321234332885032",
    type: 0,
    name: "faq",
    topic:
      "Getting-started answers and useful references. Check the source and game/build; ask unanswered beginner questions in new-player-help.",
  },
  {
    id: "1554323326598647940",
    type: 5,
    name: "tool-rules",
    topic:
      "Tool listings need an authoritative source, maintainer, supported version and known limitations. Untested Forever compatibility must stay labelled. Use tool-support for problems.",
  },
  {
    id: "1554323429182673047",
    type: 0,
    topic:
      "Discuss addons, UI ideas and comparisons. Browse maintained projects in tool-directory; keep reproducible issues and tester results in tool-support. No credentials or private logs.",
  },
  {
    id: "1554324262972563596",
    type: 0,
    topic:
      "Third-party WoW coverage from Wowhead. Reporting and commentary are not Blizzard announcements; follow each source link. Existing news-feed integration remains in this channel.",
  },
  {
    id: "1554324295143133184",
    type: 0,
    topic:
      "Share your stream with its language, game and session focus. One promotional post per creator per rolling 24 hours; six-hour slowmode is separate. Automated alerts follow the existing integration's policy.",
  },
  {
    id: "1554324336574337024",
    type: 0,
    topic:
      "Share useful guides and memorable clips with a sentence of context. Identify client/build for technical advice; do not repost another member's media without permission.",
  },
  {
    id: "1554324352537731142",
    type: 0,
    topic:
      "Community memes and game humour. Keep it suitable for the community, without harassment or sharing someone's personal information.",
  },
  {
    id: "1554328068523434064",
    type: 0,
    topic:
      "Optional everyday-life conversation. Nobody owes personal details or photos; do not repost another member's images without permission.",
  },
  {
    id: "1554329325514395788",
    type: 5,
    topic:
      "Read the existing trading and boost rules before posting. Listings need faction, region, ruleset, price or terms, and availability; asking prices are not confirmed sales.",
  },
  {
    id: "1554329346565734500",
    type: 0,
    topic:
      "Alliance WTB/WTS/WTT and permitted crafting offers. Include region, ruleset, item/service, price or terms and availability; update sold listings. WoW Trader coverage depends on uploaded scans.",
  },
  {
    id: "1554329363250421771",
    type: 0,
    topic:
      "Horde WTB/WTS/WTT and permitted crafting offers. Include region, ruleset, item/service, price or terms and availability; update sold listings. WoW Trader coverage depends on uploaded scans.",
  },
  {
    id: "1554324532171505744",
    type: 5,
    name: "safety-rules",
    topic:
      "Read the existing safety rules. Reports and appeals here are member-readable; private evidence belongs at https://www.wowforeverdiscord.online/reports A report is not a reviewed finding.",
  },
  {
    id: "1554325308318941316",
    type: 0,
    name: "reviewed-alerts",
    topic:
      "Reviewed outcomes and preserved legacy entries. This redesign does not certify older posts; verify case reference, date, scope and current appeal status. Corrections must remain visible; no raw accusations or personal information.",
  },
];

export const classChannelIds = [
  "1554323564205973644",
  "1554323577002524772",
  "1554323589921243207",
  "1554323600058621962",
  "1554323608287846470",
  "1554323618983448667",
  "1554323634368020611",
  "1554323646653137016",
  "1554323760780152902",
] as const;

export const defaultChannelIds = [
  "1554316934252593245",
  "1554322593589235732",
  "1555036794016243773",
  "1554946655244263628",
  "1554323429182673047",
  "1554319918714060840",
  "1554322842114461787",
] as const;

export const categoryOrder = [
  "1554318324257521735",
  "1554318429115392080",
  "1554318980897046669",
  "1554318998466863224",
  "1554318818237485157",
  "1554318866291757077",
  "1554319035112497244",
  "1554318911082856538",
  "1554318933941690529",
] as const;

export interface ExperienceTag {
  name: string;
  moderated: boolean;
  id?: string;
}

export interface ExperienceForum {
  name: string;
  sourceId: string;
  cooldown: number;
  sort: 0 | 1;
  guidelines: string;
  tags: readonly ExperienceTag[];
}

const ordinaryTags = (names: readonly string[]): ExperienceTag[] =>
  names.map((name: string): ExperienceTag => ({ name, moderated: false }));
const staffTags = (names: readonly string[]): ExperienceTag[] =>
  names.map((name: string): ExperienceTag => ({ name, moderated: true }));

export const experienceForums: readonly ExperienceForum[] = [
  {
    name: "tool-directory",
    sourceId: "1554323354574389431",
    cooldown: 60,
    sort: 1,
    guidelines:
      "One maintained entry per product. Include purpose, maintainer/contact, authoritative source/download, version, supported client/build or browser/OS, distribution state, last checked date, tested features and limitations. Release status is not Forever compatibility. Choose a type or purpose tag; staff-only evidence tags summarize a scoped reviewed record. Use tool-support for problems. Browse https://www.wowforeverdiscord.online/addons No copied packages without distribution rights or security guarantees.",
    tags: [
      ...ordinaryTags([
        "Web tool",
        "In-game addon",
        "Desktop app",
        "UI",
        "Combat",
        "Raid tools",
        "Trading",
        "Reference",
        "Stable",
        "Beta",
        "Paused",
      ]),
      ...staffTags(["Test recorded", "Awaiting testing", "Needs recheck"]),
    ],
  },
  {
    name: "tool-support",
    sourceId: "1554323491241594930",
    cooldown: 30,
    sort: 0,
    guidelines:
      "One issue or test result per post; search for an existing case first. Include product/version, client/build or browser/OS, problem, expected/actual result, what you tried and reproduction steps. Redacted screenshots/errors are optional. Choose an issue-kind tag; staff manage status after review. Testers: include the assignment ID from https://www.wowforeverdiscord.online/contribute and keep retests in this post. Never post credentials, pairing codes, private chats or raw diagnostics. Ask a maintainer for a private route before sensitive evidence. A posted result is not automatically verified or published.",
    tags: [
      ...ordinaryTags([
        "Installation",
        "Error",
        "Compatibility",
        "Configuration",
        "Data freshness",
        "Website",
        "Test report",
        "Suggestion",
      ]),
      ...staffTags([
        "Open",
        "Waiting on author",
        "Reproduced",
        "Fix released",
        "Retest needed",
        "Solved",
      ]),
    ],
  },
];

export const safetyForums = [
  {
    id: "1554324869452144681",
    guidelines:
      "Report a scam or griefing incident with game/build, relevant character identity, event time/timezone, what happened and redacted context. This forum is member-readable. Do not post private messages, account details or sensitive evidence; use https://www.wowforeverdiscord.online/reports for private website case evidence. Staff process tags describe review, not guilt. No harassment or pile-ons; a submission is not automatically a reviewed alert or addon block.",
  },
  {
    id: "1554324724765433968",
    guidelines:
      "Reference the original case, explain what should be reconsidered and provide redacted context. This forum is member-readable; do not paste private messages or account details. Website alert appeals use https://www.wowforeverdiscord.online/appeals with their FG case reference. That form is not a Discord server-ban appeal service; ask designated staff about server access. Staff process tags describe progress, not a guaranteed decision or response time.",
  },
] as const;

export const safetyTags = staffTags([
  "Received",
  "Under review",
  "Awaiting info",
  "Review complete",
]);
