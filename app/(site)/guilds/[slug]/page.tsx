import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

interface Props {
  params: Promise<{ slug: string }>;
}
async function getGuild(slug: string) {
  return db.foreverGuild.findFirst({ where: { slug, status: "approved" } });
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guild = await getGuild((await params).slug);
  return guild
    ? pageMetadata(
        `${guild.name} - ${guild.region} ${guild.faction} Guild Recruitment`,
        `${guild.name} is a ${guild.playstyle} WoW Forever ${guild.faction} guild. ${guild.raidTime}. Recruiting ${guild.recruitingClasses.join(", ")}.`,
        `/guilds/${guild.slug}`,
      )
    : { title: "Guild not found", robots: { index: false } };
}
export default async function GuildPage({
  params,
}: Props): Promise<React.JSX.Element> {
  const guild = await getGuild((await params).slug);
  if (!guild) notFound();
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Guilds", href: "/guild-recruitment" },
          { label: guild.name, href: `/guilds/${guild.slug}` },
        ]}
      />
      <PageHeader
        eyebrow={`${guild.region} · ${guild.faction} · ${guild.ruleset}`}
        title={guild.name}
        description={`${guild.playstyle} guild · ${guild.realm} · ${guild.language}`}
      />
      <div className="article-layout">
        <article>
          <dl className="detail-grid">
            {[
              ["Raid days", guild.raidDays.join(", ") || "Flexible"],
              ["Raid time", guild.raidTime],
              ["Loot system", guild.lootSystem],
              ["Playstyle", guild.playstyle],
              ["Language", guild.language],
              [
                "Last reviewed",
                guild.lastVerifiedAt?.toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                }) || "Not yet reviewed",
              ],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2>About the guild</h2>
          <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
            {guild.description}
          </div>
          <h2>Recruiting classes</h2>
          <div className="small-tags">
            {guild.recruitingClasses.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
        <aside className="article-aside">
          <MessageCircle size={28} />
          <h3>Start a conversation</h3>
          <p>
            Discord contact: <strong>{guild.contactDiscord}</strong>
          </p>
          <CopyButton text={guild.contactDiscord} label="Copy contact" />
          {guild.inviteUrl && (
            <p className="button-row">
              <a
                className="button primary"
                href={guild.inviteUrl}
                target="_blank"
                rel="noopener noreferrer ugc nofollow"
              >
                Guild Discord
                <ArrowUpRight size={16} />
              </a>
            </p>
          )}
          {guild.websiteUrl && (
            <p>
              <a
                className="text-link"
                href={guild.websiteUrl}
                target="_blank"
                rel="noopener noreferrer ugc nofollow"
              >
                Guild website
                <ArrowUpRight size={15} />
              </a>
            </p>
          )}
          <nav>
            <Link href="/reports/new">
              Report a listing issue
              <ArrowUpRight size={14} />
            </Link>
            <Link href="/guides/find-your-wow-forever-guild">
              Before joining a guild
              <ArrowUpRight size={14} />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}
