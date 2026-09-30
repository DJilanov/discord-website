import "../../scripts/env";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { hash } from "bcryptjs";
import { db } from "../../lib/db";
import { deleteStored } from "../../lib/storage";

const password = randomBytes(24).toString("hex");
const ownerEmail = "e2e-owner@example.invalid",
  editorEmail = "e2e-editor@example.invalid";
const guildName = "E2E Local Test Guild";

test.beforeAll(async () => {
  if (new URL(process.env.DATABASE_URL || "").port !== "55432")
    throw new Error("E2E fixtures must only use the isolated local database.");
  const passwordHash = await hash(password, 12);
  for (const [email, role] of [
    [ownerEmail, "owner"],
    [editorEmail, "editor"],
  ])
    await db.foreverUser.upsert({
      where: { email },
      create: { email, name: "Local test staff", role, passwordHash },
      update: { passwordHash, role },
    });
  await db.foreverRateLimit.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "login:" } },
        { key: { startsWith: "submission:" } },
        { key: { startsWith: "challenge:" } },
        { key: { startsWith: "status:" } },
      ],
    },
  });
  await db.foreverGuild.deleteMany({ where: { name: guildName } });
  await mkdir("artifacts", { recursive: true });
});

test.afterAll(async () => {
  const reports = await db.foreverReport.findMany({
    where: { reporterDiscord: "e2e-private-reporter" },
    include: { evidence: true },
  });
  for (const report of reports) {
    for (const file of report.evidence) await deleteStored(file.storageKey);
    await db.foreverWebhookJob.deleteMany({ where: { entityId: report.id } });
    await db.foreverReport.delete({ where: { id: report.id } });
  }
  const users = await db.foreverUser.findMany({
    where: { email: { in: [ownerEmail, editorEmail] } },
    select: { id: true },
  });
  await db.foreverAuditLog.deleteMany({
    where: { actorId: { in: users.map((user) => user.id) } },
  });
  await db.foreverUser.deleteMany({
    where: { email: { in: [ownerEmail, editorEmail] } },
  });
  await db.foreverGuild.deleteMany({ where: { name: guildName } });
  await db.$disconnect();
});

test("private report receipt and evidence access remain private", async ({
  page,
  request,
}) => {
  await page.goto("/reports/new");
  await page.getByLabel("Your Discord handle").fill("e2e-private-reporter");
  await page.getByLabel("Your character", { exact: true }).fill("TestReporter");
  await page.getByLabel("Character involved").fill("TestCharacter");
  await page.getByLabel("Realm", { exact: true }).fill("TestRealm");
  await page.getByLabel("Region", { exact: true }).selectOption("EU");
  await page.getByLabel("Faction", { exact: true }).selectOption("Alliance");
  await page.getByLabel("Category", { exact: true }).selectOption("Other");
  await page
    .getByLabel("Incident date and time")
    .fill(new Date(Date.now() - 86400000).toISOString().slice(0, 16));
  await page
    .getByLabel("What happened?")
    .fill(
      "Local automated browser fixture for private evidence upload and receipt verification. This is not a real player report and will be deleted.",
    );
  await page.getByLabel("Screenshots").setInputFiles("app/icon.png");
  await page.getByRole("checkbox").check();
  await expect(page.getByText("Submission check complete")).toBeVisible();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission received" }),
  ).toBeVisible();
  const token = await page.locator("code.token-reveal").innerText();
  const report = await db.foreverReport.findFirstOrThrow({
    where: { reporterDiscord: "e2e-private-reporter" },
    include: { evidence: true },
  });
  const headers = { origin: "http://127.0.0.1:19300" };
  const status = await request.post("/api/cases/status", {
    headers,
    data: { reference: report.publicId, token },
  });
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({
    status: "submitted",
    publicId: report.publicId,
  });
  expect(await status.text()).not.toContain("e2e-private-reporter");
  expect(
    (
      await request.post("/api/cases/status", {
        headers,
        data: { reference: report.publicId, token: "wrong".repeat(10) },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`/api/admin/evidence/${report.evidence[0].id}`)
    ).status(),
  ).toBe(401);
});

