import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  rosterAnnouncementMessage,
  syncRosterAnnouncement,
  type RosterAnnouncement,
} from "../lib/raids/roster-announcements";
import {
  nativeMessageSchema,
  type NativeMessage,
} from "../lib/raids/native-contracts";
import type { RaidDiscordSettings } from "../lib/raids/discord-settings";
import type { RaidDiscordRequest } from "../lib/raids/discord-delivery";

const settings: RaidDiscordSettings = {
  applicationId: "1554796912673169428",
  guildId: "1411533815356194968",
  channelId: "1548747530790248610",
  token: "synthetic-test-only",
  origin: "https://example.test",
  visibility: "community",
};
function roster(): RosterAnnouncement {
  return {
    eventId: "cmuz20aal0000fu4s0vf3f2wx",
    title: "Leveling group",
    startsAt: new Date("2035-11-05T07:30Z"),
    deadline: new Date("2035-11-04T07:30Z"),
    signupClosed: true,
    cancelled: false,
    discordUrl: `https://discord.com/channels/${settings.guildId}/${settings.channelId}/1557777146854777023`,
    imageUrl: "https://example.test/images/raids/events/questing.webp",
    players: [
      {
        name: "Tank One",
        className: "Warrior",
        specialization: "Protection",
        state: "pending",
      },
      {
        name: "Healer One",
        className: "Priest",
        specialization: "Holy",
        state: "confirmed",
      },
      {
        name: "Damage One",
        className: "Rogue",
        specialization: "Combat",
        state: "declined",
      },
    ],
  };
}
function transport(): {
  request: RaidDiscordRequest;
  posts: NativeMessage[];
  edits: NativeMessage[];
  loseResponse: boolean;
} {
  const state = {
    posts: [] as NativeMessage[],
    edits: [] as NativeMessage[],
    loseResponse: false,
    request: null as unknown as RaidDiscordRequest,
  };
  const message = (body: NativeMessage): unknown => ({
    ...body,
    id: "1566700000000000001",
    channel_id: settings.channelId,
    author: { id: settings.applicationId },
  });
  state.request = async (route, method = "GET", body): Promise<unknown> => {
    if (route === `/channels/${settings.channelId}`)
      return { id: settings.channelId, guild_id: settings.guildId };
    if (method === "POST") {
      const parsed = nativeMessageSchema.parse(body);
      state.posts.push(parsed);
      if (state.loseResponse) {
        state.loseResponse = false;
        throw new Error("Lost successful response");
      }
      return message(parsed);
    }
    if (route.endsWith("?limit=100")) return state.posts.map(message);
    if (method === "PATCH") {
      const parsed = nativeMessageSchema.parse(body);
      state.edits.push(parsed);
      return message(parsed);
    }
    return message(state.edits.at(-1) ?? state.posts.at(-1)!);
  };
  return state;
}
async function temp(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "roster-announcement-test-"),
  );
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("public roster groups show actual replies without private explanations or pings", () => {
  const message = rosterAnnouncementMessage(roster(), settings.origin);
  const embed = message.embeds[0];
  const text = [
    embed.description,
    ...embed.fields!.map((field) => `${field.name}\n${field.value}`),
  ].join("\n");
  assert.match(text, /ROSTER READY/);
  assert.match(text, /🔒 Signups closed/);
  assert.match(text, /Waiting \(1\)/);
  assert.match(text, /Confirmed \(1\)/);
  assert.match(text, /Declined \(1\)/);
  assert.match(text, /Tank One/);
  assert.match(text, /Healer One/);
  assert.match(text, /Damage One/);
  assert.equal(message.allowed_mentions.parse.length, 0);
  assert.equal(embed.image?.url, roster().imageUrl);
  assert.equal(embed.fields!.length, 3);
  assert(embed.fields!.every((field) => field.inline));
  assert.match(embed.fields![0].value, /<:wr_priest_holy_/);
  assert.match(embed.title, /Leveling group/);
  assert(!embed.footer?.text.includes(roster().eventId));
  assert("url" in message.components[0].components[0]);
  assert.equal(message.components[0].components[0].url, roster().discordUrl);
  const manual = roster();
  manual.players[0].state = "manual";
  assert.match(
    JSON.stringify(
      rosterAnnouncementMessage(manual, settings.origin).embeds[0].fields,
    ),
    /verified by leader/,
  );
});

test("large escaped rosters stay in Discord limits and retain honest totals", () => {
  const value = roster();
  value.players = Array.from({ length: 50 }, (_, i) => ({
    ...value.players[0],
    name: `${i} @everyone **\\`.repeat(6),
  }));
  const message = rosterAnnouncementMessage(value, settings.origin);
  const embed = message.embeds[0];
  const text = JSON.stringify(embed);
  assert.ok(embed.description.length <= 4096);
  assert(embed.fields!.every((field) => field.value.length <= 1024));
  assert(
    embed.title.length +
      embed.description.length +
      embed.footer!.text.length +
      embed.fields!.reduce(
        (total, field) => total + field.name.length + field.value.length,
        0,
      ) <=
      6000,
  );
  assert.match(text, /Waiting \(50\)/);
  assert.match(text, /more players/);
  assert(!text.includes("@everyone"));
});

