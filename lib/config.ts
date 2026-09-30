export const SITE_NAME = "WoW Forever Discord";
export const SITE_URL = (
  process.env.SITE_URL || "https://www.wowforeverdiscord.online"
).replace(/\/$/, "");
export const INDEXABLE =
  process.env.SITE_INDEXABLE === "true" && SITE_URL.startsWith("https://");
export const REGIONS = ["EU", "NA", "OCE"] as const;
export const FACTIONS = ["Alliance", "Horde"] as const;
export const RULESETS = ["Normal", "PvP", "Roleplaying"] as const;
export const GUILD_RULESETS = [
  ...RULESETS,
  "Hardcore (planned)",
  "Unconfirmed",
] as const;
export const CLASSES = [
  "Druid",
  "Hunter",
  "Mage",
  "Paladin",
  "Priest",
  "Rogue",
  "Shaman",
  "Warlock",
  "Warrior",
] as const;
export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const REPORT_CATEGORIES = [
  "Loot rule violation",
  "Trade scam",
  "Harassment",
  "Dungeon griefing",
  "Raid griefing",
  "Impersonation",
  "Guild bank theft",
  "Other",
] as const;
export const PLAYSTYLES = [
  "Casual",
  "Dad guild",
  "Progression",
  "Hardcore",
  "Social",
  "PvP",
  "Roleplay",
] as const;

export interface SiteSettings {
  discordInvite: string;
  backupInvite: string;
  memberCount: string;
  raidsHosted: string;
  heroDescription: string;
  announcement: string;
  announcementHref: string;
  contactEmail: string;
  discordOnboarding: string;
  discordOrganizers: string;
  googleVerification: string;
  bingVerification: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  discordInvite:
    process.env.DISCORD_INVITE_URL || "https://discord.gg/ejn4UnDdcX",
  backupInvite: process.env.DISCORD_BACKUP_INVITE_URL || "",
  memberCount: "",
  raidsHosted: "500+",
  heroDescription:
    "Find your guild, form a group, and share the adventure. All playstyles. Both factions.",
  announcement: "",
  announcementHref: "/about",
  contactEmail: "",
  discordOnboarding: "",
  discordOrganizers: "",
  googleVerification: "",
  bingVerification: "",
};
