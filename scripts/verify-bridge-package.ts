import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

async function main(): Promise<void> {
  const scratch = await mkdtemp(path.join(tmpdir(), "forever-bridge-package-"));
  try {
    const worker = path.join(scratch, "workers/discord-bridge");
    await mkdir(worker, { recursive: true });
    await mkdir(path.join(scratch, "lib/discord-bridge"), { recursive: true });
    for (const file of [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "src",
    ]) {
      await cp(
        path.join("workers/discord-bridge", file),
        path.join(worker, file),
        { recursive: true },
      );
    }
    for (const file of [
      "contracts.ts",
      "store.ts",
      "policy.ts",
      "crypto.ts",
      "commands.ts",
    ]) {
      await cp(
        path.join("lib/discord-bridge", file),
        path.join(scratch, "lib/discord-bridge", file),
      );
    }
    await cp(
      "lib/discord-audit.ts",
      path.join(scratch, "lib/discord-audit.ts"),
    );
    const env = { ...process.env, BRIDGE_ENABLED: "false" };
    execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: worker,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execFileSync(
      process.execPath,
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
      { cwd: worker, env, stdio: ["ignore", "pipe", "pipe"] },
    );
    const result = execFileSync(
      process.execPath,
      ["dist/workers/discord-bridge/src/main.js"],
      { cwd: worker, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.match(result, /Bridge disabled/);
    console.log(
      "Standalone worker installs, compiles and starts disabled without website dependencies or secrets.",
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
main().catch(() => {
  console.error("Standalone bridge package verification failed.");
  process.exitCode = 1;
});
