import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { resolveDiscordInvite } from "@/lib/discord";

export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const settings = await getSettings();
  const selected = await resolveDiscordInvite(
    settings.discordInvite,
    settings.backupInvite,
  );
  const target =
    selected?.invite ??
    new URL("/discord?invite=unavailable#invite", request.url).toString();
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
