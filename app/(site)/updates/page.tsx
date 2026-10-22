import Link from "next/link";
import { Rss, CalendarDays, Bookmark } from "lucide-react";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { toolsBase, traderLinks } from "@/content/community-tools";

export const metadata = pageMetadata(
  "WoW Forever Resource Updates",
  "Follow published guide and talent-reference updates, save a market watchlist and add approved community events to your calendar.",
  "/updates",
);

export default function UpdatesPage(): React.JSX.Element {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Resource updates", href: "/updates" }]} />
      <PageHeader
        eyebrow="KEEP WHAT MATTERS"
        title="WoW Forever resource updates"
        description="A few useful ways to return to your plans. No automatic Discord messages, marketing emails or trading alerts."
      />
      <section className="section narrow prose">
        <Rss size={24} />
        <h2>Follow published resources</h2>
        <p>
          Add a feed to a reader you already use. The guide feed includes
          published articles, not drafts. The talent feed changes when a
          reviewed source snapshot is published, not whenever an upstream file
          changes. Recheck the evidence labels before applying a new build.
        </p>
        <div className="button-row">
          <a className="button secondary" href="/updates.xml">
            <Rss size={16} /> Guide feed
          </a>
          <a
            className="button secondary"
            href={`${toolsBase}/forever/updates.xml`}
          >
            <Rss size={16} /> Talent reference feed
          </a>
        </div>
      </section>
      <section className="section narrow prose">
        <Bookmark size={24} />
        <h2>Keep a market watchlist</h2>
        <p>
          In the Trader item view, choose an item and use Watch item. Your list
          stays in that browser; you can remove entries or clear it. Alliance
          and Horde markets remain separate. The list does not send alerts,
          place trades or certify that old prices are current.
        </p>
        <a className="text-link" href={`${traderLinks.workspace}?mode=items`}>
          Open watched items
        </a>
      </section>
      <section className="section narrow prose">
        <CalendarDays size={24} />
        <h2>Bring a real session into your calendar</h2>
        <p>
          Approved community event previews include a calendar download. It
          contains the public plan, not attendees or character details.
          Downloads are snapshots: the managed event remains the source for
          changed times, cancellation and roster decisions.
        </p>
        <Link className="text-link" href="/lfg">
          Browse scheduled groups
        </Link>
      </section>
      <section className="section narrow prose">
        <h2>Keep your character plans</h2>
        <p>
          The leveling planner stores progress locally, and the talent
          calculator can save and share a build. Browser-local saves do not
          automatically synchronize across devices. Export or copy a supported
          share link before relying on another browser; never put private
          account information into a public plan.
        </p>
        <div className="button-row">
          <a className="text-link" href={traderLinks.leveling}>
            Leveling planner
          </a>
          <a className="text-link" href={traderLinks.talents}>
            Talent references
          </a>
        </div>
      </section>
    </div>
  );
}
