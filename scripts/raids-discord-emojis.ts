import "./env";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import path from "node:path";
import { z } from "zod";
import { classes, specializationsByClass } from "../lib/raids/specializations";
import { classIcon, specializationIcon } from "../lib/raids/presentation";
import { emojiKey, type DiscordEmoji } from "../lib/raids/discord-format";

const emojiSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  name: z.string(),
});
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { apply: { type: "boolean", default: false } },
  });
  const applicationId = z
    .string()
    .regex(/^\d{17,20}$/)
    .parse(
      process.env.DISCORD_APPLICATION_ID || process.env.KFCBOT_APPLICATION_ID,
    );
  const token = process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN;
  if (!token) throw new Error("Discord bot credentials are unavailable.");
  async function request(
    route: string,
    body?: { name: string; image: string },
  ): Promise<unknown> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`https://discord.com/api/v10${route}`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      if (response.status === 429) {
        const data = z
          .object({ retry_after: z.number().nonnegative().max(120) })
          .parse(await response.json());
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.ceil(data.retry_after * 1000) + 100),
        );
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          `Discord emoji request failed: HTTP ${response.status}`,
        );
      }
      return response.json();
    }
    throw new Error("Discord emoji rate limit exceeded; retry later.");
  }
  const bot = z
    .object({ id: z.literal(applicationId), bot: z.literal(true) })
    .parse(await request("/users/@me"));
  const existing = z
    .object({ items: z.array(emojiSchema) })
    .parse(await request(`/applications/${bot.id}/emojis`)).items;
  const assets = classes.flatMap((className) => [
    { key: emojiKey(className), file: classIcon(className) },
    ...specializationsByClass[className].map((spec) => ({
      key: emojiKey(className, spec),
      file: specializationIcon(className, spec),
    })),
  ]);
  const manifest: Record<string, DiscordEmoji> = {};
  let missing = 0;
  for (const asset of assets) {
    const bytes = await readFile(
      path.join(process.cwd(), "public", asset.file),
    );
    if (bytes.length > 256 * 1024)
      throw new Error("Registered emoji asset exceeds Discord's limit.");
    // Content-addressed names make upgrades/retries idempotent without deleting other emojis.
    const name = `wr_${asset.key}_${createHash("sha256").update(bytes).digest("hex").slice(0, 6)}`;
    if (name.length > 32) throw new Error("Emoji asset name is too long.");
    let emoji = existing.find((item) => item.name === name);
    if (!emoji) {
      missing += 1;
      if (!values.apply) continue;
      emoji = emojiSchema.parse(
        await request(`/applications/${bot.id}/emojis`, {
          name,
          image: `data:image/jpeg;base64,${bytes.toString("base64")}`,
        }),
      );
      existing.push(emoji);
    }
    manifest[asset.key] = emoji;
  }
  if (!values.apply) {
    console.log(
      `Preview: ${assets.length} class/spec assets, ${missing} missing application emojis. No changes made.`,
    );
    return;
  }
  await writeFile(
    "content/raid-discord-emojis.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Registered ${Object.keys(manifest).length} class/spec emojis; ${missing} created. Public manifest updated.`,
  );
}
main().catch(() => {
  console.error(
    "Emoji setup failed. Check bot credentials, application access and registered assets; no secrets were logged.",
  );
  process.exitCode = 1;
});
