import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classGuides,
  newRevisionChannels,
  revisionResources,
  revisionTargets,
  specUrl,
} from "../content/kfc-revision";
import { kfcApplicationId, kfcGuildId } from "../content/kfc-community";
import {
  kfcForeverDiscussionId,
  kfcForeverApplicationUrl,
  kfcForeverInviteContacts,
  kfcForeverJoiningDescription,
  kfcForeverJoiningFooter,
  kfcForeverJoiningTopic,
} from "../content/kfc-forever-joining";
import {
  assertRevisionAudience,
  attachClassSubscriptions,
  splitPvpSubscriptions,
  onboardingReadbackMatches,
  onboardingWritePayload,
  resourceMatches,
  resourceChecksum,
  renderedResource,
  forumCreationFields,
  botMaintenancePatch,
} from "../lib/kfc-revision";
import { kfcRequest } from "../lib/kfc-community";
import type { ExperienceChannel } from "../lib/discord-channel-experience";
import type { DiscordAuditSnapshot } from "../lib/discord-audit";

const ids = Object.fromEntries(
  newRevisionChannels.map((c, index): [string, string] => [
    c.key,
    (1559000000000000000n + BigInt(index)).toString(),
  ]),
);
const sharedPvpId = "1557974303432118272";

test("Maintenance grants change only the bot member overwrite and are idempotent", (): void => {
  const before: ExperienceChannel = {
    id: "1559000000000000099",
    guild_id: kfcGuildId,
    name: "resource",
    type: 0,
    parent_id: null,
    position: 0,
    permission_overwrites: [
      { id: kfcGuildId, type: 0, allow: "0", deny: "377957124096" },
      { id: "1559000000000000010", type: 1, allow: "1024", deny: "0" },
      {
        id: kfcApplicationId,
        type: 1,
        allow: "64",
        deny: (1n << 11n).toString(),
      },
    ],
  };
  const original = structuredClone(before);
  const patch = botMaintenancePatch(before, false);
  assert.ok(patch.permission_overwrites);
  assert.deepEqual(
    patch.permission_overwrites.slice(0, 2),
    before.permission_overwrites.slice(0, 2),
  );
  const bot = patch.permission_overwrites[2];
  assert.equal(BigInt(bot.allow) & (1n << 11n), 1n << 11n);
  assert.equal(BigInt(bot.allow) & (1n << 51n), 1n << 51n);
  assert.equal(BigInt(bot.deny) & (1n << 11n), 0n);
  assert.equal(BigInt(bot.allow) & 8n, 0n);
  assert.equal(BigInt(bot.allow) & (1n << 34n), 0n);
  assert.deepEqual(
    botMaintenancePatch(
      { ...before, permission_overwrites: patch.permission_overwrites },
      false,
    ),
    patch,
  );
  assert.deepEqual(before, original);
});

