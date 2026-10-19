import tbc from "@/content/raid-items/tbc.json";
import { itemDetailsBundleSchema } from "./item-detail-contracts";
import type { CatalogItem } from "./contracts";
import type { RaidGame } from "./games";

const tbcDetails = itemDetailsBundleSchema.parse(tbc);
export function enrichCatalogItems(
  game: RaidGame,
  items: CatalogItem[],
): CatalogItem[] {
  return items.map((item) => {
    const details =
      game === "tbc" ? tbcDetails.items[String(item.itemId)] : undefined;
    return details?.name === item.name ? { ...item, details } : item;
  });
}
