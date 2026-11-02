import path from "node:path";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { kfcApplicationId, kfcGuildId } from "../../content/kfc-community";
import { auditChannelSchema, auditRoleSchema } from "../discord-audit";
import { editions } from "./contracts";
import { syncAlertSubscriptions, deliverDigests } from "./alerts";
import { deliverSession, updateOwnedMessage } from "./delivery";
import { hubPanel, schedulePanel } from "./presentation";
import { managedSessions, externalSessions } from "./sources";
import { RaidingStore } from "./storage";
import { raidingClient } from "./transport";
import { syncManagedNativeEvents } from "./native-events";
import { managedThreadSchema, syncManagedThread } from "./managed-threads";

export async function syncKfcRaiding(
  database: Pick<PrismaClient, "foreverRaidEvent">,
  apply: boolean,
  now = new Date(),
  root = path.join(process.cwd(), ".data/kfc-raiding"),
): Promise<void> {
  const store = new RaidingStore(root);
  const config = await store.config();
  if (!config) return;
  await store.initialize();
  const release = await store.lock();
  try {
    const state = await store.state();
    const client = raidingClient(
      config,
      process.env.KFCBOT_TOKEN || process.env.DISCORD_BOT_TOKEN || "",
    );
    try {
      const identity = z
        .object({ id: z.literal(kfcApplicationId), bot: z.literal(true) })
        .parse(await client.request("/users/@me"));
      if (!identity.bot) throw new Error("Unexpected raiding bot identity.");
      const reads = await Promise.allSettled([
        client.request(`/guilds/${kfcGuildId}/channels`),
        client.request(`/guilds/${kfcGuildId}/roles`),
        client.request(`/guilds/${kfcGuildId}/scheduled-events`),
        managedSessions(database, config, now),
      ] as const);
      for (const result of reads)
        if (result.status === "rejected") throw result.reason;
      if (
        reads[0].status !== "fulfilled" ||
        reads[1].status !== "fulfilled" ||
        reads[2].status !== "fulfilled" ||
        reads[3].status !== "fulfilled"
      )
        throw new Error("Raiding sources unavailable.");
      const channels = z.array(auditChannelSchema).parse(reads[0].value);
      const roles = z.array(auditRoleSchema).parse(reads[1].value);
      for (const game of editions) {
        const space = config.spaces[game];
        const role = roles.find(
          (entry): boolean => entry.id === space.alertRoleId,
        );
        if (
          !role ||
          role.managed ||
          role.permissions !== "0" ||
          role.mentionable
        )
          throw new Error(
            "Raid alert role must be unprivileged and not publicly mentionable.",
          );
        const schedule = channels.find(
          (entry): boolean => entry.id === space.schedule.channelId,
        );
        const forum = channels.find(
          (entry): boolean => entry.id === space.forumId,
        );
        if (
          schedule?.type !== 0 ||
          schedule.parent_id !== space.categoryId ||
          forum?.type !== 15 ||
          forum.parent_id !== space.categoryId
        )
          throw new Error(
            "Raiding space moved or changed type; review its binding.",
          );
      }
      const managed = reads[3].value;
      for (const session of managed) {
        if (
          session.sourceGuildId !== kfcGuildId ||
          session.eventType !== "raid"
        )
          continue;
        client.allowChannel(session.sourceChannelId);
        const source = managedThreadSchema.safeParse(
          await client.request(`/channels/${session.sourceChannelId}`),
        );
        if (
          source.success &&
          source.data.parent_id === config.spaces[session.game].forumId
        ) {
          session.sourceForumId = source.data.parent_id;
          if (apply)
            await syncManagedThread(
              session,
              source.data,
              config,
              state,
              store,
              client,
              now,
            );
        }
      }
      const external = await externalSessions(
        config,
        client,
        { channels, roles },
        reads[2].value,
        now,
      );
      const sourceIds = new Set(
        managed.map((session): string => session.sourceMessageId),
      );
      const sessions = [
        ...managed,
        ...external.filter(
          (session): boolean => !sourceIds.has(session.sourceMessageId),
        ),
      ];
      if (!apply) {
        console.log(
          JSON.stringify({
            raidingPreview: sessions.map(
              ({ key, game, title, startsAt, source }): object => ({
                key,
                game,
                title,
                startsAt,
                source,
              }),
            ),
            newRaidPosts: sessions.filter(
              (session): boolean =>
                session.eventType === "raid" && !state.posts[session.key],
            ).length,
          }),
        );
        return;
      }
      const problems: string[] = [];
      for (const session of sessions.filter(
        (entry): boolean =>
          entry.eventType === "raid" &&
          entry.sourceForumId !== config.spaces[entry.game].forumId,
      )) {
        try {
          await deliverSession(session, config, state, store, client, now);
        } catch (error: unknown) {
          problems.push(session.key);
          await store.journal({
            operation: "session-held",
            key: session.key,
            reason:
              error instanceof Error
                ? error.message
                : "Unknown delivery failure",
          });
        }
      }
      // Five-minute display precision avoids editing both boards every polling cycle.
      const verified = new Date(Math.floor(now.getTime() / 300000) * 300000);
      for (const game of editions) {
        const target = config.spaces[game].schedule;
        await updateOwnedMessage(
          `schedule:${game}`,
          target.channelId,
          target.messageId,
          schedulePanel(
            game,
            sessions,
            config,
            now,
            verified,
            false,
            state.posts,
          ),
          state,
          store,
          client,
        );
        await syncAlertSubscriptions(game, config, state, store, client);
      }
      await updateOwnedMessage(
        "hub",
        config.hub.channelId,
        config.hub.messageId,
        hubPanel(config),
        state,
        store,
        client,
      );
      await deliverDigests(sessions, config, state, store, client, now);
      await syncManagedNativeEvents(
        sessions,
        config,
        state,
        store,
        client,
        now,
        reads[2].value,
      );
      state.lastSuccessAt = now.toISOString();
      state.cachedSessions = sessions;
      await store.save(state);
      if (problems.length)
        console.error(
          `Held ${problems.length} raid post(s); schedule links remain available. Inspect the private raiding journal.`,
        );
    } catch (error: unknown) {
      if (apply && state.lastSuccessAt) {
        for (const game of editions) {
          try {
            const target = config.spaces[game].schedule;
            await updateOwnedMessage(
              `schedule:${game}`,
              target.channelId,
              target.messageId,
              schedulePanel(
                game,
                state.cachedSessions,
                config,
                now,
                new Date(state.lastSuccessAt),
                true,
                state.posts,
              ),
              state,
              store,
              client,
            );
          } catch (staleError: unknown) {
            await store.journal({
              operation: "stale-panel-held",
              game,
              reason:
                staleError instanceof Error
                  ? staleError.message
                  : "Unknown panel failure",
            });
          }
        }
      }
      throw error;
    }
  } finally {
    await release();
  }
}
