import "../scripts/env";
import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  applicationId,
  controlSchema,
  createBridgeSchema,
  existingKfcChannels,
  guilds,
  messageLink,
  type Bridge,
  type Consent,
  type Projection,
  type SourceMessage,
} from "../lib/discord-bridge/contracts";
import {
  contentPolicy,
  eligibility,
  renderMessage,
  type RenderedMessage,
} from "../lib/discord-bridge/policy";
import { decryptToken, encryptToken } from "../lib/discord-bridge/crypto";
import { bridgeInteraction } from "../lib/discord-bridge/interactions";
import {
  control,
  idempotentAdmin,
  setMode,
  snapshot,
} from "../lib/discord-bridge/admin";
import { BridgeError, BridgeStore, one } from "../lib/discord-bridge/store";
import { BridgeEngine } from "../workers/discord-bridge/src/engine";
import {
  DiscordFailure,
  DiscordTransport,
  type BridgeTransport,
} from "../workers/discord-bridge/src/transport";
import type { Staff } from "../lib/auth";

if (new URL(process.env.DATABASE_URL || "").port !== "55432")
  throw new Error(
    "Bridge tests require the isolated local PostgreSQL on port 55432.",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 6 });
const store = new BridgeStore(pool);
const secret = randomBytes(32).toString("hex");
const owner: Staff = {
  id: "bridge-test-owner",
  email: "bridge-owner@example.invalid",
  name: "Test owner",
  role: "owner",
};
const author = "1800000000000000001",
  secondAuthor = "1800000000000000002";
const channelA = "1800000000000000011",
  channelB = "1800000000000000012";
let counter = 1800000000000000100n;
function id(): string {
  return String(++counter);
}
async function readyForPilot(): Promise<void> {
  await pool.query('DELETE FROM "ForeverBridgeConsent" WHERE "bridgeId"=$1', [
    bridge.id,
  ]);
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "state"=\'ready\',"reviewRequired"=TRUE,"validatedAt"=NOW(),"approvalA"=\'staff:test\',"approvalB"=\'staff:test\' WHERE "id"=$1',
    [bridge.id],
  );
  bridge = await store.bridge(bridge.id);
}
async function startPilot(): Promise<void> {
  await readyForPilot();
  const previous = process.env.BRIDGE_INTERACTIONS_ENABLED;
  process.env.BRIDGE_INTERACTIONS_ENABLED = "true";
  try {
    await control(
      store,
      controlSchema.parse({
        id: bridge.id,
        version: bridge.version,
        action: "pilot",
        reason: "Local restricted pilot test",
        testerIds: [author],
      }),
      owner,
    );
    bridge = await store.bridge(bridge.id);
  } finally {
    if (previous === undefined) delete process.env.BRIDGE_INTERACTIONS_ENABLED;
    else process.env.BRIDGE_INTERACTIONS_ENABLED = previous;
  }
}
async function approveTestMessage(rootId: string): Promise<void> {
  await control(
    store,
    {
      id: bridge.id,
      version: (await store.bridge(bridge.id)).version,
      action: "review",
      rootId,
      reason: "Local test message review",
    },
    owner,
  );
}
async function expirePilot(): Promise<void> {
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "activatedAt"=NOW()-INTERVAL \'1 minute\',"pilotUntil"=NOW()-INTERVAL \'1 second\' WHERE "id"=$1',
    [bridge.id],
  );
}
let bridge: Bridge;
let engine: BridgeEngine;
let transport: FakeTransport;
const additionalPairs: Bridge[] = [];

async function extraPair(channelA: string, channelB: string): Promise<Bridge> {
  const pair = await store.createDraft(
    "TEST additional pair",
    channelA,
    channelB,
    `staff:${owner.id}`,
  );
  additionalPairs.push(pair);
  return pair;
}

