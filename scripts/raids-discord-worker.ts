import "./env";
import { db } from "../lib/db";
import {
  raidDiscordDestinations,
  raidDestinationForPost,
  raidDiscordGuildIds,
} from "../lib/raids/discord-settings";
import {
  deliverRaidPosts,
  raidDiscordRequest,
} from "../lib/raids/discord-delivery";
import { runNativeRaidWork } from "../lib/raids/native-worker";
import { deliverRaidMirrors } from "../lib/raids/discord-mirrors";

async function main(): Promise<void> {
  const destinations = raidDiscordDestinations();
  if (!destinations.length)
    throw new Error("Discord event pilot settings are incomplete or disabled.");
  let stop = false;
  process.on("SIGTERM", () => {
    stop = true;
  });
  process.on("SIGINT", () => {
    stop = true;
  });
  const once = process.argv.includes("--once");
  async function nativeLoop(): Promise<void> {
    do {
      try {
        for (let jobs = 0; jobs < 10 && !stop; jobs += 1) {
          if (!(await runNativeRaidWork(db))) break;
        }
      } catch {
        console.error("Native event queue unavailable; retrying next cycle.");
        if (once) throw new Error("Native event queue could not run.");
      }
      if (once) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    } while (!stop);
  }
  const native = nativeLoop();
  // Observe failures immediately; wait for both loops before closing the database.
  let nativeFailure = false;
  native.catch(() => {
    nativeFailure = true;
    stop = true;
  });
  try {
    do {
      const communityPosts = await db.foreverRaidDiscordPost.findMany({
        where: {
          visibility: "community",
          confirmedAt: { not: null },
          guildId: { in: raidDiscordGuildIds() },
          origin: destinations[0].origin,
          status: { in: ["pending", "uncertain", "delivering", "sent"] },
          nextAttemptAt: { lte: new Date() },
        },
        distinct: ["guildId", "channelId", "origin"],
      });
      const targets = [
        ...destinations,
        ...communityPosts.flatMap((post) => {
          const destination = raidDestinationForPost(post);
          return destination ? [destination] : [];
        }),
      ];
      for (const settings of targets) {
        try {
          const count = await deliverRaidPosts(
            db,
            settings,
            raidDiscordRequest(settings),
          );
          if (count) console.log(`Synced ${count} Discord event posts.`);
        } catch (error) {
          console.error(
            error instanceof Error
              ? error.name
              : "Discord delivery unavailable",
          );
          if (process.argv.includes("--once"))
            throw new Error("Discord event delivery could not run.");
        }
      }
      try {
        const count = await deliverRaidMirrors(db);
        if (count) console.log(`Synced ${count} linked Discord event posts.`);
      } catch (error) {
        console.error(
          error instanceof Error
            ? error.name
            : "Discord mirror delivery unavailable",
        );
        if (once) throw new Error("Discord mirror delivery could not run.");
      }
      if (process.argv.includes("--once")) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    } while (!stop);
  } finally {
    stop = true;
    await native.catch(() => undefined);
    await db.$disconnect();
  }
  if (nativeFailure) throw new Error("Native event queue could not run.");
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
