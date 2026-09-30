import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  analyzeDiscordAudit,
  auditInstallUrl,
  channelPermissions,
  discordPermission,
  guildPermissions,
  hasDiscordPermission,
  renderDiscordAudit,
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "../lib/discord-audit";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import { saveDiscordAudit } from "../lib/discord-audit-files";

const guildId = "100000000000000001";
const botId = "100000000000000002";
const applicationId = "100000000000000003";
const roleId = "100000000000000004";
const channelId = "100000000000000005";
const secondRoleId = "100000000000000006";
const credentials: AuditCredentials = {
  guildId,
  applicationId,
  token: "test-only-not-a-real-bot-token",
};

function snapshot(): DiscordAuditSnapshot {
  return {
    capturedAt: "2026-09-30T12:00:00.000Z",
    application: { id: applicationId, name: "WoWForeverBot" },
    bot: { id: botId, username: "WoWForeverBot", bot: true },
    guild: {
      id: guildId,
      name: "Test community",
      description: null,
      features: ["COMMUNITY"],
      verification_level: 1,
      default_message_notifications: 1,
      explicit_content_filter: 2,
      mfa_level: 1,
      rules_channel_id: channelId,
      system_channel_id: channelId,
    },
    roles: [
      {
        id: guildId,
        name: "@everyone",
        position: 0,
        permissions: "1024",
        managed: false,
        mentionable: false,
      },
      {
        id: roleId,
        name: "WoWForeverBot",
        position: 1,
        permissions: "1024",
        managed: true,
        mentionable: false,
      },
    ],
    botRoleIds: [roleId],
    channels: [
      {
        id: channelId,
        guild_id: guildId,
        type: 0,
        name: "rules",
        position: 0,
        parent_id: null,
        topic: "Community rules",
        permission_overwrites: [],
      },
    ],
    onboarding: {
      status: "available",
      data: {
        guild_id: guildId,
        enabled: true,
        mode: 0,
        default_channel_ids: [channelId],
        prompts: [],
      },
    },
  };
}

interface RecordedRequest {
  path: string;
  options: RequestInit | undefined;
}
function mockedDiscord(data: DiscordAuditSnapshot = snapshot()): {
  fetch: typeof fetch;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  const responses: Record<string, unknown> = {
    "/users/@me": { ...data.bot, email: "not-collected@example.invalid" },
    "/applications/@me": {
      ...data.application,
      owner: { id: "not-collected" },
      secret: "not-collected",
    },
    [`/guilds/${guildId}`]: { ...data.guild, owner_id: "not-collected" },
    [`/guilds/${guildId}/roles`]: data.roles,
    [`/guilds/${guildId}/members/${botId}`]: {
      user: data.bot,
      roles: data.botRoleIds,
      nick: "not-collected",
      joined_at: "not-collected",
    },
    [`/guilds/${guildId}/channels`]: data.channels,
    [`/guilds/${guildId}/onboarding`]:
      data.onboarding.status === "available" ? data.onboarding.data : null,
  };
  return {
    requests,
    fetch: async (input, options): Promise<Response> => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://discord.com");
      const route = url.pathname.replace(/^\/api\/v10/, "");
      requests.push({ path: route, options });
      assert.ok(Object.hasOwn(responses, route), `Unexpected route: ${route}`);
      return Response.json(responses[route]);
    },
  };
}

test("WoWForeverBot install is server-bound, bot-only and requests only View Channels", () => {
  const url = new URL(auditInstallUrl(applicationId, guildId));
  assert.equal(url.origin, "https://discord.com");
  assert.equal(url.searchParams.get("permissions"), "1024");
  assert.equal(url.searchParams.get("scope"), "bot");
  assert.equal(url.searchParams.get("integration_type"), "0");
  assert.equal(url.searchParams.get("disable_guild_select"), "true");
  assert.equal(url.searchParams.get("guild_id"), guildId);
  assert.equal(url.searchParams.get("client_id"), applicationId);
  assert.throws(() => auditInstallUrl("123/../../evil", guildId));
  assert.throws(() => auditInstallUrl(applicationId, "not-a-server-id"));
});

test("configuration audit makes only seven GETs, rejects redirects and strips unrelated personal fields", async () => {
  const mock = mockedDiscord();
  const result = await collectDiscordAudit(credentials, { fetch: mock.fetch });
  assert.equal(mock.requests.length, 7);
  for (const { options } of mock.requests) {
    assert.equal(options?.method, "GET");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.body, undefined);
    assert.equal(
      new Headers(options?.headers).get("Authorization"),
      `Bot ${credentials.token}`,
    );
    assert.ok(options?.signal);
  }
  assert.ok(
    mock.requests.every(
      ({ path: route }) =>
        !route.includes("messages") && !route.endsWith("/members"),
    ),
  );
  assert.equal(result.guild.id, guildId);
  assert.ok(!JSON.stringify(result).includes("not-collected"));
  assert.ok(!JSON.stringify(result).includes(credentials.token));
});

