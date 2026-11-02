# KFC verification and private guild access

Status: P0 access repair deployed and live-verified October 31, 2026. Entry
instructions are reachable and Booster access to guild channels is closed.
Native onboarding preparation is implemented; its cutover awaits native Rules
Screening. TBC applications have their own Verified applicant access policy,
separate from Certified guild chats. See the
[release and remaining setup](kfc-verified-access-release-2026-10-31.md).

Scope: KFC Global Pugs, guild `1411533815356194968`. This follows the
[newcomer experience plan](kfc-raid-newcomer-experience-plan-2026-10-31.md).
The separate WoW Forever community server is outside this audit.

## Initial findings before repair

Configuration was captured at **10:46:19 UTC** and the verification/role-menu
investigation completed at **10:48:25 UTC**. This supersedes earlier findings
that onboarding was disabled: it is now enabled with **16 default channels**.

| Finding | Evidence | Effect |
| --- | --- | --- |
| The verification channel is inaccessible before verification | No-role profile cannot View Channel `1412584845829345280`; its MEE6 Verify message exists | A newcomer without Verified cannot reach the action intended to obtain it |
| Essential instructions have the same access problem | No-role profile cannot view rules `1556204779531673723`, joining-kfc `1411545672313737346`, or announcements `1411545639392645192` | Welcome links and the joining path lead to inaccessible destinations |
| Three defaults cannot be opened by the no-role profile | verification, joining-kfc and announcements appear in the current 16 defaults | Selecting a channel as a default does not grant access to it |
| The automatic welcome destination is hidden too | System channel newcomers `1411533816060842016` cannot be viewed without a role | Arrivals may miss the existing welcome |
| The old role menu is incomplete even after verification | Verified can view role-select `1411545206704308235` but cannot read message history there | Its existing MEE6 instructions/menu may remain unavailable |
| Booster access bypasses Certified on guild channels | `KFC Boosters` `1411708661344243782` explicitly allows View Channel on the Guild Members category and ten children | A member with Boosters and no Certified can read guild conversations |
| The old menu advertises a Booster choice | MEE6 message `1413345334452551730` offers KFC Booster, plus old NEEDED class/profession guidance | Review and disable this self-service route; the dashboard's actual role mapping remains unverified |
| MEE6 role hierarchy permits assigning Verified | MEE6 holds Bot Automation at position 25; Verified is position 7; Manage Roles is effective | Role order is not the confirmed failure; the hidden gate is |

The ten Booster-readable guild channels are crispy, conduct-cases,
guild-loot-priority, guild-bank, Guild Lounge, guild-macros, achievements,
world-pvp-coordination, attendance-cases and guild-crafters. Their private
message contents were not read. Staff channels remain restricted in the
ordinary-role profiles checked.

`@everyone` lacks server-wide View Channel, while Verified grants that bit.
The broken entry channels have no explicit public View Channel grant; this is
not fixed by rearranging defaults or adding another welcome message.
Giving @everyone server-wide View Channel would also change access to other
unclassified channels, so use explicit channel policies instead.

The no-role profile can view 68 non-category entries and Verified can view
108; two of the latter lack Read Message History. These are permission
calculations, not sidebar screenshots. They confirm
a broken entry path; they do not prove how many channels a particular user saw.
An affected member's pending state, timeouts, individual overwrites and client
subscriptions were not supplied. MEE6's challenge and successful role grant
still require an ordinary human test.

Private evidence: `.data/kfc-verified-access-20261031/` contains
`access-audit.json`, `snapshot.json` and `gate-investigation.json`. The original
server snapshot is under `.data/kfcbot-audits/1411533815356194968-6KJZ73/`.
No credentials are included.

## Target access model

| State | Entry and public information | Community participation | Guild Members | Staff |
| --- | --- | --- | --- | --- |
| New member / screening pending | Welcome, rules, help, schedules and joining instructions readable | Held by native rules screening until completed | Hidden | Hidden |
| Verified community member | Same information, plus their chosen edition/resources | Normal community access | Hidden | Hidden |
| KFC Certified | Community access and approved guild spaces | Normal community access | Allowed | Hidden unless separately authorized |
| Authorized staff | As needed for duties | As needed for duties | Explicit staff access | Explicit staff access |

The TBC application channel is applicant-facing: Verified members can read its
template and submit an application without Certified. Only officer acceptance
grants guild access. Forever has a separate application route. Do not classify
the TBC intake as staff-only or make its pinned template read-only for applicants.

