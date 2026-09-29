import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import {
  HttpError,
  ipHash,
  rateLimit,
  readJson,
  requireSameOrigin,
  tokenHash,
} from "@/lib/security";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    await rateLimit(`status:${ipHash(request.headers)}`, 30, 900);
    const input = z
      .object({
        reference: z.string().regex(/^(FG|FA)-[A-Z0-9]{12}$/),
        token: z.string().min(40).max(80),
      })
      .parse(await readJson(request, 1000));
    const where = {
      publicId: input.reference,
      accessTokenHash: tokenHash(input.token),
    };
    const select = {
      publicId: true,
      status: true,
      decisionReason: true,
      createdAt: true,
      updatedAt: true,
    };
    const record = input.reference.startsWith("FA-")
      ? await db.foreverAppeal.findFirst({ where, select })
      : await db.foreverReport.findFirst({ where, select });
    if (!record)
      throw new HttpError(
        404,
        "No case matches this reference and access key.",
      );
    return NextResponse.json(record, {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  } catch (error) {
    return apiError(error);
  }
}
