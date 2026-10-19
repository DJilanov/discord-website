# Loot Experience And Discord Reposts

Active release: `.next-release-loot-experience-20261003-r5`.
This extends the member beta; it does not publish anonymous rosters or remove
Discord membership, creator ownership, audit history or channel permissions.

## Member Experience

Each raid has a separate `/raids/:id/reserves` page. Signup leads there when the
member's role has a positive SR allowance. The page supports boss/item search,
source filters, eligibility/selection/HR views, sorting, 24-item pages, a persistent
selection basket, duplicate quantities, explicit saving and discarding, deadlines,
policy acknowledgement and visible competing reservers. Player reservations have
their own view. Desktop hover/focus shows stats; mobile tap opens a keyboard-safe
item dialog. Mobile saving stays available without scrolling back through loot.

The reference at https://legacy.softres.it/raid/b3vqyb uses player/item tables.
This design keeps competition visibility while adding visual item inspection,
role-specific allowances, eligibility and explicit HR in the same event workflow.
It does not claim export compatibility with every Softres client or addon.

The existing nine reviewed TBC catalogs are enriched with 768 unique item records
and locally hosted client icons from owned WoW Trader, pinned to client build 69795. Catalog item identities, restrictions, provenance and immutable checksums
remain authoritative. No TBC metadata is applied to Forever. Some client effect
formulas cannot be resolved (97 items); their spell names and limitation are
displayed rather than invented. External item HTML is never rendered in the app.

Creators can bulk-select HR BoE, recipes/plans/profession books, or materials/gems
in both create and preview editing. These controls select actual reviewed IDs;
server-side conflicts, named HR disclosure and change history still apply.
Categories with no matching items are disabled. Current catalogs contain no
verified BoE items; unbound recipes are not falsely classified as BoE gear.

## Signup Presentation

Open signup groups all applicants by tank, healer and DPS class in both website
and Discord, using compact names and spec icons. The header distinguishes signups
from planned seats. Database `registered` state remains unconfirmed; organizer
roster selection, capacity and lock/export rules are unchanged. Pending approval
and bench players remain separately identifiable.

## Repost

Creators or Discord administrators run `/raid repost event:<event URL or ID>` in
the event's original channel. The event must be open, upcoming and synchronized.
There is a ten-minute per-event cooldown. Migration 031 adds durable generation,
previous-message and retirement tracking. The worker creates one new post,
preserves every event setting, signup, SR, HR and approval, and replaces the old
post with a latest-post link and no stale signup controls. Lost POST/PATCH responses
are reconciled without creating duplicate active posts. Failures remain visible
in worker state and retry; they are not silently discarded.

The owner-authorized release repost uses `scripts/raids-repost.ts EVENT_ID` for a
read-only check, then `--execute` after deployment. It verifies live organizer
membership, uses the same authorization/cooldown/locking logic and records
`operator:raid-release`, not a forged Discord interaction. It is not a public API.

## Release Procedure

Back up private production data and the previous scoped source first. Build in
the Linux stage, not the active build directory. Stop only the raid worker before
applying additive migration 031 and installing generated Prisma/source/build.
Reload only `wow-forever-discord` and `wow-forever-raids`. Register the main raid
commands and feedback repost command; preserve unrelated commands and services.
Verify HTTPS/auth, assets, worker state and the actual repost. Retain previous
build/source and the shared database; prefer a forward fix once reposts exist.

## Verification

Local checks
include item-source validation, category overlap, compact open signup, immutable
loot, creator editing/history, member beta and server-side channel authorization,
repost ownership/cooldown/replay/lost-response recovery, and real TBC loot browser
desktop/mobile/accessibility/save flows. Synthetic fixture data stays local.

Typecheck, lint and the Linux production build passed. 240 unit tests passed
(the previously hanging, unrelated bridge suite excluded), 27 native PostgreSQL
tests, 12 canonical PostgreSQL tests, 22 main browser tests and the separately
enabled member-beta browser test passed. Screenshots, image-load checks and
accessibility/layout checks covered 1440, 768, 390, 360 and 320px widths. The native
fixtures explicitly make newly queued jobs eligible before immediate polling;
millisecond timestamp rounding no longer introduces test-order failures.

Migration 031 is applied. The website and raid worker are online; other PM2
services were not restarted. HTTPS health, anonymous API rejection, private
no-store/noindex pages, real local item assets and command registration checked.
The pre-release backup restored successfully into an isolated scratch database.

The owner's existing event `cmusj94un0000964sq2b11i1w` was reposted, not cloned:
https://discord.com/channels/1411533815356194968/1504460832434819326/1556016615571726477
It was verified as the latest message in the original KFC channel. A transaction
checksum verified unchanged settings and participation. All four live signups,
zero saved SR, one named HR and version 13 remained. Discord verified the artwork,
native controls, compact Tank/Rogue groups and absence of internal footer/time.
The previous message has only a latest-post link and no stale signup controls.

## Planned Follow-Up

The next loot usability work is documented in
[Personal Loot Recommendations And Gear Comparison](raid-loot-recommendations-and-gear-plan.md).
It separates reserve eligibility, spec relevance and equipped-item upgrades, and
defines manual gear, optional verified Blizzard API and owned-addon providers.
The direct SR-link patch is local only; the active release above is unchanged.
