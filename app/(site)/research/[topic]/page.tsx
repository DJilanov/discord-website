import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download } from "lucide-react";

import { ResearchFeedback } from "@/components/research-feedback";
import { Breadcrumbs, JsonLd, PageHeader } from "@/components/ui";
import {
  researchTopic,
  researchTopics,
  type ResearchTopicSlug,
} from "@/content/research";
import { HELPER_URL, SITE_NAME, SITE_URL } from "@/lib/config";
import {
  getForeverObservatory,
  getRecruitmentCensus,
  type CensusBucket,
  type ForeverObservatory,
  type RecruitmentCensus,
} from "@/lib/research";
import { pageMetadata } from "@/lib/seo";

interface ResearchReportProps {
  readonly params: Promise<{ readonly topic: string }>;
}

export function generateStaticParams(): { readonly topic: string }[] {
  return researchTopics.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({
  params,
}: ResearchReportProps): Promise<Metadata> {
  const topic = researchTopic((await params).topic);
  if (!topic)
    return pageMetadata("Research report not found", "", "/research", true);
  return pageMetadata(
    topic.title,
    topic.description,
    `/research/${topic.slug}`,
  );
}

export default async function ResearchReportPage({
  params,
}: ResearchReportProps): Promise<React.JSX.Element> {
  const slug = (await params).topic;
  const topic = researchTopic(slug);
  if (!topic) notFound();
  const [observatory, census] = await Promise.all([
    getForeverObservatory(),
    slug === "recruitment" ? getRecruitmentCensus() : Promise.resolve(null),
  ]);
  const modified = reportModifiedAt(topic.slug, observatory, census);
  const path = `/research/${topic.slug}`;
  const article = {
    "@type": "Article",
    "@id": `${SITE_URL}${path}#article`,
    headline: topic.title,
    description: topic.description,
    datePublished: "2026-10-04",
    dateModified: modified,
    mainEntityOfPage: `${SITE_URL}${path}`,
    ...(topic.slug === "recruitment"
      ? {}
      : { isBasedOn: `${HELPER_URL}/api/v1/public/forever/observatory` }),
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  return (
    <article className="container research-page research-report">
      <Breadcrumbs
        items={[
          { label: "Research & data", href: "/research" },
          { label: topic.title, href: path },
        ]}
      />
      <PageHeader
        eyebrow={topic.eyebrow}
        title={topic.title}
        description={topic.description}
      />
      <ReportProvenance modified={modified} slug={topic.slug} />
      <ReportBody slug={topic.slug} observatory={observatory} census={census} />
      <ResearchFeedback path={path} />
      <section
        className="research-next"
        aria-labelledby="more-research-heading"
      >
        <h2 id="more-research-heading">Continue researching</h2>
        {researchTopics
          .filter((entry) => entry.slug !== topic.slug)
          .slice(0, 3)
          .map((entry) => (
            <Link href={`/research/${entry.slug}`} key={entry.slug}>
              {entry.title} <ArrowRight size={15} />
            </Link>
          ))}
      </section>
      <JsonLd
        data={
          topic.slug === "data"
            ? {
                "@context": "https://schema.org",
                "@graph": [
                  article,
                  {
                    "@type": "Dataset",
                    "@id": `${SITE_URL}${path}#dataset`,
                    name: "WoW Forever public observatory dataset",
                    description: topic.description,
                    url: `${SITE_URL}${path}`,
                    sameAs: `${HELPER_URL}/forever/data`,
                    dateModified: modified,
                    version:
                      observatory?.catalog.current?.version ?? "Unpublished",
                    creator: { "@id": `${SITE_URL}/#organization` },
                    isAccessibleForFree: true,
                    distribution: {
                      "@type": "DataDownload",
                      contentUrl: `${HELPER_URL}/api/v1/public/forever/observatory`,
                      encodingFormat: "application/json",
                    },
                  },
                ],
              }
            : { "@context": "https://schema.org", ...article }
        }
      />
    </article>
  );
}

function ReportProvenance({
  modified,
  slug,
}: {
  readonly modified: string;
  readonly slug: ResearchTopicSlug;
}): React.JSX.Element {
  return (
    <div className="research-provenance">
      <p>
        Published by <Link href="/about">{SITE_NAME}</Link>. Evidence updated{" "}
        <time dateTime={modified}>{formatEvidenceDate(modified)}</time>.
      </p>
      <p>
        {slug === "recruitment"
          ? "Built from approved public guild listings with freshness and small-sample controls. "
          : "Built from versioned client extracts and accepted community observations. "}
        <Link href="/research/data">Read the methodology and limits</Link>.
      </p>
    </div>
  );
}

function ReportBody({
  slug,
  observatory,
  census,
}: {
  readonly slug: ResearchTopicSlug;
  readonly observatory: ForeverObservatory | null;
  readonly census: RecruitmentCensus | null;
}): React.JSX.Element {
  if (slug === "recruitment" && census)
    return <RecruitmentReport census={census} />;
  if (!observatory) {
    return (
      <section className="research-state" role="status">
        <h2>The live evidence feed is temporarily unavailable</h2>
        <p>
          The report is not replaced with cached-looking estimates. Search the
          Helper directly or return later after the public feed recovers.
        </p>
        <a
          data-analytics-event="research_action"
          href={`${HELPER_URL}/forever`}
          className="button secondary"
        >
          Open KFC Helper
        </a>
      </section>
    );
  }
  if (slug === "build-changes")
    return <BuildChangesReport data={observatory} />;
  if (slug === "economy") return <EconomyReport data={observatory} />;
  if (slug === "professions") return <ProfessionReport data={observatory} />;
  if (slug === "discoveries") return <DiscoveryReport data={observatory} />;
  if (slug === "world") return <WorldReport data={observatory} />;
  return <DataReport data={observatory} />;
}

function BuildChangesReport({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  const changes = data.catalog.changes;
  return (
    <div className="research-body">
      <EvidenceStamp data={data} />
      {changes && data.catalog.previous && data.catalog.current ? (
        <>
          <h2>
            Build {data.catalog.previous.buildNumber} →{" "}
            {data.catalog.current.buildNumber}
          </h2>
          <div className="research-metrics">
            <Metric label="Items added" value={changes.items.added} />
            <Metric label="Items changed" value={changes.items.changed} />
            <Metric label="Items removed" value={changes.items.removed} />
            <Metric label="Recipes changed" value={changes.recipes.changed} />
          </div>
          <p>{changes.note}</p>
          {changes.items.sampleIds.length ? (
            <div>
              <h3>Sample affected item IDs</h3>
              <div className="research-id-list">
                {changes.items.sampleIds.map((itemId) => (
                  <a
                    data-analytics-event="research_action"
                    href={`${HELPER_URL}/forever/encyclopedia/items/${itemId}`}
                    key={itemId}
                  >
                    {itemId}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EvidenceGap
          title="The current build is the baseline"
          text="A second compatible published catalog is required before we can make a build-to-build claim. The baseline remains preserved for that comparison."
        />
      )}
    </div>
  );
}

function EconomyReport({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  return (
    <div className="research-body">
      <EvidenceStamp data={data} />
      <h2>
        {data.market.state === "reportable"
          ? "Evidence-gated signals"
          : "History is still collecting"}
      </h2>
      <p>{data.market.evidenceRule}</p>
      <div className="research-metrics">
        <Metric label="Eligible items" value={data.market.eligibleItems} />
        <Metric label="Still collecting" value={data.market.collectingItems} />
        <Metric
          label="Latest scan items"
          value={data.market.scan?.itemCount ?? 0}
        />
      </div>
      {data.market.notable.length ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Notable market signals"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Signal</th>
                <th scope="col">vs normal</th>
                <th scope="col">Confidence</th>
                <th scope="col">Observations</th>
              </tr>
            </thead>
            <tbody>
              {data.market.notable.map((item) => (
                <tr key={item.itemId}>
                  <td>
                    <a
                      data-analytics-event="research_action"
                      href={`${HELPER_URL}/forever/encyclopedia/items/${item.itemId}`}
                    >
                      {item.name}
                    </a>
                  </td>
                  <td>{humanize(item.signal)}</td>
                  <td>{signedPercent(item.differencePercent)}</td>
                  <td>{item.confidencePercent}%</td>
                  <td>{item.observationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EvidenceGap
          title="No item passes the publication gate yet"
          text="Live prices remain searchable, but they are not promoted as normal-price trends until the exact market and build have enough accepted observations."
        />
      )}
      <p className="research-limit">
        A price signal is context, not a promise of profit. Deposit costs,
        Auction House fees, liquidity, recipe cooldowns, and the player&apos;s
        actual craft access still matter.
      </p>
      <a
        className="button secondary"
        data-analytics-event="research_action"
        href={`${HELPER_URL}/forever/trader`}
      >
        Search the current Auction House
      </a>
    </div>
  );
}

function ProfessionReport({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  return (
    <div className="research-body">
      <EvidenceStamp data={data} />
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Profession recipe coverage"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Profession</th>
              <th scope="col">Recipes</th>
              <th scope="col">Cooldown</th>
              <th scope="col">Unresolved</th>
            </tr>
          </thead>
          <tbody>
            {data.catalog.professions.map((profession) => (
              <tr key={profession.skillLineId}>
                <td>
                  <a
                    data-analytics-event="research_action"
                    href={`${HELPER_URL}/forever/encyclopedia/professions/${profession.slug}`}
                  >
                    {profession.name}
                  </a>
                </td>
                <td>{profession.recipes.toLocaleString()}</td>
                <td>{profession.cooldownRecipes.toLocaleString()}</td>
                <td>{profession.unresolvedRecipes.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="research-limit">
        Cooldown crafts are catalogued but excluded from repeatable
        circular-economy rankings. Specialization benefits publish only when
        their eligibility and yield rules are known for the same build.
      </p>
    </div>
  );
}

function RecruitmentReport({
  census,
}: {
  census: RecruitmentCensus;
}): React.JSX.Element {
  return (
    <div className="research-body">
      <div className="research-evidence-stamp">
        <span>Approved public listings</span>
        <strong>
          {census.totalListings.toLocaleString()} guilds in sample
        </strong>
        <small>
          {census.recentlyVerifiedListings.toLocaleString()} updated or verified
          in the last {census.freshnessDays} days
        </small>
      </div>
      <h2>Classes guilds say they need</h2>
      <BucketTable label="Class" rows={census.classDemand} />
      <div className="research-split">
        <div>
          <h2>By region</h2>
          <BucketTable label="Region" rows={census.regions} />
        </div>
        <div>
          <h2>By faction</h2>
          <BucketTable label="Faction" rows={census.factions} />
        </div>
        <div>
          <h2>Raid days advertised</h2>
          <BucketTable label="Day" rows={census.raidDays} />
        </div>
      </div>
      <p className="research-limit">{census.limitation}</p>
      <p className="research-limit">
        Counts below three are displayed as “Small sample” to avoid
        overinterpreting individual listings.
      </p>
      <Link className="button secondary" href="/guild-recruitment">
        Browse recruiting guilds
      </Link>
    </div>
  );
}

function DiscoveryReport({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  return (
    <div className="research-body">
      <EvidenceStamp data={data} />
      <div className="research-metrics">
        <Metric label="Catalog items" value={data.discovery.catalogItems} />
        <Metric
          label="Seen in latest AH scan"
          value={data.discovery.latestMarketItems}
        />
        <Metric
          label="Client source hints"
          value={data.discovery.sourceHints}
        />
        <Metric
          label="Loot relationship leads"
          value={data.discovery.lootSourceCandidates}
        />
        <Metric
          label="Confirmed drop rates"
          value={data.discovery.confirmedDropRates}
        />
      </div>
      <h2>What each number means</h2>
      <p>
        Catalog presence proves that a record exists in the selected client
        build. Auction House presence proves only that the item appeared in one
        accepted market scan. Source hints and loot relationships are
        investigation leads until observation or reviewed evidence confirms
        them.
      </p>
      <EvidenceGap
        title="Low-drop and unreleased items need time"
        text="An item can be real while remaining absent from the Auction House for months. We keep client identity, content availability, source identity, and drop probability as separate facts."
      />
      <a
        className="button secondary"
        data-analytics-event="research_action"
        href={`${HELPER_URL}/forever/encyclopedia/catalog`}
      >
        Search every indexed item
      </a>
    </div>
  );
}

function WorldReport({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  const world = data.world;
  if (!world) {
    return (
      <EvidenceGap
        title="World snapshot unavailable"
        text="We are not substituting catalog IDs or names for missing map and encounter evidence. The report will recover with the reviewed world snapshot."
      />
    );
  }
  return (
    <div className="research-body">
      <div className="research-evidence-stamp">
        <span>World snapshot</span>
        <strong>Build {world.build.buildNumber}</strong>
        <small>{humanize(world.build.state)} evidence state</small>
      </div>
      <div className="research-metrics">
        <Metric label="Maps" value={world.counts.uiMaps} />
        <Metric label="Encounters" value={world.counts.encounters} />
        <Metric
          label="Canonical encounters"
          value={world.counts.canonicalEncounters}
        />
        <Metric label="Boss identities" value={world.counts.bosses} />
        <Metric label="Boss locations" value={world.counts.bossLocations} />
        <Metric label="Spell leads" value={world.counts.bossSpellCandidates} />
        <Metric label="Quests" value={world.counts.quests} />
        <Metric label="Quest map points" value={world.counts.questPois} />
      </div>
      <p className="research-limit">
        An extracted encounter name or model is not proof that content is live.
        Candidate boss, spell, location, and loot relationships retain their
        review status on every entity page.
      </p>
      <a
        className="button secondary"
        data-analytics-event="research_action"
        href={`${HELPER_URL}/forever/encyclopedia/maps`}
      >
        Explore the maps and encounters
      </a>
    </div>
  );
}

function DataReport({ data }: { data: ForeverObservatory }): React.JSX.Element {
  return (
    <div className="research-body">
      <EvidenceStamp data={data} />
      <h2>Public report endpoint</h2>
      <p>
        The versioned JSON export contains catalog/build identity, normalized
        change counts, profession coverage, evidence-gated market signals, world
        coverage, and publication rules.
      </p>
      <a
        className="button primary"
        data-analytics-event="dataset_download"
        href={`${HELPER_URL}/api/v1/public/forever/observatory`}
      >
        <Download size={17} /> Download JSON
      </a>
      <h2>Publication rules</h2>
      <ul className="research-rules">
        {data.publicationRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <p className="research-limit">
        Reusers should preserve build number, market key, generated timestamp,
        and evidence status. Blizzard game data and imagery remain Blizzard
        Entertainment&apos;s property.
      </p>
      <a
        className="text-link"
        data-analytics-event="research_action"
        href={`${HELPER_URL}/forever/data`}
      >
        Full API notes and entity endpoints <ArrowRight size={15} />
      </a>
    </div>
  );
}

function EvidenceStamp({
  data,
}: {
  data: ForeverObservatory;
}): React.JSX.Element {
  return (
    <div className="research-evidence-stamp">
      <span>Live evidence snapshot</span>
      <strong>
        {data.catalog.current
          ? `Build ${data.catalog.current.buildNumber}`
          : "No published catalog"}
      </strong>
      <small>
        Generated{" "}
        {new Date(data.generatedAt).toLocaleString("en-GB", {
          timeZone: "UTC",
        })}{" "}
        UTC
      </small>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div>
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  );
}

function BucketTable({
  label,
  rows,
}: {
  label: string;
  rows: readonly CensusBucket[];
}): React.JSX.Element {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${label} demand`}
    >
      <table>
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">Listings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.count ?? "Small sample"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2}>No approved listings in this sample.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceGap({
  title,
  text,
}: {
  title: string;
  text: string;
}): React.JSX.Element {
  return (
    <aside className="research-gap" role="note">
      <span>Evidence gap</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </aside>
  );
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function reportModifiedAt(
  slug: ResearchTopicSlug,
  observatory: ForeverObservatory | null,
  census: RecruitmentCensus | null,
): string {
  if (slug === "recruitment") return census?.dataAsOf ?? "2026-10-04";
  if (slug === "economy" && observatory?.market.scan)
    return observatory.market.scan.completedAt;
  return (
    observatory?.catalog.current?.publishedAt ??
    observatory?.catalog.current?.extractedAt ??
    "2026-10-04"
  );
}

function formatEvidenceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}
