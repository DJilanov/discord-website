import { CANONICAL_TOOLS_URL } from "./tool-links";

export const traderLinks = {
  workspace: `${CANONICAL_TOOLS_URL}/forever/trader`,
  encyclopedia: `${CANONICAL_TOOLS_URL}/forever/encyclopedia`,
  collector: `${CANONICAL_TOOLS_URL}/forever/addon`,
  leveling: `${CANONICAL_TOOLS_URL}/forever/leveling`,
} as const;

export const traderScreenshot = {
  src: "/images/wow-trader-workspace.webp",
  alt: "WoW Trader's Forever crafting workspace with market selection, catalog build, history coverage and scan freshness",
  width: 1440,
  height: 960,
  caption:
    "Public workspace captured September 30, 2026. This is a dated screenshot, not a live price feed.",
} as const;
