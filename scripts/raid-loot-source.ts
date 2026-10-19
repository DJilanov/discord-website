import { parse, type Expression } from "luaparse";
import { load } from "cheerio";
import { z } from "zod";
import { classes, type CatalogItem } from "../lib/raids/contracts";

export const tbcLootSource = {
  provider: "AtlasLoot Revival" as const,
  version: "0.2.4" as const,
  archiveSha256:
    "dc7169b383572a9348727cb6818602247a3f08ad133a243778c4ccd5e43a8ea2",
  fileUrl:
    "https://www.curseforge.com/wow/addons/atlas-loot-revival/files/8963708" as const,
};

export function readLuaData(source: string, variable: string): unknown {
  if (Buffer.byteLength(source) > 1048576)
    throw new Error("Lua data exceeds the import limit.");
  const ast = parse(source, { encodingMode: "pseudo-latin1", comments: false });
  const declarations = ast.body.filter(
    (node) =>
      node.type === "LocalStatement" &&
      node.variables.length === 1 &&
      node.variables[0].name === variable,
  );
  if (
    declarations.length !== 1 ||
    declarations[0].type !== "LocalStatement" ||
    declarations[0].init.length !== 1
  )
    throw new Error("Expected one static data declaration.");
  let nodes = 0;
  function value(node: Expression, depth: number): unknown {
    if (++nodes > 100000 || depth > 20)
      throw new Error("Lua data is too complex.");
    if (
      node.type === "StringLiteral" ||
      node.type === "NumericLiteral" ||
      node.type === "BooleanLiteral"
    )
      return node.value;
    if (node.type === "NilLiteral") return null;
    if (node.type !== "TableConstructorExpression")
      throw new Error(
        "Only literal Lua data is accepted; code is never executed.",
      );
    if (node.fields.every((field) => field.type === "TableValue"))
      return node.fields.map((field) => value(field.value, depth + 1));
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const field of node.fields) {
      if (
        field.type !== "TableKeyString" ||
        ["__proto__", "constructor", "prototype"].includes(field.key.name) ||
        Object.hasOwn(result, field.key.name)
      )
        throw new Error("Unsupported or duplicate Lua data key.");
      result[field.key.name] = value(field.value, depth + 1);
    }
    return result;
  }
  return value(declarations[0].init[0], 0);
}

export const tbcMetadataSchema = z
  .object({
    name: z.string().min(1).max(150),
    quality: z.number().int().min(0).max(7),
    classes: z.array(z.enum(classes)).min(1).max(classes.length),
  })
  .strict();
export type TbcItemMetadata = z.infer<typeof tbcMetadataSchema>;

export function readTbcItemMetadata(raw: unknown): TbcItemMetadata {
  const item = z
    .object({
      name: z.string(),
      quality: z.number(),
      tooltip: z.string().max(100000),
    })
    .parse(raw);
  const document = load(item.tooltip);
  const restrictions = document(".wowhead-tooltip-item-classes");
  const permitted = restrictions.length
    ? restrictions
        .find("a")
        .map((_index, element) =>
          z.enum(classes).parse(document(element).text().trim()),
        )
        .get()
    : [...classes];
  return tbcMetadataSchema.parse({
    name: item.name,
    quality: item.quality,
    classes: [...new Set(permitted)],
  });
}

const instanceSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  contentExpansion: z.string(),
});
const encounterSchema = z.object({
  name: z.string().min(1).max(150),
  kind: z.string(),
  items: z.array(
    z.object({ itemID: z.number().int().positive(), category: z.string() }),
  ),
});
export interface TbcLootRelation {
  itemId: number;
  source: string;
  kind: CatalogItem["kind"];
}

export function readTbcRaidRelations(
  instances: unknown,
  loot: unknown,
): Map<string, TbcLootRelation[]> {
  const raids = z.record(z.string(), instanceSchema).parse(instances);
  const encounters = z
    .record(z.string(), z.record(z.string(), encounterSchema))
    .parse(loot);
  const result = new Map<string, TbcLootRelation[]>();
  for (const [key, raid] of Object.entries(raids)) {
    if (raid.contentExpansion !== "tbc" || raid.contentType !== "raid")
      continue;
    const name =
      raid.name === "Battle for Mount Hyjal"
        ? "Hyjal Summit"
        : raid.name === "Tempest Keep: The Eye" || raid.name === "Tempest Keep"
          ? "The Eye"
          : raid.name;
    const rows: TbcLootRelation[] = [];
    for (const encounter of Object.values(encounters[key] ?? {})) {
      for (const item of encounter.items) {
        if (item.itemID === 29434) continue;
        rows.push({
          itemId: item.itemID,
          source: encounter.name,
          kind:
            item.category === "token"
              ? "token"
              : item.category === "quest"
                ? "quest"
                : encounter.kind === "trash"
                  ? "trash"
                  : encounter.kind === "event"
                    ? "event"
                    : "boss",
        });
      }
    }
    if (!rows.length) throw new Error(`Empty TBC source: ${name}`);
    result.set(name, rows);
  }
  return result;
}
