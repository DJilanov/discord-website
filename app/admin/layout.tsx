import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { AdminNav, SignOutButton } from "@/components/admin-nav";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Community Administration",
  "Private community administration.",
  "/admin",
  true,
);
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  return (
    <div className="admin-shell">
      <AdminNav staff={staff} />
      <div className="admin-body">
        <header className="admin-topbar">
          <span>WoW Forever Discord / Administration</span>
          <div className="admin-actions">
            <Link href="/" className="text-link">
              View website
            </Link>
            <SignOutButton />
          </div>
        </header>
        <AdminNav staff={staff} mobile />
        <main id="main-content" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
