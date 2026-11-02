import assert from "node:assert/strict";
import { mkdtemp, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { kfcApplicationId, kfcGuildId, scheduledEventBindings } from "../content/kfc-community";
import {
  raidingConfigSchema,
  raidingStateSchema,
  type RaidSession,
  type MessagePayload,
  type RaidingConfig,
  type RaidingRequest,
} from "../lib/kfc-raiding/contracts";
import {
  hubPanel,
  checksum,
  localDigestDate,
  schedulePanel,
  sessionPanel,
  upcomingSessions,
  managedThreadTitle,
} from "../lib/kfc-raiding/presentation";
import { editableMessage, deliverSession, updateOwnedMessage } from "../lib/kfc-raiding/delivery";
import { externalSessions, managedSessions } from "../lib/kfc-raiding/sources";
import { syncManagedThread } from "../lib/kfc-raiding/managed-threads";
import type { PrismaClient } from "@prisma/client";
import { RaidingStore } from "../lib/kfc-raiding/storage";
import { raidingClient, type RaidingClient } from "../lib/kfc-raiding/transport";
import { deliverDigests, syncAlertSubscriptions } from "../lib/kfc-raiding/alerts";
import { nativeOwnedFields, syncManagedNativeEvents } from "../lib/kfc-raiding/native-events";

const id = (value: number): string => String(1566000000000000000n + BigInt(value));
function config(): RaidingConfig {
  const space = (offset: number): object => ({
    categoryId: id(offset),
    schedule: { channelId: id(offset + 1), messageId: id(offset + 2) },
    forumId: id(offset + 3),
    forumGuideId: id(offset + 4),
    chatId: id(offset + 5),
    alertRoleId: id(offset + 6),
    alerts: { channelId: id(offset + 1), messageId: id(offset + 7) },
    tags: {
      Open: id(offset + 8),
      Cancelled: id(offset + 9),
      "Signup closed": id(offset + 10),
    },
  });
  return raidingConfigSchema.parse({
    version: 1,
    guildId: kfcGuildId,
    applicationId: kfcApplicationId,
    hub: { channelId: id(1), messageId: id(2) },
    spaces: { forever: space(10), tbc: space(30) },
  });
}
function session(changes: Partial<RaidSession> = {}): RaidSession {
  return {
    key: "managed:cmv1111111111111111111111",
    game: "forever",
    title: "Raid",
    activity: "Test raid",
    eventType: "raid",
    startsAt: "2026-11-01T19:00:00Z",
    endsAt: "2026-11-01T22:00:00Z",
    status: "open",
    signupUrl: "https://www.wowforeverdiscord.online/raids/cmv1111111111111111111111",
    sourceChannelId: id(80),
    sourceMessageId: id(81),
    host: "Host",
    capacity: 20,
    confirmed: 7,
    registered: 3,
    source: "managed",
    ...changes,
  };
}
const now = new Date("2026-10-31T12:00:00Z");

test("Edited explicitly bound KFC raids remain synchronized while directory approval is pending", async (): Promise<void> => {
  const cfg = config();
  const eventId = "cmv1111111111111111111111";
  cfg.managedNativeEvents[eventId] = id(90);
  const event = {
    id: eventId,
    game: "forever",
    title: "Edited raid",
    raidName: "Hyjal",
    eventType: "raid",
    status: "open",
    startsAt: new Date("2026-12-14T10:00:00Z"),
    endsAt: new Date("2026-12-14T12:00:00Z"),
    capacity: 20,
    organizer: { displayName: "DJ" },
    signups: [],
    discordPost: {
      messageId: id(81),
      channelId: id(80),
      guildId: kfcGuildId,
      confirmedAt: new Date(),
      approvedAt: null,
      visibility: "community",
    },
  };
  let query: unknown;
  const database = {
    foreverRaidEvent: {
      findMany: async (args: unknown): Promise<unknown[]> => {
        query = args;
        return [event];
      },
    },
  } as unknown as Pick<PrismaClient, "foreverRaidEvent">;
  const result = await managedSessions(database, cfg, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].startsAt, "2026-12-14T10:00:00.000Z");
  assert(JSON.stringify(query).includes(eventId));
  cfg.managedNativeEvents = {};
  assert.deepEqual(await managedSessions(database, cfg, now), []);
});

