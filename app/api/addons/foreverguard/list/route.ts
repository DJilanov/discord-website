import { getSafetyExport, toLua } from "@/lib/safety-export";

export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const data = await getSafetyExport();
  if (new URL(request.url).searchParams.get("format") === "lua")
    return new Response(toLua(data), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=Data.lua",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  return Response.json(data, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
