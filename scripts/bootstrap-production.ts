import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parse } from "dotenv";
import { Client } from "pg";

// Run once as root on the existing host. No credentials are logged or copied locally.
async function main(): Promise<void> {
  if (process.platform !== "linux" || process.getuid?.() !== 0)
    throw new Error("Run as root on the production host only.");
  const sourceDir = process.env.KFC_ENV_DIR || "/home/kfc-website-system";
  const source = {
    ...parse(await readFile(`${sourceDir}/.env`, "utf8")),
    ...parse(await readFile(`${sourceDir}/.env.production`, "utf8")),
  };
  const sourceUrl = new URL(source.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(sourceUrl.hostname))
    throw new Error("Expected local PostgreSQL.");
  const dbName = decodeURIComponent(sourceUrl.pathname.slice(1));
  const identifier = (value: string): string =>
    `"${value.replace(/"/g, '""')}"`;
  let existing: Record<string, string> = {};
  try {
    existing = parse(await readFile(".env.local", "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const appUrl = new URL(sourceUrl);
  appUrl.username = "forever_web";
  appUrl.password = existing.DATABASE_URL
    ? new URL(existing.DATABASE_URL).password
    : randomBytes(32).toString("hex");
  appUrl.hostname = "127.0.0.1";
  appUrl.search = "";
  if (!existing.DATABASE_URL) {
    execFileSync(
      "runuser",
      [
        "-u",
        "postgres",
        "--",
        "psql",
        "-X",
        "-q",
        "-v",
        "ON_ERROR_STOP=1",
        "-d",
        "postgres",
      ],
      {
        input: `CREATE ROLE forever_web LOGIN PASSWORD '${appUrl.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;\nGRANT CONNECT ON DATABASE ${identifier(dbName)} TO forever_web;\n`,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  }
  execFileSync(
    "runuser",
    [
      "-u",
      "postgres",
      "--",
      "psql",
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      dbName,
    ],
    {
      input: "GRANT USAGE, CREATE ON SCHEMA public TO forever_web;\n",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const values = {
    ...parse(await readFile(".env.example", "utf8")),
    ...existing,
    DATABASE_URL: appUrl.toString(),
    AUTH_SECRET: existing.AUTH_SECRET || randomBytes(48).toString("base64url"),
    ANALYTICS_SALT: existing.ANALYTICS_SALT || randomBytes(48).toString("hex"),
    SITE_URL: "https://www.wowforeverdiscord.online",
    SITE_INDEXABLE: "true",
    AUTH_TRUST_HOST: "true",
    TRUST_PROXY: "true",
  };
  await writeFile(
    ".env.local",
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  await chmod(".env.local", 0o600);
  const postgres = (sql: string): void => {
    execFileSync(
      "runuser",
      [
        "-u",
        "postgres",
        "--",
        "psql",
        "-X",
        "-q",
        "-v",
        "ON_ERROR_STOP=1",
        "-d",
        "postgres",
      ],
      { input: sql, stdio: ["pipe", "pipe", "pipe"] },
    );
  };
  // PostgreSQL checks CREATE even for Prisma's CREATE SCHEMA IF NOT EXISTS.
  // Grant it only during the initial migration, never to the running website.
  postgres(`GRANT CREATE ON DATABASE ${identifier(dbName)} TO forever_web;`);
  try {
    execFileSync("npm", ["run", "db:migrate"], { stdio: "inherit" });
  } finally {
    postgres(
      `REVOKE CREATE ON DATABASE ${identifier(dbName)} FROM forever_web;`,
    );
  }
  const check = new Client({ connectionString: appUrl.toString() });
  await check.connect();
  try {
    const access = await check.query<{ permitted: boolean }>(
      `SELECT has_table_privilege(current_user, '"User"', 'SELECT') AS permitted`,
    );
    if (access.rows[0]?.permitted)
      throw new Error(
        "Application role unexpectedly has access to KFC users. Fix grants before launch.",
      );
  } finally {
    await check.end();
  }
  console.log(
    "Production environment created with a dedicated PostgreSQL role. KFC tables are not accessible to it.",
  );
}
main().catch(() => {
  console.error(
    "Production bootstrap failed. Inspect server configuration without exposing credentials.",
  );
  process.exitCode = 1;
});
