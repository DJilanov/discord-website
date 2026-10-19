import { z } from "zod";
import {
  classes,
  specializationMatchesClass,
  specializationNames,
} from "./specializations";
import { eventTypes, type EventType } from "./event-types";
import { gameSchema, realmSchema, validRealm, type RaidGame } from "./games";
import type { ItemDetails } from "./item-detail-contracts";

export { classes } from "./specializations";
export const roles = ["tank", "healer", "damage"] as const;
export const signupRoles = [...roles, "participant"] as const;
export const admissionModes = ["automatic", "approval", "open"] as const;
export const participatingStatuses = [
  "accepted",
  "registered",
  "pending",
  "bench",
] as const;
export const rosterStatuses = [
  ...participatingStatuses,
  "tentative",
  "absent",
] as const;
export const attendanceChoices = ["joining", "tentative", "absent"] as const;
export type AttendanceChoice = (typeof attendanceChoices)[number];
export const reserveLimitsSchema = z
  .object({
    tank: z.number().int().min(0).max(10),
    healer: z.number().int().min(0).max(10),
    damage: z.number().int().min(0).max(10),
  })
  .strict();
export type ReserveLimits = z.infer<typeof reserveLimitsSchema>;
export const regions = ["EU", "NA", "OCE"] as const;
export const factions = ["Alliance", "Horde"] as const;
const specializationSchema = z.enum(specializationNames, {
  error: "Choose a specialization.",
});
const characterFields = z
  .object({
    game: gameSchema.default("forever"),
    realm: realmSchema,
    name: z
      .string()
      .transform((value: string) =>
        value
          .normalize("NFC")
          .trim()
          .replace(/[ \u00a0]+/g, " "),
      )
      .pipe(
        z
          .string()
          .min(2, "Enter a character name of at least 2 characters.")
          .max(40, "Character names must be 40 characters or fewer.")
          .regex(
            /^[\p{L}\p{M}'-]+(?: [\p{L}\p{M}'-]+)?$/u,
            "Enter your character's first and last name using letters, apostrophes or hyphens.",
          ),
      ),
    className: z.enum(classes),
    region: z.enum(regions),
    faction: z.enum(factions),
    ruleset: z.enum(["PvE", "PvP", "RP"]),
  })
  .strict();
export const characterSchema = characterFields
  .extend({ specialization: specializationSchema })
  .refine((character) => validRealm(character.game, character.realm), {
    path: ["realm"],
    message:
      "TBC characters need a realm; Forever characters do not use realms.",
  })
  .refine(
    (character) =>
      character.game !== "tbc" || /^[\p{L}\p{M}]{2,12}$/u.test(character.name),
    {
      path: ["name"],
      message: "TBC character names must use 2-12 letters, without spaces.",
    },
  )
  .refine(
    (character) =>
      specializationMatchesClass(character.className, character.specialization),
    {
      path: ["specialization"],
      message: "Choose a specialization for this class.",
    },
  );
export type CharacterInput = z.infer<typeof characterSchema>;
// Old profiles and immutable signup snapshots must remain readable without guessing a spec.
export const storedCharacterSchema = characterFields
  .extend({ specialization: specializationSchema.nullable().default(null) })
  .refine((character) => validRealm(character.game, character.realm), {
    path: ["realm"],
    message: "Invalid realm for this game edition.",
  })
  .refine(
    (character) =>
      character.specialization === null ||
      specializationMatchesClass(character.className, character.specialization),
    {
      path: ["specialization"],
      message: "Choose a specialization for this class.",
    },
  );
export type StoredCharacter = z.infer<typeof storedCharacterSchema>;
export const characterSpecializationSchema = z
  .object({
    id: z.string().min(1).max(100),
    specialization: specializationSchema,
  })
  .strict();

const eventFields = z
  .object({
    requestKey: z.uuid(),
    game: gameSchema.default("forever"),
    realm: realmSchema,
    discordChannelId: z
      .string()
      .regex(/^\d{17,20}$/)
      .nullable()
      .default(null),
    confirmDiscordPublication: z.boolean().default(false),
    eventType: z.enum(eventTypes).default("raid"),
    title: z.string().trim().min(3).max(120),
    raidName: z.string().trim().min(3).max(100),
    region: z.enum(regions),
    faction: z.enum(factions),
    ruleset: z.enum(["PvE", "PvP", "RP"]),
    localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    durationMinutes: z.number().int().min(30).max(1440),
    signupMinutesBefore: z.number().int().min(0).max(10080),
    reserveMinutesBefore: z.number().int().min(0).max(10080),
    capacity: z.number().int().min(1).max(100),
    roleCaps: z
      .object({
        tank: z.number().int().min(0).max(100),
        healer: z.number().int().min(0).max(100),
        damage: z.number().int().min(0).max(100),
      })
      .strict(),
    admission: z.enum(admissionModes),
    description: z.string().trim().max(3000),
    catalogId: z.string().min(1).max(100).nullable(),
    reserveLimit: z.number().int().min(0).max(10),
    reserveLimits: reserveLimitsSchema.nullable().default(null),
    allowDuplicates: z.boolean(),
    hardReserves: z.array(z.number().int().positive()).max(200),
  })
  .strict();
