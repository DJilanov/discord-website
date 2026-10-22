import { CANONICAL_TOOLS_URL } from "./tool-links";

export const toolsBase = CANONICAL_TOOLS_URL;

export const traderLinks = {
  workspace: `${toolsBase}/forever/trader`,
  encyclopedia: `${toolsBase}/forever/encyclopedia`,
  collector: `${toolsBase}/forever/addon`,
  leveling: `${toolsBase}/forever/leveling`,
  simulator: `${toolsBase}/forever/simulator`,
  quests: `${toolsBase}/forever/encyclopedia/quests`,
  talents: `${toolsBase}/forever/encyclopedia/talents/warrior`,
} as const;

export const traderScreenshot = {
  src: "/images/wow-trader-workspace.webp",
  alt: "WoW Trader's Forever crafting workspace with market selection, catalog build, history coverage and scan freshness",
  width: 1440,
  height: 960,
  caption:
    "Public workspace captured September 30, 2026. This is a dated screenshot, not a live price feed.",
} as const;