class FakeTransport implements BridgeTransport {
  messages = new Map<string, SourceMessage>();
  bodies: RenderedMessage[] = [];
  creates = 0;
  edits = 0;
  deletions: string[] = [];
  eligibleResult = true;
  validation = "fixture-permission-fingerprint";
  createError: DiscordFailure | null = null;
  editError: DiscordFailure | null = null;
  deleteError: DiscordFailure | null = null;
  beforeCreate: (() => Promise<void>) | null = null;
  responses: string[] = [];
  async validate(): Promise<string> {
    return this.validation;
  }
  async eligible(): Promise<boolean> {
    return this.eligibleResult;
  }
  async source(
    _guild: string,
    _channel: string,
    message: string,
  ): Promise<SourceMessage | null> {
    return this.messages.get(message) || null;
  }
  async output(projection: Projection): Promise<SourceMessage | null> {
    if (!projection.messageId) return null;
    const message = this.messages.get(projection.messageId) || null;
    if (
      message &&
      (message.author.id !== applicationId ||
        !message.content.endsWith(`Relay ${projection.nonce}`))
    )
      throw new DiscordFailure("forbidden");
    return message;
  }
  async create(projection: Projection, body: RenderedMessage): Promise<string> {
    this.creates++;
    if (this.beforeCreate) await this.beforeCreate();
    if (this.createError && this.createError.code !== "unavailable")
      throw this.createError;
    const message = fixture(projection.guildId, {
      id: id(),
      channel_id: projection.channelId,
      author: { id: applicationId, username: "WoWForeverBot", bot: true },
      content: body.content,
      nonce: projection.nonce,
      message_reference: body.message_reference,
    });
    this.messages.set(message.id, message);
    this.bodies.push(body);
    if (this.createError) throw this.createError;
    return message.id;
  }
  async edit(projection: Projection, body: RenderedMessage): Promise<void> {
    this.edits++;
    const previous = this.messages.get(projection.messageId!);
    if (!previous) throw new DiscordFailure("not_found");
    this.messages.set(previous.id, { ...previous, content: body.content });
    if (this.editError) throw this.editError;
  }
  async remove(projection: Projection): Promise<void> {
    if (this.deleteError) throw this.deleteError;
    if (projection.messageId) {
      this.deletions.push(projection.messageId);
      this.messages.delete(projection.messageId);
    }
  }
  async respond(_token: string, content: string): Promise<void> {
    this.responses.push(content);
  }
}
function fixture(
  guildId: string = guilds.kfc,
  extra: Partial<SourceMessage> = {},
): SourceMessage {
  return {
    id: id(),
    channel_id: guildId === guilds.kfc ? channelA : channelB,
    guild_id: guildId,
    author: { id: author, username: "Test participant" },
    type: 0,
    attachments: [],
    content: "Anyone interested in a group this evening?",
    timestamp: new Date().toISOString(),
    ...extra,
  };
}
async function consent(
  actorId = author,
  guild = guilds.kfc as string,
): Promise<void> {
  await pool.query(
    'INSERT INTO "ForeverBridgeConsent" ("bridgeId","guildId","actorId","generation","policyVersion","optedAt") VALUES ($1,$2,$3,$4,1,NOW()-INTERVAL \'1 minute\') ON CONFLICT DO NOTHING',
    [bridge.id, guild, actorId, bridge.generation],
  );
}
async function observe(message = fixture()): Promise<string> {
  transport.messages.set(message.id, message);
  const rootId = await store.observe(message, bridge.id);
  assert.ok(rootId);
  return rootId;
}
async function drain(): Promise<void> {
  for (let i = 0; i < 25 && (await engine.tick()); i++);
}
async function command(
  name: string,
  actorId = author,
  extra: Record<string, unknown> = {},
): Promise<object> {
  return bridgeInteraction(
    {
      type: 2,
      id: id(),
      application_id: applicationId,
      guild_id: guilds.kfc,
      channel_id: channelA,
      token: "local-test-interaction-token",
      member: { user: { id: actorId } },
      data: { name: "bridge", options: [{ name, type: 1 }] },
      ...extra,
    },
    store,
    secret,
  );
}
beforeEach(async () => {
  bridge = await store.createDraft(
    "TEST shared channels",
    channelA,
    channelB,
    `staff:${owner.id}`,
  );
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "state"=\'active\',"activatedAt"=NOW()-INTERVAL \'1 minute\',"reviewRequired"=FALSE,"fingerprint"=\'fixture-permission-fingerprint\' WHERE "id"=$1',
    [bridge.id],
  );
  bridge = await store.bridge(bridge.id);
  await pool.query(
    'UPDATE "ForeverBridgeRuntime" SET "mode"=\'running\',"gateway"=\'ready\',"heartbeatAt"=NOW(),"error"=NULL WHERE "id"=\'singleton\'',
  );
  transport = new FakeTransport();
  engine = new BridgeEngine(store, transport, secret, secret);
  await consent();
  await consent(secondAuthor, guilds.forever);
});
afterEach(async () => {
  if (!bridge) return;
  for (const pair of [bridge, ...additionalPairs.splice(0)]) {
    await pool.query(
      'DELETE FROM "ForeverBridgeAdminRequest" WHERE "actorId"=$1',
      [owner.id],
    );
    await pool.query(
      'DELETE FROM "ForeverDiscordInteraction" WHERE "bridgeId"=$1',
      [pair.id],
    );
    await pool.query('DELETE FROM "ForeverDiscordOutbox" WHERE "bridgeId"=$1', [
      pair.id,
    ]);
    await pool.query(
      'DELETE FROM "ForeverBridgeProjection" WHERE "rootId" IN (SELECT "id" FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1)',
      [pair.id],
    );
    await pool.query(
      'UPDATE "ForeverBridgeMessage" SET "parentId"=NULL WHERE "bridgeId"=$1',
      [pair.id],
    );
    await pool.query('DELETE FROM "ForeverBridgeMessage" WHERE "bridgeId"=$1', [
      pair.id,
    ]);
    await pool.query('DELETE FROM "ForeverBridgeConsent" WHERE "bridgeId"=$1', [
      pair.id,
    ]);
    await pool.query('DELETE FROM "ForeverDiscordBridge" WHERE "id"=$1', [
      pair.id,
    ]);
    await pool.query(
      'DELETE FROM "ForeverAuditLog" WHERE "entityType"=\'discord_bridge\' AND ("entityId"=$1 OR "actorId"=$2)',
      [pair.id, `staff:${owner.id}`],
    );
  }
  await pool.query(
    'UPDATE "ForeverBridgeRuntime" SET "mode"=\'cleanup_only\',"gateway"=\'offline\',"heartbeatAt"=NULL WHERE "id"=\'singleton\'',
  );
});
after(async () => {
  await pool.end();
});

test("three pairs have unique slots and endpoints, including concurrent draft creation", async () => {
  const second = await extraPair(id(), id());
  assert.equal(second.slot, 2);
  await assert.rejects(
    extraPair(channelA, id()),
    (error: unknown) =>
      error instanceof BridgeError && error.code === "channel_already_paired",
  );
  await assert.rejects(
    extraPair(id(), second.channelB),
    (error: unknown) =>
      error instanceof BridgeError && error.code === "channel_already_paired",
  );
  const attempts = await Promise.allSettled([
    extraPair(id(), id()),
    extraPair(id(), id()),
  ]);
  assert.equal(
    attempts.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(additionalPairs[1].slot, 3);
  await assert.rejects(
    extraPair(id(), id()),
    (error: unknown) =>
      error instanceof BridgeError && error.code === "three_pair_limit_reached",
  );
  await assert.rejects(
    pool.query(
      'INSERT INTO "ForeverDiscordBridge" ("id","name","guildA","channelA","guildB","channelB","slot") VALUES ($1,\'invalid fourth\',$2,$3,$4,$5,4)',
      [randomUUID(), guilds.kfc, id(), guilds.forever, id()],
    ),
    (error: unknown) =>
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23514",
  );
  await assert.rejects(
    pool.query(
      'UPDATE "ForeverDiscordBridge" SET "channelA"=$1 WHERE "id"=$2',
      [channelA, second.id],
    ),
    (error: unknown) =>
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505",
  );
});

test("channel-scoped opt-in, confirmation and leave cannot enroll or withdraw another pair", async () => {
  const second = await extraPair(id(), id());
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "state"=\'active\',"activatedAt"=NOW()-INTERVAL \'1 minute\',"reviewRequired"=FALSE,"fingerprint"=\'fixture-permission-fingerprint\' WHERE "id"=$1',
    [second.id],
  );
  const message = fixture(guilds.kfc, { channel_id: second.channelA });
  assert.equal(await store.observe(message, second.id), null);
  const join = (await command("join", author, {
    channel_id: second.channelA,
  })) as { data: { components: { components: { custom_id: string }[] }[] } };
  const confirmation = {
    type: 3,
    id: id(),
    application_id: applicationId,
    guild_id: guilds.kfc,
    channel_id: second.channelA,
    token: "local-test-interaction-token",
    member: { user: { id: author } },
    data: { custom_id: join.data.components[0].components[0].custom_id },
  };
  await assert.rejects(
    bridgeInteraction({ ...confirmation, channel_id: channelA }, store, secret),
    (error: unknown) => error instanceof BridgeError && error.status === 403,
  );
  assert.equal((await bridgeInteraction(confirmation, store, secret)).type, 5);
  await engine.consentTick();
  assert.ok(await store.consent(second.id, guilds.kfc, author));
  await assert.rejects(
    bridgeInteraction({ ...confirmation, channel_id: channelA }, store, secret),
    (error: unknown) => error instanceof BridgeError && error.status === 403,
  );
  const fresh = fixture(guilds.kfc, { channel_id: second.channelA });
  transport.messages.set(fresh.id, fresh);
  const root = await store.observe(fresh, second.id);
  assert.ok(root);
  await drain();
  assert.equal(
    (await store.bundle(root))!.projection.channelId,
    second.channelB,
  );
  const reply = fixture(guilds.forever, {
    channel_id: second.channelB,
    author: { id: secondAuthor, username: "Other participant" },
  });
  assert.equal(await store.observe(reply, second.id), null);
  await pool.query(
    'INSERT INTO "ForeverBridgeConsent" ("bridgeId","guildId","actorId","generation","policyVersion","optedAt") VALUES ($1,$2,$3,1,1,NOW()-INTERVAL \'1 minute\')',
    [second.id, guilds.forever, secondAuthor],
  );
  transport.messages.set(reply.id, reply);
  const replyRoot = await store.observe(reply, second.id);
  assert.ok(replyRoot);
  await drain();
  assert.equal(
    (await store.bundle(replyRoot))!.projection.channelId,
    second.channelA,
  );
  await command("leave", author, { channel_id: second.channelA });
  assert.ok((await store.consent(second.id, guilds.kfc, author))?.withdrawnAt);
  assert.equal(
    (await store.consent(bridge.id, guilds.kfc, author))?.withdrawnAt,
    null,
  );
  assert.equal((await store.bundle(root))!.root.state, "removed");
  assert.equal((await store.bundle(replyRoot))!.root.state, "live");
  const unrelated = await command("join", author, { channel_id: id() });
  assert.match(JSON.stringify(unrelated), /not connected/);
  const original = await observe();
  await drain();
  assert.equal((await store.bundle(original))!.projection.channelId, channelB);
});

