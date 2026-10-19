import "./env";
import { readFile, lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import {
  kfcGuildId,
  kfcApplicationId,
  scheduledEventBindings,
  kfcNativeEventEditions,
} from "../content/kfc-community";
import { db } from "../lib/db";
import {
  collectDiscordAudit,
  DiscordAuditError,
} from "../lib/discord-audit-client";
import {
  discordId,
  auditCredentialsSchema,
  guildPermissions,
  channelPermissions,
  hasDiscordPermission,
} from "../lib/discord-audit";
import { kfcRequest } from "../lib/kfc-community";
import {
  scheduledEventSchema,
  scheduledEventPatch,
  kfcCalendarContent,
  type KfcCalendarEntry,
} from "../lib/kfc-event-maintenance";
import { scheduledEventRequest } from "../lib/scheduled-event-client";

const sourceStateSchema = z.object({
  guildId: z.literal(kfcGuildId),
  messages: z.object({
    calendar: z.object({ channelId: discordId, messageId: discordId }),
  }),
});
const maintenanceSchema = z.object({
  schedules: z.record(
    z.string(),
    z.object({ version: z.number().int(), after: scheduledEventSchema }),
  ),
});
type MaintenanceState = z.infer<typeof maintenanceSchema>;
const watchIntervalSeconds = 30;
const messageSchema = z.object({
  id: discordId,
  channel_id: discordId,
  author: z.object({ id: discordId }),
  content: z.string(),
  embeds: z.array(z.unknown()),
  flags: z.number().int().nonnegative().default(0),
});

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { apply: { type: "boolean" }, watch: { type: "boolean" } },
  });
  if (values.watch && !values.apply)
    throw new Error("Watch mode requires --apply.");
  const credentials = auditCredentialsSchema.parse({
    applicationId: kfcApplicationId,
    guildId: kfcGuildId,
    token: process.env.DISCORD_BOT_TOKEN || process.env.KFCBOT_TOKEN,
  });
  const root = path.join(process.cwd(), ".data/kfc-community");
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0)
    throw new Error(
      "Private KFC migration state must exist before maintenance.",
    );
  async function readPrivate(filename: string): Promise<string> {
    const fileInfo = await lstat(filename);
    if (
      !fileInfo.isFile() ||
      fileInfo.isSymbolicLink() ||
      (fileInfo.mode & 0o077) !== 0
    )
      throw new Error("Unsafe maintenance state file.");
    return readFile(filename, "utf8");
  }
  const maintenancePath = path.join(root, "maintenance.json"),
    lockPath = path.join(root, "maintenance.lock");
  let state: MaintenanceState = { schedules: {} };
  try {
    state = maintenanceSchema.parse(
      JSON.parse(await readPrivate(maintenancePath)),
    );
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (values.apply) {
    try {
      const existing = z
        .object({ pid: z.number().int().positive() })
        .parse(JSON.parse(await readPrivate(lockPath)));
      try {
        process.kill(existing.pid, 0);
        throw new Error("KFC maintenance is already running.");
      } catch (error: unknown) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        ))
          throw error;
        await unlink(lockPath);
      }
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
  }
  const lock = values.apply ? await open(lockPath, "wx", 0o600) : null;
  if (lock) {
    await lock.writeFile(JSON.stringify({ pid: process.pid }));
    await lock.sync();
  }
  const journal = values.apply
    ? await open(
        path.join(root, `maintenance-${Date.now()}.jsonl`),
        "wx",
        0o600,
      )
    : null;
  let stopped = false;
  process.once("SIGTERM", (): void => {
    stopped = true;
  });
  process.once("SIGINT", (): void => {
    stopped = true;
  });
  async function save(): Promise<void> {
    const temporary = path.join(root, `maintenance-${process.pid}.tmp`),
      file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(maintenanceSchema.parse(state)));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, maintenancePath);
  }
  async function log(record: Record<string, unknown>): Promise<void> {
    if (!journal) return;
    await journal.appendFile(
      JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
    );
    await journal.sync();
  }
  async function cycle(): Promise<void> {
    // Never race a channel migration/restore that could change the resource destination.
    try {
      await lstat(path.join(root, "operator.lock"));
      throw new Error("KFC migration is running; maintenance deferred.");
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    const sourceState = sourceStateSchema.parse(
      JSON.parse(await readPrivate(path.join(root, "state.json"))),
    );
    const projectionGuildIds = [
      ...new Set(
        scheduledEventBindings.flatMap((binding) =>
          binding.projections.map((projection): string => projection.guildId),
        ),
      ),
    ];
    const audits = new Map(
      await Promise.all(
        projectionGuildIds.map(async (guildId) => {
          const snapshot = await collectDiscordAudit({
            ...credentials,
            guildId,
          });
          return [guildId, snapshot] as const;
        }),
      ),
    );
    const snapshot = audits.get(kfcGuildId);
    if (!snapshot)
      throw new Error("KFC audit is unavailable for calendar maintenance.");
    const allowedIds = new Set([sourceState.messages.calendar.channelId]);
    const request = async (
      route: string,
      method: "GET" | "PATCH" = "GET",
      body?: unknown,
      recheck?: () => Promise<void>,
    ): Promise<unknown> => {
      if (method !== "GET" && !values.apply)
        throw new Error("Preview cannot write.");
      return kfcRequest(credentials, route, method, body, {
        channelIds: allowedIds,
        recheck,
      });
    };
    const scheduleRequest = async (
      route: string,
      method: "GET" | "PATCH" = "GET",
      body?: unknown,
      recheck?: () => Promise<void>,
    ): Promise<unknown> => {
      if (method !== "GET" && !values.apply)
        throw new Error("Preview cannot write.");
      return scheduledEventRequest(credentials, route, method, body, {
        recheck,
      });
    };
    const scheduledByGuild = new Map(
      await Promise.all(
        projectionGuildIds.map(async (guildId) => {
          const scheduled = z
            .array(scheduledEventSchema)
            .parse(
              await scheduleRequest(`/guilds/${guildId}/scheduled-events`),
            );
          if (scheduled.some((event): boolean => event.guild_id !== guildId))
            throw new Error("Discord returned a cross-guild scheduled event.");
          return [guildId, scheduled] as const;
        }),
      ),
    );
    const scheduled = scheduledByGuild.get(kfcGuildId);
    if (!scheduled) throw new Error("KFC scheduled-event list is unavailable.");
    const entries: KfcCalendarEntry[] = [],
      boundIds = new Set<string>();
    for (const binding of scheduledEventBindings) {
      const event = await db.foreverRaidEvent.findUnique({
        where: { id: binding.eventId },
        include: {
          discordPost: true,
          discordMirrors: { where: { guildId: kfcGuildId, status: "sent" } },
        },
      });
      if (
        !event ||
        event.discordPost?.visibility !== "community" ||
        !event.discordPost.approvedAt ||
        !event.discordMirrors.length
      ) {
        console.log(
          `Held event ${binding.eventId}: public approval/mirror unavailable.`,
        );
        continue;
      }
      if (event.status !== "cancelled" && event.endsAt > new Date())
        entries.push({
          title: event.title,
          game: z.enum(["tbc", "forever"]).parse(event.game),
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          url: `https://www.wowforeverdiscord.online/raids/${event.id}`,
        });
      for (const projection of binding.projections) {
        if (projection.guildId === kfcGuildId)
          boundIds.add(projection.scheduledId);
        const native = scheduledByGuild
          .get(projection.guildId)
          ?.find(
            (candidate): boolean => candidate.id === projection.scheduledId,
          );
        if (!native) {
          console.log(
            `Missing scheduled event ${projection.scheduledId} in guild ${projection.guildId}; not recreated.`,
          );
          continue;
        }
        const patch = scheduledEventPatch(
          event,
          native,
          projection,
          new Date(),
        );
        if (!patch) {
          if (
            values.apply &&
            native.status === 1 &&
            (!state.schedules[projection.scheduledId] ||
              state.schedules[projection.scheduledId].version !== event.version)
          ) {
            state.schedules[projection.scheduledId] = {
              version: event.version,
              after: native,
            };
            await save();
            await log({
              operation: "scheduled-event",
              status: "matched-no-write",
              guildId: projection.guildId,
              after: native,
              sourceVersion: event.version,
            });
          }
          continue;
        }
        const previous = state.schedules[projection.scheduledId];
        if (previous && !isDeepStrictEqual(native, previous.after)) {
          console.log(
            `Held scheduled event ${projection.scheduledId}: Discord changed outside synchronization.`,
          );
          continue;
        }
        if (!values.apply) {
          console.log(
            JSON.stringify({
              preview: projection.scheduledId,
              guildId: projection.guildId,
              eventVersion: event.version,
              patch,
            }),
          );
          continue;
        }
        const audit = audits.get(projection.guildId);
        if (
          !audit ||
          !hasDiscordPermission(
            guildPermissions(audit.roles, projection.guildId, audit.botRoleIds),
            1n << 33n,
          )
        ) {
          console.log(
            `Held scheduled event ${projection.scheduledId}: Manage Events permission required.`,
          );
          continue;
        }
        const route = `/guilds/${projection.guildId}/scheduled-events/${projection.scheduledId}`;
        await log({
          operation: "scheduled-event",
          status: "pending",
          guildId: projection.guildId,
          before: native,
          patch,
          sourceVersion: event.version,
        });
        await scheduleRequest(
          route,
          "PATCH",
          patch,
          async (): Promise<void> => {
            const current = scheduledEventSchema.parse(
              await scheduleRequest(route),
            );
            const latest = await db.foreverRaidEvent.findUnique({
              where: { id: event.id },
              select: { version: true, status: true },
            });
            if (
              !isDeepStrictEqual(current, native) ||
              latest?.version !== event.version ||
              latest.status !== event.status
            )
              throw new Error(
                "Event changed while waiting; preserve the edit and retry next cycle.",
              );
          },
        );
        const after = scheduledEventSchema.parse(await scheduleRequest(route));
        if (scheduledEventPatch(event, after, projection, new Date()) !== null)
          throw new Error("Scheduled-event read-back mismatch.");
        state.schedules[projection.scheduledId] = {
          version: event.version,
          after,
        };
        await save();
        await log({
          operation: "scheduled-event",
          status: "verified",
          guildId: projection.guildId,
          after,
        });
        console.log(
          `Synchronized scheduled event ${projection.scheduledId} in guild ${projection.guildId}.`,
        );
      }
    }
    for (const event of scheduled.filter(
      (e): boolean => !boundIds.has(e.id) && [1, 2].includes(e.status),
    )) {
      if (event.channel_id) {
        const channel = snapshot.channels.find(
          (c): boolean => c.id === event.channel_id,
        );
        if (
          !channel ||
          !hasDiscordPermission(
            channelPermissions(
              guildPermissions(snapshot.roles, kfcGuildId, []),
              channel,
              kfcGuildId,
              [],
            ),
            1n << 10n,
          )
        )
          continue;
      }
      entries.push({
        title: event.name,
        game: kfcNativeEventEditions[event.id] ?? null,
        startsAt: new Date(event.scheduled_start_time),
        endsAt: event.scheduled_end_time
          ? new Date(event.scheduled_end_time)
          : null,
        url: `https://discord.com/events/${kfcGuildId}/${event.id}`,
      });
    }
    const calendar = sourceState.messages.calendar,
      route = `/channels/${calendar.channelId}/messages/${calendar.messageId}`;
    const current = messageSchema.parse(await request(route));
    if (
      current.id !== calendar.messageId ||
      current.channel_id !== calendar.channelId ||
      current.author.id !== kfcApplicationId
    )
      throw new Error("Calendar identity mismatch; not edited or recreated.");
    const content = kfcCalendarContent(entries, new Date());
    if (current.content === content && (current.flags & 4) !== 0) return;
    if (!values.apply) {
      console.log(JSON.stringify({ calendarPreview: content }));
      return;
    }
    await log({
      operation: "calendar",
      status: "pending",
      before: current,
      content,
    });
    await request(
      route,
      "PATCH",
      { content, embeds: [], flags: 4, allowed_mentions: { parse: [] } },
      async (): Promise<void> => {
        if (
          !isDeepStrictEqual(messageSchema.parse(await request(route)), current)
        )
          throw new Error("Calendar changed while waiting.");
      },
    );
    const after = messageSchema.parse(await request(route));
    if (after.content !== content || (after.flags & 4) === 0)
      throw new Error("Calendar read-back failed.");
    await log({
      operation: "calendar",
      status: "verified",
      messageId: calendar.messageId,
    });
    console.log(
      "Updated the existing calendar resource; no new message or ping.",
    );
  }
  try {
    do {
      try {
        await cycle();
      } catch (error: unknown) {
        if (!values.watch) throw error;
        console.error(
          error instanceof DiscordAuditError
            ? error.message
            : "KFC maintenance deferred; review permissions and private journal.",
        );
      }
      if (!values.watch || stopped) break;
      for (
        let seconds = 0;
        seconds < watchIntervalSeconds && !stopped;
        seconds++
      )
        await new Promise<void>((resolve): void => {
          setTimeout(resolve, 1000);
        });
    } while (!stopped);
  } finally {
    await journal?.close();
    if (lock) {
      await lock.close();
      await unlink(lockPath);
    }
  }
}
main()
  .catch((error: unknown): void => {
    console.error(
      error instanceof Error ? error.message : "KFC event maintenance failed.",
    );
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await db.$disconnect();
  });
