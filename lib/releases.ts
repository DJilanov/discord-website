import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Staff } from "@/lib/auth";
import { HttpError, readForm, readJson } from "@/lib/security";
import { deleteStored, storeBytes } from "@/lib/storage";

export function validateAddonArchive(bytes: Uint8Array): void {
  let total = 0,
    count = 0;
  try {
    const files = unzipSync(bytes, {
      filter: (file) => {
        count++;
        total += file.originalSize;
        if (
          count > 100 ||
          total > 25 * 1024 * 1024 ||
          file.originalSize > 10 * 1024 * 1024 ||
          !/^ForeverGuard\/[a-zA-Z0-9_./-]+$/.test(file.name) ||
          file.name.includes("..") ||
          file.name.includes("\\") ||
          !/\.(lua|toc|md|txt|png)$/.test(file.name)
        )
          throw new Error("Invalid archive contents");
        return true;
      },
    });
    if (
      !files["ForeverGuard/ForeverGuard.toc"] ||
      !files["ForeverGuard/ForeverGuard.lua"]
    )
      throw new Error("Missing addon files");
  } catch {
    throw new HttpError(
      400,
      "Upload a valid ForeverGuard ZIP with its TOC and Lua files. No executables or unrelated paths are allowed.",
    );
  }
}

export async function saveRelease(
  id: string | undefined,
  request: Request,
  staff: Staff,
): Promise<void> {
  if (id) {
    const input = z
      .object({ status: z.enum(["draft", "published", "revoked"]) })
      .parse(await readJson(request));
    await db.$transaction(async (tx) => {
      const release = await tx.foreverAddonRelease.findUnique({
        where: { id },
      });
      if (!release) throw new HttpError(404, "Release not found.");
      await tx.foreverAddonRelease.update({
        where: { id },
        data: {
          status: input.status,
          publishedAt:
            input.status === "published"
              ? release.publishedAt || new Date()
              : release.publishedAt,
        },
      });
      await tx.foreverAuditLog.create({
        data: {
          actorId: staff.id,
          entityType: "addon",
          entityId: id,
          action: input.status,
          details: { version: release.version },
        },
      });
    });
    return;
  }
  const form = await readForm(request, 21 * 1024 * 1024);
  const data = z
    .object({
      version: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/),
      channel: z.enum(["alpha", "beta", "stable"]),
      changelog: z.string().trim().min(30).max(20000),
    })
    .parse(Object.fromEntries(form));
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 50 || file.size > 20 * 1024 * 1024)
    throw new HttpError(400, "Upload a ZIP under 20 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  validateAddonArchive(bytes);
  const storageKey = await storeBytes(bytes, "zip", "application/zip");
  try {
    await db.$transaction(async (tx) => {
      const release = await tx.foreverAddonRelease.create({
        data: {
          ...data,
          storageKey,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          size: bytes.length,
        },
      });
      await tx.foreverAuditLog.create({
        data: {
          actorId: staff.id,
          entityType: "addon",
          entityId: release.id,
          action: "uploaded",
          details: { version: release.version, sha256: release.sha256 },
        },
      });
    });
  } catch (error) {
    await deleteStored(storageKey);
    throw error;
  }
}
