import { getPublicEvent } from "@/lib/raids/public-events";
import { publicEventCalendar } from "@/lib/raids/calendar";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const event = await getPublicEvent((await params).id);
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (!event) return new Response("Event not found", { status: 404, headers });
  return new Response(publicEventCalendar(event), {
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="forever-event-${event.id}.ics"`,
    },
  });
}
