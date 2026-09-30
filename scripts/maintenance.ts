import "./env";
import { db } from "../lib/db";
import { deleteStored } from "../lib/storage";
import { SITE_URL } from "../lib/config";

async function main(): Promise<void> {
  const now = new Date();
  await db.foreverBridgeAdminRequest.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 7 * 86400000) } },
  });
  await db.foreverRateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.foreverAnalyticsEvent.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } },
  });
  await db.foreverGroup.updateMany({
    where: { expiresAt: { lt: now }, status: { in: ["pending", "approved"] } },
    data: { status: "expired", submittedIpHash: null },
  });
  const evidence = await db.foreverEvidence.findMany({
    where: { report: { evidencePurgeAt: { lt: now } } },
    take: 100,
  });
  let purged = 0;
  for (const file of evidence) {
    await db.$transaction(
      async (tx) => {
        // Appeals extend retention under the same lock, so a stale scan cannot erase their evidence.
        await tx.$queryRaw`SELECT "id" FROM "ForeverReport" WHERE "id" = ${file.reportId} FOR UPDATE`;
        const current = await tx.foreverEvidence.findFirst({
          where: { id: file.id, report: { evidencePurgeAt: { lt: now } } },
        });
        if (!current) return;
        await deleteStored(current.storageKey);
        await tx.foreverEvidence.delete({ where: { id: current.id } });
        purged += 1;
      },
      { timeout: 20000 },
    );
  }
  const webhook = process.env.DISCORD_MOD_WEBHOOK_URL;
  if (webhook) {
    const url = new URL(webhook);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "discord.com" ||
      !url.pathname.startsWith("/api/webhooks/")
    )
      throw new Error("Invalid moderation webhook URL.");
    const jobs = await db.foreverWebhookJob.findMany({
      where: { deliveredAt: null, attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    for (const job of jobs) {
      const section = job.kind === "appeal" ? "appeals" : "reports";
      const content = `New community ${job.kind} ready for staff review: ${SITE_URL}/admin/${section}?edit=${job.entityId}`;
      await db.foreverWebhookJob.update({
        where: { id: job.id },
        data: { attempts: { increment: 1 } },
      });
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok)
        await db.foreverWebhookJob.update({
          where: { id: job.id },
          data: { deliveredAt: now },
        });
      else if (response.status === 429) break;
    }
  }
  await db.foreverWebhookJob.deleteMany({
    where: { deliveredAt: { lt: new Date(Date.now() - 30 * 86400000) } },
  });
  console.log(`Maintenance complete. Purged ${purged} expired evidence files.`);
}
main()
  .catch((error: Error) => {
    console.error(
      error.name + ": maintenance failed; inspect configuration and retry.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
