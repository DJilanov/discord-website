# KFC Forever and TBC raiding spaces

Implementation follow-up: the [October 31 release ledger](kfc-raiding-release-2026-10-31.md)
records the live layout, opening-week events, final user decisions and remaining
patch-dependent loot work. The findings below retain the pre-rollout baseline.

Next UX plan: [newcomer-to-raid experience](kfc-raid-newcomer-experience-plan-2026-10-31.md)
covers the shorter welcome, signup guidance, native onboarding and verification.
Those improvements are planned; the existing schedules and signups are live.

Status: researched plan, October 31, 2026. No Discord channels, messages,
permissions, roles, events or rosters were changed for this review. No deployment
or source-code implementation is included.

## Recommendation

Give each edition a permanent schedule and a raid forum. The schedule answers
“What can I join?” in start-time order. Each forum post holds one session's
signup link, roster and conversation. Keep general discussion and voice nearby.
New raids add posts rather than permanent channels.

Use the same presentation for Forever and TBC, with separate events, characters,
loot policies and notification preferences. Support the current Raid-Helper
events alongside our event manager, with exactly one authoritative signup per
session. Improving navigation must not force a roster migration.

## What was verified

The read-only bot review captured the KFC channel/role inventory, active
threads, current native Events, three selected pin lists and the latest
messages in 11 relevant public/community channels. It sampled 228 messages;
this is not a complete history or a measurement of notification frequency.
Private evidence is in `.data/kfc-forever-raiding-plan-20261031/`.

| Finding | Consequence |
| --- | --- |
| TBC has 17 channels: 15 text and two voice | Recruitment, raid dates, checks, chat and PvP compete in one section |
| Several September raid channels remain beside the November 1 Black Temple channel | Channel position and names do not reliably identify the next run |
| The November 1 channel contains a live Raid-Helper signup | Preserve that signup and its interaction owner |
| Forever has six text channels, including separate November 5 and November 14 leveling channels | Stop extending the dated-channel pattern to every new raid |
| The shared `raid-calendar` contains one navigation message and no pins | A directory of links is not an upcoming schedule |
| The native Events endpoint returned November 5 leveling and November 1 BT | Events are useful discovery, but do not cover every known planned session |
| `pre-post-raid-discussion` is restricted; it is not visible to the tested no-role or verified profiles | Do not turn its existing conversation into a public raid chat |
| The current forum event schema is restricted to approved forums in the Forever community server | Creating a KFC forum alone will not enable native event delivery there |

Permission findings are computed from current role/channel configuration for
specific profiles, not a claim about every member's Discord client. The existing
November 14 post is a linked copy of an event whose primary Discord signup is
elsewhere; it must not become a second independent roster.

## Proposed layout

Keep the existing edition categories. Put the schedule first and the raid forum
second, ahead of supplementary channels.

| WoW Forever | Purpose |
| --- | --- |
| `forever-schedule` — read-only text | Maintained list of the next runs, initially covering seven days |
| `forever-raids` — forum | One post per scheduled raid, with signup and session discussion |
| `forever-discussion` — existing chat | General Forever conversation and questions |
| `Forever Raid Voice 1` — voice | Stable meeting place; add more rooms when overlapping runs require them |

Keep character planning and the recently improved joining/application routes.
Keep the two live leveling channels through their scheduled sessions. Later
leveling sessions should use the same event machinery in a clearly labeled
leveling destination, rather than appearing as raids or spawning dated channels.

| TBC Raids | Purpose |
| --- | --- |
| `tbc-schedule` — read-only text | Rename the existing `tbc-announcements`, retain its ID/history, put the live schedule at the top |
| `tbc-raids` — forum | New sessions and linked announcements for existing external signups |
| `tbc-raid-chat` — text | Reuse the empty shared `raid-chat`, retaining its ID when moved/renamed |
| `tbc-raid-help` — forum | One preparation, gear or log-review request per post; reusable attendance guidance |
| `TBC Raid Voice` — existing voice | Preserve its ID and access |

