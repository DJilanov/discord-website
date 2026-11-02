import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  open,
  readFile,
  realpath,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { cleanupPreviewBuilds } from "../scripts/build-cleanup-lib";

async function fixture(t: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "next-cleanup-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return realpath(root);
}

async function preview(
  root: string,
  name: string,
  time: number,
): Promise<void> {
  const path = join(root, name);
  await mkdir(join(path, "dev"), { recursive: true });
  const manifest = join(path, "dev/build-manifest.json");
  await writeFile(manifest, "{}");
  for (const item of [manifest, join(path, "dev"), path]) {
    await utimes(item, time / 1000, time / 1000);
  }
}

const idle = (): boolean => false;

test("prunes oldest idle previews to budget but preserves the default and production builds", async (t) => {
  const root = await fixture(t);
  await preview(root, ".next", 1000);
  await preview(root, ".next-old", 1000);
  await preview(root, ".next-new", 2000);
  await preview(root, ".next-production", 1000);
  await writeFile(join(root, ".next-production/BUILD_ID"), "release");
  const result = await cleanupPreviewBuilds(root, {
    now: 100000,
    graceMs: 0,
    maxBytes: 2,
    hasOpenFiles: idle,
  });
  assert.deepEqual(result.removed, [".next-old"]);
  assert.equal(result.bytes, 2);
  assert.equal(
    await readFile(join(root, ".next/dev/build-manifest.json"), "utf8"),
    "{}",
  );
  assert.equal(
    await readFile(join(root, ".next-production/BUILD_ID"), "utf8"),
    "release",
  );
  await assert.rejects(
    readFile(join(root, ".next-old/dev/build-manifest.json")),
    { code: "ENOENT" },
  );
});

test("preserves active locks, open files, configured outputs, fresh activity and unrelated folders", async (t) => {
  const root = await fixture(t);
  for (const name of [
    ".next-live",
    ".next-open",
    ".next-custom",
    ".next-fresh",
    ".next-unknown-lock",
  ]) {
    await preview(root, name, name === ".next-fresh" ? 99000 : 1000);
  }
  await writeFile(
    join(root, ".next-live/dev/lock"),
    JSON.stringify({ pid: process.pid }),
  );
  await writeFile(join(root, ".next-unknown-lock/dev/lock"), "");
  await mkdir(join(root, ".next-source"));
  await writeFile(join(root, ".next-source/source.ts"), "keep");
  const result = await cleanupPreviewBuilds(root, {
    now: 100000,
    graceMs: 5000,
    maxBytes: 0,
    protectedDirectory: ".next-custom",
    hasOpenFiles: (path: string): boolean => path.endsWith(".next-open"),
  });
  assert.deepEqual(result.removed, []);
  assert.equal(
    await readFile(join(root, ".next-source/source.ts"), "utf8"),
    "keep",
  );
});

test("dry run reports expired output without deleting; symlinks never redirect cleanup", async (t) => {
  const root = await fixture(t);
  await preview(root, ".next-old", 1000);
  await preview(root, "outside", 1000);
  await symlink(join(root, "outside"), join(root, ".next-link"));
  const options = {
    now: 100000,
    graceMs: 0,
    maxAgeMs: 100,
    hasOpenFiles: idle,
  };
  assert.deepEqual(
    (await cleanupPreviewBuilds(root, { ...options, dryRun: true })).removed,
    [".next-old"],
  );
  assert.equal(
    await readFile(join(root, ".next-old/dev/build-manifest.json"), "utf8"),
    "{}",
  );
  assert.deepEqual((await cleanupPreviewBuilds(root, options)).removed, [
    ".next-old",
  ]);
  assert.equal(
    await readFile(join(root, "outside/dev/build-manifest.json"), "utf8"),
    "{}",
  );
});

test("rechecks filesystem changes before deleting a preview", async (t) => {
  const root = await fixture(t);
  await preview(root, ".next-old", 1000);
  const result = await cleanupPreviewBuilds(root, {
    now: Date.now() + 86400000,
    graceMs: 0,
    maxBytes: 0,
    hasOpenFiles: (path: string): boolean => {
      assert.equal(path, join(root, ".next-old"));
      writeFileSync(join(path, "dev/new-build-output"), "concurrent build");
      return false;
    },
  });
  assert.deepEqual(result.removed, []);
});

test("the real process probe protects an open file", async (t) => {
  const root = await fixture(t);
  await preview(root, ".next-open", 1000);
  const handle = await open(
    join(root, ".next-open/dev/build-manifest.json"),
    "r",
  );
  try {
    const result = await cleanupPreviewBuilds(root, {
      now: Date.now(),
      graceMs: 0,
      maxBytes: 0,
    });
    assert.deepEqual(result.removed, []);
    assert.equal(await handle.readFile("utf8"), "{}");
  } finally {
    await handle.close();
  }
});

test("the command wrapper forwards arguments, runs cleanup after failure, and preserves the exit code", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "scripts"));
  for (const name of ["build-cleanup.ts", "build-cleanup-lib.ts"]) {
    await writeFile(
      join(root, "scripts", name),
      await readFile(join(__dirname, "../scripts", name)),
    );
  }
  await writeFile(join(root, "package.json"), "{}");
  await mkdir(join(root, "node_modules/next/dist/bin"), { recursive: true });
  await writeFile(
    join(root, "node_modules/next/dist/bin/next"),
    'process.stdout.write(JSON.stringify(process.argv.slice(2)) + "\\n"); process.exit(37);',
  );
  const requireFromTests = createRequire(__filename);
  const result = spawnSync(
    process.execPath,
    [
      requireFromTests.resolve("tsx/cli"),
      join(root, "scripts/build-cleanup.ts"),
      "--run",
      "next",
      "build",
      "--webpack",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 37, result.stderr);
  assert.match(result.stdout, /\["build","--webpack"\]/);
  assert.match(result.stdout, /Removed 0 idle previews/);
});
