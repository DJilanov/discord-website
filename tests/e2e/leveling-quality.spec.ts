import { expect, test, type Page } from "@playwright/test";

const helper = process.env.LEVELING_TEST_HELPER ?? "http://127.0.0.1:3000";
const chapter =
  "/forever/leveling/routes/alliance-human/chapters/chapter-115-1-6-northshire";
const original =
  "/forever/leveling/routes/alliance-human/chapters/chapter-125-13-15-westfall?edition=kfc";
const storage = "kfc-leveling:characters:v1";
const cards = "#leveling-quest-pane > ol > [data-reader-step]";

async function openReader(page: Page, path: string = chapter): Promise<void> {
  await page.goto(`${helper}${path}`);
  await page
    .getByRole("button", { name: "Save character & enable progress" })
    .click();
  if (path !== original) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Class", exact: true })
      .selectOption("warrior");
    await page.getByLabel("Known outdoor XP rate").selectOption("1");
    await page.getByRole("button", { name: "Close settings" }).click();
  }
}

test("Continue playing restores a later uncompleted instruction in a new tab and without URL history", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openReader(page);
  const row = page.locator(cards).nth(8);
  const id = await row.getAttribute("id");
  await row.getByRole("button", { name: /^Show source step/ }).click();
  await expect(row).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  const selected = await page
    .locator(`${cards}[data-selected=true]`)
    .getAttribute("id");
  expect(selected).not.toBe(id);
  await expect(
    page.locator(`${cards} input[type=checkbox]:checked`),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "← Chapters", exact: true }).click();
  const continuation = page.getByRole("link", {
    name: "Continue playing →",
    exact: true,
  });
  await expect(continuation).toHaveAttribute(
    "href",
    new RegExp(`#${selected}$`),
  );
  const fresh = await context.newPage();
  await fresh.goto(`${helper}${chapter}`);
  await expect(fresh.locator(`${cards}[data-selected=true]`)).toHaveAttribute(
    "id",
    selected!,
  );
  await expect(fresh).toHaveURL(new RegExp(`#${selected}$`));
  await expect(fresh.locator(`#${selected}`)).toBeInViewport();
  await fresh.reload();
  await expect(fresh.locator(`#${selected}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await fresh.close();
  expect(errors).toEqual([]);
});

for (const [edition, path] of [
  ["imported", chapter],
  ["original", original],
] as const) {
  test(`${edition}: Previous does not complete steps; Undo Done restores pending and skipped states`, async ({
    page,
  }) => {
    await openReader(page, path);
    const first = page.locator(cards).first();
    await first
      .getByRole("button", {
        name: /^(Select source step|Show source step|Show .* on map:)/,
      })
      .click();
    await expect(first).toHaveAttribute("data-selected", "true");
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await page
      .getByRole("button", { name: "Previous step", exact: true })
      .click();
    await expect(first).toHaveAttribute("data-selected", "true");
    await expect(first.getByRole("checkbox")).not.toBeChecked();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(first.getByRole("checkbox")).toBeChecked();
    await page.getByRole("button", { name: "Undo Done", exact: true }).click();
    await expect(first).toHaveAttribute("data-selected", "true");
    await expect(first.getByRole("checkbox")).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: "Undo Done", exact: true }),
    ).toBeDisabled();
    await first.getByRole("button", { name: /Skip/ }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Undo Done", exact: true }).click();
    await expect(first).toHaveAttribute("data-selected", "true");
    await expect(first.getByRole("button", { name: /^Skip / })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    await expect(first).toHaveAttribute("data-selected", "true");
    await expect(first.getByRole("checkbox")).not.toBeChecked();
  });
}

test("focus mode shows current plus next, persists larger text and keeps end-of-chapter review reachable", async ({
  page,
}) => {
  await openReader(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Reading mode", exact: true })
    .selectOption("focus");
  await page
    .getByRole("combobox", { name: "Text size", exact: true })
    .selectOption("large");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.locator(`${cards}:visible`)).toHaveCount(2);
  const first = await page
    .locator(`${cards}[data-selected=true]`)
    .getAttribute("id");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.locator(`${cards}:visible`)).toHaveCount(2);
  await expect(page.locator(`#${first}`)).not.toBeVisible();
  await page.reload();
  await expect(page.locator("[data-leveling-workspace]")).toHaveAttribute(
    "data-reader-text",
    "large",
  );
  await expect(page.locator(`${cards}:visible`)).toHaveCount(2);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Reading mode", exact: true })
    .selectOption("all");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page
    .locator(cards)
    .last()
    .getByRole("button", { name: /^(Select|Show) source step/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Review chapter", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your next move." }),
  ).toBeInViewport();
  await expect(page.locator("#chapter-handoff")).toContainText(
    "remain unfinished",
  );
  await expect(
    page.locator(`${cards} input[type=checkbox]:checked`),
  ).toHaveCount(0);
});