export const eventSchema = eventFields.refine(
  (event) => validRealm(event.game, event.realm),
  {
    path: ["realm"],
    message: "TBC events need a realm; Forever events do not use realms.",
  },
);
export type EventInput = z.infer<typeof eventSchema>;
export const eventSettingsSchema = eventFields
  .omit({
    requestKey: true,
    discordChannelId: true,
    confirmDiscordPublication: true,
  })
  .refine((event) => validRealm(event.game, event.realm), {
    path: ["realm"],
    message: "TBC events need a realm; Forever events do not use realms.",
  });
export type EventSettings = z.infer<typeof eventSettingsSchema>;
export const signupSchema = z
  .object({
    acknowledge: z.literal(true),
    policyChecksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    characterId: z.string().min(1).max(100),
    specialization: specializationSchema.nullable(),
    role: z.enum(signupRoles),
    attendance: z.enum(attendanceChoices).default("joining"),
  })
  .strict();
export const reservesSchema = z
  .object({ itemIds: z.array(z.number().int().positive()).max(10) })
  .strict();
export const policyAcknowledgementSchema = z
  .object({
    acknowledge: z.literal(true),
    policyChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const eventActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("edit"),
      version: z.number().int().positive(),
      settings: eventSettingsSchema,
    })
    .strict(),
  z
    .object({ action: z.literal("lock"), version: z.number().int().positive() })
    .strict(),
  z
    .object({
      action: z.literal("cancel"),
      version: z.number().int().positive(),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("admit"),
      version: z.number().int().positive(),
      signupId: z.string().min(1).max(100),
      status: z.enum(["accepted", "bench"]),
      partyIndex: z.number().int().min(0).max(19).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("set_roster_layout"),
      version: z.number().int().positive(),
      assignments: z
        .array(
          z
            .object({
              signupId: z.string().min(1).max(100),
              partyIndex: z.number().int().min(0).max(19),
              slotIndex: z.number().int().min(0).max(4),
            })
            .strict(),
        )
        .max(100),
    })
    .strict(),
]);
export type EventAction = z.infer<typeof eventActionSchema>;
export const eventHistoryPageSchema = z.object({
  changes: z.array(
    z.object({
      id: z.string(),
      changedAt: z.iso.datetime(),
      timeLabel: z.string(),
      fields: z.array(
        z.object({ label: z.string(), before: z.string(), after: z.string() }),
      ),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type EventHistoryPage = z.infer<typeof eventHistoryPageSchema>;
export type RaidRole = (typeof roles)[number];
export type SignupRole = (typeof signupRoles)[number];

export interface MemberIdentity {
  id: string;
  discordId: string;
  displayName: string;
}
export interface CharacterView extends StoredCharacter {
  id: string;
}
export interface CatalogItem {
  details?: ItemDetails;
  itemId: number;
  name: string;
  sourceUrl: string;
  lootSource: string;
  kind: "boss" | "trash" | "quest" | "token" | "event";
  classes: (typeof classes)[number][];
  evidence: "source_reported" | "client_observed";
}
export interface CatalogView {
  id: string;
  game: RaidGame;
  raidName: string;
  checksum: string;
  sourcePatch: string | null;
  clientBuild: string | null;
  items: CatalogItem[];
}
export interface SignupView {
  id: string;
  character: StoredCharacter;
  role: SignupRole;
  status: string;
  partyIndex?: number | null;
  slotIndex?: number | null;
  isMine: boolean;
  reserves: number[];
  needsAcknowledgement?: boolean;
  imported?: boolean;
  note?: string | null;
}
export interface EventView {
  id: string;
  game: RaidGame;
  realm: string;
  eventType: EventType;
  title: string;
  raidName: string;
  region: string;
  faction: string;
  ruleset: string;
  description: string;
  startsAt: string;
  endsAt: string;
  signupClosesAt: string;
  reservesCloseAt: string;
  timeLabel: string;
  signupCloseLabel: string;
  reservesCloseLabel: string;
  capacity: number;
  roleCaps: Record<RaidRole, number>;
  admission: string;
  status: string;
  compositionRevision?: string;
  version: number;
  policyChecksum?: string;
  reserveLimit: number;
  reserveLimits?: ReserveLimits | null;
  allowDuplicates: boolean;
  hardReserves: number[];
  catalog: CatalogView | null;
  signups: SignupView[];
  isOrganizer: boolean;
  locked: boolean;
  discordAvailable: boolean;
  discord: {
    visibility: "private" | "community";
    label: string;
    status: string;
    url: string | null;
    approved: boolean;
    inSync: boolean;
    lastError: string | null;
  } | null;
}
export interface EventSummary {
  id: string;
  game: RaidGame;
  realm: string;
  eventType: EventType;
  title: string;
  raidName: string;
  region: string;
  faction: string;
  ruleset: string;
  endsAt: string;
  timeLabel: string;
  capacity: number;
  status: string;
  acceptedCount: number;
}
