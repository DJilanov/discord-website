import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { traderLinks, traderScreenshot } from "@/content/community-tools";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Trader for WoW Forever: Markets, Crafting & Testing",
  "Use WoW Trader's Forever web tools, understand upload-dependent market prices, and learn which optional collection tools are still in controlled testing.",
  "/addons/wow-trader",
);

export default function TraderPage(): React.JSX.Element {
  return (
    <div className="container tools-page">
      <Breadcrumbs
        items={[
          { label: "Addons & tools", href: "/addons" },
          { label: "WoW Trader", href: "/addons/wow-trader" },
        ]}
      />
      <PageHeader
        eyebrow="COMMUNITY-MAINTAINED · FOREVER"
        title="WoW Trader"
        description="Compare crafting inputs and auction listings with the market, build and age of the data in view."
      >
        <a href={traderLinks.workspace} className="button primary">
          Open the Forever workspace <ArrowUpRight size={16} />
        </a>
        <a href="#collector" className="button secondary">
          Collector test status <ArrowRight size={16} />
        </a>
      </PageHeader>
      <figure className="tool-preview">
        <a
          href={traderScreenshot.src}
          aria-label="View the full WoW Trader screenshot"
        >
          <Image
            src={traderScreenshot.src}
            alt={traderScreenshot.alt}
            width={1440}
            height={960}
            priority
            sizes="(max-width: 700px) 100vw, 1200px"
          />
        </a>
        <figcaption>{traderScreenshot.caption}</figcaption>
      </figure>
      <div className="article-layout">
        <article className="prose">
          <h2 id="start">Start with the website</h2>
          <p>
            The public Forever workspace is available now. You can browse
            without an addon, desktop app or community membership. Its
            maintainers have tested WoW Trader on Forever; that does not
            establish compatibility for every feature, client build or operating
            system.
          </p>
          <p>
            WoW Trader is developed by our team and hosted on KFC Guild Helper.
            It is a separate service with its own data and release status, not
            an official Blizzard product. KFC membership is not required.
          </p>
          <ol>
            <li>Open the Forever workspace, not the separate TBC tools.</li>
            <li>
              Select the market you want to inspect. A market identifier is a
              data scope, not a character realm or grouping instruction.
            </li>
            <li>
              Check the catalog build, scan age and history status before
              looking at the ranking.
            </li>
            <li>
              Search for a crafted item or select a profession. Open a result
              and inspect its inputs, quantities and proposed exit.
            </li>
            <li>
              Verify the actual auction house before buying materials. Treat
              missing, old or thin data as a reason to pause.
            </li>
          </ol>
          <h2 id="freshness">Prices depend on community uploads</h2>
          <p>
            <strong>
              Market data updates when someone uploads a scan from the app.
            </strong>{" "}
            It is not a continuous Blizzard auction feed. There can be gaps when
            nobody contributes, and one market being current does not make every
            market current.
          </p>
          <p>
            Check the last scan for your selected market on every visit. A
            recent upload improves freshness, but does not by itself create a
            price trend or prove that an item sells. An older scan can still
            offer historical context; do not treat it as an executable quote.
          </p>
          <h2 id="prices">An estimate is not a sale</h2>
          <p>
            Auction listings show what sellers ask, not what buyers paid. An
            attractive difference between reagent cost and output price does not
            establish demand, sale speed or the price available for a larger
            batch. A missing price is not a zero-cost material.
          </p>
          <p>
            The screenshot is a dated view of the product. Quotes and history
            coverage can change after each upload. The{" "}
            <Link href="/guides/wow-trader-read-market-prices">
              price-reading guide
            </Link>{" "}
            walks through a clearly labelled arithmetic example and a
            stop-before-buying checklist.
          </p>
          <h2 id="reference">References alongside the market</h2>
          <p>
            The <a href={traderLinks.encyclopedia}>Forever Encyclopedia</a>{" "}
            provides class, talent and spell reference tools. Pay attention to
            the published build and any preview labels. Data availability alone
            does not prove that a talent interaction, rotation or raid strategy
            works in the current game.
          </p>
          <h2 id="collector">
            Collector & desktop companion: controlled testing
          </h2>
          <p>
            <strong>
              The optional desktop packages are unsigned maintainer alpha, not a
              general install recommendation.
            </strong>{" "}
            The public website works without them. Do not disable platform
            protections simply to try a community tool.
          </p>
          <p>
            The in-game collector records a player-initiated auction scan. A
            separate desktop companion can send saved scan data to the service.
            The addon does not make HTTP requests or automate buying and
            selling. Approved testers should follow the current maintainer
            instructions for their exact build and platform.
          </p>
          <p>
            Before a collection test, agree on the package, one test window, a
            private diagnostic route and the permitted upload volume. Raw saved
            data can contain character identity; tokens and diagnostic files
            must not be posted in public channels. Unattended uploading is not
            part of the open tester tasks.
          </p>
          <p>
            Public distribution still needs per-install pairing and revocation,
            platform release checks and an approved data-retention budget. The{" "}
            <a href={traderLinks.collector}>maintainer release page</a> is the
            source for package versions; this page does not mirror binaries or
            promise a signed installer.
          </p>
          <h2 id="feedback">Help improve one thing</h2>
          <p>
            Already invited to test? Pick a{" "}
            <Link href="/contribute">tester assignment</Link>. Web checks need a
            browser, not a beta account or collector installation. A useful
            report includes the page, task, date, browser, expected result and
            what happened instead.
          </p>
          <p>
            For addon compatibility, record the exact client build and the
            feature actually exercised. A successful load is not a complete
            compatibility result. Guild raid addons remain untested in Forever
            until the necessary content and review are available.
          </p>
          <p className="fine-print">
            Public website inspected September 30, 2026. Compatibility scope is
            maintainer-reported; this introduction is not an independent
            end-to-end game test.
          </p>
        </article>
        <aside className="article-aside">
          <h3>WoW Trader resources</h3>
          <nav>
            <a href={traderLinks.workspace}>
              Market workspace <ArrowUpRight size={14} />
            </a>
            <a href={traderLinks.encyclopedia}>
              Forever references <ArrowUpRight size={14} />
            </a>
            <Link href="/guides/wow-trader-read-market-prices">
              Read a market quote <ArrowRight size={14} />
            </Link>
            <Link href="/contribute">
              Tester assignments <ArrowRight size={14} />
            </Link>
            <Link href="/discord">
              Ask in the community <ArrowRight size={14} />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}
