export const researchTopics = [
  {
    slug: "build-changes",
    eyebrow: "CLIENT CATALOG",
    title: "What changed between WoW Forever builds?",
    description:
      "A normalized comparison of item and recipe facts across published client builds, excluding raw extraction noise.",
  },
  {
    slug: "economy",
    eyebrow: "AUCTION HOUSE",
    title: "WoW Forever economy watch",
    description:
      "Measured market signals that pass a stricter history and confidence gate, with thin evidence kept out of public conclusions.",
  },
  {
    slug: "professions",
    eyebrow: "CRAFTING",
    title: "WoW Forever profession coverage",
    description:
      "Recipe coverage by profession, including unresolved extraction gaps and cooldown crafts excluded from repeatable-profit guidance.",
  },
  {
    slug: "recruitment",
    eyebrow: "COMMUNITY CENSUS",
    title: "What are WoW Forever guilds recruiting?",
    description:
      "An aggregate view of demand advertised by approved guild listings, with freshness and sample-size limits shown beside the data.",
  },
  {
    slug: "discoveries",
    eyebrow: "COVERAGE",
    title: "What has the community discovered?",
    description:
      "Catalog, market, source-hint, and loot-relation coverage—separating client presence from observed or confirmed facts.",
  },
  {
    slug: "world",
    eyebrow: "MAPS & ENCOUNTERS",
    title: "WoW Forever world-data coverage",
    description:
      "Maps, encounters, bosses, quests, locations, and spell leads extracted from the client with review status preserved.",
  },
  {
    slug: "data",
    eyebrow: "OPEN EVIDENCE",
    title: "WoW Forever public data and methodology",
    description:
      "Versioned public endpoints, publication gates, attribution guidance, and the exact limits applied to research claims.",
  },
] as const;

export type ResearchTopicSlug = (typeof researchTopics)[number]["slug"];

export function researchTopic(slug: string) {
  return researchTopics.find((topic) => topic.slug === slug);
}
