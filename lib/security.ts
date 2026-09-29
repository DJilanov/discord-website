import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function newAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
export function publicId(prefix = "FG"): string {
  return `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function ipHash(headers: Headers): string {
  const salt = process.env.ANALYTICS_SALT || process.env.AUTH_SECRET;
  if (!salt) throw new HttpError(503, "Security configuration is incomplete.");
  // Forwarding headers are trusted only when the deployment proxy overwrites them.
  const candidate =
    process.env.TRUST_PROXY === "true"
      ? headers.get("x-real-ip") || "unknown"
      : "local";
  const ip = isIP(candidate) ? candidate : "unknown";
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export async function rateLimit(
  key: string,
  limit: number,
  seconds: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + seconds * 1000);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "ForeverRateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "ForeverRateLimit"."expiresAt" <= ${now} THEN 1 ELSE "ForeverRateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "ForeverRateLimit"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "ForeverRateLimit"."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(SITE_URL).origin]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://127.0.0.1:19300");
    allowed.add("http://localhost:19300");
  }
  if (!origin || !allowed.has(origin))
    throw new HttpError(403, "Request origin is not allowed.");
}

function challengeSignature(value: string): string {
  if (!process.env.AUTH_SECRET)
    throw new HttpError(503, "Verification is unavailable.");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`submission:${value}`)
    .digest("hex");
}

export function issueChallenge(): { challenge: string; difficulty: number } {
  const payload = `${randomBytes(24).toString("hex")}.${Date.now() + 10 * 60000}`;
  return {
    challenge: `${payload}.${challengeSignature(payload)}`,
    difficulty: 3,
  };
}

export async function verifyChallenge(
  token: string,
  honeypot: string,
): Promise<void> {
  if (honeypot) throw new HttpError(400, "Submission could not be accepted.");
  const match = /^([a-f0-9]{48})\.(\d{13})\.([a-f0-9]{64})\.(\d{1,10})$/.exec(
    token,
  );
  if (!match)
    throw new HttpError(
      400,
      "Complete the submission check before continuing.",
    );
  const [, nonce, expiresAt, signature, counter] = match;
  const payload = `${nonce}.${expiresAt}`;
  const expected = Buffer.from(challengeSignature(payload), "hex");
  if (
    !timingSafeEqual(expected, Buffer.from(signature, "hex")) ||
    Number(expiresAt) < Date.now() ||
    Number(expiresAt) > Date.now() + 10 * 60000
  )
    throw new HttpError(400, "Submission check expired. Please try again.");
  const proof = createHash("sha256")
    .update(`${payload}.${signature}:${counter}`)
    .digest("hex");
  if (!proof.startsWith("000"))
    throw new HttpError(400, "Submission check failed. Please try again.");
  await rateLimit(`challenge-used:${nonce}`, 1, 600);
}

export async function readText(
  request: Request,
  maxBytes = 150000,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson(
  request: Request,
  maxBytes = 150000,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Expected a JSON request.");
  const raw = await readText(request, maxBytes);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export async function readForm(
  request: Request,
  maxBytes = 16 * 1024 * 1024,
): Promise<FormData> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new HttpError(415, "Expected a multipart form.");
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new HttpError(413, "Attachments are too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Form is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Attachments are too large.");
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw new HttpError(400, "The form could not be read.");
  }
}
