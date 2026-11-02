import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classLabs,
  classLabBotId,
  classLabGuildId,
  classLabDiscussionId,
  classLabIndex,
  classLabMessage,
  classLabIndexMessage,
  classLabThreadName,
  classLabThreadStarter,
  classLabAnnouncement,
  type ClassLabMessage,
} from "../content/kfc-class-labs";
import {
  assertClassLabPayload,
  assertClassLabUrl,
  classLabPayloadUrls,
  classLabChannelSchema,
  assertClassLabOwner,
  classLabReadbackMatches,
  classLabMessageChecksum,
  classLabPermissionFingerprint,
  assertClassLabDiscussion,
  assertClassLabThread,
  type ClassLabChannel,
  type ClassLabReadMessage,
} from "../lib/kfc-class-labs";
import { kfcRequest } from "../lib/kfc-community";

const threadId = "1566000000000000999";
const firstClass = classLabs[0]!;
function guide(): ClassLabMessage {
  return classLabMessage(firstClass, threadId);
}
function message(payload: ClassLabMessage = guide()): ClassLabReadMessage {
  return {
    id: firstClass.messageId,
    channel_id: firstClass.channelId,
    author: { id: classLabBotId, bot: true },
    content: payload.content,
    embeds: payload.embeds,
    components: payload.components,
    pinned: true,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
  };
}
function discussion(): ClassLabChannel {
  return classLabChannelSchema.parse({
    id: classLabDiscussionId,
    guild_id: classLabGuildId,
    type: 0,
    name: "forever-discussion",
    permission_overwrites: [
      { id: classLabGuildId, type: 0, allow: "377957190656", deny: "0" },
    ],
  });
}
function thread(): ClassLabChannel {
  return classLabChannelSchema.parse({
    id: threadId,
    guild_id: classLabGuildId,
    type: 11,
    name: classLabThreadName(firstClass),
    parent_id: classLabDiscussionId,
    owner_id: classLabBotId,
    thread_metadata: { archived: false, locked: false },
  });
}

test("Class coverage is nine unique classes and ten existing KFC pins", (): void => {
  assert.equal(classLabGuildId, "1411533815356194968");
  assert.deepEqual(
    classLabs.map((lab): string => lab.slug),
    [
      "warrior",
      "paladin",
      "hunter",
      "rogue",
      "priest",
      "mage",
      "warlock",
      "druid",
      "shaman",
    ],
  );
  assert.equal(
    new Set([
      classLabIndex.channelId,
      ...classLabs.map((lab): string => lab.channelId),
    ]).size,
    10,
  );
  assert.equal(
    new Set([
      classLabIndex.messageId,
      ...classLabs.map((lab): string => lab.messageId),
    ]).size,
    10,
  );
});

test("Every class post fits Discord and has three working resource actions", (): void => {
  for (const lab of classLabs) {
    const payload = classLabMessage(lab, threadId);
    assertClassLabPayload(payload);
    assert.deepEqual(
      payload.components[0]!.components.map((button): string => button.label),
      ["DPS guide", "Simulator", "Discuss"],
    );
    assert.equal(
      payload.embeds[0]!.thumbnail?.url,
      `https://kfcguild.online/tools/wow-assets/classes/${lab.slug}.jpg`,
    );
    assert.equal(
      payload.components[0]!.components[2]!.url,
      `https://discord.com/channels/${classLabGuildId}/${threadId}`,
    );
    assert.match(payload.embeds[0]!.footer.text, /^Open source contributors/);
    assert.match(
      JSON.stringify(payload),
      new RegExp(`/encyclopedia/talents/${lab.slug}`),
    );
  }
  assertClassLabPayload(classLabIndexMessage());
});

test("Damage, tank and actual healing profiles are linked separately", (): void => {
  const healers = classLabs.filter((lab): boolean =>
    lab.roleLinks.some((link): boolean => link.url.includes("/healing-")),
  );
  assert.deepEqual(
    healers.map((lab): string => lab.slug),
    ["paladin", "priest", "druid", "shaman"],
  );
  const tanks = classLabs.filter((lab): boolean =>
    lab.roleLinks.some((link): boolean =>
      /tank-warrior|protection-paladin|feral-tank-druid/.test(link.url),
    ),
  );
  assert.deepEqual(
    tanks.map((lab): string => lab.slug),
    ["warrior", "paladin", "druid"],
  );
  const paladin = classLabs.find((lab): boolean => lab.slug === "paladin")!;
  assert.match(paladin.focus, /separate healing engine/);
  const hunter = classLabs.find((lab): boolean => lab.slug === "hunter")!;
  assert.match(hunter.focus, /Survival reference is melee/);
});

