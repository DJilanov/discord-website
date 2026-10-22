import type { MetadataRoute } from "next";
import { SITE_URL } from "./config";

export interface SitemapGuide {
  slug: string;
  published: boolean;
  updatedAt: Date;
}

export function guideSitemapEntries(
  guides: readonly SitemapGuide[],
  now = new Date(),
): MetadataRoute.Sitemap {
  return guides
    .filter(
      (guide) =>
        guide.published && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug),
    )
    .map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      ...(Number.isFinite(guide.updatedAt.getTime()) && guide.updatedAt <= now
        ? { lastModified: guide.updatedAt }
        : {}),
    }));
}

export function latestGuideRevision(
  guides: readonly SitemapGuide[],
  now = new Date(),
): Date | undefined {
  const dates = guideSitemapEntries(guides, now).flatMap((entry) =>
    entry.lastModified instanceof Date ? [entry.lastModified.getTime()] : [],
  );
  return dates.length ? new Date(Math.max(...dates)) : undefined;
}
