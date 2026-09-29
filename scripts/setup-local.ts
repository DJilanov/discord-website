import { randomBytes } from "node:crypto";
import { copyFile, appendFile, chmod } from "node:fs/promises";
import { constants } from "node:fs";

async function main(): Promise<void> {
  await copyFile(".env.example", ".env.local", constants.COPYFILE_EXCL);
  await chmod(".env.local", 0o600);
  await appendFile(
    ".env.local",
    `\nAUTH_SECRET=${randomBytes(48).toString("base64url")}\nANALYTICS_SALT=${randomBytes(48).toString("base64url")}\n`,
  );
  console.log("Local environment created with private secrets.");
}
main().catch((error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EEXIST"
      ? ".env.local already exists; it was left intact."
      : error.message,
  );
  process.exitCode = 1;
});
