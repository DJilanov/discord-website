# Raid Party Roster and Composition Guidance

Production release: `.next-release-party-roster-20261004-r6`, activated October
4, 2026. The creator's event page exposes **Roster builder** beside **Edit event**
on desktop and in the mobile action row.

## Delivered behavior

- Combat rosters render as deterministic parties of five. A final partial party
  respects the event capacity rather than inventing extra seats.
- Organizers can reorder players and move them between parties with drag and drop.
  Every row also has a native group selector for keyboard, touch and assistive
  technology use.
- Mobile party cards keep all five positions visible while compressing unused
  positions into a five-cell strip. The group selector remains the accessible
  movement fallback.
- Layout saves are atomic and event-version guarded. The server requires exactly
  one valid position for every accepted signup and rejects stale, duplicate or
  out-of-capacity assignments.
- Newly accepted players receive the first free party slot. Benched and withdrawn
  players release their slot. Capacity changes clear stored placement so the
  deterministic normalizer can rebuild a valid layout.
- Discord event panels use the stored party layout. They remain within Discord's
  25-field limit and link overflow users back to the canonical website roster.
- Newly locked snapshots use the `*.v2` schema and include `compositionRevision`,
  `partyIndex` and `slotIndex`. Existing v1 payloads and checksums are not changed.

## Composition model

The first rulesets are pinned as:

- `tbc-anniversary-2026.10.1`
- `forever-preview-2026.09.15`

The analyzer scores party-local support against the players who benefit, penalizes
duplicate providers and mutually exclusive effects, and proposes deterministic
pair swaps only when the total score improves. Recruitment guidance first covers
missing tank, healer and damage targets, then ranks the class/spec combinations
that add the strongest uncovered party support. Real pending, registered or
benched signups are shown separately from hypothetical recruitment targets.

The current character contract stores class, specialization and role, not a live
talent build, selected aura/totem or pet. The UI therefore distinguishes:

- `Available`: a class ability the player can provide.
- `Talent or setup required`: a specialization, talent, aura, pet or form must be
  confirmed by the organizer.
- `Verify in Forever`: the source record is provisional and must not be presented
  as confirmed live behavior.

This prevents recommendations from claiming that an unrecorded talent or selected
party effect is active. A future loadout contract can promote conditional effects
to confirmed without rewriting the party engine.

## Deployment

Run the normal migration command before restarting the website:

```bash
npm run db:migrate
```

Migration `032_raid_party_rosters` adds the composition revision and nullable party
position, with a database check and unique occupied-slot index. The raid release
manifest includes this migration.

## Verification boundary

Automated coverage includes five-player partitioning, partial parties, invalid and
duplicate normalization, conditional/provisional effect labels, deterministic
support distribution, role-first recruitment, bounded Discord output, request
validation and transactional PostgreSQL layout/snapshot behavior. The signed-in
raid browser suite verifies organizer drag/drop, the native movement fallback,
mobile roster rendering, signup/approval/bench/lock flows and the surrounding
public/admin pages. Discord delivery cases that require live channel credentials
remain environment-gated.

The Linux release build and isolated pre-activation HTTP smoke test passed.
Migration `032_raid_party_rosters` is recorded in production, the canonical event
route returns private/noindex headers, both website and raid-worker PM2 processes
are online, and the post-migration backup restored successfully into an isolated
scratch database. The production dependency audit reports no high-severity runtime
vulnerabilities.
