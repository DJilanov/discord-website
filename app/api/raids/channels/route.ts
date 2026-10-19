import { requireMember } from "@/lib/member-auth";
import { requireRaidPilot } from "@/lib/raids/config";
import { raidApi } from "@/lib/raids/api";
import { discoverRaidChannels } from "@/lib/raids/discord-channels";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(): Promise<Response> {
  return raidApi(async () => {
    const member = await requireMember();
    requireRaidPilot(member.discordId);
    await rateLimit(`raids:channels:${member.id}`, 30, 60);
    return discoverRaidChannels(member.discordId);
  });
}