Reuse Verified `1412584499740672051` and KFC Certified
`1411680778185736242`. Verified means the server entry check was completed;
it does not mean guild acceptance, identity verification or a confirmed raid
seat. Certified is granted and revoked only through the authorized officer
process. Applications, class/spec choices, PUG status, subscriptions, customer
roles, boosting interest and verification cannot grant Certified access.

Public community channels stay readable independently of the Verified badge.
Discord's native pending state controls participation before rules acceptance.
The badge must not become another lock that leaves a screened member stranded
when a bot is unavailable. Existing role-gated resources need classification
before changing Verified's current global permission; do not expose historical
conversations as a side effect.

Native Rules Screening blocks pending members from talking, reacting and
DMing server members. A role label alone is not that check.
[Discord Rules Screening FAQ](https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ).

## Rollout order

### P0: close the guild access exception

1. Inventory the Guild Members category and every child, Staff, and any private
   guild channels outside those categories, including individually gated archive
   channels. Save exact current overwrites and effective access.
2. Keep @everyone denied View Channel in guild areas. Permit Certified,
   authorized management and necessary bot access. Keep Staff separately gated;
   Certified alone must not grant staff access.
3. Remove the Booster View Channel grant from the Guild Members category and
   the ten affected children. Preserve unrelated permission bits, role
   assignments, histories and channel IDs. Keep any existing legitimate
   management/bot grants. Review explicit user exceptions separately.
4. Audit class, combat-role, profession, applicant, PUG, customer and alert roles
   and their combinations. A deny on Verified cannot neutralize an allow on
   Boosters; Discord combines role allows after role denies. Role position does
   not solve this. Validate the actual private-channel policy.
5. Check MEE6/Dyno self-service bindings. Remove the old Booster shortcut's
   privileged access path and prohibit Certified from self-selection. Do not
   delete the Booster role or strip existing members' other roles.

