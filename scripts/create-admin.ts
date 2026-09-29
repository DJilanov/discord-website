import "./env";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db";

async function main(): Promise<void> {
  const input = z
    .object({
      email: z.email(),
      name: z.string().min(2),
      password: z.string().min(16).max(200),
      role: z.enum(["owner", "admin", "moderator", "editor"]),
    })
    .parse({
      email: process.env.ADMIN_EMAIL,
      name: process.env.ADMIN_NAME,
      password: process.env.ADMIN_PASSWORD,
      role: process.env.ADMIN_ROLE || "owner",
    });
  const existing = await db.foreverUser.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing)
    throw new Error("This staff account already exists. No changes were made.");
  await db.foreverUser.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: await hash(input.password, 12),
      role: input.role,
    },
  });
  console.log("Staff account created.");
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof z.ZodError
        ? "Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (at least 16 characters)."
        : error instanceof Error
          ? error.message
          : "Creation failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
