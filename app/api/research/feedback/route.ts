import { z } from "zod";

import { apiError } from "@/lib/api";
import { recordEvent } from "@/lib/analytics";
import { db } from "@/lib/db";
import { ipHash, rateLimit, readJson, requireSameOrigin } from "@/lib/security";

const feedbackSchema = z
  .object({
    path: z
      .string()
      .max(200)
      .regex(/^\/research(?:\/|$)/, "Feedback must refer to a research page."),
    kind: z.enum(["helpful", "unclear", "incorrect", "missing"]),
    message: z.string().trim().max(2000).default(""),
    website: z.string().max(0).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["incorrect", "missing"].includes(value.kind) &&
      value.message.length < 10
    ) {
      context.addIssue({
        code: "custom",
        path: ["message"],
        message:
          "Tell us what is incorrect or missing in at least 10 characters.",
      });
    }
  });

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const hash = ipHash(request.headers);
    await rateLimit(`research-feedback:${hash}`, 10, 3_600);
    const input = feedbackSchema.parse(await readJson(request, 4_000));
    if (input.website) return new Response(null, { status: 204 });
    await db.foreverResearchFeedback.create({
      data: {
        path: input.path,
        kind: input.kind,
        message: input.message || null,
      },
    });
    try {
      await recordEvent(request.headers, {
        event: "feedback_submit",
        path: input.path,
        referrer: request.headers.get("referer") ?? "",
      });
    } catch (error: unknown) {
      console.error(
        "Research feedback was saved but its analytics event failed",
        error,
      );
    }
    return Response.json(
      { message: "Thank you. The research team will review this feedback." },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return apiError(error);
  }
}
