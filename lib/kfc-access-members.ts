import { z } from "zod";
import {
  kfcAccessIds,
  kfcPrivateGuildIds,
  kfcPrivateStaffIds,
} from "../content/kfc-access";
import { kfcGuildId } from "../content/kfc-community";
import { discordId, type DiscordAuditSnapshot } from "./discord-audit";
import {
  publishingKfcAccessMember,
  trustedKfcAccessMember,
  type KfcAccessBindings,
} from "./kfc-access";
import { RaidingStore } from "./kfc-raiding/storage";
import { raidingClient } from "./kfc-raiding/transport";

export async function kfcAccessMemberBindings(
  snapshot: DiscordAuditSnapshot,
  token: string,
): Promise<KfcAccessBindings> {
  const raiding = await new RaidingStore(".data/kfc-raiding").config();
  if (!raiding) throw new Error("Existing KFC bindings are required.");
  const client = raidingClient(raiding, token);
  const privateIds = new Set(
    snapshot.channels
      .filter(
        (channel) =>
          channel.parent_id === kfcAccessIds.guildCategory ||
          channel.parent_id === kfcAccessIds.staffCategory ||
          channel.id === kfcAccessIds.guildCategory ||
          channel.id === kfcAccessIds.staffCategory ||
          kfcPrivateGuildIds.includes(channel.id) ||
          kfcPrivateStaffIds.includes(channel.id),
      )
      .map((channel) => channel.id),
  );
  const ids = new Set(
    snapshot.channels
      .filter((channel) => privateIds.has(channel.id))
      .flatMap((channel) =>
        channel.permission_overwrites
          .filter(
            (entry) =>
              entry.type === 1 && (BigInt(entry.allow) & (1n << 10n)) !== 0n,
          )
          .map((entry) => entry.id),
      ),
  );
  const trustedMemberIds: string[] = [];
  const publishingMemberIds: string[] = [];
  const roleBoundMemberIds: string[] = [];
  for (const id of ids) {
    client.allowSubscriber(id);
    const member = z
      .object({
        user: z.object({ id: z.literal(id), bot: z.boolean().optional() }),
        roles: z.array(discordId),
      })
      .parse(await client.request(`/guilds/${kfcGuildId}/members/${id}`));
    if (
      !trustedKfcAccessMember(snapshot, {
        bot: member.user.bot ?? false,
        roles: member.roles,
      })
    )
      throw new Error(`Private member exception needs review: ${id}`);
    if (
      publishingKfcAccessMember(snapshot, {
        bot: member.user.bot ?? false,
        roles: member.roles,
      })
    ) {
      trustedMemberIds.push(id);
      publishingMemberIds.push(id);
    } else {
      roleBoundMemberIds.push(id);
    }
  }
  return { trustedMemberIds, publishingMemberIds, roleBoundMemberIds };
}
