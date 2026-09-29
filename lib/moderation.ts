import { z } from "zod";
import { db } from "@/lib/db";
import type { Staff } from "@/lib/auth";
import { HttpError } from "@/lib/security";
import { reviewSchema, appealReviewSchema } from "@/lib/validation";

export function assertReviewTransition(status: string, action: string): void {
  const allowed: Record<string, readonly string[]> = {
    submitted: [
      "under_review",
      "needs_more_evidence",
      "rejected",
      "verified_private",
    ],
    needs_more_evidence: ["under_review", "rejected"],
    under_review: [
      "needs_more_evidence",
      "rejected",
      "verified_private",
      "approve_public",
    ],
    verified_private: ["under_review", "approve_public", "overturned"],
    awaiting_second_review: ["under_review", "publish", "rejected"],
    verified_public: ["overturned"],
    rejected: ["under_review"],
    overturned: ["under_review"],
    expired: ["under_review"],
  };
  if (!allowed[status]?.includes(action))
    throw new HttpError(
      409,
      "This action is not available for the current case status. Reload the case.",
    );
}

export async function reviewReport(
  id: string,
  raw: unknown,
  staff: Staff,
): Promise<void> {
  const input = reviewSchema.parse(raw);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ForeverReport" WHERE "id" = ${id} FOR UPDATE`;
    const report = await tx.foreverReport.findUnique({
      where: { id },
      include: { evidence: true },
    });
    if (!report) throw new HttpError(404, "Case not found.");
    if (report.version !== input.version)
      throw new HttpError(
        409,
        "Another moderator changed this case. Reload before reviewing.",
      );
    assertReviewTransition(report.status, input.action);
    const publishing = input.action === "publish";
    if (
      (publishing || input.action === "approve_public") &&
      (!report.evidence.length || input.summary.length < 30)
    )
      throw new HttpError(
        400,
        "Public alerts require evidence and a neutral summary of at least 30 characters.",
      );
    if (input.assignedTo) {
      const assigned = await tx.foreverUser.findUnique({
        where: { id: input.assignedTo },
      });
      if (
        !assigned?.active ||
        !["owner", "admin", "moderator"].includes(assigned.role)
      )
        throw new HttpError(400, "Choose an active moderator.");
    }
    if (publishing) {
      if (!report.firstReviewerId || report.firstReviewerId === staff.id)
        throw new HttpError(
          403,
          "A different moderator must approve publication.",
        );
      const firstReview = await tx.foreverAuditLog.findFirst({
        where: { entityType: "report", entityId: id, action: "approve_public" },
        orderBy: { createdAt: "desc" },
      });
      const approved = z
        .object({
          summary: z.string(),
          severity: z.number(),
          expiresInDays: z.number(),
        })
        .safeParse(firstReview?.details);
      if (
        !approved.success ||
        approved.data.summary !== input.summary ||
        approved.data.severity !== input.severity ||
        approved.data.expiresInDays !== input.expiresInDays
      )
        throw new HttpError(
          409,
          "Publish the exact summary, severity and duration approved by the first reviewer, or return the case to review.",
        );
      const alertData = {
        publicId: report.publicId,
        character: report.character,
        realm: report.realm,
        region: report.region,
        guild: report.guild,
        category: report.category,
        severity: input.severity,
        summary: input.summary,
        active: true,
        appealStatus: "none",
        lastReviewedAt: new Date(),
        expiresAt: new Date(Date.now() + input.expiresInDays * 86400000),
      };
      await tx.foreverSafetyAlert.upsert({
        where: { reportId: id },
        create: { reportId: id, ...alertData },
        update: alertData,
      });
      await tx.foreverWebhookJob.create({
        data: { kind: "alert", entityId: id },
      });
    }
    if (["overturned", "rejected", "under_review"].includes(input.action))
      await tx.foreverSafetyAlert.updateMany({
        where: { reportId: id },
        data: { active: false },
      });
    const status = publishing
      ? "verified_public"
      : input.action === "approve_public"
        ? "awaiting_second_review"
        : input.action;
    await tx.foreverReport.update({
      where: { id },
      data: {
        status,
        severity: input.severity,
        decisionReason: input.reason,
        reviewedAt: new Date(),
        version: { increment: 1 },
        ...(input.assignedTo !== undefined
          ? { assignedTo: input.assignedTo || null }
          : {}),
        firstReviewerId:
          input.action === "approve_public"
            ? staff.id
            : input.action === "under_review"
              ? null
              : report.firstReviewerId,
      },
    });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        entityType: "report",
        entityId: id,
        action: input.action,
        details: {
          previousStatus: report.status,
          reason: input.reason,
          summary: input.summary,
          severity: input.severity,
          expiresInDays: input.expiresInDays,
        },
      },
    });
  });
}

