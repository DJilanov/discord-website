import assert from "node:assert/strict";
import { test } from "node:test";
import {
  kfcApplicationId,
  kfcClasses,
  kfcCombatRoles,
  kfcGuildId,
  kfcRulesId,
  kfcNewChannels,
} from "../content/kfc-community";
import {
  newRevisionChannels,
  revisionResources,
  revisionTargets,
} from "../content/kfc-revision";
import type { DiscordAuditSnapshot } from "../lib/discord-audit";
import { kfcWriteMask } from "../lib/kfc-community";
import { botMaintenancePatch } from "../lib/kfc-revision";
import {
  analyzeKfcReadiness,
  type KfcReadinessBindings,
  type KfcReadinessReport,
} from "../lib/kfc-readiness";

const viewHistory = (1n << 10n) | (1n << 16n);
const operationRoleId = "1556000000000000002";
const shamanId = "1556000000000000003";

function fixture(): {
  snapshot: DiscordAuditSnapshot;
  bindings: KfcReadinessBindings;
} {
  let sequence = 1556000000000000100n;
  function id(): string {
    return (sequence++).toString();
  }
  const bindings: KfcReadinessBindings = {
    community: Object.fromEntries(
      kfcNewChannels.map((channel) => [channel.key, id()]),
    ),
    revision: Object.fromEntries(
      newRevisionChannels.map((channel) => [channel.key, id()]),
    ),
    shamanId,
  };
  const snapshot: DiscordAuditSnapshot = {
    capturedAt: "2026-10-09T00:00:00Z",
    application: { id: kfcApplicationId, name: "Bot" },
    bot: { id: kfcApplicationId, username: "Bot", bot: true },
    guild: {
      id: kfcGuildId,
      name: "KFC",
      description: null,
      features: ["COMMUNITY"],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 0,
      rules_channel_id: kfcRulesId,
      system_channel_id: null,
    },
    roles: [
      {
        id: kfcGuildId,
        name: "everyone",
        permissions: "0",
        position: 0,
        managed: false,
        mentionable: false,
      },
      {
        id: kfcApplicationId,
        name: "Bot",
        permissions: "8",
        position: 50,
        managed: true,
        mentionable: false,
      },
      {
        id: operationRoleId,
        name: "Operations",
        permissions: ((1n << 14n) | (1n << 34n)).toString(),
        position: 40,
        managed: false,
        mentionable: false,
      },
      ...[
        ...kfcClasses,
        ["Shaman", shamanId] as const,
        ...kfcCombatRoles,
        ["verified", "1412584499740672051"] as const,
        ["PUG", "1411704763636252673"] as const,
        ["Certified", "1411680778185736242"] as const,
      ].map(([name, roleId], position) => ({
        id: roleId,
        name,
        position: position + 1,
        permissions: "0",
        managed: false,
        mentionable: false,
      })),
    ],
    channels: [],
    botRoleIds: [kfcApplicationId, operationRoleId],
    onboarding: {
      status: "available",
      data: {
        guild_id: kfcGuildId,
        enabled: false,
        mode: 0,
        default_channel_ids: [
          "1411545639392645192",
          "1412553351874215976",
          ...["calendar", "introductions", "help", "raidChat", "lfg"].map(
            (key): string => bindings.community[key],
          ),
        ],
        prompts: [
          {
            id: id(),
            title: "What brings you here?",
            required: true,
            in_onboarding: true,
            single_select: false,
            options: [
              ["TBC raids", ["1460899582824153140", "1411592694404218991"]],
              [
                "WoW Forever",
                [
                  "1548519535177629707",
                  "1548747530790248610",
                  "1550970060812587028",
                ],
              ],
              [
                "TBC PvP",
                [
                  "1557974303432118272",
                  "1463110825790148639",
                  "1463605381342429195",
                ],
              ],
              ["Forever PvP", ["1557974303432118272", "1548519535177629707"]],
              ["Friends / still deciding", ["1412553351874215976"]],
            ].map(([title, channelIds]) => ({
              id: id(),
              title: title as string,
              role_ids: [],
              channel_ids: channelIds as string[],
            })),
          },
          {
            id: id(),
            title: "Which classes do you play?",
            required: false,
            in_onboarding: false,
            single_select: false,
            options: [...kfcClasses, ["Shaman", shamanId] as const].map(
              ([title, roleId]) => ({
                id: id(),
                title,
                role_ids: [roleId],
                channel_ids: [bindings.revision[title.toLowerCase()]],
              }),
            ),
          },
          {
            id: id(),
            title: "Which roles do you enjoy playing?",
            required: false,
            in_onboarding: false,
            single_select: false,
            options: kfcCombatRoles.map(([title, roleId]) => ({
              id: id(),
              title,
              role_ids: [roleId],
              channel_ids: [],
            })),
          },
        ],
      },
    },
  };
  const onboarding = snapshot.onboarding;
  assert.equal(onboarding.status, "available");
  if (onboarding.status !== "available")
    throw new Error("Missing fixture onboarding.");
  const readOnly = new Set([
    kfcRulesId,
    "1411545639392645192",
    bindings.community.calendar,
    bindings.community.start,
    ...revisionResources(bindings.revision).map(
      (resource): string => resource.channelId,
    ),
    ...revisionTargets
      .filter((channel): boolean => Boolean(channel.readOnly))
      .map((channel): string => channel.id),
    ...newRevisionChannels
      .filter((channel): boolean => channel.type === 0)
      .map((channel): string => bindings.revision[channel.key]),
  ]);
  const staffOnly = new Set([
    "1411564572501999690",
    "1412556202587459716",
    "1528518181163892957",
    "1557975280184991756",
  ]);
  const channelIds = new Set([
    ...readOnly,
    ...staffOnly,
    ...onboarding.data.default_channel_ids,
    ...onboarding.data.prompts.flatMap((prompt): string[] =>
      prompt.options.flatMap((option): string[] => option.channel_ids),
    ),
    bindings.revision.crafting,
  ]);
  snapshot.channels = [...channelIds].map((channelId) => ({
    id: channelId,
    guild_id: kfcGuildId,
    name: "test",
    type: channelId === "1411592694404218991" ? 2 : 0,
    position: 0,
    parent_id: null,
    permission_overwrites: [
      {
        id: kfcGuildId,
        type: 0 as const,
        allow: (staffOnly.has(channelId)
          ? 0n
          : viewHistory |
            (readOnly.has(channelId) ? 0n : kfcWriteMask | (1n << 20n))
        ).toString(),
        deny: (staffOnly.has(channelId)
          ? 1n << 10n
          : readOnly.has(channelId)
            ? kfcWriteMask
            : 0n
        ).toString(),
      },
      {
        id: kfcApplicationId,
        type: 1 as const,
        allow: (viewHistory | kfcWriteMask).toString(),
        deny: "0",
      },
    ],
  }));
  const crafting = snapshot.channels.find(
    (channel): boolean => channel.id === bindings.revision.crafting,
  );
  assert.ok(crafting);
  crafting.type = 15;
  crafting.flags = 1 << 4;
  crafting.available_tags = newRevisionChannels
    .find((channel): boolean => channel.key === "crafting")
    ?.tags?.map((name) => ({ id: id(), name, moderated: name === "Reviewed" }));
  return { snapshot, bindings };
}

