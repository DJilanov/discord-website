import "./env";
import assert from "node:assert/strict";
import { db } from "../lib/db";

async function main(): Promise<void> {
  const grants = await db.$queryRaw<
    Array<{
      role: string;
      kfc_access: boolean;
      create_database_objects: boolean;
    }>
  >`SELECT current_user AS role, has_table_privilege(current_user, '"User"', 'SELECT') AS kfc_access, has_database_privilege(current_user, current_database(), 'CREATE') AS create_database_objects`;
  assert.equal(grants[0].role, "forever_web");
  assert.equal(grants[0].kfc_access, false);
  assert.equal(grants[0].create_database_objects, false);
  assert.ok(
    await db.foreverUser.count({ where: { role: "owner", active: true } }),
  );
  assert.ok((await db.foreverGuide.count({ where: { published: true } })) >= 4);
  assert.equal(
    await db.foreverUser.count({
      where: { email: { endsWith: "@example.invalid" } },
    }),
    0,
  );
  assert.equal(
    await db.foreverReport.count({
      where: { reporterDiscord: { startsWith: "e2e-" } },
    }),
    0,
  );
  console.log(
    "Production checks passed: isolated database permissions, active owner, published guides, no browser-test records.",
  );
}
main()
  .catch(() => {
    console.error(
      "Production checks failed. Investigate before accepting traffic.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
