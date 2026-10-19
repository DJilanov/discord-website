import { kfcGuildId, kfcRulesId } from "../content/kfc-community";

export const retiredRulesIds = [
  "1411545590692712468",
  "1424953185260408833",
] as const;
export function assertRulesDeletion(
  id: string,
  references: Readonly<Record<string, string | null>>,
  onboardingIds: readonly string[],
): void {
  if (
    !retiredRulesIds.some((target): boolean => target === id) ||
    id === kfcRulesId ||
    id === kfcGuildId
  )
    throw new Error(
      "Only the two owner-approved duplicate rules channels may be deleted.",
    );
  if (references.rules_channel_id !== kfcRulesId)
    throw new Error("Official rules changed; no deletion is allowed.");
  if (Object.values(references).includes(id) || onboardingIds.includes(id))
    throw new Error(
      "A retained Discord configuration still references this channel.",
    );
}
