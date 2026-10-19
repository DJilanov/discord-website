import "./env";
import {
  memberAuthIssues,
  readMemberAuthSettings,
} from "../lib/member-auth-options";
import { pilotDiscordIds, raidsEnabled } from "../lib/raids/config";

const settings = readMemberAuthSettings(raidsEnabled(), pilotDiscordIds());
const issues = memberAuthIssues(settings);
console.log(
  "Discord member OAuth:",
  issues.length ? "configuration incomplete" : "configured",
);
for (const issue of issues) console.log(`- Missing/invalid: ${issue}`);
console.log(
  settings.accessMode === "members"
    ? "Discord-member beta:"
    : "Private raid pilot:",
  settings.pilotEnabled ? "enabled" : "disabled",
);
console.log("Eligible Discord server count:", settings.guildIds.length);
console.log("Approved tester count:", settings.pilotIds.length);
console.log(
  "Existing KFCBOT application/guild/token settings are reused when the corresponding member/Discord settings are empty.",
);
console.log(
  "Register these exact redirects in the application's OAuth2 settings:",
);
console.log("http://localhost:19300/api/community/auth/callback/discord");
console.log("http://127.0.0.1:19300/api/community/auth/callback/discord");
console.log(
  "https://www.wowforeverdiscord.online/api/community/auth/callback/discord",
);
if (process.env.AUTH_URL || process.env.NEXTAUTH_URL) {
  try {
    const origin = new URL(
      process.env.AUTH_URL || process.env.NEXTAUTH_URL || "",
    ).origin;
    console.log(
      `Auth.js origin override: ${origin}. It must match the website being tested.`,
    );
  } catch {
    console.log(
      "Invalid AUTH_URL/NEXTAUTH_URL; remove or correct the override.",
    );
    issues.push("AUTH_URL/NEXTAUTH_URL");
  }
}
console.log(
  "No secrets, bot API calls or account changes are made by this check.",
);
if (issues.length || !settings.pilotEnabled) process.exitCode = 1;
