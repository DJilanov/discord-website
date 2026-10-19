export const tradingParentId = "1554319035112497244";
export const tradingRulesId = "1554329325514395788";
export const tradingArchiveId = "1555101544389550151";
export const tradingModeratorId = "1554333297704706098";
export const tradingBanId = "1554617887912890378";
export const tradingPromptTitle = "Interested in trading and market research?";
export const tradingSources = {
  alliance: "1554329346565734500",
  horde: "1554329363250421771",
} as const;
export type TradingKey = "alliance" | "horde" | "auction";
export type TradingIds = Record<TradingKey, string>;
export const tradingNames: Record<TradingKey, string> = {
  alliance: "alliance-trade",
  horde: "horde-trade",
  auction: "auction-house",
};
export const tradeTagNames = [
  "WTB",
  "WTS",
  "WTT",
  "EU",
  "NA",
  "Other region",
  "Equipment",
  "Materials",
  "Consumables",
  "Crafting",
  "Enchanting",
  "Other",
  "Open",
  "Fulfilled",
  "Cancelled",
  "Expired",
] as const;
export const auctionTagNames = [
  "Guide",
  "Market report",
  "Coverage",
  "Alliance",
  "Horde",
  "Neutral",
  "EU",
  "NA",
  "Beta",
  "Reference only",
] as const;

export function tradingGuidelines(key: TradingKey): string {
  if (key === "auction")
    return [
      "WoW Forever Auction House research. Bot and moderators open reports; members discuss inside each post.",
      "Reports identify product/build, region, realm, Auction House and scan time. Player-uploaded asking prices are not completed sales. Missing or stale data means no actionable recommendations.",
      "No guaranteed profit, market manipulation, automatic in-game purchasing or mass mentions. Items with insufficient history or thin supply are not buy recommendations.",
      "Guides: https://www.wowforeverdiscord.online/guides/wow-trader-read-market-prices",
    ].join("\n\n");
  return [
    `${key === "alliance" ? "Alliance" : "Horde"} item and profession listings. One offer per post; discussion stays inside its post.`,
    "Title: [WTB/WTS/WTT] [Region / character ruleset] Item or profession. Add intent, region, category and Open tags. Discord requires at least one tag; staff review missing details.",
    "Body: game version/build and ruleset; item/profession; quantity; unit/stack price or trade terms; availability with timezone; in-game contact; offer expiry. Unknown details must be labelled unconfirmed.",
    "One active post per identical offer and market. Edit rather than repost or bump. Maintain one crafting-service post per market. Mark Fulfilled or Cancelled when finished; archived does not mean sold.",
    "No RMT, account/character/name sales, raid-loot sales, paid boost advertising, community boost matchmaking, escrow or commissions. The community does not guarantee sellers or reverse in-game trades. Complete permitted exchanges in game.",
    "Do not post credentials or personal information. Report suspected scams privately to moderators with evidence; a report is not a confirmed finding.",
    `Read <#${tradingRulesId}>. Offers should expire within seven days unless their owner explicitly renews availability. No @everyone, @here or role pings.`,
  ].join("\n\n");
}

export function tradingGuide(key: TradingKey): string {
  if (key === "auction")
    return [
      "**Auction House research and coverage**",
      "Compare material prices, crafting costs and market risks with WoW Trader. Reports appear only when eligible uploaded data and a reviewed publishing configuration are available; this is not a continuously scanned official feed.",
      "Every report names its exact market and source time. Fresh scans are at most one hour old; one-to-three-hour scans are aging; scans over three hours old are reference-only. Old posts do not remain live recommendations.",
      "Asking prices are not completed sales. Auction cuts, deposits, recipe requirements, demand and available quantities affect results. A quoted crafting margin is not realized profit. Quality scores are not probabilities of making money.",
      "Workspace: https://helper.kfcguild.online/forever/trader\nPrice-reading guide: https://www.wowforeverdiscord.online/guides/wow-trader-read-market-prices\nCollector: https://helper.kfcguild.online/forever/addon",
      "Discuss reports in their posts. Contributors can help by uploading complete scans from markets they actually play. Do not upload private account information. Maintained by Open source contributors; no guild membership required.",
    ].join("\n\n");
  return [
    `**${key === "alliance" ? "Alliance" : "Horde"} trading board**`,
    "Create a post for an item offer or profession listing, not a general chat message. Use the posting guidelines and select intent, region, category and status tags.",
    "**Listing template**\nGame version / build:\nRegion / character ruleset:\nMarket or shard, only if applicable:\nItem or profession / quantity:\nUnit or stack price / trade terms:\nAvailability / timezone:\nIn-game contact:\nExpires:\nStatus: Open",
    "Edit your original offer; do not duplicate or bump it. Mark Fulfilled or Cancelled when finished. Seven-day inactivity hiding is not a sale confirmation. Renew only an offer that is still available.",
    "Items and profession listings only. No RMT, account sales, raid-loot sales, paid boosts, escrow or community commissions. Report suspected scams to moderators; do not publish personal details or unreviewed accusations.",
  ].join("\n\n");
}
