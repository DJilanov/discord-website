import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  return raidApi(async () => ({
    characters: await raids.characters(await requireMember()),
  }));
}
export async function POST(request: Request): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember();
    await rateLimit(`raids:character:${member.id}`, 20, 3600);
    return {
      character: await raids.addCharacter(
        member,
        await readJson(request, 2000),
      ),
    };
  }, 201);
}
export async function PATCH(request: Request): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember();
    await rateLimit(`raids:character-spec:${member.id}`, 30, 3600);
    await raids.updateCharacterSpecialization(
      member,
      await readJson(request, 2000),
    );
    return { ok: true };
  });
}
