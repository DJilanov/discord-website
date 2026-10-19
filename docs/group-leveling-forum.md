# Group Leveling Forum

September 30, 2026: the owner requested post-style group leveling instead of a
continuous message board in WoW Forever Discord.

## Live Configuration

The [October 1 group-finding release](discord-group-channel-release.md) further
clarifies recurring schedules, compatible levels, missed-session expectations
and routing to one-session forums. The existing forum ID, fourteen tag IDs,
settings and permissions remain unchanged.

October 1 follow-up: the native forum now sits under Community. The old text
archive described below is absent from the current inventory and returned 404
with Administrator access before the non-LFG release completed. That release
did not delete or recreate it; see [the discrepancy record](discord-channel-experience-release.md).

- [group-leveling](https://discord.com/channels/1554316932948172940/1554946655244263628)
  is a native Discord forum (type 15) under Community (formerly General chats).
- List layout, latest-activity sorting, at least one tag required, seven-day
  inactivity archive, 60-second post-creation cooldown, no reply slowmode.
- Tags: EU, NA, Other, Alliance, Horde, Normal, PvP ruleset, Roleplaying,
  Looking for group, Looking for players, Full, Closed, Relaxed, Fast leveling.
- Guidelines provide a group template covering region, faction, ruleset, level,
  class, schedule/timezone, pace, open spots, voice preference and Discord contact.
- Existing channel permission overwrites were preserved. Effective ordinary
  member permissions allow viewing, creating posts, reading and replying.
- No starter posts, imported messages, announcements or mentions were published.
  KFC channels, roles and onboarding were not changed.

Discord's [channel API](https://docs.discord.com/developers/resources/channel#modify-channel)
does not support an in-place text-to-forum conversion. A new forum was created;
the former text channel `1554898196721967137` was renamed
`group-leveling-archive` with a topic linking to the forum. Its permissions remain
unchanged; the archive name does not mean Discord enforces read-only access.

The old channel had no visible messages, active threads or archived public
threads. Inspection of archived private threads returned 403. The old channel
was therefore retained without deleting any content. The owner subsequently
chose to keep it as an archive; no deletion was authorized. Bot credentials and
message contents were not logged.

## Bridge State

The old leveling text pair `e0c782ed-8be6-4d68-a585-558602adbbd0` was retired
through the audited owner control after confirming zero unresolved copies. The
worker finishes the retiring-to-retired transition asynchronously. Historical
imports had already been rolled back. Runtime remains `cleanup_only`.

Do not replace the old pair's destination ID with the forum ID: the existing
bridge only supports text channels, not forum posts or their reply threads. The
new forum is not connected to KFC. Future forum synchronization requires its own
explicit design and authorization; this request does not authorize it.

## Verification

The live Discord API confirmed the new type, parent, layout, sorting, tag IDs,
required-tag flag, guidelines, inactivity duration and permission overwrites.
Effective member posting/reply permissions were checked with the existing
permission evaluator. Discord omitted the zero reply-slowmode value and did not
retain the required-tag flag on creation; a targeted edit set the flag, followed
by a fresh read verifying it. No duplicate forum was created on retry.

This was a live Discord configuration change, not an application-code release.
No application rebuild, restart, commit or push was required. No personal-account
automation or fabricated user post was used to test the forum.