test("Managed forum titles follow edited times and preserve moderator locks", async (): Promise<void> => {
  await withStore(async (store) => {
    const cfg = config(),
      state = raidingStateSchema.parse({});
    const source = session({
      title: "Hyjal · Morning normal · DJ",
      startsAt: "2026-12-14T10:00:00Z",
    });
    const thread = {
      id: source.sourceChannelId,
      guild_id: kfcGuildId,
      type: 11,
      parent_id: cfg.spaces.forever.forumId,
      owner_id: kfcApplicationId,
      name: "14 Dec · 12:00 CET · Hyjal · Morning normal · DJ",
      thread_metadata: { archived: false, locked: false },
    };
    let writes = 0;
    const transport = client(async (route, method, body): Promise<unknown> => {
      assert.equal(route, `/channels/${thread.id}`);
      assert.equal(method, "PATCH");
      Object.assign(thread, body);
      writes++;
      return thread;
    });
    await syncManagedThread(source, thread, cfg, state, store, transport, now);
    assert.equal(thread.name, "14 Dec · 11:00 CET · Hyjal · Morning normal · DJ");
    assert.equal(writes, 1);
    await syncManagedThread(source, thread, cfg, state, store, transport, now);
    assert.equal(writes, 1);
    thread.thread_metadata.locked = true;
    source.startsAt = "2026-12-14T11:00:00Z";
    await syncManagedThread(source, thread, cfg, state, store, transport, now);
    assert.equal(writes, 1);
    assert.match(managedThreadTitle({ ...source, startsAt: "2027-06-14T10:00:00Z" }), /12:00 CEST/);
  });
});
function client(request: RaidingRequest): RaidingClient {
  return {
    request,
    allowChannel(): void {},
    allowOwnedThread(): void {},
    allowSubscriber(): void {},
  };
}
async function withStore(run: (store: RaidingStore) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "kfc-raiding-"));
  const store = new RaidingStore(root);
  try {
    await store.initialize();
    await run(store);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("Schedules sort actual starts, keep simultaneous teams and deduplicate only the same source", (): void => {
  const a = session(),
    b = session({ key: "managed:second-team" }),
    early = session({
      key: "managed:earlier",
      startsAt: "2026-11-01T10:00:00Z",
    });
  assert.deepEqual(
    upcomingSessions([a, b, early, a], "forever", now).map((item): string => item.key),
    [early.key, a.key, b.key],
  );
});
test("Schedules exclude other editions, cancelled, past and out-of-window sessions", (): void => {
  const entries = [
    session({ game: "tbc" }),
    session({ status: "cancelled" }),
    session({ endsAt: "2026-10-30T12:00:00Z" }),
    session({ startsAt: "2026-12-01T10:00:00Z" }),
    session({ startsAt: "invalid" }),
  ];
  assert.deepEqual(upcomingSessions(entries, "forever", now), []);
});
test("Schedule is compact, honest about pending seats and includes existing leveling separately", (): void => {
  const payload = schedulePanel(
    "forever",
    [session(), session({ key: "managed:questing", eventType: "questing" })],
    config(),
    now,
    now,
  );
  const text = payload.embeds[0].description!;
  assert.match(text, /7\/20 confirmed · 3 awaiting selection/);
  assert.match(text, /Other planned groups/);
  assert.match(text, /Djilanov/);
  assert.match(text, /Psyrogue/);
  assert.match(text, /<t:\d+:f>/);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
});
test("Empty schedule does not manufacture daily raids or signup places", (): void => {
  const text = schedulePanel("forever", [], config(), now, now).embeds[0].description!;
  assert.match(text, /No confirmed raid dates/);
  assert.doesNotMatch(text, /\d+\/\d+ confirmed/);
});
test("Schedule bounds overflow and escapes mentions", (): void => {
  const entries = Array.from({ length: 15 }, (_, index): RaidSession =>
    session({ key: `managed:${index}`, title: "@everyone [raid]" }),
  );
  const text = schedulePanel("forever", entries, config(), now, now).embeds[0].description!;
  assert.match(text, /7 more runs/);
  assert.doesNotMatch(text, /@everyone/);
  assert.ok(text.length < 4096);
});
test("Raid-Helper card keeps its original signup and does not invent occupancy", (): void => {
  const source = session({
    source: "raid-helper",
    key: "raid-helper:123",
    capacity: null,
    confirmed: null,
    registered: null,
    endsAt: null,
  });
  const payload = sessionPanel(source);
  assert.match(payload.embeds[0].description!, /Raid-Helper is the authoritative signup/);
  assert.equal(payload.components[0].components[0].url, source.signupUrl);
  assert.equal(
    payload.embeds[0].fields!.find((field): boolean => field.name === "Signup")!.value,
    "View signup",
  );
  assert.ok(!payload.embeds[0].fields!.some((field): boolean => field.name === "Scheduled finish"));
});
test("Digest boundaries follow Berlin summer and winter time", (): void => {
  assert.equal(localDigestDate(new Date("2026-07-01T15:59:00Z"), 18), null);
  assert.equal(localDigestDate(new Date("2026-07-01T16:00:00Z"), 18), "2026-07-01");
  assert.equal(localDigestDate(new Date("2026-11-01T16:59:00Z"), 18), null);
  assert.equal(localDigestDate(new Date("2026-11-01T17:00:00Z"), 18), "2026-11-01");
});
test("Hub links point to the two exact schedule messages", (): void => {
  const cfg = config();
  const buttons = hubPanel(cfg).components[0].components;
  assert.equal(buttons.length, 2);
  assert.equal(hubPanel(cfg).flags, 0);
  assert.ok(
    buttons[0].url.endsWith(
      `${cfg.spaces.forever.schedule.channelId}/${cfg.spaces.forever.schedule.messageId}`,
    ),
  );
});

test("Schedule titles open the session conversation when a delivered forum post exists", (): void => {
  const source = session();
  const payload = schedulePanel("forever", [source], config(), now, now, false, {
    [source.key]: { status: "sent", threadId: id(70) },
  });
  assert.ok(payload.embeds[0].description!.includes(`/channels/${kfcGuildId}/${id(70)}/${id(70)}`));
  assert.ok(!payload.embeds[0].description!.includes(source.signupUrl));
});
test("Owned-message comparison ignores generated Discord metadata", (): void => {
  const payload = hubPanel(config());
  assert.deepEqual(
    editableMessage(payload),
    editableMessage({
      ...payload,
      embeds: payload.embeds.map((embed) => ({
        ...embed,
        type: "rich",
        content_scan_version: 3,
      })),
      components: payload.components.map((row) => ({
        ...row,
        id: 1,
        components: row.components.map((button) => ({ ...button, id: 2 })),
      })),
    }),
  );
});
test("Transport denies foreign guilds, arbitrary posts, unapproved role changes and source edits", async (): Promise<void> => {
  const cfg = config();
  const transport = raidingClient(cfg, "test-credential-not-real", async (): Promise<Response> => {
    throw new Error("Must not reach fetch");
  });
  transport.allowChannel(id(80));
  await assert.rejects(
    transport.request(`/channels/${id(80)}/messages/${id(81)}`, "PATCH", sessionPanel(session())),
    /outside approved scope/,
  );
  await assert.rejects(transport.request(`/guilds/${id(99)}/channels`), /outside approved scope/);
  await assert.rejects(
    transport.request(
      `/guilds/${kfcGuildId}/members/${id(90)}/roles/${cfg.spaces.forever.alertRoleId}`,
      "PUT",
    ),
    /outside approved scope/,
  );
  await assert.rejects(
    transport.request(
      `/channels/${cfg.spaces.forever.chatId}/messages`,
      "POST",
      sessionPanel(session()),
    ),
    /outside approved scope/,
  );
});
test("Transport refuses mass mentions and never retries uncertain writes", async (): Promise<void> => {
  const cfg = config();
  let calls = 0;
  const transport = raidingClient(cfg, "test-credential-not-real", async (): Promise<Response> => {
    calls++;
    throw new Error("Network lost");
  });
  await assert.rejects(
    transport.request(`/channels/${cfg.spaces.forever.schedule.channelId}/messages`, "POST", {
      content: "@everyone",
      allowed_mentions: { parse: ["everyone"] },
    }),
  );
  assert.equal(calls, 0);
  await assert.rejects(
    transport.request(
      `/channels/${cfg.spaces.forever.schedule.channelId}/messages`,
      "POST",
      sessionPanel(session()),
    ),
    /outcome uncertain/,
  );
  assert.equal(calls, 1);
});
test("Private state is atomic, rejects unsafe permissions and prevents concurrent workers", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const state = raidingStateSchema.parse({});
    await store.save(state);
    assert.deepEqual(await store.state(), state);
    const release = await store.lock();
    await assert.rejects(store.lock());
    await release();
    await chmod(path.join(store.root, "state.json"), 0o644);
    await assert.rejects(store.state(), /Unsafe/);
  });
});
test("Human edits and other bot messages are preserved", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      state = raidingStateSchema.parse({});
    const owned = {
      ...hubPanel(cfg),
      id: cfg.hub.messageId,
      channel_id: cfg.hub.channelId,
      author: { id: kfcApplicationId, bot: true },
    };
    const transport = client(async (): Promise<unknown> => owned);
    state.panels.hub = "different-owned-version";
    await assert.rejects(
      updateOwnedMessage(
        "hub",
        cfg.hub.channelId,
        cfg.hub.messageId,
        schedulePanel("forever", [], cfg, now, now),
        state,
        store,
        transport,
      ),
      /changed outside/,
    );
    await assert.rejects(
      updateOwnedMessage(
        "hub",
        cfg.hub.channelId,
        cfg.hub.messageId,
        hubPanel(cfg),
        state,
        store,
        client(async (): Promise<unknown> => ({
          ...owned,
          author: { id: id(99), bot: true },
        })),
      ),
      /ownership mismatch/,
    );
  });
});
test("Forum creation interruption is not retried when no matching post can be reconciled", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const state = raidingStateSchema.parse({
      posts: { [session().key]: { status: "creating" } },
    });
    let writes = 0;
    const transport = client(async (_route, method = "GET"): Promise<unknown> => {
      if (method !== "GET") writes++;
      return { threads: [] };
    });
    await assert.rejects(
      deliverSession(session(), config(), state, store, transport, now),
      /not repeated/,
    );
    assert.equal(writes, 0);
  });
});
test("No new posts are created for cancelled or already-started sessions", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const transport = client(async (): Promise<unknown> => {
      throw new Error("Unexpected request");
    });
    await deliverSession(
      session({ status: "cancelled" }),
      config(),
      raidingStateSchema.parse({}),
      store,
      transport,
      now,
    );
    await deliverSession(
      session({ startsAt: "2026-10-30T10:00:00Z" }),
      config(),
      raidingStateSchema.parse({}),
      store,
      transport,
      now,
    );
  });
});
test("Digest creation is once per edition/date and an uncertain attempt is held", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config();
    cfg.digestsEnabled = true;
    const state = raidingStateSchema.parse({
      subscriptions: { forever: { [id(90)]: "assigned" }, tbc: {} },
    });
    const time = new Date("2026-11-01T17:30:00Z");
    let posts = 0;
    const transport = client(async (route, method = "GET", body): Promise<unknown> => {
      if (method === "POST") {
        posts++;
        return {
          ...(body as object),
          id: id(96),
          channel_id: cfg.spaces.forever.schedule.channelId,
          author: { id: kfcApplicationId, bot: true },
        };
      }
      if (route.endsWith("messages?limit=100")) return [];
      throw new Error("Unexpected request");
    });
    await deliverDigests([session()], cfg, state, store, transport, time);
    await deliverDigests([session()], cfg, state, store, transport, time);
    assert.equal(posts, 1);
    state.digests["forever:2026-11-01"] = { status: "creating" };
    await deliverDigests([session()], cfg, state, store, transport, time);
    assert.equal(state.digests["forever:2026-11-01"].status, "held");
    assert.equal(posts, 1);
  });
});
test("Removing an alert reaction only removes roles assigned by this worker", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      state = raidingStateSchema.parse({
        subscriptions: { forever: { [id(90)]: "assigned" }, tbc: {} },
      });
    let removed = 0;
    const transport = client(async (route, method = "GET"): Promise<unknown> => {
      if (method === "DELETE") {
        removed++;
        assert.ok(route.endsWith(`/roles/${cfg.spaces.forever.alertRoleId}`));
        return null;
      }
      if (route.includes("/reactions/")) return [];
      if (route.includes("/members/")) return { roles: [cfg.spaces.forever.alertRoleId, id(99)] };
      return {
        id: cfg.spaces.forever.alerts.messageId,
        channel_id: cfg.spaces.forever.alerts.channelId,
        author: { id: kfcApplicationId, bot: true },
        content: "",
      };
    });
    await syncAlertSubscriptions("forever", cfg, state, store, transport);
    assert.equal(removed, 1);
    assert.deepEqual(state.subscriptions.forever, {});
  });
});
test("Forever and TBC alert opt-ins remain independent and preserve manually assigned roles", async (): Promise<void> => {
  for (const game of ["forever", "tbc"] as const)
    await withStore(async (store): Promise<void> => {
      const cfg = config();
      const other = game === "forever" ? "tbc" : "forever";
      const subscriber = id(90),
        manualSubscriber = id(91),
        unrelatedRole = id(99);
      const role = cfg.spaces[game].alertRoleId;
      const otherRole = cfg.spaces[other].alertRoleId;
      const state = raidingStateSchema.parse({
        subscriptions: { [other]: { [subscriber]: "assigned" } },
      });
      const members = new Map([
        [subscriber, new Set([otherRole, unrelatedRole])],
        [manualSubscriber, new Set([role, otherRole, unrelatedRole])],
      ]);
      const writes: { method: string; route: string }[] = [];
      let subscribed = true;
      const guideRoute = `/channels/${cfg.spaces[game].alerts.channelId}/messages/${cfg.spaces[game].alerts.messageId}`;
      const transport = client(async (route, method = "GET"): Promise<unknown> => {
        if (method === "GET" && route === guideRoute)
          return {
            id: cfg.spaces[game].alerts.messageId,
            channel_id: cfg.spaces[game].alerts.channelId,
            author: { id: kfcApplicationId, bot: true },
            content: "",
          };
        if (method === "GET" && route === `${guideRoute}/reactions/%F0%9F%94%94?limit=100`)
          return subscribed ? [{ id: subscriber }, { id: manualSubscriber }] : [];
        for (const [memberId, memberRoles] of members) {
          const memberRoute = `/guilds/${kfcGuildId}/members/${memberId}`;
          if (method === "GET" && route === memberRoute) return { roles: [...memberRoles] };
          if (
            (method === "PUT" || method === "DELETE") &&
            route === `${memberRoute}/roles/${role}`
          ) {
            writes.push({ method, route });
            if (method === "PUT") memberRoles.add(role);
            else memberRoles.delete(role);
            return null;
          }
        }
        throw new Error(`Unexpected alert request: ${method} ${route}`);
      });
      await syncAlertSubscriptions(game, cfg, state, store, transport);
      assert.deepEqual(state.subscriptions[game], { [subscriber]: "assigned" });
      assert.deepEqual(state.subscriptions[other], {
        [subscriber]: "assigned",
      });
      assert.deepEqual(members.get(subscriber), new Set([role, otherRole, unrelatedRole]));
      subscribed = false;
      await syncAlertSubscriptions(game, cfg, state, store, transport);
      assert.deepEqual(state.subscriptions[game], {});
      assert.deepEqual(state.subscriptions[other], {
        [subscriber]: "assigned",
      });
      assert.deepEqual(members.get(subscriber), new Set([otherRole, unrelatedRole]));
      assert.deepEqual(members.get(manualSubscriber), new Set([role, otherRole, unrelatedRole]));
      assert.deepEqual(writes, [
        {
          method: "PUT",
          route: `/guilds/${kfcGuildId}/members/${subscriber}/roles/${role}`,
        },
        {
          method: "DELETE",
          route: `/guilds/${kfcGuildId}/members/${subscriber}/roles/${role}`,
        },
      ]);
      assert.deepEqual((await store.state()).subscriptions, state.subscriptions);
    });
});
test("External listings never copy another bot or a restricted unapproved session", async (): Promise<void> => {
  const cfg = config();
  let reads = 0;
  const transport = client(async (): Promise<unknown> => {
    reads++;
    return {
      id: id(81),
      channel_id: id(80),
      author: { id: kfcApplicationId, bot: true },
    };
  });
  const event = {
    id: id(98),
    guild_id: kfcGuildId,
    name: "External",
    scheduled_start_time: "2026-11-01T19:00:00Z",
    scheduled_end_time: "2026-11-01T20:00:00Z",
    entity_type: 3,
    status: 1,
    entity_metadata: {
      location: `https://discord.com/channels/${kfcGuildId}/${id(80)}/${id(81)}`,
    },
  };
  const inventory = {
    channels: [
      {
        id: id(80),
        guild_id: kfcGuildId,
        type: 0,
        name: "restricted",
        position: 0,
        parent_id: cfg.spaces.tbc.categoryId,
        permission_overwrites: [],
      },
    ],
    roles: [
      {
        id: kfcGuildId,
        name: "everyone",
        position: 0,
        permissions: "0",
        managed: false,
        mentionable: false,
      },
    ],
  };
  assert.deepEqual(await externalSessions(cfg, transport, inventory, [event], now), []);
  assert.equal(reads, 0);
  cfg.externalEditions[event.id] = "tbc";
  assert.deepEqual(await externalSessions(cfg, transport, inventory, [event], now), []);
  assert.equal(reads, 1);
});

