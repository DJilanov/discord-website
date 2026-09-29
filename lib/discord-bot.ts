import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";
import { HttpError, rateLimit } from "@/lib/security";

export function verifyDiscordSignature(
  raw: string,
  signature: string,
  timestamp: string,
  publicKey: string,
): boolean {
  if (
    !/^[a-f0-9]{128}$/i.test(signature) ||
    !/^[a-f0-9]{64}$/i.test(publicKey) ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
  )
    return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(timestamp + raw),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

const interactionSchema = z.object({
  type: z.number(),
  id: z.string().optional(),
  application_id: z.string().optional(),
  guild_id: z.string().optional(),
  member: z.object({ user: z.object({ id: z.string() }) }).optional(),
  data: z
    .object({
      name: z.string(),
      options: z
        .array(
          z.object({
            name: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
          }),
        )
        .optional(),
    })
    .optional(),
});
export async function handleInteraction(raw: unknown): Promise<object> {
  const interaction = interactionSchema.parse(raw);
  if (interaction.type === 1) return { type: 1 };
  if (interaction.type !== 2 || !interaction.id || !interaction.data)
    throw new HttpError(400, "Unsupported interaction.");
  if (
    interaction.application_id !== process.env.DISCORD_APPLICATION_ID ||
    interaction.guild_id !== process.env.DISCORD_GUILD_ID
  )
    throw new HttpError(403, "This interaction belongs to a different server.");
  await rateLimit(`discord-interaction:${interaction.id}`, 1, 600);
  const options = Object.fromEntries(
    (interaction.data.options || []).map((option) => [
      option.name,
      String(option.value),
    ]),
  );
  let content: string;
  switch (interaction.data.name) {
    case "report":
      content = `Submit a private report with evidence: ${SITE_URL}/reports/new\nPlease keep accusations and screenshots out of public channels.`;
      break;
    case "appeal":
      content = `Appeal a decision: ${SITE_URL}/appeals\nUse the FG reference on the alert. Pending appeals suspend public distribution.`;
      break;
    case "guild":
      content = `Find a guild: ${SITE_URL}/guild-recruitment\nList your guild: ${SITE_URL}/guild-recruitment/new`;
      break;
    case "lfg":
    case "events":
      content = `Find a group or event: ${SITE_URL}/lfg\nPost a session: ${SITE_URL}/lfg/new`;
      break;
    case "check": {
      const parsed = z
        .object({
          character: z.string().min(2).max(120),
          realm: z.string().min(2).max(120),
          region: z.enum(["EU", "NA", "OCE"]),
        })
        .parse(options);
      const alerts = await db.foreverSafetyAlert.findMany({
        where: {
          character: { equals: parsed.character, mode: "insensitive" },
          realm: { equals: parsed.realm, mode: "insensitive" },
          region: parsed.region,
          active: true,
          appealStatus: { not: "pending" },
          expiresAt: { gt: new Date() },
        },
        select: { publicId: true, severity: true, summary: true },
        take: 5,
      });
      content = alerts.length
        ? alerts
            .map(
              (alert) =>
                `${alert.publicId} / level ${alert.severity}: ${alert.summary}`,
            )
            .join("\n") +
          `\nCurrent context and appeals: ${SITE_URL}/transparency`
        : "No current reviewed alert matches that exact region, character, and realm. This is not a guarantee of conduct.";
      break;
    }
    case "role": {
      const selection = z
        .enum(["EU", "NA", "ALLIANCE", "HORDE", "PVE", "PVP", "RP"])
        .parse(options.role);
      const roleId = process.env[`DISCORD_ROLE_${selection}`],
        userId = interaction.member?.user.id;
      if (
        !roleId ||
        !/^\d+$/.test(roleId) ||
        !userId ||
        !process.env.DISCORD_BOT_TOKEN
      ) {
        content =
          "This role has not been connected by staff yet. Please use the server's onboarding roles.";
        break;
      }
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}/roles/${roleId}`,
        {
          method: "PUT",
          headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          signal: AbortSignal.timeout(1800),
        },
      );
      content = response.ok
        ? `${selection} role added.`
        : "Discord could not assign the role. Please ask a moderator to check the role hierarchy.";
      break;
    }
    default:
      content = `WoW Forever Discord\nGuilds: ${SITE_URL}/guild-recruitment\nGroups: ${SITE_URL}/lfg\nRules: ${SITE_URL}/rules\nPrivate reports: ${SITE_URL}/reports\nAddon: ${SITE_URL}/addons/foreverguard`;
  }
  return {
    type: 4,
    data: {
      content: content.slice(0, 1950),
      flags: 64,
      allowed_mentions: { parse: [] },
    },
  };
}
