import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(value: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error("bridge_key_not_configured");
  return Buffer.from(value, "hex");
}
export function encryptToken(
  token: string,
  secret: string,
  interactionId: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(interactionId));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}
export function decryptToken(
  value: string,
  secret: string,
  interactionId: string,
): string {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new Error("invalid_bridge_token");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    data.subarray(0, 12),
  );
  decipher.setAAD(Buffer.from(interactionId));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
