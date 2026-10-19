import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { EventHistoryPage } from "./contracts";
import { formatRaidTime } from "./policy";

const labels: Record<string, string> = {
  title: "Title",
  game: "Game edition",
  realm: "Realm",
  eventType: "Event type",
  raidName: "Activity",
  region: "Region",
  faction: "Faction",
  ruleset: "Character ruleset",
  description: "Details",
  startsAt: "Start",
  endsAt: "End",
  signupClosesAt: "Signup deadline",
  reservesCloseAt: "SR deadline",
  capacity: "Capacity",
  roleCaps: "Role limits",
  admission: "Signup mode",
  catalogId: "Loot catalog",
  reserveLimit: "Maximum SR",
  reserveLimits: "SR by role",
  allowDuplicates: "Duplicate reserves",
  hardReserves: "Hard reserves",
  signupImport: "Imported signups",
};
const detailsSchema = z.object({
  changedFields: z.array(z.string()),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  lootNames: z
    .object({ before: z.array(z.string()), after: z.array(z.string()) })
    .optional(),
  catalogs: z
    .object({ before: z.string().nullable(), after: z.string().nullable() })
    .optional(),
});
const names: Record<string, string> = {
  automatic: "Automatic / bench when full",
  open: "Open signup / select roster later",
  approval: "Organizer approval",
  forever: "WoW Forever",
  tbc: "TBC Classic",
  raid: "Raid",
  dungeon: "Dungeon",
  battleground: "Battleground",
  world_pvp: "World PVP",
  questing: "Questing",
  social: "Social event",
  other: "Other",
};
function valueLabel(field: string, value: unknown, region: string): string {
  if (value === null || value === "") return "None";
  if (typeof value === "boolean") return value ? "Allowed" : "Not allowed";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (field.endsWith("At")) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? "Unavailable"
        : formatRaidTime(date, region);
    }
    if (field === "catalogId") return "Reviewed loot catalog";
    return ["admission", "game", "eventType"].includes(field)
      ? (names[value] ?? value)
      : value;
  }
  if (Array.isArray(value))
    return value.length ? value.map(String).join(", ") : "None";
  const limits = z
    .object({ tank: z.number(), healer: z.number(), damage: z.number() })
    .safeParse(value);
  return limits.success
    ? `Tanks ${limits.data.tank} / Healers ${limits.data.healer} / DPS ${limits.data.damage}`
    : "Unavailable";
}
export function eventChangeView(
  audit: { id: string; createdAt: Date; details: Prisma.JsonValue },
  region: string,
): EventHistoryPage["changes"][number] {
  const details = detailsSchema.parse(audit.details);
  return {
    id: audit.id,
    changedAt: audit.createdAt.toISOString(),
    timeLabel: formatRaidTime(audit.createdAt, region),
    fields: details.changedFields
      .filter((field) => labels[field])
      .map((field) => ({
        label: labels[field],
        before:
          field === "hardReserves" && details.lootNames
            ? details.lootNames.before.join(", ") || "None"
            : field === "catalogId" && details.catalogs
              ? (details.catalogs.before ?? "None")
              : valueLabel(field, details.before[field], region),
        after:
          field === "hardReserves" && details.lootNames
            ? details.lootNames.after.join(", ") || "None"
            : field === "catalogId" && details.catalogs
              ? (details.catalogs.after ?? "None")
              : valueLabel(field, details.after[field], region),
      })),
  };
}
