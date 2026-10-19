import forever from "../../public/images/raids/events/manifest.json";
import tbc from "../../public/images/raids/tbc/manifest.json";
import type { RaidGame } from "./games";
import type { EventType } from "./event-types";

export interface EventArtwork {
  file: string;
  alt: string;
  width: number;
  height: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .replace(/\s+/g, " ");
}

export function eventArtwork(
  game: RaidGame,
  eventType: EventType,
  name: string,
): EventArtwork {
  const key = normalize(name);
  const editionItems = game === "forever" ? forever.items : tbc.items;
  let matched = editionItems.find(
    (item) =>
      item.eventType === eventType &&
      item.aliases.some((alias) => normalize(alias) === key),
  );
  if (
    !matched &&
    game === "tbc" &&
    (eventType === "dungeon" || eventType === "battleground")
  ) {
    const sharedIds = new Set([
      ...forever.coverage.returningDungeonsAndWings,
      "warsong-gulch",
      "arathi-basin",
      "alterac-valley",
    ]);
    matched = forever.items.find(
      (item) =>
        sharedIds.has(item.id) &&
        item.eventType === eventType &&
        item.aliases.some((alias) => normalize(alias) === key),
    );
  }
  if (matched)
    return {
      file: `/images/raids/${game === "tbc" && tbc.items.some((item) => item.id === matched.id) ? "tbc" : "events"}/${matched.file}`,
      alt: matched.alt,
      width: matched.width,
      height: matched.height,
    };
  const fallback = forever.items.find(
    (item) => item.id === forever.fallbacks[eventType],
  );
  if (!fallback) throw new Error("Missing event artwork fallback.");
  return {
    file: `/images/raids/events/${fallback.file}`,
    alt: fallback.alt,
    width: fallback.width,
    height: fallback.height,
  };
}

export function isEventArtworkFile(file: string): boolean {
  return (
    forever.items.some(
      (item) => file === `/images/raids/events/${item.file}`,
    ) || tbc.items.some((item) => file === `/images/raids/tbc/${item.file}`)
  );
}
