import { db } from "@/lib/db";
import { listingDiscordUrl } from "@/lib/discord-listings/contracts";

export async function ListingDiscordReview({
  kind,
  entityId,
}: {
  kind: "guild" | "group";
  entityId: string;
}): Promise<React.JSX.Element | null> {
  const job = await db.foreverListingDiscordJob.findUnique({
    where: { kind_entityId: { kind, entityId } },
  });
  if (!job) return null;
  return (
    <div className="inline-note">
      <p>
        <strong>Discord delivery: {job.status}</strong>
      </p>
      <p>
        Website listings publish immediately. Review the submitted details, then
        use the status control below to keep, hide, or reject this entry.
      </p>
      <p>
        Owner notification: <strong>{job.reviewNotificationStatus}</strong>
        {job.reviewNotifiedAt && ` · ${job.reviewNotifiedAt.toISOString()}`}
      </p>
      {job.threadId && (
        <p>
          <a
            href={listingDiscordUrl(job.threadId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Discord forum post
          </a>
        </p>
      )}
      {job.lastError && <p role="status">{job.lastError}</p>}
      {job.reviewNotificationError && (
        <p role="status">{job.reviewNotificationError}</p>
      )}
      <small>Delivery reference: {job.id}</small>
    </div>
  );
}

export async function ListingDiscordHealth(): Promise<React.JSX.Element> {
  const rows = await db.$queryRaw<
    Array<{ checkedAt: Date; status: string; stale: boolean }>
  >`
    SELECT "checkedAt","status","checkedAt"<NOW()-INTERVAL '3 minutes' AS stale
    FROM "ForeverListingDiscordHealth" WHERE "id"='listings'
  `;
  const health = rows[0];
  const unavailable = !health || health.stale;
  return (
    <p role="status" className="inline-note">
      Discord synchronization:{" "}
      {unavailable
        ? "Worker has not checked in recently. Submissions remain queued."
        : health.status}{" "}
      {health && `Last check: ${health.checkedAt.toISOString()}`}
    </p>
  );
}
