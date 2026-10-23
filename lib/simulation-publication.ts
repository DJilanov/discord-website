import type { ForeverGuide } from "@prisma/client";
import type { EditorialGuide } from "@/content/guides";
import { editorialFingerprint } from "./editorial-publication";

type Existing = Pick<
  ForeverGuide,
  "slug" | "title" | "excerpt" | "content" | "published" | "publishedAt"
>;
export function simulationPublicationAction(
  existing: Existing | null,
  source: EditorialGuide,
): "create" | "publish" | "preserve" {
  if (!existing) return "create";
  if (
    existing.slug !== source.slug ||
    editorialFingerprint(existing) !== editorialFingerprint(source)
  )
    throw new Error(
      `Simulation guide has editorial changes; preserved: ${source.slug}`,
    );
  if (existing.published) return "preserve";
  if (existing.publishedAt !== null)
    throw new Error(
      `Previously unpublished guide requires manual review: ${source.slug}`,
    );
  return "publish";
}
