import { db } from "../db";
import {
  auctionSettingsSchema,
  defaultAuctionSettings,
  type AuctionAdminSnapshot,
} from "./contracts";

export async function auctionSnapshot(): Promise<AuctionAdminSnapshot> {
  const config = await db.foreverAuctionConfig.findUnique({
    where: { id: "auction" },
  });
  const rows = await db.foreverAuctionRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const health = await db.foreverAuctionHealth.findUnique({
    where: { id: "auction" },
  });
  return {
    version: config?.version ?? 0,
    settings: config
      ? auctionSettingsSchema.parse(config.settings)
      : structuredClone(defaultAuctionSettings),
    health: {
      online: Boolean(
        health && Date.now() - health.checkedAt.getTime() < 30 * 60000,
      ),
      checkedAt: health?.checkedAt.toISOString() ?? null,
      status: health?.status ?? "Worker not started",
    },
    runs: rows.map((row) => ({
      id: row.id,
      marketKey: row.marketKey,
      sourceAt: row.sourceAt.toISOString(),
      mode: row.mode,
      status: row.status,
      reason: row.reason,
      content: row.content,
      threadId: row.threadId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
