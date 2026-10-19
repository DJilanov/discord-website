import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  kfcApplicationId,
  kfcGuildId,
  kfcManagementRoleId,
  kfcClasses,
  kfcCombatRoles,
  scheduledEventBindings,
} from "../content/kfc-community";
import {
  auditCredentialsSchema,
  channelPermissions,
  guildPermissions,
  hasDiscordPermission,
  type AuditCredentials,
  type DiscordAuditSnapshot,
} from "./discord-audit";
import { DiscordAuditError } from "./discord-audit-client";
import type {
  ExperienceChannel,
  ExperiencePatch,
} from "./discord-channel-experience";

export const kfcWriteMask =
  (1n << 11n) | (1n << 35n) | (1n << 36n) | (1n << 38n);
const viewHistory = (1n << 10n) | (1n << 16n);
const staffMask = (1n << 3n) | (1n << 5n) | (1n << 40n);

export function assertKfcScope(snapshot: DiscordAuditSnapshot): void {
  if (
    snapshot.guild.id !== kfcGuildId ||
    snapshot.application.id !== kfcApplicationId ||
    snapshot.bot.id !== kfcApplicationId
  )
    throw new DiscordAuditError("KFC migration identity mismatch.");
}

export function kfcMovePatch(
  channel: ExperienceChannel,
  destination: ExperienceChannel,
  snapshot: DiscordAuditSnapshot,
): ExperiencePatch {
  assertKfcScope(snapshot);
  if (
    channel.guild_id !== kfcGuildId ||
    destination.guild_id !== kfcGuildId ||
    ![0, 15].includes(channel.type) ||
    destination.type !== 4
  )
    throw new DiscordAuditError("Invalid KFC group-channel move.");
  const source = channel.parent_id
    ? snapshot.channels.find((c): boolean => c.id === channel.parent_id)
    : null;
  if (channel.parent_id && !source)
    throw new DiscordAuditError("Source category is unavailable.");
  const base = guildPermissions(
    snapshot.roles,
    kfcGuildId,
    snapshot.botRoleIds,
  );
  for (const target of [channel, destination, ...(source ? [source] : [])])
    if (
      !hasDiscordPermission(
        channelPermissions(
          base,
          target,
          kfcGuildId,
          snapshot.botRoleIds,
          snapshot.bot.id,
        ),
        (1n << 10n) | (1n << 4n),
      )
    )
      throw new DiscordAuditError("Category move permissions are missing.");
  return { parent_id: destination.id };
}

export function kfcOverwrites(
  channel: ExperienceChannel,
  snapshot: DiscordAuditSnapshot,
  mode: "read-only" | "chat" | "archive" | "maintained",
): ExperienceChannel["permission_overwrites"] {
  assertKfcScope(snapshot);
  const trusted = new Set(
    snapshot.roles
      .filter(
        (r): boolean =>
          r.id !== kfcGuildId &&
          (r.id === kfcManagementRoleId ||
            (BigInt(r.permissions) & staffMask) !== 0n),
      )
      .map((r): string => r.id),
  );
  const entries = channel.permission_overwrites.map(
    (entry): ExperienceChannel["permission_overwrites"][number] => ({
      ...entry,
    }),
  );
  if (
    !entries.some(
      (entry): boolean => entry.id === kfcGuildId && entry.type === 0,
    )
  )
    entries.push({ id: kfcGuildId, type: 0, allow: "0", deny: "0" });
  const result = entries.map(
    (entry): ExperienceChannel["permission_overwrites"][number] => {
      if (
        (entry.type === 0 && trusted.has(entry.id)) ||
        (entry.type === 1 && entry.id === snapshot.bot.id)
      )
        return entry;
      let allow = BigInt(entry.allow),
        deny = BigInt(entry.deny);
      if (mode !== "chat") {
        allow &= ~kfcWriteMask;
        deny |= kfcWriteMask;
      }
      if (
        (mode === "read-only" || mode === "chat") &&
        entry.id === kfcGuildId
      ) {
        allow |= viewHistory;
        deny &= ~viewHistory;
        if (mode === "chat") {
          allow |= kfcWriteMask;
          deny &= ~kfcWriteMask;
        }
      }
      return { ...entry, allow: allow.toString(), deny: deny.toString() };
    },
  );
  // Explicit maintenance grants do not alter any ordinary member's visibility.
  if (mode === "read-only" || mode === "maintained") {
    for (const [id, type] of [
      [kfcManagementRoleId, 0],
      ["1411544512949391546", 0],
      [snapshot.bot.id, 1],
    ] as const) {
      const existing = result.find(
        (entry): boolean => entry.id === id && entry.type === type,
      );
      const allow =
        mode === "maintained" ? kfcWriteMask : viewHistory | kfcWriteMask;
      if (existing) {
        existing.allow = (BigInt(existing.allow) | allow).toString();
        existing.deny = (BigInt(existing.deny) & ~allow).toString();
      } else result.push({ id, type, allow: allow.toString(), deny: "0" });
    }
  }
  return result;
}

