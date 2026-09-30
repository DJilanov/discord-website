import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  channelCleanupTargets,
  cleanupApplicationId,
  cleanupGuildId,
} from "../content/discord-channel-cleanup";
import {
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  applyChannelCleanup,
  createChannelCleanupPlan,
  validateChannelCleanupPlan,
  type CleanupProgress,
} from "../lib/discord-channel-cleanup";

const botRole = "1554800692257103874";
const credentials: AuditCredentials = {
  applicationId: cleanupApplicationId,
  guildId: cleanupGuildId,
  token: "synthetic-test-token-not-a-real-credential",
};

function fixture(): DiscordAuditSnapshot {
  return {
    capturedAt: "2026-09-30T12:00:00.000Z",
    bot: { id: cleanupApplicationId, username: "WoWForeverBot", bot: true },
    application: { id: cleanupApplicationId, name: "WoWForeverBot" },
    guild: {
      id: cleanupGuildId,
      name: "Test community",
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
        id: cleanupGuildId,
        name: "@everyone",
        position: 0,
        permissions: "1024",
        managed: false,
        mentionable: false,
      },
      {
        id: botRole,
        name: "Bot",
        position: 1,
        permissions: "1040",
        managed: true,
        mentionable: false,
      },
    ],
    botRoleIds: [botRole],
    channels: channelCleanupTargets.map((target, position) => ({
      id: target.id,
      guild_id: cleanupGuildId,
      name: `channel-${position}`,
      type: target.type,
      position,
      parent_id: null,
      topic: "Original topic",
      permission_overwrites: [],
      ...(target.type === 15 ? { available_tags: [] } : {}),
    })),
    onboarding: {
      status: "available",
      data: {
        guild_id: cleanupGuildId,
        enabled: true,
        mode: 1,
        default_channel_ids: [],
        prompts: [],
      },
    },
  };
}

interface RequestRecord {
  path: string;
  method: string;
  body?: Record<string, unknown>;
}
function mockDiscord(data: DiscordAuditSnapshot): {
  fetch: typeof fetch;
  requests: RequestRecord[];
} {
  const requests: RequestRecord[] = [];
  let nextTag = 0n;
  const reader: Record<string, () => unknown> = {
    "/users/@me": () => data.bot,
    "/applications/@me": () => data.application,
    [`/guilds/${cleanupGuildId}`]: () => data.guild,
    [`/guilds/${cleanupGuildId}/roles`]: () => data.roles,
    [`/guilds/${cleanupGuildId}/members/${cleanupApplicationId}`]: () => ({
      user: data.bot,
      roles: data.botRoleIds,
    }),
    [`/guilds/${cleanupGuildId}/channels`]: () => data.channels,
    [`/guilds/${cleanupGuildId}/onboarding`]: () =>
      data.onboarding.status === "available" ? data.onboarding.data : null,
  };
  return {
    requests,
    fetch: async (input, options): Promise<Response> => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://discord.com");
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal);
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        `Bot ${credentials.token}`,
      );
      const route = url.pathname.replace("/api/v10", "");
      const method = options?.method ?? "GET";
      const body = options?.body
        ? (JSON.parse(String(options.body)) as Record<string, unknown>)
        : undefined;
      requests.push({ path: route, method, body });
      if (reader[route]) {
        assert.equal(method, "GET");
        return Response.json(reader[route]());
      }
      const channel = data.channels.find(
        (entry) => route === `/channels/${entry.id}`,
      );
      assert.ok(channel, `Unexpected route: ${route}`);
      if (method === "PATCH") {
        assert.ok(body);
        assert.ok(
          Object.keys(body).every((key) =>
            ["topic", "available_tags"].includes(key),
          ),
        );
        assert.ok(new Headers(options?.headers).get("X-Audit-Log-Reason"));
        channel.topic = String(body.topic);
        if (body.available_tags)
          channel.available_tags = (
            body.available_tags as { name: string; moderated: boolean }[]
          ).map((tag) => ({
            ...tag,
            id: (1600000000000000000n + nextTag++).toString(),
          }));
      } else assert.equal(method, "GET");
      return Response.json(channel);
    },
  };
}

