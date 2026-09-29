import "../../scripts/env";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { editorialGuides } from "../../content/editorial";

test.beforeAll(async (): Promise<void> => {
  await mkdir("artifacts/editorial", { recursive: true });
});

test("Discord and illustrated guides remain readable with an early invitation across sizes", async ({
  page,
}) => {
  test.setTimeout(180000);
  for (const width of [320, 390, 768, 1440]) {
    const height = width < 500 ? 844 : 1000;
    await page.setViewportSize({ width, height });
    for (const path of [
      "/discord?invite=unavailable",
      "/guides/join-wow-forever-discord",
      "/guides/find-your-wow-forever-guild",
      "/guides/find-or-organize-wow-forever-group",
      "/guides",
      "/discord/eu",
    ]) {
      expect((await page.goto(path))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} ${width}`,
      ).toBe(true);
      await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (image) => {
            if (image instanceof HTMLImageElement) {
              image.loading = "eager";
              await image.decode();
            }
          }),
        );
      });
      if (path.startsWith("/discord?")) {
        const join = page
          .locator("#invite")
          .getByRole("link", { name: "Join Discord", exact: true });
        await expect(join).toHaveAttribute("href", "/join");
        const box = await join.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThan(height);
        await expect(
          page.getByText("The invitation is temporarily unavailable.", {
            exact: false,
          }),
        ).toHaveCount(0);
      }
      if (path.includes("join-wow-forever")) {
        await expect(page.locator(".editorial-inline-image")).toHaveCount(2);
        expect(
          await page.locator(".editorial-inline-image").evaluateAll((images) =>
            images.every((image) => {
              const rect = image.getBoundingClientRect();
              return (
                rect.width > 100 &&
                rect.height > 100 &&
                rect.right <= innerWidth
              );
            }),
          ),
        ).toBe(true);
      }
      await page.screenshot({
        path: `artifacts/editorial/${path.split("?")[0].replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
      if (width === 390 || width === 1440) {
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          axe.violations.map((item) => ({
            id: item.id,
            nodes: item.nodes.map((node) => node.target),
          })),
          path,
        ).toEqual([]);
      }
    }
  }
});

test("published guide metadata matches its own cover, author, dates and clean canonical", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  for (const guide of editorialGuides) {
    await page.goto(`/guides/${guide.slug}?utm_source=chatgpt.com`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      guide.title,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.wowforeverdiscord.online/guides/${guide.slug}`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `https://www.wowforeverdiscord.online${guide.coverImage}`,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      `https://www.wowforeverdiscord.online${guide.coverImage}`,
    );
    const articles = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((items) =>
        items
          .map(
            (item) =>
              JSON.parse(item.textContent || "{}") as Record<string, unknown>,
          )
          .filter((item) => item["@type"] === "Article"),
      );
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      headline: guide.title,
      image: `https://www.wowforeverdiscord.online${guide.coverImage}`,
      author: {
        name: (
          await page.locator(".guild-meta span").first().innerText()
        ).replace(/^By /, ""),
      },
    });
    expect(articles[0].dateModified).toBe(
      await page.locator(".guild-meta time").getAttribute("datetime"),
    );
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const guide of editorialGuides)
    expect(sitemap).toContain(`/guides/${guide.slug}</loc>`);
});

test("Discord onboarding and editorial images are present without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/discord");
    await expect(page.locator("#invite a[href='/join']")).toBeVisible();
    await expect(page.locator(".channel-map")).toContainText(
      "guild-recruitment",
    );
    await page.goto("/guides/join-wow-forever-discord");
    await expect(page.locator(".editorial-inline-image")).toHaveCount(2);
    await page.getByText("On this page", { exact: true }).click();
    await page.locator(".article-contents a").first().click();
    expect(new URL(page.url()).hash.length).toBeGreaterThan(1);
  } finally {
    await context.close();
  }
});