export function assertKfcArchiveVisibility(
  before: ExperienceChannel,
  after: ExperienceChannel,
  snapshot: DiscordAuditSnapshot,
): void {
  const profiles = [
    [],
    ...snapshot.roles
      .filter((r): boolean => r.id !== kfcGuildId)
      .map((r): string[] => [r.id]),
  ];
  for (const roles of profiles) {
    const base = guildPermissions(snapshot.roles, kfcGuildId, roles);
    const oldView = hasDiscordPermission(
      channelPermissions(base, before, kfcGuildId, roles),
      1n << 10n,
    );
    const newView = hasDiscordPermission(
      channelPermissions(base, after, kfcGuildId, roles),
      1n << 10n,
    );
    if (oldView !== newView && !roles.includes(kfcManagementRoleId))
      throw new DiscordAuditError(
        "Archive visibility changed; stop and restore its recorded overwrites.",
      );
  }
  for (const overwrite of before.permission_overwrites.filter(
    (o): boolean => o.type === 1 && o.id !== snapshot.bot.id,
  )) {
    if (
      (BigInt(overwrite.allow) & (1n << 10n)) !==
      (BigInt(
        after.permission_overwrites.find(
          (o): boolean => o.id === overwrite.id && o.type === 1,
        )?.allow ?? "0",
      ) &
        (1n << 10n))
    )
      throw new DiscordAuditError("Archive member visibility changed.");
  }
}

interface KfcOption {
  id: string;
  title: string;
  description: string;
  channel_ids: string[];
  role_ids: string[];
}
interface KfcPrompt {
  id: string;
  type: 0 | 1;
  title: string;
  single_select: false;
  required: boolean;
  in_onboarding: boolean;
  options: KfcOption[];
}
export interface KfcOnboarding {
  enabled: boolean;
  mode: 0;
  default_channel_ids: string[];
  prompts: KfcPrompt[];
}
export function kfcOnboarding(
  snapshot: DiscordAuditSnapshot,
  channels: Record<string, string>,
  shamanId: string,
): KfcOnboarding {
  assertKfcScope(snapshot);
  const defaults = [
    "1411545639392645192",
    channels.calendar,
    "1412553351874215976",
    channels.introductions,
    channels.help,
    channels.raidChat,
    channels.lfg,
  ];
  if (new Set(defaults).size !== 7)
    throw new DiscordAuditError(
      "Exactly seven distinct onboarding destinations are required.",
    );
  let writable = 0;
  const base = guildPermissions(snapshot.roles, kfcGuildId, []);
  for (const id of defaults) {
    const channel = snapshot.channels.find((c): boolean => c.id === id);
    if (!channel || channel.type !== 0)
      throw new DiscordAuditError("Missing text-channel default.");
    const permissions = channelPermissions(base, channel, kfcGuildId, []);
    if (!hasDiscordPermission(permissions, viewHistory))
      throw new DiscordAuditError(
        "Onboarding destination is not readable by a new member.",
      );
    if (hasDiscordPermission(permissions, 1n << 11n)) writable++;
  }
  if (writable < 5)
    throw new DiscordAuditError(
      "Five default channels must allow everyone to send messages.",
    );
  const top = Math.max(
    ...snapshot.roles
      .filter((r): boolean => snapshot.botRoleIds.includes(r.id))
      .map((r): number => r.position),
  );
  const option = (
    n: number,
    title: string,
    description: string,
    channel_ids: string[] = [],
    role_ids: string[] = [],
  ): KfcOption => {
    for (const id of role_ids) {
      const role = snapshot.roles.find((r): boolean => r.id === id);
      if (
        !role ||
        role.managed ||
        role.permissions !== "0" ||
        role.position >= top
      )
        throw new DiscordAuditError(
          "An onboarding role is privileged, managed or above the bot.",
        );
    }
    for (const id of channel_ids) {
      const channel = snapshot.channels.find((c): boolean => c.id === id);
      if (
        !channel ||
        !hasDiscordPermission(
          channelPermissions(base, channel, kfcGuildId, []),
          1n << 10n,
        )
      )
        throw new DiscordAuditError(
          "An interest destination is hidden from newcomers.",
        );
    }
    return {
      id: (1554796912673170000n + BigInt(n)).toString(),
      title,
      description,
      channel_ids,
      role_ids,
    };
  };
  return {
    enabled: true,
    mode: 0,
    default_channel_ids: defaults,
    prompts: [
      {
        id: "1554796912673170001",
        type: 0,
        title: "What brings you here?",
        single_select: false,
        required: true,
        in_onboarding: true,
        options: [
          option(10, "TBC raids", "Find a run and prepare for it.", [
            "1460899582824153140",
            "1411592694404218991",
          ]),
          option(11, "WoW Forever", "Meet the guild's Forever players.", [
            "1548519535177629707",
            "1548747530790248610",
            "1550970060812587028",
          ]),
          option(12, "TBC PvP", "Find TBC arena and battleground teammates.", [
            channels.pvp,
            "1463110825790148639",
            "1463605381342429195",
          ]),
          option(
            14,
            "Forever PvP",
            "Find Forever battleground and world PvP groups.",
            [channels.pvp, "1548519535177629707"],
          ),
          option(
            13,
            "Friends / still deciding",
            "Browse, chat or ask a question.",
            ["1412553351874215976"],
          ),
        ],
      },
      {
        id: "1554796912673170002",
        type: 1,
        title: "Which classes do you play?",
        single_select: false,
        required: false,
        in_onboarding: false,
        options: [...kfcClasses, ["Shaman", shamanId] as const].map(
          ([name, id], index): KfcOption =>
            option(
              30 + index,
              name,
              "Optional class interest; no staff or raid-seat privileges.",
              [],
              [id],
            ),
        ),
      },
      {
        id: "1554796912673170003",
        type: 0,
        title: "Which roles do you enjoy playing?",
        single_select: false,
        required: false,
        in_onboarding: false,
        options: kfcCombatRoles.map(([name, id], index): KfcOption =>
          option(
            50 + index,
            name,
            "Choose your actual class/spec on each event signup.",
            [],
            [id],
          ),
        ),
      },
    ],
  };
}

