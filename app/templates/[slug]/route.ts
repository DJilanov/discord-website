import { getCommunityTemplate } from "@/content/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const template = getCommunityTemplate((await params).slug);
  if (!template)
    return new Response("Template not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });
  return new Response(`${template.title}\n\n${template.text}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="wow-forever-${template.slug}.txt"`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