function passed(report: KfcReadinessReport, key: string): boolean {
  const check = report.checks.find((entry): boolean => entry.key === key);
  assert.ok(check);
  return check.passed;
}

test("Readiness distinguishes valid configuration from unverified owner launch tasks without mutation", (): void => {
  const { snapshot, bindings } = fixture();
  const before = structuredClone(snapshot);
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.deepEqual(
    report.checks.filter((check): boolean => !check.passed),
    [],
  );
  assert.equal(report.automatedChecksPassed, true);
  assert.equal(report.memberProfilesChecked, 19);
  assert.ok(
    report.ownerActions.some((action): boolean =>
      action.includes("Rules Screening"),
    ),
  );
  assert.ok(
    report.ownerActions.some((action): boolean =>
      action.includes("Administrator"),
    ),
  );
  assert.deepEqual(snapshot, before);
});

test("Readiness catches single-select, missing and conflicting game choices", (): void => {
  const { snapshot, bindings } = fixture();
  assert.equal(snapshot.onboarding.status, "available");
  if (snapshot.onboarding.status !== "available") return;
  snapshot.onboarding.data.prompts[0].single_select = true;
  assert.equal(
    passed(analyzeKfcReadiness(snapshot, bindings), "both-games-multi-select"),
    false,
  );
  snapshot.onboarding.data.prompts[0].options[1].channel_ids.push(
    "1463110825790148639",
  );
  assert.equal(
    passed(analyzeKfcReadiness(snapshot, bindings), "edition-routing"),
    false,
  );
});

test("Readiness accepts additional valid shared defaults without requiring an obsolete exact seven", (): void => {
  const { snapshot, bindings } = fixture();
  if (snapshot.onboarding.status !== "available")
    throw new Error("Missing onboarding");
  const extra = structuredClone(
    snapshot.channels.find(
      (channel) => channel.id === bindings.community.help,
    )!,
  );
  extra.id = "1556000000000000998";
  snapshot.channels.push(extra);
  snapshot.onboarding.data.default_channel_ids.push(extra.id);
  assert(
    passed(
      analyzeKfcReadiness(snapshot, bindings),
      "shared-defaults-accessible",
    ),
  );
  extra.permission_overwrites = [];
  assert.equal(
    passed(
      analyzeKfcReadiness(snapshot, bindings),
      "shared-defaults-accessible",
    ),
    false,
  );
});

