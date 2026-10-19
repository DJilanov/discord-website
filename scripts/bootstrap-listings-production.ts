import { readFile, writeFile, chmod, lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { parse } from "dotenv";
import { Client } from "pg";
import { z } from "zod";
import { discordId, listingGuildId } from "../lib/discord-listings/contracts";

async function privateEnvironment(
  path: string,
): Promise<Record<string, string>> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error("Unsafe private environment");
  return parse(await readFile(path, "utf8"));
}
function sql(database: string, input: string): string {
  return execFileSync(
    "runuser",
    [
      "-u",
      "postgres",
      "--",
      "psql",
      "-X",
      "-q",
      "-t",
      "-A",
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      database,
    ],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}
async function main(): Promise<void> {
  if (
    process.platform !== "linux" ||
    process.getuid?.() !== 0 ||
    process.cwd() !== "/home/wow-forever-discord"
  )
    throw new Error("Exact production root required");
  const web = await privateEnvironment(".env.local");
  const auction = await privateEnvironment(".env.auction");
  const token = z.string().min(30).max(300).parse(auction.AUCTION_BOT_TOKEN);
  const guildResponse = await fetch(
    `https://discord.com/api/v10/guilds/${listingGuildId}`,
    {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!guildResponse.ok) {
    await guildResponse.body?.cancel();
    throw new Error("Listing guild identity lookup failed");
  }
  const guild = z
    .object({ id: z.literal(listingGuildId), owner_id: discordId })
    .parse((await guildResponse.json()) as unknown);
  const webUrl = new URL(web.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(webUrl.hostname))
    throw new Error("Local PostgreSQL required");
  const database = decodeURIComponent(webUrl.pathname.slice(1));
  if (
    !/^[a-zA-Z0-9_-]+$/.test(database) ||
    decodeURIComponent(webUrl.username) !== "forever_web"
  )
    throw new Error("Unexpected web database");
  let previous: Record<string, string> = {};
  try {
    previous = await privateEnvironment(".env.listings");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  try {
    execFileSync("id", ["foreverlistings"], { stdio: "pipe" });
  } catch {
    execFileSync(
      "useradd",
      [
        "--system",
        "--home-dir",
        "/nonexistent",
        "--shell",
        "/usr/sbin/nologin",
        "foreverlistings",
      ],
      { stdio: "pipe" },
    );
  }
  const workerUrl = new URL(webUrl);
  workerUrl.username = "forever_listings";
  workerUrl.password = previous.DATABASE_URL
    ? new URL(previous.DATABASE_URL).password
    : randomBytes(32).toString("hex");
  workerUrl.search = "";
  if (!/^[a-f0-9]{64}$/.test(workerUrl.password))
    throw new Error("Unexpected worker password format");
  const exists = Boolean(
    sql("postgres", "SELECT 1 FROM pg_roles WHERE rolname='forever_listings';"),
  );
  if (exists && !previous.DATABASE_URL)
    throw new Error(
      "Existing role needs recovery environment; not overwritten",
    );
  const values = {
    DATABASE_URL: workerUrl.toString(),
    LISTINGS_BOT_TOKEN: token,
    LISTINGS_REVIEWER_DISCORD_ID:
      previous.LISTINGS_REVIEWER_DISCORD_ID || guild.owner_id,
    LISTINGS_INTERVAL_SECONDS: "30",
  };
  await writeFile(
    ".env.listings",
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  await chmod(".env.listings", 0o600);
  execFileSync("chown", ["foreverlistings:foreverlistings", ".env.listings"], {
    stdio: "pipe",
  });
  if (!exists)
    sql(
      "postgres",
      `CREATE ROLE forever_listings LOGIN PASSWORD '${workerUrl.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;GRANT CONNECT ON DATABASE "${database}" TO forever_listings;`,
    );
  for (const migrationId of [
    "013_discord_listings",
    "033_listing_publish_then_review",
  ]) {
    const migration = await readFile(
      `prisma/migrations/${migrationId}.sql`,
      "utf8",
    );
    const checksum = createHash("sha256").update(migration).digest("hex");
    const applied = sql(
      database,
      `SELECT "checksum" FROM "ForeverMigration" WHERE "id"='${migrationId}';`,
    );
    if (applied && applied !== checksum)
      throw new Error("Migration checksum mismatch");
    if (!applied)
      sql(
        database,
        `BEGIN;SELECT pg_advisory_xact_lock(193002026);${migration}\nINSERT INTO "ForeverMigration" ("id","checksum") VALUES ('${migrationId}','${checksum}');COMMIT;`,
      );
  }
  sql(
    database,
    `GRANT USAGE ON SCHEMA public TO forever_listings;${await readFile("deploy/listings-grants.sql", "utf8")}`,
  );
  const verify = new Client({ connectionString: workerUrl.toString() });
  await verify.connect();
  try {
    await verify.query('SELECT "id" FROM "ForeverListingDiscordJob" LIMIT 0');
    await verify.query('SELECT "id","status" FROM "ForeverGuild" LIMIT 0');
    await verify.query(
      'SELECT "id","status","startsAt","expiresAt" FROM "ForeverGroup" LIMIT 0',
    );
    for (const table of [
      "ForeverUser",
      "ForeverReport",
      "ForeverEvidence",
      "ForeverAppeal",
      "ForeverAuditLog",
      "ForeverSiteSetting",
    ]) {
      const permission = await verify.query<{ allowed: boolean }>(
        "SELECT has_table_privilege(current_user,$1,'SELECT') AS allowed",
        [`"${table}"`],
      );
      if (permission.rows[0].allowed)
        throw new Error("Worker private table access detected");
    }
    const pii = await verify.query<{ allowed: boolean }>(
      `SELECT has_column_privilege(current_user,'"ForeverGuild"','submittedIpHash','SELECT') AS allowed`,
    );
    if (pii.rows[0].allowed)
      throw new Error("Worker private column access detected");
  } finally {
    await verify.end();
  }
  console.log(
    "Listing migration and restricted worker configured; credentials not printed. Public privacy disclosure is included in the website release.",
  );
}
void main().catch((): void => {
  console.error(
    "Listing production provisioning failed; raw errors and credentials suppressed.",
  );
  process.exitCode = 1;
});
