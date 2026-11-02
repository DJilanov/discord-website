import "./env";
import path from "node:path";
import { parseArgs } from "node:util";
import { db } from "../lib/db";
import { syncKfcRaiding } from "../lib/kfc-raiding/sync";
import { RaidingStore } from "../lib/kfc-raiding/storage";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { apply: { type: "boolean" }, status: { type: "boolean" } },
  });
  if (values.status) {
    const store = new RaidingStore(
      path.join(process.cwd(), ".data/kfc-raiding"),
    );
    const config = await store.config();
    const state = await store.state();
    console.log(
      JSON.stringify(
        {
          configured: config !== null,
          lastSuccessAt: state.lastSuccessAt,
          managedRaidEvents: Object.keys(config?.managedNativeEvents ?? {})
            .length,
          linkedForumPosts: Object.values(state.posts).filter(
            (post): boolean => post.status === "sent",
          ).length,
          pendingLinkedPosts: Object.values(state.posts).filter(
            (post): boolean => post.status !== "sent",
          ).length,
          subscriptions: {
            forever: Object.keys(state.subscriptions.forever).length,
            tbc: Object.keys(state.subscriptions.tbc).length,
          },
          digestsEnabled: config?.digestsEnabled ?? false,
        },
        null,
        2,
      ),
    );
    return;
  }
  await syncKfcRaiding(db, !!values.apply);
}

main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "KFC raiding failed.",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await db.$disconnect();
  });
