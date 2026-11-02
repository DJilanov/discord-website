import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { constants } from "node:os";
import { cleanupPreviewBuilds } from "./build-cleanup-lib";

const repository = resolve(__dirname, "..");
const requireFromRoot = createRequire(resolve(repository, "package.json"));

async function clean(dryRun = false): Promise<void> {
  const result = await cleanupPreviewBuilds(repository, {
    dryRun,
    protectedDirectory: process.env.FOREVER_BUILD_DIR || ".next",
  });
  console.log(
    `[build-cleanup] ${dryRun ? "Would remove" : "Removed"} ${result.removed.length} idle previews (${(result.bytes / 1024 ** 3).toFixed(2)} GiB).`,
  );
  for (const name of result.removed) console.log(`  ${name}`);
}

async function run(args: string[]): Promise<number> {
  const [command, ...commandArgs] = args;
  const modulePath =
    command === "next"
      ? "next/dist/bin/next"
      : command === "playwright"
        ? "@playwright/test/cli"
        : null;
  if (!modulePath)
    throw new Error("Expected --run next|playwright <arguments>");
  const child = spawn(
    process.execPath,
    [requireFromRoot.resolve(modulePath), ...commandArgs],
    {
      cwd: repository,
      stdio: "inherit",
    },
  );
  const interrupt = (): void => {
    child.kill("SIGINT");
  };
  const terminate = (): void => {
    child.kill("SIGTERM");
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    return await new Promise<number>((resolveExit, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal): void =>
        resolveExit(code ?? (signal ? 128 + constants.signals[signal] : 1)),
      );
    });
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--run") {
    try {
      process.exitCode = await run(args.slice(1));
    } finally {
      await clean().catch((error: unknown): void => {
        console.warn(`[build-cleanup] Cleanup failed: ${String(error)}`);
      });
    }
  } else {
    if (args.some((arg: string): boolean => arg !== "--dry-run"))
      throw new Error("Expected --dry-run or --run");
    await clean(args.includes("--dry-run"));
  }
}

void main().catch((error: unknown): void => {
  console.error(`[build-cleanup] ${String(error)}`);
  process.exitCode = 1;
});
