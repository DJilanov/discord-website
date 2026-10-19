import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";

interface ActivationFixture {
  directory: string;
  release: string;
  previous: string;
  state: string;
  script: string;
}

async function fixture(t: TestContext): Promise<ActivationFixture> {
  const directory = await mkdtemp(join(tmpdir(), "source-activation-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const commit = "a".repeat(40);
  const release = join(directory, commit);
  const previous = join(directory, "previous");
  const state = join(directory, "state.json");
  const script = join(directory, "activate.sh");
  await mkdir(join(release, "node_modules/.bin"), { recursive: true });
  await mkdir(join(directory, "bin"));
  await writeFile(
    join(release, "release-source.json"),
    JSON.stringify({ commit, buildDirectory: ".next-test" }),
  );
  await writeFile(
    join(release, "node_modules/.bin/tsx"),
    "#!/bin/sh\nexit 0\n",
    { mode: 0o755 },
  );
  const source = await readFile(
    join(__dirname, "../deploy/activate-source-release.sh"),
    "utf8",
  );
  await writeFile(
    script,
    source.replaceAll("/home/wow-forever-discord-source-releases", directory),
  );
  await writeFile(
    state,
    JSON.stringify({
      exists: true,
      root: previous,
      build: ".next-previous",
      events: [],
    }),
  );
  await writeFile(
    join(directory, "bin/pm2"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = process.env.ACTIVATION_TEST_STATE;
const state = JSON.parse(fs.readFileSync(path, "utf8"));
const action = process.argv[2];
if (action === "jlist") {
  console.log(JSON.stringify(state.exists ? [{ name: "wow-forever-discord", pm2_env: { pm_cwd: state.root, pm_exec_path: state.root + "/node_modules/next/dist/bin/next", FOREVER_BUILD_DIR: state.build } }] : []));
  process.exit(0);
}
state.events.push(action);
if (action === "delete") state.exists = false;
else if (action === "start") {
  if (state.exists) process.exit(8);
  state.exists = true;
  state.root = process.env.FOREVER_RELEASE_ROOT;
  state.build = process.env.FOREVER_BUILD_DIR;
} else if (action === "startOrReload") {
  // Model the real PM2 behavior that caused the failed release switch.
  state.build = process.env.FOREVER_BUILD_DIR;
} else if (action !== "save") process.exit(9);
fs.writeFileSync(path, JSON.stringify(state));
`,
    { mode: 0o755 },
  );
  await writeFile(
    join(directory, "bin/curl"),
    `#!/usr/bin/env node
const state = JSON.parse(require("node:fs").readFileSync(process.env.ACTIVATION_TEST_STATE, "utf8"));
process.exit(process.env.ACTIVATION_TEST_FAIL_ROOT === state.root ? 22 : 0);
`,
    { mode: 0o755 },
  );
  await writeFile(join(directory, "bin/sleep"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  return { directory, release, previous, state, script };
}

test("source activation recreates the named PM2 definition instead of retaining its old cwd", async (t) => {
  const setup = await fixture(t);
  const result = spawnSync("sh", [setup.script, setup.release], {
    env: {
      ...process.env,
      PATH: `${join(setup.directory, "bin")}:${process.env.PATH}`,
      ACTIVATION_TEST_STATE: setup.state,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const state = JSON.parse(await readFile(setup.state, "utf8")) as {
    root: string;
    events: string[];
  };
  assert.equal(state.root, setup.release);
  assert.deepEqual(state.events, ["delete", "start", "save"]);
});

test("a failed candidate health check restores the previous cwd and build", async (t) => {
  const setup = await fixture(t);
  const result = spawnSync("sh", [setup.script, setup.release], {
    env: {
      ...process.env,
      PATH: `${join(setup.directory, "bin")}:${process.env.PATH}`,
      ACTIVATION_TEST_STATE: setup.state,
      ACTIVATION_TEST_FAIL_ROOT: setup.release,
    },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  const state = JSON.parse(await readFile(setup.state, "utf8")) as {
    root: string;
    build: string;
    events: string[];
  };
  assert.equal(state.root, setup.previous);
  assert.equal(state.build, ".next-previous");
  assert.deepEqual(state.events, [
    "delete",
    "start",
    "delete",
    "start",
    "save",
  ]);
});
