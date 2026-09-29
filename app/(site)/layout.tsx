import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";
import { getSettings } from "@/lib/settings";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { JsonLd } from "@/components/ui";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./site.css";
import "./community.css";

export const dynamic = "force-dynamic";
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const settings = await getSettings();
  return (
    <div className="public-site">
      <SiteNav
        inviteAvailable={Boolean(
          settings.discordInvite || settings.backupInvite,
        )}
      />
      <main id="main-content">{children}</main>
      <Footer />
      <AnalyticsTracker />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: SITE_NAME,
              url: SITE_URL,
              description:
                "Independent WoW Forever community for PvE, PvP and roleplay, Alliance and Horde.",
              ...(settings.discordInvite
                ? { sameAs: [settings.discordInvite] }
                : {}),
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
          ],
        }}
      />
    </div>
  );
}
