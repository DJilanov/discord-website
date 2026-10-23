import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  simulationEvidenceSchema,
  type SimulationBuild,
} from "../lib/simulation-evidence-schema";
import { describeRecordedRotation } from "../lib/simulation-apl";
import {
  mapRecordedTalents,
  simulationTalentTreeSchema,
  clientTalentTreesSchema,
} from "../lib/simulation-talents";

const hash = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
const guidance = z.object({
  scenario: z.string(),
  priorities: z.array(z.string()),
  caveats: z.array(z.string()),
  instruction: z.string().optional(),
});
const sourceSchema = z.object({
  capturedAt: z.string().datetime(),
  pointerSha256: z.string(),
  builds: z.array(
    z.object({
      id: z.string(),
      className: z.string(),
      profile: z.string(),
      profileSlug: z.string(),
      displayName: z.string().optional(),
      referenceDps: z.number(),
      validationIterations: z.number(),
      requiresProvisionalEnchantOptIn: z.boolean(),
      rotationGuidance: guidance.optional(),
      warnings: z.array(z.string()),
      href: z.string(),
      release: z.string(),
      publicationSha256: z.string(),
      wasmSha256: z.string(),
      databaseSha256: z.string(),
      settings: z
        .object({
          player: z
            .object({ talentsString: z.string(), rotation: z.json() })
            .passthrough(),
        })
        .passthrough(),
      items: z.array(
        z.object({
          slot: z.number(),
          id: z.number(),
          name: z.string().optional(),
          icon: z.string().optional(),
          quality: z.number().optional(),
          stats: z.array(z.number()).optional(),
          enchant: z.object({ name: z.string() }).nullable().optional(),
        }),
      ),
    }),
  ),
  manifests: z.record(z.string(), z.unknown()),
});
const benchmarkSchema = z.object({
  verifiedAt: z.string(),
  sourcePointerSha256: z.string(),
  policySha256: z.string(),
  entries: z
    .array(
      z.object({
        id: z.string(),
        dps: z.number(),
        stdev: z.number(),
        iterations: z.literal(5000),
        capturedAt: z.string(),
        requestSha256: z.string(),
        responseSha256: z.string(),
        publicationSha256: z.string(),
        wasmSha256: z.string(),
        databaseSha256: z.string(),
      }),
    )
    .length(25),
});
const sourceUrl = "https://kfcguild.online/tools/api/v1/forever/preview.json";
const snapshotSchema = z.object({
  snapshot: z.object({ checksum: z.string(), build: z.string() }),
  license: z.object({
    id: z.string(),
    url: z.string(),
    attribution: z.string(),
  }),
  data: z.object({
    talents: z.record(
      z.string(),
      z.object({ icon: z.string(), trees: clientTalentTreesSchema }),
    ),
  }),
});
const statNames = [
  "Strength",
  "Agility",
  "Stamina",
  "Intellect",
  "Spirit",
  "Spell power",
  "Arcane power",
  "Fire power",
  "Frost power",
  "Holy power",
  "Nature power",
  "Shadow power",
  "Mana per 5 sec",
  "Spell hit input",
  "Spell crit input",
  "Spell haste input",
  "Spell penetration",
  "Attack power",
  "Melee hit input",
  "Melee crit input",
  "Melee haste input",
  "Armor penetration",
  "Expertise input",
  "Mana",
  "Energy",
  "Rage",
  "Armor",
  "Ranged attack power",
  "Defense input",
  "Block input",
  "Block value",
  "Dodge input",
  "Parry input",
  "Resilience input",
  "Health",
  "Arcane resistance",
  "Fire resistance",
  "Frost resistance",
  "Nature resistance",
  "Shadow resistance",
  "Bonus armor",
  "Healing power",
  "Spell damage",
  "Feral attack power",
];
function readable(text: string): string {
  return text.replace(
    /(MP5)|([A-Za-z,])(\d)/g,
    (
      _match: string,
      resource: string | undefined,
      prefix: string | undefined,
      digit: string | undefined,
    ): string => resource ?? `${prefix} ${digit}`,
  );
}
async function request(url: string, method = "GET"): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        signal: AbortSignal.timeout(30000),
        redirect: "manual",
      });
      if (![429, 502, 503, 504].includes(response.status) || attempt === 2)
        return response;
    } catch (error) {
      if (attempt === 2)
        throw new Error(`Request failed: ${new URL(url).pathname}`, {
          cause: error,
        });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error("Request retries exhausted");
}

