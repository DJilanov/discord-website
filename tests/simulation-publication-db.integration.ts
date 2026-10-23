import assert from "node:assert/strict";
import { test, after } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../lib/db";
import { editorialGuides } from "../content/editorial";
import { simulationGuides } from "../content/simulation-guides";
import { editorialPublicationData } from "../lib/editorial-publication";

const url = new URL(process.env.DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "55432" ||
  !/^\/guide_review_/.test(url.pathname)
)
  throw new Error("Use an isolated temporary guide database");
const run = promisify(execFile);
after(async (): Promise<void> => db.$disconnect());
async function publish(
  args: string[],
): Promise<{
  created: number;
  published: number;
  preserved: number;
  untouched: number;
}> {
  const { stdout } = await run(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/publish-simulation-guides.ts",
      ...args,
    ],
    { env: process.env },
  );
  return JSON.parse(stdout.trim());
}
test("simulation publication is atomic, source-specific, idempotent and preserves existing guides", async () => {
  assert.equal(await db.foreverGuide.count(), 0);
  for (const source of editorialGuides)
    await db.foreverGuide.create({
      data: {
        ...editorialPublicationData(source),
        published: true,
        publishedAt: new Date("2026-10-22T00:00:00Z"),
        author: "Preserved editor",
        metaTitle: "Custom title",
        metaDescription: "Custom description",
      },
    });
  const before = await db.foreverGuide.findMany({ orderBy: { slug: "asc" } });
  assert.deepEqual(await publish(["--dry-run"]), {
    dryRun: true,
    created: 10,
    published: 0,
    preserved: 0,
    untouched: 17,
  });
  assert.deepEqual(
    await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
    before,
  );
  const last = simulationGuides.at(-1)!;
  const conflict = await db.foreverGuide.create({
    data: {
      ...editorialPublicationData(last),
      content: last.content + "\nEditor correction",
    },
  });
  const protectedState = await db.foreverGuide.findMany({
    orderBy: { slug: "asc" },
  });
  await assert.rejects(publish(["--publish"]));
  assert.deepEqual(
    await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
    protectedState,
  );
  await db.foreverGuide.delete({ where: { id: conflict.id } });
  assert.deepEqual(await publish(["--publish"]), {
    dryRun: false,
    created: 10,
    published: 0,
    preserved: 0,
    untouched: 17,
  });
  assert.equal(await db.foreverGuide.count({ where: { published: true } }), 27);
  assert.deepEqual(
    await db.foreverGuide.findMany({
      where: { id: { in: before.map((row) => row.id) } },
      orderBy: { slug: "asc" },
    }),
    before,
  );
  const stable = await db.foreverGuide.findMany({ orderBy: { slug: "asc" } });
  assert.deepEqual(await publish(["--publish"]), {
    dryRun: false,
    created: 0,
    published: 0,
    preserved: 10,
    untouched: 17,
  });
  assert.deepEqual(
    await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
    stable,
  );
  await assert.rejects(publish([]));
  assert.deepEqual(
    await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
    stable,
  );
});
