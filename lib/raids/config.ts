import { HttpError } from "@/lib/security";

const fallbackKfcDiscordInvite = "https://discord.gg/WGv4APs9DY";

export function kfcDiscordInviteUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = environment.KFC_DISCORD_INVITE_URL?.trim();
  if (!value) return fallbackKfcDiscordInvite;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const validHost =
      host === "discord.gg" ||
      host === "www.discord.gg" ||
      host === "discord.com" ||
      host === "www.discord.com";
    const validPath =
      (host.endsWith("discord.gg") && url.pathname.length > 1) ||
      (host.endsWith("discord.com") && url.pathname.startsWith("/invite/"));
    return url.protocol === "https:" && validHost && validPath
      ? url.toString()
      : fallbackKfcDiscordInvite;
  } catch {
    return fallbackKfcDiscordInvite;
  }
}

export function pilotDiscordIds(): string[] {
  const ids = (process.env.FOREVER_RAIDS_PILOT_DISCORD_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return ids.length <= 100 && ids.every((id) => /^\d{17,20}$/.test(id))
    ? [...new Set(ids)]
    : [];
}
export function raidsEnabled(): boolean {
  return (
    process.env.FOREVER_RAIDS_ENABLED === "true" &&
    (memberBetaEnabled() ||
      ((!process.env.FOREVER_RAIDS_ACCESS_MODE ||
        process.env.FOREVER_RAIDS_ACCESS_MODE === "pilot") &&
        pilotDiscordIds().length > 0))
  );
}
export function memberBetaEnabled(): boolean {
  return process.env.FOREVER_RAIDS_ACCESS_MODE === "members";
}
export function raidAccountAllowed(discordId: string): boolean {
  return (
    /^\d{17,20}$/.test(discordId) &&
    (memberBetaEnabled() || pilotDiscordIds().includes(discordId))
  );
}
export function requireRaidPilot(discordId?: string): void {
  if (!raidsEnabled()) throw new HttpError(503, "Raid manager is not enabled.");
  if (discordId !== undefined && !raidAccountAllowed(discordId))
    throw new HttpError(403, "This account is not in the private event pilot.");
}
