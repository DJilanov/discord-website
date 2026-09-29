import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { ipHash } from "@/lib/security";

export function trafficSource(
  referrer: string,
  utmMedium = "",
  utmSource = "",
): { source: string; referrerHost: string | null } {
  let host: string | null = null;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    /* Empty and invalid referrers are direct traffic. */
  }
  const medium = utmMedium.trim().toLowerCase();
  const source = utmSource.trim().toLowerCase();
  if (["cpc", "ppc", "paid", "paid_social"].includes(medium))
    return { source: "Paid", referrerHost: host };
  if (medium === "email") return { source: "Email", referrerHost: host };
  if (host === new URL(SITE_URL).hostname) host = null;
  const matches = (domains: string[]): boolean =>
    domains.some((domain) => host === domain || host?.endsWith(`.${domain}`));
  if (
    matches(["chatgpt.com", "chat.openai.com", "perplexity.ai", "claude.ai"]) ||
    [
      "chatgpt",
      "chatgpt.com",
      "chat.openai.com",
      "perplexity",
      "perplexity.ai",
      "claude",
      "claude.ai",
    ].includes(source)
  )
    return { source: "AI referral", referrerHost: host };
  if (
    matches([
      "google.com",
      "google.co.uk",
      "google.de",
      "google.fr",
      "google.bg",
      "bing.com",
      "duckduckgo.com",
      "search.yahoo.com",
      "ecosia.org",
    ]) ||
    medium === "organic"
  )
    return { source: "Organic search", referrerHost: host };
  if (
    matches([
      "reddit.com",
      "facebook.com",
      "instagram.com",
      "discord.com",
      "discord.gg",
      "t.co",
      "x.com",
      "youtube.com",
      "bsky.app",
    ]) ||
    ["social", "community"].includes(medium)
  )
    return { source: "Social", referrerHost: host };
  return { source: host || source ? "Referral" : "Direct", referrerHost: host };
}

export function publicAnalyticsPath(value: string): string | null {
  const path = value.split("?")[0].split("#")[0];
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.length > 200 ||
    /[\\\r\n]/.test(path) ||
    /^\/(admin|api|login|reports\/status|appeals\/status)(\/|$)/.test(path)
  )
    return null;
  return path;
}

export async function recordEvent(
  headers: Headers,
  input: {
    event: string;
    path: string;
    referrer?: string;
    sessionId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  },
): Promise<void> {
  if (headers.get("dnt") === "1" || headers.get("sec-gpc") === "1") return;
  const path = publicAnalyticsPath(input.path);
  if (!path) return;
  const userAgent = headers.get("user-agent") || "";
  const source = trafficSource(
    input.referrer || "",
    input.utmMedium,
    input.utmSource,
  );
  await db.foreverAnalyticsEvent.create({
    data: {
      event: input.event,
      path,
      sessionId: input.sessionId || null,
      ipHash: ipHash(headers),
      ...source,
      utmSource: input.utmSource?.slice(0, 80),
      utmMedium: input.utmMedium?.slice(0, 80),
      utmCampaign: input.utmCampaign?.slice(0, 100),
      device: /mobile|android|iphone/i.test(userAgent) ? "Mobile" : "Desktop",
      country: null,
      bot: /bot|crawler|spider|headless|preview|slurp/i.test(userAgent),
    },
  });
}
