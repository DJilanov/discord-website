import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { csvCell } from "@/lib/csv";
export async function GET(request: Request): Promise<Response> {
  try {
    await requireStaff(["owner", "admin"]);
    const requested = Number(new URL(request.url).searchParams.get("days")),
      days = [7, 30, 90].includes(requested) ? requested : 30;
    const rows = await db.foreverAnalyticsEvent.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - days * 86400000) },
        bot: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50000,
      select: {
        createdAt: true,
        event: true,
        path: true,
        source: true,
        referrerHost: true,
        utmCampaign: true,
        device: true,
        sessionId: true,
      },
    });
    const csv = [
      "timestamp,event,path,source,referrer,campaign,device,session",
      ...rows.map((row) =>
        [
          row.createdAt.toISOString(),
          row.event,
          row.path,
          row.source,
          row.referrerHost,
          row.utmCampaign,
          row.device,
          row.sessionId,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=forever-traffic-${days}days.csv`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
