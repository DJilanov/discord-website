import Link from "next/link";
import { Download, ShieldCheck, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import {
  Breadcrumbs,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { Markdown } from "@/components/markdown";

export async function AddonDetail({
  changelog = false,
}: {
  changelog?: boolean;
}): Promise<React.JSX.Element> {
  const releases = await db.foreverAddonRelease.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  const latest = releases[0];
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Addons", href: "/addons" },
          { label: "ForeverGuard", href: "/addons/foreverguard" },
          ...(changelog
            ? [{ label: "Changelog", href: "/addons/foreverguard/changelog" }]
            : []),
        ]}
      />
      <PageHeader
        eyebrow="COMMUNITY CONTEXT, IN YOUR HANDS"
        title={
          changelog
            ? "ForeverGuard release notes"
            : "ForeverGuard for WoW Forever"
        }
        description={
          changelog
            ? "What changed, what was tested, and what still needs playtesting."
            : "Private player notes and reviewed safety context for your next group. Optional, transparent, and built around the right to appeal."
        }
      />
      <nav className="tabs" aria-label="ForeverGuard pages">
        <Link
          className={!changelog ? "active" : ""}
          href="/addons/foreverguard"
        >
          Overview &amp; installation
        </Link>
        <Link
          className={changelog ? "active" : ""}
          href="/addons/foreverguard/changelog"
        >
          Release notes
        </Link>
      </nav>
      {changelog ? (
        <section className="section" style={{ paddingTop: 0 }}>
          {releases.length ? (
            releases.map((release) => (
              <article className="release-row" key={release.id}>
                <div className="release-header">
                  <h2>Version {release.version}</h2>
                  <StatusBadge value={release.channel} />
                </div>
                <Markdown>{release.changelog}</Markdown>
                <a
                  className="button secondary"
                  href={`/api/addons/releases/${release.id}/download`}
                >
                  <Download size={16} />
                  Download {release.version}
                </a>
              </article>
            ))
          ) : (
            <EmptyState title="No public releases yet.">
              The first alpha is being prepared and reviewed.
            </EmptyState>
          )}
        </section>
      ) : (
        <>
          <section className="addon-layout">
            <div>
              <div className="addon-emblem">
                <ShieldCheck size={45} strokeWidth={1.3} />
              </div>
              <h2>
                Remember the people.
                <br />
                Keep the context.
              </h2>
              <ul className="check-list">
                <li>Private notes stored on your own computer</li>
                <li>Checks by character, realm, and region</li>
                <li>Party and raid roster scans</li>
                <li>Reviewed alerts with severity and expiry</li>
                <li>Optional warnings and a private report template</li>
              </ul>
              <p className="fine-print">
                No automatic whispers, kicks, reports, or gameplay actions.
                Installing the addon is never required to join the community.
              </p>
            </div>
            <div>
              {latest ? (
                <div className="release-row">
                  <div className="release-header">
                    <h3>ForeverGuard {latest.version}</h3>
                    <StatusBadge value={latest.channel} />
                  </div>
                  <p className="release-meta">
                    Published{" "}
                    {latest.publishedAt?.toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    · {(latest.size / 1024).toFixed(1)} KB
                  </p>
                  <Markdown>{latest.changelog}</Markdown>
                  <a
                    className="button primary"
                    href={`/api/addons/releases/${latest.id}/download`}
                  >
                    <Download size={16} />
                    Download {latest.channel}
                  </a>
                  <p
                    className="fine-print token-reveal"
                    style={{ marginTop: 18 }}
                  >
                    SHA-256: {latest.sha256}
                  </p>
                </div>
              ) : (
                <div className="notice">
                  <h3>Alpha under review</h3>
                  <p>
                    The source implementation is ready for testing. A download
                    will appear here after the release is reviewed.
                    Compatibility and test notes will accompany it.
                  </p>
                </div>
              )}
              <div className="callout">
                <ShieldCheck size={24} />
                <div>
                  <h3>Always check current context.</h3>
                  <p>
                    The addon uses a local data file. It cannot receive live
                    corrections while you play.{" "}
                    <Link href="/transparency">Check current alerts</Link> and
                    update the list before a group session.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="section narrow">
            <div className="prose">
              <h2>Install in the right client</h2>
              <ol>
                <li>Download a published ZIP and read its release notes.</li>
                <li>
                  Extract the ForeverGuard folder into the active WoW
                  client&apos;s Interface/AddOns directory.
                </li>
                <li>
                  Restart the game or reload the UI, then enable ForeverGuard in
                  the addon list.
                </li>
                <li>
                  Use <code>/fg version</code> to check your region and local
                  data version.
                </li>
              </ol>
              <p>
                The current alpha targets the installed Forever 1.60.1 beta
                interface. Beta APIs can change; see the release notes for test
                coverage. Do not install into a different game client by
                accident.
              </p>
              <h2>A few useful commands</h2>
              <pre>
                <code>
                  {
                    "/fg check Character-Realm\n/fg note Character-Realm Helpful raid leader\n/fg forget Character-Realm\n/fg scan\n/fg report\n/fg region EU\n/fg threshold 3\n/fg alerts off"
                  }
                </code>
              </pre>
              <h2>Refresh reviewed data</h2>
              <p>
                Download the latest{" "}
                <a
                  href="/api/addons/foreverguard/list?format=lua"
                  download="Data.lua"
                >
                  Data.lua export
                </a>
                , replace the file inside the addon folder, then reload the UI.
                Keep your SavedVariables intact to preserve private notes. Only
                obtain this executable Lua file from this community domain.
              </p>
              <p>
                Pending appeals, removed decisions, and expired alerts are
                excluded from new exports. Old installed copies require an
                update. HTTPS protects delivery, but the alpha does not perform
                cryptographic signature verification inside the game.
              </p>
              <h2>How alerts are reviewed</h2>
              <p>
                Public alerts require evidence and two distinct reviewers. They
                include a review date and expiry. Players can{" "}
                <Link href="/appeals">appeal</Link>, and pending appeals suspend
                distribution. Read the{" "}
                <Link href="/safety">full evidence standard</Link> before
                relying on a warning.
              </p>
            </div>
            <Link className="text-link" href="/reports">
              Reports and corrections
              <ArrowRight size={16} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
