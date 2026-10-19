# Forever And TBC Event Pilot

## Channel Selection Permissions

Only the owner of the WoW Forever Discord server or a member with its current
Administrator permission can discover and override event posting channels.
The create page and channel API check Discord permissions; event creation checks
them again for explicit channel selections, including configured private targets.
Ordinary members see the configured destination and submit without a channel
override. Member beta defaults to `FOREVER_RAIDS_BETA_DISCORD_CHANNEL_ID`;
`FOREVER_RAIDS_DISCORD_CHANNEL_ID` remains the separate private test destination.
Permission lookup failures do not enable channel selection. Existing Discord
visibility confirmations and per-channel bot/organizer permission checks remain.

The private event manager supports `forever` and `tbc`. TBC means Burning Crusade
Classic, including the Anniversary pilot, not retail or other editions. The public
community website remains Forever-focused.

## Browser Workflow

1. Sign in through Discord at `/raids`. In member beta, current membership in
   either KFC Guild or WoW Forever Discord is required for both editions; old
   private events remain restricted.
2. Add a TBC character under `/account/characters`: select TBC Classic, enter the
   in-game name and realm, then select class/spec, region, faction and ruleset.
   TBC names use 2-12 letters; Forever retains first/last-name support.
3. Create an event and choose a raid preset or custom activity. Karazhan and
   Zul'Aman default to 10 players; the other seven TBC raids default to 25.
   Compositions and capacity are editable. Presets do not assert content is
   unlocked on a particular realm or phase.
4. Regular members are routed to the dedicated community beta channel automatically
   and confirm that their event/character roster will be visible there.
   Server administrators can override that destination using the live dropdown,
   filtered by channel, category or server name. Shared KFC/Forever destinations
   require confirmation that the event and character roster will be visible
   there. Roster updates edit the same bot post.
5. Selecting a raid automatically chooses its published catalog, when available.
   All nine TBC raids now have partial source-reported catalogs (775 raid-item
   entries; see `content/raid-catalogs/tbc/README.md`). Set Tank SR, Healer SR and
   DPS SR separately, then search/select host hard reserves and duplicate rules.
   Without a catalog, roster experiments work but no fabricated loot is available.
   Signup leads to member SR selection in the browser and native Discord picker;
   choose items and explicitly save them. Allowances follow the saved signup role.
   Use **Open signup / select roster later** to collect everyone immediately and
   choose confirmed seats later. This is separate from website publication approval.
   Automatic admission still assigns seats immediately and benches overflow;
   organizer approval still creates pending signups. Existing events retain their
   original mode and loot policy until their creator edits them on the preview.
6. Lock and export the roster/reserves when ready. Native exports are not yet an
   assertion of compatibility with third-party loot addons.

To approve website publication, a Discord Administrator right-clicks the delivered
bot post and selects **Apps > Approve event**, or runs
`/approve post:<exact Discord message link>` in that server. `/admin/raids` manages
catalogs, not event approvals. Approved TBC events stay in the private planner.

## Edition Boundaries

- Existing records, requests and immutable character snapshots default to Forever.
  Legacy request hashes and locked exports remain readable and unchanged.
- TBC realms are normalized to lowercase. Edition, realm, region, faction and
  ruleset must all match to join. Identical names in different realms/editions
  identify separate characters.
- Reviewed catalogs remain immutable. Wowhead imports accept exactly
  `forever-wowhead-loot-candidates.v1` / `game: forever` with `/forever/` sources,
  or `tbc-wowhead-loot-candidates.v1` / `game: tbc` with `/tbc/` sources. English
  Wowhead guide/item URLs, ID agreement and source provenance remain required.
  TBC also accepts `tbc-atlasloot-loot-candidates.v1` with the pinned licensed
  source and mandatory matching provenance. Its item URLs still use `/tbc/`.
- Both service and database reject catalogs from the wrong edition or raid.
  Open event edition/realm may change only when existing signups remain compatible.
  Locked snapshots and original creation identity remain immutable.
- Existing v1 exports remain immutable. New TBC exports use `tbc-raid-loot.v2`
  or `tbc-event-roster.v2`; they include `game`, `realm`, the pinned composition
  rule revision, and each accepted player's party and slot. Forever uses the
  equivalent `forever-*.v2` formats for newly locked events.
- `/approve` accepts approved destinations in the invoking admin's server, never
  arbitrary links or another server's admin permissions. Approved TBC experiments
  remain in the private planner, not Forever's public LFG.

## Approved Discord Destinations

Keep `FOREVER_RAIDS_DISCORD_CHANNEL_ID` as the current private test channel. Add
other private pilot channels to the ignored environment file:

