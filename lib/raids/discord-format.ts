import { z } from "zod";
import manifest from "@/content/raid-discord-emojis.json";
import { classArtwork } from "./presentation";
import type { ClassName, Specialization } from "./specializations";
import type { EventView, SignupView } from "./contracts";

export function hardReserveText(
  event: Pick<EventView, "hardReserves" | "catalog">,
): string {
  if (!event.hardReserves.length) return "None";
  const lines: string[] = [];
  for (const id of event.hardReserves) {
    const name =
      event.catalog?.items.find((item) => item.itemId === id)?.name ??
      `Item ${id}`;
    const line = `**${discordText(name, 150)}**`;
    if ([...lines, line].join(", ").length > 450) break;
    lines.push(line);
  }
  const remaining = event.hardReserves.length - lines.length;
  return (
    lines.join(", ") +
    (remaining ? ` · +${remaining} more (Event details)` : "")
  );
}

export interface DiscordEmoji {
  id: string;
  name: string;
}
const emojiSchema = z.record(
  z.string().regex(/^[a-z0-9_]+$/),
  z.object({
    id: z.string().regex(/^\d{17,20}$/),
    name: z.string().regex(/^[a-zA-Z0-9_]{2,32}$/),
  }),
);
const emojis = emojiSchema.parse(manifest);
export function discordEmojis(): Readonly<Record<string, DiscordEmoji>> {
  return emojis;
}
export function emojiKey(
  className: ClassName,
  specialization?: Specialization | null,
): string {
  return `${className}${specialization ? `_${specialization}` : ""}`
    .toLowerCase()
    .replace(/ /g, "_");
}
export function discordEmoji(
  className: ClassName,
  specialization?: Specialization | null,
): DiscordEmoji | undefined {
  return (
    emojis[emojiKey(className, specialization)] ?? emojis[emojiKey(className)]
  );
}
export function emojiText(
  className: ClassName,
  specialization?: Specialization | null,
): string {
  const emoji = discordEmoji(className, specialization);
  return emoji ? `<:${emoji.name}:${emoji.id}> ` : "";
}
export function discordText(value: string, limit = 100): string {
  const parts = Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
  );
  const text = parts
    .slice(0, limit)
    .map((part) => part.segment)
    .join("");
  return `${text}${parts.length > limit ? "..." : ""}`
    .replace(/[\r\n\x00-\x1f\x7f]/g, " ")
    .replace(/@/g, "@\u200b")
    .replace(/[\\*_`~|>\[\]]/g, "\\$&");
}
export function signupLine(signup: SignupView): string {
  return `${emojiText(signup.character.className, signup.character.specialization)}**${discordText(signup.character.name, 40)}** · ${signup.character.specialization ?? signup.character.className} · ${signup.role}`;
}
export function damageKind(
  signup: SignupView,
): "melee" | "ranged" | "unclassified" | null {
  if (signup.role !== "damage") return null;
  // Forever's evolving builds are not inferred from TBC's talent names.
  if (signup.character.game !== "tbc" || !signup.character.specialization)
    return "unclassified";
  return ["Warrior", "Rogue"].includes(signup.character.className) ||
    (signup.character.className === "Druid" &&
      signup.character.specialization === "Feral") ||
    (signup.character.className === "Shaman" &&
      signup.character.specialization === "Enhancement") ||
    (signup.character.className === "Paladin" &&
      signup.character.specialization === "Retribution")
    ? "melee"
    : "ranged";
}
export function classAccent(className: ClassName): number {
  return Number.parseInt(classArtwork[className].color.slice(1), 16);
}
export function nativeRaidsEnabled(): boolean {
  return (
    process.env.FOREVER_RAIDS_NATIVE_ENABLED === "true" &&
    Boolean(
      process.env.COMMUNITY_AUTH_SECRET &&
      process.env.COMMUNITY_AUTH_SECRET.length >= 32,
    )
  );
}
