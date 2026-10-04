import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const helper = process.env.LEVELING_TEST_HELPER ?? "http://127.0.0.1:3000";
const chapter =
  "/forever/leveling/routes/alliance-human/chapters/chapter-115-1-6-northshire";
const original =
  "/forever/leveling/routes/alliance-human/chapters/chapter-125-13-15-westfall?edition=kfc";

async function openReader(page: Page): Promise<void> {
  await page.goto(`${helper}${chapter}`);
  await page
    .getByRole("button", { name: "Save character & enable progress" })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Class", exact: true })
    .selectOption("warrior");
  await page.getByLabel("Known outdoor XP rate").selectOption("1");
  await page.getByRole("button", { name: "Close settings" }).click();
}

test("desktop map stays fixed while lower quest selection, checkboxes and links keep list scroll independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openReader(page);
  const map = page.getByRole("region", { name: "Quest location map" });
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const before = await map.boundingBox();
  const button = pane
    .getByRole("button", { name: /^Show source step .* on map:/ })
    .nth(8);
  await button.scrollIntoViewIfNeeded();
  const row = button.locator("xpath=ancestor::li[1]");
  const beforeScroll = await pane.evaluate((element) => element.scrollTop);
  expect(beforeScroll).toBeGreaterThan(500);
  await button.click();
  await expect(row).toHaveAttribute("data-selected", "true");
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeEnabled();
  await expect(map.locator("circle[data-location-id]").first()).toBeVisible();
  expect(await pane.evaluate((element) => element.scrollTop)).toBeCloseTo(
    beforeScroll,
    0,
  );
  expect(await map.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const firstRow = pane.locator("[data-reader-step]").first();
  const firstCheck = firstRow.getByRole("checkbox");
  await firstCheck.check();
  await expect(row).toHaveAttribute("data-selected", "true");
  await expect(firstRow).toHaveAttribute("data-selected", "false");
  const questRow = pane
    .locator("[data-reader-step]")
    .filter({ has: page.getByRole("link", { name: /^Quest .* on Wowhead/ }) })
    .first();
  const link = questRow
    .getByRole("link", { name: /^Quest .* on Wowhead/ })
    .first();
  await page
    .context()
    .route("https://www.wowhead.com/**", (route) =>
      route.fulfill({ status: 200, body: "Quest reference" }),
    );
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await popup.close();
  await expect(row).toHaveAttribute("data-selected", "true");
  const backgroundRow = pane.locator("[data-reader-step]").nth(2);
  await backgroundRow.locator("p").first().click();
  await expect(backgroundRow).toHaveAttribute("data-selected", "true");
  await expect(row).toHaveAttribute("data-selected", "false");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("data-selected", "true");
  expect(errors).toEqual([]);
});

