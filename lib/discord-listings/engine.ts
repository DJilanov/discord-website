import { z } from "zod";
import {
  listingBotId,
  listingForumIds,
  listingForumSchema,
  listingMessageSchema,
  listingReviewNonce,
  listingReviewNotification,
  listingThreadSchema,
  type ListingJob,
} from "./contracts";
import {
  ListingDiscordError,
  type ListingRequest,
  type ListingReviewNotifier,
} from "./transport";
import type { ListingStore } from "./store";

export async function listingForum(
  request: ListingRequest,
  forumId: string,
): Promise<z.infer<typeof listingForumSchema>> {
  if (!listingForumIds.includes(forumId))
    throw new Error("listing_forum_out_of_scope");
  const parsed = listingForumSchema.safeParse(
    await request(`/channels/${forumId}`),
  );
  if (!parsed.success) throw new Error("listing_forum_identity_mismatch");
  const forum = parsed.data;
  if (forum.id !== forumId) throw new Error("listing_forum_identity_mismatch");
  return forum;
}

export async function validateListingThread(
  request: ListingRequest,
  job: ListingJob,
  threadId: string,
): Promise<z.infer<typeof listingThreadSchema>> {
  const parsedThread = listingThreadSchema.safeParse(
    await request(`/channels/${threadId}`),
  );
  if (!parsedThread.success)
    throw new Error("listing_thread_identity_mismatch");
  const thread = parsedThread.data;
  if (thread.id !== threadId || thread.parent_id !== job.forumId)
    throw new Error("listing_thread_identity_mismatch");
  const parsedMessage = listingMessageSchema.safeParse(
    await request(`/channels/${threadId}/messages/${threadId}`),
  );
  if (!parsedMessage.success)
    throw new Error("listing_starter_identity_mismatch");
  const message = parsedMessage.data;
  if (
    message.id !== threadId ||
    message.channel_id !== threadId ||
    message.author.id !== listingBotId ||
    message.content !== job.content ||
    (job.attachment &&
      !message.attachments.some((file) => file.filename === "listing.txt"))
  )
    throw new Error("listing_starter_identity_mismatch");
  return thread;
}

export async function deliverListing(
  request: ListingRequest,
  store: ListingStore,
  job: ListingJob,
): Promise<void> {
  if (job.status !== "queued") return;
  const state = await store.state(job);
  if (
    !state ||
    ["hidden", "rejected", "expired"].includes(state.status) ||
    (state.startsAt && state.startsAt <= new Date())
  ) {
    await store.update(job, {
      status:
        state?.startsAt && state.startsAt <= new Date() ? "expired" : "removed",
      lastError: "Listing no longer eligible for Discord delivery",
    });
    return;
  }
  const forum = await listingForum(request, job.forumId);
  const tags = forum.available_tags
    .filter((tag) => job.tagNames.includes(tag.name))
    .map((tag) => tag.id)
    .slice(0, 5);
  await store.update(job, {
    status: "posting",
    lastError: null,
  });
  try {
    const result = listingThreadSchema.parse(
      await request(
        `/channels/${job.forumId}/threads`,
        "POST",
        {
          name: job.title,
          applied_tags: tags,
          auto_archive_duration: 10080,
          message: {
            content: job.content,
            allowed_mentions: { parse: [] },
            flags: 4096,
            ...(job.attachment
              ? { attachments: [{ id: 0, filename: "listing.txt" }] }
              : {}),
          },
        },
        job.attachment ?? undefined,
      ),
    );
    if (result.parent_id !== job.forumId)
      throw new Error("listing_created_thread_mismatch");
    await store.update(job, {
      status: "posted",
      threadId: result.id,
      lastError: null,
    });
  } catch (error) {
    const rejected =
      error instanceof ListingDiscordError &&
      error.status >= 400 &&
      error.status < 500;
    await store.update(job, {
      status: rejected
        ? error.status === 429
          ? "queued"
          : "failed"
        : "uncertain",
      lastError: rejected
        ? `Discord rejected delivery (${error.status}); check permissions or retry after correction.`
        : "Delivery uncertain. Reconcile the existing Discord post before any retry.",
    });
  }
}

export async function notifyListingReviewer(
  notify: ListingReviewNotifier,
  store: ListingStore,
  job: ListingJob,
): Promise<void> {
  if (job.reviewNotificationStatus !== "queued") return;
  if (!(await store.beginNotification(job))) return;
  try {
    const receipt = await notify(
      listingReviewNotification(job),
      listingReviewNonce(job.id),
    );
    await store.completeNotification(job, receipt.messageId);
  } catch (error) {
    const terminal =
      job.reviewNotificationAttempts >= 5 ||
      (error instanceof ListingDiscordError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429);
    const detail =
      error instanceof ListingDiscordError
        ? `Discord rejected the review notification (${error.status}).`
        : "Discord review notification failed before confirmation.";
    await store.failNotification(job, detail, terminal);
  }
}

export async function syncListing(
  request: ListingRequest,
  store: ListingStore,
  job: ListingJob,
): Promise<void> {
  if (!job.threadId) throw new Error("listing_link_missing");
  const state = await store.state(job);
  if (
    !state ||
    ["hidden", "expired", "rejected"].includes(state.status) ||
    (state.startsAt && state.startsAt <= new Date())
  ) {
    if (state?.status === "approved")
      await store.withdraw(job, "Listing expired");
    await store.update(job, {
      status:
        state?.startsAt && state.startsAt <= new Date() ? "expired" : "removed",
      lastError: null,
    });
    return;
  }
  if (state.status !== "approved") return;
  try {
    const forum = await listingForum(request, job.forumId);
    const thread = await validateListingThread(request, job, job.threadId);
    const closed =
      job.kind === "group" &&
      forum.available_tags.some(
        (tag) =>
          ["Full", "In progress", "Completed", "Cancelled"].includes(
            tag.name,
          ) && thread.applied_tags.includes(tag.id),
      );
    if (closed) {
      await store.withdraw(job, "Discord group is closed");
      await store.update(job, { status: "removed" });
      return;
    }
    await store.update(job, { lastError: null });
  } catch (error) {
    if (error instanceof ListingDiscordError && error.status === 404) {
      await store.withdraw(job, "Discord post or starter message was deleted");
      await store.update(job, { status: "removed" });
    } else if (
      error instanceof Error &&
      [
        "listing_thread_identity_mismatch",
        "listing_starter_identity_mismatch",
        "listing_forum_identity_mismatch",
      ].includes(error.message)
    ) {
      await store.withdraw(
        job,
        "Discord post identity changed; review required",
      );
      await store.update(job, { status: "removed" });
    } else throw error;
  }
}
