import { auditChannelSchema } from "./discord-audit";
import { kfcOverwriteFingerprint, type KfcAccessPatch } from "./kfc-access";

export interface KfcAccessWriter {
  request(
    route: string,
    method: "GET" | "PATCH",
    body?: unknown,
  ): Promise<unknown>;
  journal(record: Record<string, unknown>): Promise<void>;
}

export async function applyKfcAccessPatches(
  patches: readonly KfcAccessPatch[],
  writer: KfcAccessWriter,
): Promise<number> {
  let changed = 0;
  // Privacy repairs precede entry-point changes even when Discord returns channels in another order.
  const ordered = [...patches].sort(
    (a, b) =>
      Number(b.scope === "guild" || b.scope === "staff") -
      Number(a.scope === "guild" || a.scope === "staff"),
  );
  for (const patch of ordered) {
    const route = `/channels/${patch.channelId}`;
    const current = auditChannelSchema.parse(
      await writer.request(route, "GET"),
    );
    if (
      current.id !== patch.channelId ||
      current.type !== patch.channelType ||
      current.parent_id !== patch.parentId
    )
      throw new Error("Access destination moved or changed since preview.");
    const actual = kfcOverwriteFingerprint(current.permission_overwrites);
    const desired = kfcOverwriteFingerprint(patch.after);
    if (actual === desired) continue;
    if (actual !== kfcOverwriteFingerprint(patch.before))
      throw new Error(
        `Access overwrites changed since preview: ${patch.channelId}`,
      );
    await writer.journal({
      operation: "access-patch-intent",
      channelId: patch.channelId,
      scope: patch.scope,
      before: patch.before,
      after: patch.after,
    });
    await writer.request(route, "PATCH", {
      permission_overwrites: patch.after,
    });
    const after = auditChannelSchema.parse(await writer.request(route, "GET"));
    if (
      after.id !== patch.channelId ||
      after.type !== patch.channelType ||
      after.parent_id !== patch.parentId ||
      kfcOverwriteFingerprint(after.permission_overwrites) !== desired
    )
      throw new Error(`Access readback mismatch: ${patch.channelId}`);
    await writer.journal({
      operation: "access-patch-verified",
      channelId: patch.channelId,
      checksum: desired,
    });
    changed++;
  }
  return changed;
}
