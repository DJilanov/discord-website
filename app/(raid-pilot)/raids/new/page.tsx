import { getMember } from "@/lib/member-auth";
import { publishedCatalogs } from "@/lib/raids/catalog-store";
import { RaidAccess } from "@/components/raids/access";
import { CreateRaid } from "@/components/raids/workspace";
import { raidDiscordDestinationViews } from "@/lib/raids/discord-settings";
import { canManageRaidChannels } from "@/lib/raids/discord-channels";
import {
  decodeToolGroupDraft,
  toolGroupCreatePath,
} from "@/lib/tool-group-draft";
import type { QueryParams } from "@/lib/directory";

export default async function NewRaidPage({
  searchParams,
}: {
  searchParams: Promise<QueryParams>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const draft = decodeToolGroupDraft(query.draft);
  const invalidDraft = query.draft !== undefined && !draft;
  const member = await getMember();
  const error = invalidDraft ? (
    <p role="alert">
      The shared plan is invalid or unsupported. No event has been created.
    </p>
  ) : null;
  if (!member)
    return (
      <>
        {error}
        <RaidAccess
          returnTo={draft ? toolGroupCreatePath(draft) : "/raids/new"}
        />
      </>
    );
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
    <>
      {error}
      <CreateRaid
        key={draft ? toolGroupCreatePath(draft) : "new-event"}
        toolDraft={draft ?? undefined}
        catalogs={await publishedCatalogs()}
        destinations={
          canSelectChannels ? destinations : destinations.slice(0, 1)
        }
        canSelectChannels={canSelectChannels}
        channelAccessError={channelAccessError}
      />
    </>
  );
}
