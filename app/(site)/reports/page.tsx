import Link from "next/link";
import { ArrowRight, FileCheck2, LockKeyhole, Scale } from "lucide-react";
import { Breadcrumbs, PageHeader, SectionHeading } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "WoW Forever Player Reports & Evidence Standards",
  "Submit a private WoW Forever community report. Evidence-based review, independent moderation, private screenshots and a fair appeal process.",
  "/reports",
);
export default function ReportsPage(): React.JSX.Element {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }]} />
      <PageHeader
        eyebrow="FACTS FIRST. PEOPLE ALWAYS."
        title="A fair place to be heard."
        description="If something went wrong, share what happened and the evidence behind it. Reports stay private while moderators review the context."
      >
        <Link className="button primary" href="/reports/new">
          Submit a report
          <ArrowRight size={16} />
        </Link>
        <Link className="button secondary" href="/reports/status">
          Check a case
        </Link>
        <Link className="text-link" href="/appeals">
          Appeal a decision
          <ArrowRight size={15} />
        </Link>
      </PageHeader>
      <div className="utility-grid section">
        {[
          {
            icon: LockKeyhole,
            title: "Private by default",
            text: "Your contact, screenshots, and report are visible only to authorized moderators.",
          },
          {
            icon: FileCheck2,
            title: "Reviewed in context",
            text: "A public alert needs evidence, a neutral summary, and two distinct reviewers.",
          },
          {
            icon: Scale,
            title: "Open to correction",
            text: "Appeals suspend public distribution while an independent reviewer takes another look.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon size={25} color="var(--gold)" />
            <h3 style={{ marginTop: 17 }}>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </div>
      <section className="section narrow">
        <SectionHeading title="What to include" />
        <div className="prose">
          <p>
            Character name, realm, region, and date. Describe the sequence
            factually. Include original screenshots showing enough context to
            understand the incident. For loot issues, include the rules agreed
            before the run, the item, and the allocation or roll.
          </p>
          <p>
            Do not share unrelated personal information, encourage mass
            reporting, or publish accusations while a case is being reviewed.
            Guild membership alone is not evidence against other players.
          </p>
          <h2>What community moderators can do</h2>
          <p>
            Staff can review conduct within the community, moderate listings and
            posts, and publish limited, reviewed safety information. They cannot
            restore loot, reverse trades, or suspend game accounts. Use
            Blizzard&apos;s reporting tools for game-account violations and
            suspected cheating.
          </p>
          <p>
            Read the full <Link href="/safety">safety policy</Link> and{" "}
            <Link href="/privacy">privacy notice</Link> before submitting.
            Outcomes are counted in our{" "}
            <Link href="/transparency">transparency report</Link> without
            exposing reporter identities.
          </p>
        </div>
      </section>
    </div>
  );
}
