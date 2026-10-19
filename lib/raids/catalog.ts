import { createHash } from "node:crypto";
import { z } from "zod";
import { classes, type CatalogItem } from "./contracts";
import { HttpError } from "@/lib/security";
import { gameLabels, type RaidGame } from "./games";

export function isForeverWowheadUrl(
  value: string,
  resource: "item" | "guide",
): boolean {
  return isGameWowheadUrl(value, "forever", resource);
}
export function isGameWowheadUrl(
  value: string,
  game: RaidGame,
  resource: "item" | "guide",
): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["www.wowhead.com", "wowhead.com"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      url.search
    )
      return false;
    return resource === "item"
      ? new RegExp(`^/${game}/item=[1-9]\\d*(?:/[a-z0-9-]+)?$`).test(
          url.pathname,
        )
      : new RegExp(`^/${game}/guide/[a-z0-9-]+$`).test(url.pathname);
  } catch {
    return false;
  }
}
function itemSchema(game: RaidGame) {
  return z
    .object({
      itemId: z.number().int().positive().max(2147483647),
      name: z.string().trim().min(1).max(150),
      sourceUrl: z
        .string()
        .max(500)
        .refine(
          (value) => isGameWowheadUrl(value, game, "item"),
          `Expected an English Wowhead ${gameLabels[game]} item URL`,
        ),
      lootSource: z.string().trim().min(1).max(150),
      kind: z.enum(["boss", "trash", "quest", "token", "event"]),
      classes: z.array(z.enum(classes)).min(1).max(classes.length),
      evidence: z.enum(["source_reported", "client_observed"]),
    })
    .strict()
    .superRefine((item, context) => {
      const id = Number(
        new URL(item.sourceUrl).pathname.split("/")[2].slice("item=".length),
      );
      if (id !== item.itemId)
        context.addIssue({
          code: "custom",
          message: "Source URL item ID does not match itemId",
        });
      if (new Set(item.classes).size !== item.classes.length)
        context.addIssue({
          code: "custom",
          message: "Class restrictions must be unique",
        });
    });
}
function bundleSchema<G extends RaidGame>(game: G) {
  return z
    .object({
      schema:
        game === "forever"
          ? z.literal("forever-wowhead-loot-candidates.v1")
          : z.enum([
              "tbc-wowhead-loot-candidates.v1",
              "tbc-atlasloot-loot-candidates.v1",
            ]),
      game: z.literal(game),
      raidName: z.string().trim().min(3).max(100),
      raidSourceUrl: z
        .string()
        .max(500)
        .refine(
          (value) =>
            isGameWowheadUrl(value, game, "guide") ||
            (game === "tbc" &&
              value ===
                "https://www.curseforge.com/wow/addons/atlas-loot-revival/files/8963708"),
          `Expected an English Wowhead ${gameLabels[game]} guide URL`,
        ),
      sourcePatch: z.string().trim().min(1).max(100).nullable(),
      clientBuild: z.string().trim().min(1).max(100).nullable(),
      availability: z.enum(["confirmed", "unreleased", "unknown"]),
      coverage: z.enum(["partial", "complete"]),
      capturedAt: z.iso.datetime({ offset: true }),
      authorizedSource: z.literal(true),
      provenance: z
        .object({
          provider: z.literal("AtlasLoot Revival"),
          version: z.literal("0.2.4"),
          archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
          fileUrl: z.literal(
            "https://www.curseforge.com/wow/addons/atlas-loot-revival/files/8963708",
          ),
        })
        .strict()
        .optional(),
      items: z.array(itemSchema(game)).min(1).max(2000),
    })
    .strict()
    .superRefine((bundle, context) => {
      const atlas = bundle.schema === "tbc-atlasloot-loot-candidates.v1";
      if (
        atlas
          ? !bundle.provenance ||
            bundle.raidSourceUrl !== bundle.provenance.fileUrl
          : bundle.provenance ||
            !isGameWowheadUrl(bundle.raidSourceUrl, game, "guide")
      )
        context.addIssue({
          code: "custom",
          message:
            "Catalog source and provenance must match the declared provider.",
        });
      if (
        new Set(bundle.items.map((item) => item.itemId)).size !==
        bundle.items.length
      )
        context.addIssue({
          code: "custom",
          message: "Duplicate item IDs: combine loot sources before import",
        });
      if (
        bundle.items.some((item) => item.evidence === "client_observed") &&
        !bundle.clientBuild
      )
        context.addIssue({
          code: "custom",
          message:
            "Client-observed items require the actual client build for this edition",
        });
    });
}
export const catalogBundleSchema = z.discriminatedUnion("game", [
  bundleSchema("forever"),
  bundleSchema("tbc"),
]);
export type CatalogBundle = z.infer<typeof catalogBundleSchema>;
export function normalizeCatalog(raw: unknown): {
  bundle: CatalogBundle;
  checksum: string;
  warnings: string[];
} {
  const bundle = catalogBundleSchema.parse(raw);
  if (new Date(bundle.capturedAt).getTime() > Date.now() + 300000)
    throw new HttpError(400, "Source capture time cannot be in the future.");
  bundle.items.sort((a, b) => a.itemId - b.itemId);
  for (const item of bundle.items) item.classes.sort();
  // Capture time is provenance, not catalog content; identical reimports stay idempotent.
  const content = { ...bundle, capturedAt: undefined };
  const checksum = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  const warnings = [
    `Source links alone do not prove current ${gameLabels[bundle.game]} raid drops. Review each item and source context.`,
  ];
  if (bundle.coverage === "partial")
    warnings.push(
      "Partial catalog: omitted items are not deletions. Existing event catalogs remain unchanged.",
    );
  if (!bundle.clientBuild)
    warnings.push(
      `Source-reported catalog; no verified ${gameLabels[bundle.game]} client build.`,
    );
  if (bundle.availability !== "confirmed")
    warnings.push("Unavailable or unconfirmed raid: publication is blocked.");
  return { bundle, checksum, warnings };
}
export function catalogItems(bundle: unknown): CatalogItem[] {
  return catalogBundleSchema.parse(bundle).items;
}
