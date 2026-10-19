import {
  kfcClasses,
  kfcCombatRoles,
  kfcGuildId,
  kfcRulesId,
} from "../content/kfc-community";
import {
  newRevisionChannels,
  revisionResources,
  revisionTargets,
} from "../content/kfc-revision";
import {
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { assertKfcScope, kfcWriteMask } from "./kfc-community";

export interface KfcReadinessBindings {
  community: Record<string, string>;
  revision: Record<string, string>;
  shamanId: string;
}

export interface KfcReadinessCheck {
  key: string;
  passed: boolean;
  affectedIds: string[];
}

export interface KfcReadinessReport {
  capturedAt: string;
  automatedChecksPassed: boolean;
  memberProfilesChecked: number;
  checks: KfcReadinessCheck[];
  ownerActions: string[];
  limitations: string[];
}

export const kfcScopedPermissions = 2251808672123952n;
const administrator = 1n << 3n;
const viewHistory = (1n << 10n) | (1n << 16n);
const verifiedId = "1412584499740672051";
const pvpId = "1557974303432118272";
const tbcCategoryId = "1441654698519040114";
const routes: Record<string, string[]> = {
  "TBC raids": ["1460899582824153140", "1411592694404218991"],
  "WoW Forever": [
    "1548519535177629707",
    "1548747530790248610",
    "1550970060812587028",
  ],
  "TBC PvP": [pvpId, "1463110825790148639", "1463605381342429195"],
  "Forever PvP": [pvpId, "1548519535177629707"],
  "Friends / still deciding": ["1412553351874215976"],
};

function sameIds(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((id): boolean => expected.includes(id))
  );
}