test("Forum maintenance requires an exact guild/forum destination and adds only bot thread capabilities", (): void => {
  const forum: ExperienceChannel = {
    id: "1559000000000000099",
    guild_id: kfcGuildId,
    name: "crafting",
    type: 15,
    parent_id: null,
    position: 0,
    permission_overwrites: [],
  };
  const patch = botMaintenancePatch(forum, true);
  assert.ok(patch.permission_overwrites);
  assert.equal(patch.permission_overwrites.length, 1);
  const bot = patch.permission_overwrites[0];
  assert.equal(bot.id, kfcApplicationId);
  assert.equal(bot.type, 1);
  assert.equal(
    BigInt(bot.allow) & ((1n << 34n) | (1n << 38n)),
    (1n << 34n) | (1n << 38n),
  );
  assert.throws(() =>
    botMaintenancePatch({ ...forum, guild_id: "1554316932948172940" }, true),
  );
  assert.throws(() => botMaintenancePatch({ ...forum, type: 0 }, true));
  assert.throws(() => botMaintenancePatch({ ...forum, type: 11 }, false));
});
const editionOnboarding = {
  enabled: false,
  mode: 0,
  default_channel_ids: ["1412553351874215976"],
  prompts: [
    {
      id: "1554796912673170001",
      title: "What brings you here?",
      type: 0,
      required: true,
      single_select: false,
      in_onboarding: true,
      options: [
        {
          id: "1554796912673170010",
          title: "TBC raids",
          description: "TBC",
          channel_ids: ["1460899582824153140"],
          role_ids: [] as string[],
        },
        {
          id: "1554796912673170011",
          title: "WoW Forever",
          description: "Forever",
          channel_ids: ["1548519535177629707"],
          role_ids: [] as string[],
        },
        {
          id: "1554796912673170012",
          title: "PvP groups",
          description: "PvP",
          channel_ids: [
            sharedPvpId,
            "1463110825790148639",
            "1463605381342429195",
          ],
          role_ids: [] as string[],
        },
        {
          id: "1554796912673170013",
          title: "Friends / still deciding",
          description: "Browse",
          channel_ids: ["1412553351874215976"],
          role_ids: [] as string[],
        },
      ],
    },
    {
      id: "1554796912673170002",
      title: "Another interest",
      type: 1,
      required: false,
      single_select: false,
      in_onboarding: false,
      options: [
        {
          id: "1554796912673170040",
          title: "Optional class",
          description: "Preserve this",
          channel_ids: ["1559000000000000022"],
          role_ids: ["1559000000000000044"],
        },
      ],
    },
  ],
};
test("All nine classes and 28 role treatments have exact beta spec sources", (): void => {
  assert.equal(classGuides.length, 9);
  assert.equal(classGuides.flatMap((g) => g.specs).length, 28);
  for (const guide of classGuides)
    for (const spec of guide.specs)
      assert.match(
        specUrl(guide.name, spec),
        /^https:\/\/www\.wowhead\.com\/forever\/guide\/classes\/[a-z]+\/[a-z-]+\/level-30-(dps|tank|healer)-overview$/,
      );
});
test("Resources fit mobile-friendly single embeds, have artwork, suppress mentions and exclude calendar ownership", (): void => {
  const resources = revisionResources(ids);
  assert.equal(new Set(resources.map((r) => r.key)).size, resources.length);
  assert.equal(
    resources.some((r) => r.key === "calendar"),
    false,
  );
  for (const resource of resources) {
    assert.deepEqual(resource.payload.allowed_mentions.parse, []);
    assert.equal(resource.payload.embeds.length, 1);
    const embed = resource.payload.embeds[0];
    assert.ok(embed.description.length <= 4096);
    assert.ok(embed.title.length <= 256);
    assert.ok(
      embed.description.length + embed.title.length + embed.footer.text.length <
        6000,
    );
    assert.doesNotMatch(embed.description, /owner reports|KFC team/);
    if (resource.key.startsWith("class-")) assert.ok(embed.thumbnail);
    if (resource.key.startsWith("forever-")) assert.ok(embed.image);
  }
});
test("TBC applicants can post after verification while Forever has its own joining route", (): void => {
  const tbc = revisionTargets.find(
    (target): boolean => target.id === "1411545946155909150",
  );
  assert.equal(tbc?.name, "tbc-application");
  assert.equal(tbc?.parentId, "1441654698519040114");
  assert.equal(tbc?.readOnly, false);
  assert.equal(tbc?.maintained, true);
  assert.equal(
    revisionTargets.some(
      (target): boolean => target.name === "legacy-applications",
    ),
    false,
  );
  const forever = newRevisionChannels.find(
    (target): boolean => target.key === "application-forever",
  );
  assert.equal(forever?.name, "forever-application");
  assert.equal(forever?.type, 0);
  assert.equal(forever?.parentId, "1548517693957869619");
  const resources = revisionResources(ids);
  const applications = resources.filter((resource): boolean =>
    resource.key.startsWith("application-"),
  );
  assert.equal(applications.length, 2);
  assert.equal(
    applications.find((resource): boolean => resource.key === "application-tbc")
      ?.channelId,
    tbc?.id,
  );
  assert.equal(
    applications.find(
      (resource): boolean => resource.key === "application-forever",
    )?.channelId,
    ids["application-forever"],
  );
  assert.equal(
    new Set(applications.map((resource): string => resource.channelId)).size,
    2,
  );
  const tbcDescription = applications.find(
    (resource): boolean => resource.key === "application-tbc",
  )!.payload.embeds[0].description;
  assert.match(tbcDescription, /After community verification/);
  assert.match(tbcDescription, /post your application in this channel/);
  assert.match(tbcDescription, /do not need KFC Certified to apply/);
  assert.match(tbcDescription, /prefer a private application/);
  assert.match(tbcDescription, /timezone/);
  for (const key of ["joining"]) {
    const description = resources.find(
      (resource): boolean => resource.key === key,
    )!.payload.embeds[0].description;
    assert.ok(description.includes(`<#${tbc?.id}>`));
    assert.ok(description.includes(`<#${kfcForeverDiscussionId}>`));
  }
});
test("The detailed guild joining guide retains the group lineup and day-one contacts", (): void => {
  assert.deepEqual(kfcForeverInviteContacts, [
    "Djilanov",
    "psyrogue",
    "nelf",
    "nunk",
    "Animagigel",
  ]);
  for (const key of ["joining"]) {
    const resource = revisionResources(ids).find(
      (item): boolean => item.key === key,
    )!;
    const embed = resource.payload.embeds[0];
    assert.ok(embed.description.startsWith(kfcForeverJoiningDescription));
    assert.match(embed.description, /Casual groups/);
    assert.match(
      embed.description,
      /two \*\*10-player\*\* groups and one \*\*20-player\*\* group/,
    );
    assert.match(embed.description, /Guild invites from day one/);
    assert.match(embed.description, /A guild and a PUG community/);
    assert.match(embed.description, /helping fill empty spots/);
    assert.match(
      embed.description,
      /actively recruiting for morning and daytime Forever raids/,
    );
    assert.match(
      embed.description,
      /Djilanov.*experienced organizer.*morning\/daytime and hardcore runs/,
    );
    assert.match(
      embed.description,
      /Psyrogue.*standard daily Forever evening raid/,
    );
    assert.match(
      embed.description,
      /20:00 Central European local time \(CET\/CEST\)/,
    );
    assert.match(
      embed.description,
      /An officer confirms your acceptance into the guild separately/,
    );
    assert.match(
      embed.description,
      /join open runs without applying to the guild/,
    );
    assert.match(
      embed.description,
      /Application received means pending, not accepted/,
    );
    assert.match(
      embed.description,
      /confirms the decision privately through your chosen contact method/,
    );
    assert.ok(embed.description.includes(kfcForeverApplicationUrl));
    for (const name of kfcForeverInviteContacts) {
      assert.ok(embed.description.includes(`**${name}**`));
      assert.ok(kfcForeverJoiningTopic.includes(name));
    }
    assert.ok(embed.description.includes(`<#${kfcForeverDiscussionId}>`));
    assert.doesNotMatch(
      embed.description,
      /pinned template|Apply privately|DM a member|@everyone|@here/,
    );
    assert.equal(embed.footer.text, kfcForeverJoiningFooter);
    assert.deepEqual(resource.payload.allowed_mentions.parse, []);
    const applicationButton = resource.payload.components?.[0].components[0];
    assert.equal(applicationButton?.label, "Apply to join KFC");
    assert.equal(applicationButton?.url, kfcForeverApplicationUrl);
    assert.equal(applicationButton?.style, 5);
  }
  assert.equal(
    newRevisionChannels.find(
      (target): boolean => target.key === "application-forever",
    )?.topic,
    kfcForeverJoiningTopic,
  );
});
test("Joining button ownership includes destinations and ignores Discord component metadata", (): void => {
  const payload = revisionResources(ids).find(
    (resource): boolean => resource.key === "joining",
  )!.payload;
  assert.ok(payload.components);
  const actual = {
    ...payload,
    components: payload.components.map((row) => ({
      ...row,
      id: 1,
      components: row.components.map((button) => ({ ...button, id: 2 })),
    })),
  };
  assert.equal(resourceMatches(actual, payload), true);
  const changed = structuredClone(payload);
  changed.components![0].components[0].url = "https://kfcguild.online/";
  assert.equal(resourceMatches(changed, payload), false);
  assert.notEqual(resourceChecksum(changed), resourceChecksum(payload));
  const disabled = {
    ...payload,
    components: payload.components.map((row) => ({
      ...row,
      components: row.components.map((button) => ({
        ...button,
        disabled: true,
      })),
    })),
  };
  assert.equal(resourceMatches(disabled, payload), false);
});
test("Resources without link buttons retain their previous checksum representation", (): void => {
  const payload = revisionResources(ids).find(
    (resource): boolean => resource.key === "loot",
  )!.payload;
  assert.equal("components" in renderedResource(payload), false);
  assert.equal(
    resourceChecksum({ ...payload, components: [] }),
    resourceChecksum(payload),
  );
});
test("Ownership renderer tolerates Discord's metadata but detects changed copy and images", (): void => {
  const payload = revisionResources(ids)[0].payload;
  const actual = {
    ...payload,
    id: "1",
    embeds: payload.embeds.map((e) => ({ ...e, type: "rich" })),
  };
  assert.ok(resourceMatches(actual, payload));
  assert.equal(
    resourceMatches({ ...actual, content: "Owner changed this" }, payload),
    false,
  );
  assert.equal(resourceChecksum(payload), resourceChecksum(payload));
  assert.notEqual(
    resourceChecksum(payload),
    resourceChecksum({ ...payload, content: "changed" }),
  );
});
test("Optional class subscriptions preserve enabled state, current channels and unrelated prompts", (): void => {
  const prompt = {
    id: "123",
    title: "Which classes do you play?",
    type: 1,
    required: false,
    single_select: false,
    in_onboarding: false,
    options: classGuides.map((g) => ({
      id: g.name,
      title: g.name,
      role_ids: [g.name],
      channel_ids: ["existing"],
      description: "existing copy",
    })),
  };
  const current = {
    enabled: false,
    mode: 0,
    default_channel_ids: ["a"],
    prompts: [prompt, { ...prompt, id: "456", title: "Other question" }],
  };
  const after = attachClassSubscriptions(current, ids) as typeof current;
  assert.equal(after.enabled, false);
  assert.deepEqual(after.prompts[1], current.prompts[1]);
  for (const option of after.prompts[0].options)
    assert.deepEqual(option.channel_ids, [
      "existing",
      ids[option.title.toLowerCase()],
    ]);
  assert.deepEqual(attachClassSubscriptions(after, ids), after);
  assert.deepEqual(current.prompts[0].options[0].channel_ids, ["existing"]);
  assert.throws(() =>
    attachClassSubscriptions(
      { ...current, prompts: [{ ...prompt, required: true }] },
      ids,
    ),
  );
});
test("Edition-specific PvP only subscribes Forever players to shared and Forever channels", (): void => {
  const before = structuredClone(editionOnboarding);
  const after = splitPvpSubscriptions(before, sharedPvpId) as typeof before;
  assert.deepEqual(before, editionOnboarding);
  assert.equal(after.enabled, false);
  assert.equal(after.mode, before.mode);
  assert.deepEqual(after.default_channel_ids, before.default_channel_ids);
  assert.deepEqual(after.prompts[1], before.prompts[1]);
  assert.deepEqual(after.prompts[0].options[0], before.prompts[0].options[0]);
  assert.deepEqual(after.prompts[0].options[1], before.prompts[0].options[1]);
  assert.deepEqual(after.prompts[0].options[4], before.prompts[0].options[3]);
  const tbc = after.prompts[0].options[2];
  const forever = after.prompts[0].options[3];
  assert.equal(tbc.title, "TBC PvP");
  assert.equal(tbc.id, before.prompts[0].options[2].id);
  assert.deepEqual(tbc.channel_ids, before.prompts[0].options[2].channel_ids);
  assert.equal(forever.title, "Forever PvP");
  assert.deepEqual(forever.channel_ids, [sharedPvpId, "1548519535177629707"]);
  assert.deepEqual(forever.role_ids, []);
  assert.equal(after.prompts[0].single_select, false);
  assert.deepEqual(splitPvpSubscriptions(after, sharedPvpId), after);
  assert.equal(
    splitPvpSubscriptions({ ...before, enabled: true }, sharedPvpId).enabled,
    true,
  );
});
test("PvP routing refuses changed privileges, extra destinations and conflicting option identities", (): void => {
  const changedRole = structuredClone(editionOnboarding);
  changedRole.prompts[0].options[2].role_ids = ["1411709733366403213"];
  assert.throws(() => splitPvpSubscriptions(changedRole, sharedPvpId));
  const extraChannel = structuredClone(editionOnboarding);
  extraChannel.prompts[0].options[2].channel_ids.push("1559000000000000018");
  assert.throws(() => splitPvpSubscriptions(extraChannel, sharedPvpId));
  const idConflict = structuredClone(editionOnboarding);
  idConflict.prompts[1].options[0].id = "1554796912673170014";
  assert.throws(() => splitPvpSubscriptions(idConflict, sharedPvpId));
  const duplicate = structuredClone(editionOnboarding);
  duplicate.prompts[0].options.push(duplicate.prompts[0].options[1]);
  assert.throws(() => splitPvpSubscriptions(duplicate, sharedPvpId));
  const singleSelect = structuredClone(editionOnboarding);
  singleSelect.prompts[0].single_select = true;
  assert.throws(() => splitPvpSubscriptions(singleSelect, sharedPvpId));
  assert.throws(() =>
    splitPvpSubscriptions({ ...editionOnboarding, prompts: [] }, sharedPvpId),
  );
  assert.throws(() => splitPvpSubscriptions(editionOnboarding, "invalid"));
});
test("Already split onboarding cannot silently reintroduce a TBC channel into Forever PvP", (): void => {
  const after = splitPvpSubscriptions(
    editionOnboarding,
    sharedPvpId,
  ) as typeof editionOnboarding;
  after.prompts[0].options[3].channel_ids.push("1463110825790148639");
  assert.throws(() => splitPvpSubscriptions(after, sharedPvpId));
});
test("Onboarding read-back accepts Discord's new option ID, unordered channel sets and empty emoji metadata", (): void => {
  const desired = splitPvpSubscriptions(
    editionOnboarding,
    sharedPvpId,
  ) as typeof editionOnboarding;
  const actual = structuredClone(desired);
  actual.prompts[0].options[3].id = "1558011956651102273";
  actual.prompts[0].options[2].channel_ids.reverse();
  const withMetadata = {
    ...actual,
    guild_id: kfcGuildId,
    prompts: actual.prompts.map((prompt) => ({
      ...prompt,
      options: prompt.options.map((option) => ({
        ...option,
        emoji: { id: null, name: null, animated: false },
      })),
    })),
  };
  assert.equal(
    onboardingReadbackMatches(withMetadata, desired, editionOnboarding),
    true,
  );
  assert.equal(desired.prompts[0].options[3].id, "1554796912673170014");
  assert.equal(onboardingReadbackMatches(actual, actual, actual), true);
});
test("Read-back normalization still rejects changed routes, privileges, enabled state and existing identities", (): void => {
  const desired = splitPvpSubscriptions(
    editionOnboarding,
    sharedPvpId,
  ) as typeof editionOnboarding;
  for (const change of [
    (value: typeof desired): void => {
      value.enabled = true;
    },
    (value: typeof desired): void => {
      value.prompts[0].options[0].id = "1558011956651102200";
    },
    (value: typeof desired): void => {
      value.prompts[0].options[3].channel_ids.push("1463110825790148639");
    },
    (value: typeof desired): void => {
      value.prompts[0].options[3].role_ids.push("1411709733366403213");
    },
    (value: typeof desired): void => {
      value.prompts[0].options.reverse();
    },
    (value: typeof desired): void => {
      value.prompts[0].options[3].id = value.prompts[0].options[0].id;
    },
  ]) {
    const actual = structuredClone(desired);
    change(actual);
    assert.equal(
      onboardingReadbackMatches(actual, desired, editionOnboarding),
      false,
    );
  }
});
test("Onboarding writes preserve existing emoji using Discord's writable fields", (): void => {
  const data = {
    ...editionOnboarding,
    prompts: editionOnboarding.prompts.map((prompt) => ({
      ...prompt,
      options: prompt.options.map((option) => ({
        ...option,
        emoji: { id: "1558011956651102300", name: "class", animated: false },
      })),
    })),
  };
  const payload = onboardingWritePayload(data) as {
    prompts: { options: Record<string, unknown>[] }[];
  };
  for (const option of payload.prompts.flatMap((prompt) => prompt.options)) {
    assert.equal("emoji" in option, false);
    assert.equal(option.emoji_id, "1558011956651102300");
    assert.equal(option.emoji_name, "class");
    assert.equal(option.emoji_animated, false);
  }
  assert.equal(data.prompts[0].options[0].emoji.id, "1558011956651102300");
});
test("Moves preserve role/member audiences and reject an accidentally public archive", (): void => {
  const before: ExperienceChannel = {
    id: "1559000000000000099",
    guild_id: kfcGuildId,
    type: 0,
    name: "private",
    parent_id: null,
    position: 0,
    permission_overwrites: [
      { id: kfcGuildId, type: 0, allow: "0", deny: "1024" },
      { id: "1559000000000000010", type: 1, allow: "1024", deny: "0" },
    ],
  };
  const snapshot = {
    guild: { id: kfcGuildId },
    application: { id: kfcApplicationId },
    bot: { id: kfcApplicationId },
    roles: [{ id: kfcGuildId, permissions: "0" }],
    channels: [before],
    botRoleIds: [],
  } as unknown as DiscordAuditSnapshot;
  assertRevisionAudience(
    before,
    { ...before, parent_id: "1559000000000000012" },
    snapshot,
  );
  assert.throws(() =>
    assertRevisionAudience(
      before,
      {
        ...before,
        permission_overwrites: [
          { id: kfcGuildId, type: 0, allow: "1024", deny: "0" },
        ],
      },
      snapshot,
    ),
  );
  assert.throws(() =>
    assertRevisionAudience(
      before,
      { ...before, permission_overwrites: [before.permission_overwrites[0]] },
      snapshot,
    ),
  );
});
test("Crafting board separates member status from staff Reviewed tag", (): void => {
  const forum = newRevisionChannels.find((c) => c.key === "crafting")!;
  assert.equal(forum.type, 15);
  assert.ok(forum.tags!.length <= 20);
  assert.ok(forum.tags!.includes("Reviewed"));
  assert.ok(forum.tags!.includes("Fulfilled"));
  assert.match(forum.topic!, /30 days/);
});
test("Forum creation does not rely on ignored flags; preserves status tags and list layout", (): void => {
  const fields = forumCreationFields(["Open", "Fulfilled", "Reviewed"]);
  assert.equal(Object.hasOwn(fields, "flags"), false);
  assert.deepEqual(fields.available_tags, [
    { name: "Open", moderated: false },
    { name: "Fulfilled", moderated: false },
    { name: "Reviewed", moderated: true },
  ]);
  assert.equal(fields.default_forum_layout, 1);
  assert.throws(() => forumCreationFields(["Open", "Open"]));
});
test("Bulk positions reject unrelated IDs, duplicate IDs, permission syncing and parent changes before I/O", async (): Promise<void> => {
  const credentials = {
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: "x".repeat(64),
  };
  let requests = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    requests++;
    return new Response(null, { status: 204 });
  };
  const id = "1559000000000000099";
  const options = { channelIds: new Set([id]), transport };
  for (const body of [
    [{ id: "1559000000000000088", position: 0 }],
    [
      { id, position: 0 },
      { id, position: 1 },
    ],
    [{ id, position: 0, lock_permissions: true }],
    [{ id, position: 0, parent_id: "1559000000000000012" }],
  ])
    await assert.rejects(
      kfcRequest(
        credentials,
        `/guilds/${kfcGuildId}/channels`,
        "PATCH",
        body,
        options,
      ),
    );
  assert.equal(requests, 0);
  await kfcRequest(
    credentials,
    `/guilds/${kfcGuildId}/channels`,
    "PATCH",
    [{ id, position: 0 }],
    options,
  );
  assert.equal(requests, 1);
});
