import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Globe2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { resolveDiscordInvite } from "@/lib/discord";
import { Breadcrumbs, FAQ, JoinButton, SectionHeading } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { CommunityActivity } from "@/components/community-activity";
import { Markdown } from "@/components/markdown";
import { communityFaq, communities } from "@/content/community";
import { SITE_URL } from "@/lib/config";
import { channelReviewDate, classDiscussions } from "@/content/community-paths";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "WoW Forever Discord | Join the Community",
  "Join the independent WoW Forever Discord: EU and NA, Alliance and Horde. Find guilds, PvE and PvP groups, class discussions and practical tools. Free to join.",
  "/discord",
);

export default async function DiscordPage(): Promise<React.JSX.Element> {
  const settings = await getSettings();
  const selected = await resolveDiscordInvite(
    settings.discordInvite,
    settings.backupInvite,
  );
  const preview = selected?.preview;
  const available = Boolean(selected);
  return (
    <div className="container discord-page">
      <Breadcrumbs items={[{ label: "Discord", href: "/discord" }]} />
      <section
        className="discord-intro"
        id="invite"
        aria-labelledby="discord-title"
      >
        <p className="eyebrow">Independent community / Alliance &amp; Horde</p>
        <h1 id="discord-title">WoW Forever Discord</h1>
        <p className="discord-lead">
          Meet your people.
          <br />
          Share the adventure.
        </p>
        <p className="discord-intro-copy">
          An unofficial community for PvE, PvP, and roleplay. Find a guild,
          arrange a group, and enjoy the game together.
        </p>
        <div className="button-row">
          {available ? (
            <JoinButton available label="Join Discord" />
          ) : (
            <p className="notice" role="status">
              The invitation is temporarily unavailable. Please check this page
              again for the current link.
            </p>
          )}
          <a href="#community" className="text-link">
            Explore the community <ArrowRight size={16} />
          </a>
        </div>
        <div className="discord-facts">
          <span>Free to join</span>
          <span>No guild membership required</span>
          <span>No addon required</span>
          {preview?.members != null && (
            <span>
              <Users size={14} />
              {preview.members.toLocaleString()} members
            </span>
          )}
          {preview?.online != null && (
            <span>
              <i className="online-dot" />
              {preview.online.toLocaleString()} online
            </span>
          )}
        </div>
        {preview?.valid === null && (
          <p className="fine-print">
            Discord&apos;s preview is temporarily unavailable. You can still try
            the configured invitation.
          </p>
        )}
        {preview?.members != null && (
          <p className="fine-print">
            Approximate counts from Discord. Online members are not moderator
            availability.
          </p>
        )}
      </section>
      <section
        id="community"
        className="discord-community section"
        aria-labelledby="community-title"
      >
        <div className="discord-scene">
          <Image
            src="/images/forever-stories.webp"
            alt="Adventurers meeting in Blizzard's WoW Forever preview artwork"
            width={1400}
            height={788}
            sizes="(max-width: 800px) 100vw, 600px"
          />
        </div>
        <div>
          <p className="eyebrow">A community beyond one guild</p>
          <h2 id="community-title">
            Good company.
            <br />
            Your kind of evening.
          </h2>
          <p>
            Stay with your guild, meet another, or come without one. There is
            room for a regular roster, a group after work, and a conversation
            between adventures.
          </p>
          <p>
            Alliance and Horde are welcome. EU and NA spaces help players find
            compatible hours, with organizers assigned to both regions.
          </p>
          <div className="region-links">
            <Link href="/discord/eu">
              <Globe2 size={20} />
              <span>
                European community<small>EU groups and guilds</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/discord/na">
              <Globe2 size={20} />
              <span>
                North American community<small>NA groups and guilds</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="section discord-inside"
        aria-labelledby="inside-title"
      >
        <div>
          <p className="eyebrow">Inside the actual server</p>
          <h2 id="inside-title">
            A place to start.
            <br />A space for your next group.
          </h2>
          <p>
            Begin with <strong>rules</strong> in Start Here, choose your roles
            in Discord&apos;s welcome flow, then say hello in <strong>introductions</strong>.
          </p>
          <dl className="channel-map">
            <div>
              <dt>Guilds &amp; groups</dt>
              <dd>
                Alliance and Horde each have <code>lfg-pve</code>,{" "}
                <code>lfg-pvp</code>, <code>lf-guild</code>,{" "}
                <code>guild-recruitment</code>, and <code>scheduled-runs</code> forums.
                Start with the faction&apos;s <code>post-rules</code>.
              </dd>
            </div>
            <div>
              <dt>Classes &amp; addons</dt>
              <dd>
                Nine class discussions, plus <code>addon-discussion</code>,{" "}
                <code>tool-directory</code> and <code>tool-support</code> under Addons &amp; Tools.
              </dd>
            </div>
            <div>
              <dt>Updates &amp; useful links</dt>
              <dd>
                <code>announcements</code>, <code>useful-links</code>, and{" "}
                <code>faq</code> keep the basics together.
              </dd>
            </div>
          </dl>
          <Link href="/guides/join-wow-forever-discord" className="text-link">
            Find your first conversation <ArrowRight size={16} />
          </Link>
        </div>
        <div className="discord-current-channels">
          <h3>Your first stops</h3>
          <dl className="channel-map">
            <div><dt>Start Here</dt><dd>rules · introductions · useful-links · faq</dd></div>
            <div><dt>Community</dt><dd>general · new-player-help · group-leveling</dd></div>
            <div><dt>Trading</dt><dd>alliance-trade · horde-trade · auction-house</dd></div>
            <div><dt>Social &amp; Media</dt><dd>streamers · live-now · Community Streams</dd></div>
          </dl>
          <p className="fine-print">Channel names and forum types checked through the server bot on {channelReviewDate}. Decorative prefixes omitted. This is a channel reference, not a screenshot or a claim of live host coverage.</p>
        </div>
      </section>
      <section className="section" id="classes" aria-labelledby="classes-title">
        <SectionHeading eyebrow="CLASSES & TOOLS" title="Bring your class. Compare your ideas." />
        <h3 id="classes-title">Nine class discussions, one community</h3>
        <p className="section-lead">Ask in your class channel, compare a build in the linked calculator, and share the client build and activity you tested. Read the tool&apos;s evidence labels before treating beta talents as settled advice.</p>
        <div className="discord-class-links">
          {classDiscussions.map(({ name, channel, calculator }) => (
            <a key={channel} href={calculator} target="_blank" rel="noopener noreferrer">
              <span><strong>{name}</strong><small>#{channel} · talent calculator</small></span><ArrowUpRight size={18} />
            </a>
          ))}
        </div>
        <Link href="/guides/join-wow-forever-discord" className="text-link">Class questions and your first evening <ArrowRight size={16} /></Link>
      </section>
      {settings.discordOnboarding && (
        <section className="section narrow">
          <SectionHeading title="Inside the Discord" />
          <Markdown editorial>{settings.discordOnboarding}</Markdown>
        </section>
      )}
      <section className="section discord-playstyles">
        <SectionHeading
          eyebrow="FIND YOUR PEOPLE"
          title="PvE, PvP, and roleplay."
        />
        <div className="community-paths">
          {communities.map((community) => (
            <Link key={community.slug} href={`/servers/${community.slug}`}>
              <h3>{community.label}</h3>
              <p>{community.text}</p>
              <span className="text-link">
                {community.title}
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <CommunityActivity />
      <section className="section discord-start">
        <SectionHeading
          eyebrow="YOUR FIRST EVENING"
          title="From an invitation to a group."
          href="/guides/join-wow-forever-discord"
          linkLabel="The onboarding guide"
        />
        <ol className="onboarding-steps">
          <li>
            <span className="step-number">01</span>
            <h3>Make yourself at home</h3>
            <p>
              Accept the current invitation, read the welcome, and choose the
              available roles for your region and interests.
            </p>
          </li>
          <li>
            <span className="step-number">02</span>
            <h3>Find a good fit</h3>
            <p>
              Compare guild schedules or look for one evening&apos;s group.
              Share your role, hours, and what you enjoy.
            </p>
          </li>
          <li>
            <span className="step-number">03</span>
            <h3>Make a plan</h3>
            <p>
              Contact the organizer, confirm the time and expectations, and meet
              the people behind the post.
            </p>
          </li>
        </ol>
        <div className="discord-reading">
          <Link href="/guides/find-your-wow-forever-guild">
            <BookOpen size={20} />
            <span>Find a guild that fits your schedule</span>
            <ArrowUpRight size={16} />
          </Link>
          <Link href="/guides/find-or-organize-wow-forever-group">
            <BookOpen size={20} />
            <span>Find or organize your next group</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="section discord-standards">
        <ShieldCheck size={32} />
        <div>
          <p className="eyebrow">People come first</p>
          <h2>A warm welcome. Clear standards.</h2>
          <p>
            Private website reports, evidence before action, and a fair appeal
            process. The same expectations apply across factions and guilds.
          </p>
          <p>
            Members can report scams or griefing in Discord&apos;s{" "}
            <code>report-here</code> forum and discuss appeals in{" "}
            <code>appeal-here</code>. Other members can read those posts. Use
            the website forms for sensitive evidence; a public post is not a
            verified finding or an automatic website case.
          </p>
          {settings.discordOrganizers && (
            <Markdown>{settings.discordOrganizers}</Markdown>
          )}
          <div className="button-row">
            <Link className="text-link" href="/about">
              Meet the organizers <ArrowRight size={16} />
            </Link>
            <Link className="text-link" href="/rules">
              Community rules <ArrowRight size={16} />
            </Link>
            <Link className="text-link" href="/reports">
              Private help &amp; reports <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section narrow">
        <SectionHeading title="Before you join" />
        <FAQ
          items={[
            ...communityFaq,
            {
              question: "How do I find the right group after joining?",
              answer:
                "Follow the server's welcome and available roles, then introduce yourself with your region, interests and usual hours. The website has guild listings for a long-term home and group posts for individual sessions. Contact the organizer to confirm a place.",
            },
          ]}
        />
      </section>
      <section className="section discord-close">
        <div>
          <p className="eyebrow">Your next adventure</p>
          <h2>Find people worth logging in for.</h2>
          <p>WoW Forever. Your guild, your group, your community.</p>
          {available && <JoinButton available label="Join Discord" />}
        </div>
        <div className="share-line">
          <span>
            Share the permanent community page
            <br />
            <strong>www.wowforeverdiscord.online/discord</strong>
          </span>
          <CopyButton text={`${SITE_URL}/discord`} />
        </div>
      </section>
    </div>
  );
}
