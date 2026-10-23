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
groups and ten scoped accessibility checks. These do not alone prove production
availability. Immutable build/source checks, protected baseline, publication and
live browser/XML verification remain release gates.

Detailed local evidence: `artifacts/simulation-guides-20261023`.
