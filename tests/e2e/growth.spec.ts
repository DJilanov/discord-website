import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { communityTemplates } from "../../content/templates";

const templatePages = [
  ["write-wow-forever-guild-recruitment-post", "guild-recruitment"],
  ["find-or-organize-wow-forever-group", "group-post"],
  ["wow-forever-launch-group-checklist", "launch-group-plan"],
] as const;

test("preparation articles and copyable templates work on mobile and desktop", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(180000);
  await mkdir("artifacts/growth", { recursive: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const [slug, templateSlug] of templatePages) {
      expect((await page.goto(`/guides/${slug}`))?.status()).toBe(200);
      const template = communityTemplates.find(
        (item) => item.slug === templateSlug,
      )!;
      await expect(page.locator(".article-template pre")).toHaveText(
        template.text,
      );
      await page
        .getByRole("button", { name: "Copy template", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Copied", exact: true }),
      ).toBeVisible();
      expect(
        (await page.evaluate(() => navigator.clipboard.readText())).trim(),
      ).toBe(template.text);
      const download = await request.get(`/templates/${templateSlug}`);
      expect(download.headers()["x-robots-tag"]).toBe("noindex");
      expect(await download.text()).toContain(template.text);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator(".article-template")
        .screenshot({ path: `artifacts/growth/${slug}-${width}.png` });
      if (width === 390) {
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(axe.violations.map((item) => item.id)).toEqual([]);
      }
    }
    expect(
      (await page.goto("/guides/wow-forever-beta-starter-checklist"))?.status(),
    ).toBe(200);
    await expect(page.locator("article")).toContainText(
      "Official information checked September 30, 2026",
    );
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
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/growth/beta-${width}.png`,
      fullPage: true,
    });
  }
});

test("clipboard denial has a usable fallback and templates remain readable without JavaScript", async ({
  page,
  browser,
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
  await page.goto("/guides/wow-forever-launch-group-checklist");
  await page
    .getByRole("button", { name: "Copy template", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Clipboard unavailable");
  await expect(
    page.getByRole("link", { name: "Download the blank template" }),
  ).toBeVisible();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const plain = await context.newPage();
    await plain.goto("/guides/wow-forever-launch-group-checklist");
    await expect(plain.locator(".article-template pre")).toContainText(
      "Plan owner and public contact:",
    );
    await expect(
      plain.getByRole("link", { name: "Download the blank template" }),
    ).toHaveAttribute("href", "/templates/launch-group-plan");
    await plain.goto("/guides/join-wow-forever-discord");
    await expect(plain.locator("article")).toContainText(
      "Invitation troubleshooting by symptom",
    );
    await expect(plain.locator("article")).toContainText(
      "Do not make replacement accounts or evade a ban",
    );
  } finally {
    await context.close();
  }
});