The TBC target is five core channels. Supplementary channels leave the category
only after their individual migration checks pass. General PvP requests use the
existing group-finding area; guild applications stay a distinct private process.
Do not add empty channels for every raid, team, day or class.

The existing shared `raid-calendar` becomes a short, maintained entrance with
two buttons: **Forever schedule** and **TBC schedule**. It does not duplicate
the complete schedule or each raid announcement.

## What a member sees

The top schedule message contains:

- **Next raid**, followed by upcoming sessions ordered by their actual start.
- Date/time rendered in the member's local timezone, activity, group/host and
  access: Open PUG, Guild priority or Guild only.
- A truthful short recruitment summary, such as “Need 1 healer”, only when the
  authoritative source supplies it. Otherwise show **View signup**.
- A direct link to the session post and its one signup destination.
- Last successful refresh and a clear empty or stale-data state.

Use compact text/list rows, with a small illustrated header. Keep the full
roster, cover art and detailed terms in the individual event post. Bound the
overview to ten sessions, with an explicit overflow link/count; the forum holds
all published sessions. A refresh edits the same owned message, not a new post.

Each session post shows the raid, start, host, capacity, team, access, pace,
requirements, loot/HR/SR policy, signup deadline and confirmed/registered counts
where available. Keep **Sign up / My signup** as the main action, with roster
and details secondary. Do not require a guild application for an open PUG run.

Proposed title format: `01 Nov · 20:00 CET · Black Temple · [team]`. This is a
format example, not a change to the current run's confirmed start or team.
The body also carries Discord's member-local timestamp. Store instants in UTC
and recurring organizer times in `Europe/Berlin`, respecting CET/CEST changes.
Do not derive authoritative times from old channel names.

For Forever, the introduction names Djilanov for morning/daytime and hardcore
runs and Psyrogue for the standard daily 20:00 Central European run. The schedule
contains actual published sessions; the recruitment plan does not create
invented daily events, hosts, durations or open places. Separate the two planned
10-player teams and the 20-player team with stable team identities.

## Forum configuration and notifications

Use list view, concise guidelines and one pinned **How to join** post. Default
to creation-date order to reduce bump competition. Discord's native forum sort
does not order sessions by a start time in their text; the schedule performs
that job. Member-applied sorting remains their preference.

Keep a small tag set: Morning/daytime, Evening; Casual, Semi-hardcore,
Hardcore pace; Open PUG, Guild priority, Guild only; Open, Signup closed,
Cancelled, Finished. Select at most five applicable tags. “Hardcore pace” is a
pace label, not an assertion of a permadeath ruleset. Exact team, size and
activity belong in the event fields/title rather than dozens of tags.

Only approved organizers and the bot create raid listings; eligible members
can read, use signup buttons and reply in sessions they can access. Do not
require ordinary participants to have Create Posts to join a managed raid.
Allow public/community listings to be found without the trusted guild-member
role. Private rosters and officer conversations retain their separate access.

Notification defaults:

- Schedule and roster updates edit in place with empty `allowed_mentions`.
- No `@everyone`, `@here`, class-role or general guild-role raid advertising.
- Offer separate opt-in Forever and TBC raid-alert roles. These grant no access
  or guild status. Post at most one digest per edition per calendar day, and
  only when there is an eligible upcoming session.
- Optional custom reminders come later, with explicit participant opt-in and
  durable deduplication. Initially use native Event interest/follow controls.
- Cancellations and time changes update the existing session and schedule;
  publish one clear change notice inside the affected session. Do not announce
  it repeatedly across every copy or replace the event without notice.

Forum following and native Event interest depend on members' notification
settings. Do not promise delivery of every notification or equate Interested
with a signed-up/confirmed character.

Mark completed/cancelled posts visibly and archive them after a seven-day
discussion grace period. Keep future sessions accessible even if Discord
automatically archives an inactive thread. A timer can indicate **Scheduled
time reached** or **Scheduled finish passed**; only a host/source decision
establishes that a raid ran or finished. Inactivity is not event completion.

