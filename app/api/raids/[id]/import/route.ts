import { z } from "zod";
import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";
import {
  signupImportRequestSchema,
  SIGNUP_IMPORT_MAX_BYTES,
} from "@/lib/raids/signup-import";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const requestSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("preview"),
      source: z.string().min(1).max(SIGNUP_IMPORT_MAX_BYTES),
    })
    .strict(),
  signupImportRequestSchema.extend({ operation: z.literal("import") }),
]);
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember();
    await rateLimit(`raids:import:${member.id}`, 10, 60);
    const { id } = await context.params;
    const body = requestSchema.parse(
      await readJson(request, SIGNUP_IMPORT_MAX_BYTES * 2 + 16000),
    );
    if (body.operation === "preview")
      return { preview: await raids.previewSignups(member, id, body.source) };
    return {
      result: await raids.importSignups(member, id, {
        source: body.source,
        version: body.version,
        requestKey: body.requestKey,
        confirm: body.confirm,
        selections: body.selections,
      }),
    };
  });
}
