import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  ipHash,
  issueChallenge,
  rateLimit,
  requireSameOrigin,
} from "@/lib/security";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    await rateLimit(`challenge:${ipHash(request.headers)}`, 60, 3600);
    return NextResponse.json(issueChallenge(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