## TBC migration by existing channel

| Existing channel(s) | Planned handling |
| --- | --- |
| `tbc-announcements` | Rename to `tbc-schedule`; retain history and ID; pin the owned schedule message |
| Shared `raid-chat` | Move/rename to `tbc-raid-chat`; confirm it is still empty before applying |
| `bt-1nov-7-30` | Keep live through the November 1 run; link its existing Raid-Helper signup from the schedule; archive only after the host closes it |
| `hyjal-ssc-18sep-8pm`, `hyjal-bt-25sep-7-30pm`, `hyjal-ttk28-sep-8pm` | Candidate historical channels; verify each event is closed before moving to Archives, preserving links, messages and audience |
| `continuation-run`, `random-pugs`, `old-raids-classic` | Check for active arrangements; future sessions use the forum; archive only when nothing active is stranded |
| `gear-logs-check`, `logs` | New requests/results go to help posts or their raid session; retain existing audience and history; retire old destinations only after unresolved work is routed |
| `attendance-help` | Put a short reusable guide in raid-help and link it from signups; retain the old channel until the replacement is verified |
| `pre-post-raid-discussion` | Preserve restricted access; move to the guild-only area if its members still need it; never copy its contents into public chat |
| `tbc-application` | Move beside the joining/application routes with its exact access preserved; do not merge old private applications into public posts |
| `pvp-premades`, `arena-partners`, `TBC Arena Voice` | Move together to the group-finding area with TBC labels and existing access; retain active requests |
| `TBC Raid Voice` | Keep unchanged |

No message/channel deletion is needed. Discord cannot merge old text-channel
history into a new forum while retaining the original identities. Preserve the
old channels and provide links rather than pretending history was transferred.
Moving a channel must not synchronize it to broader category permissions.

## Implementation work and reuse

| Work package | Current state | Required work |
| --- | --- | --- |
| Managed event signup, character/spec, roster, SR and exports | Existing implementation | Reuse; verify current release before rollout |
| Linked announcements for the same managed event | Existing text-channel implementation | Reuse event identity and revision delivery; do not create independent signups |
| Raid-Helper roster import | Existing explicit organizer workflow | Optional later transfer; it is not live synchronization and does not import SR choices |
| KFC raid forums | Not implemented | Add exact approved KFC forum destinations, creation, permissions and delivery support |
| Managed-event forum mirrors | Not implemented for KFC | Add forum-aware link-only delivery when the primary event stays elsewhere |
| Chronological schedule messages | Not implemented | Add bounded projection, persistence, ownership checks, retries and stale-state reporting |
| External Raid-Helper schedule entries | Not implemented | Add organizer-managed bindings to exact source events/messages; do not guess or duplicate their rosters |
| Native Discord Events for every eligible session | Partial | Current synchronizer has explicit bindings for one canonical event; add lifecycle-aware, scoped bindings for additional sessions |
| Digest roles/publication | Not implemented | Add self-service opt-in, bounded delivery and deduplication |
| Legacy-channel transition | Planned | Per-channel verification, redirection, archival and permission readback |

Keep pure schedule selection/rendering separate from Discord I/O. Extend the
existing `lib/raids` modules, persistence and worker rather than creating another
independent bot. Define a small shared projection with edition, canonical source
kind/ID, organizer/team, access, actual start, optional confirmed finish, status,
signup URL, optional sourced role counts and last verified time.

For managed events, the website database is authoritative. For a linked
Raid-Helper session, Raid-Helper remains authoritative; initially the organizer
registers/updates the exact signup link and confirmed schedule. An approved
API/export integration can automate that later. Do not claim two-way sync from
reading a Discord embed, edit another bot's message, replay its controls, or
infer remaining seats from native Event interest. Hide unverified role counts.

