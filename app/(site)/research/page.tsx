import Link from "next/link";
import { ArrowRight, Database, SearchCheck } from "lucide-react";

import { Breadcrumbs, JsonLd, PageHeader } from "@/components/ui";
import { researchTopics } from "@/content/research";
import { HELPER_URL, SITE_URL } from "@/lib/config";
import { getForeverObservatory, getRecruitmentCensus } from "@/lib/research";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Research, Data & Community Reports",
  "Build changes, Auction House trends, profession coverage, guild recruitment demand, discoveries, world data and open WoW Forever datasets.",
  "/research",
);

export default async function ResearchPage(): Promise<React.JSX.Element> {
  const [observatory, census] = await Promise.all([
    getForeverObservatory(),
    getRecruitmentCensus(),
  ]);
  return (
    <div className="container research-page">
      <Breadcrumbs items={[{ label: "Research & data", href: "/research" }]} />
      <PageHeader
        eyebrow="EVIDENCE, NOT GUESSWORK"
        title="WoW Forever research & data"
        description="We turn build extracts, accepted market scans, and community listings into useful reports. Every conclusion keeps its build, sample size, and unknowns attached."
      >
        <a
          className="button primary"
          data-analytics-event="research_action"
          href={`${HELPER_URL}/forever/encyclopedia/catalog`}
        >
          Search the live database
          <ArrowRight size={17} />
        </a>
        <Link className="button secondary" href="/contribute">
          Help collect evidence
        </Link>
      </PageHeader>

      <section className="research-pulse" aria-label="Latest research status">
        <div>
          <Database aria-hidden="true" />
          <span>Published catalog</span>
          <strong>
            {observatory?.catalog.current
              ? `Build ${observatory.catalog.current.buildNumber}`
              : "Temporarily unavailable"}
          </strong>
        </div>
        <div>
          <SearchCheck aria-hidden="true" />
          <span>Market evidence</span>
          <strong>
            {observatory
              ? `${observatory.market.eligibleItems.toLocaleString()} reportable items`
              : "Temporarily unavailable"}
          </strong>
        </div>
        <div>
          <span aria-hidden="true">⚔</span>
          <span>Guild sample</span>
          <strong>
            {census.totalListings.toLocaleString()} approved listings
          </strong>
        </div>
      </section>

      <section className="section" aria-labelledby="research-library-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RESEARCH LIBRARY</p>
            <h2 id="research-library-heading">
              Questions players are actually asking
            </h2>
            <p className="muted">
              Reports update from the underlying evidence. Empty evidence
              becomes a visible gap, never filler copy.
            </p>
          </div>
        </div>
        <div className="research-card-grid">
          {researchTopics.map((topic) => (
            <Link href={`/research/${topic.slug}`} key={topic.slug}>
              <span className="eyebrow">{topic.eyebrow}</span>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <span className="text-link">
                Read report <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "WoW Forever research and data",
          url: `${SITE_URL}/research`,
          hasPart: researchTopics.map((topic) => ({
            "@type": "Article",
            name: topic.title,
            url: `${SITE_URL}/research/${topic.slug}`,
          })),
        }}
      />
    </div>
  );
}
