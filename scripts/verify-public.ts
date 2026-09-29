import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

async function main(): Promise<void> {
  const origin =
    process.env.VERIFY_URL || "https://www.wowforeverdiscord.online";
  assert.equal(new URL(origin).protocol, "https:");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await mkdir("artifacts", { recursive: true });
    const context = await browser.newContext({ baseURL: origin });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const path of [
        "/",
        "/discord",
        "/guild-recruitment",
        "/guides/join-wow-forever-discord",
        "/guides/find-or-organize-wow-forever-group",
        "/discord/eu",
        "/reports/new",
      ]) {
        assert.equal((await page.goto(path))?.status(), 200, path);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow: ${path}`,
        );
        await page.locator("img").evaluateAll(async (images) => {
          await Promise.all(
            images.map(async (image) => {
              if (!(image instanceof HTMLImageElement)) return;
              image.loading = "eager";
              await image.decode();
            }),
          );
        });
        assert.equal(
          await page
            .locator("img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  image instanceof HTMLImageElement && image.naturalWidth > 0,
              ),
            ),
          true,
        );
        if (path === "/reports/new")
          await page
            .getByText("Submission check complete")
            .waitFor({ timeout: 45000 });
        if (path === "/") {
          assert.match(
            (await page
              .locator('meta[name="robots"]')
              .getAttribute("content")) || "",
            /^index,/,
          );
          assert.equal(
            new URL(
              (await page
                .locator('link[rel="canonical"]')
                .getAttribute("href")) || "",
            ).origin,
            origin,
          );
          assert.equal(
            await page
              .locator("body")
              .innerText()
              .then((text) => text.includes("KFC")),
            false,
          );
        }
        if (
          ["/", "/discord", "/guides/join-wow-forever-discord"].includes(path)
        ) {
          const axe = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          assert.deepEqual(
            axe.violations.map((item) => item.id),
            [],
          );
        }
        await page.screenshot({
          path: `artifacts/live-${width}-${path.replaceAll("/", "_") || "home"}.png`,
          fullPage: path !== "/",
        });
      }
    }
    const health = await context.request.get("/api/health");
    assert.equal(health.status(), 200);
    const robots = await (await context.request.get("/robots.txt")).text();
    assert.ok(
      robots.includes("OAI-SearchBot") &&
        robots.includes("Allow: /") &&
        !robots.includes("Disallow: /\n"),
    );
    const sitemap = await (await context.request.get("/sitemap.xml")).text();
    const urls = await page.evaluate(
      (xml) =>
        Array.from(
          new DOMParser()
            .parseFromString(xml, "application/xml")
            .querySelectorAll("loc"),
          (node) => node.textContent || "",
        ),
      sitemap,
    );
    for (const url of urls) {
      assert.equal(new URL(url).origin, origin);
      assert.equal((await context.request.get(url)).status(), 200, url);
      assert.equal(/\/admin|\/reports\/status/.test(url), false);
    }
    const share = await context.request.get("/opengraph-image");
    assert.equal(share.status(), 200);
    const image = await sharp(await share.body()).metadata();
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
    const invitation = await context.request.get("/join", { maxRedirects: 0 });
    assert.equal(invitation.status(), 302);
    assert.equal(
      invitation.headers().location,
      "https://discord.gg/ejn4UnDdcX",
    );
    for (const url of [
      "http://wowforeverdiscord.online/",
      "https://wowforeverdiscord.online/",
      "http://www.wowforeverdiscord.online/",
    ]) {
      const redirect = await context.request.get(url, { maxRedirects: 0 });
      assert.equal(redirect.status(), 301);
      assert.equal(redirect.headers().location, `${origin}/`);
    }
    await page.goto("/admin");
    assert.equal(new URL(page.url()).pathname, "/login");
    assert.equal(
      (
        await context.request.post("/api/admin/settings", {
          headers: { origin },
          data: {},
        })
      ).status(),
      401,
    );
    assert.equal(
      (await context.request.get("/api/admin/evidence/nonexistent")).status(),
      401,
    );
    assert.equal((await context.request.get("/.env.local")).status(), 403);
    const entries = (await (
      await context.request.get("/api/addons/foreverguard/list")
    ).json()) as { entries: unknown[] };
    assert.equal(
      entries.entries.length,
      0,
      "Do not launch with test player alerts.",
    );
    assert.deepEqual(errors, []);
    console.log(
      `Live verification passed: ${urls.length} sitemap pages, desktop/mobile rendering and accessibility, real assets, secure forms, HTTPS redirects, invite, metadata, and private-route denial.`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
