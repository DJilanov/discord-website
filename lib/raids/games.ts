import { z } from "zod";

export const games = ["forever", "tbc"] as const;
export type RaidGame = (typeof games)[number];
export const gameSchema = z.enum(games);
export const gameLabels: Record<RaidGame, string> = {
  forever: "WoW Forever",
  tbc: "TBC Classic",
};
export const realmSchema = z
  .string()
  .normalize()
  .trim()
  .max(80)
  .transform((value: string) => value.replace(/\s+/g, " ").toLowerCase())
  .default("");

export function validRealm(game: RaidGame, realm: string): boolean {
  return game === "forever"
    ? realm === ""
    : /^[\p{L}\p{M}\d][\p{L}\p{M}\d '-]{1,79}$/u.test(realm);
}

interface CharacterScope {
  region: string;
  faction: string;
  ruleset: string;
  game?: string;
  realm?: string;
}
export function characterCanJoin(
  character: CharacterScope,
  event: CharacterScope,
): boolean {
  return (
    (character.game ?? "forever") === (event.game ?? "forever") &&
    (character.realm ?? "") === (event.realm ?? "") &&
    character.region === event.region &&
    character.faction === event.faction &&
    character.ruleset === event.ruleset
  );
}

export interface RaidPreset {
  name: string;
  capacity: number;
  roleCaps: { tank: number; healer: number; damage: number };
}

const ten = { tank: 2, healer: 2, damage: 6 };
const twentyFive = { tank: 3, healer: 6, damage: 16 };
// Roster compositions are editable defaults, not encounter requirements.
export const raidPresets: Record<RaidGame, RaidPreset[]> = {
  forever: ["Hyjal Summit", "Barrow Deeps", "Onyxia's Lair"].map((name) => ({
    name,
    capacity: 20,
    roleCaps: { tank: 2, healer: 4, damage: 14 },
  })),
  tbc: [
    "Karazhan",
    "Gruul's Lair",
    "Magtheridon's Lair",
    "Serpentshrine Cavern",
    "The Eye",
    "Hyjal Summit",
    "Black Temple",
    "Zul'Aman",
    "Sunwell Plateau",
  ].map((name) => ({
    name,
    capacity: ["Karazhan", "Zul'Aman"].includes(name) ? 10 : 25,
    roleCaps: ["Karazhan", "Zul'Aman"].includes(name) ? ten : twentyFive,
  })),
};
