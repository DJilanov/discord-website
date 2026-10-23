import "../../scripts/env";
import {
  test,
  expect,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { encode } from "next-auth/jwt";
import { mkdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { Pool } from "pg";
import { db } from "../../lib/db";
import { stageCatalog, reviewCatalog } from "../../lib/raids/catalog-store";
import {
  raidCatalogFixture,
  tbcRaidCatalogFixture,
} from "../fixtures/raid-catalog";
import { jsonChecksum } from "../../lib/raids/json";
import { pages } from "../../content/pages";
import { adminSections } from "../../lib/admin-nav";
import {
  classes,
  specializationsByClass,
} from "../../lib/raids/specializations";
import { eventTypes, eventTypeDefinitions } from "../../lib/raids/event-types";
import { raidHelperFixture } from "../fixtures/raid-helper";
import {
  toolGroupCreatePath,
  toolGroupDraftSchema,
  toolGroupEventType,
} from "../../lib/tool-group-draft";

test("ordinary member OAuth roundtrip preserves tool plans and never grants channel selection", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const drafts = z
    .array(toolGroupDraftSchema)
    .min(1)
    .max(6)
    .parse(
      process.env.FOREVER_RAIDS_E2E_TOOL_DRAFTS
        ? JSON.parse(
            readFileSync(process.env.FOREVER_RAIDS_E2E_TOOL_DRAFTS, "utf8"),
          )
        : [
            {
              version: 1,
              kind: "leveling",
              label: "Orc leveling",
              sourceUrl:
                "https://kfcguild.online/tools/forever/leveling/routes/horde-orc?plan=questing&class=warrior",
              faction: "Horde",
              capacity: 5,
            },
            {
              version: 1,
              kind: "leveling",
              label: "Hall of Thanes",
              sourceUrl:
                "https://kfcguild.online/tools/forever/leveling/routes/alliance-human/dungeons/thanes?chapter=chapter-126-14-16-darkshore&plan=alternative",
              faction: "Alliance",
              capacity: 3,
            },
          ],
    );
  const before = await db.foreverRaidEvent.count();
  await page.route("https://discord.com/**", async (route): Promise<void> => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Isolated Discord authorization fixture</title>",
    });
  });
  for (const draft of drafts) {
    await context.clearCookies();
    const path = toolGroupCreatePath(draft);
    await page.goto(path);
    await page
      .getByRole("button", { name: "Sign in with Discord", exact: true })
      .click();
    await expect(page).toHaveURL(
      /^https:\/\/discord\.com\/api\/oauth2\/authorize/,
    );
    const authorization = new URL(page.url());
    expect(authorization.searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    expect(authorization.searchParams.get("scope")).toBe("identify");
    const callback = new URL(authorization.searchParams.get("redirect_uri")!);
    expect(callback.origin).toBe(origin);
    callback.searchParams.set(
      "code",
      "synthetic-browser-member-authorization-code",
    );
    callback.searchParams.set(
      "state",
      authorization.searchParams.get("state")!,
    );
    callback.searchParams.set("iss", "https://discord.com");
    await page.goto(callback.href);
    await expect(page).toHaveURL(new URL(path, origin).href);
    await expect(
      page.getByRole("heading", { name: "Create event", exact: true }),
    ).toBeVisible();
    const session = z
      .object({ user: z.object({ id: z.string() }) })
      .parse(
        await (await page.request.get("/api/community/auth/session")).json(),
      );
    expect(session.user.id).toBe(memberIds[1]);
    expect((await page.request.get("/api/raids/channels")).status()).toBe(403);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 960 });
      await expect(
        page.getByRole("textbox", { name: "Title", exact: true }),
      ).toHaveValue(`${draft.label} group`);
      await expect(
        page.getByRole("combobox", { name: "Event type", exact: true }),
      ).toHaveValue(toolGroupEventType(draft));
      if (draft.faction)
        await expect(
          page.getByRole("combobox", { name: "Faction", exact: true }),
        ).toHaveValue(draft.faction);
      await expect(
        page.getByRole("spinbutton", { name: "Capacity", exact: true }),
      ).toHaveValue(String(draft.capacity ?? 5));
      await expect(
        page.getByRole("combobox", { name: "Admission", exact: true }),
      ).toHaveValue("open");
      expect(
        await page
          .getByRole("textbox", { name: "Details", exact: true })
          .inputValue(),
      ).toContain(draft.sourceUrl);
      await expect(
        page.getByRole("link", { name: "Open source plan", exact: true }),
      ).toHaveAttribute("href", draft.sourceUrl);
      await expect(
        page.getByRole("combobox", { name: "Region", exact: true }),
      ).toHaveValue("EU");
      await expect(
        page.getByRole("combobox", { name: "Character ruleset", exact: true }),
      ).toHaveValue("PvP");
      await expect(
        page.getByRole("spinbutton", {
          name: "Duration (minutes)",
          exact: true,
        }),
      ).toHaveValue("180");
      await expect(
        page.getByLabel("Discord channel", { exact: true }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/member-tool-oauth-${draft.faction?.toLowerCase() ?? "unknown"}-${toolGroupEventType(draft)}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(await db.foreverRaidEvent.count()).toBe(before);
});

