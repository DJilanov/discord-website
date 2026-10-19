import {
  readFile,
  writeFile,
  appendFile,
  chmod,
  lstat,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { parse } from "dotenv";
import { Client } from "pg";
import { z } from "zod";
import {
  defaultAuctionSettings,
  auctionMarketSchema,
} from "../lib/auction/contracts";

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
    { input, stdio: ["pipe", "pipe", "pipe"], encoding: "utf8" },
  ).trim();
}
async function privateEnvironment(
  filename: string,
): Promise<Record<string, string>> {
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error("Private environment permissions are unsafe.");
  return parse(await readFile(filename, "utf8"));
}
async function main(): Promise<void> {
  if (
    process.platform !== "linux" ||
    process.getuid?.() !== 0 ||
    process.cwd() !== "/home/wow-forever-discord"
  )
    throw new Error("Production root and exact project directory required.");
  let input = "";
  for await (const chunk of process.stdin) {
    input += String(chunk);
    if (input.length > 4096) throw new Error("Input exceeds bounds.");
  }
  const setup = z
    .object({
      botToken: z.string().min(30).max(300),
      channelId: z.string().regex(/^[1-9]\d{16,19}$/),
    })
    .strict()
    .parse(JSON.parse(input) as unknown);
  const web = await privateEnvironment(".env.local"),
    sourcePath = "/home/wow-trader-system/shared/env/ingest.env",
    source = await privateEnvironment(sourcePath);
  const webUrl = new URL(web.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(webUrl.hostname))
    throw new Error("Local PostgreSQL required.");
  const database = decodeURIComponent(webUrl.pathname.slice(1));
  if (!/^[A-Za-z0-9_-]+$/.test(database))
    throw new Error("Unexpected database identifier.");
  let previous: Record<string, string> = {};
  try {
    previous = await privateEnvironment(".env.auction");
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  try {
    execFileSync("id", ["foreverauction"], { stdio: "pipe" });
  } catch {
    execFileSync(
      "useradd",
      [
        "--system",
        "--home-dir",
        "/nonexistent",
        "--shell",
        "/usr/sbin/nologin",
        "foreverauction",
      ],
      { stdio: "pipe" },
    );
  }
  const workerUrl = new URL(webUrl);
  workerUrl.username = "forever_auction";
  workerUrl.password = previous.DATABASE_URL
    ? new URL(previous.DATABASE_URL).password
    : randomBytes(32).toString("hex");
  workerUrl.search = "";
  const roleExists = Boolean(
    sql("postgres", "SELECT 1 FROM pg_roles WHERE rolname='forever_auction';"),
  );
  if (roleExists && !previous.DATABASE_URL)
    throw new Error(
      "Existing worker role without recovery environment; preserve and review.",
    );
  if (!/^[a-f0-9]{64}$/.test(workerUrl.password))
    throw new Error(
      "Unexpected worker password encoding; preserve and review.",
    );
  const readKey = previous.AUCTION_READ_KEY ?? randomBytes(32).toString("hex");
  const keys = (source.MARKET_READ_API_KEYS ?? "").split(",").filter(Boolean);
  if ([...keys, readKey].some((key) => !/^[A-Za-z0-9_-]{32,}$/.test(key)))
    throw new Error(
      "Unexpected source read-key encoding; preserve and review.",
    );
  const values = {
    DATABASE_URL: workerUrl.toString(),
    AUCTION_SOURCE_URL: "https://helper.kfcguild.online",
    AUCTION_READ_KEY: readKey,
    AUCTION_BOT_TOKEN: setup.botToken,
    AUCTION_INTERVAL_SECONDS: previous.AUCTION_INTERVAL_SECONDS ?? "900",
  };
  // Persist recovery credentials before creating the role or registering its key.
  await writeFile(
    ".env.auction",
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  await chmod(".env.auction", 0o600);
  execFileSync("chown", ["foreverauction:foreverauction", ".env.auction"], {
    stdio: "pipe",
  });
  if (!roleExists) {
    sql(
      "postgres",
      `CREATE ROLE forever_auction LOGIN PASSWORD '${workerUrl.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;GRANT CONNECT ON DATABASE "${database}" TO forever_auction;`,
    );
  }
  for (const id of ["010_auction_research", "011_auction_health"]) {
    const migration = await readFile(`prisma/migrations/${id}.sql`, "utf8"),
      checksum = createHash("sha256").update(migration).digest("hex");
    const existing = sql(
      database,
      `SELECT "checksum" FROM "ForeverMigration" WHERE "id"='${id}';`,
    );
    if (existing && existing !== checksum)
      throw new Error("Applied migration checksum mismatch.");
    if (!existing)
      sql(
        database,
        `BEGIN;SELECT pg_advisory_xact_lock(193002026);${migration}\nINSERT INTO "ForeverMigration"("id","checksum") VALUES ('${id}','${checksum}');COMMIT;`,
      );
  }
  sql(
    database,
    `GRANT USAGE ON SCHEMA public TO forever_auction;${await readFile("deploy/auction-grants.sql", "utf8")}`,
  );
  if (!keys.includes(readKey))
    await appendFile(
      sourcePath,
      `\nMARKET_READ_API_KEYS=${[...keys, readKey].join(",")}\n`,
    );
  const sourceUrl = new URL(source.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(sourceUrl.hostname))
    throw new Error("Local Trader PostgreSQL required.");
  const sourceDb = new Client({ connectionString: source.DATABASE_URL });
  await sourceDb.connect();
  let markets: z.infer<typeof auctionMarketSchema>[] = [];
  try {
    const rows = await sourceDb.query<{
      clientBuild: number;
      region: string;
      realmId: string;
      auctionHouseType: string;
    }>(
      `SELECT s.client_build AS "clientBuild",s.region,s.realm_id AS "realmId",s.auction_house_type AS "auctionHouseType" FROM market_scan s JOIN raw_upload u ON u.payload_id=s.payload_id JOIN game_build g ON g.product=u.client_product AND g.build_number=s.client_build AND g.status='published' WHERE u.client_product='wow_classic_beta' AND s.quality_accepted=true ORDER BY s.completed_at DESC LIMIT 1`,
    );
    const parsed = auctionMarketSchema.safeParse({
      ...rows.rows[0],
      clientProduct: "wow_classic_beta",
      enabled: true,
    });
    if (parsed.success) markets = [parsed.data];
  } finally {
    await sourceDb.end();
  }
  const settings = {
    ...defaultAuctionSettings,
    channelId: setup.channelId,
    markets,
  };
  const client = new Client({ connectionString: web.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      'INSERT INTO "ForeverAuctionConfig"("id","version","settings","updatedAt") VALUES ($1,1,$2,NOW()) ON CONFLICT ("id") DO NOTHING',
      ["auction", JSON.stringify(settings)],
    );
  } finally {
    await client.end();
  }
  const verify = new Client({ connectionString: workerUrl.toString() });
  await verify.connect();
  try {
    await verify.query('SELECT "id" FROM "ForeverAuctionConfig" LIMIT 0');
    const privileges = await verify.query<{ allowed: boolean }>(
      `SELECT has_table_privilege(current_user, '"ForeverAuctionConfig"', 'INSERT,UPDATE,DELETE') AS allowed`,
    );
    if (privileges.rows[0]?.allowed)
      throw new Error("Worker can change its publication configuration.");
    for (const table of [
      "ForeverUser",
      "ForeverReport",
      "User",
      "ForeverSiteSetting",
    ]) {
      try {
        await verify.query(`SELECT 1 FROM "${table}" LIMIT 0`);
        throw new Error("Worker can access a protected table.");
      } catch (error: unknown) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          (error.code === "42501" || error.code === "42P01")
        ))
          throw error;
      }
    }
  } finally {
    await verify.end();
  }
  console.log(
    "Auction migrations, private preview configuration, separate credentials and restricted worker identity verified. No public reports enabled.",
  );
}
void main().catch((): void => {
  console.error(
    "Auction production setup stopped; private values and raw database errors suppressed. Inspect the reviewed setup before retrying.",
  );
  process.exitCode = 1;
});
