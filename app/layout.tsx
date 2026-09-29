import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WoW Forever Discord & Community Hub",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Find your WoW Forever community. Unofficial Discord, guild recruitment, groups, guides and community safety for Alliance and Horde.",
  applicationName: SITE_NAME,
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: false },
};
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    ...baseMetadata,
    verification: {
      ...(settings.googleVerification
        ? { google: settings.googleVerification }
        : {}),
      ...(settings.bingVerification
        ? { other: { "msvalidate.01": settings.bingVerification } }
        : {}),
    },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111413",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