test("No stale level-30 pointers, fixed performance promises or staff attribution", (): void => {
  const text = JSON.stringify([
    classLabIndexMessage(),
    ...classLabs.map((lab): ClassLabMessage => classLabMessage(lab, threadId)),
  ]);
  assert.doesNotMatch(
    text,
    /wowhead|level 30|patch 1\.60\.1|KFC team|\d[\d,.]*\s+(?:DPS|HPS)\b/i,
  );
  assert.match(text, /original benchmark dates/);
  assert.match(text, /newer model/);
  assert.match(text, /not live combat logs or raid-slot requirements/);
  assert.match(text, /TBC is separate/);
});

test("Discussion prompts are class-specific, untagged and fit one message", (): void => {
  assert.equal(new Set(classLabs.map((lab): string => lab.question)).size, 9);
  for (const lab of classLabs) {
    assert.ok(classLabThreadName(lab).length <= 100);
    const starter = classLabThreadStarter(lab);
    assert.ok(starter.length <= 2000);
    assert.match(
      starter,
      /gear, buffs, target count, fight length and model\/version/,
    );
    assert.match(starter, /Keep Solo and Raid separate/);
    assert.ok(starter.includes(lab.question));
    assert.doesNotMatch(starter, /<@|@everyone|@here/);
  }
  const announcement = classLabAnnouncement();
  assert.ok(announcement.length <= 2000);
  assert.doesNotMatch(announcement, /<@|@everyone|@here/);
  assert.ok(announcement.includes(`<#${classLabIndex.channelId}>`));
});

test("Resource links stay on approved public origins and KFC Discord", (): void => {
  const payloads = [
    classLabIndexMessage(),
    ...classLabs.map((lab): ClassLabMessage => classLabMessage(lab, threadId)),
  ];
  for (const payload of payloads)
    for (const url of classLabPayloadUrls(payload)) assertClassLabUrl(url);
  const unsafe = [
    "http://kfcguild.online/tools/forever/simulator",
    "https://user:secret@kfcguild.online/tools/forever/simulator",
    "https://kfcguild.online:8443/tools/forever/simulator",
    "https://kfcguild.online.evil.example/tools/forever/simulator",
    "https://kfcguild.online/admin",
    "https://kfcguild.online/tools/forever/simulator?class=invalid",
    "https://kfcguild.online/tools/forever/simulator?class=mage&class=warrior",
    "https://kfcguild.online/tools/forever/tier-list?class=mage",
    "https://kfcguild.online/tools/forever/simulator?token=secret",
    "https://www.wowforeverdiscord.online/guides#simulator-profiles",
    `https://discord.com/channels/1554316932948172940/${threadId}`,
  ];
  for (const url of unsafe) assert.throws((): void => assertClassLabUrl(url));
  assert.throws((): ClassLabMessage =>
    classLabMessage(firstClass, "not-a-thread"),
  );
  assert.throws((): ClassLabMessage =>
    classLabMessage(firstClass, "00000000000000000"),
  );
});

test("Payload boundary rejects pings, invalid links and Discord overflow", (): void => {
  const ping = guide();
  ping.content = "@everyone";
  assert.throws((): void => assertClassLabPayload(ping));
  const mention = guide();
  mention.embeds[0]!.fields[0]!.value = `<@${classLabBotId}>`;
  assert.throws((): void => assertClassLabPayload(mention));
  const invalid = guide();
  invalid.embeds[0]!.description = "[click](http://example.com)";
  assert.throws((): void => assertClassLabPayload(invalid));
  const tooLong = guide();
  tooLong.embeds[0]!.fields[0]!.value = "x".repeat(1025);
  assert.throws((): void => assertClassLabPayload(tooLong));
  const total = guide();
  total.embeds[0]!.description = "x".repeat(4000);
  total.embeds[0]!.fields = Array.from({ length: 3 }, () => ({
    name: "Data",
    value: "x".repeat(1000),
    inline: false,
  }));
  assert.throws(
    (): void => assertClassLabPayload(total),
    /total character limit/,
  );
});

test("Bot ownership, exact identity and pinned state are required", (): void => {
  assertClassLabOwner(message(), firstClass.channelId, firstClass.messageId);
  const variants = [
    { ...message(), pinned: false },
    { ...message(), author: { id: "407839813769756693", bot: false } },
    { ...message(), author: { id: classLabBotId, bot: false } },
    { ...message(), channel_id: classLabDiscussionId },
    { ...message(), id: threadId },
  ];
  for (const value of variants)
    assert.throws((): void => {
      assertClassLabOwner(value, firstClass.channelId, firstClass.messageId);
    });
});

