import "./env";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  foreverOpeningRaids,
  foreverRaidLootPolicy,
} from "../content/kfc-forever-opening-week";
import { db } from "../lib/db";
import {
  ensureOpeningPolicy,
  openingOrganizer,
  publishOpeningRaid,
} from "../lib/kfc-raiding/opening-publication";
import { RaidingStore } from "../lib/kfc-raiding/storage";
import { raidingClient } from "../lib/kfc-raiding/transport";

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { apply: { type: "boolean" } } });
  if (!values.apply) {
    console.log(
      JSON.stringify(
        {
          timezone: "Europe/Berlin",
          raids: foreverOpeningRaids,
          policy: foreverRaidLootPolicy,
          writes: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  const store = new RaidingStore(path.join(process.cwd(), ".data/kfc-raiding"));
  await store.initialize();
  const config = await store.config();
  if (!config)
    throw new Error("Configure the KFC raid spaces before publication.");
  const release = await store.lock();
  try {
    const publication = await store.publication();
    const token =
      process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "";
    const client = raidingClient(config, token, fetch, {
      createNativeEvents: true,
    });
    const policy = await ensureOpeningPolicy(publication, store, token);
    const organizers = {
      DJ: await openingOrganizer("DJ", db, client),
      Psy: await openingOrganizer("Psy", db, client),
    };
    const results = [];
    // Discord lists newest-created posts first; publish the nearest session last.
    for (const raid of [...foreverOpeningRaids].reverse()) {
      const result = await publishOpeningRaid(
        raid,
        policy,
        organizers[raid.leader],
        db,
        config,
        publication,
        store,
        client,
      );
      results.push({ ...result, title: raid.title });
      console.log(JSON.stringify({ published: raid.key, ...result }));
    }
    console.log(
      JSON.stringify(
        { policy, events: results, signupsCreated: 0, mentions: 0 },
        null,
        2,
      ),
    );
  } finally {
    await release();
  }
}

main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error
        ? error.message
        : "Opening-week publication failed.",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await db.$disconnect();
  });
