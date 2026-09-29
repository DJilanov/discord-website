import "../scripts/env";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { initialGuides } from "../content/guides";
import { editorialGuides, guideReadingPaths } from "../content/editorial";
import { artwork, coverChoices, getArtwork } from "../content/artwork";
import { canRefreshStarterGuide } from "../lib/editorial-publication";
import { guideSchema, settingsSchema } from "../lib/validation";
import { DEFAULT_SETTINGS } from "../lib/config";
import { trafficSource } from "../lib/analytics";
import {
  getDiscordPreview,
  resolveDiscordInvite,
  type DiscordPreview,
} from "../lib/discord";
import { conversionRate, sessionConversions } from "../lib/traffic-conversion";
import { db } from "../lib/db";

after(async (): Promise<void> => {
  await db.$disconnect();
});

test("all editorial guides, covers and reading paths are valid and distinct", async () => {
  assert.equal(editorialGuides.length, 6);
  const slugs = new Set(editorialGuides.map((guide) => guide.slug));
  assert.equal(slugs.size, 6);
  for (const guide of editorialGuides) {
    assert.ok(
      guideSchema.safeParse({
        ...guide,
        author: "WoW Forever Discord Team",
        published: true,
        metaTitle: guide.title,
        metaDescription: guide.excerpt,
      }).success,
    );
    assert.ok(guide.content.length > 3000);
    for (const slug of guideReadingPaths[guide.slug] || []) {
      assert.ok(slugs.has(slug));
      assert.notEqual(slug, guide.slug);
    }
  }
  for (const [src, asset] of Object.entries(artwork)) {
    assert.ok((await stat(`public${src}`)).isFile());
    assert.ok(asset.width > 0 && asset.height > 0 && asset.alt.length > 10);
  }
  const sample = { ...editorialGuides[0], author: "Team", published: true };
  for (const cover of coverChoices)
    assert.ok(
      guideSchema.safeParse({ ...sample, coverImage: cover.value }).success,
    );
  for (const cover of [
    "https://external.test/image.png",
    "/api/admin/evidence/id",
    "/images/discord-welcome.png",
    "__proto__",
  ])
    assert.equal(
      guideSchema.safeParse({ ...sample, coverImage: cover }).success,
      false,
    );
  assert.equal(getArtwork("__proto__"), undefined);
});

test("publisher preserves custom content, titles, excerpts and drafts", () => {
  for (const source of initialGuides) {
    const original = { ...source, published: true };
    assert.ok(canRefreshStarterGuide(original));
    assert.equal(
      canRefreshStarterGuide({
        ...original,
        content: source.content + "\nEditor addition.",
      }),
      false,
    );
    assert.equal(
      canRefreshStarterGuide({ ...original, title: source.title + " revised" }),
      false,
    );
    assert.equal(
      canRefreshStarterGuide({
        ...original,
        excerpt: source.excerpt + " revised",
      }),
      false,
    );
    assert.equal(
      canRefreshStarterGuide({ ...original, published: false }),
      false,
    );
  }
  const join = initialGuides.find(
    (guide) => guide.slug === "join-wow-forever-discord",
  )!;
  assert.ok(
    canRefreshStarterGuide({
      ...join,
      published: true,
      content: join.content.replace(
        "WoW Forever Discord is an independent fan project",
        "Forever Community Hub is an independent fan project",
      ),
    }),
  );
});

test("settings defaults stay backward compatible and reject injected verification tags", () => {
  const {
    googleVerification,
    bingVerification,
    discordOnboarding,
    discordOrganizers,
    ...legacy
  } = DEFAULT_SETTINGS;
  assert.equal(
    googleVerification +
      bingVerification +
      discordOnboarding +
      discordOrganizers,
    "",
  );
  assert.deepEqual(settingsSchema.parse(legacy), DEFAULT_SETTINGS);
  for (const field of ["googleVerification", "bingVerification"])
    assert.equal(
      settingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        [field]: '<meta content="unsafe">',
      }).success,
      false,
    );
});

