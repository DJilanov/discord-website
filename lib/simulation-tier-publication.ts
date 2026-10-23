import type { ForeverGuide } from "@prisma/client";
import type { EditorialGuide } from "@/content/guides";
import { dpsTierSlug } from "@/content/simulation-guides";
import { editorialFingerprint } from "./editorial-publication";

// Source-published tier article at community release 735837d, before this revision.
export const previousTierGuideFingerprint =
  "4d4b5cd4d9b63694f33830b99ea49497742f017e7b607a70842bb7476f3d4cdc";
type PublishedGuide = Pick<
  ForeverGuide,
  "slug" | "title" | "excerpt" | "content" | "published"
>;

export function tierGuideRefreshMetadata(
  existing: Pick<
    ForeverGuide,
    "title" | "excerpt" | "metaTitle" | "metaDescription"
  >,
  source: Pick<EditorialGuide, "title" | "excerpt">,
): Pick<ForeverGuide, "metaTitle" | "metaDescription"> {
  return {
    metaTitle:
      !existing.metaTitle || existing.metaTitle === existing.title
        ? source.title
        : existing.metaTitle,
    metaDescription:
      !existing.metaDescription || existing.metaDescription === existing.excerpt
        ? source.excerpt
        : existing.metaDescription,
  };
}

export function tierGuideRefreshAction(
  existing: PublishedGuide | null,
  source: EditorialGuide,
  expectedPreviousFingerprint: string = previousTierGuideFingerprint,
): "update" | "preserve" {
  if (
    !existing ||
    !existing.published ||
    existing.slug !== dpsTierSlug ||
    source.slug !== dpsTierSlug
  )
    throw new Error(
      "Only the existing published DPS tier article can be refreshed",
    );
  const fingerprint = editorialFingerprint(existing);
  if (fingerprint === editorialFingerprint(source)) return "preserve";
  if (fingerprint !== expectedPreviousFingerprint)
    throw new Error("The tier article has editorial changes; refresh refused");
  return "update";
}
