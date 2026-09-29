import { db } from "@/lib/db";
import { sessionConversions } from "@/lib/traffic-conversion";

export async function trafficReport(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const where = { createdAt: { gte: since }, bot: false };
  const [
    views,
    clicks,
    sources,
    paths,
    sessions,
    clickSessions,
    recent,
    conversion,
  ] = await Promise.all([
    db.foreverAnalyticsEvent.count({
      where: { ...where, event: "page_view" },
    }),
    db.foreverAnalyticsEvent.count({
      where: { ...where, event: "discord_click" },
    }),
    db.foreverAnalyticsEvent.groupBy({
      by: ["source"],
      where: { ...where, event: "page_view" },
      _count: true,
      orderBy: { _count: { source: "desc" } },
    }),
    db.foreverAnalyticsEvent.groupBy({
      by: ["path"],
      where: { ...where, event: "page_view" },
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 12,
    }),
    db.foreverAnalyticsEvent.findMany({
      where: { ...where, event: "page_view", sessionId: { not: null } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    db.foreverAnalyticsEvent.findMany({
      where: { ...where, event: "discord_click", sessionId: { not: null } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    db.foreverAnalyticsEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        event: true,
        path: true,
        source: true,
        referrerHost: true,
        utmCampaign: true,
        device: true,
        country: true,
        sessionId: true,
        ipHash: true,
        createdAt: true,
      },
    }),
    sessionConversions(since),
  ]);
  const sessionSet = new Set(sessions.map((item) => item.sessionId));
  const conversions = clickSessions.filter((item) =>
    sessionSet.has(item.sessionId),
  ).length;
  return {
    views,
    clicks,
    sources,
    paths,
    sessions: sessions.length,
    conversionRate: sessions.length ? (100 * conversions) / sessions.length : 0,
    recent,
    conversion,
  };
}