test("tool plan prefill keeps native event creation and administrator-only channel choices", async ({
  page,
  context,
}) => {
  await signIn(context, 1);
  await page.goto(
    toolGroupCreatePath({
      version: 1,
      kind: "leveling",
      label: "Orc leveling",
      sourceUrl:
        "https://kfcguild.online/tools/forever/leveling/routes/horde-orc?plan=premade",
      faction: "Horde",
      capacity: 5,
    }),
  );
  await expect(
    page.getByRole("heading", { name: "Create event", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Event type", exact: true }),
  ).toHaveValue("questing");
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Orc leveling group");
  await expect(
    page.getByRole("combobox", { name: "Faction", exact: true }),
  ).toHaveValue("Horde");
  await expect(
    page.getByRole("combobox", { name: "Admission", exact: true }),
  ).toHaveValue("open");
  await expect(
    page.getByRole("textbox", { name: "Details", exact: true }),
  ).toHaveValue(/Our planning reference:/);
  await expect(
    page.getByRole("combobox", { name: "Discord channel", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open source plan", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://kfcguild.online/tools/forever/leveling/routes/horde-orc?plan=premade",
  );
  await expect(
    page.getByRole("combobox", { name: "Game edition", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Start blank", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Game edition", exact: true }),
  ).toBeEnabled();
  await page.goto(
    toolGroupCreatePath({
      version: 1,
      kind: "leveling",
      label: "Hall of Thanes",
      sourceUrl:
        "https://kfcguild.online/tools/forever/leveling/routes/alliance-human/dungeons/thanes?chapter=chapter-126-14-16-darkshore&plan=alternative",
      faction: "Alliance",
      capacity: 3,
    }),
  );
  await expect(
    page.getByRole("combobox", { name: "Event type", exact: true }),
  ).toHaveValue("dungeon");
  await expect(
    page.getByRole("combobox", { name: "Faction", exact: true }),
  ).toHaveValue("Alliance");
  await expect(
    page.getByRole("link", { name: "Open source plan", exact: true }),
  ).toHaveAttribute(
    "href",
    /chapter=chapter-126-14-16-darkshore&plan=alternative$/,
  );
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
  }
});

test("public event previews and calendar downloads exclude private and unapproved sessions", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.FOREVER_RAIDS_E2E_DISCORD !== "true",
    "Uses only the synthetic Discord destination configuration",
  );
  const startsAt = new Date(Date.now() + 86400000);
  const event = await db.foreverRaidEvent.create({
    data: {
      requestKey: randomUUID(),
      requestHash: "a".repeat(64),
      organizerId: memberIds[0],
      audience: discordIds,
      title: "Public group planning browser fixture",
      eventType: "questing",
      game: "forever",
      raidName: "Northshire",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      description: "A synthetic local group plan for preview verification.",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 7200000),
      signupClosesAt: startsAt,
      reservesCloseAt: startsAt,
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      admission: "open",
      reserveLimit: 0,
      allowDuplicates: false,
      hardReserves: [],
      discordPost: {
        create: {
          guildId: "1554316932948172940",
          channelId: "1556000000000000071",
          origin,
          visibility: "community",
          confirmedAt: new Date(),
          approvedAt: new Date(),
          approvedBy: discordIds[0],
          messageId: "1556000000000000098",
          status: "sent",
          desiredVersion: 1,
          deliveredVersion: 1,
        },
      },
    },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    expect((await page.goto(`/events/${event.id}`))?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: event.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign up with Discord", exact: true }),
    ).toHaveAttribute("href", `/raids/${event.id}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.wowforeverdiscord.online/events/${event.id}`,
    );
    await expect(
      page.locator('meta[property="og:image"]').first(),
    ).toHaveAttribute("content", /\/images\/raids\/events\/questing.webp$/);
    await expect(page.locator(".public-event-artwork")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir("artifacts/ecosystem-growth-20261022", { recursive: true });
    await page.screenshot({
      path: `artifacts/ecosystem-growth-20261022/event-${width}.png`,
      fullPage: true,
    });
  }
  const calendar = await request.get(`/events/${event.id}/calendar`);
  expect(calendar.status()).toBe(200);
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  expect(calendar.headers()["cache-control"]).toBe("private, no-store");
  expect(await calendar.text()).not.toContain("ATTENDEE:");
  await db.foreverRaidDiscordPost.update({
    where: { eventId: event.id },
    data: { visibility: "private" },
  });
  const privatePage = await request.get(`/events/${event.id}`);
  expect(privatePage.status()).toBe(404);
  expect(await privatePage.text()).not.toContain(event.title);
  expect((await request.get(`/events/${event.id}/calendar`)).status()).toBe(
    404,
  );
  await db.foreverRaidDiscordPost.update({
    where: { eventId: event.id },
    data: { visibility: "community", approvedAt: null, approvedBy: null },
  });
  expect((await request.get(`/events/${event.id}`)).status()).toBe(404);
  expect(errors).toEqual([]);
});

const origin = "http://127.0.0.1:19306",
  discordIds = [
    "1556000000000000061",
    "1556000000000000062",
    "1556000000000000064",
  ];
let catalogId: string;
let staffId: string, staffVersion: string;
const memberIds: string[] = [];
test.beforeEach(async () => {
  // Each browser case owns its rate-limit counters; the production limit stays intact.
  await db.foreverRateLimit.deleteMany({
    where: {
      key: {
        in: memberIds.flatMap((id) => [
          `raids:create:${id}`,
          `raids:channels:${id}`,
        ]),
      },
    },
  });
});
async function signIn(context: BrowserContext, index = 0): Promise<void> {
  const name = "forever-member.session-token";
  await context.addCookies([
    {
      name,
      value: await encode({
        secret: process.env.COMMUNITY_AUTH_SECRET!,
        salt: name,
        token: { sub: memberIds[index], memberVersion: 1 },
        maxAge: 3600,
      }),
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function signInStaff(
  context: BrowserContext,
  id = staffId,
  version = staffVersion,
): Promise<void> {
  const name = "authjs.session-token";
  await context.addCookies([
    {
      name,
      value: await encode({
        secret: process.env.AUTH_SECRET!,
        salt: name,
        token: { sub: id, userVersion: version },
        maxAge: 3600,
      }),
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function chooseArtwork(
  page: Page,
  group: string,
  value: string,
): Promise<void> {
  const characterDetails = page.locator(".raid-signup-character:not([open])");
  if (
    (group === "Character" || group === "Specialization") &&
    (await characterDetails.count())
  )
    await characterDetails.locator("summary").click();
  const picker = page.getByRole("group", { name: group, exact: true });
  await picker.getByText(value, { exact: true }).click();
  await expect(
    picker.getByRole("radio", { name: value, exact: true }),
  ).toBeChecked();
}
async function openEventManagement(page: Page): Promise<void> {
  const closed = page.locator(".raid-management:not([open])");
  if (await closed.count()) await closed.locator("summary").click();
}
async function smokeScreen(
  page: Page,
  label: string,
  screenshot = true,
): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  for (const width of [1440, 768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect
      .poll(() =>
        page
          .locator(
            ".raid-main .raid-choice-art img, .raid-main .raid-portrait img",
          )
          .evaluateAll((images) =>
            images.every((node) => {
              const image = node as HTMLImageElement;
              return (
                image.complete &&
                image.naturalWidth === 56 &&
                image.naturalHeight === 56
              );
            }),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${label} at ${width}px`,
    ).toBe(true);
    expect(
      await page
        .locator(".raid-reserve-character .raid-portrait")
        .evaluateAll((portraits) =>
          portraits.every(
            (portrait) => portrait.getBoundingClientRect().width === 40,
          ),
        ),
      `${label} portrait bounds at ${width}px`,
    ).toBe(true);
    await expect
      .poll(() =>
        page.locator(".raid-event-cover img").evaluateAll((nodes) =>
          nodes.every((node) => {
            const image = node as HTMLImageElement;
            return (
              image.complete &&
              image.naturalWidth >= 1280 &&
              image.naturalHeight > 700
            );
          }),
        ),
      )
      .toBe(true);
    if (width === 1440 || width === 360) {
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((violation) => ({
          id: violation.id,
          targets: violation.nodes.map((node) => node.target),
        })),
        `${label} at ${width}px`,
      ).toEqual([]);
      if (screenshot)
        await page.screenshot({
          path: `artifacts/smoke-${label.replace(/[^a-z0-9-]/gi, "-")}-${width}.png`,
          fullPage: true,
        });
    }
  }
}
test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    (process.env.FOREVER_RAIDS_ACCESS_MODE !== "members" &&
      !discordIds.every((id) =>
        process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS?.includes(id),
      )) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432"
  )
    throw new Error(
      "Use playwright.raids.config.ts and the isolated local database.",
    );
  for (const discordId of discordIds)
    memberIds.push(
      (
        await db.foreverMember.create({
          data: { discordId, displayName: "Synthetic local browser test" },
        })
      ).id,
    );
  catalogId = await stageCatalog(
    { ...raidCatalogFixture, sourcePatch: "browser-test-only" },
    "browser-test",
    db,
  );
  await reviewCatalog(
    catalogId,
    "browser-test",
    "published",
    "Synthetic local browser fixture only",
    db,
  );
  await mkdir("artifacts", { recursive: true });
  const staff = await db.foreverUser.create({
    data: {
      email: `raids-test-${randomUUID()}@example.invalid`,
      name: "Synthetic browser owner",
      role: "owner",
      passwordHash: await hash(randomBytes(32).toString("hex"), 12),
    },
  });
  staffId = staff.id;
  staffVersion = staff.updatedAt.toISOString();
});
test.afterAll(async () => {
  // Local-only fixture teardown. Production append-only protections remain unchanged.
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55432" ||
    !memberIds.length
  )
    return;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of ["ForeverRaidAudit", "ForeverRaidLootSnapshot"])
      await client.query(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
    for (const table of [
      "ForeverRaidAudit",
      "ForeverRaidLootSnapshot",
      "ForeverRaidSignup",
    ])
      await client.query(
        `DELETE FROM "${table}" WHERE "eventId" IN (SELECT "id" FROM "ForeverRaidEvent" WHERE "organizerId" = ANY($1::text[]))`,
        [memberIds],
      );
    await client.query(
      'DELETE FROM "ForeverRaidEvent" WHERE "organizerId" = ANY($1::text[])',
      [memberIds],
    );
    await client.query(
      'DELETE FROM "ForeverMember" WHERE "id" = ANY($1::text[])',
      [memberIds],
    );
    await client.query('DELETE FROM "ForeverRaidCatalog" WHERE "id" = $1', [
      catalogId,
    ]);
    await client.query(
      'DELETE FROM "ForeverAuditLog" WHERE "entityType" = \'raid_catalog\' AND "entityId" = $1',
      [catalogId],
    );
    await client.query(
      'DELETE FROM "ForeverAuditLog" WHERE "entityType" = \'raid_catalog\' AND "entityId" IN (SELECT "id" FROM "ForeverRaidCatalog" WHERE "stagedBy" = $1)',
      [staffId],
    );
    await client.query(
      'DELETE FROM "ForeverRaidCatalog" WHERE "stagedBy" = $1',
      [staffId],
    );
    await client.query('DELETE FROM "ForeverUser" WHERE "id" = $1', [staffId]);
    for (const table of ["ForeverRaidAudit", "ForeverRaidLootSnapshot"])
      await client.query(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    await db.$disconnect();
  }
});
test("Member beta admits non-allowlisted members and enforces fixed, confirmed posting without granting event or channel administration", async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    process.env.FOREVER_RAIDS_ACCESS_MODE !== "members",
    "Run the dedicated member beta configuration.",
  );
  test.setTimeout(180000);
  expect(process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS).not.toContain(
    discordIds[1],
  );
  await signIn(context, 1);
  await page.goto("/raids/new");
  await expect(
    page.getByRole("heading", { name: "Create event", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Discord channel", { exact: true })).toHaveCount(
    0,
  );
  expect((await page.request.get("/api/raids/channels")).status()).toBe(403);
  await page.getByLabel("Event type", { exact: true }).selectOption("social");
  await page.getByLabel("Title", { exact: true }).fill("Member beta gathering");
  await page
    .getByLabel("Activity / location", { exact: true })
    .fill("Stormwind gathering");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  await expect(
    page.getByText("Community / #event-beta", { exact: true }).first(),
  ).toBeVisible();
  const confirmation = page.getByLabel(
    /I confirm this event and its character roster/,
  );
  await expect(confirmation).toHaveAttribute("required", "");
  await smokeScreen(page, "member-beta-create");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/new$/);
  await confirmation.check();
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const id = page.url().split("/").pop()!;
  const record = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id },
    include: { discordPost: true },
  });
  expect(record.organizerId).toBe(memberIds[1]);
  expect(record.audience).toContain(discordIds[1]);
  expect(record.discordPost?.channelId).toBe("1556000000000000074");
  expect(record.discordPost?.visibility).toBe("community");
  expect(record.discordPost?.confirmedAt).not.toBeNull();
  await expect(
    page.getByRole("button", { name: "Edit event", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Change history" }),
  ).toBeVisible();
  const other = await browser.newContext();
  try {
    await signIn(other, 0);
    const viewer = await other.newPage();
    await viewer.goto(`/raids/${id}`);
    await expect(
      viewer.getByRole("heading", {
        name: "Member beta gathering",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: "Edit event", exact: true }),
    ).toHaveCount(0);
    expect(
      (await viewer.request.get(`/api/raids/${id}/history`)).status(),
    ).toBe(200);
    await smokeScreen(viewer, "member-beta-preview");
  } finally {
    await other.close();
  }
});

test("Private routes reject anonymous data and member cookies never grant admin access", async ({
  page,
  context,
}) => {
  const response = await page.request.get("/api/raids");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const channels = await page.request.get("/api/raids/channels");
  expect(channels.status()).toBe(401);
  expect(channels.headers()["cache-control"]).toContain("no-store");
  const anonymousUpdate = await page.request.patch(
    "/api/community/characters",
    {
      headers: { Origin: origin },
      data: { id: "not-owned", specialization: "Fury" },
    },
  );
  expect(anonymousUpdate.status()).toBe(401);
  const authResponse = await page.request.get("/api/community/auth/providers");
  expect(authResponse.status()).toBe(200);
  expect(authResponse.headers()["cache-control"]).toContain("no-store");
  expect(authResponse.headers()["referrer-policy"]).toBe("no-referrer");
  for (const path of [
    "/raids",
    "/raids/new",
    "/account/characters",
    "/raids/anonymous-smoke",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Sign in with Discord", exact: true }),
    ).toBeVisible();
  }
  await smokeScreen(page, "anonymous-access");
  await signIn(context);
  await page.goto("/admin/raids");
  await expect(page).toHaveURL(/\/login/);
  const crossOrigin = await page.request.post("/api/community/characters", {
    headers: { Origin: "https://untrusted.invalid" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const crossOriginUpdate = await page.request.patch(
    "/api/community/characters",
    {
      headers: { Origin: "https://untrusted.invalid" },
      data: {},
    },
  );
  expect(crossOriginUpdate.status()).toBe(403);
});
test("Discord sign-in keeps the requested destination and uses the member OAuth callback", async ({
  page,
  context,
}) => {
  await page.route("https://discord.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Intercepted Discord authorization</title>",
    });
  });
  await page.goto("/account/characters");
  await page
    .getByRole("button", { name: "Sign in with Discord", exact: true })
    .click();
  await expect(page).toHaveURL(
    /^https:\/\/discord\.com\/api\/oauth2\/authorize/,
  );
  const authorization = new URL(page.url());
  expect(authorization.searchParams.get("redirect_uri")).toBe(
    `${origin}/api/community/auth/callback/discord`,
  );
  expect(authorization.searchParams.get("scope")).toBe("identify");
  expect(authorization.searchParams.get("state")).toBeTruthy();
  expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
  const cookies = await context.cookies(origin);
  expect(
    decodeURIComponent(
      cookies.find((cookie) => cookie.name === "forever-member.callbackUrl")
        ?.value || "",
    ),
  ).toBe(`${origin}/account/characters`);
  expect(
    cookies.find((cookie) => cookie.name === "forever-member.state")?.httpOnly,
  ).toBe(true);
});
test("Discord callback preserves the authorized loopback origin and records a real member session", async ({
  page,
}) => {
  await page.route("https://discord.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Synthetic Discord authorization</title>",
    });
  });
  await page.goto("/raids/new");
  await page
    .getByRole("button", { name: "Sign in with Discord", exact: true })
    .click();
  await expect(page).toHaveURL(
    /^https:\/\/discord\.com\/api\/oauth2\/authorize/,
  );
  const authorization = new URL(page.url());
  expect(authorization.searchParams.get("redirect_uri")).toBe(
    `${origin}/api/community/auth/callback/discord`,
  );
  const callback = new URL(authorization.searchParams.get("redirect_uri")!);
  callback.searchParams.set("code", "synthetic-browser-authorization-code");
  callback.searchParams.set("state", authorization.searchParams.get("state")!);
  callback.searchParams.set("iss", "https://discord.com");
  await page.goto(callback.href);
  await expect(page).toHaveURL(`${origin}/raids/new`);
  await expect(
    page.getByRole("heading", { name: "Create event", exact: true }),
  ).toBeVisible();
  const response = await page.request.get("/api/community/auth/session");
  expect(response.status()).toBe(200);
  const session: { user: { id: string } } = await response.json();
  expect(session.user.id).toBe(memberIds[0]);
});
test("Invalid Discord callbacks return a private error redirect instead of HTTP 500", async ({
  page,
}) => {
  const response = await page.request.get(
    "/api/community/auth/callback/discord?code=synthetic-invalid-code&state=synthetic-invalid-state",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(302);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["location"]).toBe(
    `${origin}/raids?error=Configuration`,
  );
  await page.goto(response.headers()["location"]);
  await expect(page.locator('.raid-sign-in-error[role="alert"]')).toContainText(
    "Discord sign-in is temporarily unavailable",
  );
});
test("Non-member sessions see the join-server dialog and cannot access member APIs", async ({
  page,
  context,
}) => {
  await signIn(context, 2);
  await page.goto("/raids");
  const dialog = page.getByRole("dialog", {
    name: "Join one of our Discord servers",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /Join WoW Forever/ }),
  ).toHaveAttribute("href", /^https:\/\/discord\.(gg|com)\//);
  await expect(
    dialog.getByRole("link", { name: /Join KFC Guild/ }),
  ).toHaveAttribute("href", /^https:\/\/discord\.(gg|com)\//);
  await expect(page.locator(".raid-sign-in-error[role='alert']")).toContainText(
    "Join KFC Guild or WoW Forever Discord",
  );
  expect((await page.request.get("/api/raids")).status()).toBe(403);
  for (const width of [1440, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/raids-membership-${width}.png` });
  }
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(dialog).not.toBeVisible();
});
test("Owner can stage and review a source bundle; staff cookies do not grant member access", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signInStaff(context);
  await page.goto("/admin/raids");
  await page.getByLabel("Authorized source bundle").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json"),
  });
  await page
    .getByRole("button", { name: "Stage catalog", exact: true })
    .click();
  await expect(page.locator('.raid-notice[role="alert"]')).toHaveText(
    "The source bundle is not valid JSON.",
  );
  await page.getByLabel("Authorized source bundle").setInputFiles({
    name: "synthetic-catalog.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...raidCatalogFixture,
        raidName: "Synthetic admin catalog",
        sourcePatch: "admin-browser-test-only",
      }),
    ),
  });
  await page
    .getByRole("button", { name: "Stage catalog", exact: true })
    .click();
  const review = page.locator(".raid-catalog-review").filter({
    has: page.getByRole("heading", {
      name: "Synthetic admin catalog",
      exact: true,
    }),
  });
  await expect(review.getByText("staged", { exact: true })).toBeVisible();
  await review
    .getByLabel("Review evidence & decision")
    .fill("Reviewed synthetic fixture in isolated local test only");
  await review
    .getByRole("button", { name: "Publish reviewed catalog", exact: true })
    .click();
  await expect(review.getByText("published", { exact: true })).toBeVisible();
  await smokeScreen(page, "catalog-published");
  await page.goto("/account/characters");
  await expect(
    page.getByText("Discord sign-in required.", { exact: true }),
  ).toBeVisible();
});
test("Character validation, failed requests and retry work without losing form values", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context);
  await page.goto("/raids");
  await expect(
    page.getByRole("heading", { name: "No events yet" }),
  ).toBeVisible();
  await smokeScreen(page, "events-empty");
  await page.goto("/account/characters");
  await expect(page.getByText("No characters added.")).toBeVisible();
  const ruleset = page.getByLabel("Character ruleset", { exact: true });
  await expect(ruleset).toHaveValue("PvP");
  await ruleset.selectOption("PvE");
  await expect(ruleset).toHaveValue("PvE");
  await ruleset.selectOption("PvP");
  const name = page.getByLabel("Full character name", { exact: true });
  const spec = page.getByRole("group", { name: "Specialization", exact: true });
  await expect(spec.getByRole("radio", { checked: true })).toHaveCount(0);
  for (const className of classes) {
    await chooseArtwork(page, "Class", className);
    await expect(spec.getByRole("radio")).toHaveCount(3);
    expect(
      await spec
        .getByRole("radio")
        .evaluateAll((inputs) =>
          inputs.map((input) => input.getAttribute("aria-label")),
        ),
    ).toEqual([...specializationsByClass[className]]);
    await expect
      .poll(() =>
        spec
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (node) =>
                (node as HTMLImageElement).complete &&
                (node as HTMLImageElement).naturalWidth === 56,
            ),
          ),
      )
      .toBe(true);
  }
  await chooseArtwork(page, "Class", "Warrior");
  await chooseArtwork(page, "Specialization", "Fury");
  await chooseArtwork(page, "Class", "Priest");
  await expect(spec.getByRole("radio", { checked: true })).toHaveCount(0);
  await chooseArtwork(page, "Class", "Warrior");
  await spec.getByRole("radio", { name: "Arms", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    spec.getByRole("radio", { name: "Fury", exact: true }),
  ).toBeChecked();
  await name.fill("Invalid123");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(
    page.locator('#character-name-error[role="alert"]'),
  ).toContainText("first and last name");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await smokeScreen(page, "characters-invalid");
  const invalid = await page.request.post("/api/community/characters", {
    headers: { Origin: origin },
    data: {
      name: "Bad123",
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).not.toContain("pattern");
  await name.fill("  Tester   Fullname  ");
  await page
    .getByLabel("Character ruleset", { exact: true })
    .selectOption("PvP");
  await page.route("**/api/community/characters", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "Bad Gateway",
    });
  });
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.locator('.raid-notice[role="alert"]')).toHaveText(
    "The request failed. Try again.",
  );
  await expect(name).toHaveValue("  Tester   Fullname  ");
  await page.unroute("**/api/community/characters");
  await page.route("**/api/community/characters", async (route) => {
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.locator('.raid-notice[role="alert"]')).toContainText(
    "Check your connection",
  );
  await page.unroute("**/api/community/characters");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(
    page.getByText("Tester Fullname", { exact: true }),
  ).toBeVisible();
  await expect(name).toHaveValue("");
  await expect(spec.getByRole("radio", { checked: true })).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Edit specialization for Tester Fullname",
      exact: true,
    })
    .click();
  await chooseArtwork(
    page,
    "Default specialization for Tester Fullname",
    "Protection",
  );
  await smokeScreen(page, "character-editor-open");
  const heldPatch: { route: Route | null } = { route: null };
  await page.route("**/api/community/characters", async (route) => {
    if (route.request().method() === "PATCH") heldPatch.route = route;
    else await route.continue();
  });
  await page
    .getByRole("button", {
      name: "Save specialization for Tester Fullname",
      exact: true,
    })
    .click();
  await expect.poll(() => Boolean(heldPatch.route)).toBe(true);
  await expect(
    page.getByRole("button", {
      name: "Edit specialization for Tester Fullname",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Cancel editing Tester Fullname",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("group", {
        name: "Default specialization for Tester Fullname",
        exact: true,
      })
      .getByRole("radio", { name: "Protection", exact: true }),
  ).toBeDisabled();
  if (!heldPatch.route) throw new Error("Missing held test request");
  await heldPatch.route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Temporary test failure. Try again." }),
  });
  await expect(
    page.locator('.raid-character-editor [role="alert"]'),
  ).toContainText("Temporary test failure");
  await expect(
    page
      .getByRole("group", {
        name: "Default specialization for Tester Fullname",
        exact: true,
      })
      .getByRole("radio", { name: "Protection", exact: true }),
  ).toBeChecked();
  await page.unroute("**/api/community/characters");
  await page
    .getByRole("button", {
      name: "Save specialization for Tester Fullname",
      exact: true,
    })
    .click();
  await expect(page.getByText("Default saved.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Edit specialization for Tester Fullname",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page.locator(".raid-character-list")).toContainText(
    "Protection",
  );
  const saved = await page.request.get("/api/community/characters");
  const savedBody: { characters: { id: string; specialization: string }[] } =
    await saved.json();
  expect(savedBody.characters[0].specialization).toBe("Protection");
  const wrongSpec = await page.request.patch("/api/community/characters", {
    headers: { Origin: origin },
    data: { id: savedBody.characters[0].id, specialization: "Holy" },
  });
  expect(wrongSpec.status()).toBe(400);
  await chooseArtwork(page, "Specialization", "Arms");
  await name.fill("Tester Fullname");
  await page
    .getByLabel("Character ruleset", { exact: true })
    .selectOption("PvP");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.locator('.raid-notice[role="alert"]')).toContainText(
    "already exists",
  );
  const longestName = "A".repeat(40);
  await name.fill(longestName);
  await page.getByLabel("Region", { exact: true }).selectOption("OCE");
  await page.getByLabel("Faction", { exact: true }).selectOption("Horde");
  await page
    .getByLabel("Character ruleset", { exact: true })
    .selectOption("RP");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.getByText(longestName, { exact: true })).toBeVisible();
  await expect(ruleset).toHaveValue("PvP");
  await smokeScreen(page, "characters-populated");
  const firstEdit = page.getByRole("button", {
    name: `Edit specialization for ${longestName}`,
    exact: true,
  });
  await firstEdit.click();
  await chooseArtwork(
    page,
    `Default specialization for ${longestName}`,
    "Fury",
  );
  await page
    .getByRole("button", { name: `Cancel editing ${longestName}`, exact: true })
    .click();
  await expect(firstEdit).toBeFocused();
  await expect(
    page.getByRole("group", {
      name: `Default specialization for ${longestName}`,
      exact: true,
    }),
  ).toHaveCount(0);
});
test("Artwork fallback, required spec selection and reduced-motion controls stay usable", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.route("**/ability_warrior_innerrage.jpg", (route) =>
    route.abort("failed"),
  );
  await page.goto("/account/characters");
  const spec = page.getByRole("group", { name: "Specialization", exact: true });
  const furyArt = spec
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: "Fury", exact: true }) })
    .locator("img");
  await expect
    .poll(() =>
      furyArt.evaluate(
        (image) => new URL((image as HTMLImageElement).src).pathname,
      ),
    )
    .toBe("/images/raids/icons/classicon_warrior.jpg");
  await chooseArtwork(page, "Specialization", "Fury");
  await page.unroute("**/ability_warrior_innerrage.jpg");
  await chooseArtwork(page, "Class", "Priest");
  await page
    .getByLabel("Full character name", { exact: true })
    .fill("Required Test");
  let submitted = false;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/community/characters") &&
      request.method() === "POST"
    )
      submitted = true;
  });
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  expect(
    await spec
      .getByRole("radio", { name: "Discipline", exact: true })
      .evaluate((input) => (input as HTMLInputElement).validity.valueMissing),
  ).toBe(true);
  expect(submitted).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const classPicker = page.getByRole("group", { name: "Class", exact: true });
  const mageTile = classPicker
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: "Mage", exact: true }) });
  await mageTile.locator("img").click();
  await expect(
    classPicker.getByRole("radio", { name: "Mage", exact: true }),
  ).toBeChecked();
  await mageTile.hover();
  expect(
    await mageTile
      .locator(".raid-choice-face")
      .evaluate((tile) => getComputedStyle(tile).transitionDuration),
  ).toBe("0s");
  expect(
    await mageTile
      .locator(".raid-choice-face")
      .evaluate((tile) => getComputedStyle(tile).transform),
  ).toBe("none");
  await smokeScreen(page, "mage-picker");
  await chooseArtwork(page, "Class", "Hunter");
  await chooseArtwork(page, "Specialization", "Marksmanship");
  await smokeScreen(page, "hunter-picker");
  await chooseArtwork(page, "Class", "Warrior");
  await expect
    .poll(() =>
      furyArt.evaluate(
        (image) => new URL((image as HTMLImageElement).src).pathname,
      ),
    )
    .toBe("/images/raids/icons/ability_warrior_innerrage.jpg");
});
test("Event preview keeps party availability accurate and signup reachable on mobile", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, 1);
  await page.goto("/account/characters");
  await page
    .getByLabel("Full character name", { exact: true })
    .fill("Preview Guardian");
  await chooseArtwork(page, "Specialization", "Protection");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(
    page.getByText("Preview Guardian", { exact: true }),
  ).toBeVisible();
  await page.goto("/raids/new");
  if (process.env.FOREVER_RAIDS_E2E_DISCORD === "true") {
    await expect(
      page.getByLabel("Discord channel", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Find a channel", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".raid-default-destination")).toContainText(
      "Private raid-manager test",
    );
    expect((await page.request.get("/api/raids/channels")).status()).toBe(403);
  }
  await page.getByLabel("Event type", { exact: true }).selectOption("questing");
  await page
    .getByLabel("Title", { exact: true })
    .fill(
      "A long Forever questing event title for our first community group power leveling adventure",
    );
  await page
    .getByLabel("Quest / zone", { exact: true })
    .fill(
      "Elwynn Forest + Westfall + Dun Morogh + Deadmines + Redridge + return quests",
    );
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T08:30");
  await page.getByLabel("Admission", { exact: true }).selectOption("approval");
  const submitted = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/raids",
  );
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const submittedInput = z
    .record(z.string(), z.unknown())
    .parse((await submitted).postDataJSON());
  if (process.env.FOREVER_RAIDS_E2E_DISCORD === "true") {
    for (const channelId of [
      "1556000000000000071",
      "1556000000000000072",
      "1556000000000000073",
    ]) {
      const forged = await page.request.post("/api/raids", {
        headers: { Origin: origin },
        data: {
          ...submittedInput,
          requestKey: randomUUID(),
          discordChannelId: channelId,
          confirmDiscordPublication: true,
        },
      });
      expect(forged.status()).toBe(403);
    }
    const createdId = new URL(page.url()).pathname.split("/").pop()!;
    const published = await db.foreverRaidDiscordPost.findUniqueOrThrow({
      where: { eventId: createdId },
    });
    expect(published.channelId).toBe("1556000000000000071");
  }
  await expect(page.locator(".raid-summary")).toContainText(
    "0 confirmed · 0 pending",
  );
  const rosterBuilder = page
    .locator(".raid-event-actions")
    .getByRole("link", { name: "Roster builder", exact: true });
  await expect(rosterBuilder).toHaveAttribute("href", "#event-roster");
  await rosterBuilder.click();
  await expect(
    page.getByRole("heading", { name: "Roster builder", exact: true }),
  ).toBeInViewport();
  await expect(page.locator(".raid-party-empty")).toHaveCount(5);
  await expect(page.locator(".raid-signup-character")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(".raid-management")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.getByRole("heading", { name: "Soft reserves", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(page.locator(".raid-roster li")).toHaveCount(0);
  await page.getByLabel(/I accept this event/).check();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Pending signups" }),
  ).toContainText("Preview Guardian (you)");
  await expect(page.locator(".raid-summary")).toContainText(
    "0 confirmed · 1 pending",
  );
  await expect(page.locator(".raid-party-empty")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Accept Preview Guardian", exact: true })
    .click();
  await expect(page.locator(".raid-summary")).toContainText(
    "1 confirmed · 0 pending",
  );
  await expect(page.locator(".raid-party-empty")).toHaveCount(4);
  await expect(
    page.getByRole("region", { name: "Pending signups" }),
  ).toHaveCount(0);
  await smokeScreen(page, "event-preview-party");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileAction = page.locator(".raid-mobile-signup");
  await expect(mobileAction).toBeVisible();
  await mobileAction
    .getByRole("link", { name: "View signup", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "My signup" });
  await expect(panel).toBeFocused();
  await expect
    .poll(async () => {
      const panelBox = await panel.boundingBox();
      const actionBox = await mobileAction.boundingBox();
      return Boolean(
        panelBox &&
        actionBox &&
        panelBox.y >= 0 &&
        panelBox.y + panelBox.height <= actionBox.y,
      );
    })
    .toBe(true);
  await chooseArtwork(page, "Specialization", "Fury");
  await expect(
    page
      .getByRole("group", { name: "Role", exact: true })
      .getByRole("radio", { name: "Damage", exact: true }),
  ).toBeChecked();
  await page.getByLabel(/I accept this event/).check();
  await page
    .getByRole("button", { name: "Update signup", exact: true })
    .click();
  await expect(page.locator(".raid-visual-roster")).toContainText("Fury");
  await openEventManagement(page);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Lock roster", exact: true }).click();
  await expect(
    page.getByText("Signups closed.", { exact: true }),
  ).toBeVisible();
  await expect(mobileAction.getByRole("link")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Update signup", exact: true }),
  ).toHaveCount(0);
  await smokeScreen(page, "event-preview-locked");
});
test("Planning, region times, approval, withdrawal and cancellation screens", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context);
  await page.goto("/raids/new");
  await expect(
    page.getByLabel("Character ruleset", { exact: true }),
  ).toHaveValue("PvP");
  await smokeScreen(page, "event-create");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Future Forever planning smoke");
  await page.getByLabel("Forever raid name").fill("Future planning raid");
  for (const [region, timezone] of [
    ["EU", "Central European"],
    ["OCE", "Sydney"],
    ["NA", "New York"],
  ]) {
    await page.getByLabel("Region", { exact: true }).selectOption(region);
    await expect(page.getByLabel(`Starts (${timezone} time)`)).toBeVisible();
  }
  await page.getByLabel("Faction", { exact: true }).selectOption("Horde");
  await page
    .getByLabel("Character ruleset", { exact: true })
    .selectOption("RP");
  await page.getByLabel(/Starts \(New York/).fill("2035-11-05T19:00");
  await page.getByLabel("Admission", { exact: true }).selectOption("approval");
  await page.getByLabel("Capacity", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.locator('.raid-notice[role="alert"]')).toContainText(
    "A role limit cannot exceed total capacity.",
  );
  await page.getByLabel("Tanks", { exact: true }).fill("0");
  await page.getByLabel("Healers", { exact: true }).fill("0");
  await page.getByLabel("Damage", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const eventId = page.url().split("/").pop()!;
  await expect(
    page.getByRole("link", { name: "Add a matching character" }),
  ).toBeVisible();
  await expect(
    page.getByText("Soft reserves disabled for this event."),
  ).toBeVisible();
  await expect(page.locator(".raid-summary")).toContainText("America/New_York");
  await smokeScreen(page, "event-no-matching-character");
  await page.getByRole("link", { name: "Add a matching character" }).click();
  await page.getByLabel("Full character name").fill("Future Planner");
  await chooseArtwork(page, "Specialization", "Fury");
  await page.getByLabel("Region", { exact: true }).selectOption("NA");
  await page.getByLabel("Faction", { exact: true }).selectOption("Horde");
  await page
    .getByLabel("Character ruleset", { exact: true })
    .selectOption("RP");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.getByText("Future Planner", { exact: true })).toBeVisible();
  await page.goto(`/raids/${eventId}`);
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(page.locator(".raid-roster li")).toHaveCount(0);
  await page.getByLabel(/I accept this event/).check();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(page.locator(".raid-roster .raid-badge")).toHaveText(
    "Awaiting approval",
  );
  await smokeScreen(page, "event-pending");
  await page
    .getByRole("button", { name: "Accept Future Planner", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "Group 1" })).toContainText(
    "Future Planner",
  );
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(
    page.getByText("Signup withdrawn.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".raid-roster li")).toHaveCount(0);
  await page.reload();
  await page.getByLabel(/I accept this event/).check();
  await expect(page.getByLabel(/I accept this event/)).toBeChecked();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Pending signups" }),
  ).toContainText("Future Planner");
  await openEventManagement(page);
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  await page
    .getByLabel("Cancellation reason")
    .fill("Rescheduling the synthetic local fixture");
  await page
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await expect(page.locator(".raid-heading .raid-badge")).toHaveText(
    "cancelled",
  );
  await expect(
    page.getByText("Signups closed.", { exact: true }),
  ).toBeVisible();
  await smokeScreen(page, "event-cancelled");
  await page.goto("/raids");
  await expect(
    page.getByRole("heading", { name: "Future Forever planning smoke" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "All events", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Future Forever planning smoke" }),
  ).toBeVisible();
  await smokeScreen(page, "events-populated");
  expect(
    (await page.request.get("/api/raids/nonexistent-smoke-event")).status(),
  ).toBe(404);
  await page.goto("/raids/nonexistent-smoke-event");
  await expect(
    page.getByRole("heading", { name: "This page isn't here." }),
  ).toBeVisible();
});
test("All seven event variants create, display and accept the right kind of signup", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context);
  await page.goto("/account/characters");
  await page
    .getByLabel("Full character name", { exact: true })
    .fill("Variant Hero");
  await chooseArtwork(page, "Specialization", "Fury");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.getByText("Variant Hero", { exact: true })).toBeVisible();
  for (const eventType of eventTypes) {
    const definition = eventTypeDefinitions[eventType];
    await page.goto("/raids/new");
    await page
      .getByLabel("Event type", { exact: true })
      .selectOption(eventType);
    await expect(page.getByLabel("Capacity", { exact: true })).toHaveValue(
      String(definition.capacity),
    );
    await expect(
      page.getByLabel("Character ruleset", { exact: true }),
    ).toHaveValue("PvP");
    if (definition.combatRoles) {
      await expect(page.getByLabel("Tanks", { exact: true })).toHaveValue(
        String(definition.roleCaps.tank),
      );
      await expect(page.getByLabel("Healers", { exact: true })).toHaveValue(
        String(definition.roleCaps.healer),
      );
      await expect(page.getByLabel("Damage", { exact: true })).toHaveValue(
        String(definition.roleCaps.damage),
      );
    } else {
      await expect(page.getByLabel("Tanks", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Healers", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Damage", { exact: true })).toHaveCount(0);
    }
    await expect(page.getByLabel("Loot catalog", { exact: true })).toHaveCount(
      eventType === "raid" ? 1 : 0,
    );
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Synthetic ${definition.label} event`);
    await page
      .getByLabel(definition.targetLabel, { exact: true })
      .fill(`Synthetic ${definition.label} activity`);
    await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
    await smokeScreen(page, `create-${eventType}`);
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
    const eventId = page.url().split("/").pop()!;
    await expect(page.locator(".raid-heading")).toContainText(definition.label);
    await chooseArtwork(page, "Character", "Variant Hero");
    if (definition.combatRoles) {
      await chooseArtwork(page, "Specialization", "Fury");
      await chooseArtwork(page, "Role", "Damage");
    } else {
      await expect(
        page.getByRole("group", { name: "Specialization", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("group", { name: "Role", exact: true }),
      ).toHaveCount(0);
    }
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Join roster", exact: true })
      .click();
    if (definition.combatRoles)
      await expect(page.getByRole("region", { name: "Group 1" })).toContainText(
        "Variant Hero",
      );
    else
      await expect(page.locator(".raid-roster .raid-badge")).toHaveText(
        "Confirmed",
      );
    await expect(page.locator(".raid-role-counts")).toHaveCount(
      definition.combatRoles ? 1 : 0,
    );
    await expect(
      page.getByRole("heading", { name: "Soft reserves", exact: true }),
    ).toHaveCount(eventType === "raid" ? 1 : 0);
    const saved: { event: { eventType: string; signups: { role: string }[] } } =
      await (await page.request.get(`/api/raids/${eventId}`)).json();
    expect(saved.event.eventType).toBe(eventType);
    expect(saved.event.signups[0].role).toBe(
      definition.combatRoles ? "damage" : "participant",
    );
    if (eventType === "social") {
      await expect(page.locator(".raid-role-label")).toHaveText("Participant");
      page.once("dialog", (dialog) => void dialog.accept());
      await openEventManagement(page);
      await page
        .getByRole("button", { name: "Lock roster", exact: true })
        .click();
      await expect(page.locator(".raid-heading .raid-badge")).toHaveText(
        "locked",
      );
      const exported: {
        payload: {
          schema: string;
          eventType: string;
          roster: { role: string }[];
        };
      } = await (await page.request.get(`/api/raids/${eventId}/export`)).json();
      expect(exported.payload.schema).toBe("forever-event-roster.v2");
      expect(exported.payload.eventType).toBe("social");
      expect(exported.payload.roster[0].role).toBe("participant");
    }
    await smokeScreen(page, `detail-${eventType}`);
  }
  await page.goto("/raids");
  for (const eventType of eventTypes) {
    await page
      .getByLabel("Event type", { exact: true })
      .selectOption(eventType);
    await expect(
      page.getByRole("heading", {
        name: `Synthetic ${eventTypeDefinitions[eventType].label} event`,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.locator(".raid-event-row .muted").allTextContents(),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(eventTypeDefinitions[eventType].label),
      ]),
    );
  }
  await page.getByLabel("Event type", { exact: true }).selectOption("all");
  await smokeScreen(page, "event-types-list");
});
test("Discord delivery status and post links render on desktop and mobile without sending messages", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/raids/new");
  await page.getByLabel("Event type", { exact: true }).selectOption("questing");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Synthetic Discord delivery view");
  await page.getByLabel("Quest / zone", { exact: true }).fill("Test quest");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const id = page.url().split("/").pop()!;
  const event = await db.foreverRaidEvent.findUniqueOrThrow({ where: { id } });
  await db.foreverRaidDiscordPost.upsert({
    where: { eventId: id },
    update: {
      guildId: "1554316932948172940",
      channelId: "1556000000000000080",
      origin,
      status: "pending",
      desiredVersion: event.version,
    },
    create: {
      eventId: id,
      guildId: "1554316932948172940",
      channelId: "1556000000000000080",
      origin,
      status: "pending",
      desiredVersion: event.version,
    },
  });
  await page.reload();
  const section = page.getByRole("region", { name: "Discord publication" });
  await expect(section).toContainText(
    "pending · Sync pending · Pending website approval",
  );
  await smokeScreen(page, "event-discord-pending");
  await db.foreverRaidDiscordPost.update({
    where: { eventId: id },
    data: {
      status: "sent",
      messageId: "1556000000000000081",
      deliveredVersion: event.version,
    },
  });
  await page.reload();
  await expect(section).toContainText("sent · Roster synced");
  await expect(
    section.getByRole("link", { name: "Open Discord post" }),
  ).toHaveAttribute(
    "href",
    "https://discord.com/channels/1554316932948172940/1556000000000000080/1556000000000000081",
  );
  await smokeScreen(page, "event-discord-sent");
});
test("Every public page and published guide renders on desktop, tablet and mobile", async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  const guides = await db.foreverGuide.findMany({
    where: { published: true },
    select: { slug: true },
  });
  const guilds = await db.foreverGuild.findMany({
    where: { status: "approved" },
    select: { slug: true },
  });
  const paths = [
    ...new Set([
      "/",
      "/discord",
      "/guild-recruitment",
      "/guild-recruitment/new",
      "/lfg",
      "/lfg/new",
      "/guides",
      "/reports",
      "/reports/new",
      "/reports/status",
      "/appeals",
      "/addons",
      "/addons/wow-trader",
      "/addons/foreverguard",
      "/addons/foreverguard/changelog",
      "/transparency",
      "/contribute",
      "/faq",
      "/login",
      "/bot/shared-channels",
      "/bot/terms",
      "/bot/privacy",
      ...Object.keys(pages).map((key) => `/${key}`),
      ...guides.map((guide) => `/guides/${guide.slug}`),
      ...guilds.map((guild) => `/guilds/${guild.slug}`),
    ]),
  ];
  for (const path of paths) {
    await test.step(path, async () => {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      expect(
        await page.locator("img").evaluateAll(async (elements) => {
          const images = elements.filter(
            (element): element is HTMLImageElement =>
              element instanceof HTMLImageElement,
          );
          for (const image of images) {
            image.scrollIntoView({ block: "center", behavior: "instant" });
            await image.decode().catch(() => undefined);
          }
          window.scrollTo({ top: 0, behavior: "instant" });
          return images
            .filter((image) => !image.complete || !image.naturalWidth)
            .map((image) => image.getAttribute("src"));
        }),
        path,
      ).toEqual([]);
      await smokeScreen(page, `public${path}`);
      expect(errors, path).toEqual([]);
    });
  }
});
test("Every admin section and editor screen renders without changing live settings", async ({
  page,
  context,
}) => {
  test.setTimeout(600000);
  await signInStaff(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  const guide = await db.foreverGuide.findFirst({ select: { id: true } });
  for (const path of [
    ...adminSections.map((section) => section.path),
    "/admin/guides?edit=new",
    "/admin/staff?edit=new",
    "/admin/addons?edit=new",
    ...(guide ? [`/admin/guides?edit=${guide.id}`] : []),
  ]) {
    await test.step(path.split("?")[0], async () => {
      const response = await page.goto(path);
      expect(response?.status(), path.split("?")[0]).toBe(200);
      await smokeScreen(page, `admin${path.split("?")[0]}`, false);
      expect(errors, path.split("?")[0]).toEqual([]);
    });
  }
});
test("Moderator catalog access is read-only and member revocation requires a fresh login", async ({
  page,
  context,
}) => {
  const moderator = await db.foreverUser.create({
    data: {
      email: `raids-moderator-${randomUUID()}@example.invalid`,
      name: "Synthetic moderator",
      role: "moderator",
      passwordHash: await hash(randomBytes(32).toString("hex"), 12),
    },
  });
  try {
    await signInStaff(context, moderator.id, moderator.updatedAt.toISOString());
    await page.goto("/admin/raids");
    await expect(
      page.getByRole("heading", { name: "Forever & TBC raid catalogs" }),
    ).toBeVisible();
    await expect(page.getByLabel("Authorized source bundle")).toHaveCount(0);
    const denied = await page.request.post("/api/admin/raids/catalog", {
      headers: { Origin: origin },
      data: { operation: "stage", bundle: raidCatalogFixture },
    });
    expect(denied.status()).toBe(403);
    await context.clearCookies();
    await signIn(context);
    await db.foreverMember.update({
      where: { id: memberIds[0] },
      data: { sessionVersion: 2 },
    });
    await page.goto("/account/characters");
    await expect(
      page.getByRole("button", { name: "Sign in with Discord", exact: true }),
    ).toBeVisible();
    expect((await page.request.get("/api/community/characters")).status()).toBe(
      401,
    );
  } finally {
    await db.foreverMember.update({
      where: { id: memberIds[0] },
      data: { sessionVersion: 1 },
    });
    await db.foreverUser.delete({ where: { id: moderator.id } });
  }
  await signIn(context);
  await page.goto("/raids");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in with Discord", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/raids")).status()).toBe(401);
});
test("TBC realm-aware characters, raid presets and private channel selection work on desktop and mobile", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context);
  await page.goto("/account/characters");
  await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
  await page.getByLabel("Character name", { exact: true }).fill("Tbctester");
  await page.getByLabel("Realm", { exact: true }).fill("Spineshatter");
  await chooseArtwork(page, "Specialization", "Fury");
  await smokeScreen(page, "tbc-character-form");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(page.getByText("Tbctester", { exact: true })).toBeVisible();
  await page.goto("/raids/new");
  await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
  await expect(
    page.getByLabel("Loot catalog", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page
    .getByLabel("Raid preset", { exact: true })
    .selectOption("Black Temple");
  await expect(page.getByLabel("Capacity", { exact: true })).toHaveValue("25");
  await page
    .getByLabel("Raid preset", { exact: true })
    .selectOption("Karazhan");
  await expect(page.getByLabel("Capacity", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Tanks", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Healers", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Damage", { exact: true })).toHaveValue("6");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Private TBC Karazhan experiment");
  await page.getByLabel("Realm", { exact: true }).fill("Spineshatter");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  const deliveryEnabled = process.env.FOREVER_RAIDS_E2E_DISCORD === "true";
  if (deliveryEnabled)
    await page
      .getByLabel("Discord channel", { exact: true })
      .selectOption("1556000000000000072");
  await smokeScreen(page, "tbc-create-event");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const id = page.url().split("/").pop()!;
  await expect(page.locator(".raid-heading")).toContainText("TBC Classic");
  await expect(page.locator(".raid-heading")).toContainText("spineshatter");
  await page.getByLabel(/I accept this event/).check();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(page.locator(".raid-visual-roster")).toContainText("Tbctester");
  await smokeScreen(page, "tbc-event-roster");
  const record = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id },
    include: { discordPost: true },
  });
  expect(record.game).toBe("tbc");
  expect(record.realm).toBe("spineshatter");
  if (deliveryEnabled)
    expect(record.discordPost?.channelId).toBe("1556000000000000072");
  await page.goto("/raids");
  await page
    .getByLabel("Game edition", { exact: true })
    .selectOption("forever");
  await expect(
    page.getByRole("heading", {
      name: "Private TBC Karazhan experiment",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
  await expect(
    page.getByRole("heading", {
      name: "Private TBC Karazhan experiment",
      exact: true,
    }),
  ).toBeVisible();
  await smokeScreen(page, "tbc-event-browser");
});
for (const admission of ["automatic", "open"] as const)
  test(`TBC raid selection loads loot, role SR limits and host HR; signup leads to the member's SR list (${admission})`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000);
    const id = await stageCatalog(
      {
        ...tbcRaidCatalogFixture,
        raidName: "Black Temple",
        sourcePatch: `role-sr-browser-test-${admission}`,
      },
      staffId,
      db,
    );
    await reviewCatalog(
      id,
      staffId,
      "published",
      "Synthetic browser fixture only",
      db,
    );
    await signIn(context);
    const character = await page.request.post("/api/community/characters", {
      headers: { Origin: origin },
      data: {
        game: "tbc",
        realm: "Spineshatter",
        name: admission === "open" ? "Openhero" : "Srtester",
        className: "Warrior",
        specialization: "Fury",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
      },
    });
    expect(character.status()).toBe(201);
    await page.goto("/raids/new");
    await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
    await page
      .getByLabel("Raid preset", { exact: true })
      .selectOption("Black Temple");
    await expect(page.getByLabel("Loot catalog", { exact: true })).toHaveValue(
      id,
    );
    await page.getByLabel("Tank SR", { exact: true }).fill("3");
    await page.getByLabel("Healer SR", { exact: true }).fill("2");
    await page.getByLabel("DPS SR", { exact: true }).fill("1");
    await page.getByLabel("Admission", { exact: true }).selectOption(admission);
    await page
      .getByLabel("Search hard-reserve loot", { exact: true })
      .fill("hard");
    await page.getByLabel("Synthetic hard reserve", { exact: true }).check();
    await page
      .getByLabel("Title", { exact: true })
      .fill("TBC SR browser regression");
    await page.getByLabel("Realm", { exact: true }).fill("Spineshatter");
    await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
    await smokeScreen(page, "tbc-role-sr-create");
    await page
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
    await chooseArtwork(
      page,
      "Character",
      admission === "open" ? "Openhero" : "Srtester",
    );
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Join roster", exact: true })
      .click();
    await expect(page.locator(".raid-sr-count")).toHaveText("0/1 selected");
    await page
      .getByRole("button", { name: "Reserve Synthetic blade", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Reserve Synthetic hard reserve",
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Save reserves", exact: true })
      .click();
    await expect(
      page.getByText("Soft reserves saved.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Back to event", exact: true })
      .click();
    await expect(page.locator(".raid-visual-roster")).toContainText(
      "Synthetic blade",
    );
    await smokeScreen(page, "tbc-role-sr-member");
    const eventId = page.url().split("/").pop()!;
    const record = await db.foreverRaidEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: { signups: true },
    });
    expect(record.reserveLimits).toEqual({ tank: 3, healer: 2, damage: 1 });
    expect(record.hardReserves).toEqual([900002]);
    expect(record.signups[0].reserves).toEqual([900001]);
    expect(record.signups[0].status).toBe(
      admission === "open" ? "registered" : "accepted",
    );
    if (admission === "open") {
      await expect(page.locator(".raid-roster-waiting")).toContainText(
        "Signed up",
      );
      await expect(
        page.getByRole("region", { name: "Pending signups" }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Accept Openhero", exact: true })
        .click();
      await expect(page.getByRole("region", { name: "Group 1" })).toContainText(
        "Openhero",
      );
      await expect(
        page.getByRole("region", { name: "Open signups" }),
      ).toHaveCount(0);
    } else {
      await page.setViewportSize({ width: 1440, height: 900 });
      const handle = page.getByRole("button", {
        name: "Move Srtester",
        exact: true,
      });
      await handle.dragTo(page.getByRole("region", { name: "Group 2" }));
      await expect(page.getByRole("region", { name: "Group 2" })).toContainText(
        "Srtester",
      );
      await page.locator(".raid-move-select:not([disabled])").selectOption("0");
      await expect(page.getByRole("region", { name: "Group 1" })).toContainText(
        "Srtester",
      );
    }
  });
test("Preview editor saves existing event and loot settings without replacing participation or its Discord post", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context);
  const characterResponse = await page.request.post(
    "/api/community/characters",
    {
      headers: { Origin: origin },
      data: {
        game: "forever",
        realm: "",
        name: "Editor Hero",
        className: "Warrior",
        specialization: "Fury",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
      },
    },
  );
  expect(characterResponse.status()).toBe(201);
  const character = z
    .object({ character: z.object({ id: z.string() }) })
    .parse(await characterResponse.json()).character;
  const createResponse = await page.request.post("/api/raids", {
    headers: { Origin: origin },
    data: {
      requestKey: randomUUID(),
      game: "forever",
      realm: "",
      eventType: "raid",
      title: "Existing editable event",
      raidName: raidCatalogFixture.raidName,
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      localStart: "2035-11-05T19:00",
      durationMinutes: 180,
      signupMinutesBefore: 15,
      reserveMinutesBefore: 15,
      capacity: 20,
      roleCaps: { tank: 2, healer: 4, damage: 14 },
      admission: "automatic",
      description: "Original event description",
      catalogId,
      reserveLimit: 1,
      reserveLimits: { tank: 1, healer: 1, damage: 1 },
      allowDuplicates: false,
      hardReserves: [],
    },
  });
  expect(createResponse.status()).toBe(201);
  const eventId = z
    .object({ id: z.string() })
    .parse(await createResponse.json()).id;
  const signup = await page.request.post(`/api/raids/${eventId}`, {
    headers: { Origin: origin },
    data: {
      operation: "signup",
      input: {
        acknowledge: true,
        characterId: character.id,
        specialization: "Fury",
        role: "damage",
      },
    },
  });
  expect(signup.status()).toBe(200);
  const reserveResponse = await page.request.post(`/api/raids/${eventId}`, {
    headers: { Origin: origin },
    data: { operation: "reserves", input: { itemIds: [900001] } },
  });
  expect(reserveResponse.status()).toBe(200);
  const before = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { signups: true, discordPost: true },
  });
  if (before.discordPost)
    await db.foreverRaidDiscordPost.update({
      where: { eventId },
      data: {
        messageId: "1556000000000000199",
        status: "sent",
        deliveredVersion: before.version,
        approvedAt: new Date(),
        approvedBy: discordIds[0],
      },
    });
  await page.goto(`/raids/${eventId}`);
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  const editor = page.getByRole("region", { name: "Edit event", exact: true });
  await expect(editor.getByLabel("Title", { exact: true })).toHaveValue(
    "Existing editable event",
  );
  await expect(editor.getByLabel(/Starts \(Central/)).toHaveValue(
    "2035-11-05T19:00",
  );
  await expect(editor.getByLabel("DPS SR", { exact: true })).toHaveValue("1");
  await expect(
    editor.getByLabel("Discord channel", { exact: true }),
  ).toHaveCount(0);
  await editor
    .getByLabel("Title", { exact: true })
    .fill("Updated event from preview");
  await editor.getByLabel("Admission", { exact: true }).selectOption("open");
  await editor.getByLabel("Tank SR", { exact: true }).fill("4");
  await editor.getByLabel("Healer SR", { exact: true }).fill("4");
  await editor.getByLabel("DPS SR", { exact: true }).fill("3");
  await editor.getByLabel("Duration (minutes)", { exact: true }).fill("240");
  await editor.getByLabel(/Starts \(Central/).fill("2035-11-06T20:00");
  await editor
    .getByLabel("Details", { exact: true })
    .fill("Updated organiser description");
  await editor
    .getByLabel("Search hard-reserve loot", { exact: true })
    .fill("hard");
  await editor.getByLabel("Synthetic hard reserve", { exact: true }).check();
  await smokeScreen(page, "event-preview-editor");
  const saveRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === `/api/raids/${eventId}`,
  );
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  const editPayload: unknown = (await saveRequest).postDataJSON();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Updated event from preview",
  );
  await expect(editor).toHaveCount(0);
  await expect(page.locator(".raid-policy-review")).toBeVisible();
  const history = page.getByRole("region", {
    name: "Change history",
    exact: true,
  });
  await expect(history).toContainText("Signup mode");
  await expect(history).toContainText("Hard reserves");
  await history.locator("summary").first().click();
  await expect(history).toContainText("Updated event from preview");
  await expect(history).toContainText("Synthetic hard reserve");
  await expect(history.locator("time")).toContainText(/\d\d:\d\d/);
  const after = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { signups: true, discordPost: true },
  });
  expect(after.admission).toBe("open");
  expect(after.reserveLimits).toEqual({ tank: 4, healer: 4, damage: 3 });
  expect(after.hardReserves).toEqual([900002]);
  expect(after.signups[0].id).toBe(before.signups[0].id);
  expect(after.signups[0].status).toBe("accepted");
  expect(after.signups[0].reserves).toEqual([900001]);
  expect(after.requestHash).toBe(before.requestHash);
  if (before.discordPost) {
    expect(after.discordPost?.messageId).toBe("1556000000000000199");
    expect(after.discordPost?.channelId).toBe(before.discordPost.channelId);
    expect(after.discordPost?.approvedAt).toBeNull();
    expect(after.discordPost?.desiredVersion).toBe(after.version);
  }
  await page
    .getByLabel(
      "I have reviewed and accept the updated event and loot rules.",
      { exact: true },
    )
    .check();
  await page
    .getByRole("button", { name: "Acknowledge updated rules", exact: true })
    .click();
  await expect(page.locator(".raid-policy-review")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  await editor
    .getByLabel("Search hard-reserve loot", { exact: true })
    .fill("blade");
  await editor.getByLabel("Synthetic blade", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "existing soft reserve conflicts",
  );
  await expect(
    editor.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeEnabled();
  await editor
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  const outsider = await context.browser()!.newContext();
  try {
    await signIn(outsider, 1);
    const response = await outsider.request.post(`/api/raids/${eventId}`, {
      headers: { Origin: origin },
      data: editPayload,
    });
    expect(response.status()).toBe(403);
    const otherPage = await outsider.newPage();
    await otherPage.goto(`/raids/${eventId}`);
    await expect(
      otherPage.getByRole("button", { name: "Edit event", exact: true }),
    ).toHaveCount(0);
  } finally {
    await outsider.close();
  }
  await smokeScreen(page, "edited-event-preview");
});
test("Community channel selection requires explicit confirmation and shows roster visibility on desktop and mobile", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.FOREVER_RAIDS_E2E_DISCORD !== "true",
    "Synthetic Discord destination tests are opt-in.",
  );
  await signIn(context);
  await page.goto("/raids/new");
  await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
  await page
    .getByLabel("Raid preset", { exact: true })
    .selectOption("Karazhan");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Shared KFC TBC feedback experiment");
  await page.getByLabel("Realm", { exact: true }).fill("Spineshatter");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  const picker = page.getByLabel("Discord channel", { exact: true });
  await expect(picker).toHaveValue("");
  await page.getByLabel("Find a channel", { exact: true }).fill("KFC");
  await expect(picker.locator("option")).toHaveCount(2);
  await picker.selectOption("1556000000000000073");
  const confirmation = page.getByLabel(
    /I confirm this event and its character roster/,
  );
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveAttribute("required", "");
  await smokeScreen(page, "community-channel-confirmation");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/new$/);
  expect(
    await db.foreverRaidEvent.count({
      where: { title: "Shared KFC TBC feedback experiment" },
    }),
  ).toBe(0);
  await confirmation.check();
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const id = page.url().split("/").pop()!;
  const record = await db.foreverRaidDiscordPost.findUniqueOrThrow({
    where: { eventId: id },
  });
  expect(record.guildId).toBe("1411533815356194968");
  expect(record.channelId).toBe("1556000000000000073");
  expect(record.visibility).toBe("community");
  expect(record.confirmedAt).not.toBeNull();
  expect(record.messageId).toBeNull();
  expect(record.status).toBe("pending");
  const added = await page.request.post("/api/community/characters", {
    headers: { Origin: origin },
    data: {
      game: "tbc",
      realm: "spineshatter",
      name: "Feedback",
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  });
  expect(added.status()).toBe(201);
  await page.reload();
  await expect(
    page.getByLabel(
      /My character name, specialization, role, availability and reserves will be visible/,
    ),
  ).toBeVisible();
  await smokeScreen(page, "community-roster-visibility");
});
test("Create, join, reserve, bench and lock a Forever raid on desktop and mobile", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120000);
  await signIn(context);
  await page.goto("/account/characters");
  await page
    .getByLabel("Full character name", { exact: true })
    .fill("Dimitar Jilanovw");
  await chooseArtwork(page, "Specialization", "Fury");
  await expect(
    page.getByLabel("Character ruleset", { exact: true }),
  ).toHaveValue("PvP");
  await page
    .getByRole("button", { name: "Add character", exact: true })
    .click();
  await expect(
    page.getByText("Dimitar Jilanovw", { exact: true }),
  ).toBeVisible();
  await page.goto("/raids/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Private Forever browser test");
  await page
    .getByLabel("Loot catalog", { exact: true })
    .selectOption(catalogId);
  await expect(
    page.getByLabel("Character ruleset", { exact: true }),
  ).toHaveValue("PvP");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  await page.getByLabel("Capacity", { exact: true }).fill("1");
  await page.getByLabel("Tanks", { exact: true }).fill("0");
  await page.getByLabel("Healers", { exact: true }).fill("0");
  await page.getByLabel("Damage", { exact: true }).fill("1");
  await page.getByLabel("Synthetic hard reserve", { exact: true }).check();
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const eventId = page.url().split("/").pop()!;
  await page.getByLabel(/I accept this event/).check();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(
    page
      .locator(".raid-reserve-character")
      .getByText("Dimitar Jilanovw", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reserve Synthetic blade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save reserves", exact: true })
    .click();
  await expect(
    page.getByText("Soft reserves saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to event", exact: true }).click();
  await expect(
    page
      .locator(".raid-visual-roster")
      .getByText("Synthetic blade", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".raid-visual-roster")).toContainText("Fury");
  await chooseArtwork(page, "Specialization", "Protection");
  await expect(
    page
      .getByRole("group", { name: "Role", exact: true })
      .getByRole("radio", { name: "Tank", exact: true }),
  ).toBeChecked();
  await chooseArtwork(page, "Role", "Damage");
  await expect(
    page
      .getByRole("group", { name: "Specialization", exact: true })
      .getByRole("radio", { name: "Protection", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByText(
      "Changing character or specialization clears your soft reserves.",
      { exact: true },
    ),
  ).toBeVisible();
  await chooseArtwork(page, "Specialization", "Arms");
  await expect(
    page
      .getByRole("group", { name: "Role", exact: true })
      .getByRole("radio", { name: "Damage", exact: true }),
  ).toBeChecked();
  await page.getByLabel(/I accept this event/).check();
  await page
    .getByRole("button", { name: "Update signup", exact: true })
    .click();
  await expect(page.locator(".raid-reserve-character")).toContainText("Arms");
  await expect(page.locator(".raid-sr-count")).toHaveText("0/2 selected");
  await page
    .getByRole("button", { name: "Reserve Synthetic blade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save reserves", exact: true })
    .click();
  await expect(
    page.getByText("Soft reserves saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Reserve Synthetic hard reserve",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Back to event", exact: true }).click();
  await expect(
    page
      .locator(".raid-visual-roster")
      .getByText("Synthetic blade", { exact: true }),
  ).toBeVisible();
  const second = await browser.newContext();
  try {
    await signIn(second, 1);
    const character = await second.request.post(
      `${origin}/api/community/characters`,
      {
        headers: { Origin: origin },
        data: {
          name: "Browsertwo",
          className: "Warrior",
          specialization: "Arms",
          region: "EU",
          faction: "Alliance",
          ruleset: "PvP",
        },
      },
    );
    expect(character.status()).toBe(201);
    const body: { character: { id: string } } = await character.json();
    const signup = await second.request.post(`${origin}/api/raids/${eventId}`, {
      headers: { Origin: origin },
      data: {
        operation: "signup",
        input: {
          characterId: body.character.id,
          specialization: "Arms",
          role: "damage",
          acknowledge: true,
        },
      },
    });
    expect(signup.status()).toBe(200);
  } finally {
    await second.close();
  }
  await page
    .getByRole("button", { name: "Refresh roster", exact: true })
    .click();
  await expect(page.getByText("Browsertwo", { exact: true })).toBeVisible();
  await expect(page.locator(".raid-visual-roster")).toContainText("Arms");
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/raids-${width}.png`,
      fullPage: true,
    });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  page.once("dialog", (dialog) => void dialog.accept());
  await openEventManagement(page);
  await page
    .getByRole("button", { name: "Lock roster & reserves", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download locked JSON", exact: true }),
  ).toBeVisible();
  const exportResponse = await page.request.get(`/api/raids/${eventId}/export`);
  expect(exportResponse.status()).toBe(200);
  const exported: {
    payload: {
      roster: { character: { name: string; specialization: string } }[];
    };
    checksum: string;
  } = await exportResponse.json();
  expect(exported.payload.roster.map((row) => row.character.name)).toEqual([
    "Dimitar Jilanovw",
  ]);
  expect(jsonChecksum(exported.payload)).toBe(exported.checksum);
  expect(exported.payload.roster[0].character.specialization).toBe("Arms");
  await expect(
    page.getByText("Signups closed.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Soft reserves closed.", { exact: true }),
  ).toBeVisible();
});
test("Dedicated TBC loot UX: real icons, accessible stats, category HR, competition and mobile saving", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context);
  const raw: unknown = JSON.parse(
    await readFile("content/raid-catalogs/tbc/black-temple.json", "utf8"),
  );
  const bundle = z.record(z.string(), z.unknown()).parse(raw);
  const lootCatalogId = await stageCatalog(
    { ...bundle, sourcePatch: `browser-loot-ux-${randomUUID()}` },
    staffId,
    db,
  );
  await reviewCatalog(
    lootCatalogId,
    staffId,
    "published",
    "Local UX fixture with reviewed TBC item facts",
    db,
  );
  const characterResponse = await page.request.post(
    "/api/community/characters",
    {
      headers: { Origin: origin },
      data: {
        game: "tbc",
        realm: "spineshatter",
        name: "Lootbrowser",
        className: "Warrior",
        specialization: "Fury",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
      },
    },
  );
  expect(characterResponse.status()).toBe(201);
  await page.goto("/raids/new");
  await page.getByLabel("Game edition", { exact: true }).selectOption("tbc");
  await page
    .getByLabel("Raid preset", { exact: true })
    .selectOption("Black Temple");
  await page
    .getByLabel("Loot catalog", { exact: true })
    .selectOption(lootCatalogId);
  await expect(
    page.getByRole("checkbox", {
      name: "HR recipes, plans & profession books",
      exact: true,
    }),
  ).toBeEnabled();
  await page
    .getByRole("checkbox", {
      name: "HR recipes, plans & profession books",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: "HR materials & gems", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "HR BoE", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Black Temple loot experience");
  await page.getByLabel("Realm", { exact: true }).fill("Spineshatter");
  await page.getByLabel(/Starts \(Central/).fill("2035-11-05T19:00");
  await page.getByLabel("Admission", { exact: true }).selectOption("open");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page).toHaveURL(/\/raids\/[a-z0-9]{20,40}$/);
  const eventId = page.url().split("/").pop()!;
  await chooseArtwork(page, "Character", "Lootbrowser");
  await page.getByLabel(/I accept this event/).check();
  await page.getByRole("button", { name: "Join roster", exact: true }).click();
  await expect(page).toHaveURL(`/raids/${eventId}/reserves`);
  await smokeScreen(page, "softres-tbc-catalog");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("searchbox", { name: "Search loot", exact: true })
    .fill("Madness");
  const inspection = page.getByRole("button", {
    name: "Inspect Madness of the Betrayer",
    exact: true,
  });
  await expect(inspection).toBeVisible();
  expect(
    await inspection
      .locator("img")
      .evaluate((node) => (node as HTMLImageElement).naturalWidth),
  ).toBe(56);
  await inspection.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Increases attack power by 84",
  );
  const tooltipBounds = await page.getByRole("tooltip").boundingBox();
  expect(tooltipBounds!.x).toBeGreaterThanOrEqual(0);
  expect(tooltipBounds!.x + tooltipBounds!.width).toBeLessThanOrEqual(1440);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(
    page.getByRole("searchbox", { name: "Search loot", exact: true }),
  ).toHaveValue("Madness");
  await inspection.click();
  await expect(
    page.getByRole("dialog", { name: "Item details" }),
  ).toContainText("+20 Hit Rating");
  await page
    .getByRole("button", { name: "Close item details", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Reserve Madness of the Betrayer",
      exact: true,
    })
    .click();
  await expect(page.locator(".raid-reserve-save")).toContainText(
    "Unsaved changes",
  );
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.locator(".raid-sr-count")).toHaveText("0/2 selected");
  await page.setViewportSize({ width: 390, height: 844 });
  await inspection.click();
  await expect(
    page.getByRole("dialog", { name: "Item details" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Reserve Madness of the Betrayer",
      exact: true,
    })
    .click();
  await expect(page.locator(".raid-reserve-mobile-save")).toContainText(
    "Unsaved changes",
  );
  await page
    .getByRole("button", { name: "Save reserves", exact: true })
    .click();
  await expect(
    page.getByText("Soft reserves saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 reservers", { exact: true })).toBeVisible();
  await page.getByText("1 reservers", { exact: true }).click();
  await expect(page.locator(".raid-item-competition")).toContainText(
    "Lootbrowser (you)",
  );
  await page
    .getByRole("button", { name: /Reservations/, exact: false })
    .click();
  await expect(
    page.getByRole("region", { name: "Player reservations" }),
  ).toContainText("Madness of the Betrayer");
  await smokeScreen(page, "softres-reservations");
  await page.getByRole("link", { name: "Back to event", exact: true }).click();
  await expect(page.locator(".raid-roster-waiting")).toContainText(
    "Lootbrowser",
  );
  const event = await db.foreverRaidEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { signups: true },
  });
  expect(event.signups[0].status).toBe("registered");
  expect(event.signups[0].reserves).toEqual([32505]);
  expect(event.hardReserves).toEqual(expect.arrayContaining([32227]));
});

test("Availability responses are named, release seats, and can rejoin on desktop and mobile", async ({
  page,
  context,
}) => {
  await signIn(context);
  const response = await page.request.post("/api/community/characters", {
    headers: { Origin: origin },
    data: {
      game: "forever",
      realm: "",
      name: "Attendance Hero",
      className: "Warrior",
      specialization: "Fury",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
    },
  });
  expect(response.status()).toBe(201);
  for (const eventType of ["questing", "social"] as const) {
    const created = await page.request.post("/api/raids", {
      headers: { Origin: origin },
      data: {
        requestKey: randomUUID(),
        game: "forever",
        realm: "",
        eventType,
        title: `Availability ${eventType}`,
        raidName:
          eventType === "questing" ? "Elwynn leveling" : "Guild gathering",
        region: "EU",
        faction: "Alliance",
        ruleset: "PvP",
        localStart: "2035-11-05T08:30",
        durationMinutes: 180,
        signupMinutesBefore: 15,
        reserveMinutesBefore: 15,
        capacity: 5,
        roleCaps: eventTypeDefinitions[eventType].roleCaps,
        admission: "open",
        description: "Synthetic availability verification",
        catalogId: null,
        reserveLimit: 0,
        allowDuplicates: false,
        hardReserves: [],
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const eventId = z.object({ id: z.string() }).parse(await created.json()).id;
    await page.goto(`/raids/${eventId}`);
    await chooseArtwork(page, "Character", "Attendance Hero");
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Join roster", exact: true })
      .click();
    await expect(page.locator("#my-signup > .raid-badge")).toHaveText(
      "Signed up",
    );
    await page.getByRole("radio", { name: "Absent", exact: true }).check();
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Save Absent", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Absent", exact: true }),
    ).toContainText("Attendance Hero (you)");
    await expect(page.locator("#my-signup > .raid-badge")).toHaveText("Absent");
    await expect(
      page.getByRole("button", { name: "Accept Attendance Hero", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("radio", { name: "Tentative", exact: true }).check();
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Save Tentative", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Tentative", exact: true }),
    ).toContainText("Attendance Hero (you)");
    await expect(
      page.getByRole("region", { name: "Absent", exact: true }),
    ).toHaveCount(0);
    await smokeScreen(page, `availability-${eventType}`);
    await page.getByRole("radio", { name: "Joining", exact: true }).check();
    await page.getByLabel(/I accept this event/).check();
    await page
      .getByRole("button", { name: "Update signup", exact: true })
      .click();
    await expect(page.locator("#my-signup > .raid-badge")).toHaveText(
      "Signed up",
    );
    await expect(
      page.getByRole("region", { name: "Tentative", exact: true }),
    ).toHaveCount(0);
    expect(await db.foreverRaidSignup.count({ where: { eventId } })).toBe(1);
  }
});
test("Raid-Helper signup import reviews aliases on desktop/mobile and is organizer-only", async ({
  page,
  context,
}) => {
  await signIn(context);
  const created = await page.request.post("/api/raids", {
    headers: { Origin: origin },
    data: {
      requestKey: randomUUID(),
      game: "forever",
      realm: "",
      eventType: "questing",
      title: "Legacy signup import",
      confirmDiscordPublication: true,
      raidName: "Northshire questing",
      region: "EU",
      faction: "Alliance",
      ruleset: "PvP",
      localStart: "2035-11-05T08:30",
      durationMinutes: 840,
      signupMinutesBefore: 0,
      reserveMinutesBefore: 0,
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      admission: "open",
      description: "Synthetic local browser import",
      catalogId: null,
      reserveLimit: 0,
      reserveLimits: null,
      allowDuplicates: false,
      hardReserves: [],
    },
  });
  expect(created.status()).toBe(201);
  const { id } = z.object({ id: z.string() }).parse(await created.json());
  const source = JSON.stringify({
    ...raidHelperFixture,
    signUps: raidHelperFixture.signUps.slice(0, 2),
  });
  await page.goto(`/raids/${id}`);
  const importButton = page
    .locator(".raid-event-actions")
    .getByRole("button", { name: "Import Raid-Helper signups", exact: true });
  await expect(importButton).toBeVisible();
  await expect(page.locator(".raid-management")).not.toHaveAttribute(
    "open",
    "",
  );
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(importButton).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/smoke-import-action-${width}.png`,
      fullPage: false,
    });
  }
  await importButton.click();
  const modal = page.getByRole("dialog", {
    name: "Import signups",
    exact: true,
  });
  await modal.getByLabel("JSON export", { exact: true }).fill(source);
  await modal
    .getByRole("button", { name: "Preview players", exact: true })
    .click();
  await expect(modal.getByText("2 selected · 2 in source")).toBeVisible();
  await expect(
    modal.getByLabel("Class for <TEST> Organizer", { exact: true }),
  ).toHaveValue("Warrior");
  await expect(
    modal.getByLabel("Specialization for <TEST>Healer", { exact: true }),
  ).toHaveValue("Restoration");
  await expect(
    modal.getByRole("button", { name: "Import 2 players", exact: true }),
  ).toBeDisabled();
  for (const width of [1440, 768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await modal.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    if (width === 1440 || width === 360) {
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations.map((violation) => violation.id)).toEqual([]);
      await page.screenshot({
        path: `artifacts/smoke-signup-import-${width}.png`,
        fullPage: true,
      });
    }
  }
  await modal
    .getByLabel("I reviewed each character name, role and attendance choice.")
    .check();
  await modal
    .getByRole("button", { name: "Import 2 players", exact: true })
    .click();
  await expect(modal.getByRole("status")).toContainText("2 imported");
  await modal.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("Imported signup · rules need review"),
  ).toHaveCount(2);
  const signups = await db.foreverRaidSignup.findMany({
    where: { eventId: id },
  });
  expect(signups).toHaveLength(2);
  expect(
    signups.every(
      (signup) =>
        signup.status === "registered" && signup.acknowledgedAt === null,
    ),
  ).toBe(true);
  await context.clearCookies();
  await signIn(context, 1);
  await page.goto(`/raids/${id}`);
  await expect(
    page.getByText("Your signup was imported.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Acknowledge event rules", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Import Raid-Helper signups",
      exact: true,
    }),
  ).toHaveCount(0);
  const denied = await page.request.post(`/api/raids/${id}/import`, {
    headers: { Origin: origin },
    data: { operation: "preview", source },
  });
  expect(denied.status()).toBe(403);
  expect(denied.headers()["cache-control"]).toBe("private, no-store");
});
