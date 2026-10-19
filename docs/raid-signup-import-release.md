# Legacy signup import

Event organizers can open **Import Raid-Helper signups** beside **Edit event** at
the top of the event page, upload a Raid-Helper JSON export or paste it, review
the players and confirm the import. Preview is read-only. This imports a roster,
not soft-reserve item selections.

## Review

- Each signup keeps its Discord user ID, original signup time and note.
- Class/spec aliases, including Tank / Protection and Shaman / Restoration1, are
  mapped to native characters. Unresolved values require organizer selection.
- A matching saved character can be selected. Discord nicknames that are not
  valid character names must be corrected before import.
- The source must be an approved community server. The bot checks live source
  membership before writing any accounts, characters or signups.
- The destination event's schedule, loot rules, game edition and signup mode
  remain unchanged. A source schedule mismatch is shown during preview.

## Safety and participation

- Only the event organizer can preview or import; ordinary members cannot use
  the endpoint. Cancelled, locked and closed-signup events reject new imports.
- Maximum export size is 512 KiB, with 100 unique Discord users and 50 selected
  players per import. Re-preview the same export to import another batch.
- Existing signups, including withdrawn signups, are skipped, not overwritten.
  Existing disabled accounts cannot be reactivated by importing.
- Automatic, approval, open signup, bench, tentative and absent statuses retain
  native event semantics. Available seats and role limits still apply.
- Imported players have no fabricated rule acknowledgement or SR selections.
  They sign in with their own Discord accounts to review the current rules and
  select reserves. An accepted imported player blocks roster locking until
  they acknowledge the rules. Tentative and absent players can join again.
- All writes are atomic and version-checked. A stable request key makes a
  retried request replay its receipt without duplicate signups.
- Import provenance and an immutable audit record remain attached to the event;
  the event's change history shows the import count and time.
- The event version changes after import, so the existing Discord worker
  refreshes the event post from the same roster shown on the website.
- The import receipt stays open until the organizer closes it. The website
  refreshes afterward so a version change cannot interrupt the confirmation.

## Interrupted pages

The error page's **Try again** action re-fetches the failed server segment.
**Reload page** performs a full reload when a browser still has an old release
open. Releases identify themselves with `FOREVER_BUILD_DIR` so Next.js can
detect version skew and reload stale client navigation. A failed page load does
not establish whether an earlier submission committed; check the current roster
before repeating an operation.

## Deployment

Apply migration `036_raid_signup_import.sql` using the established migration
ledger and regenerate the Prisma client. The migration adds JSON provenance and
permits an explicitly unacknowledged imported signup, with database constraints
preventing partial acknowledgements or invalid provenance kinds. Existing
signups are unchanged. Restart the website and raid worker together after the
new build; do not change KFC services, server channels or OAuth credentials.

The importer does not post synthetic tests to Discord. Live player transfers
are a separate, explicitly authorized operation after deployment.
