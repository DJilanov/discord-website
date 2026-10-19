import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi, privateHeaders } from "@/lib/raids/api";
import { canonicalJson } from "@/lib/raids/json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  let result: Awaited<ReturnType<typeof raids.export>> | undefined;
  const failure = await raidApi(async () => {
    result = await raids.export(
      await requireMember(),
      (await context.params).id,
    );
    return { ok: true };
  });
  if (!result) return failure;
  return new Response(canonicalJson(result), {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="forever-raid-loot.json"',
    },
  });
}
