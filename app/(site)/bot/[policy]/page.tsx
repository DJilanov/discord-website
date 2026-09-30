import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

const policies: Record<string, { title: string; body: string }> = {
  "shared-channels": {
    title: "Shared Discord channels",
    body: `## Two communities, one opted-in conversation

WoWForeverBot can connect up to three approved pairs of text channels between KFC Global Pugs and WoW Forever Discord, in both directions. Each pair is a separate conversation, not a combined feed. Existing channels can participate only after staff approve the exact pair and publish sharing notices. This is an independent community service operated by the WoW Forever Discord team, with KFC organizers. It is not a Blizzard or Discord service. No channel is connected just because the bot is installed.

## Your choice

Use **/bridge join inside the channel** you want to share from and accept the confirmation for its exact pair. You must belong to both servers and be permitted to speak in both paired channels. Opt in separately in each channel you post from; joining one pair never enrolls you in another. Only new eligible text after confirmation and channel activation can be shared. Old messages are not imported, including old messages edited after activation. Pauses or configuration changes can require a new opt-in.

Some approved KFC discussions are role-gated. Their original access rules remain in place, but readers of the paired public WoW Forever channel can see opted-in copies even if they cannot open the original. Accept sharing only when you intend that audience. A read-only participant cannot use the bridge to post into a restricted channel.

Copies visibly identify the original Discord username and community and include a source link. People in the other shared channel can read them and reply. A moderator-reviewed pilot may require approval before each copy appears. Delivery is not guaranteed and stale messages are dropped rather than replayed later.

## What is excluded

The bridge does not copy private messages, other channels, bot or webhook posts, attachments, polls, stickers, forwarded posts, voice messages or member lists. The initial pilot excludes links and mentions. Moderators can block prohibited text, remove copies, block participation or pause sharing. Automated checks do not catch every harmful message; report concerns privately to staff.

## Stop sharing or remove a copy

Run **/bridge leave inside a paired channel** to stop your participation in both directions of that pair and queue removal of its managed copies. Other pairs are unchanged; repeat in each pair you want to leave. **/bridge remove** takes an exact message link from that pair and queues removal of that copy. **/bridge status** shows that pair's participation and outstanding cleanup. If you lose access to a channel, contact staff privately to withdraw and request cleanup. Deleting an original also requests removal of its copy. Deleting the bot's copy suppresses it; it is not recreated automatically. Edits can update the existing copy or cause it to be removed. In manual review mode, editing a reviewed post retracts the copy; post a new eligible message for fresh review.

Managed replies to removed messages may also be removed to avoid retaining a reply preview. The bridge never deletes human originals. Outages, permission changes or an emergency hard stop can delay cleanup. Staff retain unresolved message IDs until cleanup is confirmed. We cannot delete other people's screenshots, independently quoted messages or data retained by Discord itself.

## Retention

Managed bot copies expire after 30 days. The application does not store a chat transcript. It stores minimal message IDs, author IDs, relationships, delivery status and participation evidence. Confirmed deletion mappings remain for seven days to prevent replay; unresolved copies remain tracked. See the bot privacy policy for details and recovery limitations.

## Help

Contact the WoW Forever Discord moderation team privately through the server or the contact address below. Do not post tokens, private evidence or personal information in public shared channels.`,
  },
  privacy: {
    title: "WoWForeverBot privacy",
    body: `## Operator and scope

The WoW Forever Discord community team operates WoWForeverBot and this website, with organizers from KFC Global Pugs. We are independent of Blizzard and Discord. This policy covers the shared-channel bridge; the website privacy policy covers website analytics, player reports and other submissions separately.

## Data processed

After an explicit opt-in, eligible message text and the current Discord username are processed in memory to construct an attributed copy in the other approved server. Discord's Gateway may deliver events from channels visible to the bot; non-selected events are discarded without a message cache. Configure narrow channel permissions before activation. We do not fetch channel history or scrape server member lists.

We retain source and destination server/channel/message IDs, the author's Discord ID, consent time and policy version, reply relationships, keyed text fingerprints, delivery status and safe error codes. We check current server membership, role permissions and timeouts to prevent a relay bypassing speaking restrictions. These checks are transient. Staff actions and restrictions are recorded for accountability. Private command responses use encrypted, short-lived interaction tokens, removed on completion or expiry.

## Audiences and access

Each approved pair in KFC Global Pugs and WoW Forever Discord has two audiences. A paired public channel may have a wider audience than its role-gated counterpart. Participation is recorded separately for every pair and originating channel. Bot copies contain a Discord username and source link. Approved community staff can access participation and delivery metadata, but there is no website chat archive. To inspect an original, staff must have access to it in Discord. The worker's database identity is restricted to bridge data, not private player reports or website staff credentials.

## Retention and removal

Bot copies are removed after 30 days. Message mappings and tombstones are retained until removal is confirmed, then seven days. Unresolved outputs are retained until staff can verify and remove them. Interaction receipts and completed job metadata are retained up to seven days. Withdrawn consent records are retained while copies remain and for up to 37 days after withdrawal, including the cleanup and replay-protection window. Staff blocks remain until lifted. Bridge control audit entries are retained for 90 days; separate player moderation case policies are unchanged.

Use /bridge leave or /bridge remove inside the relevant paired channel, or contact staff, to request removal. Commands apply only to that pair; repeat for other pairs you want to leave. Human originals are not deleted by this service. Deleting a managed parent can also retract its managed reply chain. We cannot remove human screenshots, independent reposts or Discord's own retained data.

## Backups and incidents

Restricted database backups include bridge IDs and consent records. The current website backup process keeps seven local backup snapshots; frequency and encrypted off-host recovery must be verified before the pilot is activated. A restored or restarted worker begins in cleanup-only mode, invalidates old participation and requires new opt-ins before resuming. A backup can be older than a withdrawal or copy; unknown orphaned copies require manual identification and exact-link cleanup. We do not promise zero data loss or immediate deletion during an outage.

## Contact

Contact the WoW Forever Discord moderation team privately, or use the address below. Include only the relevant Discord message link or your Discord ID, not your password or bot token.`,
  },
  terms: {
    title: "WoWForeverBot terms",
    body: `## Independent community service

WoWForeverBot is operated by the WoW Forever Discord community team, with KFC Global Pugs organizers. It is not affiliated with Blizzard or Discord. Use of Discord remains subject to Discord's terms and community rules, as well as each server's rules.

## Voluntary participation

Shared-channel publication requires explicit confirmation through /bridge join. Acceptance applies to the named pair of channels, policy version and current activation. Do not share private information, harassment, scams, unlawful content or material you do not have permission to share. Do not use the bridge to evade a ban, timeout, role restriction or moderation decision. Membership and speaking permissions in both servers are required for this pilot.

## Moderation and service limits

Staff may hold or reject content, restrict participation, pause delivery or retire a channel pair. A bot copy is visibly attributed; it is not a new native member message. Automated screening does not establish that content is safe or accurate. Delivery can be delayed, truncated, rejected or interrupted. Attachments, polls, private messages and historical imports are not supported.

## Withdrawal and cleanup

Use /bridge leave inside a paired channel to stop both directions of that pair, or /bridge remove there with a message link to request removal. Other pairs are unaffected. Contact staff privately for help when you cannot access the channel. Managed reply chains may also be removed. Human originals remain unchanged. Outages and missing permissions can delay cleanup; copies or screenshots independently made by other people are outside our control.

## Changes and support

Audience or policy changes require renewed approval and participation. Contact community moderators privately about access, corrections or disputes. The shared-channel explanation and bot privacy policy describe the processing and retention used by this release.`,
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<Metadata> {
  const { policy } = await params;
  return policies[policy]
    ? pageMetadata(
        policies[policy].title,
        "Participation, privacy and controls for WoWForeverBot shared channels.",
        `/bot/${policy}`,
      )
    : { title: "Not found" };
}
export default async function BotPolicy({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<React.JSX.Element> {
  const { policy } = await params;
  const content = policies[policy];
  if (!content) notFound();
  const settings = await getSettings();
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "WoWForeverBot", href: "/bot/shared-channels" },
          { label: content.title, href: `/bot/${policy}` },
        ]}
      />
      <PageHeader
        eyebrow="WoWForeverBot / Policy 1"
        title={content.title}
        description="Shared-channel policies. Publication remains off until the approved pilot is activated."
      />
      <article className="prose" style={{ maxWidth: 850, paddingBottom: 48 }}>
        <Markdown>{content.body}</Markdown>
        {settings.contactEmail && (
          <p>
            Contact:{" "}
            <a href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
          </p>
        )}
        <nav aria-label="Bot policies" className="button-row">
          <Link href="/bot/shared-channels">Shared channels</Link>
          <Link href="/bot/privacy">Privacy</Link>
          <Link href="/bot/terms">Terms</Link>
          <Link href="/privacy">Website privacy</Link>
        </nav>
      </article>
    </div>
  );
}
