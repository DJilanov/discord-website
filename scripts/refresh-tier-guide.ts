import "./env";
import assert from "node:assert/strict";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { db } from "../lib/db";
import { dpsTierSlug, simulationGuides } from "../content/simulation-guides";
import { editorialFingerprint } from "../lib/editorial-publication";
import {
  previousTierGuideFingerprint,
  tierGuideRefreshAction,
  tierGuideRefreshMetadata,
} from "../lib/simulation-tier-publication";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const previousSchema = z
  .object({
    id: z.string().min(1).max(128),
    slug: z.literal(dpsTierSlug),
    title: z.string().min(1),
    excerpt: z.string(),
    content: z.string().min(1),
    metaTitle: z.string().nullable(),
    metaDescription: z.string().nullable(),
    published: z.literal(true),
    updatedAt: z.string().datetime(),
  })
  .strict();
const backupSchema = z
  .object({
    schema: z.literal("community-solo-raid-publication-backup.v1"),
    previousFingerprint: digest,
    targetFingerprint: digest,
    previous: previousSchema,
  })
  .strict();

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      publish: { type: "boolean" },
      backup: { type: "string" },
      "rollback-backup": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  assert.equal(
    Number(Boolean(values["dry-run"])) +
      Number(Boolean(values.publish)) +
      Number(Boolean(values["rollback-backup"])),
    1,
    "Choose --dry-run, --publish --backup=/absolute/file.json, or --rollback-backup=/absolute/file.json",
  );
  assert(
    Boolean(values.backup) === Boolean(values.publish),
    "Only --publish requires a new backup file",
  );
  const source = simulationGuides.find((guide) => guide.slug === dpsTierSlug);
  assert(source);
  if (values["rollback-backup"]) {
    const file = values["rollback-backup"];
    assert(isAbsolute(file), "Use an absolute backup path");
    const info = await lstat(file);
    assert(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.size <= 1_000_000 &&
        (info.mode & 0o077) === 0,
      "Use an unlinked private publication backup",
    );
    const backup = backupSchema.parse(JSON.parse(await readFile(file, "utf8")));
    assert.equal(backup.previousFingerprint, previousTierGuideFingerprint);
    assert.equal(
      editorialFingerprint(backup.previous),
      backup.previousFingerprint,
    );
    assert.equal(
      backup.targetFingerprint,
      editorialFingerprint(source),
      "Backup belongs to another revision",
    );
    const action = await db.$transaction(
      async (tx): Promise<string> => {
        const current = await tx.foreverGuide.findUnique({
          where: { slug: dpsTierSlug },
        });
        assert(
          current && current.published && current.id === backup.previous.id,
          "Published article identity changed",
        );
        const fingerprint = editorialFingerprint(current);
        if (fingerprint === backup.previousFingerprint)
          return "already-restored";
        assert.equal(
          fingerprint,
          backup.targetFingerprint,
          "The article changed after publication; rollback refused",
        );
        const metadata = tierGuideRefreshMetadata(backup.previous, source);
        assert.equal(
          current.metaTitle,
          metadata.metaTitle,
          "SEO title changed; rollback refused",
        );
        assert.equal(
          current.metaDescription,
          metadata.metaDescription,
          "SEO description changed; rollback refused",
        );
        const old = backup.previous;
        const result = await tx.foreverGuide.updateMany({
          where: {
            id: current.id,
            slug: dpsTierSlug,
            updatedAt: current.updatedAt,
            published: true,
          },
          data: {
            title: old.title,
            excerpt: old.excerpt,
            content: old.content,
            metaTitle: old.metaTitle,
            metaDescription: old.metaDescription,
          },
        });
        assert.equal(
          result.count,
          1,
          "Concurrent article change; rollback refused",
        );
        return "restored";
      },
      { timeout: 15000 },
    );
    console.log(JSON.stringify({ status: action, slug: dpsTierSlug }));
    return;
  }
  const result = await db.$transaction(
    async (tx): Promise<{ action: string; writes: number }> => {
      const existing = await tx.foreverGuide.findUnique({
        where: { slug: dpsTierSlug },
      });
      const action = tierGuideRefreshAction(existing, source);
      assert(existing);
      if (action === "preserve" || values["dry-run"])
        return { action, writes: 0 };
      const path = values.backup;
      assert(path && isAbsolute(path), "Use an absolute backup path");
      const backup = backupSchema.parse({
        schema: "community-solo-raid-publication-backup.v1",
        previousFingerprint: editorialFingerprint(existing),
        targetFingerprint: editorialFingerprint(source),
        previous: {
          id: existing.id,
          slug: existing.slug,
          title: existing.title,
          excerpt: existing.excerpt,
          content: existing.content,
          metaTitle: existing.metaTitle,
          metaDescription: existing.metaDescription,
          published: existing.published,
          updatedAt: existing.updatedAt.toISOString(),
        },
      });
      await writeFile(path, JSON.stringify(backup, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
      });
      const updated = await tx.foreverGuide.updateMany({
        where: {
          id: existing.id,
          slug: dpsTierSlug,
          updatedAt: existing.updatedAt,
          published: true,
        },
        data: {
          title: source.title,
          excerpt: source.excerpt,
          content: source.content,
          ...tierGuideRefreshMetadata(existing, source),
        },
      });
      assert.equal(
        updated.count,
        1,
        "Concurrent editorial change; refresh rolled back",
      );
      return { action, writes: 1 };
    },
    { timeout: 15000 },
  );
  console.log(
    JSON.stringify({
      status: "verified",
      dryRun: Boolean(values["dry-run"]),
      slug: dpsTierSlug,
      ...result,
    }),
  );
}
main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "Tier publication failed",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => db.$disconnect());
