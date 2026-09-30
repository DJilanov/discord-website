import "../../scripts/env";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { db } from "../../lib/db";

test.beforeAll(async (): Promise<void> => {
  if (new URL(process.env.DATABASE_URL || "").port !== "55432")
    throw new Error("Design fixtures require the isolated local database.");
  await mkdir("artifacts/redesign", { recursive: true });
});
test.afterAll(async (): Promise<void> => {
  await db.$disconnect();
});

test("homepage community identity is visible without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const heading = page.getByRole("heading", {
      level: 1,
      name: "WoW Forever Discord",
      exact: true,
    });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("WoW Forever Discord");
    await expect(page.locator(".community-intro")).toHaveText(
      "WoW Forever Discord is an independent, unofficial EU and NA community for Alliance and Horde players interested in PvE, PvP and roleplay. You do not need to join a particular guild to take part.",
    );
    await expect(page.locator(".community-intro")).toBeVisible();
    await expect(page.locator(".hero-logo")).toBeVisible();
    await expect(page.locator(".hero-description")).not.toBeEmpty();
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    const siteName = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts): string | undefined => {
        for (const script of scripts) {
          const data = JSON.parse(script.textContent || "{}") as {
            "@graph"?: Array<{ "@type"?: string; name?: string }>;
          };
          const website = data["@graph"]?.find(
            (entry: { "@type"?: string }) => entry["@type"] === "WebSite",
          );
          if (website) return website.name;
        }
      });
    expect(siteName).toBe("WoW Forever Discord");
  } finally {
    await context.close();
  }
});

test("hero composition, sharp assets and controls across the viewport matrix", async ({
  page,
}) => {
  test.setTimeout(180000);
  for (const [width, height] of [
    [320, 740],
    [390, 667],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1366, 768],
    [1440, 1000],
    [1920, 1080],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".hero-art").evaluate(async (image) => {
      await (image as HTMLImageElement).decode();
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${width} x ${height}`,
    ).toBe(true);
    const hero = page.locator(".home-hero");
    await expect(
      hero.getByRole("link", { name: "Join Discord", exact: true }),
    ).toBeVisible();
    if (height >= 667) {
      expect(
        await hero.evaluate(
          (element) =>
            element.getBoundingClientRect().bottom < innerHeight - 45,
        ),
      ).toBe(true);
      const action = await hero
        .getByRole("link", { name: "Join Discord", exact: true })
        .boundingBox();
      expect(action).not.toBeNull();
      expect(action!.y + action!.height).toBeLessThan(height);
    }
    const source = await page
      .locator(".hero-art")
      .evaluate((image) => (image as HTMLImageElement).currentSrc);
    expect(source).toContain(
      width <= 700 ? "forever-hero-mobile" : "forever-hero.webp",
    );
    expect(new URL(source).searchParams.get("q")).toBe(
      width <= 700 ? "60" : "75",
    );
    await expect(page.locator(".hero-logo")).toHaveAttribute(
      "loading",
      "eager",
    );
    await page.screenshot({
      path: `artifacts/redesign/viewport-${width}-${height}.png`,
    });
  }
});

test("native mobile navigation and guide contents work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Guides", exact: true })
      .click();
    await expect(page).toHaveURL(/\/guides$/);
    await page.goto("/guides/find-your-wow-forever-guild");
    await page.getByText("On this page", { exact: true }).click();
    const anchors = page.locator(".article-contents a");
    expect(await anchors.count()).toBeGreaterThan(2);
    const href = await anchors.first().getAttribute("href");
    await anchors.first().click();
    expect(new URL(page.url()).hash).toBe(href);
    await expect(page.locator(href!)).toBeVisible();
  } finally {
    await context.close();
  }
});

test("mobile menu supports Escape and reduced-motion layouts remain complete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
  expect(
    await page
      .locator(".community-image img")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
  await page.locator(".join-scene").scrollIntoViewIfNeeded();
  await page.locator(".join-scene > img").evaluate(async (element) => {
    await (element as HTMLImageElement).decode();
  });
  await expect(
    page
      .locator(".join-scene")
      .getByRole("link", { name: "Join Discord", exact: true }),
  ).toBeVisible();
});

test("homepage shows approved listings but not pending or expired groups", async ({
  page,
}) => {
  const prefix = `Design fixture ${Date.now()}`;
  const guildSlugs: string[] = [];
  const groupIds: string[] = [];
  try {
    for (const status of ["approved", "pending"]) {
      const slug = `design-fixture-${status}-${Date.now()}`;
      guildSlugs.push(slug);
      await db.foreverGuild.create({
        data: {
          slug,
          name: `${prefix} guild ${status}`,
          region: "EU",
          realm: "Test",
          faction: "Alliance",
          ruleset: "PvE",
          playstyle: "Casual",
          raidDays: [],
          raidTime: "20:00 UTC",
          lootSystem: "Agreed rules",
          recruitingClasses: [],
          description: "Isolated local browser test fixture.",
          contactDiscord: "fixture",
          status,
          featured: true,
          lastVerifiedAt: new Date(),
        },
      });
    }
    for (const kind of ["approved", "pending", "expired", "started"]) {
      const group = await db.foreverGroup.create({
        data: {
          title: `${prefix} group ${kind}`,
          region: "EU",
          realm: "Test",
          faction: "Horde",
          activity: "Dungeon",
          description: "Isolated local browser test fixture.",
          contactDiscord: "fixture",
          status: kind === "pending" ? "pending" : "approved",
          startsAt: new Date(
            Date.now() + (kind === "started" ? -3600000 : 3600000),
          ),
          expiresAt: new Date(
            Date.now() + (kind === "expired" ? -86400000 : 86400000),
          ),
        },
      });
      groupIds.push(group.id);
    }
    await page.goto("/");
    const listings = page.locator(".recruitment-band");
    await expect(
      listings.getByText(`${prefix} guild approved`, { exact: true }),
    ).toBeVisible();
    await expect(
      listings.getByText(`${prefix} group approved`, { exact: true }),
    ).toBeVisible();
    await expect(
      listings.getByText(`${prefix} guild pending`, { exact: true }),
    ).toHaveCount(0);
    await expect(
      listings.getByText(`${prefix} group pending`, { exact: true }),
    ).toHaveCount(0);
    await expect(
      listings.getByText(`${prefix} group expired`, { exact: true }),
    ).toHaveCount(0);
    await expect(
      listings.getByText(`${prefix} group started`, { exact: true }),
    ).toHaveCount(0);
  } finally {
    await db.foreverGuild.deleteMany({ where: { slug: { in: guildSlugs } } });
    await db.foreverGroup.deleteMany({ where: { id: { in: groupIds } } });
  }
});
