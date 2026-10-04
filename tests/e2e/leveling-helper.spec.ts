import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const helper = process.env.LEVELING_TEST_HELPER ?? "http://127.0.0.1:3000";
const chapterPath =
  "/forever/leveling/routes/alliance-human/chapters/chapter-125-13-15-westfall?edition=kfc";

test("leveling setup, preserved list, local progress and independent characters", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${helper}/forever/leveling`);
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where does your story begin?" }),
  ).toBeVisible();
  await page.getByLabel("Class", { exact: false }).selectOption("mage");
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Speed/ }).click();
  await expect(page).toHaveURL(/\/routes\/alliance-human$/);
  await expect(
    page.getByRole("heading", { name: "Your chapter path" }),
  ).toBeVisible();
  await expect(page.getByText("1–6", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: /Open KFC preview/ }).click();
  await expect(page).toHaveURL(`${helper}${chapterPath}`);
  await expect(
    page.getByRole("heading", { name: "The current quest list" }),
  ).toBeVisible();
  const checks = page.getByRole("checkbox", { name: /^Mark .* complete$/ });
  expect(await checks.count()).toBeGreaterThan(5);
  await checks.first().check();
  await page.reload();
  await expect(checks.first()).toBeChecked();
  await page
    .getByRole("button", { name: /^Skip / })
    .nth(1)
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Skipped steps|Keep the prerequisite/ }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Hide completed" }).check();
  await expect(page.getByText(/1 \/ \d+ steps done/)).toBeVisible();
  await page.goto(`${helper}/forever/leveling`);
  await page.getByRole("button", { name: /Choose your faction Horde/ }).click();
  await page.getByRole("button", { name: /^Skyborne/ }).click();
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Chill/ }).click();
  await expect(
    page.getByRole("heading", { name: /^Continue in/ }),
  ).toBeVisible();
  await expect(page.getByText("1–12", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: /Chapter 01.*1–12/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "The current quest list",
    }),
  ).toBeVisible();
  await page.goto(`${helper}/forever/leveling`);
  await page
    .getByLabel("Saved character")
    .selectOption({ label: "1. Human · Mage" });
  await page.getByRole("link", { name: "Resume my route" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${chapterPath.replaceAll("?", "\\?")}#route-`),
  );
  await expect(checks.first()).toBeChecked();
  expect(errors).toEqual([]);
});

test("group readiness, editing pace, wizard Back and share refresh do not leak or erase progress", async ({
  page,
}) => {
  await page.goto(`${helper}/forever/leveling`);
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  await page.getByRole("button", { name: /^Dwarf/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Dwarf/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Group/ }).click();
  await page
    .getByRole("combobox", { name: "Players", exact: true })
    .selectOption("2");
  await expect(
    page.getByText("Friends, not yet a full dungeon party."),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Players", exact: true })
    .selectOption("5");
  await page.getByLabel("Are you together?").selectOption("together");
  await page.getByLabel("Can someone tank?").selectOption("yes");
  await page.getByLabel("Can someone heal?").selectOption("yes");
  await page
    .getByRole("combobox", { name: "Pace", exact: true })
    .selectOption("relaxed");
  await page.reload();
  await expect(page.getByLabel("Can someone heal?")).toHaveValue("yes");
  await expect(
    page.getByRole("combobox", { name: "Pace", exact: true }),
  ).toHaveValue("relaxed");
  await page.getByRole("button", { name: "Show our chapters" }).click();
  await expect(
    page.getByRole("heading", { name: "Five together, ready to explore" }),
  ).toBeVisible();
  await expect(page.getByText("14–15", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Change setup" }).click();
  await page.getByRole("button", { name: /^Speed/ }).click();
  await expect(
    page.getByText("Speed · 5 players", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Share setup" }).click();
  const sharedUrl = await page.getByLabel("Setup link").inputValue();
  const shared = JSON.parse(
    new URL(sharedUrl).searchParams.get("setup") ?? "{}",
  );
  expect(shared.party.size).toBe(5);
  expect(shared.progress).toBeUndefined();
  await page.goto(sharedUrl);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kfc-leveling:characters:v1") ?? "{}")
            .sessions?.length,
      ),
    )
    .toBe(2);
  await expect(page).not.toHaveURL(/setup=/);
  await page.reload();
  await expect(
    page.getByText("Speed · 5 players", { exact: true }),
  ).toBeVisible();
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kfc-leveling:characters:v1") ?? "{}")
        .sessions.length,
  );
  expect(count).toBe(2);
  await page.getByRole("link", { name: "Change setup" }).click();
  await page.getByRole("button", { name: /^Group/ }).click();
  await page
    .getByRole("combobox", { name: "Players", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Show our chapters" }).click();
  await expect(page.getByText("Speed · Solo", { exact: true })).toBeVisible();
  await page.goto(`${helper}/forever/leveling`);
  await page.getByRole("button", { name: /Choose your faction Horde/ }).click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Choose your side." }),
  ).toBeVisible();
});

test("desktop/mobile layouts, accessibility, real icons, metadata and legacy deep links", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const response = await request.get(
    `${helper}/forever/encyclopedia/leveling/alliance/westfall-13-15?plan=kept`,
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(308);
  const destination = new URL(response.headers().location, helper);
  expect(destination.pathname).toBe(chapterPath.split("?")[0]);
  expect(destination.searchParams.get("edition")).toBe("kfc");
  expect(destination.searchParams.get("plan")).toBe("kept");
  for (const width of [360, 390, 768, 900, 1100, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const path of [
      "/forever/leveling",
      "/forever/leveling/routes/alliance-human",
      chapterPath,
    ]) {
      await page.goto(`${helper}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}: ${path}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${helper}/forever/leveling`);
  await page.locator("img").evaluateAll(async (images) => {
    for (const image of images)
      if (image instanceof HTMLImageElement) {
        image.loading = "eager";
        await image.decode();
      }
  });
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  for (const path of [
    null,
    "/forever/leveling/routes/alliance-human",
    chapterPath,
  ]) {
    if (path) await page.goto(`${helper}${path}`);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
  await page.goto(`${helper}${chapterPath}#route-accept-westfall`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://helper.kfcguild.online${chapterPath.split("?")[0]}`,
  );
  await page.goto(
    `${helper}/forever/leveling/routes/horde-orc/chapters/chapter-125-13-15-westfall`,
  );
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("community navigation exposes the same leveling destination without overflow", async ({
  page,
}) => {
  for (const width of [390, 1100, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/addons");
    if (width <= 1280)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page
        .getByRole("link", { name: "Leveling", exact: true })
        .filter({ visible: true }),
    ).toHaveAttribute(
      "href",
      "https://helper.kfcguild.online/forever/leveling",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