test("admin snapshot scopes records and moderator access to the selected pair", async () => {
  const root = await observe();
  const second = await extraPair(id(), id());
  const firstView = await snapshot(store, owner, 0, bridge.id);
  assert.equal(firstView.selectedBridgeId, bridge.id);
  assert.equal(firstView.delivery[0].id, root);
  const secondView = await snapshot(store, owner, 0, second.id);
  assert.equal(secondView.selectedBridgeId, second.id);
  assert.equal(secondView.deliveryCount, 0);
  assert.equal(secondView.consents.length, 0);
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "moderatorIds"=$2 WHERE "id"=$1',
    [bridge.id, ["assigned-test-moderator"]],
  );
  const moderator: Staff = {
    ...owner,
    id: "assigned-test-moderator",
    role: "moderator",
  };
  assert.equal(
    (await snapshot(store, moderator, 0, bridge.id)).bridges.length,
    1,
  );
  await assert.rejects(
    snapshot(store, moderator, 0, second.id),
    (error: unknown) => error instanceof BridgeError && error.status === 404,
  );
});

test("channel changes pause only their own pair without marking the Gateway disconnected", async () => {
  const second = await extraPair(id(), id());
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "state"=\'active\' WHERE "id"=$1',
    [second.id],
  );
  await store.pauseChannel(guilds.kfc, id());
  assert.equal((await store.bridge(bridge.id)).state, "active");
  await store.pauseChannel(guilds.kfc, second.channelA);
  assert.equal((await store.bridge(second.id)).state, "paused");
  assert.equal((await store.bridge(bridge.id)).state, "active");
  assert.equal((await store.runtime()).gateway, "ready");
});

test("participant burst limits apply across all channel pairs", async () => {
  const second = await extraPair(id(), id());
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "state"=\'active\',"activatedAt"=NOW()-INTERVAL \'1 minute\',"reviewRequired"=FALSE WHERE "id"=$1',
    [second.id],
  );
  await pool.query(
    'INSERT INTO "ForeverBridgeConsent" ("bridgeId","guildId","actorId","generation","policyVersion","optedAt") VALUES ($1,$2,$3,1,1,NOW()-INTERVAL \'1 minute\')',
    [second.id, guilds.kfc, author],
  );
  for (let index = 0; index < 5; index++) await observe();
  assert.equal(
    await store.observe(
      fixture(guilds.kfc, { channel_id: second.channelA }),
      second.id,
    ),
    null,
  );
});

test("only the explicitly selected existing KFC chats may retain a role-gated audience", async (context) => {
  const adapter = new DiscordTransport("local-fixture-not-a-real-token");
  let sourceId = existingKfcChannels[0];
  let privateDestination = false;
  let missingTopic = false;
  let nsfw = false;
  const noticeA = id(),
    noticeB = id();
  const permissions = String((1n << 10n) | (1n << 11n) | (1n << 16n));
  context.mock.method(
    adapter.rest,
    "get",
    async (route: string): Promise<unknown> => {
      const destination =
        route.includes(guilds.forever) || route.includes(channelB);
      const guild = destination ? guilds.forever : guilds.kfc;
      const channel = destination ? channelB : sourceId;
      if (route === `/guilds/${guild}`)
        return { id: guild, owner_id: secondAuthor };
      if (route === `/guilds/${guild}/roles`)
        return [
          {
            id: guild,
            name: "everyone",
            position: 0,
            permissions: destination && !privateDestination ? permissions : "0",
            managed: false,
            mentionable: false,
          },
        ];
      if (route === `/guilds/${guild}/members/${applicationId}`)
        return { user: { id: applicationId }, roles: [] };
      if (route === `/channels/${channel}`)
        return {
          id: channel,
          guild_id: guild,
          type: 0,
          name: destination ? "general" : "classic-plus-discussion",
          position: 0,
          parent_id: null,
          nsfw,
          topic: missingTopic
            ? null
            : "https://www.wowforeverdiscord.online/bot/shared-channels",
          permission_overwrites: [
            { id: applicationId, type: 1, allow: permissions, deny: "0" },
          ],
        };
      if (
        route ===
        `/channels/${channel}/messages/${destination ? noticeB : noticeA}`
      )
        return fixture(guild, {
          channel_id: channel,
          id: destination ? noticeB : noticeA,
          content:
            "Two-way sharing. /bridge join https://www.wowforeverdiscord.online/bot/shared-channels",
        });
      if (route === `/applications/${applicationId}/guilds/${guild}/commands`)
        return [
          {
            name: "bridge",
            options: ["join", "status", "leave", "remove"].map((name) => ({
              name,
            })),
          },
        ];
      throw Error(
        "Unexpected read outside selected endpoint metadata and exact notices",
      );
    },
  );
  const configured = (): Bridge => ({
    ...bridge,
    channelA: sourceId,
    noticeA: messageLink(guilds.kfc, sourceId, noticeA),
    noticeB: messageLink(guilds.forever, channelB, noticeB),
  });
  assert.match(await adapter.validate(configured()), /^[a-f0-9]{64}$/);
  privateDestination = true;
  adapter.invalidate();
  await assert.rejects(adapter.validate(configured()), DiscordFailure);
  privateDestination = false;
  missingTopic = true;
  adapter.invalidate();
  await assert.rejects(adapter.validate(configured()), DiscordFailure);
  missingTopic = false;
  nsfw = true;
  adapter.invalidate();
  await assert.rejects(adapter.validate(configured()), DiscordFailure);
  nsfw = false;
  for (const excluded of ["1550970060812587028", "1548518038314295296"]) {
    sourceId = excluded;
    adapter.invalidate();
    await assert.rejects(adapter.validate(configured()), DiscordFailure);
  }
});

