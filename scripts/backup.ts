import "./env";
import { mkdir, readdir, rm, chmod, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { db } from "../lib/db";

async function main(): Promise<void> {
  if (process.platform !== "linux")
    throw new Error("Production backup runs on Linux.");
  process.umask(0o077);
  const root = process.env.BACKUP_DIR || "/var/backups/wow-forever-discord";
  await mkdir(root, { recursive: true, mode: 0o700 });
  const destination = path.join(
    root,
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  await mkdir(destination, { mode: 0o700 });
  const tables = await db.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'Forever%'`;
  if (!tables.length) throw new Error("No Forever tables found.");
  const url = new URL(process.env.DATABASE_URL || "");
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
  };
  const args = tables.flatMap((table) => [
    "--table",
    `public."${table.tablename.replace(/"/g, '""')}"`,
  ]);
  execFileSync(
    "pg_dump",
    [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      ...args,
      "--file",
      path.join(destination, "database.dump"),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  execFileSync(
    "tar",
    [
      "-czf",
      path.join(destination, "private-files.tar.gz"),
      ".data/private",
      ".env.local",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await chmod(path.join(destination, "database.dump"), 0o600);
  if (tables.some((table) => table.tablename === "ForeverDiscordBridge")) {
    // pg_dump --table omits standalone functions; keep the reviewed bridge boundary with the backup.
    await copyFile(
      "prisma/migrations/004_bridge_audit_boundary.sql",
      path.join(destination, "bridge-boundary.sql"),
    );
    await chmod(path.join(destination, "bridge-boundary.sql"), 0o600);
  }
  await chmod(path.join(destination, "private-files.tar.gz"), 0o600);
  const previous = (await readdir(root, { withFileTypes: true }))
    .filter(
      (item) => item.isDirectory() && /^\d{4}-\d{2}-\d{2}T/.test(item.name),
    )
    .map((item) => item.name)
    .sort()
    .reverse();
  for (const old of previous.slice(7))
    await rm(path.join(root, old), { recursive: true });
  console.log(
    "Forever database and private files backed up; latest seven local copies retained.",
  );
}
main()
  .catch(() => {
    console.error(
      "Forever backup failed. Check disk space, PostgreSQL client compatibility and permissions.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