test("invalid credentials fail before network access", async () => {
  const mock = mockedDiscord();
  await assert.rejects(
    collectDiscordAudit(
      { ...credentials, guildId: "../other" },
      { fetch: mock.fetch },
    ),
    DiscordAuditError,
  );
  await assert.rejects(
    collectDiscordAudit(
      { ...credentials, token: "Bot token\r\nheader" },
      { fetch: mock.fetch },
    ),
    DiscordAuditError,
  );
  assert.equal(mock.requests.length, 0);
});

test("obfuscated channel permissions are rejected rather than treated as a real policy", async () => {
  const data = snapshot();
  data.channels[0].flags = 1 << 17;
  const mock = mockedDiscord(data);
  await assert.rejects(
    collectDiscordAudit(credentials, { fetch: mock.fetch }),
    /unexpected configuration shape/,
  );
});

test("CLI setup works without secrets, rejects write/token flags and fails closed when unconfigured", () => {
  const environment = {
    ...process.env,
    KFCBOT_TOKEN: "",
    KFCBOT_GUILD_ID: "",
    KFCBOT_APPLICATION_ID: "",
  };
  const run = (args: string[]): ReturnType<typeof spawnSync> =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/kfcbot.ts", ...args],
      {
        cwd: process.cwd(),
        env: environment,
        encoding: "utf8",
        timeout: 10_000,
      },
    );
  const setup = run([
    "setup",
    "--application-id",
    applicationId,
    "--guild-id",
    guildId,
  ]);
  assert.equal(setup.status, 0);
  assert.ok(String(setup.stdout).includes("WoWForeverBot"));
  assert.ok(
    String(setup.stdout).includes(auditInstallUrl(applicationId, guildId)),
  );
  assert.ok(String(setup.stdout).includes("No Discord request was made"));
  const missing = run(["audit"]);
  assert.equal(missing.status, 1);
  assert.ok(String(missing.stderr).includes("Set valid KFCBOT_APPLICATION_ID"));
  for (const args of [
    ["audit", "--write"],
    ["audit", "--token", "secret-argument-sentinel"],
    ["audit", "--guild-id", guildId],
  ]) {
    const rejected = run(args);
    assert.equal(rejected.status, 1);
    assert.ok(!String(rejected.stderr).includes("secret-argument-sentinel"));
  }
});

test("personal accounts and wrong applications stop before reading server configuration", async () => {
  let calls = 0;
  await assert.rejects(
    collectDiscordAudit(credentials, {
      fetch: async (): Promise<Response> => {
        calls++;
        return Response.json({
          id: botId,
          username: "private-user",
          bot: false,
        });
      },
    }),
    DiscordAuditError,
  );
  assert.equal(calls, 1);
  const mock = mockedDiscord();
  await assert.rejects(
    collectDiscordAudit(
      { ...credentials, applicationId: secondRoleId },
      { fetch: mock.fetch },
    ),
    /different application/,
  );
  assert.equal(mock.requests.length, 2);
});

test("wrong guild, member, onboarding and inconsistent role identities are rejected", async () => {
  for (const route of [
    `/guilds/${guildId}`,
    `/guilds/${guildId}/members/${botId}`,
    `/guilds/${guildId}/onboarding`,
    `/guilds/${guildId}/roles`,
  ]) {
    const mock = mockedDiscord();
    await assert.rejects(
      collectDiscordAudit(credentials, {
        fetch: async (input, options): Promise<Response> => {
          const response = await mock.fetch(input, options);
          if (!String(input).endsWith(route)) return response;
          if (route.endsWith("/roles"))
            return Response.json([snapshot().roles[1]]);
          if (route.includes("/members/"))
            return Response.json({
              user: { ...snapshot().bot, id: secondRoleId },
              roles: [],
            });
          if (route.endsWith("/onboarding"))
            return Response.json({
              ...(await response.json()),
              guild_id: secondRoleId,
            });
          return Response.json({ ...snapshot().guild, id: secondRoleId });
        },
      }),
      DiscordAuditError,
    );
  }
});

test("401/403 are not retried and raw error bodies never reach the caller", async () => {
  for (const status of [401, 403, 500]) {
    let calls = 0;
    await assert.rejects(
      collectDiscordAudit(credentials, {
        fetch: async (): Promise<Response> => {
          calls++;
          return Response.json({ message: credentials.token }, { status });
        },
      }),
      (error: unknown): boolean =>
        error instanceof DiscordAuditError &&
        error.httpStatus === status &&
        !error.message.includes(credentials.token),
    );
    assert.equal(calls, 1);
  }
});

