import { createHash } from "node:crypto";
import { hasAuctionCoverage } from "./contracts";
import { renderAuctionReport } from "./presentation";
import type {
  AuctionDigest,
  AuctionMarket,
  AuctionObservation,
  AuctionPack,
  AuctionPublication,
  AuctionSettings,
  AuctionReportFacts,
} from "./contracts";

export function auctionMarketKey(market: AuctionMarket): string {
  return [
    market.clientProduct,
    market.clientBuild,
    market.region,
    market.realmId,
    market.auctionHouseType,
  ].join(" / ");
}
export function auctionJobKey(
  market: AuctionMarket,
  pack: AuctionPack,
  version: number,
  mode: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        auctionMarketKey(market),
        pack.sourceScanId,
        version,
        mode,
      ]),
    )
    .digest("hex");
}
export function matchesAuctionMarket(
  market: AuctionMarket,
  pack: AuctionPack,
): boolean {
  return (
    market.clientProduct === pack.clientProduct &&
    market.clientBuild === pack.clientBuild &&
    market.region === pack.region &&
    market.realmId === pack.realmId &&
    market.auctionHouseType === pack.auctionHouseType
  );
}
function safeText(text: string, limit: number): string {
  return text
    .replace(/[\r\n@<>`*_~|\\\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
export function auctionPublicationHold(
  publications: AuctionPublication[],
  settings: AuctionSettings,
  now: Date = new Date(),
): string | null {
  const recent = publications.filter(
    (publication) =>
      publication.publishedAt.getTime() > now.getTime() - 86400000,
  );
  if (
    recent.some(
      (publication) =>
        now.getTime() - publication.publishedAt.getTime() <
        settings.minimumIntervalHours * 3600000,
    )
  )
    return `Waiting for the ${settings.minimumIntervalHours}-hour publication cooldown. Fresh data will be checked again.`;
  if (recent.length >= settings.dailyLimit)
    return "Rolling daily publication limit reached.";
  return null;
}
function priceChanged(previous: string, current: string): boolean {
  const before = BigInt(previous),
    after = BigInt(current);
  const difference = before > after ? before - after : after - before;
  return difference * 100n >= before * 10n;
}
export function buildAuctionDigest(
  market: AuctionMarket,
  pack: AuctionPack,
  settings: AuctionSettings,
  now: Date = new Date(),
  previous: AuctionObservation[] = [],
): AuctionDigest {
  const time = Date.parse(pack.sourceScanAt),
    age = now.getTime() - time;
  const label =
    market.coverage === "uploaded-beta-market" ? "Forever beta" : market.region;
  const title = `${safeText(label, 12)} ${safeText(market.realmId, 45)} / ${market.auctionHouseType} / ${pack.sourceScanAt.slice(0, 10)}`;
  const withheld = (reason: string): AuctionDigest => ({
    eligible: false,
    reason,
    title,
    content: `**Market coverage: reference only**\n${safeText(auctionMarketKey(market), 180)}\nSource scan: ${pack.sourceScanAt}\n${reason}\nNo buy/sell recommendations were generated.`,
    itemIds: [],
    observations: [],
  });
  if (!matchesAuctionMarket(market, pack))
    return withheld("Returned market does not match the configured scope.");
  if (
    !Number.isFinite(time) ||
    age < -300000 ||
    Date.parse(pack.generatedAt) > now.getTime() + 300000
  )
    return withheld("Source timestamp is invalid or in the future.");
  if (age > settings.freshMinutes * 60000)
    return withheld(
      age > 10800000
        ? "Scan is stale (over three hours old). Fresh uploaded data is required."
        : "Scan is aging or outside the configured freshness window. Verify quotes in game.",
    );
  if (!hasAuctionCoverage(market))
    return withheld(
      "Region is unconfirmed. Beta data must not be presented as EU or NA coverage.",
    );
  if (
    pack.items.length &&
    pack.items.every((item) => item.signal === "collecting")
  ) {
    let observations = 0,
      buckets = 0;
    for (const item of pack.items) {
      observations = Math.max(observations, item.observationCount);
      buckets = Math.max(buckets, item.recentObservationCount);
    }
    return withheld(
      `The source model is still collecting this exact build and faction: up to ${observations} observations and ${buckets} recent time-spread buckets per item. Public tips require at least ${settings.minimumObservations} buckets, ${settings.minimumHistoryHours} hours of history, and a supported price signal. A newly uploaded older scan does not become fresh.`,
    );
  }
  const previousByItem = new Map<number, AuctionObservation[]>();
  for (const observation of previous)
    previousByItem.set(observation.itemId, [
      ...(previousByItem.get(observation.itemId) ?? []),
      observation,
    ]);
  const candidates = pack.items
    .filter((item) => {
      const history = item.historyStartedAt
        ? time - Date.parse(item.historyStartedAt)
        : -1;
      return (
        item.name &&
        item.currentPriceCopper &&
        item.normalPriceCopper &&
        item.differenceBasisPoints !== null &&
        !["normal", "collecting", "too_thin"].includes(item.signal) &&
        item.observationCount >=
          Math.max(
            settings.minimumObservations,
            item.minimumObservationCount,
          ) &&
        item.recentObservationCount >= settings.minimumObservations &&
        history >= settings.minimumHistoryHours * 3600000 &&
        history <= 7 * 86400000 &&
        (item.confidenceBasisPoints ?? 0) >= settings.minimumQuality &&
        (item.currentListingCount ?? 0) >= settings.minimumListings &&
        (item.currentQuantity ?? 0) >= 3
      );
    })
    .sort(
      (a, b) =>
        Number(previousByItem.has(a.itemId)) -
          Number(previousByItem.has(b.itemId)) ||
        Math.abs(b.differenceBasisPoints ?? 0) -
          Math.abs(a.differenceBasisPoints ?? 0) ||
        a.itemId - b.itemId,
    );
  if (!candidates.length)
    return withheld(
      "No observations passed history, supply and quality gates. More time-spread scans may be needed.",
    );
  const seen = new Set<number>();
  const selected = candidates
    .filter((item) => {
      if (seen.has(item.itemId)) return false;
      seen.add(item.itemId);
      return !previousByItem
        .get(item.itemId)
        ?.some(
          (observation) =>
            observation.signal === item.signal &&
            !priceChanged(
              observation.currentPriceCopper,
              item.currentPriceCopper!,
            ),
        );
    })
    .slice(0, 5);
  if (!selected.length)
    return withheld(
      "Nothing meaningfully new: these item signals were covered in the past 24 hours. Waiting for other items, a new signal or a price move of at least 10%.",
    );
  const reportFacts = (): AuctionReportFacts => ({
    market,
    sourceAt: pack.sourceScanAt,
    freshMinutes: settings.freshMinutes,
    items: selected.map((item) => ({
      itemId: item.itemId,
      name: item.name!,
      signal: item.signal as AuctionObservation["signal"],
      currentPriceCopper: item.currentPriceCopper!,
      normalPriceCopper: item.normalPriceCopper!,
      differenceBasisPoints: item.differenceBasisPoints!,
      quantity: item.currentQuantity!,
      listings: item.currentListingCount!,
      observationCount: item.observationCount,
      previous: previousByItem.get(item.itemId)?.[0] ?? null,
    })),
  });
  let report = reportFacts();
  let rendered = renderAuctionReport(report);
  while (rendered.content.length > 1850 && selected.length > 1) {
    selected.pop();
    report = reportFacts();
    rendered = renderAuctionReport(report);
  }
  if (rendered.content.length > 1850)
    return withheld(
      "Digest exceeds the safe message size; publication withheld.",
    );
  return {
    eligible: true,
    reason: "Fresh scoped data passed conservative history and supply gates.",
    title: rendered.title,
    content: rendered.content,
    itemIds: selected.map((item) => item.itemId),
    observations: selected.map((item) => ({
      itemId: item.itemId,
      signal: item.signal as AuctionObservation["signal"],
      currentPriceCopper: item.currentPriceCopper!,
    })),
    report,
  };
}
