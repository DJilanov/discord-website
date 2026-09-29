import "./env";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { Client } from "pg";
import { db } from "../lib/db";

async function main(): Promise<void> {
  if (process.platform !== "linux" || process.getuid?.() !== 0)
    throw new Error("Server-side root bootstrap only.");
  const email = process.env.OWNER_EMAIL;
  if (!email) throw new Error("OWNER_EMAIL is required.");
  const directory = process.env.KFC_ENV_DIR || "/home/kfc-website-system";
  const env = {
    ...parse(await readFile(`${directory}/.env`, "utf8")),
    ...parse(await readFile(`${directory}/.env.production`, "utf8")),
  };
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{
      email: string;
      name: string;
      password: string;
      role: string;
    }>(
      'SELECT "email", "name", "password", "role" FROM "User" WHERE lower("email") = lower($1)',
      [email],
    );
    const owner = result.rows[0];
    if (
      !owner ||
      !["admin", "owner"].includes(owner.role) ||
      !/^\$2[aby]\$/.test(owner.password)
    )
      throw new Error("Expected an existing privileged bcrypt account.");
    await db.foreverUser.upsert({
      where: { email: owner.email.toLowerCase() },
      create: {
        email: owner.email.toLowerCase(),
        name: owner.name,
        passwordHash: owner.password,
        role: "owner",
      },
      update: {},
    });
    console.log(
      "Owner account initialized. Existing Forever account credentials, if any, were preserved.",
    );
  } finally {
    await client.end();
  }
}
main()
  .catch(() => {
    console.error(
      "Owner import failed; verify the selected KFC admin account on the server.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
