import { ArrowLeft, ArrowUpRight, BookOpen, Compass } from "lucide-react";
import { Markdown } from "../components/markdown";
import { starterResources } from "../content/starter-resources";
import { simulationGuides } from "../content/simulation-guides";
import { simulationClassProfiles } from "../content/simulation-class-profiles";

export const reviewGuides = [...starterResources, ...simulationGuides];

const art: Record<string, string> = {
  "wow-forever-hall-of-thanes-group-preparation": "hall-of-thanes.webp",
  "wow-forever-ruins-of-lordaeron-group-preparation": "ruins-of-lordaeron.webp",
  "wow-forever-excavation-site-group-preparation":
    "excavation-site-wetlands.webp",
};

export function reviewCover(slug: string): string {
  return (
    art[slug] ??
    reviewGuides
      .find((guide) => guide.slug === slug)
      ?.coverImage.replace(/^\/images\//, "") ??
    "forever-world.webp"
  );
}

export function GuideReviewPage({ slug }: { slug: string }): React.JSX.Element {
  const guide = reviewGuides.find((entry) => entry.slug === slug);
  const profile = simulationClassProfiles.find(
    (profile) => slug === `wow-forever-${profile.key}-dps-guide`,
  );
  if (!guide) throw new Error("Unknown review guide.");
  return (
    <div className="review-reader public-site">
      <nav className="review-topbar">
        <a href="index.html">
          <ArrowLeft size={16} /> Guide library
        </a>
        <span className="review-status">Private draft</span>
      </nav>
      <header className="review-reader-header">
        <span className="review-kicker">
          WoW Forever / {art[slug] ? "Dungeon preparation" : "Class playbook"}
        </span>
        <h1>{guide.title}</h1>
        <p>{guide.excerpt}</p>
        <div className="review-byline">
          Open source contributors{" "}
          <span>
            {simulationGuides.some((guide) => guide.slug === slug)
              ? "October 23, 2026"
              : "October 22, 2026"}
          </span>
        </div>
      </header>
      {slug !== "wow-forever-dps-tier-list" && (
        <div
          className="review-reader-cover"
          style={{ backgroundImage: `url("assets/${reviewCover(slug)}")` }}
          role="img"
          aria-label={
            art[slug]
              ? "Illustrative dungeon artwork; not an encounter screenshot"
              : "Azeroth forest artwork"
          }
        />
      )}
      <div
        className={
          slug === "wow-forever-dps-tier-list"
            ? "review-reader-layout tier-list-layout"
            : "review-reader-layout"
        }
      >
        <article>
          <Markdown
            contents
            editorial
            classGuideAssetBase="./assets/guide-icons"
            linkBaseUrl="https://www.wowforeverdiscord.online"
            simulationAssetBase="./assets"
            simulationDataBase="./data"
          >
            {guide.content}
          </Markdown>
        </article>
        <aside>
          <BookOpen size={22} />
          <h3>Take it into the game</h3>
          <a
            href={
              slug === "wow-forever-dps-tier-list"
                ? "https://kfcguild.online/tools/forever/simulator"
                : art[slug]
                  ? "https://kfcguild.online/tools/forever/encyclopedia/quests"
                  : `https://kfcguild.online/tools/forever/encyclopedia/talents/${profile?.key ?? (slug.includes("feral") ? "druid" : slug.includes("paladin") ? "paladin" : "mage")}`
            }
          >
            {slug === "wow-forever-dps-tier-list"
              ? "Simulator"
              : art[slug]
                ? "Quest reference"
                : "Talent calculator"}{" "}
            <ArrowUpRight size={15} />
          </a>
          <a href="https://kfcguild.online/tools/forever/encyclopedia">
            Spell & item reference <ArrowUpRight size={15} />
          </a>
          <a href="https://www.wowforeverdiscord.online/lfg">
            Find your next group <Compass size={15} />
          </a>
          <hr />
          <p>
            Reference facts and draft recommendations are distinct. Gameplay
            review is still pending.
          </p>
        </aside>
      </div>
      <footer className="review-footer">
        WoW Forever Community Guides · Independent community project · Private
        review edition
      </footer>
    </div>
  );
}
