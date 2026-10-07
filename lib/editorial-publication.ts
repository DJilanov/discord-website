import type { ForeverGuide } from "@prisma/client";
import { initialGuides } from "@/content/guides";
import { september29Guides, september30Guides, preOctober7Guides } from "@/content/editorial";

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
    [...september29Guides, ...september30Guides, ...preOctober7Guides].some(
      (previous): boolean =>
        previous.slug === guide.slug &&
        previous.title === guide.title &&
        previous.excerpt === guide.excerpt &&
        previous.content === guide.content,
    )
  );
}
