import { getMember } from "@/lib/member-auth";
import { publishedCatalogs } from "@/lib/raids/catalog-store";
import { RaidAccess } from "@/components/raids/access";
import { CreateRaid } from "@/components/raids/workspace";
import { raidDiscordDestinationViews } from "@/lib/raids/discord-settings";
import { canManageRaidChannels } from "@/lib/raids/discord-channels";

export default async function NewRaidPage(): Promise<React.JSX.Element> {
  const member = await getMember();
  if (!member) return <RaidAccess returnTo="/raids/new" />;
  let canSelectChannels = false;
  let channelAccessError = "";
  try {
    canSelectChannels = await canManageRaidChannels(member.discordId);
  } catch {
    channelAccessError =
      "Discord administrator permissions could not be verified.";
  }
  const destinations = raidDiscordDestinationViews();
  return (
    <CreateRaid
      catalogs={await publishedCatalogs()}
      destinations={canSelectChannels ? destinations : destinations.slice(0, 1)}
      canSelectChannels={canSelectChannels}
      channelAccessError={channelAccessError}
    />
  );
}