function options(
  mock: { fetch: typeof fetch },
  progress: CleanupProgress[] = [],
): Parameters<typeof applyChannelCleanup>[2] {
  return {
    tokenRotationConfirmed: true,
    fetch: mock.fetch,
    sleep: async (): Promise<void> => {},
    checkpoint: async (entry): Promise<void> => {
      progress.push(entry);
    },
  };
}

test("cleanup plan contains only 38 reviewed topics and six initially empty tag sets", () => {
  const plan = createChannelCleanupPlan(fixture());
  assert.equal(plan.changes.length, 38);
  assert.equal(
    plan.changes.filter((entry) => entry.patch.available_tags).length,
    6,
  );
  for (const { before, patch } of plan.changes) {
    assert.ok(patch.topic.length <= (before.type === 15 ? 4096 : 1024));
    assert.ok(!patch.topic.includes("Mythic+"));
    if (patch.available_tags)
      assert.equal(
        new Set(patch.available_tags.map((tag) => tag.name)).size,
        patch.available_tags.length,
      );
  }
  assert.ok(
    plan.changes
      .find((entry) => entry.before.id === "1554327854471184455")
      ?.patch.topic.startsWith("Horde"),
  );
  assert.ok(
    plan.changes
      .find((entry) => entry.before.id === "1554324724765433968")
      ?.patch.topic.includes("not a general Discord-ban appeal"),
  );
  assert.ok(
    !plan.changes.some((entry) =>
      [
        "1554613971636584468",
        "1554337768006488174",
        "1554705823836414003",
      ].includes(entry.before.id),
    ),
  );
});

test("plan refuses wrong identity, missing targets, changed types and existing different tags", () => {
  const data = fixture();
  data.guild.id = "1554316932948172941";
  assert.throws(() => createChannelCleanupPlan(data), /restricted/);
  const missing = fixture();
  missing.channels.pop();
  assert.throws(() => createChannelCleanupPlan(missing), /missing/);
  const changed = fixture();
  changed.channels[0].type = 4;
  assert.throws(() => createChannelCleanupPlan(changed), /changed type/);
  const tagged = fixture();
  tagged.channels.find(
    (channel) => channel.id === "1554327206396690432",
  )!.available_tags = [
    { id: "1600000000000000001", name: "Owner tag", moderated: false },
  ];
  assert.throws(() => createChannelCleanupPlan(tagged), /different tags/);
});

test("plan validation refuses arbitrary patches, duplicate IDs and foreign channels", () => {
  for (const mutate of [
    (plan: ReturnType<typeof createChannelCleanupPlan>): void => {
      plan.changes[0].patch.topic = "Unauthorized text";
    },
    (plan: ReturnType<typeof createChannelCleanupPlan>): void => {
      plan.changes[0].before.id = "1600000000000000001";
    },
    (plan: ReturnType<typeof createChannelCleanupPlan>): void => {
      plan.changes[1] = plan.changes[0];
    },
    (plan: ReturnType<typeof createChannelCleanupPlan>): void => {
      Object.assign(plan.changes[0].patch, { permission_overwrites: [] });
    },
  ]) {
    const plan = createChannelCleanupPlan(fixture());
    mutate(plan);
    assert.throws(() => validateChannelCleanupPlan(plan));
  }
});

test("write refuses unconfirmed rotation before any request", async () => {
  const data = fixture(),
    mock = mockDiscord(data);
  await assert.rejects(
    applyChannelCleanup(credentials, createChannelCleanupPlan(data), {
      ...options(mock),
      tokenRotationConfirmed: false,
    }),
    /Rotate/,
  );
  assert.equal(mock.requests.length, 0);
});