test("secondary pages fit mobile and desktop without missing assets", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/discord",
      "/guild-recruitment",
      "/guild-recruitment/new",
      "/lfg/new",
      "/guides",
      "/guides/find-your-wow-forever-guild",
      "/reports/new",
      "/reports/status",
      "/appeals",
      "/addons/foreverguard",
      "/transparency",
      "/about",
      "/login",
    ]) {
      expect((await page.goto(path))?.status()).toBe(200);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (element) => {
            if (!(element instanceof HTMLImageElement)) return;
            element.loading = "eager";
            await element.decode();
          }),
        );
      });
      expect(
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (element) =>
                element instanceof HTMLImageElement && element.naturalWidth > 0,
            ),
          ),
        path,
      ).toBe(true);
      if (path === "/discord" || path === "/guild-recruitment/new")
        await page.screenshot({
          path: `artifacts/${path.replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
  }
});

async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`home branding and layout at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "WoW Forever Discord",
    );
    await expect(page.locator("h1 img")).toHaveAttribute("alt", "");
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .locator(".hero-art")
          .evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".home-hero")
        .evaluate(
          (element) => element.getBoundingClientRect().bottom < innerHeight,
        ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/home-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `artifacts/home-viewport-${width}.png` });
    expect(errors).toEqual([]);
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Guides", exact: true })
        .click();
      await expect(page).toHaveURL(/\/guides$/);
    }
  });
}

test("public pages, accessible landmarks, SEO metadata and share image", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  for (const path of [
    "/",
    "/discord",
    "/guild-recruitment",
    "/guild-recruitment/new",
    "/lfg",
    "/guides",
    "/reports",
    "/reports/new",
    "/appeals",
    "/addons/foreverguard",
    "/privacy",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(new URL(canonical || "").href).toBe(
      `https://www.wowforeverdiscord.online${path}`,
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
      path,
    ).toEqual([]);
  }
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect((await image.body()).length).toBeGreaterThan(10000);
  const redirect = await request.get("/join", { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe("https://discord.gg/ejn4UnDdcX");
});

test("guild submission stays private until admin approval", async ({
  page,
}) => {
  await page.goto("/guild-recruitment/new");
  await page.getByLabel("Guild name", { exact: true }).fill(guildName);
  await page.getByLabel("Region", { exact: true }).selectOption("EU");
  await page.getByLabel("Realm or realm plan").fill("Unconfirmed");
  await page.getByLabel("Faction", { exact: true }).selectOption("Alliance");
  await page.getByLabel("Main activity").selectOption("PvE");
  await page.getByLabel("Playstyle").selectOption("Casual");
  await page.getByLabel("Loot system").fill("Soft reserve");
  await page.getByLabel("Raid time and time zone").fill("20:00 UTC");
  await page.getByLabel("Shaman", { exact: true }).check();
  await page
    .getByLabel("Guild description")
    .fill(
      "A local automated test of the guild directory submission and approval flow. This fixture is removed at the end of the test.",
    );
  await page.getByLabel("Recruiter's Discord handle").fill("test-recruiter");
  await expect(page.getByText("Submission check complete")).toBeVisible({
    timeout: 45000,
  });
  await page.getByRole("button", { name: "Submit guild" }).click();
  await expect(
    page.getByRole("heading", { name: "Submission received" }),
  ).toBeVisible();
  const guild = await db.foreverGuild.findFirstOrThrow({
    where: { name: guildName },
  });
  expect(guild.status).toBe("pending");
  expect((await page.request.get(`/guilds/${guild.slug}`)).status()).toBe(404);
  await login(page, ownerEmail);
  await page.goto(`/admin/guilds?edit=${guild.id}`);
  await page.getByLabel("Status", { exact: true }).selectOption("approved");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/guilds$/);
  await page.goto(`/guilds/${guild.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(guildName);
});

test("staff permissions and admin responsive layout", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: { origin: "http://127.0.0.1:19300" },
        data: {},
      })
    ).status(),
  ).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await login(page, editorEmail);
  const response = await page.request.post("/api/admin/settings", {
    headers: { origin: "http://127.0.0.1:19300" },
    data: {},
  });
  expect(response.status()).toBe(403);
  await page.goto("/admin/reports");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await page.goto("/admin/search");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await page.context().clearCookies();
  await login(page, ownerEmail);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin/settings");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/admin-${width}.png`,
      fullPage: true,
    });
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    for (const path of ["/admin/search", "/admin/analytics"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/${path.replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
        path,
      ).toEqual([]);
    }
  }
});

