# Non-LFG Channel Experience Release

October 1, 2026. Applied to WoW Forever Discord through its bot, then verified
with independent configuration reads and an idempotent second pass.

This implements the non-LFG portion of the
[channel experience plan](discord-channel-ux-plan.md). The four faction LFG
forum conversions, structured group bot, resource-search commands and website
projection are separate releases; this document does not claim they are live.
The later [group-finding release](discord-group-channel-release.md) now records
the faction conversions and neutral contributor attribution; the structured
bot and website projection remain pending.

## Live Changes

| Area | Implemented |
| --- | --- |
| Navigation | Start Here, Community, Classes, Social & Media and Safety & Appeals categories; ordered faction, tool, trading and social destinations; Operations and Archives added at the bottom |
| Newcomers | Original system-channel ID retained as introductions; the other newcomers channel becomes new-player-help; short general/PvP/Hardcore/off-topic topics |
| Onboarding | Seven actual defaults, including five ordinary writable text channels; obsolete category/activity-checker/unresolved defaults removed; existing questions, BOT options, role mappings, enabled state and advanced mode retained |
| Tools | Native list-view tool-directory and tool-support forums, required member-selectable tags, staff-only evidence/status tags, seven-day inactivity, bounded creation cooldown and unrestricted ordinary replies |
| Directory content | Three explicitly bot-authored real WoW Trader component entries: public web workspace, approved Collector pilot and maintainer-alpha Companion; readiness and test limitations remain distinct |
| Support/testers | Guidelines link the existing five contribution assignments and require assignment/version context; one issue/result conversation with follow-up retests; no fabricated queue, results or compatibility badge |
| Classes | Nine existing chats retained with concise context/build guidance and the reviewed guide hub; no empty spec channels or invented class builds |
| Trading | Both faction chats remain text, with region/ruleset/terms/availability guidance and upload-dependent Trader freshness |
| Media | Third-party Wowhead label corrected; creator, video, meme and real-life topics clarified; existing feed destination IDs and slowmode settings preserved |
| Safety | Member-readable reports/appeals retained; list layout and staff-only process tags; private-evidence boundaries; reviewed-alerts explicitly distinguishes preserved legacy entries from certified findings |
| Archives | Original addon listings, original support and the unused shared pilot are read-only for ordinary members; original IDs, history, visibility and hidden threads are retained |
| Operations | Existing private review and server-updates destinations moved without permission syncing; activity-checker remains accessible with its existing permissions and ID |

Live destinations:

- [tool-directory](https://discord.com/channels/1554316932948172940/1555101552463716373)
- [tool-support](https://discord.com/channels/1554316932948172940/1555101566728409108)
- [introductions](https://discord.com/channels/1554316932948172940/1554316934252593245)
- [new-player-help](https://discord.com/channels/1554316932948172940/1555036794016243773)

One promotional post per creator per rolling 24 hours is a manual policy, not
new automation. Existing Streamcord configuration was not changed or certified.
No events were invented, no user posts were imported, and no chat notices or
cross-server disclosures were restored. The bridge, commands, KFC configuration
and application services were not changed by this release.

## Verification

- All 43 focused audit, cleanup and experience tests passed. This includes
  regression tests for permission-entry reordering and onboarding ID-set ordering.
- Project typecheck passed; focused ESLint passed with zero warnings.
- Eight referenced public resource URLs returned HTTP 200.
- Independent live reads confirmed all fixed name/topic targets, ordinary-member
  forum view/post/history/reply access, read-only old chats and private operations.
- The final inventory has 65 channels/categories: all 61 pre-release entries
  plus two forums and two categories. This release deleted none.
- Original guild roles, system/rules channel bindings, onboarding questions,
  mappings, mode and enabled state were unchanged. Existing recruitment tag IDs
  were preserved; three directory entries have recorded bot ownership.
- A second apply reported zero changes and 49 already-matching items. No
  uncertain creation remains, and no duplicate product entry was published.

Two conservative stops exposed API ordering behavior. Permission overwrites
were reordered without changing their grants/denies; Discord also reordered
the same seven default-channel IDs. Checks now compare permission identity and
values and the exact unique default set, preserving meaningful order checks for
forum tags and category layout. Original questions were independently compared
before declaring onboarding verified.

Configuration checks do not prove native desktop/mobile usability, staff response
coverage, third-party dashboard settings or game-client compatibility. No new
application build, production restart, commit or push was performed.

## Archive Discrepancy

The previous leveling text archive, `1554898196721967137`, was already absent
from the first audit of this release. A targeted read with Administrator access
returned HTTP 404. The owner's instruction to preserve it remains recorded;
this operator never deletes a channel and did not recreate an empty substitute.
Review the server's channel-deletion audit log separately if its disappearance
was unintended. The existing native group-leveling forum remains available.

## Remaining Human And UI Work

1. In Server Settings > Onboarding > Server Guide, review the current rules,
   FAQ and useful-links content, then designate those read-only channels as
   resources. Add three tasks: choose faction/class spaces, find a group, and
   locate rules/help. There is no documented public bot API for this Guide UI
   configuration; private client endpoints were not used.
2. Assign actual help, tool/support and safety stewards and verify their effective
   forum permissions. Staff-only tags need Manage Threads; do not assume a role
   named Moderator has it or promise coverage without a rota.
3. Build class resource indexes with willing qualified reviewers, then schedule
   genuine help/build/testing sessions with confirmed hosts. Crafting, creator,
   gallery-video, RP and extra voice channels remain demand-gated experiments.
4. Refresh website onboarding copy and dated screenshots in the next scoped
   content release. Public website text still contains older channel labels;
   Discord IDs and the existing public invitation remain stable.
5. Remove the bot's temporary Administrator grant after owner review. Retain only
   the necessary channel-scoped management, message/thread and onboarding
   permissions for approved ongoing duties. Do not change the intentional staff
   Administrator role named Rogue or the existing BOT onboarding traps.

Use real testers to check finding help on mobile, creating a support case,
retrieving a product entry and returning to a solved thread. Record unknown
outcomes as unknown; activity volume is not proof a member found useful help.

## Operator And Recovery

The fixed scope is in `content/discord-channel-experience.ts`; permission,
tag-merging and read-back checks are in `lib/discord-channel-experience.ts`.

```sh
npx tsx scripts/discord-channel-experience.ts
npx tsx scripts/discord-channel-experience.ts --apply
```

Default mode only reads Discord. Apply requires the approved application/server
credentials from existing private environment configuration. It acquires a
private operator lock, captures a configuration snapshot, journals before/after
updates, and records created IDs in mode-0600 recovery state under the gitignored
`.data/discord-channel-experience` directory. Tokens and user message history are
never stored by the operator. New messages contain only the fixed product copy;
their ownership and content are checked without rewriting owner edits.

An uncertain creation remains pending and blocks blind retry. Resolve it against
the journal and Discord before clearing recovery state; never remove the state
file to force a rerun. HTTP rate limits are bounded, and retried channel/default
writes recheck their protected baseline before proceeding.

Rollback is owner-reviewed restoration of the selected recorded fields, not a
mass snapshot overwrite. Preserve intervening edits and any posts in new forums.
Retain new forums with member content and restore the former destination only
after verifying access; do not delete history to make the channel count match.
