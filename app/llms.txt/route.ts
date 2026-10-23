import { SITE_NAME, SITE_URL } from "@/lib/config";
import { db } from "@/lib/db";
import { simulationGuideSlugs, dpsTierSlug } from "@/content/simulation-guides";

export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const guides = await db.foreverGuide.findMany({
    where: {
      published: true,
      slug: { in: [...simulationGuideSlugs, dpsTierSlug] },
    },
    select: { slug: true, title: true },
    orderBy: { slug: "asc" },
  });
  const text = `# ${SITE_NAME}

> Independent community Discord for World of Warcraft: Forever. PvE, PvP, and roleplay; Alliance and Horde; EU and NA community spaces. Not affiliated with or endorsed by Blizzard Entertainment.

## Community
- [Join the Discord](${SITE_URL}/discord): Current invitation, coverage, questions, and community information.
- [Guild recruitment](${SITE_URL}/guild-recruitment): Reviewed recruitment listings; not endorsements of player conduct.
- [Find a group](${SITE_URL}/lfg): Moderated dungeon, raid, premade, questing, and RP event posts.
- [EU community](${SITE_URL}/discord/eu)
- [NA community](${SITE_URL}/discord/na)
- [Guides](${SITE_URL}/guides): Original community guidance with authors and update dates.
- [Research and data](${SITE_URL}/research): Build-scoped client changes, evidence-gated market and profession reports, aggregate recruiting demand, discovery/world coverage, methods, and public data links. Candidate relationships are not confirmed drops.

## Trust and tools
- [WoW Trader](${SITE_URL}/addons/wow-trader): Public Forever market tools; prices depend on player uploads. Optional collection software remains in controlled testing.
- [Community testing](${SITE_URL}/contribute): Suggested assignments and a report template; results are manually reviewed, not automatically published.
- [About](${SITE_URL}/about): Organizers, purpose, independence, and accountability.
- [Rules](${SITE_URL}/rules)
- [Safety standards](${SITE_URL}/safety): Private evidence, two reviewers for public alerts, expiry and appeals.
- [Reports](${SITE_URL}/reports): Private report process.
- [Appeals](${SITE_URL}/appeals): Public alerts are suspended during an appeal.
- [Transparency](${SITE_URL}/transparency): Aggregate outcomes and current reviewed alerts.
- [ForeverGuard](${SITE_URL}/addons/foreverguard): Optional addon; release and compatibility status are documented on the page.
- [Privacy](${SITE_URL}/privacy)

${guides.length ? `## Simulation-backed class guides and rankings\n${guides.map((guide) => `- [${guide.title.replace(/[\[\]\n\r]/g, "")}](${SITE_URL}/guides/${guide.slug})`).join("\n")}\n\nLevel-60 single-target beta-model references. Ranking DPS uses a common policy; original build-reference DPS uses its recorded scenario. Measurement dates, model hashes and limitations are visible. These are not level-30 dungeon observations, healing/tank rankings or guaranteed launch outcomes.\n` : ""}
Community plans are not official game announcements. Character rosters are not unique-person counts. Invitation clicks are not confirmed Discord joins. Current public pages are authoritative for this community's policies and available releases.
`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
