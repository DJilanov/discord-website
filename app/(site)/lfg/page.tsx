import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, Swords } from "lucide-react";
import { db } from "@/lib/db";
import { REGIONS, FACTIONS, RULESETS } from "@/lib/config";
import { pageMetadata } from "@/lib/seo";
import {
  groupFilter,
  pageNumber,
  queryValue,
  type QueryParams,
} from "@/lib/directory";
import { Breadcrumbs, EmptyState, PageHeader } from "@/components/ui";
import { FilterSelect, Pagination } from "@/components/directory";
import { CopyButton } from "@/components/copy-button";

interface Props {
  searchParams: Promise<QueryParams>;
}
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  return pageMetadata(
    "WoW Forever LFG - Dungeons, Raids, PvP & RP",
    "Find or post a WoW Forever group: EU and NA, Alliance and Horde, dungeons, raids, PvP and questing. Compare times, roles and organizer contacts before joining.",
    "/lfg",
    Object.keys(await searchParams).length > 0,
  );
}
export default async function LfgPage({
  searchParams,
}: Props): Promise<React.JSX.Element> {
  const query = await searchParams,
    page = pageNumber(query);
  const where = groupFilter(query);
  const [groups, total] = await Promise.all([
    db.foreverGroup.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * 12,
      take: 12,
    }),
    db.foreverGroup.count({ where }),
  ]);
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Find a group", href: "/lfg" }]} />
      <div className="toolbar">
        <PageHeader
          eyebrow="ONE MORE FOR THE ADVENTURE"
          title="WoW Forever looking for group"
          description="A dungeon after work. A raid with new friends. A story worth sharing. Find a group for your next session."
        />
        <Link href="/lfg/new" className="button primary">
          <Plus size={16} />
          Post a group
        </Link>
      </div>
      <form className="filters" action="/lfg">
        <FilterSelect
          name="ruleset"
          label="Rulesets"
          options={RULESETS}
          value={queryValue(query, "ruleset")}
        />
        <FilterSelect
          name="region"
          label="Regions"
          options={REGIONS}
          value={queryValue(query, "region")}
        />
        <FilterSelect
          name="faction"
          label="Factions"
          options={FACTIONS}
          value={queryValue(query, "faction")}
        />
        <FilterSelect
          name="activity"
          label="Activities"
          options={["Dungeon", "Raid", "PvP premade", "RP event", "Questing"]}
          value={queryValue(query, "activity")}
        />
        <button type="submit" className="button primary">
          Filter groups
        </button>
        <Link href="/lfg" className="button secondary">
          Reset
        </Link>
      </form>
      <div className="result-count">
        <span>
          {total} upcoming {total === 1 ? "group" : "groups"}
        </span>
        <span>Times shown in UTC</span>
      </div>
      {groups.length ? (
        <div className="directory-list">
          {groups.map((group) => (
            <article
              className="guild-row"
              id={`group-${group.id}`}
              key={group.id}
            >
              <div className="guild-sigil">
                <Swords size={24} />
              </div>
              <div>
                <div className="guild-meta">
                  <span>{group.activity}</span>
                  <span>{group.faction}</span>
                  <span>
                    {group.region} ·{" "}
                    {group.gameRuleset === "Unconfirmed"
                      ? "Ruleset unconfirmed"
                      : group.gameRuleset}
                  </span>
                </div>
                <h3>{group.title}</h3>
                <div className="guild-meta">
                  <span>
                    <CalendarDays size={13} />
                    <time dateTime={group.startsAt.toISOString()}>
                      {group.startsAt.toLocaleString("en-GB", {
                        timeZone: "UTC",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      UTC
                    </time>
                  </span>
                </div>
                <p>{group.description}</p>
                <span className="fine-print">
                  Discord: {group.contactDiscord}
                </span>
              </div>
              <CopyButton text={group.contactDiscord} label="Copy contact" />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="The next group could be yours."
          action={
            <Link href="/lfg/new" className="button primary">
              <Plus size={16} />
              Post a group
            </Link>
          }
        >
          No upcoming groups match these filters. Share a time, a plan, and a
          way to reach you.
        </EmptyState>
      )}
      <Pagination total={total} page={page} path="/lfg" query={query} />
      <section className="section narrow">
        <h2>A little clarity goes a long way.</h2>
        <p className="section-lead">
          Include your region, character ruleset, faction, start time, needed
          roles, and loot rules. Group listings publish immediately and are
          queued for the matching Discord forum. Moderators review them afterward
          and can hide rule-breaking posts. Listings expire after the session.
          Scheduled events have their own signup and approval flow. For a regular roster, explore{" "}
          <Link className="text-link" href="/guild-recruitment">
            guild recruitment
          </Link>
          .
        </p>
        <p className="fine-print">This is a community group board, not Blizzard&apos;s in-game group finder. EU times use Central Europe, NA times use New York, and OCE times use UTC; the displayed offset accounts for the date. <Link href="/guides/find-or-organize-wow-forever-group" className="text-link">Read the posting and signup guide</Link>.</p>
      </section>
    </div>
  );
}
