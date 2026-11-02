# KFC newcomer-to-raid experience

Status: core implementation deployed October 31, 2026. The seven owned entry
messages, saved onboarding routing and one unpinged rollout notice have been
published. Native onboarding was disabled at deployment. The later 10:46 UTC
audit found it enabled with blocked entry destinations; the
[verification/access plan](kfc-verified-access-plan-2026-10-31.md) covers that
repair. That permission repair is now live; native screening cutover is still
pending. Server Guide rendering, Discord-client illustrations and the
five-volunteer pilot remain open. See the
[release and verification record](kfc-raid-newcomer-release-2026-10-31.md).
It extends the [raiding-space release](kfc-raiding-release-2026-10-31.md) and
[leadership fields](raid-leadership-fields-2026-10-31.md).

Scope: the KFC Discord, covering Forever and TBC. The separate WoW Forever
community server's [October 1 onboarding plan](discord-onboarding-plan.md)
addresses a different audience and must not be applied to KFC wholesale.

## Outcome

A newcomer can find an appropriate raid, understand its expectations, complete
signup and recognize their resulting status without asking staff where to go.
A returning player can reopen their signup and change availability quickly.

The primary journey is:

`Welcome → Choose Forever/TBC → Schedule → Raid post → Sign up → Clear result`

Joining the guild is an additional, clearly labeled choice. Open PUG runs
welcome eligible non-guild players; KFC guild members receive roster priority.
Existing screening, event access and organizer permissions continue to apply.

## Verified baseline

The October 31 bot readback found:

- Native KFC onboarding is disabled. Its saved default channels and interests
  predate the new Forever schedule and raid forum.
- The pinned welcome contains 2,453 characters. Its three buttons are Apply to
  join KFC, Ask a recruiting question and Forever raid schedule, in that order.
- Five entry guides share the long Forever recruitment description. The
  welcome and joining guide provide no explicit first-time signup sequence.
- Both editions already have maintained schedules, raid forums and pinned
  joining guides. The Forever forum guide is 833 characters and mixes joining
  instructions with hosting guidance; it has no link buttons.
- The native signup implementation separates saving a character from confirming
  participation. A saved character alone is not a raid signup.
- Native event interest, signed up, bench and confirmed mean different things.
- Optional edition-specific raid digests already work. They cover the next
  24 hours, after 18:00 Europe/Berlin, with at most one per edition/day.

These are configuration and implementation findings. They do not establish
newcomer conversion, notification delivery or unaided success rates.

## 1. A short, useful arrival screen

Replace the welcome's recruitment essay with an approximately 500–800-character
entry message. Keep the longer guild information in joining-kfc and the
appropriate guild-application destination.

Proposed welcome copy:

> Welcome to KFC — a guild and PUG raiding community.
>
> Find a Forever or TBC raid below. Forever runs include morning, daytime and
> evening sessions, with normal and semi-hardcore options. Check the schedule
> for published dates and requirements.
>
> **Join a raid:** choose your game → open a raid post → press **Sign up**.
> First time? Add your character, then confirm the raid signup.
>
> KFC guild members get roster priority. PUG players are welcome where places
> remain. The leader selects the roster; signing up does not guarantee a seat.
>
> Want to join the guild or need help? Use the links below.

Primary button row: **Forever raids** and **TBC raids**, linking directly to
their maintained schedule messages. Secondary row: **How to sign up**,
**Join KFC** and **Get help**.
The first button row stays useful on a small phone screen.

Keep one maintained welcome. Existing secondary guides become short pointers
or purpose-specific information rather than five copies of the same essay.
Recheck every public recruitment invitation's landing channel. Update managed
links that still land in archived raid channels, preserving existing invites.

## 2. An understandable schedule and raid post

Keep the maintained chronological schedules as the source for finding dates.
Each row should answer: raid, date/local time, normal or semi-hardcore pace,
leader, signup link and truthful roster status. Explain the displayed timezone.
Publish only actual scheduled sessions and sourced roster information.

Add a concise **First raid? How to sign up** link to the existing pinned guide
for that edition. Keep optional alerts and a human help route visible nearby.
The compact guide should begin with joining; hosting instructions move below it
or into the existing organizer documentation.

