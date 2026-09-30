import { z } from "zod";
import { createHash } from "node:crypto";
import { apiError } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import {
  readJson,
  requireSameOrigin,
  rateLimit,
  HttpError,
} from "@/lib/security";
import {
  controlSchema,
  createBridgeSchema,
  modeSchema,
} from "@/lib/discord-bridge/contracts";
import {
  canManage,
  control,
  idempotentAdmin,
  serializeSnapshot,
  setMode,
  snapshot,
} from "@/lib/discord-bridge/admin";
import { BridgeError } from "@/lib/discord-bridge/store";
import { webBridgeStore as store } from "@/lib/discord-bridge/web-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
function failure(error: unknown): Response {
  const response = apiError(
    error instanceof BridgeError
      ? new HttpError(error.status, error.code.replaceAll("_", " "))
      : error,
  );
  for (const [key, value] of Object.entries(headers))
    response.headers.set(key, value);
  return response;
}
export async function GET(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
): Promise<Response> {
  try {
    const staff = await requireStaff(["owner", "admin", "moderator"]);
    const { action } = await context.params;
    if (action.length !== 1 || action[0] !== "status")
      throw new HttpError(404, "Not found.");
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("offset") || "0");
    const selectedId = z
      .uuid()
      .optional()
      .parse(new URL(request.url).searchParams.get("bridgeId") || undefined);
    return Response.json(
      serializeSnapshot(await snapshot(store, staff, offset, selectedId)),
      {
        headers,
      },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
): Promise<Response> {
  try {
    requireSameOrigin(request);
    const staff = await requireStaff(["owner", "admin", "moderator"]);
    await rateLimit(`bridge-admin:${staff.id}`, 60, 60);
    const { action } = await context.params;
    if (
      action.length !== 1 ||
      !["draft", "control", "mode"].includes(action[0])
    )
      throw new HttpError(404, "Not found.");
    const requestId = z.uuid().parse(request.headers.get("idempotency-key"));
    const raw = await readJson(request, 8000);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ action, raw }))
      .digest("hex");
    await idempotentAdmin(store, staff.id, requestId, fingerprint, async () => {
      if (action[0] === "draft") {
        if (!canManage(staff))
          throw new HttpError(403, "Owner or admin required.");
        const input = createBridgeSchema.parse(raw);
        await store.createDraft(
          input.name,
          input.channelA,
          input.channelB,
          `staff:${staff.id}`,
        );
      } else if (action[0] === "control")
        await control(store, controlSchema.parse(raw), staff);
      else {
        const input = modeSchema.parse(raw);
        await setMode(store, input.mode, input.version, input.reason, staff);
      }
    });
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return failure(error);
  }
}
