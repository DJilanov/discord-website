import "./env";
import assert from "node:assert/strict";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { db } from "../lib/db";
import { simulationGuides } from "../content/simulation-guides";
import { editorialFingerprint } from "../lib/editorial-publication";
import {
  planSimulationDiscovery,
  previousDiscoveryFingerprints,
} from "../lib/simulation-discovery-publication";
import { tierGuideRefreshMetadata } from "../lib/simulation-tier-publication";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const previousSchema = z
  .object({
    id: z.string().min(1).max(128),
    slug: z.string().min(1),
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
    schema: z.literal("community-simulation-discovery-backup.v1"),
    entries: z
      .array(
        z
          .object({
            previousFingerprint: digest,
            targetFingerprint: digest,
            previous: previousSchema,
          })
          .strict(),
      )
      .min(1)
      .max(10),
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
  assert.equal(
    Boolean(values.backup),
    Boolean(values.publish),
    "Only --publish requires a new backup",
  );

  if (values["rollback-backup"]) {
    const file = values["rollback-backup"];
    assert(isAbsolute(file), "Use an absolute private backup path");
    const info = await lstat(file);
    assert(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.size <= 2_000_000 &&
        (info.mode & 0o077) === 0,
      "Use an unlinked private backup",
    );
    const backup = backupSchema.parse(JSON.parse(await readFile(file, "utf8")));
    assert.equal(
      new Set(backup.entries.map((entry) => entry.previous.slug)).size,
      backup.entries.length,
      "Duplicate backup guide",
    );
    const result = await db.$transaction(
      async (tx): Promise<{ restored: number; preserved: number }> => {
        const rows = await tx.foreverGuide.findMany({
          where: {
            slug: { in: backup.entries.map((entry) => entry.previous.slug) },
          },
        });
        const plans = backup.entries.map((entry) => {
          const old = entry.previous;
          const source = simulationGuides.find(
            (guide) => guide.slug === old.slug,
          );
          assert(
            source &&
              entry.previousFingerprint ===
                previousDiscoveryFingerprints[old.slug],
            "Unknown backup revision",
          );
          assert.equal(editorialFingerprint(old), entry.previousFingerprint);
          assert.equal(
            editorialFingerprint(source),
            entry.targetFingerprint,
            "Backup belongs to another source revision",
          );
          const current = rows.find(
            (guide) => guide.id === old.id && guide.slug === old.slug,
          );
          assert(current?.published, "Published guide identity changed");
          const fingerprint = editorialFingerprint(current);
          if (fingerprint === entry.previousFingerprint)
            return { old, current, restore: false };
          assert.equal(
            fingerprint,
            entry.targetFingerprint,
            "Editorial changes made after publication; rollback refused",
          );
          const metadata = tierGuideRefreshMetadata(old, source);
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
          return { old, current, restore: true };
        });
        for (const { old, current } of plans.filter((plan) => plan.restore)) {
          const result = await tx.foreverGuide.updateMany({
            where: {
              id: current.id,
              slug: current.slug,
              published: true,
              updatedAt: current.updatedAt,
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
            "Concurrent guide change; transaction rolled back",
          );
        }
        return {
          restored: plans.filter((plan) => plan.restore).length,
          preserved: plans.filter((plan) => !plan.restore).length,
        };
      },
      { timeout: 15000 },
    );
    console.log(JSON.stringify({ status: "verified", ...result }));
    return;
  }

  const result = await db.$transaction(
    async (
      tx,
    ): Promise<{ updated: number; preserved: number; untouched: number }> => {
      const slugs = simulationGuides.map((guide) => guide.slug);
      const rows = await tx.foreverGuide.findMany({
        where: { slug: { in: slugs } },
      });
      const plans = planSimulationDiscovery(rows);
      const updates = plans.filter((plan) => plan.action === "update");
      const counts = {
        updated: updates.length,
        preserved: plans.length - updates.length,
        untouched: await tx.foreverGuide.count({
          where: { slug: { notIn: slugs } },
        }),
      };
      if (values["dry-run"] || !updates.length) return counts;
      const file = values.backup;
      assert(file && isAbsolute(file), "Use an absolute private backup path");
      const backup = backupSchema.parse({
        schema: "community-simulation-discovery-backup.v1",
        entries: updates.map(({ existing, source }) => ({
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
        })),
      });
      await writeFile(file, JSON.stringify(backup, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
      });
      for (const { existing, source } of updates) {
        const result = await tx.foreverGuide.updateMany({
          where: {
            id: existing.id,
            slug: existing.slug,
            published: true,
            updatedAt: existing.updatedAt,
          },
          data: {
            title: source.title,
            excerpt: source.excerpt,
            content: source.content,
            ...tierGuideRefreshMetadata(existing, source),
          },
        });
        assert.equal(
          result.count,
          1,
          "Concurrent guide change; transaction rolled back",
        );
      }
      return counts;
    },
    { timeout: 15000 },
  );
  console.log(
    JSON.stringify({
      status: "verified",
      dryRun: Boolean(values["dry-run"]),
      writes: values["dry-run"] ? 0 : result.updated,
      ...result,
    }),
  );
}

main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error
        ? error.message
        : "Simulation discovery publication failed",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => db.$disconnect());
