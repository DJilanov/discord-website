import { z } from "zod";
import { storedCharacterSchema, signupRoles } from "./contracts";

const safeUrl = z
  .string()
  .max(500)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use a public HTTPS link.");
export const preparationSchema = z
  .object({
    musterMinutes: z.number().int().min(0).max(120).default(15),
    meeting: z.string().trim().max(200).default(""),
    voiceUrl: z.union([safeUrl, z.literal("")]).default(""),
    guideUrl: z.union([safeUrl, z.literal("")]).default(""),
    general: z.string().trim().min(1).max(1800),
    tank: z.string().trim().max(600).default(""),
    healer: z.string().trim().max(600).default(""),
    damage: z.string().trim().max(600).default(""),
    reminders: z.boolean().default(true),
  })
  .strict();
export type RaidPreparation = z.infer<typeof preparationSchema>;
export const rosterPublicationSchema = z
  .object({
    requestKey: z.uuid(),
    version: z.number().int().positive(),
    deadline: z.iso.datetime(),
    preparation: preparationSchema,
  })
  .strict();
export const rosterReplySchema = z
  .object({
    requestKey: z.string().min(10).max(100),
    invitationId: z.uuid(),
    version: z.number().int().positive(),
    choice: z.enum(["confirmed", "declined"]),
    reason: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine((value) => value.choice !== "declined" || value.reason.length >= 3, {
    path: ["reason"],
    message: "Give a short reason, or enter Prefer not to say.",
  });
export type RosterReply = z.infer<typeof rosterReplySchema>;
export const amendmentSchema = z
  .object({
    requestKey: z.uuid(),
    version: z.number().int().positive(),
    removedSignupId: z.string().min(1).max(100),
    replacementSignupId: z.string().min(1).max(100).optional(),
    manualVerified: z.boolean().default(false),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export const offerSchema = z.object({
  title: z.string(),
  game: z.string(),
  raidName: z.string(),
  realm: z.string(),
  character: storedCharacterSchema,
  role: z.enum(signupRoles),
  partyIndex: z.number().int().nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  organizerId: z.string(),
  organizerDiscordId: z.string(),
  leader: z.string(),
  description: z.string(),
  policyChecksum: z.string(),
  reserveLimit: z.number().int(),
  allowDuplicates: z.boolean(),
  hardReserves: z.array(z.number()),
  discordUrl: safeUrl,
});
export type RosterOffer = z.infer<typeof offerSchema>;
export const invitationStateSchema = z.enum([
  "pending",
  "confirmed",
  "declined",
  "expired",
  "changed",
  "revoked",
  "manual",
]);
export type InvitationState = z.infer<typeof invitationStateSchema>;
export const invitationViewSchema = z.object({
  id: z.uuid(),
  signupId: z.string(),
  version: z.number().int().positive(),
  state: invitationStateSchema,
  deadline: z.iso.datetime(),
  repliedAt: z.iso.datetime().nullable(),
  offer: offerSchema,
  preparation: preparationSchema,
  delivery: z.enum([
    "pending",
    "sending",
    "sent",
    "blocked",
    "uncertain",
    "cancelled",
    "failed",
  ]),
  reason: z.string().nullable(),
  directMessages: z.boolean(),
});
export type InvitationView = z.infer<typeof invitationViewSchema>;
export const confirmationDashboardSchema = z.object({
  organizer: z.boolean(),
  version: z.number().int(),
  invitations: z.array(invitationViewSchema),
  latestAmendment: z.number().int(),
});
export type ConfirmationDashboard = z.infer<typeof confirmationDashboardSchema>;

export function defaultPreparation(
  raidName: string,
  game: string,
): RaidPreparation {
  const guides: Record<string, string> = {
    "Barrow Deeps": "wow-forever-barrow-deeps-raid-guide",
    "Hyjal Summit": "wow-forever-hyjal-summit-raid-guide",
  };
  return preparationSchema.parse({
    general:
      "Repair before invites. Bring the consumables and gear required by the published raid rules. Check raid access and read the tactics. Tell the leader promptly if your plans change.",
    tank: "Review pull assignments, positioning and defensive preparation with the leader.",
    healer:
      "Review healing, dispel and recovery assignments. Plan supplies for the scheduled duration.",
    damage:
      "Review interrupt, crowd-control and target assignments. Prepare for the full scheduled duration.",
    guideUrl:
      game === "forever" && guides[raidName]
        ? `https://kfcguild.online/guides/${guides[raidName]}`
        : "",
  });
}
export function classPreparation(className: string): string {
  const advice: Record<string, string> = {
    Warrior:
      "Check your assigned role and weapon setup; coordinate shout and interrupt duties.",
    Paladin: "Confirm blessing, utility and role assignments with the leader.",
    Hunter: "Check your pet setup and any pull or crowd-control assignments.",
    Rogue:
      "Confirm interrupt and utility assignments and prepare your class supplies.",
    Priest: "Coordinate buffs, dispels and your healing or damage assignment.",
    Shaman:
      "Coordinate totem, interrupt and utility assignments with the group.",
    Mage: "Coordinate buffs, conjured supplies and crowd-control assignments.",
    Warlock:
      "Coordinate curses and summoning duties; prepare the required class supplies.",
    Druid:
      "Confirm your role, buffs and any assigned resurrection or utility duties.",
  };
  return advice[className] ?? "Confirm your class assignments with the leader.";
}

export const rosterPreviewSchema = z.object({
  recipients: z.array(offerSchema),
  deadline: z.iso.datetime(),
  preparation: preparationSchema,
  version: z.number().int(),
});
export type RosterPreview = z.infer<typeof rosterPreviewSchema>;
