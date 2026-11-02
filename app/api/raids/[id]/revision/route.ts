import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return raidApi(async () => ({
    version: await raids.revision(
      await requireMember(),
      (await context.params).id,
    ),
  }));
}
