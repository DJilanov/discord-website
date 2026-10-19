import { redirect } from "next/navigation";
import {
  getMemberAccess,
  memberAuthReady,
  memberSignIn,
} from "@/lib/member-auth";
import { memberRedirectPath } from "@/lib/member-auth-options";
import {
  raidsEnabled,
  memberBetaEnabled,
  kfcDiscordInviteUrl,
} from "@/lib/raids/config";
import { getSettings } from "@/lib/settings";
import {
  DiscordMembershipDialog,
  DiscordSignInButton,
} from "@/components/raids/discord-access";

export async function RaidAccess({
  returnTo = "/raids",
  error,
}: {
  returnTo?: string;
  error?: string;
}): Promise<React.JSX.Element> {
  const ready = memberAuthReady();
  const access = await getMemberAccess();
  const code = access.error || error;
  const message =
    code === "NotServerMember"
      ? "Join KFC Guild or WoW Forever Discord before using the event planner and reserve pages."
      : code === "MembershipUnavailable"
        ? "Discord membership could not be checked. Please try again shortly."
        : code === "AccessDenied"
          ? memberBetaEnabled()
            ? "This account cannot access the event planner. Please contact a moderator."
            : "This Discord account has not been approved for private event testing."
          : code === "Configuration"
            ? "Discord sign-in is temporarily unavailable. Please contact a moderator."
            : code
              ? "Discord sign-in did not finish. Please try again."
              : "";
  const destination = memberRedirectPath(returnTo);
  return (
    <div className="raid-access">
      <p className="eyebrow">
        {memberBetaEnabled() ? "Community beta" : "Private pilot"}
      </p>
      <h1>Event planner</h1>
      <p className="muted">
        {!raidsEnabled()
          ? "Event manager is not enabled."
          : !ready
            ? "Member sign-in is awaiting configuration."
            : "Discord sign-in required."}
      </p>
      {message && (
        <p role="alert" className="raid-sign-in-error">
          {message}
        </p>
      )}
      {ready && (
        <form
          action={async () => {
            "use server";
            if (!memberAuthReady()) redirect("/raids?error=Configuration");
            await memberSignIn("discord", { redirectTo: destination });
          }}
        >
          <DiscordSignInButton />
        </form>
      )}
      {code === "NotServerMember" && (
        <DiscordMembershipDialog
          foreverInvite={(await getSettings()).discordInvite}
          kfcInvite={kfcDiscordInviteUrl()}
        />
      )}
    </div>
  );
}