test("Forum publication is idempotent, updates its own starter and reopens an archived future session", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      state = raidingStateSchema.parse({});
    const thread = {
      id: id(70),
      guild_id: kfcGuildId,
      parent_id: cfg.spaces.forever.forumId,
      owner_id: kfcApplicationId,
      name: "Initial",
      type: 11,
      applied_tags: [] as string[],
      thread_metadata: { archived: false, locked: false },
    };
    let message = {
      ...sessionPanel(session()),
      id: thread.id,
      channel_id: thread.id,
      author: { id: kfcApplicationId, bot: true },
    };
    let creates = 0,
      reopened = 0;
    const transport = client(async (route, method = "GET", body): Promise<unknown> => {
      if (method === "POST") {
        creates++;
        return thread;
      }
      if (route.endsWith(`/messages/${thread.id}`)) {
        if (method === "PATCH")
          message = {
            ...(body as MessagePayload),
            id: thread.id,
            channel_id: thread.id,
            author: message.author,
          };
        return message;
      }
      if (route === `/channels/${thread.id}`) {
        if (method === "PATCH") {
          const patch = body as {
            name?: string;
            archived?: boolean;
            applied_tags?: string[];
          };
          if (patch.name) thread.name = patch.name;
          if (patch.applied_tags) thread.applied_tags = patch.applied_tags;
          if (patch.archived !== undefined) {
            thread.thread_metadata.archived = patch.archived;
            if (!patch.archived) reopened++;
          }
        }
        return thread;
      }
      throw new Error(`Unexpected request ${route}`);
    });
    await deliverSession(session(), cfg, state, store, transport, now);
    await deliverSession(session(), cfg, state, store, transport, now);
    assert.equal(creates, 1);
    thread.thread_metadata.archived = true;
    await deliverSession(
      session({ confirmed: 8, status: "locked" }),
      cfg,
      state,
      store,
      transport,
      now,
    );
    assert.equal(reopened, 1);
    assert.equal(creates, 1);
    assert.ok(thread.applied_tags.includes(cfg.spaces.forever.tags["Signup closed"]));
    assert.match(
      message.embeds[0].fields!.find((field): boolean => field.name === "Signup")!.value,
      /8\/20/,
    );
    thread.thread_metadata.locked = true;
    await assert.rejects(
      deliverSession(session(), cfg, state, store, transport, now),
      /locked by a moderator/,
    );
    assert.equal(creates, 1);
  });
});