test("Explicit bot-only maintenance grants work with the original scoped role permissions", (): void => {
  const { snapshot, bindings } = fixture();
  const operationRole = snapshot.roles.find(
    (role): boolean => role.id === operationRoleId,
  );
  assert.ok(operationRole);
  operationRole.permissions = "0";
  const publications = new Set([
    bindings.community.calendar,
    ...revisionResources(bindings.revision).map(
      (resource): string => resource.channelId,
    ),
    bindings.revision.crafting,
  ]);
  for (const channel of snapshot.channels.filter((entry): boolean =>
    publications.has(entry.id),
  )) {
    const patch = botMaintenancePatch(
      channel,
      channel.id === bindings.revision.crafting,
    );
    assert.ok(patch.permission_overwrites);
    channel.permission_overwrites = patch.permission_overwrites;
  }
  assert.equal(
    analyzeKfcReadiness(snapshot, bindings).automatedChecksPassed,
    true,
  );
});

test("Readiness rejects privileged onboarding grants and class-role substitutions", (): void => {
  const { snapshot, bindings } = fixture();
  if (snapshot.onboarding.status !== "available") return;
  snapshot.onboarding.data.prompts[1].options[0].role_ids = [kfcApplicationId];
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "class-subscriptions"), false);
  assert.equal(passed(report, "all-onboarding-grants-safe"), false);
});

test("Readiness catches an interest role that can post in resource threads or see staff messages", (): void => {
  const { snapshot, bindings } = fixture();
  const rules = snapshot.channels.find(
    (channel): boolean => channel.id === kfcRulesId,
  );
  const staff = snapshot.channels.find(
    (channel): boolean => channel.id === "1411564572501999690",
  );
  assert.ok(rules && staff);
  rules.permission_overwrites.push({
    id: kfcClasses[0][1],
    type: 0,
    allow: (1n << 38n).toString(),
    deny: "0",
  });
  staff.permission_overwrites.push({
    id: kfcClasses[0][1],
    type: 0,
    allow: (1n << 10n).toString(),
    deny: "0",
  });
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "resources-read-only"), false);
  assert.equal(passed(report, "staff-channels-private"), false);
});

test("Readiness requires accessible defaults and optional destinations", (): void => {
  const { snapshot, bindings } = fixture();
  snapshot.channels = snapshot.channels.filter(
    (channel): boolean =>
      channel.id !== bindings.revision.warrior &&
      channel.id !== bindings.community.help,
  );
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "onboarding-destinations-accessible"), false);
  assert.equal(passed(report, "five-writable-defaults"), false);
});

test("Crafting requires its tags, member posting and staff-only Reviewed", (): void => {
  const { snapshot, bindings } = fixture();
  const crafting = snapshot.channels.find(
    (channel): boolean => channel.id === bindings.revision.crafting,
  );
  assert.ok(crafting?.available_tags);
  crafting.available_tags.find(
    (tag): boolean => tag.name === "Reviewed",
  )!.moderated = false;
  crafting.permission_overwrites[0].deny = (1n << 38n).toString();
  crafting.permission_overwrites[0].allow = (
    BigInt(crafting.permission_overwrites[0].allow) & ~(1n << 38n)
  ).toString();
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "crafting-forum-tag-policy"), false);
  assert.equal(passed(report, "crafting-member-posting"), false);
});

test("Administrator cannot mask missing scoped bot permissions", (): void => {
  const { snapshot, bindings } = fixture();
  snapshot.roles.find(
    (role): boolean => role.id === operationRoleId,
  )!.permissions = "8";
  const resource = snapshot.channels.find(
    (channel): boolean => channel.id === kfcRulesId,
  );
  const forum = snapshot.channels.find(
    (channel): boolean => channel.id === bindings.revision.crafting,
  );
  assert.ok(resource && forum);
  resource.permission_overwrites[1].deny = (1n << 14n).toString();
  forum.permission_overwrites[1].deny = (1n << 34n).toString();
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "scoped-bot-resource-publication"), false);
  assert.equal(passed(report, "scoped-bot-forum-maintenance"), false);
});

test("Member overwrite denial and role hierarchy remain effective in scoped probes", (): void => {
  const { snapshot, bindings } = fixture();
  const channel = snapshot.channels.find(
    (entry): boolean => entry.id === bindings.community.calendar,
  );
  assert.ok(channel);
  channel.permission_overwrites[1].allow = viewHistory.toString();
  channel.permission_overwrites[1].deny = (1n << 51n).toString();
  snapshot.roles.find((role): boolean => role.id === shamanId)!.position = 50;
  const report = analyzeKfcReadiness(snapshot, bindings);
  assert.equal(passed(report, "scoped-bot-resource-publication"), false);
  assert.equal(passed(report, "bot-interest-role-hierarchy"), false);
});

test("Missing onboarding and wrong server cannot pass readiness", (): void => {
  const { snapshot, bindings } = fixture();
  snapshot.onboarding = { status: "unavailable", httpStatus: 403 };
  assert.equal(
    analyzeKfcReadiness(snapshot, bindings).automatedChecksPassed,
    false,
  );
  snapshot.guild.id = "1554316932948172940";
  assert.throws(() => analyzeKfcReadiness(snapshot, bindings));
});
