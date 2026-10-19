import { Pool } from "pg";
import { db } from "../../lib/db";
import {
  listingBotId,
  listingGuildId,
  type ListingJob,
} from "../../lib/discord-listings/contracts";
import { deliverListing, syncListing } from "../../lib/discord-listings/engine";
import { listingStore } from "../../lib/discord-listings/store";
import type { ListingRequest } from "../../lib/discord-listings/transport";

export async function reviewListingFixture(
  kind: "guild" | "group",
  entityId: string,
): Promise<void> {
  if (new URL(process.env.DATABASE_URL || "").port !== "55432")
    throw new Error("Listing fixtures require the isolated local database");
  const record = await db.foreverListingDiscordJob.findUniqueOrThrow({
    where: { kind_entityId: { kind, entityId } },
  });
  const job: ListingJob = { ...record, kind };
  const threadId = job.threadId ?? (BigInt(Date.now()) << 22n).toString();
  const tagId = "1556000000000000002";
  const request: ListingRequest = async (route, method): Promise<unknown> => {
    if (method === "POST" || route === `/channels/${threadId}`)
      return {
        id: threadId,
        type: 11,
        guild_id: listingGuildId,
        parent_id: job.forumId,
        applied_tags: [tagId],
      };
    if (route === `/channels/${job.forumId}`)
      return {
        id: job.forumId,
        type: 15,
        guild_id: listingGuildId,
        available_tags: [{ id: tagId, name: "EU", moderated: false }],
      };
    if (route.includes("/messages/"))
      return {
        id: threadId,
        channel_id: threadId,
        author: { id: listingBotId },
        content: job.content,
        attachments: job.attachment ? [{ filename: "listing.txt" }] : [],
      };
    throw new Error("Unexpected listing fixture route");
  };
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    const store = listingStore(client);
    if (job.status === "queued") await deliverListing(request, store, job);
    await syncListing(request, store, job);
  } finally {
    client.release();
    await pool.end();
  }
}

export async function removeListingFixture(
  kind: "guild" | "group",
  entityId: string,
): Promise<void> {
  if (new URL(process.env.DATABASE_URL || "").port !== "55432")
    throw new Error("Listing fixtures require the isolated local database");
  await db.foreverListingDiscordJob.deleteMany({ where: { kind, entityId } });
  await db.foreverAuditLog.deleteMany({
    where: { entityType: kind, entityId },
  });
}