test("Deleted owned posts are not recreated", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const state = raidingStateSchema.parse({
      posts: { [session().key]: { status: "sent", threadId: id(70) } },
    });
    let creates = 0;
    const transport = client(async (_route, method = "GET"): Promise<unknown> => {
      if (method === "POST") creates++;
      throw new Error("HTTP 404");
    });
    await assert.rejects(deliverSession(session(), config(), state, store, transport, now), /404/);
    assert.equal(creates, 0);
  });
});

test("Canonical leveling events cannot become duplicate Raid-Helper listings", async (): Promise<void> => {
  const natives = scheduledEventBindings.flatMap((binding) =>
    binding.projections
      .filter((projection) => projection.guildId === kfcGuildId)
      .map((projection) => ({
        id: projection.scheduledId,
        guild_id: kfcGuildId,
        name: "Leveling",
        scheduled_start_time: "2026-11-05T07:30:00Z",
        scheduled_end_time: "2026-11-05T08:30:00Z",
        entity_type: 3,
        status: 1,
        entity_metadata: {
          location: `https://discord.com/channels/${kfcGuildId}/${id(80)}/${id(81)}`,
        },
      })),
  );
  assert.equal(natives.length, 2);
  const cfg = config();
  for (const native of natives) cfg.externalEditions[native.id] = "forever";
  const transport = client(async (): Promise<unknown> => {
    throw new Error("Must not read or duplicate this signup");
  });
  assert.deepEqual(
    await externalSessions(cfg, transport, { channels: [], roles: [] }, natives, now),
    [],
  );
});

