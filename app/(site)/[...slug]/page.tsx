import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { pages } from "@/content/pages";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumbs, JoinButton, PageHeader } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { getSettings } from "@/lib/settings";
import { artworkDescription } from "@/content/artwork";
import {
  CommunityActivity,
  type CommunityScope,
} from "@/components/community-activity";

interface Props {
  params: Promise<{ slug: string[] }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).slug.join("/");
  const page = pages[key];
  return page
    ? pageMetadata(page.title, page.description, `/${key}`)
    : { title: "Page not found", robots: { index: false } };
}
export default async function ContentPage({
  params,
}: Props): Promise<React.JSX.Element> {
  const key = (await params).slug.join("/");
  if (["alliance/guild-recruitment", "horde/guild-recruitment"].includes(key))
    redirect(
      `/guild-recruitment?faction=${key.startsWith("alliance") ? "Alliance" : "Horde"}`,
    );
  const page = pages[key];
  if (!page) notFound();
  const settings = await getSettings();
  const communityScope: CommunityScope | null =
    key === "discord/eu"
      ? { region: "EU" }
      : key === "discord/na"
        ? { region: "NA" }
        : key === "alliance"
          ? { faction: "Alliance" }
          : key === "horde"
            ? { faction: "Horde" }
            : key.startsWith("servers/")
              ? {
                  interest:
                    key === "servers/pve"
                      ? "PvE"
                      : key === "servers/pvp"
                        ? "PvP"
                        : "RP",
                }
              : null;
  const scenic = Boolean(
    page.image &&
    (key.startsWith("servers/") ||
      key.startsWith("discord/") ||
      key === "alliance" ||
      key === "horde"),
  );
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: page.title, href: `/${key}` }]} />
      <div className={scenic ? "community-masthead" : undefined}>
        {scenic && page.image && (
          <Image
            src={page.image}
            alt={artworkDescription(page.image, page.title)}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            fetchPriority="high"
          />
        )}
        <PageHeader
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
        >
          {page.cta && (
            <Link href={page.cta.href} className="button primary">
              {page.cta.label}
              <ArrowRight size={16} />
            </Link>
          )}
        </PageHeader>
      </div>
      {page.image && !scenic && (
        <div className="editorial-cover">
          <Image
            src={page.image}
            alt={artworkDescription(page.image, page.title)}
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1200px"
          />
        </div>
      )}
      <div className="article-layout">
        <article>
          {key === "about" && settings.raidsHosted && (
            <p className="notice">
              Organizer experience: {settings.raidsHosted} raids hosted across
              prior guild communities. This is not a membership figure for the
              new Discord.
            </p>
          )}
          <Markdown>{page.body}</Markdown>
          {key === "privacy" && settings.contactEmail && (
            <p>
              Contact:{" "}
              <a href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            </p>
          )}
        </article>
        <aside className="article-aside">
          <ShieldCheck size={26} />
          <h3>WoW Forever Discord</h3>
          <p>
            Find your people, share the adventure, and help make the next
            chapter a good one.
          </p>
          <JoinButton
            available={Boolean(settings.discordInvite || settings.backupInvite)}
          />
          <nav aria-label="Related pages">
            <Link href="/guild-recruitment">
              Find a guild
              <ArrowRight size={14} />
            </Link>
            <Link href="/guides">
              Community guides
              <ArrowRight size={14} />
            </Link>
            <Link href="/rules">
              Our standards
              <ArrowRight size={14} />
            </Link>
            <Link href="/transparency">
              Transparency
              <ArrowRight size={14} />
            </Link>
          </nav>
        </aside>
      </div>
      {communityScope && <CommunityActivity scope={communityScope} />}
    </div>
  );
}
