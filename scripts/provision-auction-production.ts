import "./env";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { experienceGuildId } from "../content/discord-channel-experience";
async function main(): Promise<void> {
  const args = parseArgs({
    options: { apply: { type: "boolean" } },
    strict: true,
  });
  if (!args.values.apply) {
    console.log(
      "--apply provisions the private Auction House worker identity and credentials on the existing production host after source/migrations are staged. No public reporting is activated.",
    );
    return;
  }
  const state = z
    .object({
      guildId: z.literal(experienceGuildId),
      channels: z.object({ auction: z.string().regex(/^[1-9]\d{16,19}$/) }),
    })
    .parse(
      JSON.parse(
        await readFile(".data/discord-trading/state.json", "utf8"),
      ) as unknown,
    );
  const token = z.string().min(30).max(300).parse(process.env.KFCBOT_TOKEN);
  const child = spawn(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "root@89.167.46.193",
      "cd /home/wow-forever-discord && node_modules/.bin/tsx scripts/bootstrap-auction-production.ts",
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const completion = new Promise<void>((resolve, reject): void => {
    child.once("error", reject);
    child.once("exit", (code): void => {
      if (code === 0) resolve();
      else reject(new Error("Production provisioning did not complete."));
    });
  });
  child.stdin.end(
    JSON.stringify({ botToken: token, channelId: state.channels.auction }),
  );
  await completion;
}
void main().catch((): void => {
  console.error(
    "Private Auction House provisioning failed; no credential values printed.",
  );
  process.exitCode = 1;
});
