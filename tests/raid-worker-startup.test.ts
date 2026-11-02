import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("raid worker loads its environment before notification imports can initialize the database", (): void => {
  const source = readFileSync(new URL("../scripts/raids-discord-worker.ts", import.meta.url), "utf8");
  const environmentImport = source.indexOf('import "./env";');
  assert.ok(environmentImport >= 0);
  for (const dependency of ["../lib/db", "../lib/raids/roster-confirmation-delivery", "../lib/raids/native-worker"]) {
    assert.ok(environmentImport < source.indexOf(dependency), `${dependency} must initialize after environment loading`);
  }
});