test("guide editor preserves current covers, restricts images and publishes only on request", async ({
  page,
  request,
}) => {
  const guide = await db.foreverGuide.create({
    data: {
      slug: `editorial-fixture-${Date.now()}`,
      title: "Local editorial regression guide",
      excerpt:
        "An isolated local test of safe editorial images and publication controls.",
      content:
        "This isolated local guide tests approved images, rejected remote images and private evidence paths.\n\n![Approved welcome](/images/discord-welcome.png)\n\n![Remote omitted](https://external.invalid/pixel.png)\n\n![Evidence omitted](/api/admin/evidence/private-test)\n\n<script>alert('unsafe')</script>",
      author: "Local test staff",
      category: "Community",
      coverImage: "/images/forever-world.webp",
      published: false,
    },
  });
  try {
    expect((await request.get(`/guides/${guide.slug}`)).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
      guide.slug,
    );
    await login(page, editorEmail);
    await page.goto(`/admin/guides?edit=${guide.id}`);
    await expect(page.getByLabel("Cover image")).toHaveValue(guide.coverImage);
    await page
      .getByLabel("Excerpt")
      .fill(
        "The changed excerpt must not replace the approved cover image or publish this local fixture.",
      );
    await page.getByRole("button", { name: "Preview article" }).click();
    await expect(page.locator(".editorial-inline-image")).toHaveCount(1);
    await expect(page.locator(".prose")).toContainText("Remote omitted");
    await expect(page.locator(".prose img[src*='evidence']")).toHaveCount(0);
    await expect(page.locator(".prose script")).toHaveCount(0);
    await page.getByText("Article images", { exact: true }).click();
    await page
      .getByRole("combobox", { name: "Approved image", exact: true })
      .selectOption("/images/discord-classes-addons.png");
    await page.getByRole("button", { name: "Insert image" }).click();
    await expect(page.locator(".editorial-inline-image")).toHaveCount(2);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/guides$/);
    const saved = await db.foreverGuide.findUniqueOrThrow({
      where: { id: guide.id },
    });
    expect(saved.coverImage).toBe(guide.coverImage);
    expect(saved.published).toBe(false);
    expect(saved.content).toContain("/images/discord-classes-addons.png");
    await page.goto(`/admin/guides?edit=${guide.id}`);
    await page.getByLabel("Published and visible to visitors").check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/guides$/);
    await page.goto(`/guides/${guide.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      guide.title,
    );
    await expect(page.locator(".editorial-inline-image")).toHaveCount(2);
    await expect(page.locator(".article-date")).toContainText(guide.author);
    expect(await (await request.get("/sitemap.xml")).text()).toContain(
      guide.slug,
    );
  } finally {
    await db.foreverGuide.delete({ where: { id: guide.id } });
  }
});

test("group submission is reviewed before Discord and regional pages show it", async ({
  page,
}) => {
  const title = `Local group workflow ${Date.now()}`;
  try {
    await page.goto("/lfg/new");
    await page.getByLabel("Group title").fill(title);
    await page.getByLabel("Activity", { exact: true }).selectOption("Dungeon");
    await page.getByLabel("Region", { exact: true }).selectOption("EU");
    await page.getByLabel("Faction", { exact: true }).selectOption("Horde");
    await page
      .getByLabel("Realm", { exact: true })
      .fill("Unconfirmed local fixture");
    await page
      .getByLabel("Start time")
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await page.getByLabel("Discord contact").fill("local-fixture");
    await page
      .getByLabel("Group details")
      .fill(
        "Local automated fixture for the group submission and staff review workflow, removed after this test.",
      );
    await expect(page.getByText("Submission check complete")).toBeVisible();
    await page
      .getByRole("button", { name: "Submit group", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Submission received" }),
    ).toBeVisible();
    const group = await db.foreverGroup.findFirstOrThrow({ where: { title } });
    expect(group.status).toBe("pending");
    await page.goto("/discord");
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await login(page, ownerEmail);
    const approved = await page.request.post(`/api/admin/groups/${group.id}`, {
      headers: { origin: "http://127.0.0.1:19300" },
      data: {
        status: "approved",
        reason: "Isolated local workflow verification.",
      },
    });
    expect(approved.status()).toBe(200);
    for (const path of ["/discord", "/discord/eu", "/servers/pve"]) {
      await page.goto(path);
      await expect(
        page.getByRole("link", { name: title, exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page.locator(`#group-${group.id}`)).toBeVisible();
    await page.goto("/discord/na");
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await page.goto("/servers/pvp");
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  } finally {
    await db.foreverGroup.deleteMany({ where: { title } });
  }
});
