import { z } from "zod";
import {
  classes,
  signupRoles,
  storedCharacterSchema,
  type CharacterView,
  type SignupRole,
} from "./contracts";
import {
  specializationMatchesClass,
  specializationNames,
  type ClassName,
  type Specialization,
} from "./specializations";

export const SIGNUP_IMPORT_MAX_BYTES = 524288;
const discordId = z.string().regex(/^\d{17,20}$/);
export const importAttendance = [
  "joining",
  "bench",
  "tentative",
  "absent",
] as const;
export type ImportAttendance = (typeof importAttendance)[number];
const sourceSignup = z.object({
  userId: discordId,
  name: z.string().trim().min(1).max(100),
  className: z.string().max(100),
  specName: z.string().max(100).optional(),
  roleName: z.string().max(100).optional(),
  status: z.string().max(40).default("primary"),
  note: z.string().max(1000).optional(),
  entryTime: z.number().int().nonnegative().max(4102444800).optional(),
  position: z.number().int().nonnegative().optional(),
});
export const raidHelperExportSchema = z.object({
  id: discordId,
  serverId: discordId,
  channelId: discordId.optional(),
  title: z.string().max(120),
  startTime: z.number().int().nonnegative().max(4102444800).optional(),
  signUps: z
    .array(sourceSignup)
    .min(1)
    .max(100)
    .refine(
      (rows) => new Set(rows.map((row) => row.userId)).size === rows.length,
      "The export contains multiple signups for the same Discord user.",
    ),
});
export type RaidHelperExport = z.infer<typeof raidHelperExportSchema>;
export type RaidHelperSignup = RaidHelperExport["signUps"][number];
export const importSelectionSchema = z
  .object({
    userId: discordId,
    characterId: z.string().min(1).max(100).nullable(),
    name: z.string().trim().min(2).max(40),
    className: z.enum(classes),
    specialization: z.enum(specializationNames).nullable(),
    role: z.enum(signupRoles),
    attendance: z.enum(importAttendance),
  })
  .strict();
export type ImportSelection = z.infer<typeof importSelectionSchema>;
export const signupImportRequestSchema = z
  .object({
    source: z.string().min(1).max(SIGNUP_IMPORT_MAX_BYTES),
    version: z.number().int().positive(),
    requestKey: z.uuid(),
    confirm: z.literal(true),
    selections: z
      .array(importSelectionSchema)
      .min(1)
      .max(50)
      .refine(
        (rows) => new Set(rows.map((row) => row.userId)).size === rows.length,
        "Choose each Discord user only once.",
      ),
  })
  .strict();
export const signupImportSourceSchema = z
  .object({
    kind: z.literal("raid_helper"),
    eventId: discordId,
    guildId: discordId,
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    originalName: z.string().max(100),
    originalClass: z.string().max(100),
    originalSpec: z.string().max(100).nullable(),
    originalStatus: z.string().max(40),
    entryTime: z.number().int().nonnegative().nullable(),
    position: z.number().int().nonnegative().nullable(),
    note: z.string().max(1000).nullable(),
  })
  .strict();
export const signupImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  statuses: z.record(z.string(), z.number().int().nonnegative()),
});
export type SignupImportResult = z.infer<typeof signupImportResultSchema>;

export interface SignupImportRow {
  userId: string;
  originalName: string;
  originalClass: string;
  originalSpec: string;
  note: string | null;
  name: string;
  className: ClassName | null;
  specialization: Specialization | null;
  role: (typeof signupRoles)[number] | null;
  attendance: ImportAttendance | null;
  characterId: string | null;
  characters: CharacterView[];
  blocked: string | null;
}
export interface SignupImportPreview {
  version: number;
  sourceTitle: string;
  sourceEventId: string;
  sourceStartLabel: string | null;
  warnings: string[];
  rows: SignupImportRow[];
}
export const signupImportPreviewSchema = z.object({
  version: z.number().int().positive(),
  sourceTitle: z.string(),
  sourceEventId: discordId,
  sourceStartLabel: z.string().nullable(),
  warnings: z.array(z.string()),
  rows: z.array(
    z.object({
      userId: discordId,
      originalName: z.string(),
      originalClass: z.string(),
      originalSpec: z.string(),
      note: z.string().nullable(),
      name: z.string(),
      className: z.enum(classes).nullable(),
      specialization: z.enum(specializationNames).nullable(),
      role: z.enum(signupRoles).nullable(),
      attendance: z.enum(importAttendance).nullable(),
      characterId: z.string().nullable(),
      characters: z.array(
        z.intersection(storedCharacterSchema, z.object({ id: z.string() })),
      ),
      blocked: z.string().nullable(),
    }),
  ),
});

export function parseRaidHelperExport(text: string): RaidHelperExport | null {
  if (new TextEncoder().encode(text).length > SIGNUP_IMPORT_MAX_BYTES)
    return null;
  try {
    const result = raidHelperExportSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    // Invalid JSON is an expected validation failure, not a server exception.
    return null;
  }
}

export function raidHelperSuggestion(
  row: RaidHelperSignup,
): Pick<
  SignupImportRow,
  "name" | "className" | "specialization" | "role" | "attendance"
> {
  const sourceClass = row.className;
  const spec = row.specName ?? "";
  const tankClasses: Record<string, ClassName> = {
    Protection: "Warrior",
    Protection1: "Paladin",
    Guardian: "Druid",
  };
  const className =
    classes.find((value) => value === sourceClass) ??
    (sourceClass === "Tank" ? (tankClasses[spec] ?? null) : null);
  const aliases: Record<string, string> = {
    Holy1: "Holy",
    Protection1: "Protection",
    Restoration1: "Restoration",
    Beastmastery: "Beast Mastery",
    Guardian: "Feral",
  };
  const normalizedSpec = aliases[spec] ?? spec;
  const specialization =
    className && specializationMatchesClass(className, normalizedSpec)
      ? (specializationNames.find((value) => value === normalizedSpec) ?? null)
      : null;
  const roleAliases: Record<string, SignupRole> = {
    tanks: "tank",
    tank: "tank",
    healers: "healer",
    healer: "healer",
    melee: "damage",
    ranged: "damage",
    dps: "damage",
    damage: "damage",
  };
  const role = roleAliases[(row.roleName ?? "").toLowerCase()] ?? null;
  const status = [sourceClass, row.status].map((value) => value.toLowerCase());
  const attendance = status.some((value) =>
    ["absence", "absent"].includes(value),
  )
    ? "absent"
    : status.includes("tentative")
      ? "tentative"
      : status.includes("bench")
        ? "bench"
        : status.some((value) => ["primary", "late"].includes(value))
          ? "joining"
          : null;
  const candidate = row.name
    .normalize("NFC")
    .trim()
    .replace(/^<[^<>]{1,40}>\s*/, "");
  const name =
    /^[\p{L}\p{M}'-]+(?: [\p{L}\p{M}'-]+)?$/u.test(candidate) &&
    candidate.length >= 2 &&
    candidate.length <= 40
      ? candidate
      : "";
  return { name, className, specialization, role, attendance };
}
