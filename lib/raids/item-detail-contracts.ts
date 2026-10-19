import { z } from "zod";

export const hardReserveCategoriesSchema = z
  .object({
    boe: z.boolean(),
    recipes: z.boolean(),
    materials: z.boolean(),
  })
  .strict();
export type HardReserveCategories = z.infer<typeof hardReserveCategoriesSchema>;
export const itemDetailsSchema = z
  .object({
    itemId: z.number().int().positive(),
    name: z.string().min(1).max(150),
    quality: z.number().int().min(0).max(7),
    icon: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .max(120),
    classId: z.number().int().min(0).max(30),
    subclassId: z.number().int().min(-10).max(100),
    binding: z.enum(["pickup", "equip", "use", "none"]),
    professionBook: z.boolean(),
    source: z
      .object({
        provider: z.literal("WoW Trader"),
        buildNumber: z.number().int().positive(),
        unresolvedEffects: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    lines: z
      .array(
        z
          .object({
            left: z.string().max(2000),
            right: z.string().max(500),
            tone: z.enum(["normal", "effect", "muted", "socket"]),
          })
          .strict(),
      )
      .min(1)
      .max(150),
  })
  .strict();
export type ItemDetails = z.infer<typeof itemDetailsSchema>;
export const itemDetailsBundleSchema = z
  .object({
    schema: z.literal("raid-item-details.v1"),
    game: z.enum(["tbc", "forever"]),
    capturedAt: z.iso.datetime(),
    provider: z.enum(["Wowhead", "WoW Trader"]),
    items: z.record(z.string().regex(/^[1-9]\d*$/), itemDetailsSchema),
  })
  .strict();

export function itemCategories(item: ItemDetails): HardReserveCategories {
  return {
    boe: item.binding === "equip",
    recipes: item.classId === 9 || item.professionBook,
    materials: [3, 5, 7].includes(item.classId),
  };
}
