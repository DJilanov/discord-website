import { z } from "zod";
import { classes, specializationNames } from "./specializations";
import { signupRoles, rosterStatuses, attendanceChoices } from "./contracts";
import { HttpError } from "@/lib/security";

const snowflake = z.string().regex(/^\d{17,20}$/);
export const nativeActionSchema = z.enum([
  "join",
  "tentative",
  "absent",
  "attendance",
  "mine",
  "roster",
  "reserves",
  "manage",
  "character",
  "class",
  "spec",
  "role",
  "name",
  "register",
  "confirm",
  "acknowledge",
  "leave",
  "withdraw",
  "close",
  "search",
  "add",
  "remove",
  "save",
  "view",
  "previous",
  "next",
  "candidate",
  "accept",
  "bench",
  "lock",
  "lock_confirm",
]);
export type NativeAction = z.infer<typeof nativeActionSchema>;
export const nativeInputSchema = z.object({
  id: snowflake,
  type: z.union([z.literal(3), z.literal(5)]),
  application_id: snowflake,
  guild_id: snowflake,
  channel_id: snowflake,
  member: z.object({
    user: z.object({ id: snowflake, bot: z.boolean().optional() }),
  }),
  message: z
    .object({
      id: snowflake,
      author: z.object({ id: snowflake, bot: z.literal(true) }),
      flags: z.number().int().nonnegative(),
    })
    .optional(),
  data: z.object({
    custom_id: z.string().min(1).max(100),
    component_type: z.number().optional(),
    values: z.array(z.string().max(100)).max(25).optional(),
    components: z
      .array(
        z.object({
          type: z.number(),
          component: z
            .object({
              type: z.literal(4),
              custom_id: z.string(),
              value: z.string().max(100),
            })
            .optional(),
        }),
      )
      .max(5)
      .optional(),
  }),
});
export type NativeInput = z.infer<typeof nativeInputSchema>;
export interface NativeTarget {
  kind: "event" | "draft";
  id: string;
  revision: number;
  action: NativeAction;
}
export function nativeTarget(value: string): NativeTarget {
  const event =
    /^nraid:e:([a-z0-9]{20,40}):(join|tentative|absent|mine|roster|reserves|manage)$/.exec(
      value,
    );
  if (event)
    return {
      kind: "event",
      id: event[1],
      revision: 0,
      action: nativeActionSchema.parse(event[2]),
    };
  const draft = /^nraid:d:([a-f0-9-]{36}):([1-9]\d{0,7}):([a-z_]+)$/.exec(
    value,
  );
  if (draft && z.uuid().safeParse(draft[1]).success)
    return {
      kind: "draft",
      id: draft[1],
      revision: Number(draft[2]),
      action: nativeActionSchema.parse(draft[3]),
    };
  throw new HttpError(
    400,
    "Invalid event control. Open the original event post again.",
  );
}
export const nativeStateSchema = z.object({
  mode: z.enum([
    "signup",
    "mine",
    "leave",
    "reserves",
    "roster",
    "manage",
    "closed",
  ]),
  characterId: z.string().nullable().default(null),
  className: z.enum(classes).nullable().default(null),
  name: z.string().max(100).default(""),
  specialization: z.enum(specializationNames).nullable().default(null),
  role: z.enum(signupRoles).default("damage"),
  attendance: z.enum(attendanceChoices).default("joining"),
  itemIds: z.array(z.number().int().positive()).max(10).default([]),
  query: z.string().max(100).default(""),
  grouping: z.enum(["class", "role"]).default("class"),
  filter: z.enum(rosterStatuses).default("accepted"),
  page: z.number().int().min(0).max(100).default(0),
  signupId: z.string().nullable().default(null),
  eventVersion: z.number().int().nonnegative().default(0),
  lockConfirm: z.boolean().default(false),
});
export type NativeState = z.infer<typeof nativeStateSchema>;
export interface NativeDraftView {
  id: string;
  revision: number;
  state: NativeState;
  completed: boolean;
}
export interface NativeButton {
  type: 2;
  style: 1 | 2 | 3 | 4 | 5;
  label: string;
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}
export interface NativeOption {
  label: string;
  value: string;
  description?: string;
  emoji?: { id: string; name: string };
  default?: boolean;
}
export interface NativeSelect {
  type: 3;
  custom_id: string;
  placeholder: string;
  options: NativeOption[];
  min_values: number;
  max_values: number;
}
export interface NativeRow {
  type: 1;
  components: NativeButton[] | [NativeSelect];
}
export interface NativeMessage {
  content: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    footer?: { text: string };
  }>;
  components: NativeRow[];
  allowed_mentions: { parse: never[] };
}
export type NativeAcknowledgement =
  | { type: 5; data: { flags: 64 } }
  | { type: 6 }
  | {
      type: 9;
      data: {
        custom_id: string;
        title: string;
        components: Array<{
          type: 18;
          label: string;
          component: {
            type: 4;
            custom_id: string;
            style: 1;
            max_length: number;
            required: boolean;
            value?: string;
          };
        }>;
      };
    }
  | {
      type: 4;
      data: {
        content: string;
        flags: 64;
        allowed_mentions: { parse: never[] };
      };
    };

const noMentions = z.object({ parse: z.array(z.never()) });
const controlId = z.string().min(1).max(100);
const buttonSchema = z
  .object({
    type: z.literal(2),
    style: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    label: z.string().min(1).max(80),
    custom_id: controlId.optional(),
    url: z.url().optional(),
    disabled: z.boolean().optional(),
  })
  .refine((button) =>
    button.style === 5
      ? Boolean(button.url && !button.custom_id)
      : Boolean(button.custom_id && !button.url),
  );
const selectSchema = z.object({
  type: z.literal(3),
  custom_id: controlId,
  placeholder: z.string().max(150),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        value: z.string().min(1).max(100),
        description: z.string().max(100).optional(),
        emoji: z
          .object({ id: snowflake, name: z.string().min(2).max(32) })
          .optional(),
        default: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(25),
  min_values: z.literal(1),
  max_values: z.literal(1),
});
export const nativeMessageSchema: z.ZodType<NativeMessage> = z.object({
  content: z.string().max(2000),
  allowed_mentions: noMentions,
  embeds: z
    .array(
      z.object({
        title: z.string().max(256),
        description: z.string().max(4096),
        color: z.number().int().min(0).max(0xffffff),
        footer: z.object({ text: z.string().max(2048) }).optional(),
      }),
    )
    .max(1),
  components: z
    .array(
      z.object({
        type: z.literal(1),
        components: z.union([
          z.array(buttonSchema).min(1).max(5),
          z.tuple([selectSchema]),
        ]),
      }),
    )
    .max(5),
});
export const nativeAcknowledgementSchema: z.ZodType<NativeAcknowledgement> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal(5), data: z.object({ flags: z.literal(64) }) }),
    z.object({ type: z.literal(6) }),
    z.object({
      type: z.literal(4),
      data: z.object({
        content: z.string().max(2000),
        flags: z.literal(64),
        allowed_mentions: noMentions,
      }),
    }),
    z.object({
      type: z.literal(9),
      data: z.object({
        custom_id: controlId,
        title: z.string().min(1).max(45),
        components: z
          .array(
            z.object({
              type: z.literal(18),
              label: z.string().min(1).max(45),
              component: z.object({
                type: z.literal(4),
                custom_id: controlId,
                style: z.literal(1),
                max_length: z.number().int().min(1).max(100),
                required: z.boolean(),
                value: z.string().max(100).optional(),
              }),
            }),
          )
          .min(1)
          .max(5),
      }),
    }),
  ]);
