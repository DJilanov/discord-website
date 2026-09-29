import { z } from "zod";
import { isDiscordInvite } from "@/lib/validation";

const previewSchema = z.object({
  guild: z.object({ name: z.string(), id: z.string() }),
  approximate_member_count: z.number().int().nonnegative().optional(),
  approximate_presence_count: z.number().int().nonnegative().optional(),
});
export interface DiscordPreview {
  name: string;
  serverId: string | null;
  members: number | null;
  online: number | null;
  valid: boolean | null;
}
function emptyPreview(valid: boolean | null): DiscordPreview {
  return {
    name: "WoW Forever Discord",
    serverId: null,
    members: null,
    online: null,
    valid,
  };
}
export async function getDiscordPreview(
  invite: string,
): Promise<DiscordPreview | null> {
  if (!invite) return null;
  if (!isDiscordInvite(invite)) return emptyPreview(false);
  const code = new URL(invite).pathname.split("/").filter(Boolean).at(-1);
  try {
    const response = await fetch(
      `https://discord.com/api/v10/invites/${encodeURIComponent(code || "")}?with_counts=true`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) },
    );
    if (response.status === 404) return emptyPreview(false);
    if (!response.ok) return emptyPreview(null);
    const parsed = previewSchema.safeParse(await response.json());
    if (!parsed.success) return emptyPreview(null);
    return {
      name: parsed.data.guild.name,
      serverId: parsed.data.guild.id,
      members: parsed.data.approximate_member_count ?? null,
      online: parsed.data.approximate_presence_count ?? null,
      valid: true,
    };
  } catch {
    // An upstream failure cannot establish that an invitation has expired.
    return emptyPreview(null);
  }
}

export interface SelectedInvite {
  invite: string;
  preview: DiscordPreview;
  usedBackup: boolean;
}

export async function resolveDiscordInvite(
  primary: string,
  backup: string,
  lookup: (
    invite: string,
  ) => Promise<DiscordPreview | null> = getDiscordPreview,
): Promise<SelectedInvite | null> {
  for (const [invite, usedBackup] of [
    [primary, false],
    [backup, true],
  ] as const) {
    if (!invite || !isDiscordInvite(invite)) continue;
    const preview = (await lookup(invite)) ?? emptyPreview(null);
    if (preview.valid !== false) return { invite, preview, usedBackup };
  }
  return null;
}
