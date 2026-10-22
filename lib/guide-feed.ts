import { SITE_URL } from "./config";

interface FeedGuide {
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
  publishedAt: Date | null;
  published: boolean;
}

function xml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

export function guideFeed(
  guides: readonly FeedGuide[],
  now = new Date(),
): string {
  const entries = guides
    .filter(
      (guide) =>
        guide.published &&
        guide.publishedAt &&
        Number.isFinite(guide.publishedAt.getTime()) &&
        guide.publishedAt <= now &&
        Number.isFinite(guide.updatedAt.getTime()) &&
        guide.updatedAt <= now &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug),
    )
    .slice(0, 50);
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>WoW Forever Community Guides</title><link>${SITE_URL}/guides</link><description>Published community resources and substantive guide revisions. No private events or attendee data.</description>${entries
    .map((guide) => {
      const url = `${SITE_URL}/guides/${guide.slug}`;
      return `<item><title>${xml(guide.title)}</title><link>${url}</link><guid isPermaLink="false">${url}#${guide.updatedAt.toISOString()}</guid><pubDate>${guide.updatedAt.toUTCString()}</pubDate><description>${xml(guide.excerpt)}</description></item>`;
    })
    .join("")}</channel></rss>`;
}
