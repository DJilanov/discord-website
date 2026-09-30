import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT || "19300";
if (!/^[1-9]\d{3,4}$/.test(port) || Number(port) > 65535)
  throw new Error("PLAYWRIGHT_PORT must be a valid local port.");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL,
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    env: { PORT: port },
    command: `npx next dev --hostname 127.0.0.1 -p ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
