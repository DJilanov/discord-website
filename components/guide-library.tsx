"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { EditorialGuide } from "@/content/guides";
import { simulationClassProfiles } from "@/content/simulation-class-profiles";

export type GuideLibraryEntry = Pick<
  EditorialGuide,
  "slug" | "title" | "excerpt" | "category" | "coverImage"
>;
type Filter = "all" | "class" | "dungeon" | "community";

const classEntries: Record<string, { name: string; title: string }> = {
  ...Object.fromEntries(
    simulationClassProfiles.map((profile) => [
      `wow-forever-${profile.key}-dps-guide`,
      { name: profile.key, title: profile.name },
    ]),
  ),
  "wow-forever-feral-tank-starter-kit": { name: "druid", title: "Feral Tank" },
  "wow-forever-protection-paladin-starter-kit": {
    name: "paladin",
    title: "Protection Paladin",
  },
  "wow-forever-mage-dungeon-starter-kit": { name: "mage", title: "Mage" },
};
const dungeonEntries: Record<
  string,
  { title: string; levels: string; cover: string }
> = {
  "wow-forever-hall-of-thanes-group-preparation": {
    title: "Hall of Thanes",
    levels: "13–18",
    cover: "hall-of-thanes.webp",
  },
  "wow-forever-ruins-of-lordaeron-group-preparation": {
    title: "Ruins of Lordaeron",
    levels: "15–20",
    cover: "ruins-of-lordaeron.webp",
  },
  "wow-forever-excavation-site-group-preparation": {
    title: "Excavation Site",
    levels: "24–29",
    cover: "excavation-site-wetlands.webp",
  },
};

function kindOf(guide: GuideLibraryEntry): Exclude<Filter, "all"> {
  return Object.hasOwn(classEntries, guide.slug)
    ? "class"
    : Object.hasOwn(dungeonEntries, guide.slug)
      ? "dungeon"
      : "community";
}

