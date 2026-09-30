import Image, { getImageProps } from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Globe2,
  Plus,
  ScrollText,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { groupFilter, guildFilter } from "@/lib/directory";
import { FAQ, JoinButton, SectionHeading } from "@/components/ui";
import { GuideCollection } from "@/components/guide-card";
import { communities, communityFaq } from "@/content/community";

export const metadata = pageMetadata(
  "WoW Forever Discord & Community Hub",
  "Join the independent WoW Forever Discord for EU and NA. Meet Alliance and Horde players for PvE, PvP and roleplay, find guilds and arrange groups.",
  "/",
);

export default async function Home(): Promise<React.JSX.Element> {
  const [settings, guides, guilds, groups] = await Promise.all([
    getSettings(),
    db.foreverGuide.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      take: 3,
    }),
    db.foreverGuild.findMany({
      where: guildFilter({}),
      orderBy: [
        { featured: "desc" },
        { lastVerifiedAt: "desc" },
        { id: "asc" },
      ],
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        faction: true,
        ruleset: true,
      },
    }),
    db.foreverGroup.findMany({
      where: groupFilter({}),
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        region: true,
        activity: true,
        startsAt: true,
      },
    }),
  ]);
  const available = Boolean(settings.discordInvite || settings.backupInvite);
  const { props: desktopArt } = getImageProps({
    src: "/images/forever-hero.webp",
    alt: "",
    width: 2600,
    height: 1725,
    sizes: "100vw",
  });
  const { props: mobileArt } = getImageProps({
    src: "/images/forever-hero-mobile.webp",
    alt: "Adventurers overlooking the mountains and towers of Azeroth, official WoW Forever artwork",
    width: 960,
    height: 1880,
    quality: 60,
    sizes: "100vw",
    loading: "eager",
    fetchPriority: "high",
  });

  return (
    <div className="home-page">
      {settings.announcement && (
        <div className="announcement">
          <span className="announcement-label">Community news</span>
          <Link href={settings.announcementHref}>
            {settings.announcement}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
      <section className="home-hero" aria-labelledby="home-title">
        <picture>
          <source
            media="(min-width: 701px)"
            srcSet={desktopArt.srcSet}
            sizes="100vw"
          />
          <img {...mobileArt} alt={mobileArt.alt} className="hero-art" />
        </picture>
        <div className="hero-shade" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              Independent. Unofficial. Everyone welcome.
            </p>
            <h1 id="home-title">
              <Image
                src="/images/wow-forever-logo.png"
                alt=""
                width={340}
                height={277}
                sizes="(max-width: 700px) 190px, 300px"
                className="hero-logo"
                loading="eager"
              />
              <span>WoW Forever Discord</span>
            </h1>
            <p className="hero-description">{settings.heroDescription}</p>
            <div className="button-row">
              <JoinButton available={available} label="Join Discord" />
              <Link className="button secondary" href="/guild-recruitment">
                <Users size={18} />
                Find a guild
              </Link>
            </div>
            <div className="hero-coverage">
              <span className="faction-alliance">Alliance</span>
              <span className="coverage-divider" aria-hidden="true" />
              <span className="faction-horde">Horde</span>
              <span>
                <Globe2 size={15} />
                EU &amp; NA
              </span>
              {settings.memberCount && (
                <span>
                  <Users size={15} />
                  {settings.memberCount} members
                </span>
              )}
            </div>
          </div>
        </div>
        <a
          className="hero-explore"
          href="#communities"
          aria-label="Explore the community"
        >
          <ArrowDown size={18} />
          Explore the community
        </a>
      </section>

      <section
        className="container section community-section"
        id="communities"
        aria-labelledby="communities-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Azeroth is better together</p>
            <h2 id="communities-title">Find your kind of adventure.</h2>
          </div>
          <p className="section-note">
            Three ways to play.
            <br />A place for every player.
          </p>
        </div>
        <p className="community-intro">
          <Link href="/discord">WoW Forever Discord</Link> is an independent,
          unofficial EU and NA community for Alliance and Horde players
          interested in PvE, PvP and roleplay. You do not need to join a
          particular guild to take part.
        </p>
        <div className="community-grid">
          {communities.map((community, index) => (
            <Link
              className={"community-card accent-" + community.color}
              href={"/servers/" + community.slug}
              key={community.slug}
            >
              <div className="community-image">
                <Image
                  src={community.image}
                  alt=""
                  fill
                  sizes="(max-width: 700px) calc(100vw - 40px), 33vw"
                />
                <span className="community-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </div>
              <div className="community-body">
                <div className="card-title-row">
                  <h3>{community.label}</h3>
                  <ArrowUpRight size={22} />
                </div>
                <p>{community.text}</p>
                <span className="community-destination">
                  {community.title}
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="recruitment-band" aria-labelledby="recruitment-title">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The next chapter starts with people</p>
              <h2 id="recruitment-title">A guild. A group. Your people.</h2>
            </div>
            <Link href="/discord" className="text-link">
              Meet the community
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="recruitment-columns">
            <div className="recruitment-column">
              <div className="recruitment-heading">
                <Users size={24} />
                <h3>Guild recruitment</h3>
                <Link
                  href="/guild-recruitment"
                  aria-label="Browse guild recruitment"
                >
                  <ArrowUpRight size={21} />
                </Link>
              </div>
              {guilds.length ? (
                <ul className="home-listings">
                  {guilds.map((guild) => (
                    <li key={guild.id}>
                      <Link href={"/guilds/" + guild.slug}>
                        <span>
                          <strong>{guild.name}</strong>
                          <small>
                            {guild.region} / {guild.faction} / {guild.ruleset}
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="home-listing-empty">
                  <p>Bring your guild to the community.</p>
                  <span>
                    Recruit for your schedule, your faction, and your way of
                    playing.
                  </span>
                </div>
              )}
              <Link href="/guild-recruitment/new" className="text-link">
                <Plus size={17} />
                List your guild
              </Link>
            </div>
            <div className="recruitment-column">
              <div className="recruitment-heading">
                <Swords size={24} />
                <h3>Looking for group</h3>
                <Link href="/lfg" aria-label="Browse groups">
                  <ArrowUpRight size={21} />
                </Link>
              </div>
              {groups.length ? (
                <ul className="home-listings">
                  {groups.map((group) => (
                    <li key={group.id}>
                      <Link href="/lfg">
                        <span>
                          <strong>{group.title}</strong>
                          <small>
                            {group.region} / {group.activity} /{" "}
                            <time dateTime={group.startsAt.toISOString()}>
                              {group.startsAt.toLocaleString("en-GB", {
                                timeZone: "UTC",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              UTC
                            </time>
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="home-listing-empty">
                  <p>Make room for one more.</p>
                  <span>
                    A dungeon after work, a PvP premade, or your next roleplay
                    gathering.
                  </span>
                </div>
              )}
              <Link href="/lfg/new" className="text-link">
                <Plus size={17} />
                Post a group
              </Link>
            </div>
          </div>
        </div>
      </section>

      {guides.length > 0 && (
        <section className="container section home-guides">
          <SectionHeading
            eyebrow="From the community"
            title="WoW Forever guides"
            href="/guides"
            linkLabel="All guides"
          />
          <GuideCollection guides={guides} />
        </section>
      )}
      <section className="safety-band">
        <div className="container safety-section">
          <ShieldCheck className="safety-emblem" size={48} strokeWidth={1.2} />
          <div>
            <p className="eyebrow">A community with standards</p>
            <h2>Good company. Fair play.</h2>
            <p>
              Private reports. Evidence before action. A fair chance to appeal.
            </p>
          </div>
          <div className="safety-actions">
            <Link href="/safety" className="text-link">
              Our approach
              <ArrowRight size={17} />
            </Link>
            <Link href="/rules">
              <ScrollText size={17} />
              Community rules
            </Link>
          </div>
        </div>
      </section>
      <section className="container section faq-section">
        <div>
          <p className="eyebrow">Before you join</p>
          <h2>
            A few good
            <br />
            questions.
          </h2>
          <Link className="text-link" href="/faq">
            All questions
            <ArrowRight size={17} />
          </Link>
        </div>
        <FAQ items={communityFaq.slice(0, 4)} />
      </section>
      <section className="join-scene">
        <Image src="/images/forever-mulgore.webp" alt="" fill sizes="100vw" />
        <div className="container join-scene-content">
          <p className="eyebrow">Your next adventure</p>
          <h2>
            WoW Forever.
            <br />
            Better together.
          </h2>
          <p>Come for the game. Stay for the people.</p>
          <JoinButton available={available} label="Join Discord" />
          <Link href="/guides/join-wow-forever-discord" className="join-guide">
            <BookOpen size={16} />
            Your first evening in the community
          </Link>
        </div>
      </section>
    </div>
  );
}
