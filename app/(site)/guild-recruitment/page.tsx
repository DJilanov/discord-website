import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { guildFilter, pageNumber, type QueryParams } from "@/lib/directory";
import { Breadcrumbs, EmptyState, PageHeader } from "@/components/ui";
import { GuildFilters, GuildRow, Pagination } from "@/components/directory";

interface Props {
  searchParams: Promise<QueryParams>;
}
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  return pageMetadata(
    "WoW Forever Guild Recruitment - Find Your Guild",
    "Browse WoW Forever guild recruitment for Alliance and Horde. Filter EU and NA guilds by PvE, PvP, RP, raid days, recruiting class and playstyle.",
    "/guild-recruitment",
    Object.keys(await searchParams).length > 0,
  );
}
export default async function GuildDirectory({
  searchParams,
}: Props): Promise<React.JSX.Element> {
  const query = await searchParams,
    page = pageNumber(query),
    where = guildFilter(query);
  const [guilds, total] = await Promise.all([
    db.foreverGuild.findMany({
      where,
      orderBy: [
        { featured: "desc" },
        { lastVerifiedAt: "desc" },
        { id: "asc" },
      ],
      skip: (page - 1) * 12,
      take: 12,
    }),
    db.foreverGuild.count({ where }),
  ]);
  return (
    <div className="container">
      <Breadcrumbs
        items={[{ label: "Guild recruitment", href: "/guild-recruitment" }]}
      />
      <div className="toolbar">
        <PageHeader
          eyebrow="FIND YOUR PEOPLE"
          title="WoW Forever guild recruitment"
          description="Your schedule. Your pace. Your kind of people. Find an Alliance or Horde guild that makes the game better."
        />
        <Link className="button primary" href="/guild-recruitment/new">
          <Plus size={17} />
          List your guild
        </Link>
      </div>
      <GuildFilters query={query} />
      <div className="result-count">
        <span>
          {total} {total === 1 ? "guild" : "guilds"} found
        </span>
        <span>Most recently reviewed first</span>
      </div>
      {guilds.length ? (
        <div className="directory-list">
          {guilds.map((guild) => (
            <GuildRow key={guild.id} guild={guild} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="A good guild starts with good people."
          action={
            <Link href="/guild-recruitment/new" className="button primary">
              <Plus size={16} />
              Submit your guild
            </Link>
          }
        >
          {Object.keys(query).length
            ? "No guilds match these filters yet. Try a broader search or add your own community."
            : "The directory is opening its doors. Be one of the first guilds to introduce your community."}
        </EmptyState>
      )}
      <Pagination
        total={total}
        page={page}
        path="/guild-recruitment"
        query={query}
      />
      <div className="callout">
        <ShieldCheck size={25} />
        <div>
          <h3>Make an informed choice.</h3>
          <p>
            Listings are reviewed for posting standards, not a guarantee of
            conduct. Ask about schedules and loot rules. Read{" "}
            <Link href="/guides/find-your-wow-forever-guild">
              our guild-finding guide
            </Link>{" "}
            before choosing your next home.
          </p>
        </div>
      </div>
      <div className="section">
        <h2>Built for every kind of guild.</h2>
        <p className="section-lead">
          Small communities, busy rosters, relaxed raid nights, PvP teams, and
          roleplay guilds all belong here. Use the same clear recruitment
          standards, whatever your size.
        </p>
      </div>
    </div>
  );
}
