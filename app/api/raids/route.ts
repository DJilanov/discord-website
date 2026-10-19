import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  return raidApi(async () => ({
    events: await raids.list(await requireMember()),
  }));
}
export async function POST(request: Request): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember();
    await rateLimit(`raids:create:${member.id}`, 10, 3600);
    return { id: await raids.create(member, await readJson(request, 16000)) };
  }, 201);
}
