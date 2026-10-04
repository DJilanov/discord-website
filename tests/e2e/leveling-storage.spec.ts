import { test, expect } from "@playwright/test";

const helper = process.env.LEVELING_TEST_HELPER ?? "http://127.0.0.1:3000";
const chapter =
  "/forever/leveling/routes/alliance-human/chapters/chapter-125-13-15-westfall?edition=kfc";

test("legacy comparison imports explicitly and never overwrites the original character-independent save", async ({
  page,
}) => {
  await page.goto(`${helper}${chapter}`);
  await page
    .getByText("Open advanced XP / full-trip comparison", { exact: true })
    .click();
  await page
    .getByLabel("Current XP into this level", { exact: true })
    .fill("400");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem(
              "kfc-leveling:alliance-westfall-13-15:0.1.0",
            ) ?? "{}",
          ).fields?.currentXp,
      ),
    )
    .toBe("400");
  await page.goto(`${helper}/forever/leveling`);
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Speed/ }).click();
  await page.getByRole("link", { name: /Open KFC preview/ }).click();
  await page
    .getByText("Open advanced XP / full-trip comparison", { exact: true })
    .click();
  await expect(
    page.getByLabel("Current XP into this level", { exact: true }),
  ).toHaveValue("0");
  await page
    .getByRole("button", { name: "Load legacy Westfall comparison" })
    .click();
  await expect(
    page.getByLabel("Current XP into this level", { exact: true }),
  ).toHaveValue("400");
  await page
    .getByLabel("Current XP into this level", { exact: true })
    .fill("700");
  await page.reload();
  await page
    .getByText("Open advanced XP / full-trip comparison", { exact: true })
    .click();
  await expect(
    page.getByLabel("Current XP into this level", { exact: true }),
  ).toHaveValue("700");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("kfc-leveling:alliance-westfall-13-15:0.1.0") ??
            "{}",
        ).fields.currentXp,
    ),
  ).toBe("400");
});

test("storage-denied browsers remain usable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function (): never {
      throw new Error("storage denied by fixture");
    };
    Storage.prototype.setItem = function (): never {
      throw new Error("storage denied by fixture");
    };
  });
  await page.goto(`${helper}/forever/leveling`);
  await expect(page.getByRole("status")).toContainText(
    "Browser storage is unavailable",
  );
  await page
    .getByRole("button", { name: /Choose your faction Alliance/ })
    .click();
  await page.getByRole("button", { name: "Choose playstyle" }).click();
  await page.getByRole("button", { name: /^Chill/ }).click();
  await page.getByRole("link", { name: /Open KFC preview/ }).click();
  const first = page
    .getByRole("checkbox", { name: /^Mark .* complete$/ })
    .first();
  await first.check();
  await expect(first).toBeChecked();
});

test("corrupt saved data is not silently replaced by browsing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kfc-leveling:characters:v1",
      "{broken-saved-workspace",
    );
  });
  await page.goto(`${helper}/forever/leveling`);
  await expect(page.getByRole("status")).toContainText(
    "It has not been overwritten",
  );
  await page.goto(`${helper}${chapter}`);
  await expect(
    page.getByRole("heading", { name: "The current quest list" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kfc-leveling:characters:v1"),
    ),
  ).toBe("{broken-saved-workspace");
});

test("a shared setup stays refreshable when browser persistence is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function (): never {
      throw new Error("storage denied by fixture");
    };
    Storage.prototype.setItem = function (): never {
      throw new Error("storage denied by fixture");
    };
  });
  const url = new URL(`${helper}/forever/leveling/routes/horde-orc`);
  url.searchParams.set(
    "setup",
    JSON.stringify({
      faction: "horde",
      raceId: "orc",
      classSlug: null,
      level: null,
      xpRate: null,
      pace: "relaxed",
      party: {
        size: 1,
        readiness: "recruiting",
        tank: "unknown",
        healer: "unknown",
      },
    }),
  );
  await page.goto(url.toString());
  await expect(page.getByText("Chill · Solo", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/setup=/);
  await page.reload();
  await expect(page.getByText("Chill · Solo", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save as another character" }),
  ).toHaveCount(0);
});
