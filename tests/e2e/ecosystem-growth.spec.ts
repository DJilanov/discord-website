import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { decodeToolGroupDraft } from "../../lib/tool-group-draft";

const helperOrigin = process.env.ECOSYSTEM_HELPER_ORIGIN;
if (helperOrigin) {
  const url = new URL(helperOrigin);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      "Ecosystem browser checks require an explicit loopback Helper origin.",
    );
}
const helper = helperOrigin ? new URL("/tools", helperOrigin).href : "";
const artifacts = "artifacts/ecosystem-growth-20261022";
test.skip(
  !helperOrigin,
  "Set ECOSYSTEM_HELPER_ORIGIN to the isolated Helper preview before running cross-product checks.",
);

test("resource and quest discovery pages fit desktop and mobile without hydration errors", async ({
  page,
}) => {
  test.setTimeout(240000);
  await mkdir(artifacts, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydration|hydrated|didn't match/i.test(message.text()))
      errors.push(message.text());
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const [name, path] of [
      ["tools", "/addons"],
      ["updates", "/updates"],
      ["contribute", "/contribute"],
      ["quests", `${helper}/forever/encyclopedia/quests`],
    ] as const) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} ${width}`,
      ).toBe(true);
      await page.screenshot({
        path: `${artifacts}/${name}-${width}-latest.png`,
        fullPage: true,
        caret: "initial",
      });
      if (name === "quests") {
        await expect(
          page.getByRole("searchbox", { name: "Quest name or ID" }),
        ).toBeVisible();
        const box = await page
          .getByRole("searchbox", { name: "Quest name or ID" })
          .boundingBox();
        expect(box!.y).toBeLessThan(960);
      }
      if (width === 390) {
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          scan.violations.map((violation) => ({
            id: violation.id,
            targets: violation.nodes.map((node) => node.target),
          })),
          name,
        ).toEqual([]);
      }
    }
  }
  await page.goto(`${helper}/forever/encyclopedia/quests?q=A+Threat+Within`);
  await expect(page.locator("#quest-directory-title")).toHaveText(
    "1 matching quests",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page
    .getByRole("link", { name: "A Threat Within", exact: true })
    .click();
  const host = page.getByRole("link", { name: "Host this plan", exact: true });
  await expect(host).toBeVisible();
  const url = new URL((await host.getAttribute("href"))!);
  expect(decodeToolGroupDraft(url.searchParams.get("draft"))).toMatchObject({
    kind: "quest",
    faction: "Alliance",
    label: "A Threat Within",
  });
  expect(
    (
      await page.goto(`${helper}/forever/encyclopedia/quests/page/99999`)
    )?.status(),
  ).toBe(404);
  expect(errors).toEqual([]);
});

test("a saved market watchlist remains usable during data outages and synchronizes removal across tabs", async ({
  page,
  context,
}) => {
  await context.addInitScript(
    ({ port }) => {
      if (
        location.port === port &&
        !sessionStorage.getItem("watchlist-fixture-loaded")
      ) {
        localStorage.setItem(
          "wow-trader-market-watchlist-v1",
          JSON.stringify([
            {
              product: "wow_classic_beta",
              market: "GLOBAL|ClassicBetaPvP|alliance",
              itemId: 2447,
              name: "Peacebloom",
            },
            {
              product: "wow_classic_beta",
              market: "GLOBAL|ClassicBetaPvP|horde",
              itemId: 2447,
              name: "Peacebloom",
            },
          ]),
        );
        sessionStorage.setItem("watchlist-fixture-loaded", "true");
      }
    },
    { port: new URL(helper).port },
  );
  await page.goto(`${helper}/forever/trader?mode=items`);
  await page.locator(".market-watchlist summary").click();
  await expect(page.locator(".market-watchlist li")).toHaveCount(2);
  const second = await context.newPage();
  await second.goto(`${helper}/forever/trader?mode=items`);
  await second.locator(".market-watchlist summary").click();
  await page
    .getByRole("button", {
      name: "Remove Peacebloom from GLOBAL|ClassicBetaPvP|alliance",
      exact: true,
    })
    .click();
  await expect(second.locator(".market-watchlist li")).toHaveCount(1);
  await expect(page.locator(".market-watchlist a")).toHaveAttribute(
    "href",
    /ClassicBetaPvP%7Chorde/,
  );
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${artifacts}/watchlist-${width}.png`,
      fullPage: true,
      caret: "initial",
    });
  }
  await second.close();
  await page
    .getByRole("button", { name: "Clear watchlist", exact: true })
    .click();
  await expect(page.locator(".market-watchlist")).toContainText(
    "No watched items yet",
  );
  await page.reload();
  await expect(page.locator(".market-watchlist summary")).toContainText("(0)");
});

