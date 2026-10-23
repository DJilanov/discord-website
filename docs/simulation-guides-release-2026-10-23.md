# Simulation Guides And DPS Rankings

## Scope

The owner approved nine class guides and one DPS tier list, including commit,
push, publication and deployment after verification. The existing starter/role
guides remain available. Only the community website changes: simulator engines,
reviewed selections, active studies, Discord workers, KFC and Helper are untouched.

## Evidence

The actual validated library contains 27 entries across nine classes. Two
provisional-proc opt-in entries are excluded, leaving 25 standard builds.
Twenty-one have source-bound rotation guidance; four standard Warrior/Combat
Rogue priorities are translated from their saved APLs. Unsupported semantics
fail closed. Ordering, AND/OR/NOT, thresholds, disabled actions, prepull timing
and recorded spell variants are retained. This is not an independently tested
simplified human rotation or a new optimization campaign.

The common benchmark uses one level-63 Dragonkin, 300 seconds, seed 58723001,
5,000 fights per build, full-v2 support and no external debuffs. Self-applied
effects remain. Each character retains its equipment, talents, race, professions,
position, pet and consumes, with its own pinned engine/catalog version.
Nineteen rows reuse exact authenticated receipts after matching request bytes,
publication, original settings link, engine, database and response. Six updated
rows add 30,000 actual fights. The 125,000 represented iterations are not all
described as new work; measurement dates remain distinct from publication dates.

Original 40,000-fight build references are displayed separately; only common
benchmark scores are ranked. Tier bands are editorial percentages of the leader,
not confidence classifications. Monte Carlo error does not cover model error,
movement, item access or future tuning. No healing, tanking, level-30, AoE or
PvP ranking is inferred. Raw numerical receipts are retained in local artifacts.

Talent ranks are read in the actual simulator tree order, joined by name/max
rank to client build `1.60.1.70425` and totalled to 51. Explicit aliases cover
Shadow Magic/Shadow and Elemental Combat/Elemental. Every selected rank has a
confirmed client-reference description. Tree mapping hashes and 354 original
bitmap hashes are retained. Talent-data CC-BY-4.0 attribution does not relicense
Blizzard imagery. Gear details preserve engine units rather than relabelling
them as client ratings. No universal BiS or launch acquisition claim is made.

Nineteen exact public replays were available during preparation. The six newer
Paladin/Warlock builds remain labelled replay-pending, with their real settings
downloadable. A different public engine is not silently substituted.

## Publication And Search

`scripts/publish-simulation-guides.ts --dry-run` previews only these ten sources.
`--publish` is explicit. One transaction creates or publishes exact never-published
records; an editorial conflict rolls back everything. Repeat runs preserve dates
and content. All 17 existing guides and their metadata remain untouched.

The tier canonical is `/guides/wow-forever-dps-tier-list`; each class uses
`/guides/wow-forever-<class>-dps-guide`. Server HTML includes meaningful text,
talents, gear and ranking rows without running a combat engine. The library
features the tier list and links every class. Class pages link the benchmark,
tools and community workflow without merging guild recruitment destinations.

Publication-gated sitemap and RSS discover new public articles automatically.
`/llms.txt` includes only published matching records. Evidence downloads carry
noindex and are not sitemap pages. Private routes, canonicals, raw-HTML rejection
and authorization boundaries remain unchanged.

