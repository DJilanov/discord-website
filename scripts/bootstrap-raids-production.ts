import { readFile, rename, open, lstat } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/);
const configurationSchema = z
  .object({
    COMMUNITY_DISCORD_CLIENT_ID: snowflake,
    COMMUNITY_DISCORD_CLIENT_SECRET: z.string().min(1).max(256),
    DISCORD_APPLICATION_ID: snowflake,
    DISCORD_GUILD_ID: snowflake,
    DISCORD_BOT_TOKEN: z.string().min(1).max(256),
    DISCORD_PUBLIC_KEY: z.string().regex(/^[a-f0-9]{64}$/),
    FOREVER_RAIDS_PILOT_DISCORD_IDS: z.string().min(1).max(2100),
    FOREVER_RAIDS_DISCORD_CHANNEL_ID: snowflake,
    FOREVER_RAIDS_DISCORD_DESTINATIONS: z.string().max(10000),
    FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS: z.string().max(2100),
  })
  .strict();
async function main(): Promise<void> {
  if (
    process.platform !== "linux" ||
    process.getuid?.() !== 0 ||
    process.cwd() !== "/home/wow-forever-discord"
  )
    throw new Error("Run as root in the production project only.");
  process.umask(0o077);
  const file = ".env.local";
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077)
    throw new Error("Production environment must be a private regular file.");
  const existing = parse(await readFile(file, "utf8"));
  const url = new URL(existing.DATABASE_URL);
  if (
    url.username !== "forever_web" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  )
    throw new Error(
      "Expected the isolated application role on local PostgreSQL.",
    );
  let values = { ...existing };
  if (process.argv.includes("--activate")) {
    configurationSchema.parse(
      Object.fromEntries(
        Object.keys(configurationSchema.shape).map((key) => [
          key,
          existing[key],
        ]),
      ),
    );
    if (
      !existing.COMMUNITY_AUTH_SECRET ||
      existing.COMMUNITY_AUTH_SECRET.length < 32 ||
      existing.COMMUNITY_AUTH_SECRET === existing.AUTH_SECRET
    )
      throw new Error("Member authentication secret is invalid.");
    values.FOREVER_RAIDS_NATIVE_ENABLED = "true";
  } else {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 20000) throw new Error("Configuration input is too large.");
      chunks.push(buffer);
    }
    const input = configurationSchema.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    const ids = input.FOREVER_RAIDS_PILOT_DISCORD_IDS.split(",");
    if (ids.length > 100 || !ids.every((id) => snowflake.safeParse(id).success))
      throw new Error("Pilot allowlist is invalid.");
    const response = await fetch(
      "https://discord.com/api/v10/applications/@me",
      {
        headers: { Authorization: `Bot ${input.DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new Error("Discord application verification failed.");
    const application = z
      .object({
        id: snowflake,
        verify_key: z.string(),
        redirect_uris: z.array(z.string()),
        interactions_endpoint_url: z.string().nullable(),
      })
      .parse(await response.json());
    if (
      application.id !== input.DISCORD_APPLICATION_ID ||
      application.id !== input.COMMUNITY_DISCORD_CLIENT_ID ||
      application.verify_key !== input.DISCORD_PUBLIC_KEY ||
      !application.redirect_uris.includes(
        "https://www.wowforeverdiscord.online/api/community/auth/callback/discord",
      ) ||
      application.interactions_endpoint_url !==
        "https://www.wowforeverdiscord.online/api/discord/interactions"
    )
      throw new Error(
        "Discord application/callback/interaction identity mismatch.",
      );
    values = {
      ...existing,
      ...input,
      COMMUNITY_AUTH_SECRET:
        existing.COMMUNITY_AUTH_SECRET || randomBytes(32).toString("hex"),
      AUTH_TRUST_HOST: "true",
      FOREVER_RAIDS_ENABLED: "true",
      FOREVER_RAIDS_DISCORD_ENABLED: "true",
      FOREVER_RAIDS_NATIVE_ENABLED: "false",
      FOREVER_RAIDS_PUBLIC_ORIGIN: "https://www.wowforeverdiscord.online",
    };
  }
  const temporary = `${file}.raids-${randomUUID()}`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(
      Object.entries(values)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("\n") + "\n",
      "utf8",
    );
    await handle.chown(info.uid, info.gid);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, file);
  console.log(
    process.argv.includes("--activate")
      ? "Private native event controls enabled; reload only website and raid worker."
      : "Private raid settings installed; native controls remain disabled until the hosted backend is verified. No secrets logged.",
  );
}
main().catch(() => {
  console.error(
    "Private raid configuration failed. Inspect application identity, callback, allowlist and file permissions without exposing secrets.",
  );
  process.exitCode = 1;
});
