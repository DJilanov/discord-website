import "./env";
import { parseArgs } from "node:util";
import { db } from "../lib/db";
import {
  convertGroupListing,
  planGroupListingConversion,
} from "../lib/raids/listing-conversion";
import { formatRaidTime, validateEvent } from "../lib/raids/policy";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      group: { type: "string" },
      organizer: { type: "string" },
      finish: { type: "string" },
      capacity: { type: "string" },
      admission: { type: "string" },
      target: { type: "string" },
      tanks: { type: "string" },
      healers: { type: "string" },
      damage: { type: "string" },
      apply: { type: "boolean", default: false },
    },
  });
  const caps = [values.tanks, values.healers, values.damage];
  if (
    caps.some((value) => value !== undefined) &&
    caps.some((value) => value === undefined)
  )
    throw new Error("Specify all three role caps together.");
  const input = {
    groupId: values.group,
    organizerDiscordId: values.organizer,
    localFinish: values.finish,
    capacity: Number(values.capacity),
    admission: values.admission,
    target: values.target,
    ...(values.tanks !== undefined
      ? {
          roleCaps: {
            tank: Number(values.tanks),
            healer: Number(values.healers),
            damage: Number(values.damage),
          },
        }
      : {}),
  };
  const plan = await planGroupListingConversion(db, input);
  const times = validateEvent(plan.event, new Date());
  console.log(
    JSON.stringify({
      mode: values.apply ? "apply" : "read-only preview",
      title: plan.event.title,
      activity: plan.event.eventType,
      starts: formatRaidTime(times.startsAt, plan.event.region),
      ends: formatRaidTime(times.endsAt, plan.event.region),
      capacity: plan.event.capacity,
      admission: plan.event.admission,
      ruleset: plan.event.ruleset,
      description: plan.event.description,
      discordPost: `https://discord.com/channels/${plan.settings.guildId}/${plan.threadId}/${plan.threadId}`,
      previousEventId: plan.eventId,
    }),
  );
  if (values.apply) {
    const id = await convertGroupListing(db, {
      ...input,
      expectedSourceChecksum: plan.sourceChecksum,
    });
    console.log(
      JSON.stringify({
        event: `${plan.settings.origin}/raids/${id}`,
        directory: `${plan.settings.origin}/lfg#event-${id}`,
      }),
    );
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Group conversion failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
