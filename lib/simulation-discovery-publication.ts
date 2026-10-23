import type { ForeverGuide } from "@prisma/client";
import type { EditorialGuide } from "@/content/guides";
import { simulationGuides } from "@/content/simulation-guides";
import history from "@/content/simulation-discovery-history.json";
import { editorialFingerprint } from "./editorial-publication";

export const previousDiscoveryFingerprints: Readonly<Record<string, string>> =
  history;
export type DiscoveryGuide = Pick<
  ForeverGuide,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "content"
  | "metaTitle"
  | "metaDescription"
  | "published"
  | "updatedAt"
>;
export interface DiscoveryGuidePlan {
  readonly existing: DiscoveryGuide;
  readonly source: EditorialGuide;
  readonly action: "update" | "preserve";
}

export function planSimulationDiscovery(
  existing: readonly DiscoveryGuide[],
): readonly DiscoveryGuidePlan[] {
  const slugs = simulationGuides.map((guide) => guide.slug);
  if (
    existing.length !== slugs.length ||
    new Set(existing.map((guide) => guide.slug)).size !== slugs.length ||
    Object.keys(history).length !== slugs.length ||
    existing.some((guide) => !slugs.includes(guide.slug))
  )
    throw new Error(
      "The refresh requires exactly the ten known simulation guides",
    );

  return simulationGuides.map((source): DiscoveryGuidePlan => {
    const guide = existing.find((guide) => guide.slug === source.slug);
    if (!guide?.published)
      throw new Error(`Published guide unavailable: ${source.slug}`);
    const fingerprint = editorialFingerprint(guide);
    if (fingerprint === editorialFingerprint(source))
      return { existing: guide, source, action: "preserve" };
    if (fingerprint !== previousDiscoveryFingerprints[source.slug])
      throw new Error(
        `Editorial changes preserved; refresh refused: ${source.slug}`,
      );
    return { existing: guide, source, action: "update" };
  });
}
