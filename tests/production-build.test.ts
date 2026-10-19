import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { verifyProductionBuild } from "../scripts/verify-production-build";

async function fixture(t: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "production-build-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const build = join(root, ".next-release-test");
  await mkdir(join(build, "server/app"), { recursive: true });
  await mkdir(join(build, "static/chunks"), { recursive: true });
  for (const name of [
    "required-server-files.json",
    "routes-manifest.json",
    "build-manifest.json",
    "prerender-manifest.json",
  ])
    await writeFile(join(build, name), "{}");
  await writeFile(join(build, "BUILD_ID"), "test-build");
  await writeFile(
    join(build, "server/app-paths-manifest.json"),
    JSON.stringify({ "/page": "app/page.js" }),
  );
  await writeFile(join(build, "server/app/page.js"), "module.exports = {};");
  await writeFile(join(build, "static/chunks/app.js"), "export {};");
  await writeFile(join(build, "static/chunks/app.css"), "body{}");
  return root;
}

test("accepts a complete custom production build", async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await verifyProductionBuild(root, ".next-release-test"), {
    buildDirectory: ".next-release-test",
    buildId: "test-build",
    staticAssets: 2,
    serverEntries: 1,
  });
});

test("rejects the cache-only active-build cleanup failure", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, ".next-release-broken/cache"), { recursive: true });
  await assert.rejects(
    verifyProductionBuild(root, ".next-release-broken"),
    /BUILD_ID/,
  );
});

test("rejects missing CSS even when all manifests and JavaScript remain", async (t) => {
  const root = await fixture(t);
  await rm(join(root, ".next-release-test/static/chunks/app.css"));
  await assert.rejects(
    verifyProductionBuild(root, ".next-release-test"),
    /CSS assets are missing/,
  );
});

test("rejects missing server code, escaped references and symlink outputs", async (t) => {
  const root = await fixture(t);
  await rm(join(root, ".next-release-test/server/app/page.js"));
  await assert.rejects(
    verifyProductionBuild(root, ".next-release-test"),
    /page\.js/,
  );
  await writeFile(join(root, "outside.js"), "outside");
  await writeFile(
    join(root, ".next-release-test/server/app-paths-manifest.json"),
    JSON.stringify({ "/page": "../../outside.js" }),
  );
  await assert.rejects(
    verifyProductionBuild(root, ".next-release-test"),
    /escapes/,
  );
  await symlink(
    join(root, ".next-release-test"),
    join(root, ".next-release-link"),
  );
  await assert.rejects(
    verifyProductionBuild(root, ".next-release-link"),
    /symlink/,
  );
  await assert.rejects(
    verifyProductionBuild(root, "../other-project"),
    /Expected/,
  );
});
