import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  HttpError,
  ipHash,
  rateLimit,
  readForm,
  readJson,
  requireSameOrigin,
} from "@/lib/security";
import {
  submitAppeal,
  submitGroup,
  submitGuild,
  submitReport,
} from "@/lib/submissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  try {
    requireSameOrigin(request);
    const { kind } = await params;
    if (!["guild", "group", "report", "appeal"].includes(kind))
      throw new HttpError(404, "Unknown submission type.");
    const ip = ipHash(request.headers);
    await rateLimit(`submission:${kind}:${ip}`, 10, 3600);
    const result =
      kind === "guild"
        ? await submitGuild(await readJson(request, 20000), ip)
        : kind === "group"
          ? await submitGroup(await readJson(request, 10000), ip)
          : kind === "report"
            ? await submitReport(await readForm(request), ip)
            : await submitAppeal(await readForm(request), ip);
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
