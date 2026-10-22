import type { ForeverGuide } from "@prisma/client";
import { createHash } from "node:crypto";
import { initialGuides } from "@/content/guides";
import {
  september29Guides,
  september30Guides,
  preOctober7Guides,
} from "@/content/editorial";
import { preOctober22Fingerprints } from "@/content/editorial-october22-history";
import { preInteractiveStarterFingerprints } from "@/content/starter-resource-history";
import type { EditorialGuide } from "@/content/guides";
import { guideSchema } from "@/lib/validation";
import type { z } from "zod";

export function editorialPublicationData(
  source: EditorialGuide,
  options: { publishStarters?: boolean } = {},
): z.infer<typeof guideSchema> {
  return guideSchema.parse({
    ...source,
    author: "Open source contributors",
    published:
      source.release !== "draft" ||
      (options.publishStarters === true &&
        Object.hasOwn(preInteractiveStarterFingerprints, source.slug)),
    metaTitle: source.title,
    metaDescription: source.excerpt,
  });
}

export function editorialFingerprint(
  guide: Pick<ForeverGuide, "slug" | "title" | "excerpt" | "content">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        slug: guide.slug,
        title: guide.title,
        excerpt: guide.excerpt,
        content: guide.content,
      }),
    )
    .digest("hex");
}

export function canRefreshDraftGuide(
  guide: Pick<
    ForeverGuide,
    "slug" | "title" | "excerpt" | "content" | "published" | "publishedAt"
  >,
  source: EditorialGuide,
): boolean {
  return (
    source.release === "draft" &&
    source.slug === guide.slug &&
    !guide.published &&
    guide.publishedAt === null &&
    preInteractiveStarterFingerprints[guide.slug] ===
      editorialFingerprint(guide)
  );
}

export function canPublishStarterGuide(
  guide: Pick<
    ForeverGuide,
    "slug" | "title" | "excerpt" | "content" | "published" | "publishedAt"
  >,
  source: EditorialGuide,
): boolean {
  return (
    source.release === "draft" &&
    source.slug === guide.slug &&
    Object.hasOwn(preInteractiveStarterFingerprints, guide.slug) &&
    !guide.published &&
    guide.publishedAt === null &&
    (canRefreshDraftGuide(guide, source) ||
      editorialFingerprint(guide) === editorialFingerprint(source))
  );
}

export function canRefreshStarterGuide(
  guide: Pick<
    ForeverGuide,
    "slug" | "title" | "excerpt" | "content" | "published"
  >,
): boolean {
  const original = initialGuides.find((item) => item.slug === guide.slug);
  if (
    !original ||
    !guide.published ||
    guide.title !== original.title ||
    guide.excerpt !== original.excerpt
  )
    return false;
  // Exact historical starter versions only; never normalize away an editor's changes.
  const historicalContent: Record<string, string> = {
    "find-your-wow-forever-guild": original.content.replace(
      "organizing hundreds of community raids",
      "organizing raids at KFC",
    ),
    "join-wow-forever-discord": original.content.replace(
      "WoW Forever Discord is an independent fan project",
      "Forever Community Hub is an independent fan project",
    ),
    "pve-pvp-rp-find-your-community": original.content.replace(
      "WoW Forever Discord makes room",
      "Forever Community Hub makes room",
    ),
  };
  return (
    guide.content === original.content ||
    guide.content === historicalContent[guide.slug]
  );
}

export function canRefreshEditorialGuide(
  guide: Pick<
    ForeverGuide,
    "slug" | "title" | "excerpt" | "content" | "published"
  >,
): boolean {
  if (canRefreshStarterGuide(guide)) return true;
  return (
    guide.published &&
    (preOctober22Fingerprints[guide.slug] === editorialFingerprint(guide) ||
      [...september29Guides, ...september30Guides, ...preOctober7Guides].some(
        (previous): boolean =>
          previous.slug === guide.slug &&
          previous.title === guide.title &&
          previous.excerpt === guide.excerpt &&
          previous.content === guide.content,
      ))
  );
}
