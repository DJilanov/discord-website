import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  Swords,
} from "lucide-react";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { traderLinks, traderScreenshot } from "@/content/community-tools";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Addons & Tools: WoW Trader and Community Testing",
  "Plan your Forever leveling route, compare talents and gear, browse quests or inspect Auction House prices. Public browser tools and controlled-test addons clearly separated.",
  "/addons",
);

export default function AddonsPage(): React.JSX.Element {
  return (
    <div className="container tools-page">
      <Breadcrumbs items={[{ label: "Addons & tools", href: "/addons" }]} />
      <PageHeader
        eyebrow="BUILT BY PLAYERS. OPEN TO EVERY GUILD."
        title="WoW Forever addons & tools"
        description="Plan your character, choose your next quest, compare gear or explore the market. Browse the tools without an account or guild membership."
      />
      <nav className="resource-nav" aria-label="Tools on this page">
        <a href="#leveling">Leveling</a>
        <a href="#simulator">Simulator</a>
        <a href="#reference">Database</a>
        <a href="#wow-trader">WoW Trader</a>
        <a href="#other-tools">Addons & compatibility</a>
        <Link href="/contribute">
          Tester assignments <ArrowUpRight size={14} />
        </Link>
      </nav>
      <section
        className="tool-feature"
        id="wow-trader"
        aria-labelledby="trader-title"
      >
        <div className="tool-feature-heading">
          <div>
            <span className="tool-status available">Public web tool</span>
            <h2 id="trader-title">WoW Trader</h2>
            <p>
              Crafting costs, auction listings and build-aware references for
              Forever. No addon or account needed to browse.
            </p>
          </div>
          <div className="button-row">
            <a className="button primary" href={traderLinks.workspace}>
              Open WoW Trader <ArrowUpRight size={16} />
            </a>
            <Link className="button secondary" href="/addons/wow-trader">
              Read the introduction <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <figure className="tool-preview">
          <Link
            href="/addons/wow-trader"
            aria-label="Explore WoW Trader and its data limits"
          >
            <Image
              src={traderScreenshot.src}
              alt={traderScreenshot.alt}
              width={1440}
              height={960}
              priority
              sizes="(max-width: 700px) 100vw, 1200px"
            />
          </Link>
          <figcaption>{traderScreenshot.caption}</figcaption>
        </figure>
        <div className="tool-facts">
          <div>
            <h3>Check the last upload</h3>
            <p>
              Prices update when a player uploads a scan. Gaps happen; check
              your selected market&apos;s timestamp before using its prices.
            </p>
          </div>
          <div>
            <h3>Read the uncertainty</h3>
            <p>
              A listed price is an asking price. Thin history and stale scans
              are not evidence of a reliable sale.
            </p>
          </div>
          <div>
            <h3>Maintained by our team</h3>
            <p>
              Hosted on KFC Guild Helper. The Forever community is open to
              players from every guild.
            </p>
          </div>
        </div>
      </section>
      <section
        className="section"
        id="other-tools"
        aria-labelledby="other-tools-title"
      >
        <div className="section-heading">
          <h2 id="other-tools-title">Know what is ready</h2>
        </div>
        <div className="tool-list">
          <article id="leveling">
            <BookOpen size={24} />
            <div>
              <span className="tool-status available">Free browser tool</span>
              <h3>Forever leveling routes</h3>
              <p>
                Choose Alliance or Horde, your race and a solo, relaxed or group
                route through level 60. Follow quest chapters, inspect optional
                dungeon branches and keep progress in your browser. Route
                coverage is not a completed in-game playthrough; check each
                route&apos;s evidence and limitations. Addon exports have a
                separate review and release process.
              </p>
            </div>
            <a className="text-link" href={traderLinks.leveling}>
              Choose your route <ArrowUpRight size={16} />
            </a>
          </article>
          <article id="simulator">
            <Swords size={24} />
            <div>
              <span className="tool-status available">
                Public beta simulator
              </span>
              <h3>Talents, gear & combat simulator</h3>
              <p>
                Compare supported class profiles, talent builds, equipment and
                rotations. Share a build or explore a raid composition. Model
                coverage varies: tank assumptions remain provisional and
                healing-only engines are not available.
              </p>
            </div>
            <a className="text-link" href={traderLinks.simulator}>
              Compare your build <ArrowUpRight size={16} />
            </a>
          </article>
          <article id="reference">
            <BookOpen size={24} />
            <div>
              <span className="tool-status available">Public reference</span>
              <h3>Forever Encyclopedia</h3>
              <p>
                Look up quests, items, recipes, maps, instances, talents and
                spellbooks. Check the build and source labels: an external
                reference is not an exact-build observation, and a database
                entry does not establish current availability.
              </p>
            </div>
            <a className="text-link" href={traderLinks.encyclopedia}>
              Browse references <ArrowUpRight size={16} />
            </a>
          </article>
          <article>
            <FlaskConical size={24} />
            <div>
              <span className="tool-status caution">Controlled testing</span>
              <h3>Trader Collector & companion</h3>
              <p>
                Optional collection tools, separate from the public website.
                Desktop packages are unsigned maintainer alpha; installation and
                uploads require coordination.
              </p>
            </div>
            <Link className="text-link" href="/addons/wow-trader#collector">
              Read test boundaries <ArrowRight size={16} />
            </Link>
          </article>
          <article>
            <ShieldCheck size={24} />
            <div>
              <span className="tool-status pending">
                Forever validation pending
              </span>
              <h3>ForeverGuard & guild raid addons</h3>
              <p>
                ForeverGuard has its own release details and safety limitations.
                Our other guild raid addons are not yet tested in Forever;
                raid-content validation is still ahead.
              </p>
            </div>
            <Link className="text-link" href="/addons/foreverguard">
              ForeverGuard status <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>
      <section className="resource-callout">
        <div>
          <p className="eyebrow">ALREADY IN THE TESTER GROUP?</p>
          <h2>One task. A useful result.</h2>
          <p>
            Choose a short web or guide check, or confirm your controlled-test
            assignment with the maintainers.
          </p>
        </div>
        <Link className="button primary" href="/contribute">
          Pick an assignment <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
