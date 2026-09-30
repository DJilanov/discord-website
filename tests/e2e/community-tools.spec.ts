import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { testerReportTemplate } from "../../content/contributor-tasks";

const pages = [
  "/addons",
  "/addons/wow-trader",
  "/contribute",
  "/guides/wow-forever-playing-with-friends",
  "/guides/wow-trader-read-market-prices",
];

test("tools, tasks and new guides render real assets and fit phone, tablet and desktop", async ({
  page,
}) => {
  test.setTimeout(240000);
  await mkdir("artifacts/community-tools", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    for (const path of pages) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll(async (images) => {
        for (const image of images) {
          if (image instanceof HTMLImageElement) {
            image.loading = "eager";
            await image.decode();
          }
        }
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/contribute") {
        await expect(page.locator(".test-task")).toHaveCount(5);
        await page.locator("#collector summary").click();
        await expect(page.locator("#collector")).toContainText(
          "private diagnostic route",
        );
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/community-tools/${path.replaceAll("/", "-")}-${width}.png`,
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

test("tester report can be copied, downloaded and used without JavaScript", async ({
  page,
  context,
  request,
  browser,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/contribute");
  await page.getByRole("button", { name: "Copy report template" }).click();
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    testerReportTemplate.text,
  );
  const download = await request.get("/templates/tester-report");
  expect(download.status()).toBe(200);
  expect(download.headers()["x-robots-tag"]).toBe("noindex");
  expect(await download.text()).toContain(testerReportTemplate.text);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download text" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "wow-forever-tester-report.txt",
  );
  await expect(page).toHaveURL(/\/contribute$/);
  const plainContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 844 },
  });
  try {
    const plain = await plainContext.newPage();
    await plain.goto("/contribute");
    await plain.locator("#trader-web summary").click();
    await expect(plain.locator("#trader-web ol")).toBeVisible();
    await expect(plain.locator("#report pre")).toContainText(
      "What remains untested:",
    );
    await expect(
      plain.getByRole("link", { name: "Download text" }),
    ).toHaveAttribute("href", "/templates/tester-report");
  } finally {
    await plainContext.close();
  }
});

test("clipboard denial keeps the report readable and downloadable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (): Promise<void> => {
          throw new Error("Denied");
        },
      },
    });
  });
  await page.goto("/contribute");
  await page.getByRole("button", { name: "Copy report template" }).click();
  await expect(page.getByRole("status")).toContainText("Clipboard unavailable");
  await expect(page.getByRole("link", { name: "Download text" })).toBeVisible();
});

test("new resources are linked, canonical and included in the sitemap", async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of pages) {
    await page.goto(`${path}?utm_source=test`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://www.wowforeverdiscord.online${path}`,
    );
    expect(sitemap).toContain(`${path}</loc>`);
  }
  await page.goto("/addons");
  await expect(
    page.getByRole("link", { name: "Open WoW Trader", exact: true }),
  ).toHaveAttribute("href", "https://helper.kfcguild.online/forever/trader");
  await page.getByRole("link", { name: "Pick an assignment" }).click();
  await expect(page).toHaveURL(/\/contribute$/);
  await page.goto("/lfg/new");
  await expect(page.getByLabel("Character ruleset")).toBeVisible();
  await expect(page.getByLabel("Realm", { exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel("Character ruleset").locator("option"),
  ).toHaveText(["Select character ruleset", "Normal", "PvP", "Roleplaying"]);
});
