import { z } from "zod";
import { db } from "@/lib/db";
import {
  appealSchema,
  groupSchema,
  guildSchema,
  reportSchema,
} from "@/lib/validation";
import {
  HttpError,
  newAccessToken,
  publicId,
  tokenHash,
  verifyChallenge,
} from "@/lib/security";
import { deleteStored, storeEvidence } from "@/lib/storage";

export const submissionEnvelope = z.object({
  payload: z.unknown(),
  challenge: z.string().max(4096).default(""),
  website: z.string().max(1000).default(""),
});

export async function submitGuild(
  raw: unknown,
  ip: string,
): Promise<{ message: string }> {
  const envelope = submissionEnvelope.parse(raw);
  await verifyChallenge(envelope.challenge, envelope.website);
  const data = guildSchema.parse(envelope.payload);
  const slug = `${
    data.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "guild"
  }-${publicId("g").slice(2, 10).toLowerCase()}`;
  await db.foreverGuild.create({
    data: {
      ...data,
      slug,
      submittedIpHash: ip,
      inviteUrl: data.inviteUrl || null,
      websiteUrl: data.websiteUrl || null,
    },
  });
  return {
    message:
      "Your guild has been submitted for review. It will appear in the directory after approval. Staff can reach you through the Discord contact you provided.",
  };
}

export async function submitGroup(
  raw: unknown,
  ip: string,
): Promise<{ message: string }> {
  const envelope = submissionEnvelope.parse(raw);
  await verifyChallenge(envelope.challenge, envelope.website);
  const data = groupSchema.parse(envelope.payload);
  const startsAt = new Date(data.startsAt);
  await db.foreverGroup.create({
    data: {
      ...data,
      startsAt,
      expiresAt: new Date(startsAt.getTime() + 6 * 3600000),
      submittedIpHash: ip,
    },
  });
  return {
    message:
      "Your group is waiting for review. Approved posts remain visible until six hours after their start time.",
  };
}

function parsePayload(form: FormData): unknown {
  const payload = form.get("payload");
  if (typeof payload !== "string" || payload.length > 30000)
    throw new HttpError(400, "Invalid report details.");
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new HttpError(400, "Invalid report details.");
  }
}

async function prepareEvidence(
  form: FormData,
  required: boolean,
): Promise<Awaited<ReturnType<typeof storeEvidence>>[]> {
  const files = form
    .getAll("evidence")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if ((required && !files.length) || files.length > 3)
    throw new HttpError(400, "Attach between one and three evidence images.");
  const stored: Awaited<ReturnType<typeof storeEvidence>>[] = [];
  try {
    for (const file of files) stored.push(await storeEvidence(file));
    return stored;
  } catch (error) {
    await Promise.allSettled(
      stored.map((file) => deleteStored(file.storageKey)),
    );
    throw error;
  }
}

export async function submitReport(
  form: FormData,
  ip: string,
): Promise<{ message: string; reference: string; token: string }> {
  await verifyChallenge(
    String(form.get("challenge") || ""),
    String(form.get("website") || ""),
  );
  const parsed = reportSchema.parse(parsePayload(form));
  const data = {
    reporterDiscord: parsed.reporterDiscord,
    reporterCharacter: parsed.reporterCharacter,
    character: parsed.character,
    realm: parsed.realm,
    region: parsed.region,
    guild: parsed.guild,
    faction: parsed.faction,
    category: parsed.category,
    incidentAt: parsed.incidentAt,
    description: parsed.description,
    lootRules: parsed.lootRules,
  };
  const duplicate = await db.foreverReport.findFirst({
    where: {
      submittedIpHash: ip,
      reporterDiscord: data.reporterDiscord,
      character: data.character,
      realm: data.realm,
      region: data.region,
      createdAt: { gt: new Date(Date.now() - 3600000) },
    },
  });
  if (duplicate)
    throw new HttpError(
      409,
      "A report for this character was recently submitted from your connection. Keep the original reference and contact staff with additional context.",
    );
  const stored = await prepareEvidence(form, true),
    token = newAccessToken(),
    reference = publicId();
  try {
    await db.$transaction(async (tx) => {
      const report = await tx.foreverReport.create({
        data: {
          ...data,
          incidentAt: new Date(data.incidentAt),
          publicId: reference,
          accessTokenHash: tokenHash(token),
          submittedIpHash: ip,
          evidencePurgeAt: new Date(Date.now() + 180 * 86400000),
          evidence: { create: stored },
        },
      });
      await tx.foreverWebhookJob.create({
        data: { kind: "report", entityId: report.id },
      });
    });
  } catch (error) {
    await Promise.allSettled(
      stored.map((file) => deleteStored(file.storageKey)),
    );
    throw error;
  }
  return {
    message:
      "Your report is private and has been sent to the moderation queue. Keep this reference and access key to check its status.",
    reference,
    token,
  };
}

export async function submitAppeal(
  form: FormData,
  ip: string,
): Promise<{ message: string; reference: string; token: string }> {
  await verifyChallenge(
    String(form.get("challenge") || ""),
    String(form.get("website") || ""),
  );
  const parsed = appealSchema.parse(parsePayload(form));
  const { reportPublicId, ...data } = appealSchema
    .omit({ consent: true })
    .parse(parsed);
  const report = await db.foreverReport.findUnique({
    where: { publicId: reportPublicId },
  });
  if (!report)
    throw new HttpError(
      400,
      "This case could not be found. Check the reference or contact a moderator.",
    );
  const stored = await prepareEvidence(form, false),
    token = newAccessToken(),
    reference = publicId("FA");
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ForeverReport" WHERE "id" = ${report.id} FOR UPDATE`;
      const existing = await tx.foreverAppeal.findFirst({
        where: {
          reportId: report.id,
          status: { in: ["submitted", "under_review"] },
        },
      });
      if (existing)
        throw new HttpError(
          409,
          "This case already has an appeal under review. Contact staff to add further evidence.",
        );
      const appeal = await tx.foreverAppeal.create({
        data: {
          ...data,
          reportId: report.id,
          publicId: reference,
          accessTokenHash: tokenHash(token),
          submittedIpHash: ip,
        },
      });
      if (stored.length)
        await tx.foreverEvidence.createMany({
          data: stored.map((item) => ({
            ...item,
            reportId: report.id,
            appealId: appeal.id,
          })),
        });
      await tx.foreverReport.update({
        where: { id: report.id },
        data: {
          status: "appealed",
          evidencePurgeAt: new Date(Date.now() + 180 * 86400000),
          version: { increment: 1 },
        },
      });
      await tx.foreverSafetyAlert.updateMany({
        where: { reportId: report.id },
        data: { appealStatus: "pending", active: false },
      });
      await tx.foreverAuditLog.create({
        data: {
          actorId: "appellant",
          entityType: "appeal",
          entityId: appeal.id,
          action: "submitted",
          details: { reportId: report.id, alertSuspended: true },
        },
      });
      await tx.foreverWebhookJob.create({
        data: { kind: "appeal", entityId: appeal.id },
      });
    });
  } catch (error) {
    await Promise.allSettled(
      stored.map((file) => deleteStored(file.storageKey)),
    );
    throw error;
  }
  return {
    message:
      "Your appeal is private. Any related public alert is suspended during review. Keep your reference and access key.",
    reference,
    token,
  };
}