export function GuideLibrary({
  guides,
  privateReview = false,
  assetBase = "/images",
}: {
  guides: GuideLibraryEntry[];
  privateReview?: boolean;
  assetBase?: string;
}): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const firstSection = guides.some((guide) => kindOf(guide) === "class")
    ? "class-playbooks"
    : guides.some((guide) => kindOf(guide) === "dungeon")
      ? "dungeon-preparation"
      : "community-guides";
  const sections: Array<{
    kind: Exclude<Filter, "all">;
    title: string;
    detail: string;
  }> = [
    {
      kind: "class",
      title: "Class playbooks",
      detail: "Talents · priorities · recovery",
    },
    {
      kind: "dungeon",
      title: "Into the dungeons",
      detail: "Access · quests · party planning",
    },
    {
      kind: "community",
      title: "Make more of Azeroth",
      detail: "Groups · guilds · community tools",
    },
  ];
  return (
    <div className="guide-library">
      {privateReview && (
        <header className="review-library-top">
          <a href="index.html">
            <Image
              src={`${assetBase}/wow-forever-logo.png`}
              width={124}
              height={64}
              unoptimized
              alt="World of Warcraft Forever"
            />
          </a>
          <span className="review-status">
            Community guides / Private review
          </span>
          <a href="https://www.wowforeverdiscord.online/discord">
            Community <ArrowUpRight size={15} />
          </a>
        </header>
      )}
      <section
        className="review-library-hero"
        style={{ backgroundImage: `url("${assetBase}/forever-hero.webp")` }}
      >
        <div>
          <span className="review-kicker">Azeroth, understood</span>
          <h1>WoW Forever Guides</h1>
          <p>
            Know your class. Prepare your party.
            <br />
            Make the next adventure a good one.
          </p>
          <a href={`#${firstSection}`} className="review-primary">
            Explore the playbooks <ArrowRight size={17} />
          </a>
        </div>
      </section>
      <div className="review-library-content">
        {guides.some((guide) => guide.slug === "wow-forever-dps-tier-list") && (
          <a
            className="review-tier-feature"
            href={
              privateReview
                ? "wow-forever-dps-tier-list.html"
                : "/guides/wow-forever-dps-tier-list"
            }
          >
            <span>
              <small>25 tested builds · all nine classes</small>
              <strong>WoW Forever DPS Tier List</strong>
            </span>
            <span>
              Level 60 pre-raid <ArrowRight size={19} />
            </span>
          </a>
        )}
        <div className="review-library-heading">
          <div>
            <span className="review-kicker">The field library</span>
            <h2>Choose your next adventure</h2>
          </div>
          <div
            className="review-filters"
            role="group"
            aria-label="Guide category"
          >
            {(
              [
                { kind: "all", label: "All guides" },
                { kind: "class", label: "Classes" },
                { kind: "dungeon", label: "Dungeons" },
                { kind: "community", label: "Community" },
              ] as const
            )
              .filter(
                (entry) =>
                  entry.kind === "all" ||
                  guides.some((guide) => kindOf(guide) === entry.kind),
              )
              .map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  aria-pressed={filter === entry.kind}
                  onClick={(): void => setFilter(entry.kind)}
                >
                  {entry.label}
                </button>
              ))}
          </div>
        </div>
        {sections.map((section) => {
          const entries = guides.filter(
            (guide) => kindOf(guide) === section.kind,
          );
          if (!entries.length) return null;
          return (
            <section
              key={section.kind}
              data-guide-kind={section.kind}
              id={
                section.kind === "class"
                  ? "class-playbooks"
                  : section.kind === "dungeon"
                    ? "dungeon-preparation"
                    : "community-guides"
              }
              hidden={filter !== "all" && filter !== section.kind}
              className="review-library-section"
            >
              <div className="review-section-label">
                <h3>{section.title}</h3>
                <span>{section.detail}</span>
              </div>
              <div className="review-guide-grid">
                {entries.map((guide) => {
                  const character = Object.hasOwn(classEntries, guide.slug)
                    ? classEntries[guide.slug]
                    : undefined;
                  const dungeon = Object.hasOwn(dungeonEntries, guide.slug)
                    ? dungeonEntries[guide.slug]
                    : undefined;
                  const cover = dungeon
                    ? `/raids/events/${dungeon.cover}`
                    : guide.coverImage.replace(/^\/images/, "");
                  return (
                    <a
                      href={
                        privateReview
                          ? `${guide.slug}.html`
                          : `/guides/${guide.slug}`
                      }
                      key={guide.slug}
                      className={`review-guide-card${character ? ` review-card-${character.name}` : ""}`}
                    >
                      <div
                        className="review-card-art"
                        style={{
                          backgroundImage: `url("${assetBase}${cover}")`,
                        }}
                      >
                        {character && (
                          <Image
                            src={`${assetBase}/${guide.slug.endsWith("-dps-guide") ? "simulation-icons" : "guide-icons"}/class_${character.name}.jpg`}
                            alt=""
                            width={64}
                            height={64}
                            unoptimized
                          />
                        )}
                        <span>
                          {character?.name ??
                            (dungeon
                              ? `Levels ${dungeon.levels}`
                              : guide.category)}
                        </span>
                      </div>
                      <div className="review-card-copy">
                        <span className="review-card-eyebrow">
                          {character
                            ? "Class playbook"
                            : dungeon
                              ? "Dungeon preparation"
                              : guide.category}
                        </span>
                        <h3>
                          {character?.title ?? dungeon?.title ?? guide.title}
                          <ArrowUpRight size={21} />
                        </h3>
                        <p>{guide.excerpt}</p>
                        <div className="review-card-bottom">
                          <span>
                            {character
                              ? "Talents & combat"
                              : dungeon
                                ? "First visit"
                                : "Community resource"}
                          </span>
                          {privateReview && <span>Draft / review pending</span>}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!guides.length && <p>No published guides are available right now.</p>}
        <section className="review-library-tools">
          <div>
            <span className="review-kicker">Keep planning</span>
            <h2>Your next step</h2>
          </div>
          <nav>
            <a href="https://kfcguild.online/tools/forever/encyclopedia/talents/druid">
              Talent calculators <ArrowUpRight size={18} />
            </a>
            <a href="https://kfcguild.online/tools/forever/encyclopedia/quests">
              Quest reference <ArrowUpRight size={18} />
            </a>
            <a href="https://www.wowforeverdiscord.online/lfg">
              Find a party <ArrowUpRight size={18} />
            </a>
          </nav>
        </section>
      </div>
      {privateReview && (
        <footer className="review-footer">
          Open source contributors · Independent WoW Forever community · Not
          published or submitted for indexing
        </footer>
      )}
    </div>
  );
}
