import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const helper = process.env.LEVELING_TEST_HELPER ?? "http://127.0.0.1:3000";
const races = [
  "alliance-human",
  "alliance-dwarf",
  "alliance-gnome",
  "alliance-night-elf",
  "alliance-skyborne",
  "horde-orc",
  "horde-troll",
  "horde-tauren",
  "horde-undead",
  "horde-skyborne",
];

test("every faction/race has readable starters and the full endgame source", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  for (const race of races) {
    await page.goto(`${helper}/forever/leveling/routes/${race}`);
    await expect(
      page.getByRole("heading", { name: "Your chapter path" }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Class", exact: true })
      .selectOption("warrior");
    await page
      .getByLabel("Outdoor XP-rate multiplier", { exact: false })
      .selectOption("1");
    await page.getByRole("link", { name: /Chapter 01/ }).click();
    await expect(
      page.getByRole("heading", { name: "The current quest list" }),
    ).toBeVisible();
    await expect(page.getByText(/Authorized RestedXP source/)).toBeVisible();
    expect(
      await page
        .getByRole("checkbox", { name: /^Mark source step .* complete$/ })
        .count(),
    ).toBeGreaterThan(5);
    const id = race.startsWith("alliance")
      ? "chapter-47-59-60-winterspring-silithus-part-2"
      : "chapter-83-59-60-winterspring-silithus-ii";
    const response = await request.get(
      `${helper}/forever/leveling/routes/${race}/chapters/${id}`,
    );
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Full imported guide");
  }
});

test("imported progress, class/rate conditions, optional dungeons and legacy edition are independent", async ({
  page,
}) => {
  await page.goto(`${helper}/forever/leveling`);
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  await page.getByLabel("Class", { exact: false }).selectOption("mage");
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Speed/ }).click();
  await page.getByRole("link", { name: "Open current quest list" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Known outdoor XP rate").selectOption("1");
  await page.getByRole("button", { name: "Close settings" }).click();
  const progress = page
    .getByRole("checkbox", { name: /^Mark source step .* complete$/ })
    .first();
  await progress.check();
  await page.reload();
  await expect(progress).toBeChecked();
  await expect(
    page
      .getByRole("link", { name: "Quest 783 on Wowhead (opens in a new tab)" })
      .first(),
  ).toHaveAttribute("href", "https://www.wowhead.com/forever/quest=783");
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-128-19-20-redridge`,
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByText("Optional dungeon branches · off by default", { exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "DM", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "DM", exact: true }).check();
  await expect(
    page.getByRole("checkbox", { name: "DM", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-125-13-15-westfall`,
  );
  await page
    .getByRole("link", { name: "Original KFC preview & calculator" })
    .click();
  await expect(page).toHaveURL(/edition=kfc/);
  await expect(page.getByText(/0 \/ 31 steps done/)).toBeVisible();
});

test("endgame filters, world coordinates, mobile layout and imported reader accessibility", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto(`${helper}/forever/leveling/routes/horde-skyborne`);
  await page
    .getByRole("combobox", { name: "Level bracket", exact: true })
    .selectOption("41");
  await expect(page.getByRole("link", { name: /59–60/ })).toBeVisible();
  const start = `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-115-1-6-northshire`;
  for (const width of [360, 390, 900, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(start);
    await expect(
      page.getByRole("heading", { name: "The current quest list" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByText(/Locations & path/)
    .first()
    .click();
  await expect(
    page.getByText(/world coordinates, not map %/).first(),
  ).toBeVisible();
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});

test("native zone artwork, projected circles, map selection and completion undo work together", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-115-1-6-northshire`,
  );
  const initialMap = page.getByRole("region", { name: "Quest location map" });
  await expect(
    initialMap.getByText("Loading native zone artwork…"),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    initialMap.getByText("Loading native zone artwork…"),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Save character & enable progress" })
    .click();
  const unresolved = page.locator("details").filter({
    has: page.locator("summary", { hasText: /^Unresolved source steps/ }),
  });
  await unresolved.locator("summary").first().click();
  await expect(
    unresolved.getByRole("checkbox", { name: /^Mark source step/ }).first(),
  ).toBeDisabled();
  await unresolved.locator("summary").first().click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Class", exact: true })
    .selectOption("warrior");
  await page.getByLabel("Known outdoor XP rate").selectOption("1");
  await page.getByRole("button", { name: "Close settings" }).click();
  const map = page.getByRole("region", { name: "Quest location map" });
  await expect(
    map.getByRole("combobox", { name: "Zone map", exact: true }),
  ).toHaveValue("1429");
  await page
    .getByRole("button", { name: /^Show source step .* on map:/ })
    .first()
    .click();
  await expect(
    map.getByRole("heading", { name: /^Where to go/ }),
  ).toBeInViewport();
  await expect(map.locator("circle[data-location-id]").first()).toBeVisible();
  await expect(map.getByText("Loading native zone artwork…")).not.toBeVisible();
  expect(await map.locator("svg image").count()).toBeGreaterThan(1);
  expect(await map.locator("g[data-map-overlay]").count()).toBeGreaterThan(0);
  const revealImage = map.locator("g[data-map-overlay] image").first();
  const revealURL = await revealImage.getAttribute("href");
  expect(revealURL).toContain("/api/forever-map-media/");
  const revealResponse = await page.request.get(`${helper}${revealURL}`);
  expect(revealResponse.status()).toBe(200);
  expect(revealResponse.headers()["content-type"]).toBe("image/png");
  const firstImage = map.locator("svg image").first();
  const imageURL = await firstImage.getAttribute("href");
  expect(imageURL).toContain("/api/forever-map-media/");
  const image = await page.request.get(`${helper}${imageURL}`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  const progress = page
    .getByRole("checkbox", { name: /^Mark source step .* complete$/ })
    .filter({ visible: true })
    .first();
  await progress.check();
  await expect(progress).toBeChecked();
  await progress.uncheck();
  await page.reload();
  await expect(progress).not.toBeChecked();
  const progressRowId = await progress
    .locator("xpath=ancestor::li[1]")
    .getAttribute("id");
  const skip = page.locator(`#${progressRowId}`).getByRole("button", {
    name: /^(Skip|Undo skip) source step/,
  });
  await skip.click();
  await expect(progress).not.toBeChecked();
  await expect(skip).toHaveAttribute("aria-pressed", "true");
  await skip.click();
  await expect(skip).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("missing native map media is explicit and does not block completing a guide step", async ({
  page,
}) => {
  await page.route("**/api/forever-map-media/**", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-115-1-6-northshire`,
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Some map tiles could not be loaded" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save character & enable progress" })
    .click();
  const finish = page
    .getByRole("checkbox", { name: /^Mark source step .* complete$/ })
    .first();
  await finish.check();
  await expect(finish).toBeChecked();
  await expect(
    page
      .getByRole("link", { name: "Quest 783 on Wowhead (opens in a new tab)" })
      .first(),
  ).toHaveAttribute("href", "https://www.wowhead.com/forever/quest=783");
});
