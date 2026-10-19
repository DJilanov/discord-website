import { z } from "zod";
import { requireMember } from "@/lib/member-auth";
import { raids } from "@/lib/raids/service";
import { raidApi } from "@/lib/raids/api";
import {
  eventActionSchema,
  reservesSchema,
  signupSchema,
  policyAcknowledgementSchema,
} from "@/lib/raids/contracts";
import { readJson, requireSameOrigin, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
interface Context {
  params: Promise<{ id: string }>;
}
const mutation = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("signup"), input: signupSchema }).strict(),
  z
    .object({ operation: z.literal("reserves"), input: reservesSchema })
    .strict(),
  z.object({ operation: z.literal("withdraw") }).strict(),
  policyAcknowledgementSchema
    .extend({ operation: z.literal("acknowledge") })
    .strict(),
  z.object({ operation: z.literal("publish_discord") }).strict(),
  z
    .object({ operation: z.literal("manage"), input: eventActionSchema })
    .strict(),
]);
export async function GET(
  _request: Request,
  context: Context,
): Promise<Response> {
  return raidApi(async () => ({
    event: await raids.get(await requireMember(), (await context.params).id),
  }));
}
export async function POST(
  request: Request,
  context: Context,
): Promise<Response> {
  return raidApi(async () => {
    requireSameOrigin(request);
    const member = await requireMember();
    const { id } = await context.params;
    await rateLimit(`raids:edit:${member.id}`, 60, 60);
    const body = mutation.parse(await readJson(request, 16000));
    if (body.operation === "signup") await raids.signup(member, id, body.input);
    else if (body.operation === "reserves")
      await raids.reserves(member, id, body.input);
    else if (body.operation === "withdraw") await raids.withdraw(member, id);
    else if (body.operation === "acknowledge")
      await raids.acknowledge(member, id, {
        acknowledge: body.acknowledge,
        policyChecksum: body.policyChecksum,
      });
    else if (body.operation === "publish_discord")
      await raids.publishDiscord(member, id);
    else await raids.manage(member, id, body.input);
    return { event: await raids.get(member, id) };
  });
}
