import { getStaff } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { raidsEnabled } from "@/lib/raids/config";
import { catalogBundleSchema } from "@/lib/raids/catalog";
import { db } from "@/lib/db";
import { CatalogAdmin } from "@/components/raids/catalog-admin";
import "@/components/raids/raids.css";

export const dynamic = "force-dynamic";
export default async function RaidAdminPage(): Promise<React.JSX.Element> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (!["owner", "admin", "moderator"].includes(staff.role)) notFound();
  if (!raidsEnabled())
    return (
      <>
        <h1>Forever raid manager</h1>
        <p className="muted">Private pilot is not enabled.</p>
      </>
    );
  const records = await db.foreverRaidCatalog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <CatalogAdmin
      canManage={staff.role !== "moderator"}
      catalogs={records.map((record) => ({
        id: record.id,
        status: record.status,
        checksum: record.checksum,
        warnings: record.warnings,
        reviewNote: record.reviewNote,
        bundle: catalogBundleSchema.parse(record.bundle),
      }))}
    />
  );
}
