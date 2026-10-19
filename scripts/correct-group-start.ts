import "./env";
import { config } from "dotenv";
import { parseArgs } from "node:util";
import { z } from "zod";
import { db } from "../lib/db";
import {
  groupListingDraft,
  listingBotId,
  listingMessageSchema,
  type ListingJob,
} from "../lib/discord-listings/contracts";
import { validateListingThread } from "../lib/discord-listings/engine";
import { listingRequest } from "../lib/discord-listings/transport";
import { resolveGroupStart } from "../lib/group-time";
import { groupSchema } from "../lib/validation";

async function editStarter(
  token: string,
  threadId: string,
  content: string,
): Promise<void> {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${threadId}/messages/${threadId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`discord_edit_${response.status}`);
  }
  const text = await response.text();
  if (text.length > 1048576) throw new Error("discord_response_too_large");
  const message = listingMessageSchema.parse(JSON.parse(text) as unknown);
  if (
    message.id !== threadId ||
    message.channel_id !== threadId ||
    message.author.id !== listingBotId ||
    message.content !== content
  )
    throw new Error("discord_edit_identity_mismatch");
}

async function main(): Promise<void> {
  config({
    path: process.env.LISTINGS_ENV_FILE ?? ".env.listings",
    quiet: true,
  });
  const args = parseArgs({
    options: {
      id: { type: "string" },
      local: { type: "string" },
      apply: { type: "boolean", default: false },
    },
  });
  const id = z.string().min(10).max(100).parse(args.values.id);
  const localStart = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .parse(args.values.local);
  const token = z.string().min(30).parse(process.env.LISTINGS_BOT_TOKEN);
  const group = await db.foreverGroup.findUniqueOrThrow({ where: { id } });
  const parsed = groupSchema.parse({ ...group, startsAt: localStart });
  const startsAt = resolveGroupStart(localStart, group.region);
  const duration = group.expiresAt.getTime() - group.startsAt.getTime();
  if (duration <= 0 || duration > 24 * 3600000)
    throw new Error("unexpected_group_duration");
  const record = await db.foreverListingDiscordJob.findUniqueOrThrow({
    where: { kind_entityId: { kind: "group", entityId: id } },
  });
  if (record.kind !== "group" || record.status !== "posted" || !record.threadId)
    throw new Error("group_listing_is_not_a_linked_post");
  const threadId = record.threadId;
  const job: ListingJob = { ...record, kind: "group" };
  const draft = groupListingDraft(
    { ...parsed, startsAt: startsAt.toISOString() },
    group.id,
  );
  if (
    draft.forumId !== job.forumId ||
    draft.title !== job.title ||
    job.attachment ||
    draft.attachment
  )
    throw new Error("group_listing_edit_requires_manual_reconciliation");
  const request = listingRequest(token);
  await request("/users/@me");
  await validateListingThread(request, job, threadId);
  if (!args.values.apply) {
    console.log(
      `Validated ${group.id}: ${group.startsAt.toISOString()} -> ${startsAt.toISOString()}. Re-run with --apply while the listings worker is stopped.`,
    );
    return;
  }
  await editStarter(token, threadId, draft.content);
  try {
    await db.$transaction(async (tx) => {
      const updatedGroup = await tx.foreverGroup.updateMany({
        where: { id: group.id, startsAt: group.startsAt },
        data: {
          startsAt,
          expiresAt: new Date(startsAt.getTime() + duration),
        },
      });
      const updatedJob = await tx.foreverListingDiscordJob.updateMany({
        where: { id: job.id, content: job.content, threadId: job.threadId },
        data: { content: draft.content, lastError: null },
      });
      if (updatedGroup.count !== 1 || updatedJob.count !== 1)
        throw new Error("group_listing_changed_during_correction");
      await tx.foreverAuditLog.create({
        data: {
          actorId: "operator:group-time-correction",
          action: "schedule_corrected",
          entityType: "group",
          entityId: group.id,
          details: {
            previousStartsAt: group.startsAt.toISOString(),
            startsAt: startsAt.toISOString(),
            region: group.region,
            threadId,
          },
        },
      });
    });
  } catch (error) {
    try {
      await editStarter(token, threadId, job.content);
    } catch {
      throw new Error("database_update_and_discord_rollback_failed");
    }
    throw error;
  }
  console.log(
    `Corrected ${group.id} and its Discord starter to ${startsAt.toISOString()}.`,
  );
}

void main()
  .catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : "Correction failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
