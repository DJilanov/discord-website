import { db } from "@/lib/db";
import { GuideLibrary } from "@/components/guide-library";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "WoW Forever Guides: Classes, Talents and Dungeons",
  "WoW Forever class guides, talent explanations, combat priorities and dungeon preparation, alongside practical guild, group and community-tool resources.",
  "/guides",
);
export default async function GuidesPage(): Promise<React.JSX.Element> {
  const guides = await db.foreverGuide.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      coverImage: true,
    },
    take: 100,
  });
  return <GuideLibrary guides={guides} />;
}