For native signup posts, preserve one main **Sign up** action and a distinct
**My signup** action. Put secondary roster, loot and availability actions in
consistent positions. Show leader/assistant and required preparation near the
raid details. Keep detailed loot policy in its linked canonical message.

Guild priority, normal preparation and semi-hardcore requirements remain event
specific. Full pre-BiS and 95+ parse expectations apply to the designated
semi-hardcore runs, not every newcomer or normal raid.

TBC sessions that use Raid-Helper retain their original signup and roster.
Their guide explicitly points players to that tool's controls. A linked KFC
forum card must not create a second signup requirement.

## 3. First-time signup that clearly finishes

Use the existing private native workflow with clearer stages and button copy:

1. **Your character.** Enter the in-game name, class and spec. A clear
   **Save character & continue** action advances to raid participation.
2. **This raid.** Select the saved character, check role and availability, read
   the event conditions and use **Confirm signup**.
3. **Your result.** Show character/spec/role, raid, local start and the actual
   status. Explain the next action in one sentence.

Returning players reuse saved characters and proceed to raid confirmation.
Class and spec choices remain editable and game/realm compatible. Keep the
existing audience disclosure and explicit confirmation of participation terms.
Only the setup prompts are private; confirmed signup details are shared with
the event audience as disclosed in the existing flow.

Use plain status explanations consistently:

| Stored outcome | Player-facing explanation |
| --- | --- |
| Character saved | Character ready. Continue below to sign up for this raid. |
| Registered | You're signed up. The leader will select the roster. |
| Pending approval | Signup received. Awaiting the organizer's approval. |
| Accepted | Your place is confirmed. |
| Bench | You're on the bench. A place has not been confirmed. |
| Tentative | You're marked as maybe attending. No seat is held. |
| Absent | You're marked as unable to attend. |

Keep a clear **My signup** route for updates and withdrawal. Before Tentative,
Absent or withdrawal removes a seat or reserves, retain the existing effect
explanation and confirmation. Native Discord **Interested** follows an event;
it is separate from completing its character signup.

For expired interactions or uncertain replies, direct the player back to the
original post and **My signup** to check their result. Do not claim a mutation
failed or succeeded before its stored result is known. Preserve existing
idempotency, duplicate-click and stale-version protections.

Produce a short illustrated guide from a synthetic test raid: two annotated
native signup screenshots, plus a clearly labeled Raid-Helper variant. Use
actual controls and synthetic names, with text instructions alongside images.

## 4. Native onboarding and discovery

Prepare a focused update to the existing **What brings you here?** question:

- **Forever raids:** Forever schedule, raid forum and discussion.
- **TBC raids:** TBC schedule, raid forum and raid chat.
- Keep the existing PvP and friends/browsing choices and their intended access.

Allow both editions. Keep class/role personalization optional after entry.
Preserve prompt/answer IDs, ordinary-role assignments, screening and the
existing private-channel boundaries. Interest selection changes discovery; it
does not grant guild membership, a raid seat or raid-alert consent.

Discord currently requires at least seven default channels, with at least five
writable by everyone, to publish onboarding. Review existing public community
channels against that requirement; keep the schedules and policy channels
read-only. Follow the owner's desktop preview before enabling it.
[Discord Community Onboarding FAQ](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).

Prepare a Server Guide welcome and three discovery tasks: **Find a raid**,
**Learn how signup works**, and **Meet the community / ask for help**. These
tasks navigate to useful content; nobody must make a public introduction or
commit to an actual raid to finish onboarding. Server Guide supports a welcome,
three to five tasks and resource pages; configure and check the rendered result
in the native UI. Review channels before resource conversion because converted
resources leave the ordinary channel list.
[Discord Server Guide FAQ](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ).

The welcome and pinned guide improvements ship independently of this stage.
The bot's onboarding configuration readback does not verify the rendered native
Server Guide; capture the desktop and mobile result separately.

## 5. Useful notifications and a human fallback

Expose the existing edition-specific bell subscription from the welcome journey
and signup help. Explain its current timing and how to unsubscribe. Joining the
server, choosing an edition or selecting a class does not subscribe to alerts.
Schedule edits continue to update their existing posts without mass mentions.

