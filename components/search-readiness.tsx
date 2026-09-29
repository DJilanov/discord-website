import Link from "next/link";
import { ExternalLink, Settings } from "lucide-react";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import { CopyButton } from "@/components/copy-button";

export async function SearchReadiness(): Promise<React.JSX.Element> {
  const settings = await getSettings();
  const guides = await db.foreverGuide.count({ where: { published: true } });
  return (
    <>
      <h1>Search visibility</h1>
      <div className="button-row">
        <a
          className="button secondary"
          href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(`${SITE_URL}/`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          Search Console
        </a>
        <a
          className="button secondary"
          href="https://www.bing.com/webmasters"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          Bing Webmaster Tools
        </a>
        <Link className="button secondary" href="/admin/settings">
          <Settings size={16} />
          Verification values
        </Link>
      </div>
      <section className="section">
        <h2>Ownership and indexing</h2>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Search property configuration"
        >
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Configuration</th>
                <th>Confirmation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google Domain property</td>
                <td>
                  <p>
                    Use the Domain property{" "}
                    <strong>
                      {new URL(SITE_URL).hostname.replace(/^www\./, "")}
                    </strong>{" "}
                    and the DNS TXT record supplied by Google.
                  </p>
                </td>
                <td>Confirm in Search Console</td>
              </tr>
              <tr>
                <td>Google URL-prefix property</td>
                <td>
                  {settings.googleVerification
                    ? "HTML verification value configured"
                    : "No HTML verification value configured"}
                </td>
                <td>Not checked by this website</td>
              </tr>
              <tr>
                <td>Bing</td>
                <td>
                  {settings.bingVerification
                    ? "HTML verification value configured"
                    : "No HTML verification value configured"}
                </td>
                <td>Confirm in Bing Webmaster Tools</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="fine-print">
          Configured metadata is not proof of account verification, indexing,
          ranking, or AI recommendations. DNS verification uses your current
          provider; Cloudflare is not required.
        </p>
      </section>
      <section className="section">
        <h2>Public discovery</h2>
        <div className="share-line">
          <code>{SITE_URL}/sitemap.xml</code>
          <CopyButton text={`${SITE_URL}/sitemap.xml`} label="Copy sitemap" />
        </div>
        <p>
          {guides} published guides. Submit the sitemap in both search accounts
          and inspect these pages:
        </p>
        <ul>
          {[
            "/",
            "/discord",
            "/discord/eu",
            "/discord/na",
            "/guides/join-wow-forever-discord",
          ].map((path) => (
            <li key={path}>
              <a
                className="text-link"
                href={`${SITE_URL}${path}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {path}
                <ExternalLink size={14} />
              </a>
            </li>
          ))}
        </ul>
        <p>
          Record the indexing status, Google-selected canonical, last crawl and
          any reported exclusion. Verify the property for this website, not an
          unrelated domain you also own.
        </p>
      </section>
      <section className="section">
        <h2>Weekly review</h2>
        <ul>
          <li>
            Search queries, impressions and clicks by country, device and entry
            page.
          </li>
          <li>
            Search and AI visibility using the reports available in each
            account. Keep platform metrics separate from website referrals.
          </li>
          <li>
            Website sessions that clicked Discord, then actual community
            participation separately.
          </li>
          <li>
            Invite health, upcoming sessions, current guild listings and
            recurring newcomer questions.
          </li>
        </ul>
        <Link className="text-link" href="/admin/analytics">
          Open traffic and conversion reporting
        </Link>
      </section>
      <section className="section">
        <h2>Community listing requests</h2>
        <p>
          Submit accurate details after checking each publisher&apos;s current
          rules. A request is not an accepted listing.
        </p>
        <ul>
          <li>
            <a
              className="text-link"
              href="https://www.reddit.com/r/classicwow/comments/1wimrmv/wow_forever_discord_servers/"
              target="_blank"
              rel="noopener noreferrer"
            >
              r/classicwow Discord list
              <ExternalLink size={14} />
            </a>
          </li>
          <li>
            <a
              className="text-link"
              href="https://www.wowhead.com/discord-servers"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wowhead Discord directory
              <ExternalLink size={14} />
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