test("A stale schedule explicitly directs people to verify the source", (): void => {
  const payload = schedulePanel("tbc", [], config(), now, new Date("2026-10-30T12:00:00Z"), true);
  assert.match(payload.embeds[0].description!, /Schedule refresh delayed/);
  assert.match(payload.embeds[0].footer!.text, /2026-10-30/);
});

test("Unsubscribed editions and cancelled raids never produce digests", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config();
    cfg.digestsEnabled = true;
    const state = raidingStateSchema.parse({});
    const transport = client(async (): Promise<unknown> => {
      throw new Error("No digest should be published");
    });
    await deliverDigests(
      [session()],
      cfg,
      state,
      store,
      transport,
      new Date("2026-11-01T17:30:00Z"),
    );
    state.subscriptions.forever[id(90)] = "assigned";
    await deliverDigests(
      [session({ status: "cancelled" })],
      cfg,
      state,
      store,
      transport,
      new Date("2026-11-01T17:30:00Z"),
    );
    assert.deepEqual(state.digests, {});
  });
});

test("Native event synchronization preserves manual edits and updates a bound schedule once", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      source = session();
    cfg.managedNativeEvents[source.key.slice("managed:".length)] = id(88);
    let native: Parameters<typeof nativeOwnedFields>[0] = {
      id: id(88),
      guild_id: kfcGuildId,
      entity_type: 3 as const,
      name: source.title,
      scheduled_start_time: source.startsAt,
      scheduled_end_time: source.endsAt!,
      status: 1,
    };
    const state = raidingStateSchema.parse({
      nativeChecksums: { [native.id]: checksum(nativeOwnedFields(native)) },
    });
    let writes = 0;
    const transport = client(async (route, method = "GET", body): Promise<unknown> => {
      if (method === "PATCH") {
        writes++;
        native = { ...native, ...(body as object) };
      }
      return route.endsWith("/scheduled-events") ? [native] : native;
    });
    const changed = { ...source, title: "Updated raid title" };
    await syncManagedNativeEvents([changed], cfg, state, store, transport, now);
    await syncManagedNativeEvents([changed], cfg, state, store, transport, now);
    assert.equal(writes, 1);
    native.name = "Moderator's edit";
    await syncManagedNativeEvents([changed], cfg, state, store, transport, now);
    assert.equal(writes, 1);
    assert.equal(native.name, "Moderator's edit");
  });
});

