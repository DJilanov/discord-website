import Link from "next/link";
import { db } from "@/lib/db";
import {
  Breadcrumbs,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { pageNumber, type QueryParams } from "@/lib/directory";
import { Pagination } from "@/components/directory";
export const metadata = pageMetadata(
  "Community Moderation Transparency",
  "Live aggregate moderation outcomes, active reviewed alerts, appeals and community accountability at WoW Forever Discord.",
  "/transparency",
);
export default async function TransparencyPage({
  searchParams,
}: {
  searchParams: Promise<QueryParams>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const page = pageNumber(query);
  const where = {
    active: true,
    appealStatus: { not: "pending" },
    expiresAt: { gt: new Date() },
  };
  const [reports, appeals, alerts, overturned, activeCount] = await Promise.all(
    [
      db.foreverReport.count(),
      db.foreverAppeal.count(),
      db.foreverSafetyAlert.findMany({
        where,
        orderBy: { lastReviewedAt: "desc" },
        take: 25,
        skip: (page - 1) * 25,
        select: {
          publicId: true,
          character: true,
          realm: true,
          region: true,
          category: true,
          severity: true,
          summary: true,
          lastReviewedAt: true,
          expiresAt: true,
        },
      }),
      db.foreverReport.count({ where: { status: "overturned" } }),
      db.foreverSafetyAlert.count({ where }),
    ],
  );
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Transparency", href: "/transparency" }]} />
      <PageHeader
        eyebrow="ACCOUNTABILITY IN PRACTICE"
        title="Community transparency"
        description="Real moderation outcomes. Clear standards. No reporter identities or private evidence."
      />
      <div className="status-grid">
        {[
          [reports, "Reports submitted"],
          [appeals, "Appeals submitted"],
          [activeCount, "Active public alerts"],
          [overturned, "Decisions overturned"],
        ].map(([count, label]) => (
          <div className="metric" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="fine-print">
        All-time totals from the community database, as of{" "}
        {new Date().toLocaleDateString("en-GB", { timeZone: "UTC" })}. Counts
        include all submitted cases, not only substantiated incidents.
      </p>
      <section className="section">
        <SectionHeading
          title="Current reviewed alerts"
          description="Pending appeals and expired alerts are excluded automatically."
        />
        {alerts.length ? (
          <div className="directory-list">
            {alerts.map((alert) => (
              <article className="guild-row" key={alert.publicId}>
                <div className="badge">Level {alert.severity}</div>
                <div>
                  <h3>
                    {alert.character} · {alert.realm}
                  </h3>
                  <div className="guild-meta">
                    <span>{alert.region}</span>
                    <span>{alert.category}</span>
                    <span>{alert.publicId}</span>
                  </div>
                  <p>{alert.summary}</p>
                  <span className="fine-print">
                    Reviewed{" "}
                    {alert.lastReviewedAt.toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    · Expires{" "}
                    {alert.expiresAt.toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
                <Link
                  className="text-link"
                  href={`/appeals?reference=${alert.publicId}`}
                >
                  Appeal
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No active public alerts.">
            This means there are no currently published, unexpired alerts. It is
            not a guarantee of any player&apos;s conduct.
          </EmptyState>
        )}
        <Pagination
          total={activeCount}
          page={page}
          path="/transparency"
          query={query}
          size={25}
        />
        <div className="prose narrow">
          <h2>How to read these figures</h2>
          <p>
            A report is an allegation, not a finding. A closed case may have
            insufficient evidence, a resolved misunderstanding, or a private
            moderation outcome. Public alerts require two reviewers and have an
            expiry date. An appeal can correct or remove a decision.
          </p>
          <p>
            Moderators must step aside from conflicts of interest. See our{" "}
            <Link href="/safety">evidence standards</Link>,{" "}
            <Link href="/rules">rules</Link>, and{" "}
            <Link href="/appeals">appeal process</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