test("invite selection agrees for valid, expired, missing, unknown and backup states", async () => {
  const primary = "https://discord.gg/primary",
    backup = "https://discord.gg/backup";
  const preview = (valid: boolean | null): DiscordPreview => ({
    name: "Community",
    serverId: valid ? "123" : null,
    members: null,
    online: null,
    valid,
  });
  for (const valid of [true, null]) {
    const result = await resolveDiscordInvite(primary, backup, async () =>
      preview(valid),
    );
    assert.equal(result?.invite, primary);
    assert.equal(result?.usedBackup, false);
  }
  const result = await resolveDiscordInvite(primary, backup, async (invite) =>
    preview(invite === backup),
  );
  assert.equal(result?.invite, backup);
  assert.equal(result?.usedBackup, true);
  assert.equal(
    await resolveDiscordInvite(primary, backup, async () => preview(false)),
    null,
  );
  assert.equal(
    (await resolveDiscordInvite("", backup, async () => preview(true)))?.invite,
    backup,
  );
  assert.equal(
    await resolveDiscordInvite("https://evil.test/invite", ""),
    null,
  );
  assert.equal(
    (await resolveDiscordInvite(primary, "", async () => null))?.preview.valid,
    null,
  );
});

test("Discord HTTP errors and malformed data do not falsely declare an expired invite", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [status, body, valid] of [
      [404, "{}", false],
      [429, "{}", null],
      [503, "{}", null],
      [200, "not JSON", null],
      [200, '{"guild":{"name":"Server"}}', null],
      [
        200,
        '{"guild":{"name":"Server","id":"123"},"approximate_member_count":42}',
        true,
      ],
    ] as const) {
      globalThis.fetch = async (): Promise<Response> =>
        new Response(body, { status });
      assert.equal(
        (await getDiscordPreview("https://discord.gg/example"))?.valid,
        valid,
      );
    }
    globalThis.fetch = async (): Promise<Response> => {
      throw new Error("Timeout");
    };
    assert.equal(
      (await getDiscordPreview("https://discord.gg/example"))?.valid,
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI attribution recognizes exact aliases, not similar domains or paid clicks", () => {
  for (const source of [
    "chatgpt.com",
    " ChatGPT ",
    "chat.openai.com",
    "perplexity.ai",
    "claude.ai",
  ])
    assert.equal(trafficSource("", "", source).source, "AI referral");
  assert.equal(
    trafficSource("", "", "chatgpt.com.evil.test").source,
    "Referral",
  );
  assert.equal(trafficSource("", "cpc", "chatgpt.com").source, "Paid");
  assert.equal(trafficSource("", "community", "kfc_discord").source, "Social");
});

test("conversion counts sessions once, uses entry source and excludes bots and anonymous clicks", async () => {
  assert.equal(new URL(process.env.DATABASE_URL || "").port, "55432");
  const key = randomUUID();
  const since = new Date("2099-01-01T00:00:00Z");
  const records = [
    ["a", "page_view", "/discord", "Organic search", false],
    ["a", "page_view", "/guides", "Direct", false],
    ["a", "discord_click", "/guides", "Direct", false],
    ["a", "discord_click", "/guides", "Direct", false],
    ["b", "page_view", "/discord", "Organic search", false],
    ["c", "page_view", "/guides", "AI referral", false],
    ["d", "page_view", "/discord", "Organic search", true],
    ["d", "discord_click", "/discord", "Organic search", true],
    [null, "discord_click", "/discord", "Organic search", false],
  ] as const;
  const ids = records.map(() => randomUUID());
  try {
    await db.foreverAnalyticsEvent.createMany({
      data: records.map(([session, event, path, source, bot], i) => ({
        id: ids[i],
        sessionId: session ? `${key}-${session}` : null,
        event,
        path,
        source,
        bot,
        ipHash: "isolated-test",
        device: "Desktop",
        createdAt: new Date(since.getTime() + i * 1000),
      })),
    });
    const result = await sessionConversions(since);
    assert.deepEqual(result.sources, [
      { label: "Organic search", sessions: 2, clicked: 1 },
      { label: "AI referral", sessions: 1, clicked: 0 },
    ]);
    assert.deepEqual(result.landingPages, [
      { label: "/discord", sessions: 2, clicked: 1 },
      { label: "/guides", sessions: 1, clicked: 0 },
    ]);
    assert.equal(conversionRate(2, 1), 50);
    assert.equal(conversionRate(0, 0), 0);
  } finally {
    await db.foreverAnalyticsEvent.deleteMany({ where: { id: { in: ids } } });
  }
});