test("Unbound native event changes and background native event creation are rejected", async (): Promise<void> => {
  const cfg = config();
  const transport = raidingClient(cfg, "synthetic-credential-only", async (): Promise<Response> => {
    throw new Error("Must not fetch");
  });
  await assert.rejects(
    transport.request(`/guilds/${kfcGuildId}/scheduled-events/${id(88)}`, "PATCH", {
      name: "Changed",
    }),
    /outside approved scope/,
  );
  await assert.rejects(
    transport.request(`/guilds/${kfcGuildId}/scheduled-events`, "POST", {}),
    /outside approved scope/,
  );
});

test("Eight unchanged native Events reuse the cycle's batch without per-event HTTP reads", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      state = raidingStateSchema.parse({});
    const sessions = Array.from({ length: 8 }, (_, index): RaidSession =>
      session({
        key: `managed:cmv${String(index).padStart(22, "0")}`,
        title: `Raid ${index}`,
      }),
    );
    const native = sessions.map((source, index) => {
      const nativeId = id(100 + index);
      cfg.managedNativeEvents[source.key.slice("managed:".length)] = nativeId;
      return {
        id: nativeId,
        guild_id: kfcGuildId,
        entity_type: 3,
        name: source.title,
        scheduled_start_time: source.startsAt,
        scheduled_end_time: source.endsAt,
        status: 1,
      };
    });
    const transport = client(async (): Promise<unknown> => {
      throw new Error("Batch reuse must not send a request");
    });
    await syncManagedNativeEvents(sessions, cfg, state, store, transport, now, native);
    assert.equal(Object.keys(state.nativeChecksums).length, 8);
  });
});

test("Stable alert subscriptions require no per-member lookup or repeated role assignment", async (): Promise<void> => {
  await withStore(async (store): Promise<void> => {
    const cfg = config(),
      state = raidingStateSchema.parse({
        subscriptions: { forever: { [id(90)]: "assigned" }, tbc: {} },
      });
    const transport = client(async (route, method = "GET"): Promise<unknown> => {
      assert.equal(method, "GET");
      if (route.includes("/reactions/")) return [{ id: id(90), bot: false }];
      assert.ok(!route.includes("/members/"));
      return {
        id: cfg.spaces.forever.alerts.messageId,
        channel_id: cfg.spaces.forever.alerts.channelId,
        author: { id: kfcApplicationId, bot: true },
        content: "",
      };
    });
    await syncAlertSubscriptions("forever", cfg, state, store, transport);
    assert.equal(state.subscriptions.forever[id(90)], "assigned");
  });
});