test("one announcement is created and later replies edit that message without reposting", async () =>
  temp(async (root) => {
    const state = transport(),
      value = roster();
    assert.equal(
      await syncRosterAnnouncement(value, settings, state.request, root),
      1,
    );
    assert.equal(
      await syncRosterAnnouncement(value, settings, state.request, root),
      0,
    );
    value.players[0].state = "confirmed";
    assert.equal(
      await syncRosterAnnouncement(value, settings, state.request, root),
      1,
    );
    assert.equal(state.posts.length, 1);
    assert.equal(state.edits.length, 1);
    assert.match(
      JSON.stringify(state.edits[0].embeds[0].fields),
      /Confirmed \(2\)/,
    );
  }));

test("old text cards migrate in place and rich cards retain their artwork and status fields", async () =>
  temp(async (root) => {
    const state = transport(),
      value = roster();
    await syncRosterAnnouncement(value, settings, state.request, root);
    delete state.posts[0].embeds[0].url;
    state.posts[0].embeds[0].footer = {
      text: `Roster confirmation ${value.eventId}`,
    };
    value.players[0].state = "confirmed";
    await syncRosterAnnouncement(value, settings, state.request, root);
    assert.equal(state.posts.length, 1);
    assert.equal(state.edits.length, 1);
    assert.equal(state.edits[0].embeds[0].image?.url, value.imageUrl);
    assert.equal(state.edits[0].embeds[0].fields?.length, 3);
  }));

test("rich message validation rejects oversized fields and total embed content", () => {
  const message = rosterAnnouncementMessage(roster(), settings.origin);
  assert(
    !nativeMessageSchema.safeParse({
      ...message,
      embeds: [
        {
          ...message.embeds[0],
          fields: [{ name: "Roster", value: "x".repeat(1025) }],
        },
      ],
    }).success,
  );
  assert(
    !nativeMessageSchema.safeParse({
      ...message,
      embeds: [
        {
          ...message.embeds[0],
          description: "x".repeat(4000),
          fields: Array.from({ length: 3 }, () => ({
            name: "Roster",
            value: "x".repeat(1000),
          })),
        },
      ],
    }).success,
  );
});

test("an uncertain successful send reconciles the existing card after restart", async () =>
  temp(async (root) => {
    const state = transport();
    state.loseResponse = true;
    await assert.rejects(
      syncRosterAnnouncement(roster(), settings, state.request, root),
      /Lost successful response/,
    );
    const file = path.join(
        root,
        `${roster().eventId}-${settings.channelId}.json`,
      ),
      saved = JSON.parse(await readFile(file, "utf8"));
    assert.equal(saved.status, "uncertain");
    await writeFile(file, JSON.stringify({ ...saved, retryAt: 0 }), {
      mode: 0o600,
    });
    await syncRosterAnnouncement(roster(), settings, state.request, root);
    assert.equal(state.posts.length, 1);
    assert.equal(state.edits.length, 1);
  }));

test("missing receipts after an uncertain send are held instead of duplicating a message", async () =>
  temp(async (root) => {
    const state = transport();
    state.loseResponse = true;
    await assert.rejects(
      syncRosterAnnouncement(roster(), settings, state.request, root),
    );
    const file = path.join(
        root,
        `${roster().eventId}-${settings.channelId}.json`,
      ),
      saved = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, JSON.stringify({ ...saved, retryAt: 0 }), {
      mode: 0o600,
    });
    const request: RaidDiscordRequest = async (
      route,
      method,
      body,
      attachment,
    ) =>
      route.endsWith("?limit=100")
        ? []
        : state.request(route, method, body, attachment);
    await assert.rejects(
      syncRosterAnnouncement(roster(), settings, request, root),
      /uncertain/,
    );
    assert.equal(state.posts.length, 1);
  }));

test("a foreign destination cannot receive the roster and cancellation creates no new card", async () =>
  temp(async (root) => {
    const state = transport();
    const request: RaidDiscordRequest = async () => ({
      id: settings.channelId,
      guild_id: "1554316932948172940",
    });
    await assert.rejects(
      syncRosterAnnouncement(roster(), settings, request, root),
      /channel mismatch/,
    );
    const value = roster();
    value.cancelled = true;
    assert.equal(
      await syncRosterAnnouncement(value, settings, state.request, root),
      0,
    );
    assert.equal(state.posts.length, 0);
  }));