```dotenv
FOREVER_RAIDS_DISCORD_DESTINATIONS=[{"channelId":"1556000000000000011","guildId":"1556000000000000010","label":"KFC private raid test"}]
```

These example IDs are not live destinations. `guildId` defaults to the main
community server when omitted. Channel IDs must be unique, including the default.
Only labels, server/channel IDs and visibility reach the browser; bot credentials stay server-side.
Restart the website and projection worker after config changes. The worker
processes each destination separately.

Each configured private destination must be a guild text channel, deny `View Channel` to `@everyone`
and explicitly allow viewing only to pilot members and the bot. The bot checks
that the organizer belongs to the destination's server. Removed destinations
cannot be selected or retried.

### Community Feedback Channels

The picker also discovers text/announcement channels in the configured servers
and `FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS` (KFC by default). The organizer and
bot must both belong to the destination server. Effective permissions include
role and member overwrites: both need View/Send; the bot additionally needs Embed
Links, Attach Files and Read Message History. NSFW, voice, forum and thread targets
are excluded. Category labels disambiguate duplicate names. A failed server
lookup does not remove eligible channels from the other server.

```dotenv
FOREVER_RAIDS_DISCORD_FEEDBACK_GUILD_IDS=1411533815356194968
```

An authenticated, no-store endpoint supplies the list. Community creation is
validated against a fresh bot lookup before a database transaction and requires
explicit organizer confirmation, recorded with the publication and audit. The
worker rechecks posting permissions before every delivery. Private posts retain
their strict pilot-channel gate; changing channel permissions does not make their
rosters public. Existing events are not moved to a newly selected destination.

Participants see the destination and roster visibility in the browser signup
acknowledgement. Native slash-command joins to community-visible events direct
members to that acknowledgement first. In member beta, current KFC Guild and WoW
Forever Discord members can use community events. Membership in either server is
sufficient for the website gate; destination-specific posting permissions remain
separate.
Community posts require organizer confirmation, including the fixed default.
Discovery itself never posts messages. Creators edit open event settings from the
preview; changes retain signups/Discord identity, reset website approval and require
players to review the new rules. The bottom change history shows exact changes
and timestamps. Conflicting edits fail without altering participation.

## Artwork And Delivery

The 50-cover Forever pack is preserved. Nine distinct TBC raid covers live under
`public/images/raids/tbc/`, with recorded prompts and provenance. These are
interpretive fan artworks, not official screenshots or encounter diagrams.
Artwork lookup includes edition: Forever and TBC Hyjal use separate files.
Unknown/custom activities use a neutral type fallback, not a guessed raid image.

The form and detail view display covers. Bot posts attach the selected WebP and
reference it in the embed, so localhost testing does not depend on Discord fetching
a local URL. Attachment paths are restricted to the shipped artwork registry.

## Local Verification

```sh
npm run db:generate
npm run db:migrate
npx tsx --test tests/forever-raids.test.ts tests/raid-editions.test.ts tests/raid-channel-discovery.test.ts tests/forever-raid-discord.test.ts tests/forever-event-artwork.test.ts
npm run test:raids:db
npm run test:raids:e2e
FOREVER_RAIDS_E2E_DISCORD=true npm run test:raids:e2e
npm run typecheck
npm run build
```

Migration `023_raid_game_editions.sql` adds legacy defaults and strict catalog and
identity constraints. Migration `024_raid_feedback_channels.sql` records explicit
community visibility and confirmation. Applied migrations are not rewritten. Database/browser
tests refuse non-local database targets. Discord tests use synthetic destinations
and do not send real messages. Browser tests use `.next-raids-e2e` and port 19306,
leaving the user's development server on port 19300 usable.

No production deployment or automatic community posting is implied. Production
continues to use the existing PM2/local-Postgres arrangement, not Docker.

The current hosted member-beta activation is recorded separately in
[the release notes](raid-native-release.md). The commands above are local checks,
not deployment commands. To run the additional member-beta browser case:

```sh
FOREVER_RAIDS_E2E_DISCORD=true FOREVER_RAIDS_E2E_ACCESS_MODE=members npm run test:raids:e2e -- --grep 'Member beta admits'
```

## Sources

- [TBC raid overview and sizes](https://www.wowhead.com/tbc/guide/raids-overview-burning-crusade-classic)
- [Blizzard's TBC Classic deep dive](https://news.blizzard.com/en-gb/article/23625673/world-of-warcraft-burning-crusade-classic-deep-dive)
- [Discord multipart uploads and embed attachments](https://docs.discord.com/developers/reference#uploading-files)
