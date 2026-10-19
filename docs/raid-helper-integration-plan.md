# Raid-Helper: KFC workflow and Forever integration

Research date: 2 October 2026. Updated direction: plan our own
[Forever-only raid manager and native soft reserves](forever-raid-manager-implementation-plan.md).
That blueprint supersedes external Raid-Helper integration as the proposed
automatic event/SR implementation. No new raid engine is activated by the plan.
The manual experiment below remains historical/supplemental research, not an
API-key requirement or a claim of a tested live flow. The API sections are
deferred research, not current prerequisites or enabled functionality.

## Current experiment: standard Discord flow

The official [getting-started guide](https://raid-helper.xyz/documentation/intro)
documents `/create`: a member invokes it in Discord and Raid-Helper continues
the creation dialogue in that member's DMs. `/quickcreate` is its single-command
alternative. Existing installation in Forever is sufficient to start a manual
test as the server owner or an administrator.

There is no supported bot-to-bot slash-command invocation in Discord's documented
application-command/interaction model. WoWForeverBot posting the string `/create`
would create ordinary message text, not a Raid-Helper interaction. The interaction
response API requires the ID/token of an interaction Discord already sent to
that application; it cannot manufacture a new interaction for another app.
This conclusion follows from the [application command documentation](https://docs.discord.com/developers/interactions/application-commands)
and [interaction documentation](https://docs.discord.com/developers/interactions/receiving-and-responding).
Do not describe it as a successfully tested live invocation; no such invocation
was attempted. No currently documented legacy text-command bot-to-bot path was
found in Raid-Helper's standard command documentation.

Do not automate a normal Discord user through a copied account token or a
self-bot. Discord [prohibits automated user accounts](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots).
This also means Administrator permission on WoWForeverBot does not turn it into
a normal member able to operate another bot's DM wizard.

### First manual test

1. In Forever, open the intended Alliance or Horde LFG forum. Use its new-post
   composer if the forum has no standalone chat composer; select `/create`
   belonging to Raid-Helper from Discord's command picker. If that client
   surface does not expose it, invoke it in a normal text channel and select
   the intended forum as the destination in the creation flow, if offered.
   The exact forum-targeting UI remains to be observed in this server.
2. Allow DMs from this server, then open Raid-Helper's DM. Use a clearly labelled
   experiment title and a future start. Pick the built-in WoW template appropriate
   to the test, fill title/details/start and confirm the actual destination.
   For a pure KFC UI comparison its current built-in TBC template is known;
   that does not establish TBC template compatibility with Forever.
3. Use an explicit timezone in the test notes. Inspect Raid-Helper's configured
   input timezone before entering a wall-clock time. One server-wide input
   timezone is not separate EU and NA input zones. Its timestamp display should
   be checked against the actual scheduled instant on both clients.
4. Check one class/spec signup and Late/Bench/Tentative/Absence, host editing,
   unregistration and all relevant forum tags. Confirm the posted event is
   authored by Raid-Helper and that only one signup roster exists.
5. Check native calendar creation separately. A signup post is an event even
   when it is not in Discord's Events tab. `create_discordevent` requires
   Raid-Helper Premium and suitable Discord event permissions.
6. Share the experiment's Discord message link or screenshots. WoWForeverBot
   can inspect its resulting message/thread via read-only bot access. It cannot
   inspect the creator's private Raid-Helper DM conversation. Keep experimental
   native posts out of automatic website publication until that separate source
   verification path is implemented and explicitly enabled.

Grant an actual organizer Raid-Helper's assistant role for creating and editing
their own events, or its manager role for broader event management. The official
guide documents `/settings assistant_role set`, `/settings manager_role set`
and custom permission groups. Do not grant every member Administrator just to
let them host a session.

### No-key handoff from the website

The supported intermediate flow is: website submission -> a compact draft for
an organizer -> organizer executes Raid-Helper's `/create` or `/quickcreate`
-> organizer supplies the resulting event link -> staff verifies it. Our bot
can prepare the public draft, inspect the linked post, and later manage its own
calendar event, but cannot press another app's buttons or invoke its command.

If implementing that handoff, keep its provider/link state explicit and avoid
creating another competing signup post. A later fully automatic alternative
would be our bot's own event wizard, not a claim that it controls Raid-Helper.
Neither alternative is enabled by this research task.

## Verified current state

- KFC Discord: `1411533815356194968`; Forever: `1554316932948172940`.
- Raid-Helper (`579155972115660803`) is installed in both servers. No second
  installation is necessary.
- KFC's website reads Raid-Helper API v4, using its server-specific key.
  `KFC/lib/raid-helper.ts` fetches the server event list and individual event
  details. Redis caching lasts one hour, with a seven-day last-known-good
  backup for the list. It does not create events from website submissions.
- KFC also has `app/api/webhooks/raid-helper/route.ts`, a separate event-to-DB
  endpoint. Its existence is not proof that a live Raid-Helper webhook is
  configured. Do not copy that endpoint's historical authentication assumptions;
  use the currently documented provider signature contract.
- The KFC API returned 351 posted events in the inspected response. Three recent
  Black Temple entries were inspected, without copying member signups.
- Those events use template `7` in the list response, resolved to `wowtbc` in
  the event detail response. This is a built-in template, not a custom template
  requiring export/import.
- The roster has Tank, all nine TBC classes, Late, Bench, Tentative and Absence.
  Role counters include Tanks, Melee, Ranged, Healers and DPS.
- Observed settings include `limit_per_user: 1`, `specs_per_signup: 1`,
  `bench_overflow: true`, `lock_at_limit: true`, `queue_bench: false`,
  `deadline: "0"`, `reminder: "false"`, `limit: 9999`, `duration: 0`,
  and `create_discordevent: true`.
- Raid-Helper can view, post embeds, read history, react, create public threads
  and send messages in threads in all six Forever LFG/scheduled forums.
  It had Manage Events but lacked the distinct Create Events permission during
  the original inspection. As of 17 October 2026, WoWForeverBot owns a separate,
  explicitly bound native Event projection for the November 5 leveling session
  in Forever; it is synchronized with the existing KFC native Event from the
  canonical website schedule. See
  [Native scheduled-event projections](native-scheduled-event-projections.md).
- Forever's current website worker creates WoWForeverBot forum posts, not
  Raid-Helper events. Its verifier deliberately requires that bot's original,
  unchanged starter. Swapping the author without adapting this contract would
  prevent Verified from publishing the group.

## What "1:1" should mean

Keep the familiar signup experience: one event post, class/spec selection,
role counters, late/bench/tentative/absence states, host-managed composition,
and a calendar link. Do not import KFC's member roster, attendance, roles,
historical raid entries, custom emoji dependencies, or home-guild branding.

Use the appropriate built-in Classic-compatible template for Forever after a
controlled pilot. TBC's class/spec definitions are not automatically correct for
Forever. Do not promise class balance or raid content that is not available.

Do not blindly copy `9999` capacity or zero duration. A five-person dungeon
needs an actual capacity and finish time; a large launch-leveling gathering can
use a different capacity. The form must collect these instead of inferring
them from free text. Region and ruleset stay separate from the activity.

## Deferred API credential research

The official [API documentation](https://raid-helper.xyz/documentation/api)
defines separate authorization keys per server. An administrator or a member
with Manage Server can obtain the Forever key through Raid-Helper's `/apikey`
in Forever. KFC's key cannot authorize the new server.

The owner can place `RAID_HELPER_API_TOKEN` in the local project's `.env.local`
for secure transfer to the server's private `.env.listings`. Keep it out of
client bundles, public admin responses, logs, CLI arguments and Git. Never copy
the rest of a local environment over the production environment. Do not replace
KFC's credential or webhook configuration.

Read the Forever event list with the new key before enabling writes. Verify
Raid-Helper's membership and target-channel access again. Grant Create Events
to its existing role if using Raid-Helper to create native calendar events;
preserve other role permissions and channel overwrites. Administrator is not
needed. Discord's [event permissions documentation](https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-permissions-requirements)
distinguishes Create Events from Manage Events.

The official [advanced settings](https://raid-helper.xyz/documentation/advanced)
mark `create_discordevent` as Premium. Check the new server's entitlement, not
KFC's. Two supported choices:

1. Raid-Helper owns both the signup post and native calendar event if Forever
   has Premium. Verify exactly when creation/editing triggers the calendar
   side effect in the controlled pilot.
2. Raid-Helper owns the signup roster; WoWForeverBot owns the native calendar
   event if Premium is unavailable. The calendar links to the one Raid-Helper
   signup post. Never enable both calendar writers for the same listing.

Discord's Interested count is not an accepted raid slot. There is no second
website signup list in either option.

## Deferred automatic submission workflow

1. Keep public-posting consent, challenge, rate limits and atomic submission
   plus outbox creation. The PvP ruleset takes priority in faction forum
   routing; non-PvP raids/RP use scheduled-runs, other dungeons/questing use
   PvE, and PvP premades always use PvP.
2. Collect duration or end time, capacity and the signup template/profile as
   structured fields. Store the start/end as UTC instants. Continue showing
   Central European time for EU and New York time for NA, with DST-aware offsets.
3. Collect and verify a host's Discord identity before assigning Raid-Helper
   leadership. A free-text handle is not proof of identity. Prefer Discord OAuth
   or a signed Discord confirmation bound to the pending submission and its
   one-time nonce. A trusted organizer can explicitly adopt an unclaimed post;
   never resolve an arbitrary supplied username into event-management authority.
4. Create one Raid-Helper signup event in the existing selected forum, with
   region, ruleset, activity and Open tags. Keep a fifth tag slot for Verified.
   Do not create an additional text-wall starter next to it. Show the public
   contact and important session details in its description.
5. A human administrator applies the protected Verified tag. Only then publish
   on the website, retaining audit evidence, actor checks and emergency-hide
   behavior. Prefer delaying native calendar publication until this review to
   avoid unreviewed public submissions filling the server's event calendar.
6. The website card links directly to the signup event, displays confirmed
   roster counts with their freshness, and keeps contact details available.
   Do not fetch or publicly expose the entire roster when a count suffices.
7. Changes/cancellation update the one event and its calendar link. Removing
   Verified hides the website listing; closing/deleting the event withdraws it.
   Routine roster edits and thread archiving do not invalidate source identity.

Native Discord forum posts are not automatically converted into Raid-Helper
events. Start with website submissions and authorized organizer-created events.
Do not monitor every conversation and turn arbitrary chat into an event.

## Deferred API provider contract

The verified creation endpoint is:

`POST https://raid-helper.xyz/api/v4/servers/SERVERID/channels/CHANNELID/event`

Its documented body includes `leaderId`, `templateId`, `date`, `time`, `title`,
`description` and `advancedSettings`. Date/time can use Unix timestamps, avoiding
server input-format and timezone ambiguity. The response includes status and
an event object. `forum_tags` is documented for forum destinations. Prove the
exact forum/channel/thread/message identifiers and timestamp interpretation
through a labelled, removable pilot before freezing response schemas.

Recommended ownership:

- Add a narrowly scoped `lib/raid-helper/` provider module and schemas. Reuse
  the existing listings worker/outbox rather than adding another competing
  submission queue. No general-purpose arbitrary-URL proxy.
- Keep the production process under PM2 with local PostgreSQL. The API token
  belongs to the isolated worker OS user, not the website request process.
- Add an additive migration for immutable provider/profile/host/start/end
  metadata and returned event, message, thread and optional calendar IDs.
  Existing bot-authored jobs keep their original provider and verification
  rules; never reinterpret historical records automatically.
- Scope creation to Forever's approved six group forums. Guild recruitment
  continues using the existing bot formatter and verifier.
- Persist posting before the HTTP side effect. Explicit rejections are distinct
  from timeout/5xx/unknown responses. Hold uncertain requests for reconciliation
  by the stored website reference; never silently fall back to another posting
  provider or retry creation and produce duplicate signups.
- Validate the precise provider author, guild, parent forum, event ID, title,
  schedule, host and immutable description/reference. Raid-Helper updates its
  embed as people sign up; allow roster-only mutations, not arbitrary source
  replacement. Do not weaken the verifier to accept any bot or any embed.
- Sanitize Raid-Helper shortcodes in user-supplied fields, not just Discord
  mentions. Settings and template IDs come from an approved configuration, not
  user JSON. Disable mass announcements, arbitrary roles and temporary voice
  creation for the first pilot.
- Use bounded read polling first. If adding Premium webhooks later, implement
  the documented signature, replay window, body limit and event ownership
  checks before accepting a delivery. Reconcile periodically after outages.
- Track signup-post and calendar delivery separately in admin. A calendar API
  failure must not repost the signup event. Discord permits at most 100 active
  or scheduled events per server; prevent pending distant-future submissions
  from exhausting that capacity.

## Deferred integration acceptance

Test API authorization failures, expired events, malformed responses, wrong
guild/channel/host, provider outages, rate limiting, uncertain delivery and
restart recovery without duplicate posts. Preserve all human-admin Verified
tests, including no bypass by another bot, normal member or website admin.

Cover both factions, all rulesets, EU/NA display, distant phase-release dates,
DST transitions, capacity/waitlist changes, removed signups, host edits,
cancellations, Deleted/Full/Completed tags and website emergency hiding.

Pilot one labelled future event in each faction with a real authorized host.
Confirm class/spec signup, late/bench/absence, roster editing, all forum tags,
and exactly one matching native calendar event. Inspect Discord on mobile and
desktop and use Playwright for the website form, receipt and event card.

Enable new submissions only after that end-to-end check. Do not retroactively
replace existing posts with replies or re-sign anyone up. Retain the working
text-provider path for existing records and a configuration rollback for new
ones. Remove only labelled pilot artifacts after testing.

## Current next step

The routing and regional-time fixes are deployed independently. Raid-Helper
installation is confirmed. The next experiment is one manually invoked
Raid-Helper `/create` flow and inspection of its resulting post. No API key,
automatic integration, public announcement or additional production deployment
is requested for that experiment.