export function analyzeKfcReadiness(
  snapshot: DiscordAuditSnapshot,
  bindings: KfcReadinessBindings,
): KfcReadinessReport {
  assertKfcScope(snapshot);
  const checks: KfcReadinessCheck[] = [];
  function check(key: string, affectedIds: string[]): void {
    checks.push({
      key,
      passed: affectedIds.length === 0,
      affectedIds: [...new Set(affectedIds)],
    });
  }
  const channels = new Map(
    snapshot.channels.map((channel) => [channel.id, channel]),
  );
  const roles = new Map(snapshot.roles.map((role) => [role.id, role]));
  const interestRoles = [
    ...kfcClasses.map((entry): string => entry[1]),
    bindings.shamanId,
    ...kfcCombatRoles.map((entry): string => entry[1]),
  ].filter((id): id is string => Boolean(id));
  const profiles = [
    [],
    ...interestRoles.map((id): string[] => [id]),
    interestRoles,
    [verifiedId],
    [verifiedId, ...interestRoles],
    ["1411704763636252673"],
    ["1411680778185736242"],
    ["1411680778185736242", ...interestRoles],
  ];
  function access(
    channelId: string,
    roleIds: string[],
    memberId?: string,
    base?: bigint,
  ): bigint {
    const channel = channels.get(channelId);
    if (!channel) return 0n;
    return channelPermissions(
      base ?? guildPermissions(snapshot.roles, kfcGuildId, roleIds),
      channel,
      kfcGuildId,
      roleIds,
      memberId,
    );
  }
  check(
    "canonical-rules",
    snapshot.guild.rules_channel_id === kfcRulesId && channels.has(kfcRulesId)
      ? []
      : [kfcRulesId],
  );
  check(
    "interest-roles-unprivileged",
    interestRoles
      .filter((id): boolean => {
        const role = roles.get(id);
        return !role || role.managed || BigInt(role.permissions) !== 0n;
      })
      .concat(bindings.shamanId ? [] : ["missing-shaman-role"]),
  );

  const onboarding =
    snapshot.onboarding.status === "available"
      ? snapshot.onboarding.data
      : null;
  const defaults = [
    "1411545639392645192",
    "1412553351874215976",
    ...["calendar", "introductions", "help", "raidChat", "lfg"].map(
      (key): string => bindings.community[key],
    ),
  ];
  check(
    "seven-shared-defaults",
    onboarding &&
      defaults.every(Boolean) &&
      sameIds(onboarding.default_channel_ids, defaults) &&
      defaults.every(
        (id): boolean => channels.get(id)?.parent_id !== tbcCategoryId,
      )
      ? []
      : ["defaults"],
  );
  const writableDefaults = defaults.filter((id): boolean => {
    const channel = channels.get(id);
    return (
      channel?.type === 0 &&
      hasDiscordPermission(access(id, []), viewHistory | (1n << 11n))
    );
  });
  check(
    "five-writable-defaults",
    writableDefaults.length >= 5 ? [] : ["default-permissions"],
  );
  const activity = onboarding?.prompts.find(
    (prompt): boolean => prompt.title === "What brings you here?",
  );
  check(
    "both-games-multi-select",
    activity &&
      activity.required &&
      activity.in_onboarding &&
      !activity.single_select &&
      activity.options.length === Object.keys(routes).length &&
      new Set(activity.options.map((option): string => option.title)).size ===
        activity.options.length
      ? []
      : ["activity-question"],
  );
  check(
    "edition-routing",
    Object.entries(routes).flatMap(([title, ids]): string[] => {
      const option = activity?.options.find(
        (entry): boolean => entry.title === title,
      );
      return option &&
        option.role_ids.length === 0 &&
        sameIds(option.channel_ids, ids)
        ? []
        : [title];
    }),
  );
  const classPrompt = onboarding?.prompts.find(
    (prompt): boolean => prompt.title === "Which classes do you play?",
  );
  const combatPrompt = onboarding?.prompts.find(
    (prompt): boolean => prompt.title === "Which roles do you enjoy playing?",
  );
  const classRoles = [...kfcClasses, ["Shaman", bindings.shamanId] as const];
  for (const [key, prompt, expected] of [
    ["class-subscriptions", classPrompt, classRoles],
    ["combat-interests", combatPrompt, kfcCombatRoles],
  ] as const) {
    check(
      key,
      prompt &&
        !prompt.required &&
        !prompt.in_onboarding &&
        !prompt.single_select &&
        prompt.options.length === expected.length &&
        expected.every(([title, id]): boolean => {
          const option = prompt.options.find(
            (entry): boolean => entry.title === title,
          );
          return Boolean(
            option &&
            sameIds(option.role_ids, [id]) &&
            sameIds(
              option.channel_ids,
              key === "class-subscriptions"
                ? [bindings.revision[title.toLowerCase()]]
                : [],
            ),
          );
        })
        ? []
        : [key],
    );
  }
  check(
    "all-onboarding-grants-safe",
    onboarding
      ? onboarding.prompts.flatMap((prompt): string[] =>
          prompt.options.flatMap((option): string[] =>
            option.role_ids.filter((id): boolean => {
              const role = roles.get(id);
              return (
                !interestRoles.includes(id) ||
                !role ||
                role.managed ||
                BigInt(role.permissions) !== 0n
              );
            }),
          ),
        )
      : ["onboarding-unavailable"],
  );
  check(
    "onboarding-destinations-accessible",
    onboarding
      ? onboarding.prompts.flatMap((prompt): string[] =>
          prompt.options.flatMap((option): string[] =>
            option.channel_ids.filter((id): boolean => {
              const channel = channels.get(id);
              const required =
                channel?.type === 2 ? (1n << 10n) | (1n << 20n) : viewHistory;
              return (
                !channel ||
                !hasDiscordPermission(access(id, option.role_ids), required)
              );
            }),
          ),
        )
      : ["onboarding-unavailable"],
  );

  const readOnly = [
    ...new Set([
      "1411545639392645192",
      bindings.community.calendar,
      bindings.community.start,
      ...revisionTargets
        .filter((target): boolean => Boolean(target.readOnly))
        .map((target): string => target.id),
      ...newRevisionChannels
        .filter((target): boolean => target.type === 0)
        .map((target): string => bindings.revision[target.key]),
    ]),
  ];
  check(
    "resources-read-only",
    readOnly.filter(
      (id): boolean =>
        !channels.has(id) ||
        profiles.some((profile): boolean => {
          const permissions = access(id, profile);
          return (
            hasDiscordPermission(permissions, 1n << 10n) &&
            (permissions & kfcWriteMask) !== 0n
          );
        }),
    ),
  );
  const staffOnly = [
    "1411564572501999690",
    "1412556202587459716",
    "1528518181163892957",
    "1557975280184991756",
  ];
  check(
    "staff-channels-private",
    staffOnly.filter(
      (id): boolean =>
        !channels.has(id) ||
        profiles.some((profile): boolean =>
          hasDiscordPermission(access(id, profile), 1n << 10n),
        ),
    ),
  );
  const craftingId = bindings.revision.crafting;
  const crafting = channels.get(craftingId);
  const expectedTags =
    newRevisionChannels.find((channel): boolean => channel.key === "crafting")
      ?.tags ?? [];
  check(
    "crafting-forum-tag-policy",
    crafting?.type === 15 &&
      Boolean((crafting.flags ?? 0) & (1 << 4)) &&
      sameIds(
        crafting.available_tags?.map((tag): string => tag.name) ?? [],
        expectedTags,
      ) &&
      crafting.available_tags?.every(
        (tag): boolean => tag.moderated === (tag.name === "Reviewed"),
      )
      ? []
      : [craftingId || "crafting"],
  );
  check(
    "crafting-member-posting",
    profiles.every((profile): boolean =>
      hasDiscordPermission(
        access(craftingId, profile),
        viewHistory | (1n << 11n) | (1n << 38n),
      ),
    )
      ? []
      : [craftingId || "crafting"],
  );

  // Model the proposed reauthorization with Administrator removed from every
  // assigned role. This does not prove actual API access or change Discord.
  const scopedBase =
    (guildPermissions(snapshot.roles, kfcGuildId, snapshot.botRoleIds) &
      ~administrator) |
    kfcScopedPermissions;
  const publishPermissions =
    viewHistory | (1n << 11n) | (1n << 14n) | (1n << 51n);
  check(
    "scoped-bot-resource-publication",
    [
      ...new Set([
        bindings.community.calendar,
        ...revisionResources(bindings.revision).map(
          (resource): string => resource.channelId,
        ),
      ]),
    ].filter(
      (id): boolean =>
        !hasDiscordPermission(
          access(id, snapshot.botRoleIds, snapshot.bot.id, scopedBase),
          publishPermissions,
        ),
    ),
  );
  check(
    "scoped-bot-forum-maintenance",
    hasDiscordPermission(
      access(craftingId, snapshot.botRoleIds, snapshot.bot.id, scopedBase),
      viewHistory | (1n << 11n) | (1n << 34n) | (1n << 38n),
    )
      ? []
      : [craftingId || "crafting"],
  );
  const botTop = Math.max(
    0,
    ...snapshot.roles
      .filter((role): boolean => snapshot.botRoleIds.includes(role.id))
      .map((role): number => role.position),
  );
  check(
    "bot-interest-role-hierarchy",
    interestRoles.filter(
      (id): boolean => (roles.get(id)?.position ?? Infinity) >= botTop,
    ),
  );

  const ownerActions = [
    "Configure Server Guide and check an ordinary newcomer's desktop/mobile experience.",
    "Review MEE6 verification/role bindings before retiring the old gate; preserve existing member roles.",
    "Assign real moderation, help, hosting and content-review coverage; run a consenting crafting/TBC event pilot.",
  ];
  if (!snapshot.guild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED"))
    ownerActions.push("Enable native Rules Screening in Safety Setup.");
  if (!onboarding?.enabled)
    ownerActions.push(
      "Publish onboarding only after screening and newcomer checks pass.",
    );
  if (snapshot.guild.mfa_level !== 1)
    ownerActions.push(
      "Confirm staff 2FA readiness, then require moderator 2FA.",
    );
  if (
    guildPermissions(snapshot.roles, kfcGuildId, snapshot.botRoleIds) &
    administrator
  )
    ownerActions.push(
      "Reauthorize scoped bot permissions, disable Administrator, then verify real worker/API access.",
    );
  return {
    capturedAt: snapshot.capturedAt,
    automatedChecksPassed: checks.every((entry): boolean => entry.passed),
    memberProfilesChecked: profiles.length,
    checks,
    ownerActions,
    limitations: [
      "Configuration probes do not impersonate members or test pending screening, personal sidebar choices or mobile rendering.",
      "Server Guide, external bot dashboards, individual staff 2FA and real pilot outcomes cannot be verified by this audit.",
      "Scoped permission results are simulations; Administrator is not removed by this command.",
    ],
  };
}
