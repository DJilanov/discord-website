import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/security";
import { catalogBundleSchema, normalizeCatalog } from "./catalog";
import type { CatalogView } from "./contracts";
import { enrichCatalogItems } from "./item-details";

export async function stageCatalog(
  raw: unknown,
  actorId: string,
  database: PrismaClient = db,
): Promise<string> {
  const { bundle, checksum, warnings } = normalizeCatalog(raw);
  const record = await database.foreverRaidCatalog.upsert({
    where: { checksum },
    create: {
      raidName: bundle.raidName,
      checksum,
      bundle,
      warnings,
      stagedBy: actorId,
    },
    update: {},
  });
  return record.id;
}
export async function reviewCatalog(
  id: string,
  actorId: string,
  decision: "published" | "rejected",
  note: string,
  database: PrismaClient = db,
): Promise<void> {
  await database.$transaction(async (client) => {
    await client.$queryRaw`SELECT "id" FROM "ForeverRaidCatalog" WHERE "id" = ${id} FOR UPDATE`;
    const record = await client.foreverRaidCatalog.findUnique({
      where: { id },
    });
    if (!record) throw new HttpError(404, "Catalog not found.");
    if (record.status !== "staged")
      throw new HttpError(409, "This catalog has already been reviewed.");
    const bundle = catalogBundleSchema.parse(record.bundle);
    if (decision === "published" && bundle.availability !== "confirmed")
      throw new HttpError(
        400,
        "Confirm actual raid availability for this edition in a new source bundle before publication.",
      );
    await client.foreverRaidCatalog.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    await client.foreverAuditLog.create({
      data: {
        actorId,
        action: `raid_catalog_${decision}`,
        entityType: "raid_catalog",
        entityId: id,
        details: { checksum: record.checksum, note },
      },
    });
  });
}
export async function publishedCatalogs(
  database: PrismaClient = db,
): Promise<CatalogView[]> {
  const records = await database.foreverRaidCatalog.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return records.map((record) => {
    const bundle = catalogBundleSchema.parse(record.bundle);
    return {
      id: record.id,
      game: bundle.game,
      raidName: record.raidName,
      checksum: record.checksum,
      sourcePatch: bundle.sourcePatch,
      clientBuild: bundle.clientBuild,
      items: enrichCatalogItems(bundle.game, bundle.items),
    };
  });
}
