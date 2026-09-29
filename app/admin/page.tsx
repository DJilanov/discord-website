import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function AdminHome(): Promise<React.JSX.Element> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  const [guilds, groups, guides, settings] = await Promise.all([
    db.foreverGuild.count({ where: { status: "pending" } }),
    db.foreverGroup.count({
      where: { status: "pending", expiresAt: { gt: new Date() } },
    }),
    db.foreverGuide.count({ where: { published: true } }),
    getSettings(),
  ]);
  const canModerate = ["owner", "admin", "moderator"].includes(staff.role);
  const [reports, appeals] = canModerate
    ? await Promise.all([
        db.foreverReport.count({
          where: {
            status: {
              in: [
                "submitted",
                "needs_more_evidence",
                "under_review",
                "awaiting_second_review",
              ],
            },
          },
        }),
        db.foreverAppeal.count({
          where: { status: { in: ["submitted", "under_review"] } },
        }),
      ])
    : [null, null];
  return (
    <>
      <p className="eyebrow">COMMUNITY OPERATIONS</p>
      <h1>Welcome back, {staff.name}.</h1>
      <p>
        The current state of your community, with the next actions in one place.
      </p>
      <div className="status-grid">
        {[
          [guilds, "Guilds waiting for review"],
          [groups, "Upcoming groups to review"],
          [guides, "Published guides"],
          [reports ?? "Restricted", "Open moderation cases"],
        ].map(([count, label]) => (
          <div className="metric" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="section">
        <h2>Needs your attention</h2>
        {canModerate && (
          <div className="directory-list">
            {[
              ["/admin/guilds", `${guilds} guild listings waiting for review`],
              ["/admin/groups", `${groups} group posts waiting for review`],
              ["/admin/reports", `${reports} reports in the moderation queue`],
              ["/admin/appeals", `${appeals} appeals awaiting a decision`],
            ].map(([href, text]) => (
              <Link className="callout" key={href} href={href}>
                <span>{text}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        )}
        {["owner", "admin", "editor"].includes(staff.role) && (
          <Link className="button primary" href="/admin/guides?edit=new">
            Write a guide
            <ArrowRight size={16} />
          </Link>
        )}
      </section>
      <section className="section">
        <h2>Community invitation</h2>
        <p className="muted">
          {settings.discordInvite || "No primary invite is configured."}
        </p>
        {["owner", "admin"].includes(staff.role) && (
          <Link href="/admin/settings" className="text-link">
            Update invite and website settings
            <ArrowRight size={15} />
          </Link>
        )}
      </section>
    </>
  );
}
