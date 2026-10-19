import assert from "node:assert/strict";
import { test } from "node:test";
import {
  experienceApplicationId,
  experienceGuildId,
} from "../content/discord-channel-experience";
import {
  factionGroupGuide,
  factionPromptId,
  factionRulesTopic,
  groupFactions,
  groupGuidelines,
  groupTags,
  levelingForumId,
} from "../content/discord-group-channels";
import {
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import { DiscordAuditError } from "../lib/discord-audit-client";
import {
  experienceChannelSchema,
  experiencePatchMatches,
  readOnlyArchiveOverwrites,
  type ExperienceChannel,
} from "../lib/discord-channel-experience";
import { discordChannelRequest } from "../lib/discord-channel-request";
import {
  assertCopiedGroupAccess,
  assertGroupArchive,
  assertGroupForumAccess,
  assertGroupGuildPreserved,
  assertGroupOrder,
  assertGroupTagsRetained,
  factionChannelOrder,
  groupForumPatch,
  groupOnboardingPayload,
  groupOnboardingSchema,
  neutralContributorCopy,
  prepareGroupForum,
  routedGroupOnboarding,
  sameGroupOnboarding,
  type GroupOnboarding,
} from "../lib/discord-group-channels";

const created: Readonly<Record<string, string>> = {
  "alliance-pve": "1555101000000000001",
  "alliance-pvp": "1555101000000000002",
  "horde-pve": "1555101000000000003",
  "horde-pvp": "1555101000000000004",
};
function channel(): ExperienceChannel {
  return {
    id: groupFactions[0].pveSourceId,
    guild_id: experienceGuildId,
    type: 15,
    name: "lfg-pve",
    parent_id: groupFactions[0].parentId,
    position: 1,
    nsfw: false,
    permission_overwrites: [],
    flags: 0,
  };
}
function snapshot(): DiscordAuditSnapshot {
  return {
    capturedAt: "2026-10-01T00:00:00Z",
    application: { id: experienceApplicationId, name: "test" },
    bot: { id: experienceApplicationId, username: "test", bot: true },
    guild: {
      id: experienceGuildId,
      name: "test",
      description: null,
      features: [],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 0,
      rules_channel_id: null,
      system_channel_id: null,
    },
    roles: [
      {
        id: experienceGuildId,
        name: "everyone",
        position: 0,
        permissions: [10, 11, 16, 35, 36, 38]
          .reduce(
            (mask: bigint, bit: number): bigint => mask | (1n << BigInt(bit)),
            0n,
          )
          .toString(),
        managed: false,
        mentionable: false,
      },
      {
        id: "1554332903603966043",
        name: "ordinary",
        position: 1,
        permissions: "0",
        managed: false,
        mentionable: false,
      },
      {
        id: "1554525480013660250",
        name: "staff",
        position: 2,
        permissions: "8",
        managed: false,
        mentionable: false,
      },
    ],
    botRoleIds: [],
    channels: [],
    onboarding: { status: "unavailable", httpStatus: 403 },
  };
}
function onboarding(): GroupOnboarding {
  return groupOnboardingSchema.parse({
    guild_id: experienceGuildId,
    enabled: true,
    mode: 1,
    default_channel_ids: ["1554319918714060840", levelingForumId],
    prompts: [
      {
        id: factionPromptId,
        type: 0,
        title: "Select factions",
        single_select: false,
        required: true,
        in_onboarding: true,
        options: [
          {
            id: "1554617788549697601",
            title: "BOT",
            description: "Intentional trap",
            role_ids: ["1554617887912890378"],
            channel_ids: [],
            emoji: {
              id: "1554351470059716698",
              name: "Pepe_noob",
              animated: false,
            },
          },
          ...groupFactions.map((faction) => ({
            id: faction.optionId,
            title: faction.label,
            description: "",
            role_ids: [],
            channel_ids: [faction.parentId],
            emoji: {
              id: "1554618886320562287",
              name: "faction",
              animated: false,
            },
          })),
        ],
      },
      {
        id: "1554621815840706586",
        type: 0,
        title: "Select class",
        single_select: false,
        required: true,
        in_onboarding: true,
        options: [
          {
            id: "1554621815958011966",
            title: "Rogue",
            role_ids: ["1554332903603966043"],
            channel_ids: [],
            emoji: { id: null, name: "R", animated: false },
          },
        ],
      },
    ],
  });
}

test("fixed faction sources, replacement keys and all group tags are valid and neutral", (): void => {
  assert.equal(
    new Set(
      groupFactions.flatMap((faction): string[] => [
        faction.parentId,
        faction.rulesId,
        faction.pveSourceId,
        faction.pvpSourceId,
        faction.scheduledId,
        faction.lookingId,
        faction.recruitmentId,
      ]),
    ).size,
    14,
  );
  for (const kind of [
    "pve",
    "pvp",
    "scheduled",
    "looking",
    "recruitment",
    "leveling",
  ] as const) {
    const tags = groupTags(kind);
    assert.ok(tags.length <= 20);
    assert.equal(
      new Set(tags.map((tag): string => tag.name)).size,
      tags.length,
    );
    assert.ok(
      tags.every((tag): boolean => tag.name.length <= 20 && !tag.moderated),
    );
    const guidelines = groupGuidelines(kind, groupFactions[0]);
    assert.ok(guidelines.length <= 4096);
    assert.equal(guidelines.match(/```/g)?.length, 2);
    assert.doesNotMatch(guidelines, /KFC|20\d\d-\d\d-\d\d|automatic reminders/);
  }
  assert.equal(groupTags("pve").length, 16);
  assert.equal(groupTags("pvp").length, 19);
  assert.equal(groupTags("pvp").length + 1, 20);
  assert.equal(groupTags("scheduled").length, 14);
});

test("guidelines distinguish PvP, single sessions, recurring teams and confirmed rosters", (): void => {
  assert.match(groupGuidelines("pve"), /absolute date and time/);
  assert.match(
    groupGuidelines("pvp"),
    /Objective \/ battleground \/ meeting place/,
  );
  assert.doesNotMatch(groupGuidelines("pvp"), /Activity \/ dungeon/);
  assert.match(groupGuidelines("pvp"), /PvP character ruleset arrive here/);
  for (const name of ["Dungeon", "Questing", "Raid", "RP event"]) {
    assert.ok(groupTags("pvp").some((tag): boolean => tag.name === name));
  }
  assert.match(groupGuidelines("scheduled"), /new dated post for each session/);
  assert.match(groupGuidelines("scheduled"), /not an accepted place/);
  assert.match(groupGuidelines("leveling"), /missed-session expectations/);
  for (const faction of groupFactions) {
    const [pve, pvp] = [
      created[`${faction.key}-pve`],
      created[`${faction.key}-pvp`],
    ];
    assert.ok(factionRulesTopic(faction, pve, pvp).length <= 1024);
    assert.ok(factionGroupGuide(faction, pve, pvp).length <= 2000);
    assert.match(
      factionGroupGuide(faction, pve, pvp),
      /replaces the older blanket/,
    );
    assert.doesNotMatch(
      factionGroupGuide(faction, pve, pvp),
      /@everyone|@here|KFC/,
    );
  }
});

test("guild feature/role list ordering is harmless, but changed settings or role grants are rejected", (): void => {
  const before = snapshot();
  before.guild.features = ["COMMUNITY", "NEWS", "GUILD_ONBOARDING"];
  const after = structuredClone(before);
  after.guild.features.reverse();
  after.roles.reverse();
  assertGroupGuildPreserved(before, after);
  const changed = structuredClone(before);
  changed.roles[2].permissions = "0";
  assert.throws((): void => assertGroupGuildPreserved(before, changed));
  changed.roles = before.roles;
  changed.guild.default_message_notifications = 0;
  assert.throws((): void => assertGroupGuildPreserved(before, changed));
  const removedFeature = structuredClone(before);
  removedFeature.guild.features.pop();
  assert.throws((): void => assertGroupGuildPreserved(before, removedFeature));
});

test("forum patch preserves unrelated flags, existing tag IDs and old scheduled-run tags", (): void => {
  const before = channel();
  before.flags = 1 << 21;
  before.available_tags = [
    "EU",
    "PvE",
    "PvP",
    "RP",
    "Open",
    "Full",
    "Cancelled",
  ].map((name: string, index: number) => ({
    id: `155482088465983908${index}`,
    name,
    moderated: false,
  }));
  const patch = groupForumPatch(before, "scheduled", groupFactions[0]);
  assert.equal(patch.name, "scheduled-runs");
  assert.equal(patch.flags, (1 << 21) | 16);
  for (const tag of before.available_tags)
    assert.equal(
      patch.available_tags?.find((item): boolean => item.name === tag.name)?.id,
      tag.id,
    );
  assert.ok(
    patch.available_tags?.some((tag): boolean => tag.name === "Completed"),
  );
  assertGroupTagsRetained(before, {
    ...before,
    ...patch,
    available_tags: patch.available_tags!.map((tag, index: number) => ({
      ...tag,
      id: tag.id ?? `155510100000000001${index}`,
    })),
  });
  assert.throws((): void =>
    assertGroupTagsRetained(before, { ...before, available_tags: [] }),
  );
  assert.equal(patch.default_thread_rate_limit_per_user, 0);
  assert.equal(patch.default_auto_archive_duration, 10080);
  assert.equal(
    groupForumPatch(channel(), "pve").default_auto_archive_duration,
    1440,
  );
  assert.equal(groupForumPatch(channel(), "leveling").default_sort_order, 0);
});

test("forum access requires native posting and thread replies; copied source ACL is exact", (): void => {
  const forum = channel();
  assertGroupForumAccess(snapshot(), forum);
  assertCopiedGroupAccess({ ...forum, type: 0 }, forum);
  assertCopiedGroupAccess({ ...forum, nsfw: undefined }, forum);
  const noReplies = {
    ...forum,
    permission_overwrites: [
      {
        id: experienceGuildId,
        type: 0 as const,
        allow: "0",
        deny: (1n << 38n).toString(),
      },
    ],
  };
  assert.throws((): void => assertGroupForumAccess(snapshot(), noReplies));
  assert.throws((): void => assertCopiedGroupAccess(forum, noReplies));
  assert.throws((): void =>
    assertCopiedGroupAccess(forum, { ...forum, nsfw: true }),
  );
  assert.throws((): void =>
    assertCopiedGroupAccess(forum, {
      ...forum,
      guild_id: "1554316932948172941",
    }),
  );
});

test("ignored creation defaults are patched and verified before source archival", async (): Promise<void> => {
  const source = { ...channel(), type: 0 };
  const forum = {
    ...channel(),
    id: created["alliance-pve"],
    available_tags: groupTags("pve").map((tag, index: number) => ({
      ...tag,
      id: `15551010000000001${String(index).padStart(2, "0")}`,
    })),
  };
  const patch = groupForumPatch(forum, "pve", groupFactions[0]);
  assert.equal(experiencePatchMatches(forum, patch), false);
  let writes = 0;
  const configured = await prepareGroupForum(
    snapshot(),
    source,
    forum,
    "pve",
    groupFactions[0],
    async (before, update): Promise<ExperienceChannel> => {
      writes++;
      return experienceChannelSchema.parse({ ...before, ...update });
    },
  );
  assert.equal(writes, 1);
  assert.equal(experiencePatchMatches(configured, patch), true);
  assert.equal(configured.flags, 16);
  assert.equal(configured.default_thread_rate_limit_per_user, 0);
  await assert.rejects(
    prepareGroupForum(
      snapshot(),
      source,
      forum,
      "pve",
      groupFactions[0],
      async (): Promise<ExperienceChannel> => forum,
    ),
    /settings did not verify/,
  );
});

test("archives retain role/member visibility while preventing ordinary writing and threads", (): void => {
  const source = channel();
  source.type = 0;
  source.permission_overwrites = [
    {
      id: "1554332903603966043",
      type: 0,
      allow: (1n << 11n).toString(),
      deny: (1n << 10n).toString(),
    },
    {
      id: "1555101000000000081",
      type: 1,
      allow: (1n << 38n).toString(),
      deny: "0",
    },
  ];
  const archived = {
    ...source,
    permission_overwrites: readOnlyArchiveOverwrites(source, snapshot()),
  };
  assertGroupArchive(snapshot(), source, archived);
  assert.throws((): void => assertGroupArchive(snapshot(), source, source));
  assert.throws((): void =>
    assertGroupArchive(snapshot(), source, {
      ...archived,
      permission_overwrites: [],
    }),
  );
});

test("faction onboarding routes actual forums while keeping questions, BOT traps, roles and defaults", (): void => {
  const before = onboarding();
  const saved = structuredClone(before);
  before.prompts[0].options[1].channel_ids.push(
    "1554322593589235732",
    groupFactions[0].pveSourceId,
  );
  const after = routedGroupOnboarding(before, created);
  assert.equal(
    sameGroupOnboarding(after, routedGroupOnboarding(after, created)),
    true,
  );
  assert.equal(sameGroupOnboarding(before, after), false);
  assert.deepEqual(after.prompts[0].options[0], saved.prompts[0].options[0]);
  assert.deepEqual(after.prompts[1], before.prompts[1]);
  assert.deepEqual(after.default_channel_ids, before.default_channel_ids);
  assert.equal(after.enabled, before.enabled);
  assert.equal(after.mode, before.mode);
  assert.ok(
    after.prompts[0].options[1].channel_ids.includes("1554322593589235732"),
  );
  assert.ok(
    after.prompts[0].options[1].channel_ids.includes(created["alliance-pve"]),
  );
  assert.ok(
    !after.prompts[0].options[1].channel_ids.includes(
      groupFactions[0].parentId,
    ),
  );
  assert.ok(
    !after.prompts[0].options[1].channel_ids.includes(
      groupFactions[0].pveSourceId,
    ),
  );
  assert.equal(
    before.prompts[0].options[1].channel_ids[0],
    groupFactions[0].parentId,
  );
  assert.throws((): GroupOnboarding => routedGroupOnboarding(before, {}));
  const wrong = onboarding();
  wrong.prompts[0].options[1].title = "Changed by owner";
  assert.throws((): GroupOnboarding => routedGroupOnboarding(wrong, created));
});

test("onboarding writes API emoji fields and verification tolerates only set ordering", (): void => {
  const before = onboarding();
  const payload = groupOnboardingPayload(before) as {
    prompts: { options: Record<string, unknown>[] }[];
  };
  const option = payload.prompts[0].options[0];
  assert.equal(option.emoji_id, before.prompts[0].options[0].emoji?.id);
  assert.equal(Object.hasOwn(option, "emoji"), false);
  const reordered = structuredClone(before);
  reordered.default_channel_ids.reverse();
  assert.equal(sameGroupOnboarding(before, reordered), true);
  reordered.prompts[0].options[0].role_ids = [];
  assert.equal(sameGroupOnboarding(before, reordered), false);
  const changed = structuredClone(before);
  changed.prompts.reverse();
  assert.equal(sameGroupOnboarding(before, changed), false);
});

test("faction order is identical by purpose and excludes the old archive IDs", (): void => {
  for (const faction of groupFactions) {
    const expected = factionChannelOrder(faction, created);
    assert.equal(expected.length, 6);
    assert.equal(expected[3], faction.scheduledId);
    const channels = expected.map(
      (id: string, position: number): ExperienceChannel => ({
        ...channel(),
        id,
        parent_id: faction.parentId,
        position,
      }),
    );
    assertGroupOrder(channels, faction, expected);
    assert.throws((): void =>
      assertGroupOrder(channels, faction, [...expected].reverse()),
    );
    assert.ok(!expected.includes(faction.pveSourceId));
  }
});

test("neutral attribution changes only the known line and is idempotent, not a license claim", (): void => {
  const initial =
    "Intro\nMaintainer: the community's KFC tool team; joining KFC is not required. Keep distribution restrictions. Raid addons maintained by the guild have not yet been tested on Forever.";
  const neutral = neutralContributorCopy(initial);
  assert.match(neutral, /Maintainer: Open source contributors\./);
  assert.match(neutral, /Keep distribution restrictions/);
  assert.match(neutral, /have not yet been tested on Forever/);
  assert.doesNotMatch(neutral, /KFC|licensed|open-source license/);
  assert.equal(neutralContributorCopy(neutral), neutral);
  assert.throws((): string =>
    neutralContributorCopy("Maintainer: owner-edited name"),
  );
  assert.throws((): string => neutralContributorCopy(initial + initial));
});

const credentials: AuditCredentials = {
  applicationId: experienceApplicationId,
  guildId: experienceGuildId,
  token: "test_token_no_real_credential",
};
const route = `/channels/${groupFactions[0].pveSourceId}`;

test("channel request rejects wrong identity or foreign routes before network", async (): Promise<void> => {
  let calls = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return Response.json({});
  };
  for (const candidate of [
    "https://example.com/",
    "/users/@me",
    `/guilds/1554316932948172941/channels`,
    `${route}?override=1`,
  ]) {
    await assert.rejects(
      discordChannelRequest(credentials, candidate, "GET", undefined, {
        reason: "test",
        transport,
      }),
    );
  }
  await assert.rejects(
    discordChannelRequest(
      { ...credentials, guildId: "1554316932948172941" },
      route,
      "GET",
      undefined,
      { reason: "test", transport },
    ),
  );
  assert.equal(calls, 0);
});

test("channel requests recheck before first write and after bounded rate limiting", async (): Promise<void> => {
  let calls = 0;
  let checks = 0;
  const waits: number[] = [];
  const transport: typeof fetch = async (_input, init): Promise<Response> => {
    assert.equal(init?.redirect, "error");
    assert.equal(init?.method, "PATCH");
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      `Bot ${credentials.token}`,
    );
    calls++;
    return calls === 1
      ? Response.json({ retry_after: 0.01 }, { status: 429 })
      : Response.json({ ok: true });
  };
  await discordChannelRequest(
    credentials,
    route,
    "PATCH",
    { topic: "test" },
    {
      reason: "test",
      transport,
      recheck: async (): Promise<void> => {
        checks++;
      },
      sleep: async (milliseconds: number): Promise<void> => {
        waits.push(milliseconds);
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal(checks, 2);
  assert.deepEqual(waits, [110]);
});

test("concurrent edit aborts a rate-limit retry before a second mutation", async (): Promise<void> => {
  let calls = 0;
  let checks = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return Response.json({ retry_after: 0 }, { status: 429 });
  };
  await assert.rejects(
    discordChannelRequest(
      credentials,
      route,
      "PATCH",
      {},
      {
        reason: "test",
        transport,
        sleep: async (): Promise<void> => {},
        recheck: async (): Promise<void> => {
          if (++checks > 1) throw new DiscordAuditError("Owner changed it");
        },
      },
    ),
    /Owner changed it/,
  );
  assert.equal(calls, 1);
});

test("ambiguous creation, upstream errors and unreadable responses are never retried", async (): Promise<void> => {
  for (const response of [
    new Response("private detail", { status: 500 }),
    new Response("private detail", { status: 403 }),
    new Response("not json", { status: 200 }),
  ]) {
    let calls = 0;
    const transport: typeof fetch = async (): Promise<Response> => {
      calls++;
      return response;
    };
    await assert.rejects(
      discordChannelRequest(
        credentials,
        `/guilds/${experienceGuildId}/channels`,
        "POST",
        {},
        { reason: "test", transport },
      ),
      (error: unknown): boolean =>
        error instanceof DiscordAuditError &&
        !error.message.includes("private detail"),
    );
    assert.equal(calls, 1);
  }
  let calls = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    throw Error(credentials.token);
  };
  await assert.rejects(
    discordChannelRequest(
      credentials,
      `/guilds/${experienceGuildId}/channels`,
      "POST",
      {},
      { reason: "test", transport },
    ),
    (error: unknown): boolean =>
      error instanceof DiscordAuditError &&
      !error.message.includes(credentials.token),
  );
  assert.equal(calls, 1);
});

test("429 retries are bounded and do not accept an unbounded wait", async (): Promise<void> => {
  for (const delay of [0, 31]) {
    let calls = 0;
    const transport: typeof fetch = async (): Promise<Response> => {
      calls++;
      return Response.json({ retry_after: delay }, { status: 429 });
    };
    await assert.rejects(
      discordChannelRequest(
        credentials,
        route,
        "PATCH",
        {},
        { reason: "test", transport, sleep: async (): Promise<void> => {} },
      ),
    );
    assert.equal(calls, delay === 0 ? 3 : 1);
  }
});

test("new message and pin routes work without legacy pin API or crossposting", async (): Promise<void> => {
  const transport: typeof fetch = async (): Promise<Response> =>
    new Response(null, { status: 204 });
  const options = { reason: "test", transport };
  assert.equal(
    await discordChannelRequest(
      credentials,
      `${route}/messages`,
      "POST",
      {},
      options,
    ),
    null,
  );
  assert.equal(
    await discordChannelRequest(
      credentials,
      `${route}/messages/pins/1555101000000000011`,
      "PUT",
      undefined,
      options,
    ),
    null,
  );
  await assert.rejects(
    discordChannelRequest(
      credentials,
      `${route}/messages/1555101000000000011/crosspost`,
      "POST",
      {},
      options,
    ),
  );
});