test("late output IDs reopen cleanup accounting without reviving a removed source", async () => {
  const root = await observe();
  await store.remove(root, "withdrawn");
  await drain();
  const projection = (await store.bundle(root))!.projection;
  assert.equal(projection.state, "removed");
  const late = fixture(guilds.forever, {
    author: { id: applicationId, username: "WoWForeverBot", bot: true },
    content: `Late delivery\nRelay ${projection.nonce}`,
  });
  transport.messages.set(late.id, late);
  await store.recordOutput(root, late.id, 1, null);
  assert.equal((await store.bundle(root))!.root.state, "removed");
  assert.equal((await snapshot(store, owner)).cleanupCount, 1);
  await drain();
  assert.equal((await snapshot(store, owner)).cleanupCount, 0);
  assert.equal(transport.messages.has(late.id), false);
});

test("Discord adapter validates only selected endpoints and targeted member permissions", async (context) => {
  const adapter = new DiscordTransport("local-fixture-not-a-real-token");
  const noticeA = id(),
    noticeB = id();
  const configured = {
    ...bridge,
    noticeA: messageLink(guilds.kfc, channelA, noticeA),
    noticeB: messageLink(guilds.forever, channelB, noticeB),
  };
  const calls: string[] = [];
  let timedOut = false;
  context.mock.method(
    adapter.rest,
    "get",
    async (route: string): Promise<unknown> => {
      calls.push(route);
      const guild =
        route.includes(guilds.forever) || route.includes(channelB)
          ? guilds.forever
          : guilds.kfc;
      const channel = guild === guilds.kfc ? channelA : channelB;
      if (route === `/guilds/${guild}`)
        return { id: guild, owner_id: secondAuthor };
      if (route === `/guilds/${guild}/roles`)
        return [
          {
            id: guild,
            name: "everyone",
            position: 0,
            permissions: String((1n << 10n) | (1n << 11n) | (1n << 16n)),
            managed: false,
            mentionable: false,
          },
        ];
      if (route === `/channels/${channel}`)
        return {
          id: channel,
          guild_id: guild,
          type: 0,
          name: "forever-shared-chat",
          position: 0,
          parent_id: null,
          nsfw: false,
          topic: "https://www.wowforeverdiscord.online/bot/shared-channels",
          permission_overwrites: [],
        };
      if (route === `/guilds/${guild}/members/${applicationId}`)
        return { user: { id: applicationId }, roles: [] };
      if (route === `/guilds/${guild}/members/${author}`)
        return {
          user: { id: author },
          roles: [],
          communication_disabled_until: timedOut
            ? new Date(Date.now() + 60000).toISOString()
            : null,
        };
      if (route === `/applications/${applicationId}/guilds/${guild}/commands`)
        return [
          {
            name: "bridge",
            options: ["join", "leave", "remove", "status"].map((name) => ({
              name,
            })),
          },
        ];
      if (
        route ===
        `/channels/${channel}/messages/${guild === guilds.kfc ? noticeA : noticeB}`
      )
        return fixture(guild, {
          id: guild === guilds.kfc ? noticeA : noticeB,
          content:
            "Two-way shared channel. /bridge join https://www.wowforeverdiscord.online/bot/shared-channels",
        });
      throw new Error(
        "Unexpected route; no history or member-list reads are allowed.",
      );
    },
  );
  assert.match(await adapter.validate(configured), /^[a-f0-9]{64}$/);
  assert.equal(await adapter.eligible(configured, author), true);
  timedOut = true;
  assert.equal(await adapter.eligible(configured, author), false);
  assert.ok(!calls.some((route) => /\/(messages|members)$/.test(route)));
});

test("Discord adapter sends a fixed identity, stable nonce, safe mentions and bounded reply body", async (context) => {
  const adapter = new DiscordTransport("local-fixture-not-a-real-token");
  assert.equal(adapter.rest.options.retries, 0);
  assert.ok(adapter.rest.options.rejectOnRateLimit);
  const root = await observe();
  const projection = (await store.bundle(root))!.projection;
  const body = renderMessage(fixture(), bridge, projection.nonce, id());
  context.mock.method(
    adapter.rest,
    "post",
    async (route: string, options: { body: unknown }): Promise<unknown> => {
      assert.equal(route, `/channels/${channelB}/messages`);
      assert.deepEqual(options.body, {
        ...body,
        nonce: projection.nonce,
        enforce_nonce: true,
      });
      assert.ok(!("username" in (options.body as Record<string, unknown>)));
      return { id: "1800000000000000099" };
    },
  );
  assert.equal(await adapter.create(projection, body), "1800000000000000099");
  const stopped = new DiscordTransport(
    "local-fixture-not-a-real-token",
    async () => false,
  );
  await assert.rejects(
    stopped.create(projection, body),
    (error: unknown) =>
      error instanceof DiscordFailure && error.code === "forbidden",
  );
});

test("admin idempotency receipts replay only identical completed requests", async () => {
  const request = randomUUID();
  let mutations = 0;
  await idempotentAdmin(store, owner.id, request, "fingerprint", async () => {
    mutations++;
  });
  await idempotentAdmin(store, owner.id, request, "fingerprint", async () => {
    mutations++;
  });
  assert.equal(mutations, 1);
  await assert.rejects(
    idempotentAdmin(store, owner.id, request, "different", async () => {
      mutations++;
    }),
    (e: unknown) => e instanceof BridgeError && e.status === 409,
  );
});

test("expired create leases are uncertain and do not cause another POST", async () => {
  const root = await observe();
  const job = await store.claim();
  assert.ok(job);
  assert.equal(await store.beginSend(job, "fingerprint"), true);
  await pool.query(
    'UPDATE "ForeverDiscordOutbox" SET "leaseUntil"=NOW()-INTERVAL \'1 second\' WHERE "id"=$1',
    [job.id],
  );
  await engine.maintenance();
  assert.equal((await store.bundle(root))!.projection.state, "uncertain");
  await drain();
  assert.equal(transport.creates, 0);
});

test("known-ID edit timeouts reconcile the accepted update without another create", async () => {
  const source = fixture();
  const root = await observe(source);
  await drain();
  const edited = {
    ...source,
    content: "New schedule confirmed",
    edited_timestamp: new Date(Date.now() + 20).toISOString(),
  };
  transport.messages.set(source.id, edited);
  await store.observe(edited, bridge.id, true);
  transport.editError = new DiscordFailure("unavailable");
  await engine.tick();
  await pool.query(
    'UPDATE "ForeverDiscordOutbox" SET "dueAt"=NOW() WHERE "rootId"=$1',
    [root],
  );
  await drain();
  assert.equal(transport.creates, 1);
  assert.equal(transport.edits, 1);
  assert.equal((await store.bundle(root))!.projection.appliedRevision, 2);
});