test("Next step does not complete a card, while Done completes it and advances with a persistent anchor", async ({
  page,
}) => {
  await openReader(page);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const next = page.getByRole("button", { name: "Next step", exact: true });
  const done = page.getByRole("button", { name: "Done", exact: true });
  const first = pane.locator("[data-reader-step]").first();
  const second = pane.locator("[data-reader-step]").nth(1);
  // Resolving the class can reveal an optional instruction before the persisted reading position.
  await first
    .getByRole("button", { name: /^(Select|Show) source step/ })
    .click();
  await expect(first).toHaveAttribute("data-selected", "true");
  await first.getByRole("checkbox").check();
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(done).toBeDisabled();
  await next.click();
  await expect(second).toHaveAttribute("data-selected", "true");
  await expect(second.getByRole("checkbox")).not.toBeChecked();
  await expect(done).toBeEnabled();
  const lower = pane
    .getByRole("button", { name: /^Show source step .* on map:/ })
    .nth(6);
  const lowerRow = lower.locator("xpath=ancestor::li[1]");
  const id = await lowerRow.getAttribute("id");
  await lower.click();
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  await page.reload();
  await expect(lowerRow).toHaveAttribute("data-selected", "true");
  await expect(lower).toBeInViewport();
  await expect(first.getByRole("checkbox")).toBeChecked();
  const following = lowerRow.locator("xpath=following-sibling::li[1]");
  const followingId = await following.getAttribute("id");
  await next.click();
  await expect(lowerRow.getByRole("checkbox")).not.toBeChecked();
  await expect(following).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(new RegExp(`#${followingId}$`));
  await expect(following).toBeInViewport();
  const afterDone = following.locator("xpath=following-sibling::li[1]");
  const afterDoneId = await afterDone.getAttribute("id");
  await done.click();
  await expect(following.getByRole("checkbox")).toBeChecked();
  await expect(afterDone).toHaveAttribute("data-selected", "true");
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`#${afterDoneId}$`));
  await expect(afterDone).toHaveAttribute("data-selected", "true");
  await expect(following.getByRole("checkbox")).toBeChecked();
  await expect(lowerRow.getByRole("checkbox")).not.toBeChecked();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("Elwynn step 51 advances from that position without jumping to the beginning, across undo, hiding completed and refresh", async ({
  page,
}) => {
  await openReader(page);
  await page.goto(
    `${helper}/forever/leveling/routes/alliance-human/chapters/chapter-116-6-11-elwynn-forest#guide-source-step-0051`,
  );
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const current = pane.locator("#guide-source-step-0051");
  const nextId = await current
    .locator("xpath=following-sibling::li[1]")
    .getAttribute("id");
  const next = pane.locator(`#${nextId}`);
  const advance = page.getByRole("button", { name: "Next step", exact: true });
  const done = page.getByRole("button", { name: "Done", exact: true });
  await expect(current).toHaveAttribute("data-selected", "true");
  await advance.click();
  await expect(next).toHaveAttribute("data-selected", "true");
  await expect(next).toBeInViewport();
  await expect(current.getByRole("checkbox")).not.toBeChecked();
  await expect(
    pane.locator("[data-reader-step]").first().getByRole("checkbox"),
  ).not.toBeChecked();
  await current
    .getByRole("button", {
      name: /^(Show source step .* on map|Select source step \d+):/,
    })
    .click();
  await done.click();
  await expect(current.getByRole("checkbox")).toBeChecked();
  await expect(next).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(new RegExp(`#${nextId}$`));
  await current.getByRole("checkbox").uncheck();
  await expect(next).toHaveAttribute("data-selected", "true");
  await current.getByRole("checkbox").check();
  await page
    .getByRole("checkbox", { name: "Hide completed", exact: true })
    .check();
  await expect(current).toHaveCount(0);
  await expect(next).toHaveAttribute("data-selected", "true");
  await page.reload();
  await expect(pane.locator(`#${nextId}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(pane.locator(`#${nextId}`)).toBeInViewport();
  await expect(advance).toBeEnabled();
  await expect(done).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Follow next step" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Resume next step ↓" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("Done on the final step completes it without wrapping to earlier unfinished steps", async ({
  page,
}) => {
  await openReader(page);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const finalButton = pane
    .getByRole("button", {
      name: /^(Show source step .* on map|Select source step \d+):/,
    })
    .last();
  const finalId = await finalButton
    .locator("xpath=ancestor::li[1]")
    .getAttribute("id");
  const finalRow = pane.locator(`#${finalId}`);
  await finalButton.click();
  const next = page.getByRole("button", { name: "Next step", exact: true });
  const done = page.getByRole("button", { name: "Done", exact: true });
  await expect(next).toBeDisabled();
  await expect(done).toBeEnabled();
  await done.click();
  await expect(finalRow.getByRole("checkbox")).toBeChecked();
  await expect(finalRow).toHaveAttribute("data-selected", "true");
  await expect(done).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Hide completed", exact: true })
    .check();
  await expect(finalRow).toHaveCount(0);
  await expect(
    pane.locator('[data-reader-step][data-selected="true"]'),
  ).toHaveCount(0);
  await expect(
    pane.locator("[data-reader-step]").first().getByRole("checkbox"),
  ).not.toBeChecked();
  await expect(next).toBeDisabled();
  await expect(done).toBeDisabled();
  await page.reload();
  await expect(pane.locator(`#${finalId}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(next).toBeDisabled();
  await expect(done).toBeDisabled();
});

test("responsive split and map/list focus retain scroll and progress, and non-reader pages keep their frame", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openReader(page);
  const map = page.getByRole("region", { name: "Quest location map" });
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [768, 900],
    [1024, 768],
    [1051, 800],
    [1440, 900],
    [900, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(map).toBeInViewport();
    const canvasBox = await map.locator("svg[role=group]").boundingBox();
    expect(canvasBox?.height).toBeGreaterThan(
      height >= 768 && width <= 600 ? 100 : 0,
    );
    await expect(pane).toBeVisible();
    expect(
      await page
        .locator(".site-header-inner")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
    await pane.evaluate((element) => {
      element.scrollTop = 700;
    });
    const before = await map.boundingBox();
    await pane.evaluate((element) => {
      element.scrollTop += 200;
    });
    expect(await map.boundingBox()).toEqual(before);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const scroll = await pane.evaluate((element) => element.scrollTop);
  await page.getByRole("button", { name: "Map focus", exact: true }).click();
  await expect(map).toBeVisible();
  await expect(pane).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Quest list focus", exact: true })
    .click();
  await expect(map).not.toBeVisible();
  await expect(pane).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeVisible();
  expect(await pane.evaluate((element) => element.scrollTop)).toBe(scroll);
  await page.getByRole("button", { name: "Split view", exact: true }).click();
  await expect(map).toBeVisible();
  await page.getByRole("link", { name: "← Chapters", exact: true }).click();
  await expect(page.locator("[data-leveling-workspace]")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toBeVisible();
  expect(
    await page
      .locator(".page-frame")
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThan(390);
});

test("mobile map focus can advance, then reveals the selected step when the quest pane is reopened", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openReader(page);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const current = pane.locator("[data-reader-step]").nth(8);
  await current
    .getByRole("button", {
      name: /^(Show source step .* on map|Select source step \d+):/,
    })
    .click();
  const next = current.locator("xpath=following-sibling::li[1]");
  const nextId = await next.getAttribute("id");
  await page.getByRole("button", { name: "Map focus", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#${nextId}$`));
  await page
    .getByRole("button", { name: "Quest list focus", exact: true })
    .click();
  await expect(next).toHaveAttribute("data-selected", "true");
  await expect(next).toBeInViewport();
  await expect(current.getByRole("checkbox")).not.toBeChecked();
  const afterDone = next.locator("xpath=following-sibling::li[1]");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(next.getByRole("checkbox")).toBeChecked();
  await expect(afterDone).toHaveAttribute("data-selected", "true");
  await expect(afterDone).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("the original edition uses the same separate Next step and Done actions", async ({
  page,
}) => {
  await openReader(page);
  await page.goto(`${helper}${original}`);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const first = pane.locator("[data-reader-step]").first();
  const second = pane.locator("[data-reader-step]").nth(1);
  const third = pane.locator("[data-reader-step]").nth(2);
  await expect(first).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(first.getByRole("checkbox")).not.toBeChecked();
  await expect(second).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(second.getByRole("checkbox")).toBeChecked();
  await expect(third).toHaveAttribute("data-selected", "true");
  await page.reload();
  await expect(third).toHaveAttribute("data-selected", "true");
  await expect(second.getByRole("checkbox")).toBeChecked();
  await expect(first.getByRole("checkbox")).not.toBeChecked();
});

test("unsaved visitors may browse with Next step but cannot complete a character's steps", async ({
  page,
}) => {
  await page.goto(`${helper}${chapter}`);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  const first = pane.locator("[data-reader-step]").first();
  const second = pane.locator("[data-reader-step]").nth(1);
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(second).toHaveAttribute("data-selected", "true");
  await expect(first.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeDisabled();
});

test("original preview uses the same workspace and its calculator deep links scroll only the quest pane", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${helper}${original}#planner`);
  const pane = page.getByRole("region", { name: "Scrollable quest list" });
  await expect(
    page.getByLabel("Current XP into this level", { exact: true }),
  ).toBeVisible();
  expect(await pane.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    500,
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const map = page.getByRole("region", { name: "Quest location map" });
  await expect(map).toBeInViewport();
  const before = await map.boundingBox();
  await pane
    .getByRole("button", { name: /^Show .* on map:/ })
    .last()
    .click();
  expect(await map.boundingBox()).toEqual(before);
  await expect(map.locator("circle[data-location-id]").first()).toBeVisible();
  await page.getByRole("link", { name: "Optional dungeon comparison" }).click();
  await expect(
    page.getByRole("heading", { name: "Would a dungeon suit this session?" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("settings keyboard dismissal and workspace accessibility remain usable", async ({
  page,
}) => {
  await openReader(page);
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await settings.click();
  await expect(
    page.getByRole("dialog", { name: "Chapter settings & evidence" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(settings).toBeFocused();
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
