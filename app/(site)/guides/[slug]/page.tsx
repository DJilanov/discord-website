import type { Metadata } from "next";
import { cache } from "react";
import type { ForeverGuide } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { Breadcrumbs, JsonLd, PageHeader } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { artworkDescription, getArtwork } from "@/content/artwork";
import { guideReadingPaths } from "@/content/editorial";

interface Props {
  params: Promise<{ slug: string }>;
}
const getGuide = cache(async (slug: string): Promise<ForeverGuide | null> => {
  return db.foreverGuide.findFirst({ where: { slug, published: true } });
});
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await getGuide((await params).slug);
  if (!guide) return { title: "Guide not found", robots: { index: false } };
  const meta = pageMetadata(
    guide.metaTitle || `${guide.title} - WoW Forever Guide`,
    guide.metaDescription || guide.excerpt,
    `/guides/${guide.slug}`,
  );
  const image = getArtwork(guide.coverImage);
  const images = [
    {
      url: `${SITE_URL}${guide.coverImage}`,
      width: image?.width,
      height: image?.height,
      alt: artworkDescription(guide.coverImage, guide.title),
    },
  ];
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: guide.publishedAt?.toISOString(),
      modifiedTime: guide.updatedAt.toISOString(),
      authors: [guide.author],
      images,
    },
    twitter: { ...meta.twitter, images },
  };
}
export default async function GuidePage({
  params,
}: Props): Promise<React.JSX.Element> {
  const guide = await getGuide((await params).slug);
  if (!guide) notFound();
  const readingPath = guideReadingPaths[guide.slug];
  const related = await db.foreverGuide.findMany({
    where: {
      published: true,
      id: { not: guide.id },
      ...(readingPath
        ? { slug: { in: readingPath } }
        : { category: guide.category }),
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
  });
  const nextStep =
    guide.slug === "wow-trader-read-market-prices"
      ? { href: "/addons/wow-trader", label: "Explore WoW Trader" }
      : guide.slug === "write-wow-forever-guild-recruitment-post"
        ? { href: "/guild-recruitment/new", label: "Submit your guild" }
        : guide.slug === "find-your-wow-forever-guild"
          ? { href: "/guild-recruitment", label: "Find a guild" }
          : [
                "find-or-organize-wow-forever-group",
                "clear-loot-rules-better-groups",
              ].includes(guide.slug)
            ? { href: "/lfg", label: "Find your next group" }
            : { href: "/discord", label: "Explore the Discord" };
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Guides", href: "/guides" },
          { label: guide.title, href: `/guides/${guide.slug}` },
        ]}
      />
      <PageHeader
        eyebrow={guide.category}
        title={guide.title}
        description={guide.excerpt}
      />
      <div className="guild-meta" style={{ marginBottom: 24 }}>
        <span>By {guide.author}</span>
        <span>
          Updated{" "}
          <time dateTime={guide.updatedAt.toISOString()}>
            {guide.updatedAt.toLocaleDateString("en-GB", {
              timeZone: "UTC",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </span>
        <span>
          {Math.max(1, Math.ceil(guide.content.split(/\s+/).length / 200))} min
          read
        </span>
      </div>
      <div
        className={
          guide.coverImage === "/images/wow-trader-workspace.webp"
            ? "editorial-cover product-cover"
            : "editorial-cover"
        }
      >
        <Image
          src={guide.coverImage}
          alt={artworkDescription(guide.coverImage, guide.title)}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1200px"
        />
      </div>
      <div className="article-layout">
        <article>
          <Markdown contents editorial>
            {guide.content}
          </Markdown>
          <div className="article-next">
            <Link className="button primary" href={nextStep.href}>
              {nextStep.label}
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="article-date">
            Written by {guide.author}.{" "}
            <Link className="text-link" href="/about">
              About our organizers
            </Link>{" "}
            ·{" "}
            <Link className="text-link" href="/discord">
              Suggest an article correction in Discord
            </Link>
          </p>
        </article>
        <aside className="article-aside">
          <BookOpen size={26} />
          <h3>Keep exploring</h3>
          <nav>
            {related.map((item) => (
              <Link key={item.id} href={`/guides/${item.slug}`}>
                {item.title}
                <ArrowRight size={14} />
              </Link>
            ))}
            <Link href="/guides">
              All community guides
              <ArrowRight size={14} />
            </Link>
          </nav>
        </aside>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.excerpt,
          image: `${SITE_URL}${guide.coverImage}`,
          datePublished: guide.publishedAt?.toISOString(),
          dateModified: guide.updatedAt.toISOString(),
          mainEntityOfPage: `${SITE_URL}/guides/${guide.slug}`,
          author: {
            "@type": "Organization",
            name: guide.author,
            url: `${SITE_URL}/about`,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
        }}
      />
    </div>
  );
}
