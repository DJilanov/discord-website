export interface EditorialArtwork {
  label: string;
  alt: string;
  width: number;
  height: number;
  cover: boolean;
}

export const artwork: Record<string, EditorialArtwork> = {
  "/images/wow-trader-workspace.webp": {
    label: "WoW Trader: actual workspace",
    alt: "The WoW Trader Forever workspace showing the selected market, catalog build, scan freshness and incomplete price history",
    width: 1440,
    height: 960,
    cover: true,
  },
  "/images/group-post-form-rulesets.png": {
    label: "Website: group submission fields",
    alt: "The blank group submission form with title, activity, region, character ruleset, faction, start time, Discord contact and group details",
    width: 814,
    height: 704,
    cover: false,
  },
  "/images/group-post-form.png": {
    label: "Website: legacy group fields (historical)",
    alt: "Historical group form showing the former realm field; current listings use character rulesets",
    width: 734,
    height: 706,
    cover: false,
  },
  "/images/discord-welcome.png": {
    label: "Discord: welcome and information",
    alt: "WoW Forever Discord channel list showing announcements, rules, verification, newcomers, relevant-links and wow-forever-faq",
    width: 856,
    height: 2064,
    cover: false,
  },
  "/images/discord-classes-addons.png": {
    label: "Discord: classes and addons",
    alt: "WoW Forever Discord channels for addon discussion, help-support, individual classes and community media",
    width: 860,
    height: 2172,
    cover: false,
  },
  "/images/discord-faction-groups.png": {
    label: "Discord: faction recruitment",
    alt: "Alliance and Horde categories with post-rules, lfg-pve, lfg-pvp, lf-guild, guild-recruitment and pugs-adverts",
    width: 826,
    height: 1992,
    cover: false,
  },
  "/images/discord-trading.png": {
    label: "Discord: faction trade",
    alt: "Trading category with trade-rules, alliance-trade and horde-trade channels",
    width: 838,
    height: 460,
    cover: false,
  },
  "/images/community.webp": {
    label: "Community panorama",
    alt: "Warcraft community artwork",
    width: 1600,
    height: 320,
    cover: true,
  },
  "/images/pve.webp": {
    label: "PvE",
    alt: "Warcraft dungeon and raid artwork",
    width: 889,
    height: 500,
    cover: true,
  },
  "/images/pvp.webp": {
    label: "PvP",
    alt: "Warcraft battleground artwork featuring Alliance and Horde combatants",
    width: 1000,
    height: 563,
    cover: true,
  },
  "/images/rp.webp": {
    label: "Roleplay",
    alt: "Warcraft roleplay artwork",
    width: 1024,
    height: 590,
    cover: true,
  },
  "/images/forever-hero.webp": {
    label: "Forever: the adventure",
    alt: "A party of adventurers overlooking Azeroth in official WoW Forever artwork",
    width: 2600,
    height: 1725,
    cover: true,
  },
  "/images/forever-adventure.webp": {
    label: "Forever: preparing together",
    alt: "A dwarf shaman casting a spell among totems in Blizzard's WoW Forever preview",
    width: 1400,
    height: 788,
    cover: true,
  },
  "/images/forever-stories.webp": {
    label: "Forever: shared stories",
    alt: "Adventurers meeting a quest giver in Blizzard's WoW Forever preview",
    width: 1400,
    height: 788,
    cover: true,
  },
  "/images/forever-world.webp": {
    label: "Forever: the world",
    alt: "A forest settlement in Blizzard's WoW Forever preview",
    width: 1800,
    height: 1013,
    cover: true,
  },
  "/images/forever-mulgore.webp": {
    label: "Forever: Mulgore",
    alt: "Sunrise over the cliffs and settlements of Mulgore in Blizzard's WoW Forever preview",
    width: 1800,
    height: 1012,
    cover: true,
  },
};

export function getArtwork(src: string): EditorialArtwork | undefined {
  return Object.hasOwn(artwork, src) ? artwork[src] : undefined;
}

export function artworkDescription(src: string, title: string): string {
  return getArtwork(src)?.alt || `Artwork accompanying ${title}`;
}

export const coverChoices = Object.entries(artwork)
  .filter(([, value]) => value.cover)
  .map(([value, item]) => ({ value, label: item.label }));