test("map zoom, fit, full-zone, dragging and keyboard marker reveal work without moving the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openReader(page);
  const withMarker = page.locator(cards).nth(8);
  await withMarker.getByRole("button", { name: /^Show source step/ }).click();
  const map = page.getByRole("region", { name: "Quest location map" });
  const svg = map.locator("svg[role=group]");
  await expect(svg.locator("[data-map-marker]").first()).toBeVisible();
  const initial = await svg.getAttribute("viewBox");
  await map.getByRole("button", { name: "Zoom in map" }).click();
  expect(await svg.getAttribute("viewBox")).not.toBe(initial);
  await map.getByRole("button", { name: "Full zone", exact: true }).click();
  const full = await svg.getAttribute("viewBox");
  expect(full).toMatch(/^0 0 /);
  await map.getByRole("button", { name: "Fit locations", exact: true }).click();
  expect(await svg.getAttribute("viewBox")).not.toBe(full);
  await svg.focus();
  const fitted = await svg.getAttribute("viewBox");
  await page.keyboard.press("ArrowRight");
  expect(await svg.getAttribute("viewBox")).not.toBe(fitted);
  const box = await svg.boundingBox();
  if (!box) throw new Error("Missing map box");
  const beforeDrag = await svg.getAttribute("viewBox");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60);
  await page.mouse.up();
  expect(await svg.getAttribute("viewBox")).not.toBe(beforeDrag);
  await page.setViewportSize({ width: 900, height: 960 });
  await page.getByRole("button", { name: "Map focus", exact: true }).click();
  const marker = svg.locator("[data-map-marker]").first();
  await marker.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Quest list focus", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(withMarker).toHaveAttribute("data-selected", "true");
  await expect(withMarker).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("private export/import requires confirmation and never restores an intentionally undone tick", async ({
  page,
}) => {
  await openReader(page);
  const completedId = await page
    .locator(`${cards}[data-selected=true]`)
    .getAttribute("id");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const old = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    storage,
  );
  await page.getByRole("button", { name: "Undo Done", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText("Progress backup & restore", { exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export progress", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^kfc-leveling-.*\.json$/);
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    storage,
  );
  const backup = {
    format: "kfc-leveling-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: old,
  };
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("button", { name: "Import and merge backup" }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storage)).toBe(
    before,
  );
  await page.getByRole("button", { name: "Import and merge backup" }).click();
  await expect(
    page.getByText("Backup imported and saved to this browser.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(
    page.locator(`#${completedId}`).getByRole("checkbox"),
  ).not.toBeChecked();
});

test("a failed report retains text and retries the same private-context submission ID", async ({
  page,
}) => {
  await openReader(page);
  const submissions: Record<string, unknown>[] = [];
  await page.route("**/api/v1/leveling-feedback", async (route) => {
    submissions.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: submissions.length === 1 ? 503 : 201,
      contentType: "application/json",
      body: JSON.stringify(
        submissions.length === 1
          ? { error: "feedback_unavailable" }
          : {
              reportId: "00000000-0000-4000-8000-000000000001",
              status: "received",
            },
      ),
    });
  });
  const row = page.locator(cards).first();
  await row
    .getByText("Report a problem with this step", { exact: true })
    .click();
  const text = row.getByLabel("What went wrong?");
  await text.fill("The displayed coordinates do not match the instruction.");
  await row.getByRole("button", { name: "Send report", exact: true }).click();
  await expect(row).toContainText("Report was not confirmed");
  await expect(text).toHaveValue(
    "The displayed coordinates do not match the instruction.",
  );
  await row.getByRole("button", { name: "Send report", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Report received", exact: true }),
  ).toBeDisabled();
  expect(submissions).toHaveLength(2);
  expect(submissions[0]!.submissionId).toBe(submissions[1]!.submissionId);
  expect(Object.keys(submissions[0]!).sort()).toEqual([
    "category",
    "message",
    "position",
    "profile",
    "submissionId",
  ]);
  expect(submissions[0]).not.toHaveProperty("progress");
  expect(submissions[0]).not.toHaveProperty("sessionId");
});
