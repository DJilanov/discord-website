import "../../scripts/env";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { hash } from "bcryptjs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { db } from "../../lib/db";
const password = randomBytes(24).toString("hex");
const owner = "auction-e2e-owner@example.invalid",
  moderator = "auction-e2e-moderator@example.invalid",
  editor = "auction-e2e-editor@example.invalid";
test.beforeAll(async (): Promise<void> => {
  if (new URL(process.env.DATABASE_URL ?? "").port !== "55432")
    throw new Error("Isolated local database required.");
  if (await db.foreverAuctionConfig.findUnique({ where: { id: "auction" } }))
    throw new Error(
      "Preserve existing Auction House configuration; use a fresh isolated database for this test.",
    );
  const passwordHash = await hash(password, 12);
  for (const [email, role] of [
    [owner, "owner"],
    [moderator, "moderator"],
    [editor, "editor"],
  ])
    await db.foreverUser.create({
      data: { email, name: "Auction browser test", role, passwordHash },
    });
  await mkdir("artifacts", { recursive: true });
});
test.afterAll(async (): Promise<void> => {
  const users = await db.foreverUser.findMany({
    where: { email: { in: [owner, moderator, editor] } },
  });
  await db.foreverAuditLog.deleteMany({
    where: {
      actorId: { in: users.map((u) => u.id) },
      action: "auction.configure",
    },
  });
  await db.foreverAuctionConfig.deleteMany({ where: { id: "auction" } });
  await db.foreverUser.deleteMany({
    where: { email: { in: [owner, moderator, editor] } },
  });
  await db.$disconnect();
});
async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test("admin gates, controls, concurrency, private defaults, desktop/mobile layout and accessibility", async ({
  page,
}): Promise<void> => {
  test.setTimeout(180000);
  expect((await page.request.get("/api/admin/auction")).status()).toBe(401);
  await login(page, owner);
  await page.goto("/admin/auction");
  await expect(
    page.getByRole("heading", { name: "Auction House", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Private preview", exact: true }),
  ).toBeChecked();
  await expect(page.getByText("No markets configured.")).toBeVisible();
  await page.getByRole("radio", { name: "Live", exact: true }).check();
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(page.locator(".auction-admin [role=alert]")).toContainText(
    "reviewed pilot",
  );
  await page
    .getByRole("radio", { name: "Private preview", exact: true })
    .check();
  await page.getByLabel("Destination forum ID").fill("1555101000000000001");
  await page.getByLabel("Minimum time between reports (hours)").fill("4");
  await page.getByLabel("Reports per market / 24 hours").fill("6");
  await page.getByLabel("Client build", { exact: true }).fill("70124");
  await page.getByLabel("Realm ID", { exact: true }).fill("TestRealm");
  await page.getByRole("button", { name: "Add market", exact: true }).click();
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Configuration saved.");
  const saved = await db.foreverAuctionConfig.findUniqueOrThrow({
    where: { id: "auction" },
  });
  const invalidOrigin = await page.request.post("/api/admin/auction", {
    headers: { Origin: "https://attacker.invalid" },
    data: { version: saved.version, settings: saved.settings },
  });
  expect(invalidOrigin.status()).toBe(403);
  const stale = await page.request.post("/api/admin/auction", {
    headers: { Origin: new URL(page.url()).origin },
    data: { version: 0, settings: saved.settings },
  });
  expect(stale.status()).toBe(409);
  const status = await page.request.get("/api/admin/auction");
  expect(status.headers()["cache-control"]).toContain("no-store");
  expect(status.headers()["x-robots-tag"]).toContain("noindex");
  await page
    .getByLabel("Coverage", { exact: true })
    .selectOption("uploaded-beta-market");
  await expect(page.getByLabel("Region", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Region", { exact: true })).toHaveValue(
    "UNKNOWN",
  );
  await page.getByLabel("Client build", { exact: true }).fill("70124");
  await page.getByLabel("Realm ID", { exact: true }).fill("UploadedBetaSource");
  await page.getByRole("button", { name: "Add market", exact: true }).click();
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Configuration saved.");
  const configured = await page.request.get("/api/admin/auction");
  const configuredBody = (await configured.json()) as {
    settings: {
      markets: { coverage: string; region: string }[];
      minimumIntervalHours: number;
      dailyLimit: number;
    };
  };
  expect(configuredBody.settings.minimumIntervalHours).toBe(4);
  expect(configuredBody.settings.dailyLimit).toBe(6);
  expect(configuredBody.settings.markets[1]).toMatchObject({
    coverage: "uploaded-beta-market",
    region: "UNKNOWN",
  });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/auction");
    await page.evaluate((): void => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
    });
    await expect(
      page.getByRole("button", { name: "Save configuration", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        (): boolean =>
          document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/auction-admin-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, moderator);
  await page.goto("/admin/auction");
  await expect(
    page.getByRole("heading", { name: "Auction House", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save configuration", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/admin/auction", {
        headers: { Origin: new URL(page.url()).origin },
        data: { version: saved.version, settings: saved.settings },
      })
    ).status(),
  ).toBe(403);
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, editor);
  expect((await page.request.get("/api/admin/auction")).status()).toBe(403);
});
