import { chmod, lstat, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  discordId,
  renderDiscordAudit,
  type DiscordAuditReport,
  type DiscordAuditSnapshot,
} from "./discord-audit";

export async function saveDiscordAudit(
  snapshot: DiscordAuditSnapshot,
  report: DiscordAuditReport,
  projectDirectory: string,
): Promise<string> {
  const guildId = discordId.parse(snapshot.guild.id);
  const dataRoot = path.join(projectDirectory, ".data");
  await mkdir(dataRoot, { recursive: true, mode: 0o700 });
  if ((await lstat(dataRoot)).isSymbolicLink())
    throw new Error("Audit data directory must not be a symbolic link.");
  const root = path.join(dataRoot, "kfcbot-audits");
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await lstat(root)).isSymbolicLink())
    throw new Error("Audit directory must not be a symbolic link.");
  await chmod(root, 0o700);
  const directory = await mkdtemp(path.join(root, `${guildId}-`));
  await writeFile(
    path.join(directory, "snapshot.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(
    path.join(directory, "audit.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
  await writeFile(
    path.join(directory, "audit.md"),
    renderDiscordAudit(snapshot, report),
    { mode: 0o600, flag: "wx" },
  );
  return directory;
}
