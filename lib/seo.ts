import type { Metadata } from "next";
import { INDEXABLE, SITE_NAME, SITE_URL } from "@/lib/config";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  noindex = false,
): Metadata {
  return {
    title: title.includes("WoW Forever") ? { absolute: title } : title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    robots: {
      index: INDEXABLE && !noindex,
      follow: true,
      googleBot: {
        index: INDEXABLE && !noindex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: SITE_NAME,
      locale: "en_GB",
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "WoW Forever community Discord, guilds and groups",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
