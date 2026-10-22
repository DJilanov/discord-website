import assert from "node:assert/strict";
import { test, after } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../lib/db";
import { editorialGuides } from "../content/editorial";
import {
  editorialFingerprint,
  editorialPublicationData,
} from "../lib/editorial-publication";
import originals from "./fixtures/starter-guides-pre-interactive.json";

const url = new URL(process.env.DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.port !== "55432" ||
  !/^\/guide_review_/.test(url.pathname)
)
  throw new Error(
    "Starter publication tests require their own temporary local test database.",
  );
const run = promisify(execFile);
after(async (): Promise<void> => db.$disconnect());

test("six approved source drafts publish once while preserving IDs and custom metadata", async () => {
  assert.equal(await db.foreverGuide.count(), 0);
  for (const source of editorialGuides) {
    const data = editorialPublicationData(source);
    const original = originals.find((entry) => entry.slug === source.slug);
    await db.foreverGuide.create({
      data: {
        ...data,
        ...original,
        author: "Open source contributors",
        metaTitle: "Custom editor title",
        metaDescription: "Custom editor description",
        publishedAt: data.published ? new Date("2026-10-20T00:00:00Z") : null,
      },
    });
  }
  const before = await db.foreverGuide.findMany();
  async function publish(
    args: string[],
  ): Promise<{ published: number; preserved: number; updated: number }> {
    const { stdout } = await run(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/publish-editorial.ts",
        ...args,
      ],
      { env: process.env },
    );
    return JSON.parse(stdout.trim());
  }
  const dry = await publish(["--dry-run", "--publish-starters"]);
  assert.equal(dry.published, 6);
  assert.equal(dry.preserved, 11);
  assert.equal(await db.foreverGuide.count({ where: { published: true } }), 11);
  const applied = await publish(["--publish-starters"]);
  assert.equal(applied.published, 6);
  assert.equal(applied.updated, 0);
  assert.equal(applied.preserved, 11);
  for (const current of await db.foreverGuide.findMany()) {
    const previous = before.find((entry) => entry.id === current.id)!;
    const source = editorialGuides.find(
      (entry) => entry.slug === current.slug,
    )!;
    assert.equal(current.published, true);
    assert(current.publishedAt);
    assert.equal(current.metaTitle, previous.metaTitle);
    assert.equal(current.metaDescription, previous.metaDescription);
    assert.equal(current.coverImage, previous.coverImage);
    assert.equal(current.author, previous.author);
    if (source.release === "draft")
      assert.equal(editorialFingerprint(current), editorialFingerprint(source));
    else
      assert.equal(
        current.updatedAt.toISOString(),
        previous.updatedAt.toISOString(),
      );
  }
  const stable = await db.foreverGuide.findMany({ orderBy: { slug: "asc" } });
  for (const args of [["--publish-starters"], []]) {
    const again = await publish(args);
    assert.equal(again.published, 0);
    assert.equal(again.updated, 0);
    assert.equal(again.preserved, 17);
    assert.deepEqual(
      await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
      stable,
    );
  }
});
