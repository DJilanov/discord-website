import "../scripts/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { discordEventPanel } from "../lib/raids/discord-panel";
import { eventTypes, eventTypeDefinitions } from "../lib/raids/event-types";
import {
  approveCommand,
  approveMessageCommand,
  parseDiscordPost,
} from "../lib/raids/approval";
import { raidDiscordRequest } from "../lib/raids/discord-delivery";
import type { EventView } from "../lib/raids/contracts";

test("Discord event panels cover every event type with bounded fields, no pings and honest website buttons", () => {
  const event: EventView = {
    id: "cmabcdefghijklmnopqrstuvw",
    game: "forever",
    realm: "",
    eventType: "raid",
    title: "Test event",
    raidName: "Test activity",
    region: "EU",
    faction: "Alliance",
    ruleset: "PvP",
    description: "@everyone **test**",
    startsAt: "2035-11-05T18:00:00.000Z",
    endsAt: "2035-11-05T21:00:00.000Z",
    signupClosesAt: "2035-11-05T17:45:00.000Z",
    reservesCloseAt: "2035-11-05T17:45:00.000Z",
    timeLabel: "Test time",
    signupCloseLabel: "Test",
    reservesCloseLabel: "Test",
    capacity: 100,
    roleCaps: { tank: 10, healer: 20, damage: 70 },
    admission: "automatic",
    status: "open",
    version: 2,
    reserveLimit: 0,
    allowDuplicates: false,
    hardReserves: [],
    catalog: null,
    signups: Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      character: {
        game: "forever",
        realm: "",
        name: "A".repeat(100),
        className: "Warrior",
        specialization: "Protection",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
      },
      role: i % 3 === 0 ? "tank" : i % 3 === 1 ? "healer" : "damage",
      status: i % 5 === 0 ? "pending" : i % 7 === 0 ? "bench" : "accepted",
      isMine: false,
      reserves: [],
    })),
    isOrganizer: true,
    locked: false,
    discordAvailable: false,
    discord: null,
  };
  const schema = z.object({
    allowed_mentions: z.object({ parse: z.array(z.never()) }),
    embeds: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        fields: z.array(
          z.object({ name: z.string(), value: z.string().max(1024) }),
        ),
        url: z.string().url(),
      }),
    ),
    components: z.array(
      z.object({
        components: z.array(
          z.object({
            type: z.literal(2),
            style: z.literal(5),
            url: z.string().url(),
            label: z.string(),
          }),
        ),
      }),
    ),
  });
  for (const type of eventTypes) {
    const panel = schema.parse(
      discordEventPanel(
        { ...event, eventType: type },
        "http://127.0.0.1:19300",
      ),
    );
    const embed = panel.embeds[0];
    assert.ok(!("footer" in embed));
    assert.ok(!("timestamp" in embed));
    assert.ok(
      embed.fields.some((field) =>
        field.value.includes(eventTypeDefinitions[type].label),
      ),
    );
    assert.equal(
      embed.fields.some((field) => field.name === "Loot"),
      type === "raid",
    );
    assert.equal(
      embed.fields.some((field) => field.name.startsWith("Tanks")),
      eventTypeDefinitions[type].combatRoles,
    );
    assert.ok(embed.fields.length <= 25);
    if (eventTypeDefinitions[type].combatRoles)
      assert.ok(embed.fields.some((field) => field.name.startsWith("Group 1")));
    assert.ok(
      embed.title.length +
        embed.description.length +
        embed.fields.reduce(
          (sum, field) => sum + field.name.length + field.value.length,
          0,
        ) <
        6000,
    );
  }
});
test("Administrator-only approval commands use explicit post targets and reject foreign links", () => {
  assert.equal(approveCommand.default_member_permissions, "0");
  assert.equal(approveMessageCommand.default_member_permissions, "0");
  assert.equal(approveMessageCommand.type, 3);
  const link =
    "https://discord.com/channels/1554316932948172940/1556000000000000011/1556000000000000012";
  assert.equal(parseDiscordPost(link).messageId, "1556000000000000012");
  for (const invalid of [
    link.replace("discord.com", "evil.example"),
    `${link}?test=1`,
    "1556000000000000012",
    "https://discord.com/channels/@me/123",
  ])
    assert.throws(() => parseDiscordPost(invalid));
});
test("Discord delivery transport rejects unrelated channels before any network request", async () => {
  const request = raidDiscordRequest({
    guildId: "1554316932948172940",
    applicationId: "1554796912673169428",
    channelId: "1556000000000000011",
    token: "synthetic",
    origin: "http://127.0.0.1:19300",
  });
  await assert.rejects(
    request("/channels/1556000000000000099/messages", "POST", {}),
    /out_of_scope/,
  );
  await assert.rejects(
    request("/guilds/1554316932948172940/roles", "PATCH", {}),
    /out_of_scope/,
  );
});

test("Discord cover uploads use bounded registered WebP files and replace edit attachments", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_input, init): Promise<Response> => {
    assert.ok(init?.body instanceof FormData);
    assert.equal(new Headers(init.headers).get("Content-Type"), null);
    const file = init.body.get("files[0]");
    assert.ok(file instanceof Blob);
    assert.equal(file.type, "image/webp");
    assert.ok(file.size > 100000 && file.size < 500000);
    const payload = z
      .object({
        allowed_mentions: z.object({ parse: z.array(z.never()) }),
        attachments: z.array(
          z.object({
            id: z.literal(0),
            filename: z.literal("event-cover.webp"),
            description: z.string(),
          }),
        ),
      })
      .parse(JSON.parse(String(init.body.get("payload_json"))));
    assert.equal(payload.attachments.length, 1);
    calls++;
    return Response.json({ id: "1556000000000000013" });
  };
  try {
    const request = raidDiscordRequest({
      guildId: "1556000000000000010",
      applicationId: "1556000000000000012",
      channelId: "1556000000000000011",
      token: "synthetic",
      origin: "http://127.0.0.1:19300",
    });
    const body = {
      allowed_mentions: { parse: [] },
      embeds: [{ image: { url: "attachment://event-cover.webp" } }],
    };
    const attachment = {
      file: "/images/raids/tbc/karazhan.webp",
      description: "Generated Karazhan fan art",
    };
    await request(
      "/channels/1556000000000000011/messages",
      "POST",
      body,
      attachment,
    );
    await request(
      "/channels/1556000000000000011/messages/1556000000000000013",
      "PATCH",
      body,
      attachment,
    );
    await assert.rejects(
      request("/channels/1556000000000000011/messages", "POST", body, {
        ...attachment,
        file: "/.env.local",
      }),
      /attachment_out_of_scope/,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
