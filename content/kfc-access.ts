export const kfcAccessIds = {
  verified: "1412584499740672051",
  certified: "1411680778185736242",
  boosters: "1411708661344243782",
  guildCategory: "1411533816060842014",
  staffCategory: "1411564696644882552",
  start: "1557974301095755900",
  verification: "1412584845829345280",
  roleMenu: "1411545206704308235",
  rules: "1556204779531673723",
  announcements: "1411545639392645192",
  joining: "1411545672313737346",
  tbcApplication: "1411545946155909150",
  foreverApplication: "1558008778732077090",
  calendar: "1557974287602819164",
  general: "1412553351874215976",
  introductions: "1557974290165661809",
  help: "1557974292854083615",
  lfg: "1557974298805805066",
} as const;

export const kfcPublicInstructionIds: readonly string[] = [
  kfcAccessIds.start,
  kfcAccessIds.verification,
  kfcAccessIds.rules,
  kfcAccessIds.announcements,
  kfcAccessIds.joining,
  kfcAccessIds.foreverApplication,
  kfcAccessIds.calendar,
];

export const kfcPublicChatIds: readonly string[] = [
  kfcAccessIds.general,
  kfcAccessIds.introductions,
  kfcAccessIds.help,
  kfcAccessIds.lfg,
];

// These private spaces sit outside Guild Members; preserve their current audience.
export const kfcPrivateGuildIds: readonly string[] = [
  "1411600907770138634",
  "1413242472221642835",
];

// This case channel was already hidden from ordinary Certified members.
export const kfcPrivateStaffIds: readonly string[] = ["1480274694648369353"];

export const kfcApplicationChannelIds: readonly string[] = [
  kfcAccessIds.tbcApplication,
];

export const kfcAccessStaffRoleIds: readonly string[] = [
  "1411555754418376734", // CEO
  "1411602899733315644", // COO
  "1411709733366403213", // KFC Management
  "1411710007703240834", // Existing bot automation administrators
];

export function kfcAccessDefaultChannels(raidLobbyId: string): string[] {
  return [
    kfcAccessIds.start,
    kfcAccessIds.rules,
    kfcAccessIds.announcements,
    kfcAccessIds.calendar,
    ...kfcPublicChatIds,
    raidLobbyId,
  ];
}
