import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { ForeverGuide } from "@prisma/client";

type GuideSummary = Pick<
  ForeverGuide,
  "title" | "slug" | "excerpt" | "coverImage" | "category" | "content"
>;

export function GuideCard({
  guide,
  variant = "standard",
}: {
  guide: GuideSummary;
  variant?: "standard" | "featured" | "compact";
}): React.JSX.Element {
  const minutes = Math.max(
    1,
    Math.ceil(guide.content.split(/\s+/).length / 200),
  );
  return (
    <article className={`guide-card guide-${variant}`}>
      <Link
        href={`/guides/${guide.slug}`}
        className="guide-image"
        aria-label={guide.title}
      >
        <Image
          src={guide.coverImage}
          alt=""
          fill
          sizes={
            variant === "compact"
              ? "(max-width: 700px) 110px, 160px"
              : "(max-width: 700px) calc(100vw - 40px), (max-width: 1280px) 50vw, 650px"
          }
        />
        <span className="image-category">{guide.category}</span>
      </Link>
      <div className="guide-card-body">
        <span className="read-time">
          <Clock3 size={14} />
          {minutes} min read
        </span>
        <h3>
          <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
        </h3>
        <p>{guide.excerpt}</p>
        <Link className="text-link" href={`/guides/${guide.slug}`}>
          Read the guide
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}

export function GuideCollection({
  guides,
}: {
  guides: GuideSummary[];
}): React.JSX.Element {
  const [featured, ...remaining] = guides;
  if (!featured) return <></>;
  return (
    <>
      <div
        className={`guide-showcase${remaining.length ? "" : " guide-showcase-single"}`}
      >
        <GuideCard guide={featured} variant="featured" />
        {remaining.length > 0 && (
          <div className="guide-supporting">
            {remaining.slice(0, 2).map((guide) => (
              <GuideCard key={guide.slug} guide={guide} variant="compact" />
            ))}
          </div>
        )}
      </div>
      {remaining.length > 2 && (
        <div className="guide-grid guide-more">
          {remaining.slice(2).map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      )}
    </>
  );
}
