import { jsonChecksum } from "./json";

interface PolicyEvent {
  requestHash: string;
  policyRevision: number;
  catalog: { checksum: string } | null;
}

export function eventPolicyChecksum(event: PolicyEvent): string {
  return jsonChecksum({
    requestHash: event.requestHash,
    catalogChecksum: event.catalog?.checksum ?? null,
    // Preserve acknowledgements on events created before settings became editable.
    ...(event.policyRevision > 0
      ? { policyRevision: event.policyRevision }
      : {}),
  });
}
