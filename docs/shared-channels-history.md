# Historical Shared-Channel Imports

Historical imports are separate from live `/bridge join` enrollment. The owner
confirmed that every author in the two selected KFC/Forever channel pairs was
asked and explicitly agreed to historical sharing. This is a staff attestation
of author permission, not a fabricated Discord interaction or permission to
share future messages. No public announcement or channel-topic text is required.

## Scope and Controls

- Only existing approved pairs, a fixed past date interval and a direction.
- A bounded, paginated preview stores IDs, dates, HMAC fingerprints and exclusion
  reasons. Message bodies are processed transiently, never saved as a transcript.
- Starting requires an owner/admin, current optimistic version, reviewed preview,
  explicit author IDs, healthy running worker and fresh endpoint validation.
- A validated `ready` pair may run a finite historical import without enabling
  general live participation. A pilot cannot publish history.
- Membership and speaking permissions in both channels are checked again.
- Text-only policy remains: bots, webhooks, attachments, forwarded posts, polls,
  stickers, links, mentions and prohibited terms are excluded, with reasons.
- Publication is oldest-first, one pending delivery per batch, at least two
  seconds between staging attempts, with the existing global and author quotas.
- Every initial send rechecks the original against the preview fingerprint.
  Deleted, changed, withdrawn or blocked content is not published.
- Imported bot posts show the original author, community, date and source link.
  They suppress mentions and push notifications, but may create unread badges.
  Native message IDs, authorship, reactions and historical placement are not
  cloned. Existing unrelated destination messages are not reordered or deleted.
- Mapped replies, source edits/deletion, author withdrawal, staff blocking,
  uncertain-send recovery and 30-day retention use the existing relay lifecycle.
- Restart pauses unfinished imports and preserves confirmed imported copies.
  New publication waits for endpoint revalidation and explicit batch resume.
- Rollback removes only managed imported copies and managed reply chains, never
  original human messages. Uncertain output IDs still require reconciliation.

## Operator Commands

Run from the website root on the production host with its existing private
environment. The website does not need or receive the bot token. The dedicated
worker handles Discord requests. Input files contain scope/IDs, never secrets.

```sh
npx tsx scripts/bridge-history.ts --action preview --owner OWNER_EMAIL --input preview.json
npx tsx scripts/bridge-history.ts --action status --owner OWNER_EMAIL --bridge BRIDGE_UUID
npx tsx scripts/bridge-history.ts --action control --owner OWNER_EMAIL --input control.json
```

Preview input uses `bridgeId`, `direction` (`both`, `a_to_b`, `b_to_a`), ISO
`fromAt`/`untilAt`, `limit` (1-10000 inspected messages) and an audit `reason`.
The worker never publishes a preview automatically. `scan_limit_reached` means
the preview is truncated, not that all channel history was scanned.

Control input uses the batch `id`, its current `version`, `action` (`start`,
`pause`, `resume`, `rollback`) and `reason`. Start additionally requires
`reviewed: true` and the explicit `actorIds` with historical permission. Authors
who withdraw or are blocked during preview cannot be granted permission by that
stale preview. Unlisted authors are excluded; permission cannot be inferred from
membership, server ownership or a live consent record.

Delivery records are visible in the existing `/admin/discord` Delivery view.
Batch progress and batch controls are available through the operator CLI in this
release, not a new admin history tab. `/bridge status` distinguishes historical
approvals from live participation; `/bridge leave` withdraws both for the pair.

Keep previous release builds for rollback, but stop imports before rolling back
to a worker without historical support: the old worker's recovery removes all
managed roots. Migrations 008/009 and the three explicit worker-table grants are
required before the new worker starts. No KFC application tables or services
are changed by this feature.

## September 30 Release

### Import Withdrawn

The owner rejected the bot-formatted historical copies and requested native user
messages or deletion. Native authorship cannot be transferred by this bot. The
runtime was switched to `cleanup_only` through the audited admin control, and
both exact batches below were rolled back through the normal history control.
Their historical grants were withdrawn. All 95 managed copies (47 discussion,
48 group-leveling) reached removed/suppressed states with no unresolved jobs.
Read-only Discord API checks confirmed all 95 exact copied-message IDs were
absent and all 95 original-message IDs still existed with their original authors.
Original human posts were not deletion targets. Publication remains disabled;
do not restart these imports or treat the earlier start attestation as approval
of this format. The release and startup verification below are historical, not
the current import state.

Deployed working-tree release `history-e4fe94f8` on base `e8b365f`, retaining the
previous notice-removal and consent-retry fixes. Website build is
`.next-release-history-e4fe94f8`; the immutable worker release has the same suffix.
No commit or push was requested for this operation. Database migrations 008/009
and only the three explicit history-table grants were applied. Source backup and
database backup were taken before deployment; the latter passed an isolated
restore and private-archive integrity check.

Both pairs were freshly validated after the old pilot expired. They remain
`ready`, not generally active: the historical grants do not authorize future
messages. The selected cutoff is September 30, 2026 at 19:15 UTC, with a complete
scan back to channel creation and a 1000-message inspection cap per pair. Neither
scan hit that cap.

- Discussion batch: `7f48b8a4-e4b5-4071-8ad9-d801a244f96f`, 803 inspected,
  715 plain-text candidates, 88 content-policy exclusions, 30 approved authors.
- Group-leveling batch: `6166a82f-8a8a-4308-a6b6-146ad640afc9`, 106 inspected,
  95 plain-text candidates, 11 content-policy exclusions, 10 approved authors.

Both batches were started at approximately 19:42 UTC with the owner's explicit
attestation that every author was asked and agreed. First-copy verification read
six real bot posts from each destination channel and confirmed attribution,
original dates, source links, notification-suppression flags, no mentions and
bounded message length. Runtime/Gateway were healthy, with no failed or uncertain
jobs. At that checkpoint processing was still running, not completed. Current
progress must be read from batch status; membership/permission failures are
additional exclusions, not claimed as copied messages.

Verification passed 123 unit/integration tests (58 bridge tests), five focused
browser tests, lint, typecheck, standalone worker installation/build verification,
and Linux production worker/website builds. Live policy pages passed accessibility
and overflow checks at 320/390/768/1440px. Anonymous admin and unsigned Discord
requests returned 401. Selected deployed source hashes matched local files. KFC
and both Helper process IDs/restart counts were unchanged.
