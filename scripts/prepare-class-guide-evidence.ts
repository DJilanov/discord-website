import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import { classGuides } from "../content/class-guides";

const icon = z.string().regex(/^[a-z0-9_]+$/);
const talentSchema = z.object({
  name: z.string(),
  max: z.number().int().positive(),
  row: z.number().int().positive(),
  icon,
  desc: z.array(z.string()),
  complete: z.boolean(),
  confirmed: z.array(z.number()),
});
const spellSchema = z.object({
  d: z.string(),
  lv: z.string(),
  nt: z.number().optional(),
  l: z.array(z.array(z.string())),
});
const schema = z.object({
  snapshot: z.object({
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    generated: z.string(),
    build: z.string(),
  }),
  license: z.object({
    id: z.literal("CC-BY-4.0"),
    url: z.string().url(),
    attribution: z.string(),
  }),
  source: z.object({ homepage: z.string().url(), data: z.string().url() }),
  data: z.object({
    talents: z.record(
      z.string(),
      z.object({
        icon,
        trees: z.array(
          z.object({ name: z.string(), talents: z.array(talentSchema) }),
        ),
      }),
    ),
    spell_desc: z.record(z.string(), spellSchema),
  }),
  supplemental: z.object({ spellbookIcons: z.record(z.string(), icon) }),
});

async function main(): Promise<void> {
  const sourceUrl = "https://kfcguild.online/tools/api/v1/forever/preview.json";
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Guide evidence HTTP ${response.status}`);
  const source = schema.parse(await response.json());
  const expected =
    "ba1427415d5f0d850e1f12a48a6b81e81b25a23cebf86923d1d7456eb4bf1cfc";
  if (source.snapshot.checksum !== expected)
    throw new Error("Review the new snapshot before replacing guide evidence.");
  const icons = new Set<string>();
  const classes = classGuides.map((guide) => {
    const data = source.data.talents[guide.className];
    if (!data) throw new Error(`Missing ${guide.className}`);
    icons.add(data.icon);
    const talents = guide.talents.map(({ name }) => {
      const tree = data.trees.find((entry) =>
        entry.talents.some((talent) => talent.name === name),
      );
      const talent = tree?.talents.find((entry) => entry.name === name);
      if (
        !talent ||
        !talent.complete ||
        talent.desc.length !== talent.max ||
        Array.from({ length: talent.max }, (_, i) => i + 1).some(
          (rank) => !talent.confirmed.includes(rank),
        )
      )
        throw new Error(`Incomplete talent: ${name}`);
      icons.add(talent.icon);
      return {
        name,
        tree: tree!.name,
        icon: talent.icon,
        row: talent.row,
        ranks: talent.desc,
      };
    });
    const spells = [
      ...new Set(
        guide.scenarios.flatMap((scenario) =>
          scenario.steps.map((step) => step.spell),
        ),
      ),
    ].map((name) => {
      const entries = Object.entries(source.data.spell_desc).filter(([key]) =>
        key.startsWith(`${guide.className}|${name}|`),
      );
      const candidates = entries
        .map(([key, spell]) => ({
          key,
          spell,
          level: Number(/^Learned at level (\d+)$/.exec(spell.lv)?.[1]),
        }))
        .filter((entry) => Number.isInteger(entry.level) && entry.level > 0)
        .sort((a, b) => a.level - b.level);
      const first = candidates[0];
      if (!first) throw new Error(`Missing spell: ${name}`);
      const iconKey = source.supplemental.spellbookIcons[name];
      if (!iconKey) throw new Error(`Missing spell icon: ${name}`);
      icons.add(iconKey);
      return {
        name,
        icon: iconKey,
        level: first.level,
        talented: first.spell.nt === 3,
        ranks: candidates.map((entry) => ({
          rank: entry.key.split("|")[2],
          level: entry.level,
          description: entry.spell.d,
          lines: entry.spell.l,
        })),
      };
    });
    return { key: guide.key, icon: data.icon, talents, spells };
  });
  const directory = join(process.cwd(), "public/images/guide-icons");
  await mkdir(directory, { recursive: true });
  const assets = [];
  for (const key of [...icons].sort()) {
    const result = await fetch(
      `https://kfcguild.online/tools/api/forever-assets/icon/${key}?v=${source.snapshot.checksum}`,
      { signal: AbortSignal.timeout(15000), redirect: "error" },
    );
    if (!result.ok || !result.headers.get("content-type")?.startsWith("image/"))
      throw new Error(`Missing icon: ${key}`);
    const bytes = Buffer.from(await result.arrayBuffer());
    if (bytes.length < 20 || bytes.length > 100000)
      throw new Error(`Invalid icon size: ${key}`);
    await writeFile(join(directory, `${key}.jpg`), bytes);
    assets.push({
      key,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await writeFile(
    "content/class-guide-evidence.json",
    JSON.stringify(
      {
        sourceUrl,
        snapshot: source.snapshot,
        license: source.license,
        source: source.source,
        classes,
        assets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      classes: classes.length,
      talents: classes.reduce((sum, item) => sum + item.talents.length, 0),
      icons: assets.length,
      snapshot: source.snapshot.checksum,
    }),
  );
}

main().catch((error: unknown): void => {
  console.error(
    error instanceof Error
      ? error.message
      : "Guide evidence preparation failed.",
  );
  process.exitCode = 1;
});
