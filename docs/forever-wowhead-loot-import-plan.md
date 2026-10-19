# Forever Wowhead Raid-Loot Import Plan

Prepared: 2 October 2026.
Status: design for the [Forever Raid Manager](forever-raid-manager-implementation-plan.md).
No crawler, scheduled fetch, imported item or publication is activated here.

## 1. Goal And Scope

Prepare a fast, repeatable way to collect Wowhead's **Forever raid loot** into
our reviewed catalog. An administrator supplies a Forever raid/loot source,
previews item and boss mappings, then publishes an immutable catalog release.

```text
Approved Forever source
  -> bounded collection or permitted source-file import
  -> structured extraction
  -> Forever/context validation
  -> normalized item and loot-source candidates
  -> staged diff and human review
  -> immutable published catalog
  -> explicit event catalog selection
```

This is a narrow source adapter, not a crawl of all Wowhead or a replacement
for its guides. Other editions, comments, account data, screenshots, unrelated
links, BiS opinions and speculative drop rates are outside the importer.
No Google search results or AI output become item/loot evidence.

## 2. Research And Access Prerequisites

Wowhead's current Forever overview identifies Hyjal Summit, Barrow Deeps and
Onyxia's Lair, but its raid-reward sections are still marked coming soon.
Those names can identify future source profiles; they do not establish that
complete Forever loot tables are available now. Do not guess zone, boss, item
or encounter IDs from other editions. [Forever raid overview](https://www.wowhead.com/forever/guide/raids-overview-hub-dates-locations)

The current robots file blocks specified crawlers and disallows search/list
routes, including their Forever variants. It does not amount to a blanket
license to reuse data. Evaluate the actual crawler identity and each requested
URL against the applicable rules; do not spoof a permitted bot. Terms and data
redistribution permission remain a prerequisite to enabling automated collection.
The attempted terms pages did not provide readable terms in this research.
[Wowhead robots policy](https://www.wowhead.com/robots.txt)

Public Forever item pages can retain inherited historical comments. Therefore
the namespace and comments alone are insufficient evidence of current loot.
Only inspect the supported page's actual item/loot data and relevant Forever
context. Do not import forum anecdotes as authoritative boss drops.
[Example Forever item page with historical comments](https://www.wowhead.com/forever/item=13250/head-of-balnazzar)

Collection modes:

- **Approved network collection:** only after source-access review, current
  robots checks and a tested page adapter. Use an honest identifying user agent.
- **Permitted source-file import:** an administrator supplies an authorized
  export/saved page bundle and records its source URL/time. Use the same parser,
  validation and review steps without downloading from Wowhead.
- **Manual structured import:** a reviewed item/boss mapping file for unsupported
  page layouts. This is not permission to invent IDs or bypass another edition.

403, CAPTCHA, robots denial or access challenges stop network collection.
Do not switch proxies, borrow a personal browser session, extract cookies,
impersonate a browser/bot, or probe private endpoints to work around a block.
An offline import is a permitted alternative, not a tool for bypassing controls.

## 3. Admin Workflow

Add a source-import section to `/admin/raids/catalog`, under catalog-management
permission, not public member access.

1. Choose a reviewed Forever raid profile or create a profile with its exact
   source URL and explicit raid identity. A similarly named raid is not a match.
2. Choose network or source-file mode. Show access/readiness status and the
   destination catalog; default to preview/staging, never publication.
3. Collect and show progress: source pages inspected, loot sections identified,
   expected/observed rows, items resolved, conflicts and excluded links.
4. Preview new/changed/unresolved item facts and boss/trash/token relationships.
   Every row links to its source and explains why it is eligible or quarantined.
5. Review unresolved raid/boss identities, source edition/patch, availability,
   restrictions and completeness. Confirm the selected source pool explicitly.
6. Approve a reviewed batch and publish atomically. Unresolved/rejected rows are
   not quietly included; the catalog records any approved partial coverage.
7. New events may select that release. Existing events retain their pinned
   release until an explicit acknowledged event revision upgrades it.

Make the normal path quick: remember approved profiles and mapping decisions,
cache unchanged pages/items, and let staff approve a coherent diff as one batch.
Do not require reopening every unchanged item on each refresh. A changed parser,
scope or source context still requires renewed review.

## 4. Source Profiles And URL Safety

Each source profile records:

- Internal Forever raid ID and reviewed display name.
- Exact approved source URLs and supported page types.
- Locale; initial implementation uses English to avoid inconsistent duplicates.
- Relevant loot-section identities and explicit boss/encounter mapping.
- Confirmed release/phase context, or an explicit unknown/planned state.
- Extraction adapter/version and source-access approval metadata.
- Fetch budget, refresh interval and completeness expectations.

Support only page types demonstrated by authorized captured fixtures: a raid
loot table, a mapped boss drop table, a supported item fact page, or a guide's
explicit loot table. A guide overview with no loot is `not_available`, not a
successful empty catalog. Do not invent undocumented JSON/XML endpoint URLs,
filter parameters or listview field names from memory.

Network URL validation uses the standard URL parser and a narrow allowlist:

- HTTPS, reviewed Wowhead hostname, standard port, no user information.
- Approved normalized `/forever/` path and supported resource type.
- No foreign-edition canonical target, encoded-path escape, malformed identifier,
  search/list/account route or unrelated query parameters.
- URL fragments are navigation hints, not fetch identities or evidence of loot.
- Follow redirects only after validating each new target and its robots policy;
  an unexpected edition/host redirect is rejected rather than rewritten.
- Reject private/reserved network destinations and unsafe redirects. A pasted
  admin URL is not authority for arbitrary server-side requests.
- Validate canonical page context as well as requested URL; conflicts quarantine
  the page. Do not rewrite a non-Forever URL by inserting `/forever/`.

External image links are references only until the separate media/rights policy
approves them. Do not download arbitrary image URLs discovered in source HTML.

## 5. Bounded Collection And Refresh

Use a source-specific worker or CLI entry point, not request-handler scraping.
Reuse the raid worker's durable-job pattern once implemented; there is no need
for a separate browser fleet, Docker service or broad web-crawl platform.

Proposed conservative defaults, subject to stricter source terms:

- One network request in flight per host and at least five seconds between them.
- A bounded per-run page budget; start with 100 pages and stop explicitly when
  reached. The job remains partial rather than claiming completion.
- A 15-second request timeout and a 5 MiB decompressed-response limit.
- A 24-hour body-cache TTL and conditional ETag/Last-Modified requests when the
  source supports them. A 304 reuses a previously validated body; it does not
  create an empty parse result.
- At most two retries for genuinely transient failures, with backoff; obey
  Retry-After. Access denial/challenges are not transient retry targets.
- No automatic refresh initially. After approval, optional daily candidate
  collection for named raid profiles; never auto-publish or edit live reserves.
- Coordinate limits across concurrent jobs and preserve a crawl checkpoint.

Start from curated raid sources, then follow only the supported loot sections,
their same-scope pagination and directly referenced item/boss facts needed for
that pool. No recursive menu, recommended-guide, advertisement or comment links.
Repeated URLs/cycles are deduplicated and bounded by an explicit traversal depth.

Prefer extracting an entire supported table payload from a permitted page when
available, then fetching only unresolved item facts. If the table requires
pagination, discover it from the inspected page, preserve the same resource/
filter/scope, and verify coverage against any reported total. Do not guess that
the first screen, first 100 rows or all links in a guide are the complete pool.

On unexpected truncation, parser failure, request-budget exhaustion or a changed
layout, retain partial candidates with warnings. Never delete existing catalog
items because a failed collection produced fewer or zero rows.

## 6. Safe Structured Extraction

Use a proper HTML parser and schema validators, not regular expressions across
an entire page. Extract only the supported loot region and page identity.

Extraction preference:

1. A permitted structured export, if an actual supported source contract exists.
2. Inspected structured JSON/data embedded in the supported page.
3. Explicit DOM loot-table rows with verified item links and section context.

Where the source embeds JavaScript object literals rather than JSON, use a real
JavaScript parser and a restricted AST-to-data conversion. Accept only supported
literal objects/arrays/scalars; reject functions, imports, computed expressions,
dynamic calls and unsupported constructs. Never use `eval`, `Function`, a VM or
execute downloaded scripts in order to turn them into data. Add the minimal
HTML/AST parsing dependency only when an inspected fixture demonstrates the need.

Do not declare an adapter production-ready until its real layout and source
contract have been captured permissibly and tested. A browser-only layout with
no safe extractable representation is unsupported until that separate adapter
is reviewed; a stealth browser is not the default fallback.

Normalize each extracted fact with provenance:

| Entity             | Required fields                                                                               | Optional or explicitly unknown                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Source capture     | Source URL, fetched/imported time, checksum, locale, extractor version, access mode           | Source update time, reported edition/patch, exact client build                    |
| Item candidate     | Positive item ID, name, normalized Forever item reference, source capture and fact provenance | Quality, slot/type, icon reference, level, definitive class restrictions          |
| Loot relationship  | Internal raid identity, source section/row identity, item ID and evidence URL                 | Mapped boss/encounter ID, difficulty/release context; unknown mapping quarantined |
| Token relationship | Actual dropped token ID and source; reward IDs only when explicitly sourced                   | Exchange/vendor/quest context; no inferred class groups or rewards                |
| Batch coverage     | Pages attempted/accepted/rejected, observed rows/items, errors and coverage state             | Reported source total; absent total means completeness is not proven              |

Keep boss drops, trash drops, quests, vendor rewards and token exchanges separate.
Do not label a quest reward as a boss drop just because it appears in the same
raid guide. Reserve the actual dropped token by default; token rewards are not
additional independent drops or separate SR opportunities. A reviewed event
policy can later expose a reward-selection UI without duplicating the token.

Item identity is edition/context plus ID, never display name alone. An item may
have several legitimate source relationships; merge identical facts without
losing those relationships. Preserve difficulty/variant context where proven,
and quarantine conflicting facts instead of choosing the latest fetched row.

## 7. Import Contract And Evidence Levels

Proposed manifest name: `forever-wowhead-loot-candidates.v1`.
This is a staged import contract, not a promise that its data is already
client-verified or immediately usable in a raid.

The validated bundle contains:

- Contract/extractor version, fixed `game: forever`, batch ID and payload hash.
- Raid profile and relevant availability/release context.
- Source captures and checksums; all records reference a capture.
- Item candidates, explicit loot relationships and optional token mappings.
- Completeness, exclusions, conflicts, unresolved mappings and parser warnings.
- Collection scope/access approval and source-attribution metadata.

Store `sourcePatch` and `clientBuild` separately. When Wowhead supplies a patch
but no client build, client build stays null; never borrow a build from Trader
or another edition to satisfy a required field. This extends the main catalog
design to allow a reviewed, source-pinned Wowhead release alongside a separately
client-verified release. Both remain immutable and Forever-only.

Evidence levels are separate from administrative approval:

- `source_reported`: Wowhead's supported item/loot data reports the relationship.
- `client_observed`: a scoped Forever capture confirms that item/source fact.
- `unresolved`: edition, item, source, mapping or release is insufficiently clear.

Review can publish a source-reported Forever pool when the exact context and
availability are sufficiently supported, without requiring someone to have
personally looted every item. It must still label its evidence honestly; it
cannot become `client_observed` through a checkbox. Unknown/unreleased content
remains staged/planning-only under the main blueprint's readiness rules.

Definitive equip restrictions can be enforced when the source fact is reviewed.
Absent/ambiguous restrictions remain unknown, not guessed from a legacy tier
set. Drop percentages, comment anecdotes and speculative BiS judgments are
excluded from the first importer.

The existing catalog service, not the crawler, applies approval/publication.
Network collection has no privilege to change active event definitions, publish
a catalog, alter SRs, access participant records or read moderation evidence.

## 8. Diff, Completeness And Publication

Use deterministic normalization and hashes so equivalent order/HTML formatting
changes do not appear as item changes. Record parser and schema versions to
distinguish a source update from an extraction change.

The diff separates:

- New items and newly supported loot-source relationships.
- Item fact changes, new/changed restrictions and variant conflicts.
- Source relationships missing from a **proven complete** refreshed section.
- Unresolved/rejected rows and incomplete section/page coverage.
- Release/evidence changes, not just changed display names.

Missing rows from partial or failed runs never become automatic removals.
Even on complete runs, removal is a reviewable source-relationship change, not
deletion of an item used by an existing event or locked snapshot. A complete
reported source table does not prove every possible game drop is known.

Publish a reviewed batch transactionally, validating against the exact staged
hash. A source/candidate change between preview and approval invalidates the
old confirmation. Reimporting the same normalized bundle is a no-op, not a new
catalog release. A changed reviewed bundle creates a new release and never
rewrites the previous one.

For an explicitly approved partial pool, display its limited coverage and
excluded/unresolved items. Do not claim a complete raid loot table or migrate
existing events silently. Once the pool is complete, a new release may replace
it for new events and explicit upgrades only.

## 9. Storage And Operations

Add source-import models only when the catalog milestone is implemented:

- `ForeverRaidSourceProfile`: source scope, raid mapping, adapter/access review.
- `ForeverRaidSourceImport`: batch state, scope, checkpoint, errors/coverage and
  normalized hash; unique idempotency key and payload fingerprint.
- `ForeverRaidSourceCapture`: bounded private evidence, URL, timestamps, checksum,
  parser version and optional cache validators.

Candidate data can initially live in a bounded validated staging bundle rather
than duplicating every published item table. Published catalog items/source
claims retain provenance pointing to that reviewed import. Introduce relational
candidate tables only if review/search needs justify them.

Source bodies are private, short-lived operational evidence under approved
retention/rights, not a public HTML mirror. Strip unrelated account/comment/
advertisement data. Keep only necessary factual fields and minimal permitted
evidence. Do not commit full downloaded guides or publicly redistribute article
text, screenshots or icon assets without the applicable permission.

Proposed script location: `scripts/raids-loot-import.ts`, backed by
`lib/raids/sources/wowhead.ts` and the shared catalog validator. CLI preview,
source-file import, status and resume use the same services as admin. Network
and publication are separate capabilities; the collector can write staging
only. No crawler credential is exposed in public forms or logs.

## 10. Build Order And Acceptance Tests

This is an M0 catalog work package, not a reason to delay all roster work until
every future raid table exists.

1. Define the Forever candidate manifest, URL/scope rules and pure normalization.
2. Inspect an authorized real loot source and freeze a minimal supported fixture.
   If raid rewards are unavailable, use an explicitly labelled Forever dungeon
   fixture to test extraction mechanics, not to publish it as raid loot.
3. Implement the offline extractor/validator first, with no network or live writes.
4. Add staged import/diff and review/publication through the catalog service.
5. Add the approved network adapter, robots handling, cache, rate limits and resume.
6. Trial one real Forever raid source when its loot is available, then add other
   profiles using verified mappings rather than search-based guesses.

Tests must cover:

- Wrong namespace/canonical target and same-named raid from another edition.
- Valid Forever unchanged items without incorrectly requiring a new-item badge.
- Historical comments, related guides and decorative links excluded.
- Arbitrary hosts, user-info URLs, encoded paths, redirect escapes and private IPs.
- Robots denial/unavailability, blocked terms approval, 403, CAPTCHA and 429.
- Full embedded tables, real pagination, repeated pages and truncated responses.
- Unknown layout, unsupported AST, malicious script and zero-row challenge HTML.
- Duplicate items with multiple sources, conflicting facts and unresolved bosses.
- Boss/trash/quest/token/vendor separation and no duplicated token rewards.
- Unknown client build/patch, source-reported versus client-observed evidence.
- Reimport no-op, resumed jobs, partial runs and no accidental removals.
- Review hash mismatch, atomic publish, preserved pinned events/loot snapshots.
- Collector cannot publish catalogs or read/change participant/private case data.

Completion means: an authorized Forever source produces a deterministic staged
diff, an administrator can publish only reviewed candidates quickly, and a new
event can select the resulting pinned pool without affecting existing events.
Fetching a page successfully or finding some item links is not that acceptance
gate. Network access and complete raid-loot availability are explicitly unproven
until the source-specific pilot passes.

## 11. Create Event: Loot Choices And Future Tables

Owner clarification, 2 October 2026: no actual Forever raid loot table has been
provided. This expansion is a plan only. Do not seed speculative items, enable
automatic collection or change selectable catalogs as part of this planning task.
PvP is the implemented form default for new characters and events; PvE/RP remain
explicit alternatives and existing records are not changed.

### Separate The Three Decisions

Create event now supports Raid, Dungeon, Battleground, World PVP, Questing, Social event
and Other. Activity type is selected before the decisions below. They apply to
raid loot in the current slice; non-raids cannot attach a raid catalog or reserves.
Future dungeon loot needs an explicit dungeon source/pool contract and reviewed
catalog-kind validation, not reusing a similarly named raid pool. PvP and social
events do not need a speculative loot table to support signups.

The current Create event form chooses a published catalog, or a manually named
planning event. The expanded flow should distinguish:

1. **Raid:** the intended Forever instance, independent of whether loot exists.
2. **Loot pool:** a reviewed, immutable catalog release for that exact raid.
3. **Loot policy:** how participants use that pool, not another source of items.

Hyjal Summit, Barrow Deeps and Onyxia's Lair are candidate planning profiles.
The inspected [Forever overview](https://www.wowhead.com/forever/guide/raids-overview-hub-dates-locations)
currently marks each raid's rewards coming soon. Store that observation with its
check date, not as permanent evidence that a table can never exist. Their names
do not justify importing Classic/TBC/SoD loot or guessing boss/item identifiers.
Keep custom planning names supported for legitimate future events.

### Source And Readiness States

| State | Organizer view | Admin view | Reservable items |
| --- | --- | --- | --- |
| No source table | Planning event; loot unavailable | Source profile awaiting a real table | None |
| Potential table / release unconfirmed | Planning event; loot awaiting confirmation | Staged candidates with source and availability warnings | None |
| Actual raid available, candidates unreviewed | Planning event; catalog awaiting review | Diff, exclusions, evidence and publication decision | None |
| Reviewed published partial pool | Selectable with prominent partial-coverage status | Immutable release plus remaining exclusions | Only reviewed included items |
| Reviewed published complete pool | Selectable with source/evidence information | Immutable release and capture/coverage evidence | Only reviewed included items |
| Superseded or retired release | No new selection when retired; existing events stay pinned | Retirement reason and replacement release | Existing-event policy, never silent substitution |

Source availability, administrative approval, completeness and evidence must stay
separate. Human review does not turn `source_reported` into `client_observed`,
and a complete source table does not prove every possible drop is known. A
potential upcoming table can be staged without claiming that a raid is available.
Keep the existing unknown/unreleased publication block until a separately reviewed
readiness design explicitly changes it; this plan does not relax that protection.

### Organizer Experience

- Select a Forever raid first. Filter catalog versions by that identity rather
  than displaying every raid's versions in one undifferentiated menu.
- Keep planning without loot available. Never auto-select speculative loot or
  require a catalog simply to organize a future release-day group.
- List usable releases with capture/review dates, source patch when known,
  item count, partial/complete coverage and evidence status. Distinguish versions
  by more than a cryptic checksum; retain the checksum in technical details.
- Offer a read-only preview with item/source search, boss/trash/quest/token
  grouping, class restrictions and direct source references. Clearly label
  unknown context. An empty or unsupported source is not an empty successful pool.
- Show SR allowance, duplicate-reserve policy, HRs and deadlines only when a
  reviewed pool supports them. No pool means no SR/HR, including server-side checks.
- Switching a raid or catalog clears incompatible HR/item selection, warns about
  the change and requires a fresh creation confirmation. Do not carry item IDs
  from a previous pool into another raid.
- Before creation, summarize region/timezone, PvP/PvE/RP, raid, catalog release,
  evidence/coverage, roster limits, SR count, HRs and deadlines. Preserve form
  values on retry and reuse the existing request-key protections.
- Keep selects/segmented controls keyboard accessible. Preview tables scroll
  within their own region on mobile; long item/raid names cannot overflow the page.
  Do not introduce a public loot mirror or index private participant information.

### Loot Policy Variants

Do not confuse another raid's item table with another loot policy. The supported
first slice remains planning/no reserves or reviewed-pool soft reserves, with an
explicit allowance from zero to ten, duplicate policy and declared HRs.
One-SR/two-SR/three-SR presets can be shortcuts for that same validated contract;
they must not create a second reserve engine.

MS/OS rolls, loot council, point-based systems and hidden reserves are separate
future policy work. Merely adding their names to a dropdown would incorrectly
claim functionality. Each needs explicit eligibility, visibility, tie-breaking,
audit, participant acknowledgement, export and Discord behavior before shipping.
Do not include currency bidding as an assumed requirement of this package.

### Integration And Implementation Order

1. **Profiles and UI design:** define stable Forever raid identities and reviewed
   source references. Plan the empty/upcoming/published states and creation
   confirmation. Profile names never constitute publishable item data.
2. **First real source:** obtain an authorized Forever table/export, inspect its
   canonical context and retain a minimal permitted parser fixture. If no table
   exists, stop extraction here; the roster/planning service remains useful.
3. **Offline staging:** implement the inspected adapter and deterministic item/
   source normalization under the existing catalog validator. Preserve edition,
   patch/build, token relationships, restrictions and coverage without inference.
4. **Staff review:** extend `/admin/raids` with source/profile status, inspectable
   candidates, unresolved rows and an immutable diff. Publish through
   `catalog-store.ts`, not through a crawler or organizer submission.
5. **Event selection:** expose only published, usable releases to authorized
   members. Extend `CatalogView` with source/capture/coverage metadata, use stable
   raid identity for matching and keep existing event checksums pinned.
6. **Revision support:** enabling loot on an already-created planning event needs
   the blueprint's immutable event/policy revision and fresh acknowledgements.
   Until that exists, cancel/recreate; never patch a catalog into old signups.
7. **Approved collection:** add network collection only after the source rights,
   robots policy, real adapter, rate limits and failure tests in sections 2-10
   pass. Refresh stages a candidate release; it never automatically publishes.
8. **Discord projection:** use the same canonical event/catalog policy in the
   planned bot event. Compact posts link to the authorized web preview/reserves;
   they do not maintain another independent copy of the loot rules.

Use the existing PostgreSQL and PM2 deployment. Start offline/request-driven;
add an isolated scheduled worker only if approved collection or delivery actually
requires one. This plan does not register commands, create events, migrate data
or publish messages in either live Discord server.

### Acceptance Criteria

- All supported Forever raids can be planned before their loot is ready.
- Foreign-edition, potential, unreviewed, mismatched and retired catalogs cannot
  enter new reservable events, even via a manually crafted API request.
- A reviewed source-reported pool works without pretending it was client-observed.
- Preview counts, restrictions, partial status and provenance match the pinned
  catalog; reserved tokens and their rewards cannot become duplicate drops.
- Raid/catalog changes discard incompatible HR choices and preserve unrelated
  scheduling fields. Failed imports and partial scans cannot erase prior releases.
- Publishing a new version leaves existing signups, SRs, acknowledgements and
  locked exports unchanged. Planning-to-loot conversion requires a new revision.
- Member/staff permissions, private audience checks and noindex protections hold.
- Unit tests, real local PostgreSQL integration and desktop/mobile browser flows
  cover these states before release. No synthetic fixture is deployed as real loot.