export function kfcOnboardingMatches(
  actual: DiscordAuditSnapshot["onboarding"],
  wanted: KfcOnboarding,
): boolean {
  if (actual.status !== "available") return false;
  const { data } = actual;
  return (
    data.enabled === wanted.enabled &&
    data.mode === wanted.mode &&
    isDeepStrictEqual(
      [...data.default_channel_ids].sort(),
      [...wanted.default_channel_ids].sort(),
    ) &&
    data.prompts.length === wanted.prompts.length &&
    wanted.prompts.every((p): boolean => {
      const current = data.prompts.find((x): boolean => x.title === p.title);
      return Boolean(
        current &&
        current.required === p.required &&
        current.single_select === p.single_select &&
        current.in_onboarding === p.in_onboarding &&
        current.options.length === p.options.length &&
        p.options.every((o): boolean =>
          current.options.some(
            (x): boolean =>
              x.title === o.title &&
              (x.description ?? "") === o.description &&
              isDeepStrictEqual(
                [...x.role_ids].sort(),
                [...o.role_ids].sort(),
              ) &&
              isDeepStrictEqual(
                [...x.channel_ids].sort(),
                [...o.channel_ids].sort(),
              ),
          ),
        ),
      );
    })
  );
}

export async function kfcRequest(
  credentials: AuditCredentials,
  route: string,
  method: "GET" | "POST" | "PUT" | "PATCH",
  body: unknown,
  options: {
    channelIds: ReadonlySet<string>;
    transport?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    recheck?: () => Promise<void>;
  },
): Promise<unknown> {
  const parsed = auditCredentialsSchema.parse(credentials);
  if (
    parsed.guildId !== kfcGuildId ||
    parsed.applicationId !== kfcApplicationId
  )
    throw new DiscordAuditError(
      "KFC operator credentials do not match the approved server/application.",
    );
  const guildRoute =
    route === `/guilds/${kfcGuildId}` ||
    route === `/guilds/${kfcGuildId}/channels` ||
    route === `/guilds/${kfcGuildId}/onboarding` ||
    route === `/guilds/${kfcGuildId}/roles` ||
    route === `/guilds/${kfcGuildId}/auto-moderation/rules` ||
    route === `/guilds/${kfcGuildId}/scheduled-events` ||
    scheduledEventBindings.some((binding): boolean =>
      binding.projections.some(
        (projection): boolean =>
          projection.guildId === kfcGuildId &&
          route ===
            `/guilds/${kfcGuildId}/scheduled-events/${projection.scheduledId}`,
      ),
    );
  const match =
    /^\/channels\/([1-9]\d{16,19})(?:\/(?:messages(?:\/(?:pins\/)?[1-9]\d{16,19})?|threads))?$/.exec(
      route,
    );
  if (!guildRoute && !(match && options.channelIds.has(match[1])))
    throw new DiscordAuditError("Unapproved KFC operator route.");
  const compatible =
    method === "GET" ||
    (Boolean(match) && route.endsWith("/threads") && method === "POST") ||
    (route === `/guilds/${kfcGuildId}/channels` && method === "PATCH") ||
    (route === `/guilds/${kfcGuildId}` && method === "PATCH") ||
    (route === `/guilds/${kfcGuildId}/onboarding` && method === "PUT") ||
    (Boolean(match) && route.includes("/messages/pins/") && method === "PUT") ||
    (scheduledEventBindings.some((binding): boolean =>
      binding.projections.some(
        (projection): boolean =>
          projection.guildId === kfcGuildId &&
          route ===
            `/guilds/${kfcGuildId}/scheduled-events/${projection.scheduledId}`,
      ),
    ) &&
      method === "PATCH") ||
    ([
      `/guilds/${kfcGuildId}/channels`,
      `/guilds/${kfcGuildId}/roles`,
      `/guilds/${kfcGuildId}/auto-moderation/rules`,
    ].includes(route) &&
      method === "POST") ||
    (Boolean(match) &&
      (route.includes("/messages/")
        ? method === "PATCH"
        : route.endsWith("/messages")
          ? method === "POST"
          : method === "PATCH"));
  if (!compatible)
    throw new DiscordAuditError("Unapproved KFC operator method.");
  if (route === `/guilds/${kfcGuildId}/channels` && method === "PATCH") {
    const positions = z
      .array(
        z
          .object({ id: z.string(), position: z.number().int().nonnegative() })
          .strict(),
      )
      .min(1)
      .safeParse(body);
    if (
      !positions.success ||
      new Set(positions.data.map((entry): string => entry.id)).size !==
        positions.data.length ||
      positions.data.some((entry): boolean => !options.channelIds.has(entry.id))
    )
      throw new DiscordAuditError(
        "Only scoped channel positions may be changed; permission syncing is forbidden.",
      );
  }
  if (route.endsWith("/roles") && method !== "GET" && method !== "POST")
    throw new DiscordAuditError(
      "Existing roles cannot be edited by this migration.",
    );
  const sleep =
    options.sleep ??
    ((ms: number): Promise<void> =>
      new Promise((resolve): void => {
        setTimeout(resolve, ms);
      }));
  for (let attempt = 0; ; attempt++) {
    await options.recheck?.();
    let response: Response;
    try {
      response = await (options.transport ?? fetch)(
        `https://discord.com/api/v10${route}`,
        {
          method,
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: {
            Authorization: `Bot ${parsed.token}`,
            "Content-Type": "application/json",
            "User-Agent":
              "DiscordBot (https://www.wowforeverdiscord.online, 0.1.0)",
            ...(method !== "GET"
              ? {
                  "X-Audit-Log-Reason":
                    "Owner-approved KFC community onboarding migration",
                }
              : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
    } catch {
      throw new DiscordAuditError(
        "KFC request outcome uncertain; inspect the private recovery journal before retrying a creation.",
      );
    }
    if (response.status === 429) {
      const retry = z
        .object({ retry_after: z.number().finite().nonnegative().max(30) })
        .safeParse(await response.json().catch((): null => null));
      if (attempt >= 2 || !retry.success)
        throw new DiscordAuditError(
          "KFC migration rate-limited; retry later with the same state.",
          429,
        );
      await sleep(Math.ceil(retry.data.retry_after * 1000) + 100);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new DiscordAuditError(
        `KFC operation failed (HTTP ${response.status}); upstream body suppressed.`,
        response.status,
      );
    }
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      throw new DiscordAuditError(
        "Unreadable KFC operation result; reconcile the journal before retrying.",
      );
    }
  }
}
