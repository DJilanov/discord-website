import type { AuctionNarrative, AuctionReportFacts } from "./contracts";

const advice = {
  bargain:
    "Compare the cheapest listings if you need this. A low ask is not a guaranteed flip.",
  rising:
    "Compare nearby listings before paying the higher ask. Buy only what you need.",
  falling:
    "Check the cheapest stacks before restocking; avoid buying extra for a possible rebound.",
  spike_risk: "Compare the rest of the listings before paying the spike price.",
  oversupplied:
    "Check competing stack sizes before listing. Extra stock may take longer to sell.",
} as const;
const signalLabels = {
  bargain: "Below recent asks",
  rising: "Higher asking prices",
  falling: "Lower asking prices",
  spike_risk: "Price spike",
  oversupplied: "Crowded listings",
} as const;

function safeText(text: string, limit: number): string {
  return text
    .replace(/[\r\n@<>`*_~|\\\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
function price(value: string): string {
  const amount = BigInt(value);
  return `${amount / 10000n}g ${(amount % 10000n) / 100n}s ${amount % 100n}c`;
}

export function renderAuctionReport(
  facts: AuctionReportFacts,
  narrative?: AuctionNarrative,
): { title: string; content: string } {
  const time = Date.parse(facts.sourceAt);
  const faction =
    facts.market.auctionHouseType === "alliance"
      ? "Alliance"
      : facts.market.auctionHouseType === "horde"
        ? "Horde"
        : "Neutral";
  const notes = new Map(
    narrative?.notes.map((note) => [note.itemId, note.text]),
  );
  const blocks = facts.items.map((item): string => {
    const difference = `${item.differenceBasisPoints > 0 ? "+" : ""}${(item.differenceBasisPoints / 100).toFixed(1)}%`;
    const change = item.previous
      ? item.previous.signal !== item.signal
        ? "New signal since its last report. "
        : `Price changed by at least 10% since its last report (${price(item.previous.currentPriceCopper)}). `
      : "";
    return [
      `**${safeText(item.name, 65)}** / ${signalLabels[item.signal]}`,
      `${price(item.currentPriceCopper)} per unit / recent baseline ${price(item.normalPriceCopper)} (${difference})`,
      `${item.quantity} units / ${item.listings} listings`,
      `${change}${notes.get(item.itemId) ?? advice[item.signal]}`,
    ].join("\n");
  });
  const coverage =
    facts.market.coverage === "uploaded-beta-market"
      ? `Scope: uploaded ${facts.market.auctionHouseType} beta market only (${safeText(facts.market.realmId, 40)}); worldwide and other ruleset coverage are not verified.`
      : `Scope: ${facts.market.region} / ${safeText(facts.market.realmId, 60)} / ${facts.market.auctionHouseType}.`;
  const earlySample = facts.items.some((item) => item.observationCount < 12)
    ? "Early beta sample: treat the recent baseline as provisional. "
    : "";
  const workspace = new URLSearchParams({
    market: `${facts.market.region}|${facts.market.realmId}|${facts.market.auctionHouseType}`,
  });
  if (["alliance", "horde"].includes(facts.market.auctionHouseType))
    workspace.set("faction", facts.market.auctionHouseType);
  return {
    title: `${facts.market.coverage === "uploaded-beta-market" ? "Forever beta" : facts.market.region} / ${facts.market.auctionHouseType} watch: ${safeText(facts.items[0]?.name ?? "Market check", 40)} / ${facts.sourceAt.slice(11, 16)} UTC`,
    content: [
      `**${faction} Auction House watch**`,
      `Scan: <t:${Math.floor(time / 1000)}:R> / fresh until <t:${Math.floor((time + facts.freshMinutes * 60000) / 1000)}:t>.`,
      narrative?.intro ??
        "A few prices worth checking before your next Auction House visit.",
      ...blocks,
      `${coverage} Build ${facts.market.clientBuild}.`,
      `${earlySample}These are asking prices, not confirmed sales or guaranteed profit. Check in game and allow for fees and unsold stock.`,
      `[Compare prices](https://helper.kfcguild.online/forever/trader?${workspace.toString()})`,
    ].join("\n\n"),
  };
}