This repair needs both parent and child changes. Blindly synchronizing the
category would erase legitimate child exceptions, while changing only the
category would leave unsynchronized children exposed.
[Discord permission precedence](https://docs.discord.com/developers/topics/permissions#permission-overwrites).

### P0: make the existing verification path reachable

1. Explicitly allow View Channel and Read Message History on start-here,
   verification, rules, joining-kfc, announcements and the public help route.
   Make instruction channels read-only for ordinary members; preserve staff
   and publishing permissions. Check every link from the welcome.
2. Retain MEE6's existing Verify flow during recovery. Confirm in its dashboard
   that it assigns only the existing Verified role, then test a fresh ordinary
   member's click, challenge, resulting role and community access. The bot API
   cannot prove the dashboard mapping or complete that human challenge.
3. Replace the misleading promise to see all channels with community access;
   explain that private guild spaces require officer approval and Certified.
   MEE6 owns that message; update it through its dashboard, not another bot's
   message-edit endpoint.
4. Route automatic welcomes to the visible start-here page. Keep help reachable
   during a verification outage. Preserve existing Verified and Certified
   members' access while repairing the entry path.

### P1: one coherent verification and onboarding flow

Recommended steady state: native Rules Screening owns rule acceptance, native
onboarding owns channel discovery, and Verified is a synchronized community
status. Transition from the repaired MEE6 gate only after the native flow is
working. Avoid requiring a native acceptance and a second mandatory MEE6
challenge for the same entry check.

- Confirm/enable Rules Screening in Safety Setup. The captured guild features
  do not report `MEMBER_VERIFICATION_GATE_ENABLED`; this audit does not establish
  the rendered screening state. Check it in a real new-member session.
- Assign Verified only after a documented completion signal. First inspect
  whether the existing bot supports a tested post-screening role assignment.
  Otherwise implement a small scoped synchronizer using current membership
  and the native `pending` transition; missing state must remain unknown.
  No automatic role grants on arrival, guessed timers or retroactive consent.
- Keep the verification automation below Certified in the role hierarchy and
  restrict its writer to the exact guild and Verified role. Make retries
  idempotent; log outcomes, preserve role removals pending staff review, and
  recheck actual membership before granting anything.
- The existing raid/calendar workers do not implement member-update handling.
  The bridge Gateway currently subscribes to message events for a separate
  purpose; do not couple verification to that bridge or assume it already
  observes screening. A new member-update listener requires the appropriate
  `GUILD_MEMBERS` intent and explicit lifecycle/reconnect handling.
- Preserve class/role choices as optional after entry. Remove the obsolete
  NEEDED instructions and duplicate compulsory menu only after checking its
  bindings; retain unrelated MEE6 features.
- Review current 16 defaults and reduce them to useful permanent destinations.
  Keep date-specific leveling posts, voice rooms and separate application
  destinations out of the shared default set.

Recommended defaults are start-here, rules, announcements, raid-calendar,
general, introductions, new-player-help, looking-for-group and one public
community raid lobby. The first four are read-only; the last five are writable
after native screening. The old shared raid-chat now serves TBC, so retain that
edition chat and provision one small neutral raid lobby if no suitable existing
public equivalent is found. Never use a guild conversation to meet the quota.
Keep verification visible during migration, then retain it as a read-only
redirect after native cutover.

Discord requires at least seven defaults, including five where @everyone can
view and send. A strict Verified-only permission gate on every community chat
would conflict with that onboarding requirement. Use native screening for the
public core and explicit Certified permissions for private guild areas.
[Discord Community Onboarding FAQ](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).

Documented membership signals and intent requirements:
[Guild member pending state](https://docs.discord.com/developers/resources/guild#guild-member-object),
[Guild Member Update](https://docs.discord.com/developers/events/gateway-events#guild-member-update).

## Implementation tasks and safeguards

| Task | Existing area / proposed deliverable | Status |
| --- | --- | --- |
| Current access and gate audit | Existing Discord audit reader, scoped private evidence | Completed |
| Reviewed access policy | `content/kfc-access.ts` with role IDs and explicit public/application/guild/staff scopes | Implemented |
| Pure effective-access analysis and proposed patch validation | `lib/kfc-access.ts`, reusing the existing permission evaluator | Implemented and live-verified |
| Scoped reconciliation | `scripts/kfc-access.ts`: GET-only preview, reviewed apply, exact IDs, drift checks, journal/readback and recovery evidence | Applied; initial 19 updates plus scoped corrections recorded in release |
| Privacy and entry regressions | `tests/kfc-access.test.ts` covering public/Verified/Certified, Booster and combined-role cases | Implemented; focused suite passes |
| Align readiness and onboarding checks | `lib/kfc-readiness.ts` uses current policy/bindings instead of its old exact seven defaults and legacy routes | Implemented and tested |
| MEE6 gate/dashboard cleanup and fresh-member trial | Reachable original Verify flow, two pinned guides, public native welcome destination | Access/guidance live; MEE6 dashboard and human challenge unverified |
| Native screening and Verified synchronization | Guarded native onboarding operator; existing MEE6 role mechanism preserved | Cutover awaits Rules Screening; automatic native role sync not claimed |
| Real client acceptance and updated owner checklist | Setup steps documented in release; desktop, phone and negative privacy trial | Owner trial pending |

Reconciliation should edit only reviewed permission fields. An applying run
must stop when a channel/role, overwrite fingerprint or audience differs from
the preview. Read back changed policies and recompute effective access for all
tested profiles. Uncertain channel creation must be reconciled from its receipt
before retrying. Preserve manual moderator restrictions, private histories and
all member rosters. Do not rerun the old whole-community migration.

Permission drift detection should report and hold unreviewed changes; it must
not continuously fight an administrator's edits or mass-reset whole categories.
Verified synchronization must never perform Certified grants, change raid
approval or rewrite website guild membership. Website membership, Discord guild
membership, application acceptance and a raid seat remain separate records.

## Acceptance criteria

- A fresh ordinary account can open the invitation, welcome, rules, verification
  or its replacement, joining instructions and help. No invisible prerequisite.
- Native rules acceptance and any retained challenge have honest result/error
  states; an unavailable bot leaves visible help rather than a dead end.
- Forever, TBC, both and browsing choices add the expected visible channels on
  desktop and phone. Old subscribers can rediscover the new entry routes.
- No-role, Verified, every exposed self-service role and their relevant unions
  cannot view guild messages or connect to private guild voice without
  Certified. Test Boosters both alone and combined with Verified/classes.
- Private-channel policy itself contains no untrusted role allow; checking one
  combined profile alone is insufficient to prove all combinations are safe.
- Certified members retain their intended guild access; Certified without
  Verified continues working for existing members. Staff remains separately
  restricted. Review actual member-specific overrides, not just role profiles.
- Read-only instructions cannot be posted to by ordinary Verified/Certified
  members. Selected raid forums still allow intended signup/reply actions.
- A category-only patch cannot leave child leaks, and a bulk sync cannot erase
  existing staff or bot exceptions. Rollback restores exact captured fields.
- A verification retry, missing pending signal, revoked membership or moderator
  removal cannot grant unintended roles. No self-service path grants Certified.
- Existing schedules, signups, loot rules, subscriptions and applications retain
  their identities and audiences. Tests, live readback and actual fresh-member
  observations are required before declaring the join flow fixed.