test("unreadable onboarding is marked unknown without discarding the other configuration", async () => {
  for (const status of [403, 404] as const) {
    const mock = mockedDiscord();
    const result = await collectDiscordAudit(credentials, {
      fetch: async (input, options): Promise<Response> =>
        String(input).endsWith("/onboarding")
          ? Response.json({}, { status })
          : mock.fetch(input, options),
    });
    assert.deepEqual(result.onboarding, {
      status: "unavailable",
      httpStatus: status,
    });
    const report = analyzeDiscordAudit(result);
    assert.ok(
      report.findings.some((entry) => entry.code === "onboarding-unavailable"),
    );
    assert.ok(
      !report.findings.some((entry) => entry.code === "onboarding-disabled"),
    );
  }
});

test("429 retry waits for Discord's fractional delay and remains bounded", async () => {
  const mock = mockedDiscord();
  let calls = 0;
  const sleeps: number[] = [];
  await collectDiscordAudit(credentials, {
    fetch: async (input, options): Promise<Response> =>
      ++calls === 1
        ? Response.json({ retry_after: 0.25 }, { status: 429 })
        : mock.fetch(input, options),
    sleep: async (milliseconds: number): Promise<void> => {
      sleeps.push(milliseconds);
    },
  });
  assert.deepEqual(sleeps, [350]);
  assert.equal(calls, 8);
  calls = 0;
  await assert.rejects(
    collectDiscordAudit(credentials, {
      fetch: async (): Promise<Response> => {
        calls++;
        return Response.json(
          {},
          { status: 429, headers: { "Retry-After": "0.01" } },
        );
      },
      sleep: async (): Promise<void> => {},
    }),
    /rate-limited/,
  );
  assert.equal(calls, 3);
  for (const retryAfter of [31, -1, "invalid"]) {
    let slept = false;
    await assert.rejects(
      collectDiscordAudit(credentials, {
        fetch: async (): Promise<Response> =>
          Response.json({ retry_after: retryAfter }, { status: 429 }),
        sleep: async (): Promise<void> => {
          slept = true;
        },
      }),
      /rate-limited/,
    );
    assert.equal(slept, false);
  }
});

test("transport, invalid JSON and schema errors do not expose raw content or credentials", async () => {
  for (const request of [
    async (): Promise<Response> => {
      throw new Error(credentials.token);
    },
    async (): Promise<Response> => new Response(credentials.token),
    async (): Promise<Response> => Response.json({ id: credentials.token }),
  ]) {
    await assert.rejects(
      collectDiscordAudit(credentials, { fetch: request }),
      (error: unknown): boolean =>
        error instanceof DiscordAuditError &&
        !error.message.includes(credentials.token),
    );
  }
});

test("permission evaluation follows everyone, combined roles, member overrides and Administrator", () => {
  const data = snapshot();
  const view = discordPermission.viewChannel;
  const send = discordPermission.sendMessages;
  const channel = data.channels[0];
  channel.permission_overwrites = [
    { id: guildId, type: 0, allow: "0", deny: view.toString() },
    { id: roleId, type: 0, allow: view.toString(), deny: send.toString() },
    {
      id: secondRoleId,
      type: 0,
      allow: send.toString(),
      deny: view.toString(),
    },
  ];
  assert.equal(channelPermissions(view | send, channel, guildId, []), send);
  assert.equal(
    channelPermissions(view | send, channel, guildId, [roleId]),
    view,
  );
  assert.equal(
    channelPermissions(view | send, channel, guildId, [roleId, secondRoleId]),
    view | send,
  );
  channel.permission_overwrites.push({
    id: botId,
    type: 1,
    allow: "0",
    deny: view.toString(),
  });
  assert.equal(
    channelPermissions(
      view | send,
      channel,
      guildId,
      [roleId, secondRoleId],
      botId,
    ),
    send,
  );
  assert.equal(
    hasDiscordPermission(
      channelPermissions(8n, channel, guildId, [], botId),
      view,
    ),
    true,
  );
  data.roles[1].permissions = (1n << 40n).toString();
  assert.equal(
    guildPermissions(data.roles, guildId, [roleId, roleId]),
    view | (1n << 40n),
  );
});

test("hidden channels do not imply posting access and parent category overwrites are not applied twice", () => {
  const data = snapshot();
  data.roles[0].permissions = "3072";
  const categoryId = "100000000000000007";
  data.channels[0].parent_id = categoryId;
  data.channels.push({
    id: categoryId,
    type: 4,
    name: "Private category",
    position: 1,
    parent_id: null,
    permission_overwrites: [{ id: guildId, type: 0, allow: "0", deny: "1024" }],
  });
  const report = analyzeDiscordAudit(data);
  assert.equal(report.channelAccess[0].everyoneCanView, true);
  assert.equal(report.channelAccess[0].everyoneCanSend, true);
  assert.equal(report.channelAccess[1].everyoneCanView, false);
  assert.equal(report.channelAccess[1].everyoneCanSend, false);
  assert.ok(
    report.findings.some((entry) => entry.code === "bot-inherited-send"),
  );
});

