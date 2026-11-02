import { z } from "zod";
import { kfcAccessDefaultChannels, kfcAccessIds } from "../content/kfc-access";
import { routeRaidOnboarding } from "./kfc-revision";
import type { DiscordAuditSnapshot } from "./discord-audit";
import type { RaidingConfig } from "./kfc-raiding/contracts";
import { assertRaidDiscoveryAccess } from "./kfc-raiding/newcomer-content";

export function kfcAccessOnboarding(
  snapshot: DiscordAuditSnapshot,
  raw: unknown,
  config: RaidingConfig,
  raidLobbyId: string,
): Record<string, unknown> {
  if (!snapshot.guild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED"))
    throw new Error(
      "Enable and verify native Rules Screening before changing the entry flow.",
    );
  const desired = {
    ...routeRaidOnboarding(raw, config),
    default_channel_ids: kfcAccessDefaultChannels(raidLobbyId),
  };
  const parsed = z
    .object({
      enabled: z.boolean(),
      prompts: z.array(
        z.object({
          options: z.array(z.object({ role_ids: z.array(z.string()) })),
        }),
      ),
    })
    .parse(desired);
  if (!parsed.enabled)
    throw new Error(
      "Native onboarding must already be enabled for this repair.",
    );
  for (const prompt of parsed.prompts)
    for (const option of prompt.options)
      for (const id of option.role_ids) {
        const role = snapshot.roles.find((item) => item.id === id);
        if (
          !role ||
          role.managed ||
          BigInt(role.permissions) !== 0n ||
          id === kfcAccessIds.certified ||
          id === kfcAccessIds.verified
        )
          throw new Error(
            "Onboarding interests cannot grant access or privileged roles.",
          );
      }
  assertRaidDiscoveryAccess(snapshot.channels, snapshot.roles, desired, config);
  return desired;
}