Use edition + source kind + source event ID to identify a session. Mirrors and
schedule entries point to it. Different teams at the same time remain different
sessions; repeated worker passes do not create more posts. Persist binding IDs,
desired/delivered revisions, leases and receipts. Ambiguous create timeouts
require reconciliation before another create; missing/deleted owned messages
raise a repair item rather than automatically respawning announcements.

Discord native Events provide extra discovery. Bind only confirmed sessions,
retain existing Interested members, and link to the actual signup. External
Events require a real finish time. Where it is unknown, omit that native
projection until the host confirms it; do not invent a one-hour duration.
Discord can automatically start/end external projections at their scheduled
times, so those states do not prove that the in-game session occurred.

Publish private/guild-only sessions only to an audience permitted to see their
details. Do not leak titles, rosters, access-controlled signup URLs or occupancy
into the community schedule. A community listing may explain Guild priority
without making its private roster public. Other-server publication remains a
separately approved destination, not an automatic consequence of posting in KFC.

## Delivery sequence and acceptance

1. Implement and test shared schedule projection and exact KFC forum bindings.
   Prepare a migration manifest recording every affected channel's current
   name, position, parent, overwrites and expected managed messages.
2. Validate one Forever session and one TBC session in a private preview.
   Include one externally managed signup, an empty schedule, missing data and
   a forum post whose thread has been archived.
3. Roll out Forever schedule/forum navigation. Preserve November 5 and 14
   posts and their existing authoritative signup locations. Do not change
   their participants or publish duplicate native Events.
4. Add TBC schedule/forum and link November 1 BT to its existing Raid-Helper
   message. New TBC runs use the forum; no forced migration of that live run.
5. After the relevant hosts close old runs, apply the individual TBC archival
   and move plan. Update start-here, joining guidance and shared calendar links
   together so old instructions cannot send people to competing destinations.
6. Add optional digests only after the core member journey works. Observe one
   normal week before considering additional team channels or custom reminders.

Verification must cover start-time ordering, CET/CEST boundaries, simultaneous
teams, differing editions/realms, source disagreements, cancellation, locked
versus full rosters, absent/tentative players, archived threads, overflow, stale
sources, deleted posts, rate limits, worker restart and uncertain creates.

Database/integration tests must prove one session/one signup, revision races,
no duplicate posts/digests, no private-to-public projection, and separate
source-owned versus bot-owned messages. Browser/member walkthroughs must cover
desktop and mobile, no-role/verified/public-raider/guild/organizer profiles,
signup, withdrawal and exact time changes. Unit-test mocks do not establish
that actual Discord forum components render or function correctly.

Success criteria: a newcomer finds the next suitable raid in two channel/link
selections; the overview is genuinely chronological; there is one working
signup per session; normal roster changes create zero new announcements; each
edition stays within its digest limit; all existing live rosters and restricted
history retain their identity and audience. Rollback restores captured channel
settings and previous message payloads while retaining new events/signups.

## References and limits

- [Discord Forum Channels FAQ](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ): list view, tags, following and archival.
- [Discord channel API](https://docs.discord.com/developers/resources/channel): forum/thread structure, sort options and permissions.
- [Discord scheduled event API](https://docs.discord.com/developers/resources/guild-scheduled-event): external finish requirements, lifecycle automation and event limits.
- [Discord Scheduled Events guide](https://support.discord.com/hc/en-us/articles/4409494125719-Scheduled-Events): discovery and Interested notifications.
- Existing local contracts: `lib/raids/discord-forum.ts`,
  `lib/raids/discord-channels.ts`, `lib/raids/discord-mirrors.ts`,
  `lib/raids/discord-panel.ts`, `lib/raids/listing-conversion.ts`,
  `content/kfc-community.ts`, `docs/raid-signup-import-release.md` and
  `docs/native-scheduled-event-projections.md`.

This review did not query production database event records, deploy a release,
run code tests or perform a real member's desktop/mobile Discord walkthrough.
Native event metadata, channel names and historical implementation notes are
not a substitute for confirming each canonical session before migration.
