import { z } from "zod";
import { getArtwork } from "@/content/artwork";
import {
  CLASSES,
  DAYS,
  FACTIONS,
  PLAYSTYLES,
  REGIONS,
  REPORT_CATEGORIES,
  RULESETS,
} from "@/lib/config";

export function isDiscordInvite(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !url.port &&
      ((["discord.gg", "www.discord.gg"].includes(url.hostname) &&
        /^\/[a-zA-Z0-9-]+\/?$/.test(url.pathname)) ||
        (["discord.com", "www.discord.com"].includes(url.hostname) &&
          /^\/invite\/[a-zA-Z0-9-]+\/?$/.test(url.pathname)))
    );
  } catch {
    return false;
  }
}

const shortText = z.string().trim().min(2).max(120);
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Enter a valid HTTPS URL");
const invite = z
  .string()
  .trim()
  .max(200)
  .refine(
    (value) => !value || isDiscordInvite(value),
    "Enter a discord.gg or discord.com/invite HTTPS link",
  );
export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens",
  );
const common = {
  region: z.enum(REGIONS),
  realm: shortText,
  faction: z.enum(FACTIONS),
};

export const guildSchema = z.object({
  name: shortText,
  ...common,
  ruleset: z.enum(RULESETS),
  language: shortText,
  playstyle: z.enum(PLAYSTYLES),
  raidDays: z.array(z.enum(DAYS)).max(7),
  raidTime: z.string().trim().min(2).max(100),
  lootSystem: shortText,
  recruitingClasses: z.array(z.enum(CLASSES)).min(1).max(9),
  description: z.string().trim().min(60).max(8000),
  contactDiscord: z.string().trim().min(2).max(100),
  inviteUrl: invite.default(""),
  websiteUrl: httpsUrl.default(""),
});
export const groupSchema = z
  .object({
    title: z.string().trim().min(5).max(100),
    ...common,
    activity: z.enum([
      "Dungeon",
      "Raid",
      "PvP premade",
      "RP event",
      "Questing",
    ]),
    description: z.string().trim().min(20).max(2000),
    contactDiscord: shortText,
    startsAt: z.iso.datetime(),
  })
  .refine(
    (data) =>
      new Date(data.startsAt).getTime() > Date.now() - 3600000 &&
      new Date(data.startsAt).getTime() < Date.now() + 30 * 86400000,
    { message: "Choose a time within the next 30 days", path: ["startsAt"] },
  );
export const reportSchema = z
  .object({
    reporterDiscord: shortText,
    reporterCharacter: shortText,
    character: shortText,
    ...common,
    guild: z.string().trim().max(120).default(""),
    category: z.enum(REPORT_CATEGORIES),
    incidentAt: z.iso.datetime(),
    description: z.string().trim().min(80).max(10000),
    lootRules: z.string().trim().max(3000).default(""),
    consent: z.literal(true),
  })
  .refine(
    (data) => new Date(data.incidentAt).getTime() <= Date.now() + 300000,
    { message: "An incident cannot be in the future", path: ["incidentAt"] },
  );
export const appealSchema = z.object({
  reportPublicId: z
    .string()
    .trim()
    .regex(/^FG-[A-Z0-9]{12}$/),
  appellantDiscord: shortText,
  character: shortText,
  explanation: z.string().trim().min(60).max(10000),
  requestedOutcome: z.enum([
    "Remove alert",
    "Correct identity",
    "Reduce severity",
    "Add context",
  ]),
  consent: z.literal(true),
});
export const guideSchema = z.object({
  title: z.string().trim().min(5).max(140),
  slug: slugSchema,
  excerpt: z.string().trim().min(30).max(320),
  content: z.string().trim().min(100).max(100000),
  category: z.enum([
    "Getting started",
    "Guilds",
    "Community",
    "Safety",
    "Addons",
    "News",
  ]),
  author: shortText,
  coverImage: z
    .string()
    .max(200)
    .refine(
      (src) => getArtwork(src)?.cover === true,
      "Choose an approved cover image",
    ),
  metaTitle: z.string().trim().max(80).default(""),
  metaDescription: z.string().trim().max(180).default(""),
  published: z.boolean(),
});
export const settingsSchema = z.object({
  discordInvite: invite,
  backupInvite: invite,
  memberCount: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\d,+.kKmM ]*$/),
  raidsHosted: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\d,+.kKmM ]*$/),
  heroDescription: z.string().trim().min(20).max(240),
  announcement: z.string().trim().max(150),
  announcementHref: z
    .string()
    .trim()
    .max(150)
    .refine(
      (value) => /^\/(?!\/)[a-zA-Z0-9\-/]*$/.test(value),
      "Use a local page path",
    ),
  contactEmail: z.union([z.email(), z.literal("")]),
  discordOnboarding: z.string().trim().max(4000).default(""),
  discordOrganizers: z.string().trim().max(2000).default(""),
  googleVerification: z
    .string()
    .trim()
    .max(200)
    .regex(
      /^[A-Za-z0-9_-]*$/,
      "Use only the verification value, not an HTML tag",
    )
    .default(""),
  bingVerification: z
    .string()
    .trim()
    .max(200)
    .regex(
      /^[A-Za-z0-9_-]*$/,
      "Use only the verification value, not an HTML tag",
    )
    .default(""),
});
export const reviewSchema = z.object({
  action: z.enum([
    "under_review",
    "needs_more_evidence",
    "rejected",
    "verified_private",
    "approve_public",
    "publish",
    "overturned",
  ]),
  version: z.number().int().positive(),
  reason: z.string().trim().min(15).max(2000),
  summary: z.string().trim().max(500).default(""),
  severity: z.number().int().min(1).max(4),
  expiresInDays: z.number().int().min(7).max(180).default(90),
  assignedTo: z.string().max(100).nullable().optional(),
});
export const appealReviewSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(["under_review", "upheld", "reduced", "corrected", "removed"]),
  reason: z.string().trim().min(15).max(2000),
  summary: z.string().trim().max(500).default(""),
  severity: z.number().int().min(1).max(4),
  character: z.string().trim().max(120).default(""),
  realm: z.string().trim().max(120).default(""),
});
