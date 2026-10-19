# Group-Finding Channel Release

October 1, 2026. Live in WoW Forever Discord, with independent read-only
verification and a final idempotent apply reporting zero changes.

This completes the native group-finding portion of the
[channel experience plan](discord-channel-ux-plan.md), following the
[non-LFG release](discord-channel-experience-release.md). It does not implement
automatic signup controls, reminders, website projection or forum bridging.

## Live Destinations

| Purpose | Alliance | Horde |
| --- | --- | --- |
| Dungeon/questing session | [lfg-pve](https://discord.com/channels/1554316932948172940/1555114488229797928) | [lfg-pve](https://discord.com/channels/1554316932948172940/1555115605986779228) |
| Battleground/world PvP session | [lfg-pvp](https://discord.com/channels/1554316932948172940/1555115561028157460) | [lfg-pvp](https://discord.com/channels/1554316932948172940/1555115622935822336) |
| Hosted session with roster | [scheduled-runs](https://discord.com/channels/1554316932948172940/1554327396990320741) | [scheduled-runs](https://discord.com/channels/1554316932948172940/1554327956329865256) |
| Player seeking a guild | [lf-guild](https://discord.com/channels/1554316932948172940/1554327239733157958) | [lf-guild](https://discord.com/channels/1554316932948172940/1554327900998869092) |
| Guild recruiting players | [guild-recruitment](https://discord.com/channels/1554316932948172940/1554327206396690432) | [guild-recruitment](https://discord.com/channels/1554316932948172940/1554327927750000661) |

Recurring teams use the existing shared
[group-leveling forum](https://discord.com/channels/1554316932948172940/1554946655244263628).

All eleven forums use list layout, required member-selectable tags, a 60-second
post-creation cooldown and zero default reply slowmode. Single-session LFG uses
creation-date sorting and 24-hour inactivity archiving. The six recruitment/run
forums use creation-date sorting and seven-day inactivity; recurring leveling
retains activity sorting and seven-day inactivity. Settings apply to new posts;
existing thread-level defaults are not rewritten.

Templates distinguish the activity from the character ruleset. Sessions need an
absolute date/start with a named timezone, duration, spots and contact. PvP asks
for an objective, not a dungeon. Recurring teams include regular availability,
compatible levels and missed-session expectations. Guild listings include
schedule, current needs, contact and confirmation date, without home-guild
preference. Hosts choose content actually available to them.

Scheduled runs retain their forum IDs, renamed from pugs-adverts. Each session
gets a new dated post and one authoritative roster. Hosts confirm accepted and
waitlisted players; replies, reactions and Discord Event Interested are not
accepted places. Status is manual, never inferred from a passed start time.

The six guild/run tag sets retain every previous tag ID. Scheduled runs add
In progress and Completed, reaching 14 tags. Guild and player-search forums keep
nine each; leveling keeps all fourteen. New PvE/PvP forums have 16/15 tags.
Native required-tag settings do not enforce every template field or tag category.

## Navigation And Neutrality

Both faction categories follow the same order: posting rules, PvE LFG, PvP LFG,
scheduled runs, looking for guild, guild recruitment. The existing faction
onboarding answers now subscribe members to actual destinations plus leveling,
rather than category IDs. Original question/option IDs, titles, emojis, BOT
traps, role assignments, defaults, enabled state and advanced mode are retained.

Two pinned current guides in post-rules clarify that forum-thread coordination
replaces the older blanket DM-only instruction. Original owner-written messages
remain untouched. Trading restrictions and the existing six-hour bump policy
are retained; creation cooldown is not automated bump enforcement.

The three known bot-authored Trader directory entries now credit
**Open source contributors**, not a KFC team. Distribution, security and testing
boundaries are unchanged. This attribution is not a newly verified license or
permission to redistribute software. Actual authoritative product URLs remain.

## Preservation And Verification

The four former faction LFG text channels retain their IDs, messages and threads
under Archives, with faction-specific names and forum links. Ordinary members
cannot write or create/reply to threads there; role/member visibility and history
access are preserved. New forums copy source access and age restrictions without
category permission syncing. No channel or message was deleted or imported.

Independent live reads confirmed 69 channels/categories, retaining all 65
pre-release IDs, all original roles and guild bindings, forum tags/settings,
ordinary-member post/reply access, read-only archives, onboarding mappings,
two pinned guides and three neutral contributor entries. The final apply reported
zero changes and 25 already-matching items. No uncertain creation remains.

All 60 focused audit/cleanup/experience/group tests passed. Regression coverage
includes ignored forum-creation flags/defaults, guild-feature list reordering,
source permission copying, archives, tag identity, emoji payloads, BOT trap
preservation, concurrent-edit stops, bounded retries and sanitized errors.

Configuration checks are not a real member's desktop/mobile usability test or
certification of third-party signup/bump enforcement. No sample groups, events,
participants, personal-account automation or automatic bridge activity were used.
KFC configuration and application services were untouched; no commit, push,
application build or deployment was performed for this native Discord release.

## Operator And Recovery

```sh
npm run bot:groups
npm run bot:groups -- --apply
```

Preview is GET-only. Apply is restricted to the approved application and Forever
server, with private credentials read from existing environment configuration.
It captures audits, uses a private lock and mode-0600 state/journals under the
gitignored `.data/discord-group-channels` directory, journals before mutations,
rechecks concurrent edits and reads back each operation. Secrets are not logged.

The first creation demonstrated that Discord ignored the required-tag flag and
zero reply default. The check stopped before source archival. Configuration now
uses a separate verified PATCH before archiving. Its recorded existing forum
was reconciled, not duplicated. Guild features also arrived in a different
array order; verification compares that set while retaining exact setting and
role-grant checks.

An uncertain creation blocks blind retries. If its returned forum ID was already
recorded and its original source is unchanged, an operator can explicitly run:

```sh
npm run bot:groups -- --apply --reconcile-created
```

This validates the known forum identity/access and finishes its settings before
clearing pending state. It cannot adopt an unrecorded result or reconcile an
uncertain guide message. Those cases require owner-reviewed journal/API
reconciliation; never delete state to force a duplicate creation.

Rollback means restoring selected recorded fields after reviewing intervening
edits. Preserve new member posts and existing history; do not delete replacement
forums to obtain the previous channel count.

## Remaining Work

Use real desktop/mobile testers to create and reply to a group post, select
both factions, find a guild listing and return to a scheduled-run roster.
Assign actual faction stewards and inspect Raid-Helper/bump enforcement before
claiming automated workflows. Refresh website channel names and screenshots
through the guarded content-publication workflow. Structured group bot forms,
signup controls and reminders remain the next application release. Server Guide
resource setup remains an owner UI task. Remove the temporary bot Administrator
grant after review, without changing intentional staff roles or onboarding traps.

API references: [channel modification and forum flags](https://docs.discord.com/developers/resources/channel#modify-channel),
[guild channel creation and ordering](https://docs.discord.com/developers/resources/guild#create-guild-channel),
[onboarding payloads](https://docs.discord.com/developers/resources/guild#modify-guild-onboarding),
[current message pin endpoint](https://docs.discord.com/developers/resources/message#pin-message).
