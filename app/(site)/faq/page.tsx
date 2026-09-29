import { Breadcrumbs, FAQ, PageHeader } from "@/components/ui";
import { communityFaq } from "@/content/community";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Community FAQ",
  "Answers about the unofficial WoW Forever Discord, guild recruitment, regions, factions, reports, appeals and ForeverGuard.",
  "/faq",
);
export default function FAQPage(): React.JSX.Element {
  return (
    <div className="container narrow">
      <Breadcrumbs items={[{ label: "FAQ", href: "/faq" }]} />
      <PageHeader
        eyebrow="A FEW THINGS WORTH KNOWING"
        title="Community questions"
        description="Straight answers before your next adventure."
      />
      <section className="section">
        <FAQ
          items={[
            ...communityFaq,
            {
              question:
                "Does a published guild listing mean the guild is vetted?",
              answer:
                "No. Listings are reviewed for completeness and posting standards. They are not guarantees of conduct, performance, or attendance. Speak to the recruiter and read the guild's rules before committing.",
            },
            {
              question: "Is ForeverGuard required to join?",
              answer:
                "No. The addon is optional. It is intended for local notes and carefully reviewed community alerts. Website and Discord participation do not require installing it.",
            },
            {
              question: "Can the addon update while I am playing?",
              answer:
                "The alpha uses a local data file supplied with a download or manual update. It does not fetch live web data from inside the game. Expired alerts are ignored, and recent appeals or corrections require a refreshed data file.",
            },
            {
              question: "How do I correct a guild listing or guide?",
              answer:
                "Use the private report form, choose Other, and include the page URL and the correction. Staff review the request before changing public content.",
            },
          ]}
        />
      </section>
    </div>
  );
}