test("Readback accepts Discord metadata but detects changed text, links or mentions", (): void => {
  const payload = guide();
  const apiMessage = message(payload);
  apiMessage.embeds = payload.embeds.map((embed) => ({
    ...embed,
    type: "rich",
    thumbnail: {
      ...embed.thumbnail,
      proxy_url: "https://images-ext-1.discordapp.net/example",
      width: 64,
      height: 64,
    },
    fields: embed.fields.map((field) => ({
      name: field.name,
      value: field.value,
    })),
  }));
  apiMessage.components = payload.components.map((row) => ({
    ...row,
    id: 1,
    components: row.components.map((button) => ({ ...button, id: 2 })),
  }));
  assert.equal(classLabReadbackMatches(apiMessage, payload), true);
  assert.equal(
    classLabReadbackMatches({ ...apiMessage, content: "changed" }, payload),
    false,
  );
  assert.equal(
    classLabReadbackMatches({ ...apiMessage, mention_everyone: true }, payload),
    false,
  );
  assert.equal(
    classLabReadbackMatches(
      { ...apiMessage, mentions: [{ id: classLabBotId }] },
      payload,
    ),
    false,
  );
  assert.equal(
    classLabReadbackMatches(
      { ...apiMessage, mention_roles: [classLabGuildId] },
      payload,
    ),
    false,
  );
  assert.equal(
    classLabReadbackMatches({ ...apiMessage, embeds: [] }, payload),
    false,
  );
});

test("Resource checksums detect edits and unpinning, not transport timestamps", (): void => {
  const original = message();
  assert.equal(
    classLabMessageChecksum(original),
    classLabMessageChecksum({
      ...original,
      edited_timestamp: "2026-10-31T12:00:00Z",
    }),
  );
  assert.notEqual(
    classLabMessageChecksum(original),
    classLabMessageChecksum({ ...original, pinned: false }),
  );
  assert.notEqual(
    classLabMessageChecksum(original),
    classLabMessageChecksum({ ...original, content: "owner edit" }),
  );
});

test("Permission fingerprints are order-independent but detect real changes", (): void => {
  const first = discussion();
  first.permission_overwrites.push({
    id: classLabBotId,
    type: 1,
    allow: "1024",
    deny: "0",
  });
  const reordered = {
    ...first,
    permission_overwrites: [...first.permission_overwrites].reverse(),
  };
  assert.equal(
    classLabPermissionFingerprint(first),
    classLabPermissionFingerprint(reordered),
  );
  const changed = structuredClone(first);
  changed.permission_overwrites[0]!.deny = "2048";
  assert.notEqual(
    classLabPermissionFingerprint(first),
    classLabPermissionFingerprint(changed),
  );
});

test("Discussion requires existing public reply access; no permission repair", (): void => {
  const original = discussion();
  const before = JSON.stringify(original);
  assertClassLabDiscussion(original);
  assert.equal(JSON.stringify(original), before);
  for (const value of [
    { ...original, id: threadId },
    { ...original, guild_id: "1554316932948172940" },
    { ...original, type: 15 },
    { ...original, permission_overwrites: [] },
    {
      ...original,
      permission_overwrites: [
        { id: classLabGuildId, type: 0, allow: "66560", deny: "0" },
      ],
    },
    {
      ...original,
      permission_overwrites: [
        { id: classLabGuildId, type: 0, allow: "377957190656", deny: "2048" },
      ],
    },
  ])
    assert.throws((): void =>
      assertClassLabDiscussion(classLabChannelSchema.parse(value)),
    );
});

test("Threads must be bot-owned, open, public and in KFC Forever discussion", (): void => {
  assertClassLabThread(thread());
  for (const value of [
    { ...thread(), guild_id: "1554316932948172940" },
    { ...thread(), parent_id: firstClass.channelId },
    { ...thread(), owner_id: "407839813769756693" },
    { ...thread(), type: 12 },
    { ...thread(), thread_metadata: undefined },
    { ...thread(), thread_metadata: { archived: true, locked: false } },
    { ...thread(), thread_metadata: { archived: false, locked: true } },
  ])
    assert.throws((): void => {
      assertClassLabThread(value);
    });
});

test("Scoped transport rejects other guilds, channels and unapproved writes before I/O", async (): Promise<void> => {
  const credentials = {
    applicationId: classLabBotId,
    guildId: classLabGuildId,
    token: "fixture_not_a_real_token",
  };
  let calls = 0;
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return Response.json({ ok: true });
  };
  const options = { channelIds: new Set([classLabDiscussionId]), transport };
  for (const route of [
    "/guilds/1554316932948172940/channels",
    `/channels/${firstClass.channelId}/messages`,
    `/channels/${classLabDiscussionId}/permissions/${classLabGuildId}`,
  ])
    await assert.rejects(kfcRequest(credentials, route, "POST", {}, options));
  await assert.rejects(
    kfcRequest(
      credentials,
      `/channels/${classLabDiscussionId}`,
      "PUT",
      {},
      options,
    ),
  );
  assert.equal(calls, 0);
  await kfcRequest(
    credentials,
    `/channels/${classLabDiscussionId}/threads`,
    "POST",
    { type: 11 },
    options,
  );
  assert.equal(calls, 1);
});
