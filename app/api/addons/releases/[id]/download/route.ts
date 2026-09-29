import { db } from "@/lib/db";
import { readStored } from "@/lib/storage";
import { apiError } from "@/lib/api";
import { HttpError, ipHash, rateLimit } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await rateLimit(`download:${ipHash(request.headers)}`, 30, 3600);
    const release = await db.foreverAddonRelease.findUnique({
      where: { id: (await params).id },
    });
    if (!release || release.status !== "published")
      throw new HttpError(404, "This release is not available.");
    const bytes = await readStored(release.storageKey);
    await db.foreverAddonRelease.update({
      where: { id: release.id },
      data: { downloadCount: { increment: 1 } },
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=ForeverGuard-${release.version}.zip`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        "X-Content-SHA256": release.sha256,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
