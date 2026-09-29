import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { HttpError } from "@/lib/security";

const storageRoot = path.resolve(process.cwd(), ".data/private");
const s3 = process.env.S3_BUCKET
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "auto",
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    })
  : null;

function localPath(key: string): string {
  if (!/^[a-z0-9-]+\.(png|zip)$/.test(key))
    throw new HttpError(400, "Invalid storage identifier.");
  return path.join(storageRoot, key);
}
export async function storeBytes(
  bytes: Buffer,
  extension: "png" | "zip",
  mime: string,
): Promise<string> {
  const key = `${randomUUID()}.${extension}`;
  if (s3)
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `forever/${key}`,
        Body: bytes,
        ContentType: mime,
      }),
    );
  else {
    await mkdir(storageRoot, { recursive: true, mode: 0o700 });
    await writeFile(localPath(key), bytes, { mode: 0o600 });
  }
  return key;
}
export async function readStored(key: string): Promise<Buffer> {
  if (s3) {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `forever/${key}`,
      }),
    );
    if (!result.Body) throw new HttpError(404, "File not found.");
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(localPath(key));
}
export async function deleteStored(key: string): Promise<void> {
  if (s3)
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `forever/${key}`,
      }),
    );
  else
    await unlink(localPath(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
}
export async function storeEvidence(file: File): Promise<{
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
}> {
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new HttpError(
      400,
      "Evidence images must be between 1 byte and 5 MB.",
    );
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new HttpError(400, "Use PNG, JPEG, or WebP images.");
  let bytes: Buffer;
  try {
    // Decode and re-encode to strip metadata and reject disguised or malformed files.
    bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
    })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch {
    throw new HttpError(400, "This evidence image could not be read.");
  }
  if (bytes.length > 10 * 1024 * 1024)
    throw new HttpError(400, "Evidence image is too large after processing.");
  return {
    storageKey: await storeBytes(bytes, "png", "image/png"),
    name: "Evidence screenshot",
    mimeType: "image/png",
    size: bytes.length,
  };
}
