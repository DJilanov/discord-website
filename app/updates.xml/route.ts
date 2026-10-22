import { db } from "@/lib/db";
import { guideFeed } from "@/lib/guide-feed";

export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const guides = await db.foreverGuide.findMany({
    where: { published: true, publishedAt: { not: null } },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      updatedAt: true,
      publishedAt: true,
      published: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return new Response(guideFeed(guides), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
