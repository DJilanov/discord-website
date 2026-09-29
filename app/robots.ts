import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  const blocked = [
    "/admin",
    "/api/",
    "/login",
    "/join",
    "/reports/status",
    "/guild-recruitment/new",
    "/lfg/new",
    "/reports/new",
  ];
  return {
    rules: [
      {
        userAgent: [
          "*",
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
        ],
        allow: "/",
        disallow: blocked,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
