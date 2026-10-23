import "../scripts/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { z } from "zod";
import { db } from "../lib/db";
import { simulationGuides } from "../content/simulation-guides";
import { editorialFingerprint } from "../lib/editorial-publication";

test(
  "the discovery CLI atomically publishes ten guides, preserves metadata, and refuses edits during rollback",
  { timeout: 90000 },
  async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    assert(
      ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "55432",
      "Isolated local PostgreSQL required",
    );
    const previous = z
      .object({
        guides: z
          .array(
            z.object({
              slug: z.string(),
              title: z.string(),
              excerpt: z.string(),
              content: z.string(),
              category: z.string(),
              coverImage: z.string(),
            }),
          )
          .length(10),
      })
      .parse(
        JSON.parse(
          gunzipSync(
            await readFile(
              "tests/fixtures/simulation-discovery-c8ad9ca.json.gz",
            ),
          ).toString("utf8"),
        ),
      ).guides;
    const slugs = previous.map((guide) => guide.slug);
    assert.equal(
      await db.foreverGuide.count({ where: { slug: { in: slugs } } }),
      0,
      "Fixture slugs already exist; refusing to overwrite them",
    );
    const directory = await mkdtemp(join(tmpdir(), "simulation-discovery-"));
    const backup = join(directory, "backup.json");
    const ids = previous.map(() => randomUUID());
    const unrelatedId = randomUUID();
    const run = (args: string[], success = true): Record<string, unknown> => {
      const result = spawnSync(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/refresh-simulation-discovery.ts",
          ...args,
        ],
        { encoding: "utf8", env: process.env },
      );
      if (!success) {
        assert.notEqual(result.status, 0);
        return {};
      }
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(
        result.stdout.trim().split("\n").at(-1) ?? "",
      ) as Record<string, unknown>;
    };
    try {
      await db.foreverGuide.createMany({
        data: previous.map((guide, index) => ({
          ...guide,
          id: ids[index],
          author: "Integration fixture",
          published: true,
          publishedAt: new Date("2026-10-23T00:00:00Z"),
          metaTitle: index === 0 ? "Custom search title" : guide.title,
          metaDescription: guide.excerpt,
        })),
      });
      await db.foreverGuide.create({
        data: {
          id: unrelatedId,
          slug: `untouched-${unrelatedId}`,
          title: "Unrelated fixture",
          excerpt: "Preserve",
          content: "Preserve",
          author: "Fixture",
          category: "Community",
          published: true,
        },
      });
      const original = await db.foreverGuide.findMany({
        orderBy: { slug: "asc" },
      });
      const untouched = original.find((guide) => guide.id === unrelatedId);
      assert.deepEqual(run(["--dry-run"]), {
        status: "verified",
        dryRun: true,
        writes: 0,
        updated: 10,
        preserved: 0,
        untouched: 1,
      });
      assert.deepEqual(
        await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
        original,
      );
      assert.equal(run(["--publish", "--backup=" + backup]).writes, 10);
      assert.equal((await lstat(backup)).mode & 0o077, 0);
      const published = await db.foreverGuide.findMany({
        orderBy: { slug: "asc" },
      });
      for (const guide of published.filter((guide) =>
        slugs.includes(guide.slug),
      )) {
        const source = simulationGuides.find(
          (source) => source.slug === guide.slug,
        );
        assert(source);
        assert.equal(editorialFingerprint(guide), editorialFingerprint(source));
        const before = original.find((before) => before.id === guide.id)!;
        for (const key of [
          "author",
          "category",
          "coverImage",
          "published",
          "publishedAt",
          "createdAt",
        ] as const)
          assert.deepEqual(guide[key], before[key]);
      }
      assert.equal(
        published.find((guide) => guide.id === ids[0])!.metaTitle,
        "Custom search title",
      );
      assert.deepEqual(
        published.find((guide) => guide.id === unrelatedId),
        untouched,
      );
      assert.equal(run(["--dry-run"]).preserved, 10);
      const changed = published.find((guide) => guide.id === ids[1])!;
      await db.foreverGuide.update({
        where: { id: changed.id },
        data: { content: changed.content + "\nHuman correction" },
      });
      const afterEdit = await db.foreverGuide.findMany({
        orderBy: { slug: "asc" },
      });
      run(["--rollback-backup=" + backup], false);
      assert.deepEqual(
        await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
        afterEdit,
      );
      await db.foreverGuide.update({
        where: { id: changed.id },
        data: { content: changed.content },
      });
      await db.foreverGuide.update({
        where: { id: changed.id },
        data: { metaTitle: "Editor's SEO title" },
      });
      const afterSeoEdit = await db.foreverGuide.findMany({
        orderBy: { slug: "asc" },
      });
      run(["--rollback-backup=" + backup], false);
      assert.deepEqual(
        await db.foreverGuide.findMany({ orderBy: { slug: "asc" } }),
        afterSeoEdit,
      );
      await db.foreverGuide.update({
        where: { id: changed.id },
        data: { metaTitle: changed.metaTitle },
      });
      assert.equal(run(["--rollback-backup=" + backup]).restored, 10);
      assert.equal(run(["--rollback-backup=" + backup]).preserved, 10);
      const restored = await db.foreverGuide.findMany({
        orderBy: { slug: "asc" },
      });
      for (const before of original) {
        const actual = restored.find((guide) => guide.id === before.id)!;
        assert.deepEqual({ ...actual, updatedAt: before.updatedAt }, before);
      }
    } finally {
      await db.foreverGuide.deleteMany({
        where: { id: { in: [...ids, unrelatedId] } },
      });
      await db.$disconnect();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
