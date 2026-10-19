import "./scripts/env";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const port = "19306";
const memberBeta = process.env.FOREVER_RAIDS_E2E_ACCESS_MODE === "members";
const secret =
  process.env.FOREVER_RAIDS_E2E_SECRET || randomBytes(48).toString("hex");
process.env.FOREVER_RAIDS_E2E_SECRET = secret;
process.env.COMMUNITY_AUTH_SECRET = secret;
process.env.COMMUNITY_DISCORD_CLIENT_ID = "1556000000000000063";
process.env.COMMUNITY_DISCORD_CLIENT_SECRET = "local-test-only";
process.env.FOREVER_RAIDS_ENABLED = "true";
process.env.FOREVER_RAIDS_ACCESS_MODE = memberBeta ? "members" : "pilot";
process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS = memberBeta
  ? "1556000000000000061"
  : "1556000000000000061,1556000000000000062,1556000000000000064";
process.env.PORT = port;
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "raids.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
  webServer: {
    command: `npx next dev --hostname 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      FOREVER_BUILD_DIR: ".next-raids-e2e",
      PORT: port,
      COMMUNITY_AUTH_SECRET: secret,
      COMMUNITY_DISCORD_CLIENT_ID: "1556000000000000063",
      COMMUNITY_DISCORD_CLIENT_SECRET: "local-test-only",
      FOREVER_RAIDS_ENABLED: "true",
      FOREVER_RAIDS_ACCESS_MODE: process.env.FOREVER_RAIDS_ACCESS_MODE,
      FOREVER_RAIDS_PILOT_DISCORD_IDS:
        process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS,
      DISCORD_GUILD_ID: "1554316932948172940",
      FOREVER_RAIDS_MEMBER_GUILD_IDS: "1554316932948172940,1411533815356194968",
      DISCORD_BOT_TOKEN: "synthetic-browser-membership-token",
      KFCBOT_TOKEN: "",
      DISCORD_MODERATION_WEBHOOK: "",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: "",
      NEXTAUTH_URL: "",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${resolve("tests/fixtures/discord-membership-preload.mjs")}`,
      AUCTION_PUBLIC_TIPS_ENABLED: "false",
      FOREVER_RAIDS_DISCORD_ENABLED:
        process.env.FOREVER_RAIDS_E2E_DISCORD === "true" ? "true" : "false",
      DISCORD_APPLICATION_ID: "1556000000000000063",
      FOREVER_RAIDS_DISCORD_CHANNEL_ID: "1556000000000000071",
      FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID: memberBeta
        ? "1556000000000000074"
        : "",
      FOREVER_RAIDS_BETA_DISCORD_CHANNEL_LABEL: "Community / #event-beta",
      FOREVER_RAIDS_PUBLIC_ORIGIN: `http://127.0.0.1:${port}`,
      FOREVER_RAIDS_DISCORD_DESTINATIONS: JSON.stringify([
        { channelId: "1556000000000000072", label: "Second private test" },
      ]),
      FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: "1411533815356194968",
    },
  },
});