async function main(): Promise<void> {
  const input = resolve(process.argv[2] ?? "../"),
    helper = resolve(process.argv[3] ?? "../../../../wow-trader");
  const source = sourceSchema.parse(
    JSON.parse(await readFile(join(input, "source-evidence.json"), "utf8")),
  );
  const benchmark = benchmarkSchema.parse(
    JSON.parse(await readFile(join(input, "benchmark.json"), "utf8")),
  );
  if (source.pointerSha256 !== benchmark.sourcePointerSha256)
    throw new Error("Benchmark does not match captured sources");
  const response = await request(sourceUrl);
  if (!response.ok) throw new Error("Talent snapshot unavailable");
  const snapshot = snapshotSchema.parse(await response.json());
  if (
    snapshot.snapshot.checksum !==
    "ba1427415d5f0d850e1f12a48a6b81e81b25a23cebf86923d1d7456eb4bf1cfc"
  )
    throw new Error("Review new client snapshot before importing");
  const builds: SimulationBuild[] = [],
    icons = new Set<string>();
  const databaseSchema = z.object({
    spellIcons: z.array(z.object({ id: z.number(), name: z.string() })),
    itemIcons: z.array(z.object({ id: z.number(), name: z.string() })),
  });
  for (const build of source.builds.filter(
    (build) => !build.requiresProvisionalEnchantOptIn,
  )) {
    const metric = benchmark.entries.find((entry) => entry.id === build.id);
    if (
      !metric ||
      metric.publicationSha256 !== build.publicationSha256 ||
      metric.wasmSha256 !== build.wasmSha256 ||
      metric.databaseSha256 !== build.databaseSha256
    )
      throw new Error("Numerical evidence mismatch");
    const raw = await readFile(
      join(
        helper,
        "artifacts/forever-simulator",
        build.release,
        "assets/database/db.json",
      ),
    );
    if (hash(raw) !== build.databaseSha256)
      throw new Error("Pinned item database changed");
    const database = databaseSchema.parse(JSON.parse(raw.toString("utf8")));
    const names: Record<string, string> = {};
    for (const item of database.itemIcons) names[`item:${item.id}`] = item.name;
    for (const spell of database.spellIcons)
      names[`spell:${spell.id}`] = spell.name;
    const recorded = build.rotationGuidance
      ? null
      : describeRecordedRotation(build.settings.player.rotation, names);
    const g = build.rotationGuidance,
      classKey = build.className.toLowerCase(),
      treePoints = build.settings.player.talentsString
        .split("-")
        .map((tree) => [...tree].reduce((sum, n) => sum + Number(n), 0));
    while (treePoints.length < 3) treePoints.push(0);
    const icon = snapshot.data.talents[build.className]?.icon;
    if (!icon) throw new Error("Class icon unavailable");
    icons.add(icon);
    const mapBytes = await readFile(
      join(
        helper,
        ".cache/forever-sim-upstream/ui/core/talents/trees",
        `${classKey}.json`,
      ),
    );
    const selectedTalents = mapRecordedTalents(
      build.settings.player.talentsString,
      simulationTalentTreeSchema.parse(JSON.parse(mapBytes.toString("utf8"))),
      snapshot.data.talents[build.className].trees,
    );
    for (const talent of selectedTalents) icons.add(talent.icon);
    const gear = build.items.map((item) => {
      const icon = item.icon ?? "inv_misc_questionmark";
      if (item.id) icons.add(icon);
      return {
        slot: item.slot,
        id: item.id,
        name: item.name ?? "Intentionally empty",
        icon,
        quality: item.quality ?? 0,
        stats: (item.stats ?? []).flatMap((value, index) =>
          value
            ? [
                `${value > 0 ? "+" : ""}${Number(value.toFixed(4))} ${statNames[index] ?? `engine stat ${index}`}`,
              ]
            : [],
        ),
        enchant: item.enchant?.name ?? "No enchant recorded",
      };
    });
    let simulatorHref: string | null = null;
    const target = `https://kfcguild.online/tools/forever-sim/${build.release}/${build.profile}/`;
    let available = await request(target, "HEAD");
    if (available.status === 308) {
      const next = new URL(available.headers.get("location") ?? "", target);
      if (
        next.origin !== new URL(target).origin ||
        next.pathname !== new URL(target).pathname.slice(0, -1)
      )
        throw new Error("Unexpected simulator redirect");
      available = await request(next.href, "HEAD");
    }
    if (available.ok)
      simulatorHref = "https://kfcguild.online/tools" + build.href;
    builds.push({
      id: build.id,
      classKey,
      profile: build.profile,
      profileSlug: build.profileSlug,
      name:
        build.displayName?.split(" · ")[0] ??
        (build.id === "two-hand-fury-static"
          ? "Two-handed Fury"
          : build.profile === "warrior"
            ? build.id.startsWith("arms")
              ? "Arms"
              : "Fury"
            : build.profile),
      referenceDps: build.referenceDps,
      referenceIterations: build.validationIterations,
      dps: metric.dps,
      stdev: metric.stdev,
      iterations: 5000,
      measuredAt: metric.capturedAt,
      talents: build.settings.player.talentsString,
      talentMapSha256: hash(mapBytes),
      selectedTalents,
      treePoints,
      scenario: readable(
        g?.scenario ??
          "Level 60, one level-63 target for 300 seconds with the recorded equipment and priority. The common benchmark replaces raid support; the original reference keeps its saved scenario.",
      ),
      priorities: (g?.priorities ?? recorded!.priorities).map(readable),
      prepull: recorded?.prepull ?? [],
      disabled: recorded?.disabled ?? [],
      caveats: (
        g?.caveats ?? [
          "These instructions are a literal reading of the recorded action list, not a separately measured human-friendly simplification.",
        ]
      ).map(readable),
      warnings: build.warnings.map(readable),
      options: Object.entries(build.settings.player)
        .filter(
          ([key, value]) =>
            ![
              "rotation",
              "equipment",
              "talentsString",
              "buffs",
              "consumes",
              "professions",
              "database",
              "name",
              "class",
              "race",
              "level",
            ].includes(key) &&
            value !== null &&
            typeof value === "object",
        )
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
      gear,
      simulatorHref,
      release: build.release,
      wasmSha256: build.wasmSha256,
      databaseSha256: build.databaseSha256,
      publicationSha256: build.publicationSha256,
      rotationSha256: hash(JSON.stringify(build.settings.player.rotation)),
      requestSha256: metric.requestSha256,
      responseSha256: metric.responseSha256,
    });
    builds[builds.length - 1].options.unshift(
      ...["race", "professions", "consumes", "buffs"]
        .filter((key) => build.settings.player[key] !== undefined)
        .map((key) => `${key}: ${JSON.stringify(build.settings.player[key])}`),
    );
    await mkdir("public/data/simulation-guides", { recursive: true });
    await writeFile(
      `public/data/simulation-guides/${build.id}.json`,
      JSON.stringify(
        {
          schema: "community-recorded-simulation-build.v1",
          id: build.id,
          release: build.release,
          wasmSha256: build.wasmSha256,
          databaseSha256: build.databaseSha256,
          settings: build.settings,
        },
        null,
        2,
      ) + "\n",
    );
  }
  const assets = [];
  await mkdir("public/images/simulation-icons", { recursive: true });
  for (const icon of [...icons].sort()) {
    if (!/^[a-z0-9_-]+$/.test(icon)) throw new Error("Unsafe icon name");
    let bytes: Buffer;
    try {
      bytes = await readFile(`public/images/guide-icons/${icon}.jpg`);
    } catch {
      try {
        bytes = await readFile(
          join(
            helper,
            ".cache/forever-sim-upstream/assets/img/wowhead/icons/large",
            `${icon}.jpg`,
          ),
        );
      } catch {
        const result = await request(
          `https://kfcguild.online/tools/api/forever-assets/icon/${icon}?v=${snapshot.snapshot.checksum}`,
        );
        if (
          !result.ok ||
          !result.headers.get("content-type")?.startsWith("image/")
        )
          throw new Error(`Icon unavailable: ${icon}`);
        bytes = Buffer.from(await result.arrayBuffer());
      }
    }
    if (bytes.length < 20 || bytes.length > 100000)
      throw new Error("Invalid bitmap size");
    await writeFile(`public/images/simulation-icons/${icon}.jpg`, bytes);
    assets.push({ key: icon, sha256: hash(bytes) });
  }
  const value = simulationEvidenceSchema.parse({
    schema: "community-class-simulation-guides.v1",
    capturedAt: benchmark.verifiedAt,
    sourcePointerSha256: source.pointerSha256,
    policySha256: benchmark.policySha256,
    sourceUrl,
    clientBuild: snapshot.snapshot.build,
    license: snapshot.license,
    builds,
    assets,
  });
  await writeFile(
    "content/simulation-evidence.json",
    JSON.stringify(value, null, 2) + "\n",
  );
  await copyFile(
    join(input, "benchmark.json"),
    "public/data/simulation-guides/benchmark.json",
  );
  console.log(
    JSON.stringify({
      classes: 9,
      builds: builds.length,
      icons: assets.length,
      publicReplay: builds.filter((build) => build.simulatorHref).length,
    }),
  );
}
main().catch((error: unknown): void => {
  console.error(
    error instanceof Error ? error.message : "Simulation import failed",
  );
  process.exitCode = 1;
});