The search opportunity is original, reproducible level-60 research, not copied
level-30 opinions. Descriptive titles, visible scope, honest dates, internal links
and Article/Breadcrumb markup must match the content. Rankings and AI citations
are not guaranteed. Primary guidance: [people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
and [title links](https://developers.google.com/search/docs/appearance/title-link).

## Verification

The configured full suite passed 379 tests without failures or skips. Focused
tests cover data schemas, original bitmaps, APL semantics/refusals, talent mapping,
matched-score ranking, safe Markdown and publication rules. Isolated database
integration proves atomic conflict rollback, all 17 existing records preserved,
repeat-run idempotence and explicit publication gating.

Private browser checks cover 36 layouts at 1440/390/320 pixels, 78 interaction
groups and ten scoped accessibility checks. The production gates below were
also completed; a source preview alone was not treated as release evidence.

## Production Receipt

Application source `30c9857df1e046c73cac5590e1124d0734c06e51` was committed,
pushed, built on Linux and activated as an immutable PM2 website release. The
ten new guides were published atomically at 04:06:26 UTC on October 23, 2026.
The preview predicted ten creations and seventeen untouched records; the actual
run matched. A repeat preview reported ten preserved guides and no writes.
Read-only checks confirmed the committed-source fingerprints and all seventeen
previous guide records, including their custom metadata, unchanged.

Live visual review found inherited table styles wrapping headings and forcing
build names into uppercase. A presentation-only follow-up was committed, pushed
and deployed from `ec6bc488098e1601b29e69293d1a0c95bdf17c5a`, with build output
`.next-release-ec6bc488098e`. It corrects the rank/tier headings, row styling and
singular build counts. It performs no content publication, data rewrite or
numerical changes. A second protected baseline verified all 27 guide records
and original publication timestamps unchanged.

The final source export verified 1,584 tracked blobs against Git. Linux
compilation, TypeScript and the existing activation guard passed, including
40 static assets and 72 server entries. The candidate's health and all thirteen
referenced JS/CSS assets passed before activation. Only the community website
was restarted; all eleven protected sibling processes and application settings
matched the activation baseline. PM2's saved selection matches the final source
and output directory.

The final live browser pass covers 33 layouts, 78 interaction groups and ten
scoped accessibility checks. All nine classes, all 25 build selectors, allocated
talents, item details, saved-settings downloads, tier filters, empty states and
bitmap assets pass at desktop and phone widths. The ten public articles have
matching canonicals, metadata and Article markup. Each appears exactly once in
the 69-entry sitemap and in RSS with its real revision date. The guide-directory
date follows the newest published guide revision; the UI-only release did not
manufacture newer article dates. Published-only `/llms.txt`, download noindex,
unknown-guide 404 and private-route protections pass.

Production QA used DNT/GPC and blocked non-read browser requests. No accounts,
Discord messages, synthetic usage counts or fake events were created. The owned
temporary PostgreSQL cluster, SSH forward and loopback preview were stopped.

Protected server receipts are retained in
`/home/wow-forever-discord-release-audit/simulation-guides-20261023-30c9857` and
`/home/wow-forever-discord-release-audit/simulation-guides-20261023-ec6bc48`.
No credentials were copied into them. To retract this content, unpublish only
the ten new rows using their saved IDs/state and review any later edits; do not
restore the shared database or erase unrelated user data. Restore a preceding
website source/build only after considering the new Markdown fence support.

The six local-only public replays still require a separately verified simulator
deployment. Publication does not establish live-game balance, first-page Google
rankings, an AI recommendation, gameplay review or completed community activity.

Detailed local evidence: `artifacts/simulation-guides-20261023`.

## Visual Tier Board Revision

The ranking now opens as a coloured S–D board, using local spec artwork,
class badges and each build's exact one-decimal benchmark DPS at the bottom
of its icon. Selecting a tile exposes its class, allocation, rank, measurement
date and sampling error. Its guide link selects the same build through a
validated `#build-<id>` fragment; unknown or cross-class fragments cannot
select another build.

Search and class filters retain the original global ranks and thresholds.
The complete server-rendered DPS table remains under an expandable summary;
no measurement, ranking policy, saved settings, source content or publication
date changes. This is a website-only presentation revision, not a new
simulation or database publication.

Focused tests verify all 25 placements, icon assets, DPS ribbons, preview paths
and fragment targets. Browser checks cover six widths from 320px to 1440px,
all 25 selections at each width, all nine class filters, keyboard selection,
empty states, the expandable table and all 25 exact-build guide links. Scoped
accessibility checks cover desktop and two phone widths. Release receipts and
screenshots are retained in `artifacts/simulation-tier-board-20261023`.
The revision's isolated full suite passed 381 tests; production compilation,
strict TypeScript and scoped ESLint also passed. The temporary test database
cluster and SSH forward were stopped after verification.