test("exact output links resolve uncertain deliveries and reject another author's message", async () => {
  const root = await observe();
  transport.createError = new DiscordFailure("unavailable");
  await drain();
  const fake = fixture(guilds.forever, {
    author: { id: secondAuthor, username: "Not the bot" },
  });
  transport.messages.set(fake.id, fake);
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "resolve",
      rootId: root,
      link: messageLink(guilds.forever, channelB, fake.id),
      reason: "Operator checks exact candidate",
    },
    owner,
  );
  await drain();
  assert.equal((await store.bundle(root))!.projection.messageId, null);
  const echo = [...transport.messages.values()].find(
    (v) => v.author.id === applicationId,
  )!;
  bridge = await store.bridge(bridge.id);
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "resolve",
      rootId: root,
      link: messageLink(guilds.forever, channelB, echo.id),
      reason: "Operator supplies verified output",
    },
    owner,
  );
  await drain();
  assert.equal((await store.bundle(root))!.projection.messageId, echo.id);
  assert.equal(transport.creates, 1);
});

test("expiry cleanup and retirement wait for managed copies to be gone", async () => {
  const root = await observe();
  await drain();
  await pool.query(
    'UPDATE "ForeverBridgeMessage" SET "expiresAt"=NOW()-INTERVAL \'1 second\' WHERE "id"=$1',
    [root],
  );
  await engine.maintenance();
  await drain();
  assert.equal((await store.bundle(root))!.projection.state, "removed");
  const other = await observe();
  await drain();
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "retire",
      reason: "Retire integration fixture",
    },
    owner,
  );
  await engine.maintenance();
  assert.equal((await store.bridge(bridge.id)).state, "retiring");
  await drain();
  await engine.maintenance();
  assert.equal((await store.bundle(other))!.projection.state, "removed");
  assert.equal((await store.bridge(bridge.id)).state, "retired");
});

