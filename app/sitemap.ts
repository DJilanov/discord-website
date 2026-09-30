import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { pages } from "@/content/pages";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guides, guilds] = await Promise.all([
    db.foreverGuide.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      take: 20000,
    }),
    db.foreverGuild.findMany({
      where: { status: "approved" },
      select: { slug: true, updatedAt: true },
      take: 20000,
    }),
  ]);
  const staticPaths = [
    "",
    "discord",
    "guild-recruitment",
    "lfg",
    "guides",
    "addons",
    "addons/wow-trader",
    "contribute",
    "addons/foreverguard",
    "addons/foreverguard/changelog",
    "reports",
    "faq",
    "transparency",
    ...Object.keys(pages),
  ];
  return [
    ...staticPaths.map((path) => ({
      url: `${SITE_URL}/${path}`,
    })),
    ...guides.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: guide.updatedAt,
    })),
    ...guilds.map((guild) => ({
      url: `${SITE_URL}/guilds/${guild.slug}`,
      lastModified: guild.updatedAt,
    })),
  ];
}
