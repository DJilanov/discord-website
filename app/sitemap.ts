import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { pages } from "@/content/pages";
import { SITE_URL } from "@/lib/config";
import { researchTopics } from "@/content/research";
import { getForeverObservatory, getRecruitmentCensus } from "@/lib/research";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guides, guilds, observatory, census] = await Promise.all([
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
    getForeverObservatory(),
    getRecruitmentCensus(),
  ]);
  const catalogModified =
    observatory?.catalog.current?.publishedAt ??
    observatory?.catalog.current?.extractedAt ??
    observatory?.generatedAt;
  const researchModified = latestDate(
    catalogModified,
    observatory?.market.scan?.completedAt,
    census.dataAsOf,
  );
  const staticPaths = [
    "",
    "discord",
    "guild-recruitment",
    "lfg",
    "guides",
    "research",
    ...researchTopics.map((topic) => `research/${topic.slug}`),
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
      ...(path === "research" && researchModified
        ? { lastModified: researchModified }
        : path.startsWith("research/")
          ? {
              lastModified:
                path === "research/recruitment"
                  ? (census.dataAsOf ?? undefined)
                  : path === "research/economy"
                    ? (observatory?.market.scan?.completedAt ?? catalogModified)
                    : catalogModified,
            }
          : {}),
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

function latestDate(
  ...values: Array<string | null | undefined>
): string | undefined {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
  if (!dates.length) return undefined;
  return new Date(
    Math.max(...dates.map((value) => value.getTime())),
  ).toISOString();
}