test("missing guild or channel permissions block the entire batch", async () => {
  for (const mode of ["role", "overwrite"]) {
    const data = fixture(),
      plan = createChannelCleanupPlan(data);
    if (mode === "role") data.roles[1].permissions = "1024";
    else
      data.channels[5].permission_overwrites.push({
        id: cleanupApplicationId,
        type: 1,
        allow: "0",
        deny: "16",
      });
    const mock = mockDiscord(data);
    await assert.rejects(
      applyChannelCleanup(credentials, plan, options(mock)),
      /missing on/,
    );
    assert.ok(mock.requests.every((entry) => entry.method === "GET"));
  }
});

test("stale final target stops before changing any earlier channel", async () => {
  const data = fixture(),
    plan = createChannelCleanupPlan(data),
    mock = mockDiscord(data);
  data.channels.at(-1)!.topic = "Concurrent owner edit";
  await assert.rejects(
    applyChannelCleanup(credentials, plan, options(mock)),
    /stale/,
  );
  assert.equal(
    mock.requests.filter((entry) => entry.method === "PATCH").length,
    0,
  );
});

test("successful cleanup verifies narrow patches, preserves unrelated state and is resumable", async () => {
  const data = fixture(),
    original = structuredClone(data),
    plan = createChannelCleanupPlan(data);
  const mock = mockDiscord(data),
    progress: CleanupProgress[] = [];
  assert.deepEqual(
    await applyChannelCleanup(credentials, plan, options(mock, progress)),
    { changed: 38, skipped: 0 },
  );
  assert.equal(
    progress.filter((entry) => entry.status === "pending").length,
    38,
  );
  assert.equal(
    progress.filter((entry) => entry.status === "verified").length,
    38,
  );
  assert.deepEqual(data.roles, original.roles);
  assert.deepEqual(data.onboarding, original.onboarding);
  assert.deepEqual(data.guild, original.guild);
  for (let i = 0; i < data.channels.length; i++) {
    const after = {
      ...data.channels[i],
      topic: original.channels[i].topic,
      ...(original.channels[i].available_tags
        ? { available_tags: original.channels[i].available_tags }
        : {}),
    };
    assert.deepEqual(after, original.channels[i]);
  }
  const resume = mockDiscord(data);
  assert.deepEqual(
    await applyChannelCleanup(credentials, plan, options(resume)),
    { changed: 0, skipped: 38 },
  );
  assert.ok(resume.requests.every((entry) => entry.method === "GET"));
  assert.equal(createChannelCleanupPlan(data).changes.length, 0);
  const forum = data.channels.find(
    (channel) => channel.id === "1554327206396690432",
  )!;
  const tags = structuredClone(forum.available_tags);
  forum.topic = "Owner wants the reviewed template back";
  const topicOnly = createChannelCleanupPlan(data);
  assert.equal(topicOnly.changes[0].patch.available_tags, undefined);
  await applyChannelCleanup(credentials, topicOnly, options(mockDiscord(data)));
  assert.deepEqual(forum.available_tags, tags);
});

test("concurrent change between batch preflight and channel write is rejected", async () => {
  const data = fixture(),
    plan = createChannelCleanupPlan(data),
    mock = mockDiscord(data);
  const wrapped: typeof fetch = async (input, init): Promise<Response> => {
    if (String(input).includes(`/channels/${data.channels[0].id}`))
      data.channels[0].name = "Changed channel name";
    return mock.fetch(input, init);
  };
  await assert.rejects(
    applyChannelCleanup(credentials, plan, options({ fetch: wrapped })),
    /outside the cleanup/,
  );
  assert.equal(
    mock.requests.filter((entry) => entry.method === "PATCH").length,
    0,
  );
});

test("private checkpoint failure prevents its write", async () => {
  const data = fixture(),
    mock = mockDiscord(data);
  await assert.rejects(
    applyChannelCleanup(credentials, createChannelCleanupPlan(data), {
      ...options(mock),
      checkpoint: async (): Promise<void> => {
        throw new Error("disk full");
      },
    }),
    /disk full/,
  );
  assert.ok(mock.requests.every((entry) => entry.method === "GET"));
});

