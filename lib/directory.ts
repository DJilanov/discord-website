import type { Prisma } from "@prisma/client";
import {
  CLASSES,
  DAYS,
  FACTIONS,
  PLAYSTYLES,
  REGIONS,
  RULESETS,
} from "@/lib/config";

export type QueryParams = Record<string, string | string[] | undefined>;
export function queryValue(query: QueryParams, key: string): string {
  const value = query[key];
  return typeof value === "string" ? value.slice(0, 100) : "";
}
export function pageNumber(query: QueryParams): number {
  return Math.min(
    1000,
    Math.max(1, Number.parseInt(queryValue(query, "page"), 10) || 1),
  );
}

export function guildFilter(query: QueryParams): Prisma.ForeverGuildWhereInput {
  const region = queryValue(query, "region"),
    faction = queryValue(query, "faction"),
    ruleset = queryValue(query, "ruleset"),
    style = queryValue(query, "playstyle"),
    day = queryValue(query, "day"),
    characterClass = queryValue(query, "class"),
    search = queryValue(query, "q");
  return {
    status: "approved",
    ...(REGIONS.some((x) => x === region) ? { region } : {}),
    ...(FACTIONS.some((x) => x === faction) ? { faction } : {}),
    ...(RULESETS.some((x) => x === ruleset) ? { ruleset } : {}),
    ...(PLAYSTYLES.some((x) => x === style) ? { playstyle: style } : {}),
    ...(DAYS.some((x) => x === day) ? { raidDays: { has: day } } : {}),
    ...(CLASSES.some((x) => x === characterClass)
      ? { recruitingClasses: { has: characterClass } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { realm: { contains: search, mode: "insensitive" as const } },
            { language: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export function paginationUrl(
  path: string,
  query: QueryParams,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (typeof value === "string" && key !== "page") params.set(key, value);
  params.set("page", String(page));
  return `${path}?${params}`;
}

export function groupFilter(
  query: QueryParams,
  now: Date = new Date(),
): Prisma.ForeverGroupWhereInput {
  const region = queryValue(query, "region");
  const faction = queryValue(query, "faction");
  const activity = queryValue(query, "activity");
  return {
    status: "approved",
    expiresAt: { gt: now },
    startsAt: { gte: now },
    ...(region ? { region } : {}),
    ...(faction ? { faction } : {}),
    ...(activity ? { activity } : {}),
  };
}