test("sensitive-channel findings are review-only, with no assumption that hidden channels are absent", () => {
  const data = snapshot();
  data.channels[0].name = "report-here";
  const report = analyzeDiscordAudit(data);
  assert.equal(
    report.findings.find((entry) => entry.code === "sensitive-channel-visible")
      ?.severity,
    "review",
  );
  assert.ok(
    report.limitations.some((entry) => entry.includes("omit channels")),
  );
  assert.ok(
    report.limitations.some((entry) =>
      entry.includes("Real members may combine roles"),
    ),
  );
  data.channels[0].permission_overwrites = [
    { id: guildId, type: 0, allow: "0", deny: "1024" },
  ];
  assert.ok(
    !analyzeDiscordAudit(data).findings.some(
      (entry) => entry.code === "sensitive-channel-visible",
    ),
  );
});

test("administrator everyone and enabled privileged onboarding choices are high-priority findings", () => {
  const data = snapshot();
  data.roles[0].permissions = "8";
  data.roles[1].permissions = (1n << 40n).toString();
  assert.equal(data.onboarding.status, "available");
  if (data.onboarding.status !== "available")
    throw new Error("Test fixture needs onboarding");
  data.onboarding.data.prompts.push({
    id: channelId,
    title: "Choose role",
    required: true,
    single_select: false,
    in_onboarding: true,
    options: [
      {
        id: secondRoleId,
        title: "Unsafe option",
        role_ids: [roleId],
        channel_ids: [],
      },
    ],
  });
  const findings = analyzeDiscordAudit(data).findings;
  assert.equal(
    findings.find((entry) => entry.code === "everyone-privileged")?.severity,
    "high",
  );
  assert.equal(
    findings.find((entry) => entry.code === "onboarding-privileged-role")
      ?.severity,
    "high",
  );
  data.onboarding.data.enabled = false;
  assert.equal(
    analyzeDiscordAudit(data).findings.find(
      (entry) => entry.code === "onboarding-privileged-role",
    )?.severity,
    "review",
  );
});

test("Markdown report escapes untrusted server markup and documents its scope", () => {
  const data = snapshot();
  data.channels[0].topic =
    '<img src="https://evil.invalid">\n[click](https://evil.invalid)|row';
  const markdown = renderDiscordAudit(data, analyzeDiscordAudit(data));
  assert.ok(markdown.startsWith("# WoWForeverBot Read-Only Configuration Audit"));
  assert.ok(!markdown.includes("<img"));
  assert.ok(!markdown.includes("[click]("));
  assert.ok(markdown.includes("\\|row"));
  assert.ok(markdown.includes("No messages"));
  assert.ok(markdown.includes("No changes were made"));
});

test("audit files are private, uniquely named and do not overwrite earlier audits", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kfcbot-test-"));
  try {
    const data = snapshot();
    const report = analyzeDiscordAudit(data);
    const first = await saveDiscordAudit(data, report, directory);
    const second = await saveDiscordAudit(data, report, directory);
    assert.notEqual(first, second);
    assert.equal((await stat(first)).mode & 0o777, 0o700);
    for (const file of ["snapshot.json", "audit.json", "audit.md"]) {
      assert.equal((await stat(path.join(first, file))).mode & 0o777, 0o600);
      assert.ok(
        !(await readFile(path.join(first, file), "utf8")).includes(
          credentials.token,
        ),
      );
    }
    assert.deepEqual(
      JSON.parse(await readFile(path.join(first, "snapshot.json"), "utf8")),
      data,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("audit writer refuses a symlinked output directory", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kfcbot-link-test-"));
  try {
    await mkdir(path.join(directory, ".data"));
    await mkdir(path.join(directory, "outside"));
    await symlink(
      path.join(directory, "outside"),
      path.join(directory, ".data", "kfcbot-audits"),
    );
    await assert.rejects(
      saveDiscordAudit(snapshot(), analyzeDiscordAudit(snapshot()), directory),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("audit writer refuses a symlinked .data parent", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "kfcbot-parent-test-"),
  );
  try {
    await mkdir(path.join(directory, "outside"));
    await symlink(
      path.join(directory, "outside"),
      path.join(directory, ".data"),
    );
    await assert.rejects(
      saveDiscordAudit(snapshot(), analyzeDiscordAudit(snapshot()), directory),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
