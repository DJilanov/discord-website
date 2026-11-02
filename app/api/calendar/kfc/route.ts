import { kfcCalendarEvents } from "@/lib/kfc-raiding/calendar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.json(
      {
        version: 1,
        events: await kfcCalendarEvents(),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=30, must-revalidate",
        },
      },
    );
  } catch {
    console.error("KFC public calendar is temporarily unavailable.");
    return Response.json(
      { error: "Calendar temporarily unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "30" },
      },
    );
  }
}