test("configuration rejects one-way direction and duplicate endpoints", () => {
  assert.equal(
    createBridgeSchema.safeParse({
      name: "test",
      channelA,
      channelB,
      direction: "one_way",
    }).success,
    false,
  );
  assert.equal(
    createBridgeSchema.safeParse({
      name: "test",
      channelA,
      channelB: channelA,
      direction: "two_way",
    }).success,
    false,
  );
});
test("new text needs scoped current consent and a valid epoch", async () => {
  const granted = (await store.consent(bridge.id, guilds.kfc, author))!;
  assert.equal(eligibility(bridge, granted, fixture()), null);
  for (const changed of [
    null,
    { ...granted, actorId: secondAuthor },
    { ...granted, guildId: guilds.forever },
    { ...granted, generation: 0 },
    { ...granted, blocked: true },
    { ...granted, withdrawnAt: new Date() },
  ] as (Consent | null)[])
    assert.equal(eligibility(bridge, changed, fixture()), "no_consent");
  assert.equal(
    eligibility(
      bridge,
      granted,
      fixture(guilds.kfc, { timestamp: "2020-01-01T00:00:00.000Z" }),
    ),
    "outside_epoch",
  );
  assert.equal(
    await store.observe(
      fixture(guilds.kfc, { author: { id: id(), username: "no consent" } }),
      bridge.id,
    ),
    null,
  );
});
test("unsupported media, bots, mentions and links are rejected; rendering is bounded and attributed", () => {
  for (const extra of [
    { author: { id: author, username: "bot", bot: true } },
    { webhook_id: id() },
    { attachments: [{}] },
    { poll: {} },
    { type: 7 },
    { message_snapshots: [{}] },
    { content: "@everyone" },
    { content: "https://example.com" },
    { content: "DISCORD.GG/example" },
  ])
    assert.ok(contentPolicy(fixture(guilds.kfc, extra), []));
  assert.equal(
    contentPolicy(fixture(guilds.kfc, { content: "prohibited phrase" }), [
      "prohibited",
    ]),
    "prohibited_text",
  );
  const body = renderMessage(
    fixture(guilds.kfc, {
      author: { id: author, username: "**Fake\nAdmin\u202e**" },
      content: "Long ".repeat(2000),
    }),
    bridge,
    "test-reference",
  );
  assert.ok(body.content.length <= 2000);
  assert.ok(body.content.includes("Truncated"));
  assert.ok(body.content.includes("Shared from KFC"));
  assert.deepEqual(body.allowed_mentions, { parse: [], replied_user: false });
  assert.equal(body.flags, 4);
  assert.ok(!body.content.includes("\u202e"));
});
test("two-way messages, native replies and event replay produce no loops", async () => {
  const original = fixture();
  const a = await observe(original);
  await drain();
  const copyA = (await store.bundle(a))!.projection;
  const reply = fixture(guilds.forever, {
    author: { id: secondAuthor, username: "Reply author" },
    message_reference: { message_id: copyA.messageId!, channel_id: channelB },
  });
  const b = await observe(reply);
  await drain();
  assert.equal((await store.bundle(b))?.root.parentId, a);
  assert.equal(transport.bodies[1].message_reference?.message_id, original.id);
  assert.equal((await store.bundle(b))?.projection.channelId, channelA);
  assert.equal(await store.observe(original, bridge.id), null);
  const botOutput = transport.messages.get(copyA.messageId!)!;
  assert.equal(await store.observe(botOutput, bridge.id), null);
  assert.equal(transport.creates, 2);
});
test("unshared reply parents are never fetched or quoted", async () => {
  await observe(
    fixture(guilds.kfc, { message_reference: { message_id: id() } }),
  );
  await drain();
  assert.equal(transport.bodies[0].message_reference, undefined);
  assert.ok(transport.bodies[0].content.includes("Reply context unavailable"));
});
test("source edits update one copy and coalesce pending revisions", async () => {
  const message = fixture();
  const root = await observe(message);
  await drain();
  const copyId = (await store.bundle(root))!.projection.messageId;
  const updated = {
    ...message,
    content: "Updated plans for the group",
    edited_timestamp: new Date(Date.now() + 10).toISOString(),
  };
  transport.messages.set(message.id, updated);
  await store.observe(updated, bridge.id, true);
  await store.observe(updated, bridge.id, true);
  await drain();
  assert.equal(transport.creates, 1);
  assert.equal(transport.edits, 1);
  assert.equal((await store.bundle(root))!.projection.messageId, copyId);
  assert.ok(transport.messages.get(copyId!)?.content.includes("Updated plans"));
});
test("source deletion removes managed reply chains but never human originals", async () => {
  const original = fixture();
  const a = await observe(original);
  await drain();
  const copy = (await store.bundle(a))!.projection;
  const reply = fixture(guilds.forever, {
    author: { id: secondAuthor, username: "Reply author" },
    message_reference: { message_id: copy.messageId!, channel_id: channelB },
  });
  const b = await observe(reply);
  await drain();
  await store.deleted(guilds.kfc, channelA, [original.id]);
  await drain();
  assert.equal((await store.bundle(a))!.projection.state, "removed");
  assert.equal((await store.bundle(b))!.projection.state, "removed");
  assert.ok(transport.messages.has(reply.id));
  assert.ok(!transport.deletions.includes(reply.id));
});
test("destination deletion suppresses recreation after source edit", async () => {
  const original = fixture();
  const root = await observe(original);
  await drain();
  const projection = (await store.bundle(root))!.projection;
  transport.messages.delete(projection.messageId!);
  await store.deleted(guilds.forever, channelB, [projection.messageId!]);
  await store.observe(
    {
      ...original,
      content: "changed",
      edited_timestamp: new Date().toISOString(),
    },
    bridge.id,
    true,
  );
  await drain();
  assert.equal(transport.creates, 1);
  assert.equal((await store.bundle(root))!.projection.state, "suppressed");
});
test("deleted source before delivery and non-members cannot create copies", async () => {
  const source = fixture();
  const root = await observe(source);
  transport.messages.delete(source.id);
  await drain();
  assert.equal((await store.bundle(root))!.root.state, "removed");
  assert.equal(transport.creates, 0);
  transport.eligibleResult = false;
  const blocked = await observe();
  await drain();
  assert.equal(
    (await store.bundle(blocked))!.root.reason,
    "participant_ineligible",
  );
  assert.equal(transport.creates, 0);
});
test("opt-out during the create HTTP call removes the late returned copy", async () => {
  const root = await observe();
  transport.beforeCreate = async () => {
    await command("leave");
  };
  await drain();
  assert.equal((await store.bundle(root))!.root.state, "removed");
  assert.equal((await store.bundle(root))!.projection.state, "removed");
  assert.equal(transport.creates, 1);
  assert.equal(transport.deletions.length, 1);
});
test("ambiguous POSTs stay uncertain and a bot nonce echo resolves without retry", async () => {
  const root = await observe();
  transport.createError = new DiscordFailure("unavailable");
  await drain();
  let bundle = (await store.bundle(root))!;
  assert.equal(bundle.projection.state, "uncertain");
  await drain();
  assert.equal(transport.creates, 1);
  const echo = [...transport.messages.values()].find(
    (v) => v.author.id === applicationId,
  )!;
  await store.echo(guilds.forever, channelB, echo.id, String(echo.nonce));
  bundle = (await store.bundle(root))!;
  assert.equal(bundle.projection.messageId, echo.id);
  assert.equal(bundle.projection.state, "live");
});
test("unknown output removal remains unresolved, then compensates on a late echo", async () => {
  const root = await observe();
  transport.createError = new DiscordFailure("unavailable");
  await drain();
  await command("leave");
  await drain();
  assert.equal((await store.bundle(root))!.projection.state, "uncertain");
  const echo = [...transport.messages.values()].find(
    (v) => v.author.id === applicationId,
  )!;
  await store.echo(guilds.forever, channelB, echo.id, String(echo.nonce));
  await drain();
  assert.equal((await store.bundle(root))!.projection.state, "removed");
});
test("429 safely retries later and never floods; forbidden routes pause", async () => {
  const root = await observe();
  transport.createError = new DiscordFailure("rate_limited", 10);
  await engine.tick();
  assert.equal((await store.bundle(root))!.projection.state, "pending");
  assert.equal(await engine.tick(), false);
  transport.createError = new DiscordFailure("forbidden");
  await pool.query(
    'UPDATE "ForeverDiscordOutbox" SET "dueAt"=NOW() WHERE "bridgeId"=$1',
    [bridge.id],
  );
  await engine.tick();
  assert.equal((await store.bridge(bridge.id)).state, "paused");
});
test("permission fingerprint changes pause publication", async () => {
  await observe();
  transport.validation = "changed";
  await drain();
  assert.equal(transport.creates, 0);
  assert.equal((await store.bridge(bridge.id)).reason, "audience_changed");
});
test("pause allows cleanup but hard stop blocks it", async () => {
  const root = await observe();
  await drain();
  await store.pause(bridge.id, "test_pause");
  await store.remove(root, "test_removal");
  await pool.query('UPDATE "ForeverBridgeRuntime" SET "mode"=\'hard_stop\'');
  await drain();
  assert.equal(transport.deletions.length, 0);
  await pool.query('UPDATE "ForeverBridgeRuntime" SET "mode"=\'cleanup_only\'');
  await drain();
  assert.equal(transport.deletions.length, 1);
});
test("restart recovery withdraws restored consent, cancels publication and retains uncertain output IDs", async () => {
  const delivered = await observe();
  await drain();
  const pending = await observe();
  await store.recover();
  assert.equal((await store.runtime()).mode, "cleanup_only");
  assert.equal((await store.bridge(bridge.id)).state, "paused");
  assert.ok((await store.consent(bridge.id, guilds.kfc, author))?.withdrawnAt);
  await drain();
  assert.equal(transport.creates, 1);
  assert.equal((await store.bundle(delivered))!.projection.state, "removed");
  assert.equal((await store.bundle(pending))!.root.state, "removed");
});
test("manual review never sends before approval; new edits retract reviewed content", async () => {
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "reviewRequired"=TRUE WHERE "id"=$1',
    [bridge.id],
  );
  const source = fixture();
  const root = await observe(source);
  await drain();
  assert.equal(transport.creates, 0);
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "review",
      rootId: root,
      reason: "Test review approved",
    },
    owner,
  );
  await drain();
  assert.equal(transport.creates, 1);
  const update = {
    ...source,
    content: "Changed after review",
    edited_timestamp: new Date(Date.now() + 10).toISOString(),
  };
  await store.observe(update, bridge.id, true);
  await drain();
  assert.equal((await store.bundle(root))!.projection.state, "removed");
});
test("participant quotas and stale creates do not create a conversation backlog", async () => {
  for (let i = 0; i < 5; i++) await observe();
  assert.equal(await store.observe(fixture(), bridge.id), null);
  await pool.query(
    'UPDATE "ForeverBridgeMessage" SET "createdAt"=NOW()-INTERVAL \'3 minutes\' WHERE "bridgeId"=$1',
    [bridge.id],
  );
  await drain();
  assert.equal(transport.creates, 0);
});
test("consent confirmation is actor-bound, encrypted, idempotent and checks both memberships", async () => {
  await command("leave");
  const joined = (await command("join")) as {
    data: { components: { components: { custom_id: string }[] }[] };
  };
  const custom = joined.data.components[0].components[0].custom_id;
  const payload = {
    type: 3,
    id: id(),
    application_id: applicationId,
    guild_id: guilds.kfc,
    channel_id: channelA,
    token: "local-test-interaction-token",
    member: { user: { id: author } },
    data: { custom_id: custom },
  };
  await assert.rejects(
    bridgeInteraction(
      { ...payload, id: id(), member: { user: { id: secondAuthor } } },
      store,
      secret,
    ),
    (e: unknown) => e instanceof BridgeError && e.status === 403,
  );
  const first = await bridgeInteraction(payload, store, secret);
  assert.equal(first.type, 5);
  assert.deepEqual(await bridgeInteraction(payload, store, secret), first);
  const stored = await one<{ tokenCipher: string }>(
    pool,
    'SELECT "tokenCipher" FROM "ForeverDiscordInteraction" WHERE "id"=$1',
    [payload.id],
  );
  assert.ok(stored?.tokenCipher);
  assert.ok(!stored.tokenCipher.includes(payload.token));
  await engine.consentTick();
  assert.equal(
    (await store.consent(bridge.id, guilds.kfc, author))!.withdrawnAt,
    null,
  );
  assert.equal(
    (
      await one<{ tokenCipher: string | null }>(
        pool,
        'SELECT "tokenCipher" FROM "ForeverDiscordInteraction" WHERE "id"=$1',
        [payload.id],
      )
    )?.tokenCipher,
    null,
  );
  assert.ok(transport.responses[0].includes("opted in"));
});
test("leave cancels unprocessed confirmations and rejoining cannot clear a staff block", async () => {
  await command("leave");
  const joined = (await command("join")) as {
    data: { components: { components: { custom_id: string }[] }[] };
  };
  await bridgeInteraction(
    {
      type: 3,
      id: id(),
      application_id: applicationId,
      guild_id: guilds.kfc,
      channel_id: channelA,
      token: "local-test-interaction-token",
      member: { user: { id: author } },
      data: { custom_id: joined.data.components[0].components[0].custom_id },
    },
    store,
    secret,
  );
  await command("leave");
  await engine.consentTick();
  assert.ok((await store.consent(bridge.id, guilds.kfc, author))!.withdrawnAt);
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "block",
      actorId: author,
      reason: "Blocked for integration test",
    },
    owner,
  );
  assert.ok(JSON.stringify(await command("join")).includes("blocked by staff"));
});
test("author removal does not allow removing another person's copy", async () => {
  const source = fixture();
  await observe(source);
  await drain();
  const request = {
    data: {
      name: "bridge",
      options: [
        {
          name: "remove",
          type: 1,
          options: [
            {
              name: "message",
              type: 3,
              value: messageLink(guilds.kfc, channelA, source.id),
            },
          ],
        },
      ],
    },
  };
  await assert.rejects(
    command("remove", secondAuthor, request),
    (error: unknown) => error instanceof BridgeError && error.status === 404,
  );
  await command("remove", author, request);
  await drain();
  assert.equal(transport.deletions.length, 1);
});
test("token encryption rejects modified ciphertext, wrong key and wrong receipt", () => {
  const encrypted = encryptToken(
    "private-interaction-token",
    secret,
    "receipt",
  );
  assert.equal(
    decryptToken(encrypted, secret, "receipt"),
    "private-interaction-token",
  );
  assert.throws(() => decryptToken(encrypted, secret, "different"));
  assert.throws(() =>
    decryptToken(encrypted, randomBytes(32).toString("hex"), "receipt"),
  );
});
test("editor, unassigned moderator, stale config and unverified activation are rejected", async () => {
  const action = {
    id: bridge.id,
    version: bridge.version,
    action: "pause" as const,
    reason: "Permission boundary test",
  };
  for (const role of ["editor", "moderator"] as const)
    await assert.rejects(
      control(store, action, { ...owner, role }),
      (error: unknown) => error instanceof BridgeError && error.status === 403,
    );
  await assert.rejects(
    control(store, { ...action, version: 999 }, owner),
    (error: unknown) => error instanceof BridgeError && error.status === 409,
  );
  await assert.rejects(
    control(store, { ...action, action: "activate" }, owner),
  );
  await assert.rejects(
    setMode(store, "hard_stop", (await store.runtime()).version, "test", {
      ...owner,
      role: "moderator",
    }),
  );
  assert.equal(
    (await snapshot(store, { ...owner, role: "moderator" })).bridges.length,
    0,
  );
});
test("fresh validation resolves only older validation failures for the same pair", async () => {
  await readyForPilot();
  await pool.query(
    'UPDATE "ForeverDiscordBridge" SET "noticeA"=$2,"noticeB"=$3 WHERE "id"=$1',
    [
      bridge.id,
      messageLink(guilds.kfc, channelA, id()),
      messageLink(guilds.forever, channelB, id()),
    ],
  );
  const second = await extraPair("1800000000000000071", "1800000000000000072");
  for (const pair of [bridge, second]) {
    const jobId = randomUUID();
    await pool.query(
      'INSERT INTO "ForeverDiscordOutbox" ("id","bridgeId","operation","revision","dedupeKey","state","error") VALUES ($1,$2,\'validate\',0,$1,\'failed\',\'invalid\')',
      [jobId, pair.id],
    );
  }
  await control(
    store,
    {
      id: bridge.id,
      version: bridge.version,
      action: "validate",
      reason: "Recheck replacement notice",
    },
    owner,
  );
  await drain();
  assert.equal((await store.bridge(bridge.id)).state, "ready");
  const old = await one<{ state: string; error: string }>(
    pool,
    'SELECT state,error FROM "ForeverDiscordOutbox" WHERE "bridgeId"=$1 AND revision=0',
    [bridge.id],
  );
  assert.deepEqual(old, { state: "cancelled", error: "invalid" });
  assert.equal(
    (await one<{ state: string }>(
      pool,
      'SELECT state FROM "ForeverDiscordOutbox" WHERE "bridgeId"=$1',
      [second.id],
    ))!.state,
    "failed",
  );
});
test("restricted pilot retains activation gates, staff authorization and bounded tester IDs", async () => {
  await readyForPilot();
  const input = {
    id: bridge.id,
    version: bridge.version,
    action: "pilot" as const,
    reason: "Check restricted test gates",
    testerIds: [author],
  };
  for (const testerIds of [
    [],
    [author, author],
    Array(6).fill(author),
    ["bad-id"],
  ])
    assert.equal(
      controlSchema.safeParse({ ...input, testerIds }).success,
      false,
    );
  await assert.rejects(control(store, input, { ...owner, role: "moderator" }));
  await assert.rejects(control(store, { ...input, action: "activate" }, owner));
  const previous = process.env.BRIDGE_INTERACTIONS_ENABLED;
  process.env.BRIDGE_INTERACTIONS_ENABLED = "true";
  try {
    await pool.query(
      'UPDATE "ForeverDiscordBridge" SET "reviewRequired"=FALSE WHERE "id"=$1',
      [bridge.id],
    );
    await assert.rejects(control(store, input, owner));
    await pool.query(
      'UPDATE "ForeverDiscordBridge" SET "reviewRequired"=TRUE,"approvalB"=NULL WHERE "id"=$1',
      [bridge.id],
    );
    await assert.rejects(control(store, input, owner));
    await pool.query(
      'UPDATE "ForeverDiscordBridge" SET "approvalB"=\'staff:test\',"validatedAt"=NOW()-INTERVAL \'6 minutes\' WHERE "id"=$1',
      [bridge.id],
    );
    await assert.rejects(control(store, input, owner));
    await pool.query(
      'UPDATE "ForeverDiscordBridge" SET "validatedAt"=NOW() WHERE "id"=$1',
      [bridge.id],
    );
    await control(store, input, owner);
    const current = await store.bridge(bridge.id);
    assert.equal(current.state, "pilot");
    assert.equal(
      current.pilotUntil!.getTime() - current.activatedAt!.getTime(),
      3600000,
    );
    assert.deepEqual(current.pilotActorIds, [author]);
    assert.equal(await store.consent(bridge.id, guilds.kfc, author), null);
    assert.equal((await snapshot(store, owner)).bridges[0].state, "pilot");
    await assert.rejects(
      control(
        store,
        {
          ...input,
          version: current.version,
          action: "configure",
          reviewRequired: false,
        },
        owner,
      ),
    );
    await assert.rejects(
      pool.query(
        'UPDATE "ForeverDiscordBridge" SET "reviewRequired"=FALSE WHERE "id"=$1',
        [bridge.id],
      ),
    );
  } finally {
    if (previous === undefined) delete process.env.BRIDGE_INTERACTIONS_ENABLED;
    else process.env.BRIDGE_INTERACTIONS_ENABLED = previous;
  }
});
test("pilot requires explicit tester confirmation and rejects unlisted participants", async () => {
  await startPilot();
  const unlisted = (await command("join", secondAuthor)) as {
    data: { content: string; components?: unknown };
  };
  assert.match(unlisted.data.content, /unavailable/);
  assert.equal(unlisted.data.components, undefined);
  assert.equal(await store.observe(fixture(), bridge.id), null);
  const joined = (await command("join")) as {
    data: {
      content: string;
      components: { components: { custom_id: string }[] }[];
    };
  };
  assert.match(joined.data.content, /Restricted staff test/);
  assert.equal(await store.consent(bridge.id, guilds.kfc, author), null);
  await bridgeInteraction(
    {
      type: 3,
      id: id(),
      application_id: applicationId,
      guild_id: guilds.kfc,
      channel_id: channelA,
      token: "local-test-interaction-token",
      member: { user: { id: author } },
      data: { custom_id: joined.data.components[0].components[0].custom_id },
    },
    store,
    secret,
  );
  await engine.consentTick();
  assert.equal(
    (await store.consent(bridge.id, guilds.kfc, author))!.generation,
    bridge.generation,
  );
  const root = await observe();
  await drain();
  assert.equal(transport.creates, 0);
  await approveTestMessage(root);
  await drain();
  assert.equal(transport.creates, 1);
  await consent(secondAuthor, guilds.kfc);
  assert.equal(
    await store.observe(
      fixture(guilds.kfc, {
        author: { id: secondAuthor, username: "Unlisted" },
      }),
      bridge.id,
    ),
    null,
  );
});
test("pilot expiry rejects enrollment and delivery before maintenance and cleans known copies", async () => {
  await startPilot();
  await consent();
  const delivered = await observe();
  await approveTestMessage(delivered);
  await drain();
  const pending = await observe();
  await approveTestMessage(pending);
  await expirePilot();
  const response = (await command("join")) as { data: { content: string } };
  assert.match(response.data.content, /unavailable/);
  assert.equal(await store.observe(fixture(), bridge.id), null);
  await drain();
  assert.equal(transport.creates, 1);
  await engine.maintenance();
  await drain();
  assert.equal((await store.bridge(bridge.id)).state, "paused");
  assert.ok((await store.consent(bridge.id, guilds.kfc, author))!.withdrawnAt);
  assert.equal((await store.bundle(delivered))!.projection.state, "removed");
  assert.equal((await store.bundle(pending))!.root.state, "removed");
});
test("pilot expiry during POST compensates the late copy", async () => {
  await startPilot();
  await consent();
  const root = await observe();
  await approveTestMessage(root);
  transport.beforeCreate = expirePilot;
  await drain();
  assert.equal(transport.creates, 1);
  assert.equal((await store.bundle(root))!.projection.state, "removed");
});
test("pilot pause and global stop withdraw testers and remove test copies", async () => {
  for (const global of [false, true]) {
    await startPilot();
    await consent();
    const root = await observe();
    await approveTestMessage(root);
    await drain();
    if (global)
      await setMode(
        store,
        "cleanup_only",
        (await store.runtime()).version,
        "Stop restricted test",
        owner,
      );
    else
      await control(
        store,
        {
          id: bridge.id,
          version: (await store.bridge(bridge.id)).version,
          action: "pause",
          reason: "Stop restricted test",
        },
        owner,
      );
    await drain();
    assert.equal((await store.bundle(root))!.projection.state, "removed");
    assert.ok(
      (await store.consent(bridge.id, guilds.kfc, author))!.withdrawnAt,
    );
  }
});
test("pilot never accepts more than twenty messages per activation", async () => {
  await startPilot();
  await consent();
  for (let index = 0; index < 20; index++) {
    await observe();
    await pool.query(
      'UPDATE "ForeverBridgeMessage" SET "createdAt"=NOW()-INTERVAL \'2 minutes\' WHERE "bridgeId"=$1',
      [bridge.id],
    );
  }
  assert.equal(await store.observe(fixture(), bridge.id), null);
});
test("durable mappings and the outbox contain no source bodies", async () => {
  const privateText = `source-only-${randomUUID()}`;
  const root = await observe(fixture(guilds.kfc, { content: privateText }));
  await drain();
  const metadata = await pool.query(
    'SELECT row_to_json(m) AS metadata FROM "ForeverBridgeMessage" m WHERE "id"=$1',
    [root],
  );
  assert.ok(!JSON.stringify(metadata.rows).includes(privateText));
  const jobs = await pool.query(
    'SELECT row_to_json(j) AS metadata FROM "ForeverDiscordOutbox" j WHERE "rootId"=$1',
    [root],
  );
  assert.ok(!JSON.stringify(jobs.rows).includes(privateText));
});
test("worker DB grants allow bridge operations but deny staff credentials and private reports", async () => {
  const role = `bridge_test_${randomBytes(5).toString("hex")}`;
  const sql = (await readFile("deploy/bridge-grants.sql", "utf8")).replaceAll(
    "forever_bridge_worker",
    role,
  );
  const client = await pool.connect();
  try {
    await client.query(`CREATE ROLE ${role} NOLOGIN NOINHERIT`);
    await client.query(sql);
    await client.query(`SET ROLE ${role}`);
    await client.query('SELECT "id" FROM "ForeverDiscordBridge"');
    await client.query(
      "SELECT forever_bridge_audit('system:bridge',$1,'grant_test','{}'::jsonb)",
      [bridge.id],
    );
    for (const table of [
      "ForeverUser",
      "ForeverReport",
      "ForeverEvidence",
      "ForeverAuditLog",
    ])
      await assert.rejects(
        client.query(`SELECT * FROM "${table}" LIMIT 1`),
        (error: unknown) =>
          !!error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "42501",
      );
    await assert.rejects(
      client.query(
        "SELECT forever_bridge_audit('invalid',$1,'grant_test','{}'::jsonb)",
        [bridge.id],
      ),
    );
  } finally {
    await client.query("RESET ROLE");
    await client.query(`DROP OWNED BY ${role}`);
    await client.query(`DROP ROLE ${role}`);
    client.release();
  }
});
