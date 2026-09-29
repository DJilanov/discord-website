import { db } from "@/lib/db";
import { Breadcrumbs, EmptyState, PageHeader } from "@/components/ui";
import { GuideCollection } from "@/components/guide-card";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { startingGuideSlugs } from "@/content/editorial";

export const metadata = pageMetadata(
  "WoW Forever Guides & Community Resources",
  "Practical WoW Forever community guides: find a guild, join Discord, plan groups, understand loot rules and use player-safety tools.",
  "/guides",
);
export default async function GuidesPage(): Promise<React.JSX.Element> {
  const guides = await db.foreverGuide.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  const starters = startingGuideSlugs.flatMap((slug) =>
    guides.filter((guide) => guide.slug === slug),
  );
  const evergreen = guides.filter((guide) => guide.category !== "News");
  const stories = guides.filter((guide) => guide.category === "News");
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Guides", href: "/guides" }]} />
      <PageHeader
        eyebrow="FROM THE COMMUNITY"
        title="WoW Forever Guides"
        description="Practical advice from fellow players. Find your community, organize a better group, and get more from your time in Azeroth."
      />
      {starters.length > 0 && (
        <nav className="guide-starting-path" aria-label="Start here">
          <p className="eyebrow">Start here</p>
          {starters.map((guide) => (
            <Link key={guide.id} href={`/guides/${guide.slug}`}>
              <span>{guide.title}</span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </nav>
      )}
      <section className="section" style={{ paddingTop: 0 }}>
        {guides.length ? (
          <GuideCollection guides={evergreen} />
        ) : (
          <EmptyState title="New guides are on the way.">
            Our community team is preparing the first resources.
          </EmptyState>
        )}
      </section>
      {stories.length > 0 && (
        <section className="section">
          <h2>Community stories</h2>
          <GuideCollection guides={stories} />
        </section>
      )}
    </div>
  );
}
