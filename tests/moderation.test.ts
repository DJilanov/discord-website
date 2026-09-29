import "../scripts/env";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { db } from "../lib/db";
import { HttpError, issueChallenge } from "../lib/security";
import { submitReport, submitAppeal } from "../lib/submissions";
import { reviewReport, reviewAppeal } from "../lib/moderation";
import { getSafetyExport } from "../lib/safety-export";
import { deleteStored } from "../lib/storage";
import type { Staff } from "../lib/auth";

after(async () => {
  await db.$disconnect();
});

function proof(): string {
  const { challenge } = issueChallenge();
  let counter = 0;
  while (
    !createHash("sha256")
      .update(`${challenge}:${counter}`)
      .digest("hex")
      .startsWith("000")
  )
    counter++;
  return `${challenge}.${counter}`;
}

test("private evidence, two-person publication, stale edits, suspension and independent appeal", async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL || "").port,
    "55432",
    "Local database only.",
  );
  const staff = (id: string): Staff => ({
    id: `test-${id}`,
    name: id,
    role: "moderator",
    email: `${id}@example.invalid`,
  });
  const first = staff("first"),
    second = staff("second"),
    independent = staff("independent");
  let reportId: string | undefined;
  let appealId: string | undefined;
  const evidenceKeys: string[] = [];
  try {
    const image = await sharp({
      create: { width: 80, height: 80, channels: 3, background: "#222222" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set("challenge", proof());
    form.set(
      "payload",
      JSON.stringify({
        reporterDiscord: "test-reporter",
        reporterCharacter: "TestReporter",
        character: "TestCharacter",
        realm: "TestRealm",
        region: "EU",
        faction: "Alliance",
        category: "Other",
        incidentAt: new Date().toISOString(),
        description:
          "This is a local automated regression fixture verifying the full private moderation flow, not a real player report.",
        consent: true,
      }),
    );
    form.append(
      "evidence",
      new File([new Uint8Array(image)], "private.png", { type: "image/png" }),
    );
    const receipt = await submitReport(form, "test-integration");
    const report = await db.foreverReport.findUniqueOrThrow({
      where: { publicId: receipt.reference },
      include: { evidence: true },
    });
    reportId = report.id;
    evidenceKeys.push(...report.evidence.map((file) => file.storageKey));
    assert.equal(report.evidence.length, 1);
    assert.notEqual(report.accessTokenHash, receipt.token);
    assert.equal(
      (await getSafetyExport()).entries.some(
        (item) => item.id === report.publicId,
      ),
      false,
    );
    const review = {
      reason: "Documented local regression test review.",
      summary: "A neutral summary approved by two independent test reviewers.",
      severity: 3,
      expiresInDays: 30,
    };
    await reviewReport(
      report.id,
      { ...review, version: 1, action: "under_review" },
      first,
    );
    await assert.rejects(
      reviewReport(
        report.id,
        { ...review, version: 1, action: "approve_public" },
        first,
      ),
      (error: unknown) => error instanceof HttpError && error.status === 409,
    );
    await reviewReport(
      report.id,
      { ...review, version: 2, action: "approve_public" },
      first,
    );
    await assert.rejects(
      reviewReport(
        report.id,
        { ...review, version: 3, action: "publish" },
        first,
      ),
      (error: unknown) => error instanceof HttpError && error.status === 403,
    );
    await assert.rejects(
      reviewReport(
        report.id,
        {
          ...review,
          summary: "Changed after approval without a new review.",
          version: 3,
          action: "publish",
        },
        second,
      ),
      (error: unknown) => error instanceof HttpError && error.status === 409,
    );
    await reviewReport(
      report.id,
      { ...review, version: 3, action: "publish" },
      second,
    );
    const exported = (await getSafetyExport()).entries.find(
      (item) => item.id === report.publicId,
    );
    assert.ok(exported);
    assert.equal("reporterDiscord" in exported, false);
    assert.equal("evidence" in exported, false);
    const appealForm = new FormData();
    appealForm.set("challenge", proof());
    appealForm.set(
      "payload",
      JSON.stringify({
        reportPublicId: report.publicId,
        appellantDiscord: "test-appellant",
        character: "TestCharacter",
        explanation:
          "This automated test appeal supplies additional local fixture context to exercise suspension and independent review.",
        requestedOutcome: "Remove alert",
        consent: true,
      }),
    );
    const appealReceipt = await submitAppeal(appealForm, "test-integration");
    const appeal = await db.foreverAppeal.findUniqueOrThrow({
      where: { publicId: appealReceipt.reference },
    });
    appealId = appeal.id;
    assert.equal(
      (await getSafetyExport()).entries.some(
        (item) => item.id === report.publicId,
      ),
      false,
    );
    const outcome = {
      version: 1,
      status: "removed",
      severity: 3,
      reason: "Independent review overturns this local fixture decision.",
    };
    await assert.rejects(
      reviewAppeal(appeal.id, outcome, first),
      (error: unknown) => error instanceof HttpError && error.status === 403,
    );
    await assert.rejects(
      reviewAppeal(appeal.id, outcome, second),
      (error: unknown) => error instanceof HttpError && error.status === 403,
    );
    await reviewAppeal(appeal.id, outcome, independent);
    assert.equal(
      (await db.foreverReport.findUniqueOrThrow({ where: { id: report.id } }))
        .status,
      "overturned",
    );
    assert.equal(
      (await getSafetyExport()).entries.some(
        (item) => item.id === report.publicId,
      ),
      false,
    );
  } finally {
    if (reportId) {
      const ids = [reportId, ...(appealId ? [appealId] : [])];
      await db.foreverEvidence.deleteMany({ where: { reportId } });
      await db.foreverSafetyAlert.deleteMany({ where: { reportId } });
      await db.foreverAppeal.deleteMany({ where: { reportId } });
      await db.foreverReport.delete({ where: { id: reportId } });
      await db.foreverAuditLog.deleteMany({ where: { entityId: { in: ids } } });
      await db.foreverWebhookJob.deleteMany({
        where: { entityId: { in: ids } },
      });
    }
    for (const key of evidenceKeys) await deleteStored(key);
  }
});
