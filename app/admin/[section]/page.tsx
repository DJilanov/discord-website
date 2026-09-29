import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth";
import { adminSections } from "@/lib/admin-nav";
import {
  settingsFields,
  guideFields,
  guildFields,
  staffFields,
} from "@/lib/admin-fields";
import { getSettings } from "@/lib/settings";
import { trafficReport } from "@/lib/traffic-report";
import {
  AdminEditor,
  type EditorField,
  type EditorValues,
} from "@/components/admin-editor";
import { AdminList, EditorHeader } from "@/components/admin-tables";
import { StatusBadge } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { SearchReadiness } from "@/components/search-readiness";
import { TrafficConversions } from "@/components/traffic-conversions";

interface Props {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ edit?: string; days?: string }>;
}
function editorValues(record: object, fields: EditorField[]): EditorValues {
  const result: EditorValues = {};
  for (const field of fields) {
    const value: unknown = Reflect.get(record, field.name);
    result[field.name] =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? value
        : Array.isArray(value) &&
            value.every((item: unknown) => typeof item === "string")
          ? (value as string[])
          : "";
  }
  return result;
}
function date(value: Date): string {
  return (
    value.toLocaleString("en-GB", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC"
  );
}

export default async function AdminSection({
  params,
  searchParams,
}: Props): Promise<React.JSX.Element> {
  const { section } = await params,
    query = await searchParams;
  const config = adminSections.find(
    (item) => item.path === `/admin/${section}`,
  );
  if (!config) notFound();
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (!config.roles.includes(staff.role))
    return (
      <>
        <h1>Access restricted</h1>
        <p>Your staff role does not have access to this section.</p>
        <Link className="text-link" href="/admin">
          Return to overview
        </Link>
      </>
    );
  const id = query.edit?.slice(0, 100),
    base = `/admin/${section}`;
  if (section === "settings") {
    const settings = await getSettings();
    return (
      <>
        <h1>Website settings</h1>
        <p>Update the invitation, community details, and homepage copy.</p>
        <AdminEditor
          endpoint="/api/admin/settings"
          fields={settingsFields}
          values={{ ...settings }}
        />
        <section className="section">
          <h2>Deployment configuration</h2>
          <p className="muted">Canonical domain: {process.env.SITE_URL}</p>
          <p className="muted">
            Search indexing:{" "}
            {process.env.SITE_INDEXABLE === "true"
              ? "Enabled"
              : "Disabled for this environment"}
          </p>
          <p className="fine-print">
            The domain and indexing setting are controlled by the deployment
            environment to keep redirects and metadata consistent.
          </p>
        </section>
      </>
    );
  }
  if (section === "guides") {
    if (id) {
      const guide =
        id === "new"
          ? {
              title: "",
              slug: "",
              excerpt: "",
              category: "Getting started",
              author: "WoW Forever Discord Team",
              coverImage: "/images/community.webp",
              content: "",
              published: false,
              metaTitle: "",
              metaDescription: "",
            }
          : await db.foreverGuide.findUnique({ where: { id } });
      if (!guide) notFound();
      return (
        <>
          <EditorHeader
            title={id === "new" ? "Write a guide" : "Edit guide"}
            backHref={base}
          />
          <AdminEditor
            endpoint={`/api/admin/guides${id === "new" ? "" : `/${id}`}`}
            fields={guideFields}
            values={editorValues(guide, guideFields)}
            returnTo={base}
            preview
          />
        </>
      );
    }
    const rows = await db.foreverGuide.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Guides &amp; news</h1>
        <p>Publish useful resources with search metadata and a clear author.</p>
        <AdminList
          createHref={`${base}?edit=new`}
          createLabel="Write a guide"
          rows={rows.map((row) => ({
            id: row.id,
            title: row.title,
            detail: `${row.category} / ${row.slug}`,
            status: row.published ? "published" : "draft",
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "guilds") {
    if (id) {
      const guild = await db.foreverGuild.findUnique({ where: { id } });
      if (!guild) notFound();
      return (
        <>
          <EditorHeader title={guild.name} backHref={base}>
            <p className="muted">
              Submitted {date(guild.createdAt)}. Changes to approved listings
              become public immediately.
            </p>
          </EditorHeader>
          <AdminEditor
            endpoint={`/api/admin/guilds/${id}`}
            fields={guildFields}
            values={editorValues(guild, guildFields)}
            returnTo={base}
          />
        </>
      );
    }
    const rows = await db.foreverGuild.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Guild directory</h1>
        <p>
          Review new guilds, keep details current, and hide stale or misleading
          listings.
        </p>
        <AdminList
          rows={rows.map((row) => ({
            id: row.id,
            title: row.name,
            detail: `${row.region} / ${row.faction} / ${row.ruleset}`,
            status: row.status,
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "groups") {
    if (id) {
      const group = await db.foreverGroup.findUnique({ where: { id } });
      if (!group) notFound();
      return (
        <>
          <EditorHeader title={group.title} backHref={base} />
          <dl className="detail-grid">
            {[
              ["Region / realm", `${group.region} / ${group.realm}`],
              ["Faction", group.faction],
              ["Activity", group.activity],
              ["Starts", date(group.startsAt)],
              ["Expires", date(group.expiresAt)],
              ["Discord", group.contactDiscord],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p style={{ whiteSpace: "pre-wrap" }}>{group.description}</p>
          <AdminEditor
            endpoint={`/api/admin/groups/${id}`}
            fields={[
              {
                name: "status",
                label: "Decision",
                type: "select",
                options: ["approved", "hidden", "rejected"],
              },
              {
                name: "reason",
                label: "Reason",
                type: "textarea",
                required: true,
                full: true,
              },
            ]}
            values={{ status: "approved", reason: "" }}
            returnTo={base}
          />
        </>
      );
    }
    const rows = await db.foreverGroup.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Group posts</h1>
        <p>Review the plan, contact details, and timing before publication.</p>
        <AdminList
          rows={rows.map((row) => ({
            id: row.id,
            title: row.title,
            detail: `${row.activity} / ${row.region} / ${date(row.startsAt)}`,
            status: row.expiresAt < new Date() ? "expired" : row.status,
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "reports") {
    if (id) {
      const report = await db.foreverReport.findUnique({
        where: { id },
        include: {
          evidence: { where: { appealId: null } },
          alert: true,
          appeals: { select: { id: true, publicId: true, status: true } },
        },
      });
      if (!report) notFound();
      const [audit, moderators] = await Promise.all([
        db.foreverAuditLog.findMany({
          where: { entityType: "report", entityId: id },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.foreverUser.findMany({
          where: {
            active: true,
            role: { in: ["owner", "admin", "moderator"] },
          },
          select: { id: true, name: true },
        }),
      ]);
      const approved = audit.find(
        (item) => item.action === "approve_public",
      )?.details;
      const candidate =
        approved && typeof approved === "object" && !Array.isArray(approved)
          ? approved
          : {};
      const actions: Record<string, string[]> = {
        submitted: [
          "under_review",
          "needs_more_evidence",
          "rejected",
          "verified_private",
        ],
        under_review: [
          "needs_more_evidence",
          "rejected",
          "verified_private",
          "approve_public",
        ],
        needs_more_evidence: ["under_review", "rejected"],
        verified_private: ["under_review", "approve_public", "overturned"],
        awaiting_second_review: ["publish", "under_review", "rejected"],
        verified_public: ["overturned"],
        rejected: ["under_review"],
        overturned: ["under_review"],
        expired: ["under_review"],
      };
      const options = actions[report.status] || [];
      const fields: EditorField[] = [
        {
          name: "action",
          label: "Action",
          type: "select",
          options: options.map((value) => ({
            value,
            label: value.replace(/_/g, " "),
          })),
        },
        {
          name: "severity",
          label: "Severity (1-4)",
          type: "number",
          min: 1,
          max: 4,
          required: true,
        },
        {
          name: "reason",
          label: "Decision reason (shared with the reporter)",
          type: "textarea",
          required: true,
          full: true,
          maxLength: 2000,
        },
        {
          name: "summary",
          label: "Neutral public summary",
          type: "textarea",
          full: true,
          maxLength: 500,
          hint: "Required for public approval. Do not include reporter identity or private evidence.",
        },
        {
          name: "expiresInDays",
          label: "Alert duration (days)",
          type: "number",
          min: 7,
          max: 180,
          required: true,
        },
        {
          name: "assignedTo",
          label: "Assigned moderator",
          type: "select",
          options: [
            { value: "", label: "Unassigned" },
            ...moderators.map((item) => ({ value: item.id, label: item.name })),
          ],
        },
      ];
      return (
        <>
          <EditorHeader title={`Case ${report.publicId}`} backHref={base}>
            <StatusBadge value={report.status} />
          </EditorHeader>
          <div className="admin-split">
            <div>
              <dl className="detail-grid">
                {[
                  ["Character", report.character],
                  ["Realm / region", `${report.realm} / ${report.region}`],
                  ["Guild", report.guild || "Not provided"],
                  ["Faction", report.faction],
                  ["Category", report.category],
                  ["Incident", date(report.incidentAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <h2>Incident description</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{report.description}</p>
              {report.lootRules && (
                <>
                  <h2>Agreed rules</h2>
                  <p style={{ whiteSpace: "pre-wrap" }}>{report.lootRules}</p>
                </>
              )}
              <h2>Private evidence</h2>
              <div className="evidence-grid">
                {report.evidence.map((item, index) => (
                  <a
                    key={item.id}
                    href={`/api/admin/evidence/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Screenshot {index + 1}
                    <ExternalLink size={13} />
                  </a>
                ))}
              </div>
              {!report.evidence.length && (
                <p className="muted">No retained evidence.</p>
              )}
              {report.status === "awaiting_second_review" && (
                <div className="notice">
                  Publication needs a different reviewer. The summary, severity,
                  and duration must match the first approval exactly.
                </div>
              )}
              {options.length ? (
                <AdminEditor
                  key={report.version}
                  endpoint={`/api/admin/reports/${id}`}
                  fields={fields}
                  values={{
                    action: options[0],
                    version: report.version,
                    severity:
                      typeof candidate.severity === "number"
                        ? candidate.severity
                        : report.severity,
                    reason: "",
                    summary:
                      typeof candidate.summary === "string"
                        ? candidate.summary
                        : report.alert?.summary || "",
                    expiresInDays:
                      typeof candidate.expiresInDays === "number"
                        ? candidate.expiresInDays
                        : 90,
                    assignedTo: report.assignedTo || "",
                  }}
                  label="Record decision"
                />
              ) : (
                <p className="notice">
                  This case is being appealed. Use the appeal workflow to record
                  the outcome.
                </p>
              )}
            </div>
            <aside>
              <h2>Reporter (private)</h2>
              <p>
                {report.reporterDiscord}
                <br />
                {report.reporterCharacter}
              </p>
              <p className="fine-print">
                Submitted {date(report.createdAt)}
                <br />
                Evidence retention until {date(report.evidencePurgeAt)}
              </p>
              {report.appeals.map((appeal) => (
                <p key={appeal.id}>
                  <Link
                    className="text-link"
                    href={`/admin/appeals?edit=${appeal.id}`}
                  >
                    {appeal.publicId} · {appeal.status}
                  </Link>
                </p>
              ))}
              <h2>Decision history</h2>
              {audit.map((item) => (
                <div className="audit-row" key={item.id}>
                  {item.action.replace(/_/g, " ")}
                  <small>
                    {date(item.createdAt)}
                    <br />
                    Actor: {item.actorId}
                  </small>
                  <p className="fine-print">
                    {typeof item.details === "object" &&
                    item.details &&
                    "reason" in item.details
                      ? String(item.details.reason)
                      : ""}
                  </p>
                </div>
              ))}
            </aside>
          </div>
        </>
      );
    }
    const rows = await db.foreverReport.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        character: true,
        realm: true,
        category: true,
        status: true,
        updatedAt: true,
      },
    });
    return (
      <>
        <h1>Private reports</h1>
        <p>
          Evidence first. Record reasons, manage conflicts of interest, and use
          a second reviewer before publishing.
        </p>
        <AdminList
          rows={rows.map((row) => ({
            id: row.id,
            title: row.publicId,
            detail: `${row.character} / ${row.realm} / ${row.category}`,
            status: row.status,
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "appeals") {
    if (id) {
      const appeal = await db.foreverAppeal.findUnique({
        where: { id },
        include: { evidence: true, report: { include: { alert: true } } },
      });
      if (!appeal) notFound();
      const fields: EditorField[] = [
        {
          name: "status",
          label: "Outcome",
          type: "select",
          options: [
            "under_review",
            "upheld",
            "reduced",
            "corrected",
            "removed",
          ],
        },
        {
          name: "severity",
          label: "Revised severity (for reduction)",
          type: "number",
          min: 1,
          max: 4,
        },
        {
          name: "reason",
          label: "Reason (shared with appellant)",
          type: "textarea",
          required: true,
          full: true,
        },
        {
          name: "summary",
          label: "Revised public summary",
          type: "textarea",
          full: true,
        },
        { name: "character", label: "Corrected character" },
        { name: "realm", label: "Corrected realm" },
      ];
      return (
        <>
          <EditorHeader title={`Appeal ${appeal.publicId}`} backHref={base}>
            <StatusBadge value={appeal.status} />
          </EditorHeader>
          <div className="admin-split">
            <div>
              <h2>Appellant explanation</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{appeal.explanation}</p>
              <p className="muted">
                Requested outcome: {appeal.requestedOutcome}
              </p>
              <div className="evidence-grid">
                {appeal.evidence.map((item, index) => (
                  <a
                    key={item.id}
                    href={`/api/admin/evidence/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Appeal screenshot {index + 1}
                  </a>
                ))}
              </div>
              <div className="notice">
                The original approvers cannot resolve this appeal. Pending
                appeals keep the public alert suspended.
              </div>
              {["submitted", "under_review"].includes(appeal.status) ? (
                <AdminEditor
                  key={appeal.version}
                  endpoint={`/api/admin/appeals/${id}`}
                  fields={fields}
                  values={{
                    version: appeal.version,
                    status: "under_review",
                    severity:
                      appeal.report.alert?.severity || appeal.report.severity,
                    reason: "",
                    summary: appeal.report.alert?.summary || "",
                    character: appeal.report.character,
                    realm: appeal.report.realm,
                  }}
                  label="Record appeal outcome"
                />
              ) : (
                <p>{appeal.decisionReason}</p>
              )}
            </div>
            <aside>
              <h2>Private contact</h2>
              <p>
                {appeal.appellantDiscord}
                <br />
                {appeal.character}
              </p>
              <p>{date(appeal.createdAt)}</p>
              <Link
                className="text-link"
                href={`/admin/reports?edit=${appeal.reportId}`}
              >
                Original case {appeal.report.publicId}
              </Link>
            </aside>
          </div>
        </>
      );
    }
    const rows = await db.foreverAppeal.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        publicId: true,
        character: true,
        requestedOutcome: true,
        status: true,
        updatedAt: true,
      },
    });
    return (
      <>
        <h1>Appeals</h1>
        <p>Review new context independently of the original decision.</p>
        <AdminList
          rows={rows.map((row) => ({
            id: row.id,
            title: row.publicId,
            detail: `${row.character} / ${row.requestedOutcome}`,
            status: row.status,
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "safety-alerts") {
    const rows = await db.foreverSafetyAlert.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Safety alerts</h1>
        <p>
          Alerts are created through the two-reviewer case workflow. Expired or
          appealed alerts are excluded from public feeds.
        </p>
        <AdminList
          rows={rows.map((row) => ({
            id: row.id,
            title: row.publicId,
            detail: `${row.character} / ${row.realm} / level ${row.severity}`,
            status:
              row.expiresAt < new Date()
                ? "expired"
                : row.appealStatus === "pending"
                  ? "appealed"
                  : row.active
                    ? "published"
                    : "hidden",
            date: row.updatedAt,
            href: `/admin/reports?edit=${row.reportId}`,
          }))}
        />
      </>
    );
  }
  if (section === "addons") {
    if (id === "new")
      return (
        <>
          <EditorHeader title="Upload ForeverGuard release" backHref={base} />
          <AdminEditor
            endpoint="/api/admin/addons"
            multipart
            fields={[
              {
                name: "version",
                label: "Version",
                required: true,
                hint: "Semantic version, such as 0.1.0-alpha.1",
              },
              {
                name: "channel",
                label: "Channel",
                type: "select",
                options: ["alpha", "beta", "stable"],
              },
              {
                name: "changelog",
                label: "Release notes",
                type: "textarea",
                required: true,
                full: true,
              },
              {
                name: "file",
                label: "ForeverGuard ZIP (up to 20 MB)",
                type: "file",
                required: true,
                full: true,
              },
            ]}
            values={{ version: "", channel: "alpha", changelog: "" }}
            returnTo={base}
            label="Upload draft release"
          />
        </>
      );
    if (id) {
      const release = await db.foreverAddonRelease.findUnique({
        where: { id },
      });
      if (!release) notFound();
      return (
        <>
          <EditorHeader
            title={`ForeverGuard ${release.version}`}
            backHref={base}
          />
          <p>
            {release.channel} · {release.downloadCount} downloads ·{" "}
            {release.size.toLocaleString()} bytes
          </p>
          <p className="fine-print token-reveal">SHA-256: {release.sha256}</p>
          <Markdown>{release.changelog}</Markdown>
          <AdminEditor
            endpoint={`/api/admin/addons/${id}`}
            fields={[
              {
                name: "status",
                label: "Publication status",
                type: "select",
                options: ["draft", "published", "revoked"],
              },
            ]}
            values={{ status: release.status }}
            returnTo={base}
          />
        </>
      );
    }
    const rows = await db.foreverAddonRelease.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Addon releases</h1>
        <p>
          Upload a real ZIP, review the notes, then publish. Revoked files stop
          being downloadable immediately.
        </p>
        <AdminList
          createHref={`${base}?edit=new`}
          createLabel="Upload release"
          rows={rows.map((row) => ({
            id: row.id,
            title: `ForeverGuard ${row.version}`,
            detail: `${row.channel} / ${row.downloadCount} downloads`,
            status: row.status,
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
      </>
    );
  }
  if (section === "search") return <SearchReadiness />;
  if (section === "analytics") {
    const days = [7, 30, 90].includes(Number(query.days))
      ? Number(query.days)
      : 30;
    const report = await trafficReport(days);
    const { conversion } = report;
    return (
      <>
        <h1>Traffic &amp; community growth</h1>
        <p>
          First-party traffic, referral sources, and invitation intent. Discord
          clicks are not confirmed joins.
        </p>
        <div className="tabs">
          {[7, 30, 90].map((value) => (
            <Link
              key={value}
              className={days === value ? "active" : ""}
              href={`${base}?days=${value}`}
            >
              Last {value} days
            </Link>
          ))}
        </div>
        <div className="status-grid">
          {[
            [report.views, "Page views"],
            [report.sessions, "Browser sessions"],
            [report.clicks, "Discord invite clicks"],
            [
              `${report.conversionRate.toFixed(1)}%`,
              "Sessions that clicked Discord",
            ],
          ].map(([count, label]) => (
            <div className="metric" key={label}>
              <strong>{count}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="admin-split">
          <section>
            <h2>Top pages</h2>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Page views by URL"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paths.map((item) => (
                    <tr key={item.path}>
                      <td>{item.path}</td>
                      <td>{item._count}</td>
                    </tr>
                  ))}
                  {!report.paths.length && (
                    <tr>
                      <td colSpan={2}>No measured traffic in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <aside>
            <h2>Page views by source</h2>
            <div className="bar-list">
              {report.sources.map((item) => (
                <div className="bar-row" key={item.source}>
                  <div>
                    <span>{item.source}</span>
                    <span>{item._count}</span>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{
                        width: `${(100 * item._count) / Math.max(1, report.views)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <section className="section">
          <h2>Conversion by traffic source</h2>
          <TrafficConversions rows={conversion.sources} label="Source" />
          <p className="fine-print">
            One conversion per session with a measured page view and Discord
            click. Attribution uses the first observed page in this period.
            Clicks are not confirmed joins; privacy controls and blocked scripts
            can reduce measurement.
          </p>
        </section>
        <section className="section">
          <h2>Entry pages</h2>
          <TrafficConversions
            rows={conversion.landingPages}
            label="First page in period"
          />
        </section>
        <section className="section">
          <div className="section-heading">
            <h2>Recent traffic</h2>
            <a
              href={`/api/admin/analytics/export?days=${days}`}
              className="button secondary"
            >
              <Download size={16} />
              Export CSV
            </a>
          </div>
          <p className="fine-print">
            Bots are excluded. Visitor fingerprints are keyed hashes, not raw
            IPs or verified people. Sources may be unknown when browsers
            suppress referrers.
          </p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Recent traffic events"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Time (UTC)</th>
                  <th scope="col">Event / page</th>
                  <th scope="col">Source</th>
                  <th scope="col">Referrer / campaign</th>
                  <th scope="col">Device</th>
                  <th scope="col">Session / fingerprint</th>
                </tr>
              </thead>
              <tbody>
                {report.recent.map((item) => (
                  <tr key={item.id}>
                    <td>{date(item.createdAt)}</td>
                    <td>
                      {item.event}
                      <br />
                      {item.path}
                    </td>
                    <td>{item.source}</td>
                    <td>
                      {item.referrerHost || "Direct / unknown"}
                      <br />
                      {item.utmCampaign}
                    </td>
                    <td>
                      {item.device}
                      <br />
                      {item.country || ""}
                    </td>
                    <td>
                      {item.sessionId?.slice(0, 8) || "No session"}
                      <br />
                      {item.ipHash.slice(0, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }
  if (section === "audit") {
    const rows = await db.foreverAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <>
        <h1>Audit log</h1>
        <p>
          Accountable changes to settings, content, staff access, and
          moderation.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Time (UTC)</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{date(row.createdAt)}</td>
                  <td>{row.actorId}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.entityType} / {row.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (section === "staff") {
    if (id) {
      const user =
        id === "new"
          ? { name: "", email: "", role: "moderator", active: true }
          : await db.foreverUser.findUnique({
              where: { id },
              select: { name: true, email: true, role: true, active: true },
            });
      if (!user) notFound();
      return (
        <>
          <EditorHeader
            title={id === "new" ? "Add staff member" : "Manage staff access"}
            backHref={base}
          />
          <AdminEditor
            endpoint={`/api/admin/staff${id === "new" ? "" : `/${id}`}`}
            fields={staffFields}
            values={{ ...user, password: "" }}
            returnTo={base}
          />
        </>
      );
    }
    const rows = await db.foreverUser.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
      take: 100,
    });
    return (
      <>
        <h1>Staff access</h1>
        <p>
          Owners manage access. Moderators review cases. Editors manage guides
          and releases.
        </p>
        <AdminList
          createHref={`${base}?edit=new`}
          createLabel="Add staff member"
          rows={rows.map((row) => ({
            id: row.id,
            title: row.name,
            detail: `${row.email} / ${row.role}`,
            status: row.active ? "active" : "disabled",
            date: row.updatedAt,
            href: `${base}?edit=${row.id}`,
          }))}
        />
        <p className="fine-print">
          Your account: {staff.email}. Roles and account status are checked
          against the database on every protected request.
        </p>
      </>
    );
  }
  notFound();
}
