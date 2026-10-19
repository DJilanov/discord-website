import type { NextConfig } from "next";
import { createHash } from "node:crypto";

const config: NextConfig = {
  distDir: process.env.FOREVER_BUILD_DIR || ".next",
  deploymentId: process.env.FOREVER_BUILD_DIR
    ? createHash("sha256")
        .update(process.env.FOREVER_BUILD_DIR)
        .digest("hex")
        .slice(0, 20)
    : undefined,
  poweredByHeader: false,
  devIndicators: false,
  logging: {
    incomingRequests: { ignore: [/\/api\/community\/auth\/callback(?:\/|\?)/] },
  },
  images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    imgOptConcurrency: 1,
    imgOptOperationCache: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
      ...[
        "/raids/:path*",
        "/account/:path*",
        "/admin/raids/:path*",
        "/api/community/auth/:path*",
      ].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      })),
    ];
  },
};

export default config;