export async function reviewAppeal(
  id: string,
  raw: unknown,
  staff: Staff,
): Promise<void> {
  const input = appealReviewSchema.parse(raw);
  await db.$transaction(async (tx) => {
    const appealRef = await tx.foreverAppeal.findUnique({
      where: { id },
      select: { reportId: true },
    });
    if (!appealRef) throw new HttpError(404, "Appeal not found.");
    await tx.$queryRaw`SELECT "id" FROM "ForeverReport" WHERE "id" = ${appealRef.reportId} FOR UPDATE`;
    const appeal = await tx.foreverAppeal.findUnique({
      where: { id },
      include: { report: { include: { alert: true } } },
    });
    if (!appeal) throw new HttpError(404, "Appeal not found.");
    if (
      appeal.version !== input.version ||
      !["submitted", "under_review"].includes(appeal.status)
    )
      throw new HttpError(
        409,
        "This appeal changed or is already resolved. Reload before reviewing.",
      );
    const originalReview = await tx.foreverAuditLog.findFirst({
      where: {
        entityType: "report",
        entityId: appeal.reportId,
        actorId: staff.id,
        action: { in: ["approve_public", "publish"] },
      },
    });
    if (originalReview)
      throw new HttpError(
        403,
        "An appeal must be reviewed by a moderator who did not approve the original alert.",
      );
    if (
      ["reduced", "corrected"].includes(input.status) &&
      input.summary.length < 30
    )
      throw new HttpError(400, "Provide a revised neutral summary.");
    if (
      input.status === "corrected" &&
      (input.character.length < 2 || input.realm.length < 2)
    )
      throw new HttpError(400, "Provide the corrected character and realm.");
    if (
      input.status === "reduced" &&
      input.severity >=
        (appeal.report.alert?.severity ?? appeal.report.severity)
    )
      throw new HttpError(400, "A reduced outcome must lower the severity.");
    const pending = input.status === "under_review",
      removed = input.status === "removed";
    await tx.foreverAppeal.update({
      where: { id },
      data: {
        status: input.status,
        decisionReason: input.reason,
        reviewedBy: staff.id,
        version: { increment: 1 },
      },
    });
    if (appeal.report.alert)
      await tx.foreverSafetyAlert.update({
        where: { id: appeal.report.alert.id },
        data: {
          active:
            !pending && !removed && appeal.report.alert.expiresAt > new Date(),
          appealStatus: pending ? "pending" : input.status,
          lastReviewedAt: new Date(),
          ...(["corrected", "reduced"].includes(input.status)
            ? { summary: input.summary }
            : {}),
          ...(input.status === "reduced" ? { severity: input.severity } : {}),
          ...(input.status === "corrected"
            ? { character: input.character, realm: input.realm }
            : {}),
        },
      });
    await tx.foreverReport.update({
      where: { id: appeal.reportId },
      data: {
        status: pending
          ? "appeal_under_review"
          : removed
            ? "overturned"
            : appeal.report.alert
              ? "verified_public"
              : "verified_private",
        reviewedAt: new Date(),
        version: { increment: 1 },
        ...(input.status === "corrected"
          ? { character: input.character, realm: input.realm }
          : {}),
        ...(input.status === "reduced" ? { severity: input.severity } : {}),
      },
    });
    await tx.foreverAuditLog.create({
      data: {
        actorId: staff.id,
        entityType: "appeal",
        entityId: id,
        action: input.status,
        details: {
          reason: input.reason,
          reportId: appeal.reportId,
          previousStatus: appeal.status,
        },
      },
    });
  });
}