Questions about one raid go to that raid's replies. General joining questions
go to the existing edition chat/help destination. The guide names DJ and Vargos
for morning runs, and Psyrogue with DJ assisting on the published Psy-led runs.
Named assistants do not automatically receive bot or event editing rights.

For existing members, plan one concise rollout notice linking the new entry
route. New arrivals use the permanent welcome/Guide rather than a stream of
repeated join announcements. Native notification delivery remains subject to
the member's Discord settings.

## Implementation order and ownership

| Priority | Deliverable | Status |
| --- | --- | --- |
| Existing | Schedules, forums, native signup, leader/assistant fields and opt-in digests | Implemented |
| P0 | Short welcome; raid buttons first; purpose-specific joining/help copy | Implemented and published |
| P0 | Clear pinned signup guide for each edition; direct schedule help links | Implemented and published |
| P0 | Character setup/confirmation labels and consistent result explanations | Implemented and deployed |
| P1 | Synthetic illustrated guide and tested recovery/availability paths | Text walkthrough and automated paths implemented; actual Discord images pending |
| P1 | Scoped onboarding question/default review; owner desktop preview | Enabled later; access repair and fresh-member preview pending |
| P1 | Server Guide welcome, three navigation tasks and resources | Exact desktop checklist ready; current native rendering unverified |
| P2 | Observed newcomer pilot, measured friction and targeted follow-up | Pending five volunteer observations |
| Follow-up | Keep edited raid messages, thread titles and native Events synchronized | Implemented and live-verified with the Hyjal time edit |
| Follow-up | Show registered players before the empty party grid; refresh externally changed signups | Implemented and browser-verified across two sessions |

Content work belongs in the existing KFC welcome/joining and raiding modules.
Separate short welcome copy from guild recruitment copy instead of extending
the current shared essay. Reuse shared channel bindings and signup instructions
where appropriate. The schedule renderer owns schedule help links; the native
UI owns signup labels and result wording. Preserve database states and backend
authorization while improving how the interface explains them.

Use a scoped, preview-first publisher for exact owned messages and onboarding
options. Do not rerun the broad original community migration to make these
changes: its older defaults and channel mappings predate the current layout.
Snapshot owned messages and onboarding configuration, keep a durable write
journal, edit in place and verify exact destinations, authors and mentions.
Do not recreate raids, move rosters or delete history during this work.

I can prepare content, UI changes, diagrams/screenshots, tests, previews and a
scoped release. Native Server Guide editing/publication requires a suitable
administrator desktop session; prepare the exact values and checklist for that
step. DJ/officers can recruit a few volunteers for the final usability pilot;
the code/content work does not depend on waiting for those volunteers.

## Completion checks

- A fresh member, after the existing required server checks, reaches both public
  schedule routes and eligible signup posts without a trusted guild role.
- A PUG player sees that guild application is a separate choice. Guild-only
  events keep their intended restrictions.
- Forever, TBC, both-edition and browsing choices lead to the expected channels.
- First-time character setup, returning-player signup, correct role/spec,
  registered/confirmed/bench states, withdrawal and availability changes work.
- Character save cannot be mistaken for a completed signup; retries do not
  create duplicate signups. Failed/expired interactions have a recovery route.
- Raid-Helper redirects retain the existing authoritative roster.
- Welcome buttons, guide text and result messages are usable on Discord desktop
  and a real mobile client. Website layouts remain stable at 320–390 pixels.
- Opt-in and unsubscribe work independently for each edition, with no role
  privilege or unexpected notification change.
- Relevant content/native UI tests, permission checks, TypeScript and any
  affected website build pass before publishing the scoped change.

Usability targets, to measure rather than advertise as established results:
find the correct raid post within 30 seconds; first signup within two minutes
after reviewing its requirements; returning-player signup within 30 seconds.
Pilot with five volunteers, including at least one Discord novice and one phone
user, and record where each needs help. Use aggregate existing signup audit
milestones where useful; Discord link clicks are not measurable from those
audits and must not be invented as funnel data.
