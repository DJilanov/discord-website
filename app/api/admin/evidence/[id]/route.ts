import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { readStored } from "@/lib/storage";
import { apiError } from "@/lib/api";
import { HttpError } from "@/lib/security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const staff = await requireStaff(["owner", "admin", "moderator"]);
    const evidence = await db.foreverEvidence.findUnique({
      where: { id: (await params).id },
      include: { report: { select: { evidencePurgeAt: true } } },
    });
    if (!evidence || evidence.report.evidencePurgeAt < new Date())
      throw new HttpError(
        404,
        "Evidence is unavailable or its retention period ended.",
      );
    const bytes = await readStored(evidence.storageKey);
    await db.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        action: "viewed",
        entityType: "evidence",
        entityId: evidence.id,
        details: { reportId: evidence.reportId },
      },
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": evidence.mimeType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline; filename=evidence.png",
        "X-Robots-Tag": "noindex, noarchive",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