test("a lost PATCH response is not retried and a later resume skips the delivered change", async () => {
  const data = fixture(),
    plan = createChannelCleanupPlan(data),
    mock = mockDiscord(data);
  const wrapped: typeof fetch = async (input, init): Promise<Response> => {
    const response = await mock.fetch(input, init);
    if (init?.method === "PATCH")
      throw new Error(`raw transport: ${credentials.token}`);
    return response;
  };
  await assert.rejects(
    applyChannelCleanup(credentials, plan, options({ fetch: wrapped })),
    (error: unknown): boolean =>
      error instanceof Error &&
      error.message.includes("delivery may have succeeded") &&
      !error.message.includes(credentials.token),
  );
  assert.equal(
    mock.requests.filter((entry) => entry.method === "PATCH").length,
    1,
  );
  assert.deepEqual(
    await applyChannelCleanup(credentials, plan, options(mockDiscord(data))),
    { changed: 37, skipped: 1 },
  );
});

test("confirmed 429 rejection waits and rechecks; other HTTP errors never retry", async () => {
  const data = fixture(),
    plan = createChannelCleanupPlan(data),
    mock = mockDiscord(data);
  let rejected = false;
  const delays: number[] = [];
  const wrapped: typeof fetch = async (input, init): Promise<Response> => {
    if (init?.method === "PATCH" && !rejected) {
      rejected = true;
      return Response.json({ retry_after: 0.2 }, { status: 429 });
    }
    return mock.fetch(input, init);
  };
  await applyChannelCleanup(credentials, plan, {
    ...options({ fetch: wrapped }),
    sleep: async (ms): Promise<void> => {
      delays.push(ms);
    },
  });
  assert.equal(delays[0], 300);
  assert.equal(
    mock.requests.filter(
      (entry) =>
        entry.path === `/channels/${data.channels[0].id}` &&
        entry.method === "GET",
    ).length,
    3,
  );
  for (const status of [401, 403, 500]) {
    const fresh = fixture(),
      inner = mockDiscord(fresh);
    let writes = 0;
    const failing: typeof fetch = async (input, init): Promise<Response> => {
      if (init?.method === "PATCH") {
        writes++;
        return new Response(credentials.token, { status });
      }
      return inner.fetch(input, init);
    };
    await assert.rejects(
      applyChannelCleanup(
        credentials,
        createChannelCleanupPlan(fresh),
        options({ fetch: failing }),
      ),
      (error: unknown): boolean =>
        error instanceof Error &&
        error.message.includes(`HTTP ${status}`) &&
        !error.message.includes(credentials.token),
    );
    assert.equal(writes, 1);
  }
});

test("429 retry detects an intervening owner topic edit", async () => {
  const data = fixture(),
    plan = createChannelCleanupPlan(data),
    mock = mockDiscord(data);
  let writes = 0;
  const wrapped: typeof fetch = async (input, init): Promise<Response> => {
    if (init?.method === "PATCH") {
      writes++;
      data.channels[0].topic = "Owner edit";
      return Response.json({ retry_after: 0 }, { status: 429 });
    }
    return mock.fetch(input, init);
  };
  await assert.rejects(
    applyChannelCleanup(credentials, plan, options({ fetch: wrapped })),
    /stale/,
  );
  assert.equal(writes, 1);
});

test("unexpected PATCH response stops the batch without leaking upstream contents", async () => {
  const data = fixture(),
    mock = mockDiscord(data);
  const wrapped: typeof fetch = async (input, init): Promise<Response> =>
    init?.method === "PATCH"
      ? Response.json({ token: credentials.token })
      : mock.fetch(input, init);
  await assert.rejects(
    applyChannelCleanup(
      credentials,
      createChannelCleanupPlan(data),
      options({ fetch: wrapped }),
    ),
    /unexpected channel/,
  );
});

test("cleanup CLI never accepts token flags or silently defaults to writing", () => {
  for (const args of [
    [],
    ["apply"],
    ["plan", "--confirm-token-rotated"],
    ["plan", "--token", credentials.token],
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/discord-channel-cleanup.ts", ...args],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes(credentials.token));
  }
  const help = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/discord-channel-cleanup.ts", "--help"],
    { encoding: "utf8" },
  );
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Plan is GET-only/);
});