test("tool action counts require a successful explicit save and never a restored or failed save", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.ECOSYSTEM_TOOL_USAGE_LIVE !== "true",
    "Requires an isolated Helper preview with tool usage enabled as browser-test, never production data.",
  );
  test.setTimeout(120000);
  const reports: unknown[] = [];
  await context.route(
    "**/tools/api/v1/tool-usage",
    async (route): Promise<void> => {
      reports.push(route.request().postDataJSON() as unknown);
      const response = await route.fetch();
      expect(response.status()).toBe(204);
      await route.fulfill({ response });
    },
  );
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human?plan=questing`,
  );
  await page.waitForLoadState("networkidle");
  expect(reports).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute(
    "data-tool-usage-build",
    "browser-test",
  );
  const saveSetup = page.getByRole("button", {
    name: "Save as another character",
    exact: true,
  });
  await expect(saveSetup).toBeVisible();
  await saveSetup.click();
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).toEqual({
    schema: "tool-usage.v1",
    build: "browser-test",
    action: "leveling_setup_saved",
    edition: "forever",
    device: "desktop",
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(reports).toHaveLength(1);

  await page.goto(`${helper}/forever/leveling/routes/horde-orc?plan=questing`);
  await page.waitForLoadState("networkidle");
  await page.evaluate((): void => {
    document.documentElement.dataset.toolUsageBuild = "browser-test";
    Storage.prototype.setItem = (): never => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Save as another character", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Browser storage is unavailable",
  );
  expect(reports).toHaveLength(1);
});

test("talent activation is recorded after a valid build save but not an empty build", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.ECOSYSTEM_TOOL_USAGE_LIVE !== "true",
    "Requires an isolated Helper preview with tool usage enabled as browser-test and a published test talent fixture.",
  );
  test.setTimeout(120000);
  const reports: unknown[] = [];
  await context.route(
    "**/tools/api/v1/tool-usage",
    async (route): Promise<void> => {
      reports.push(route.request().postDataJSON() as unknown);
      const response = await route.fetch();
      expect(response.status()).toBe(204);
      await route.fulfill({ response });
    },
  );
  await page.goto(`${helper}/forever/encyclopedia/talents/warrior`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute(
    "data-tool-usage-build",
    "browser-test",
  );
  const saveBuild = page.getByRole("button", {
    name: "Save locally",
    exact: true,
  });
  await expect(saveBuild).toBeVisible();
  await saveBuild.click();
  await expect(page.locator(".forever-calculator-message")).toContainText(
    "Spend at least one point",
  );
  expect(reports).toEqual([]);
  await page.locator("button.forever-talent-node.available").first().click();
  await saveBuild.click();
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).toMatchObject({
    schema: "tool-usage.v1",
    action: "talent_build_saved",
    edition: "forever",
  });
});

test("a real immutable engine reports completion through its host without counting readiness or rapid repeats", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.ECOSYSTEM_SIMULATOR_USAGE_LIVE !== "true",
    "Requires the isolated measurement-enabled Helper preview and a freshly compiled engine bridge, never a production selection.",
  );
  test.setTimeout(180000);
  const reports: unknown[] = [];
  await context.route(
    "**/tools/api/v1/tool-usage",
    async (route): Promise<void> => {
      reports.push(route.request().postDataJSON() as unknown);
      const response = await route.fetch();
      expect(response.status()).toBe(204);
      await route.fulfill({ response });
    },
  );
  await page.addInitScript((): void => {
    const counter = window as Window & { completedSimulations?: number };
    counter.completedSimulations = 0;
    window.addEventListener("message", (event: MessageEvent<unknown>): void => {
      if (
        event.origin !== location.origin ||
        !event.data ||
        typeof event.data !== "object" ||
        !("type" in event.data) ||
        event.data.type !== "kfc-simulation-completed"
      )
        return;
      counter.completedSimulations = (counter.completedSimulations ?? 0) + 1;
    });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${helper}/forever/simulator/feral-tank-druid`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-tool-usage-build",
    "browser-test",
  );
  const engine = page.frameLocator(".forever-simulator-frame iframe");
  await expect(engine.locator(".dps-action")).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".simulator-loading")).toBeHidden({
    timeout: 30000,
  });
  expect(reports).toEqual([]);
  await engine.locator("#simui-iterations").fill("10");
  await engine.locator("#simui-iterations").dispatchEvent("change");
  const completed = (): Promise<number> =>
    page.evaluate(
      () =>
        (window as Window & { completedSimulations?: number })
          .completedSimulations ?? 0,
    );
  await engine.locator(".dps-action").click();
  await expect.poll(completed, { timeout: 60000 }).toBe(1);
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).toEqual({
    schema: "tool-usage.v1",
    build: "browser-test",
    action: "simulation_completed",
    edition: "forever",
    device: "desktop",
  });
  await engine.locator(".dps-action").click();
  await expect.poll(completed, { timeout: 60000 }).toBe(2);
  await page.waitForLoadState("networkidle");
  expect(reports).toHaveLength(1);
  await mkdir(artifacts, { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    if (width <= 390) {
      await engine
        .locator('.kfc-mobile-nav [aria-controls="kfc-simulation-panel"]')
        .click();
      await expect(engine.locator(".kfc-run-status")).toHaveText(
        "Run complete",
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${artifacts}/simulator-usage-${width}.png`,
      fullPage: true,
      caret: "initial",
    });
  }
});
