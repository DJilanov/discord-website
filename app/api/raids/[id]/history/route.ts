import { z } from "zod";
import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return raidApi(async () => {
    const cursor = z
      .string()
      .min(1)
      .max(100)
      .optional()
      .parse(new URL(request.url).searchParams.get("cursor") ?? undefined);
    return raids.history(
      await requireMember(),
      (await context.params).id,
      cursor,
    );
  });
}
