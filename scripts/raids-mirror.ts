import "./env";
import { db } from "../lib/db";
import { registerRaidMirror } from "../lib/raids/discord-mirrors";

async function main(): Promise<void> {
  const [eventId, guildId, channelId, messageId, flag, ...extra] =
    process.argv.slice(2);
  if (
    !eventId ||
    !guildId ||
    !channelId ||
    !messageId ||
    extra.length ||
    (flag && flag !== "--apply")
  )
    throw new Error(
      "Usage: tsx scripts/raids-mirror.ts EVENT_ID GUILD_ID CHANNEL_ID MESSAGE_ID [--apply]",
    );
  console.log(
    JSON.stringify(
      await registerRaidMirror(
        db,
        { eventId, guildId, channelId, messageId },
        flag === "--apply",
      ),
    ),
  );
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.name : "Mirror registration failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
