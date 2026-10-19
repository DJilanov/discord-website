import { z } from "zod";
export const auctionConfigurationLock = 193002028;
export const auctionMarketSchema = z
  .object({
    clientProduct: z.literal("wow_classic_beta"),
    clientBuild: z.number().int().positive(),
    region: z.enum(["EU", "NA", "OCE", "UNKNOWN"]),
    realmId: z.string().trim().min(1).max(128),
    auctionHouseType: z.enum(["alliance", "horde", "neutral"]),
    enabled: z.boolean(),
    coverage: z.enum(["regional", "uploaded-beta-market"]).default("regional"),
  })
  .strict()
  .superRefine((market, context): void => {
    if (
      market.coverage === "uploaded-beta-market" &&
      market.region !== "UNKNOWN"
    )
      context.addIssue({
        code: "custom",
        path: ["coverage"],
        message:
          "Uploaded beta coverage must retain the source's UNKNOWN region; do not relabel regional data.",
      });
  });
export function hasAuctionCoverage(market: AuctionMarket): boolean {
  return (
    market.region !== "UNKNOWN" || market.coverage === "uploaded-beta-market"
  );
}
export const auctionSettingsSchema = z
  .object({
    mode: z.enum(["paused", "preview", "live"]),
    reviewedPilot: z.boolean(),
    channelId: z
      .string()
      .regex(/^[1-9]\d{16,19}$/)
      .nullable(),
    minimumObservations: z.number().int().min(6).max(336),
    minimumHistoryHours: z.number().int().min(24).max(168),
    minimumQuality: z.number().int().min(5000).max(10000),
    minimumListings: z.number().int().min(3).max(100),
    freshMinutes: z.number().int().min(5).max(60),
    dailyLimit: z.number().int().min(1).max(6),
    minimumIntervalHours: z.number().int().min(1).max(24).default(24),
    markets: z.array(auctionMarketSchema).max(12),
  })
  .strict()
  .superRefine((value, context): void => {
    const keys = value.markets.map((m) =>
      JSON.stringify([
        m.clientProduct,
        m.clientBuild,
        m.region,
        m.realmId,
        m.auctionHouseType,
      ]),
    );
    if (new Set(keys).size !== keys.length)
      context.addIssue({
        code: "custom",
        path: ["markets"],
        message: "Duplicate market scope.",
      });
    if (
      value.mode === "live" &&
      (!value.reviewedPilot ||
        !value.channelId ||
        !value.markets.some((m) => m.enabled && hasAuctionCoverage(m)))
    )
      context.addIssue({
        code: "custom",
        path: ["mode"],
        message:
          "Live mode requires a reviewed pilot, destination and an enabled market with explicit coverage.",
      });
  });
export type AuctionSettings = z.infer<typeof auctionSettingsSchema>;
export type AuctionMarket = z.infer<typeof auctionMarketSchema>;
export const defaultAuctionSettings: AuctionSettings = {
  mode: "preview",
  reviewedPilot: false,
  channelId: null,
  minimumObservations: 12,
  minimumHistoryHours: 24,
  minimumQuality: 7500,
  minimumListings: 5,
  freshMinutes: 60,
  dailyLimit: 1,
  minimumIntervalHours: 24,
  markets: [],
};
const copper = z
  .string()
  .regex(/^[1-9]\d{0,19}$/)
  .nullable();
export const auctionPackSchema = z.object({
  schemaVersion: z.literal("market-intelligence.v1"),
  modelVersion: z.literal("robust-market-signal-v1"),
  clientProduct: z.string().max(64),
  clientBuild: z.number().int().positive(),
  region: z.string().max(8),
  realmId: z.string().max(128),
  auctionHouseType: z.enum([
    "alliance",
    "horde",
    "neutral",
    "region",
    "unknown",
  ]),
  sourceScanId: z.uuid(),
  sourceScanAt: z.iso.datetime(),
  generatedAt: z.iso.datetime(),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        name: z.string().max(512).nullable(),
        signal: z.enum([
          "collecting",
          "bargain",
          "normal",
          "rising",
          "falling",
          "spike_risk",
          "oversupplied",
          "too_thin",
        ]),
        observationCount: z.number().int().nonnegative(),
        minimumObservationCount: z.number().int().positive(),
        currentPriceCopper: copper,
        normalPriceCopper: copper,
        differenceBasisPoints: z.number().int().nullable(),
        currentQuantity: z.number().int().nonnegative().nullable(),
        currentListingCount: z.number().int().nonnegative().nullable(),
        confidenceBasisPoints: z.number().int().min(0).max(10000).nullable(),
        historyStartedAt: z.iso.datetime().nullable(),
        recentObservationCount: z.number().int().nonnegative(),
      }),
    )
    .max(250000),
});
export type AuctionPack = z.infer<typeof auctionPackSchema>;
export const auctionObservationsSchema = z
  .array(
    z
      .object({
        itemId: z.number().int().positive(),
        signal: z.enum([
          "bargain",
          "rising",
          "falling",
          "spike_risk",
          "oversupplied",
        ]),
        currentPriceCopper: z.string().regex(/^[1-9]\d{0,19}$/),
      })
      .strict(),
  )
  .max(5);
export type AuctionObservation = z.infer<
  typeof auctionObservationsSchema
>[number];
export interface AuctionPublication {
  sourceScanId: string;
  sourceAt: Date;
  publishedAt: Date;
  observations: AuctionObservation[];
}
export interface AuctionReportItem extends AuctionObservation {
  name: string;
  normalPriceCopper: string;
  differenceBasisPoints: number;
  quantity: number;
  listings: number;
  observationCount: number;
  previous: AuctionObservation | null;
}
export interface AuctionReportFacts {
  market: AuctionMarket;
  sourceAt: string;
  freshMinutes: number;
  items: AuctionReportItem[];
}
export interface AuctionNarrative {
  intro: string;
  notes: { itemId: number; text: string }[];
}
export interface AuctionDigest {
  eligible: boolean;
  reason: string;
  title: string;
  content: string;
  itemIds: number[];
  observations: AuctionObservation[];
  report?: AuctionReportFacts;
}
export interface AuctionRunView {
  id: string;
  marketKey: string;
  sourceAt: string;
  mode: string;
  status: string;
  reason: string;
  content: string;
  threadId: string | null;
  createdAt: string;
}
export interface AuctionAdminSnapshot {
  version: number;
  settings: AuctionSettings;
  health: { checkedAt: string | null; status: string; online: boolean };
  runs: AuctionRunView[];
}
