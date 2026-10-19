import { z } from "zod";
import type { ServerMembership } from "@/lib/member-auth-options";

const memberSchema = z.object({
  user: z.object({ id: z.string(), bot: z.boolean().optional() }),
});

export async function checkServerMembership(
  discordId: string,
  guildId: string,
  botToken: string,
  request: typeof fetch = fetch,
): Promise<ServerMembership> {
  if (
    !/^\d{17,20}$/.test(discordId) ||
    !/^\d{17,20}$/.test(guildId) ||
    !botToken
  )
    return "unavailable";
  try {
    const response = await request(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(3000),
      },
    );
    if (response.status === 404) {
      const error: unknown = await response.json();
      return z.object({ code: z.literal(10007) }).safeParse(error).success
        ? "not_member"
        : "unavailable";
    }
    if (!response.ok) return "unavailable";
    const member = memberSchema.safeParse(await response.json());
    if (
      !member.success ||
      member.data.user.id !== discordId ||
      member.data.user.bot
    )
      return "unavailable";
    return "member";
  } catch {
    // Network failures are not evidence that someone left the server.
    return "unavailable";
  }
}

export async function checkAnyServerMembership(
  discordId: string,
  guildIds: readonly string[],
  botToken: string,
  request: typeof fetch = fetch,
): Promise<ServerMembership> {
  if (
    guildIds.length === 0 ||
    guildIds.length > 5 ||
    guildIds.some((guildId) => !/^\d{17,20}$/.test(guildId))
  )
    return "unavailable";
  const memberships = await Promise.all(
    [...new Set(guildIds)].map((guildId) =>
      checkServerMembership(discordId, guildId, botToken, request),
    ),
  );
  if (memberships.includes("member")) return "member";
  return memberships.includes("unavailable") ? "unavailable" : "not_member";
}
