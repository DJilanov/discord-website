import "../../scripts/env";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hash } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { db } from "../../lib/db";

const password = randomBytes(24).toString("hex");
const ownerEmail = "bridge-e2e-owner@example.invalid",
  editorEmail = "bridge-e2e-editor@example.invalid";
const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || "19300"}`;
let bridgeId: string | null = null;
test.beforeAll(async () => {
  if (new URL(process.env.DATABASE_URL || "").port !== "55432")
    throw new Error("Local isolated database required.");
  expect(
    await db.foreverDiscordBridge.count({
      where: { state: { not: "retired" } },
    }),
  ).toBe(0);
  const passwordHash = await hash(password, 12);
  for (const [email, role] of [
    [ownerEmail, "owner"],
    [editorEmail, "editor"],
  ]) {
    await db.foreverUser.upsert({
      where: { email },
      create: { email, name: "Bridge browser test", role, passwordHash },
      update: { passwordHash, role },
    });
  }
  await db.foreverRateLimit.deleteMany({
    where: { key: { startsWith: "login:" } },
  });
  await mkdir("artifacts", { recursive: true });
});
test.afterAll(async () => {
  if (bridgeId) {
    await db.foreverDiscordOutbox.deleteMany({ where: { bridgeId } });
    await db.foreverDiscordInteraction.deleteMany({ where: { bridgeId } });
    await db.foreverBridgeProjection.deleteMany({
      where: { root: { bridgeId } },
    });
    await db.foreverBridgeMessage.deleteMany({ where: { bridgeId } });
    await db.foreverBridgeConsent.deleteMany({ where: { bridgeId } });
    await db.foreverDiscordBridge.delete({ where: { id: bridgeId } });
    await db.foreverAuditLog.deleteMany({
      where: { entityId: bridgeId, entityType: "discord_bridge" },
    });
  }
  const users = await db.foreverUser.findMany({
    where: { email: { in: [ownerEmail, editorEmail] } },
  });
  await db.foreverBridgeAdminRequest.deleteMany({
    where: { actorId: { in: users.map((u) => u.id) } },
  });
  await db.foreverAuditLog.deleteMany({
    where: { actorId: { in: users.map((u) => `staff:${u.id}`) } },
  });
  await db.foreverUser.deleteMany({
    where: { email: { in: [ownerEmail, editorEmail] } },
  });
  await db.$disconnect();
});
async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test("bridge admin draft, offline, confirmation, responsive and accessibility states", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, ownerEmail);
  await page.goto("/admin/discord");
  await expect(
    page.getByRole("heading", { name: "Discord bridge", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Offline or stale")).toBeVisible();
  await page.getByRole("tab", { name: "Shared channels" }).click();
  await page.getByLabel("Pair name").fill("E2E shared channels");
  await page.getByLabel("KFC channel ID").fill("1800000000000000011");
  await page.getByLabel("WoW Forever channel ID").fill("1800000000000000012");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Change recorded.")).toBeVisible();
  const bridge = await db.foreverDiscordBridge.findFirstOrThrow({
    where: { name: "E2E shared channels" },
  });
  bridgeId = bridge.id;
  await expect(
    page.getByRole("button", { name: "Activate", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Reason for audit log")
    .fill("Browser integration test pause");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("paused", { exact: true })).toBeVisible();
  await db.foreverBridgeConsent.create({
    data: {
      bridgeId,
      guildId: bridge.guildA,
      actorId: "1800000000000000001",
      generation: bridge.generation,
      policyVersion: 1,
      blocked: true,
    },
  });
  for (const [state, deliveryState] of [
    ["held", "pending"],
    ["removed", "uncertain"],
  ]) {
    const id = randomUUID();
    await db.foreverBridgeMessage.create({
      data: {
        id,
        bridgeId,
        guildId: bridge.guildA,
        channelId: bridge.channelA,
        messageId: String(
          1800000000000000100n + BigInt(state === "held" ? 1 : 2),
        ),
        authorId: "1800000000000000001",
        generation: bridge.generation,
        state,
        sourceAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        projection: {
          create: {
            id: randomUUID(),
            guildId: bridge.guildB,
            channelId: bridge.channelB,
            nonce: randomBytes(12).toString("hex"),
            state: deliveryState,
          },
        },
      },
    });
  }
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of [
      "Connections",
      "Shared channels",
      "Participation",
      "Delivery",
      "Operations",
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${tab} at ${width}`,
      ).toBe(true);
      if (tab === "Shared channels" || tab === "Delivery")
        await page.screenshot({
          path: `artifacts/bridge-${tab.replaceAll(" ", "-")}-${width}.png`,
          fullPage: true,
        });
    }
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole("tab", { name: "Shared channels" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Participation" })).toBeFocused();
  await page.getByRole("tab", { name: "Delivery" }).click();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByLabel("Exact Discord message link")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("bridge APIs reject unauthenticated, cross-origin and editor access", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/discord/status")).status()).toBe(401);
  await login(page, ownerEmail);
  const csrf = await page.request.post("/api/admin/discord/mode", {
    headers: {
      origin: "https://untrusted.example",
      "idempotency-key": randomUUID(),
    },
    data: { mode: "hard_stop", version: 1, reason: "Not authorized" },
  });
  expect(csrf.status()).toBe(403);
  const status = await page.request.get("/api/admin/discord/status");
  expect(status.headers()["cache-control"]).toContain("no-store");
  await page.context().clearCookies();
  await login(page, editorEmail);
  expect((await page.request.get("/api/admin/discord/status")).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.post("/api/admin/discord/draft", {
        headers: { origin, "idempotency-key": randomUUID() },
        data: {
          name: "forbidden",
          channelA: "1800000000000000021",
          channelB: "1800000000000000022",
          direction: "two_way",
        },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin/discord");
  await expect(page).toHaveURL(/\/admin$/);
});
test("bot policy pages remain readable on mobile and desktop", async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const policy of ["shared-channels", "privacy", "terms"]) {
      expect((await page.goto(`/bot/${policy}`))?.status()).toBe(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});
