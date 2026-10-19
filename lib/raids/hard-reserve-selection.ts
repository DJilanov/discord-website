import type { CatalogItem } from "./contracts";
import {
  itemCategories,
  type HardReserveCategories,
} from "./item-detail-contracts";

export const hardReserveCategoryLabels: Record<
  keyof HardReserveCategories,
  string
> = {
  boe: "HR BoE",
  recipes: "HR recipes, plans & profession books",
  materials: "HR materials & gems",
};
export function categoryItemIds(
  items: CatalogItem[],
  category: keyof HardReserveCategories,
): number[] {
  return items
    .filter((item) => item.details && itemCategories(item.details)[category])
    .map((item) => item.itemId);
}
export function toggleHardReserveCategory(
  items: CatalogItem[],
  selected: number[],
  category: keyof HardReserveCategories,
  checked: boolean,
): number[] {
  const target = categoryItemIds(items, category);
  if (checked) return [...new Set([...selected, ...target])];
  const retained = new Set(
    Object.keys(hardReserveCategoryLabels)
      .filter((key) => key !== category)
      .flatMap((key) => {
        const ids = categoryItemIds(items, key as keyof HardReserveCategories);
        return ids.length && ids.every((id) => selected.includes(id))
          ? ids
          : [];
      }),
  );
  return selected.filter((id) => !target.includes(id) || retained.has(id));
}
