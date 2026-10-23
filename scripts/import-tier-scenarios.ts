import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";
import { tierScenariosSchema } from "../lib/simulation-tier-schema";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "snapshot-directory": { type: "string" },
      "artifact-root": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  assert(
    values["snapshot-directory"] && values["artifact-root"],
    "Supply --snapshot-directory and --artifact-root",
  );
  const input = resolve(values["snapshot-directory"]),
    root = resolve(values["artifact-root"]);
  const hash = (bytes: string | Uint8Array): string =>
    createHash("sha256").update(bytes).digest("hex");
  const json = async (path: string): Promise<unknown> =>
    JSON.parse(await readFile(path, "utf8"));
  const pointerBytes = await readFile(join(root, "published-reviews.json"));
  const value = tierScenariosSchema.parse({
    schema: "community-solo-raid-tier-lists.v1",
    sourcePointerSha256: hash(pointerBytes),
    solo: await json(join(input, "forever-dps-tier-list.solo.json")),
    raid: await json(join(input, "forever-dps-tier-list.raid.json")),
  });
  const codec = join(
    root,
    "optimization/greater-mageblood-model-v2/attempts/a4eabfa5c89f3813c1b74bdeb06e276faeebe0583cbea9d19081fc5873f45672/codec-node.mjs",
  );
  assert.equal(
    hash(await readFile(codec)),
    "ddda496cbcf31cf2e7f18300d60bdf12f9035b742b485bff20dbb66bbaad628a",
  );
  interface Result {
    iterationsDone: number;
    avgIterationDuration: number;
    error?: { message?: string };
    raidMetrics: {
      parties: { players: { dps: { avg: number; stdev: number } }[] }[];
    };
  }
  const api: { RaidSimResult: { fromBinary: (bytes: Uint8Array) => Result } } =
    await import(pathToFileURL(codec).href);
  for (const scenario of ["solo", "raid"] as const) {
    const snapshot = value[scenario];
    assert.equal(hash(JSON.stringify(snapshot.policy)), snapshot.policySha256);
    for (const row of snapshot.entries) {
      const evidence = JSON.parse(
        await readFile(
          join(
            root,
            "optimization/tier-list",
            snapshot.policySha256.slice(0, 16),
            `${row.id}-${row.requestSha256.slice(0, 16)}.json`,
          ),
          "utf8",
        ),
      ) as Record<string, unknown>;
      assert.equal(evidence.schema,"kfc-tier-list-browser-measurement.v1");
      assert.equal(evidence.id,row.id);
      for (const key of [
        "policySha256",
        "publicationSha256",
        "originalHrefSha256",
        "requestSha256",
        "responseSha256",
        "dps",
        "stdev",
        "iterations",
      ] as const) {
        const expected =
          key === "policySha256" ? snapshot.policySha256 : row[key];
        assert.equal(evidence[key], expected, `${scenario}/${row.id}/${key}`);
      }
      assert.equal(typeof evidence.requestBase64, "string");
      assert.equal(typeof evidence.responseBase64, "string");
      const request = Buffer.from(evidence.requestBase64 as string, "base64"),
        response = Buffer.from(evidence.responseBase64 as string, "base64");
      assert.equal(hash(request), row.requestSha256);
      assert.equal(hash(response), row.responseSha256);
      const result = api.RaidSimResult.fromBinary(response);
      assert(!result.error?.message);
      assert.equal(result.iterationsDone, 5000);
      assert.equal(result.avgIterationDuration, 300);
      assert.equal(result.raidMetrics.parties[0]?.players[0]?.dps.avg, row.dps);
      assert.equal(
        result.raidMetrics.parties[0]?.players[0]?.dps.stdev,
        row.stdev,
      );
      const manifest = JSON.parse(
        await readFile(join(root, row.release, "manifest.json"), "utf8"),
      ) as { files: Record<string, { sha256: string }> };
      for (const [file, digest] of [
        ["lib.wasm", row.wasmSha256],
        ["assets/database/db.json", row.databaseSha256],
      ] as const) {
        assert.equal(
          hash(await readFile(join(root, row.release, file))),
          digest,
        );
        assert.equal(manifest.files[file]?.sha256, digest);
      }
    }
  }
  assert.deepEqual(
    await readFile(join(root, "published-reviews.json")),
    pointerBytes,
    "Publication changed during import",
  );
  await mkdir("public/data/simulation-guides", { recursive: true });
  await writeFile(
    "content/simulation-tier-scenarios.json",
    JSON.stringify(value, null, 2) + "\n",
  );
  for (const scenario of ["solo", "raid"] as const)
    await writeFile(
      `public/data/simulation-guides/benchmark.${scenario}.json`,
      JSON.stringify(value[scenario], null, 2) + "\n",
    );
  console.log(
    JSON.stringify({
      status: "verified",
      buildsPerScenario: 21,
      scenarios: 2,
      iterations: 210000,
      sourcePointerSha256: value.sourcePointerSha256,
    }),
  );
}
main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Tier scenario import failed",
  );
  process.exitCode = 1;
});
