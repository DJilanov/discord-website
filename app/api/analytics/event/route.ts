import { z } from "zod";
import { apiError } from "@/lib/api";
import { recordEvent } from "@/lib/analytics";
import { ipHash, rateLimit, readJson, requireSameOrigin } from "@/lib/security";

const schema = z.object({
  event: z.enum(["page_view", "discord_click"]),
  path: z.string().max(300),
  referrer: z.string().max(2000).default(""),
  sessionId: z.union([z.uuid(), z.literal("")]).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(100).optional(),
});
export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    await rateLimit(`analytics:${ipHash(request.headers)}`, 300, 60);
    const data = schema.parse(await readJson(request, 5000));
    await recordEvent(request.headers, data);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
