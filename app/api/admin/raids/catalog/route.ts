import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { raidApi } from "@/lib/raids/api";
import { requireRaidPilot } from "@/lib/raids/config";
import { stageCatalog, reviewCatalog } from "@/lib/raids/catalog-store";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("stage"), bundle: z.unknown() }).strict(),
  z
    .object({
      operation: z.literal("review"),
      id: z.string().min(1).max(100),
      decision: z.enum(["published", "rejected"]),
      note: z.string().trim().min(10).max(1000),
    })
    .strict(),
]);
export async function POST(request: Request): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const staff = await requireStaff(["owner", "admin"]);
    requireRaidPilot();
    await rateLimit(`raids:catalog:${staff.id}`, 20, 3600);
    const input = inputSchema.parse(await readJson(request, 5 * 1024 * 1024));
    if (input.operation === "stage")
      return { id: await stageCatalog(input.bundle, staff.id) };
    await reviewCatalog(input.id, staff.id, input.decision, input.note);
    return { ok: true };
  });
}
