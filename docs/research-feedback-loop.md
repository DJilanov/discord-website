# WoW Forever Research Feedback Loop

Updated October 4, 2026.

## Product boundary

The community site owns readable, indexable reports at `/research`. KFC Helper owns build-scoped
entities, calculations, and public JSON under `https://helper.kfcguild.online`. The community site
validates Helper responses before rendering them and shows an unavailable state instead of silently
substituting estimates.

The live report library covers:

- normalized client build changes;
- Auction House trends that pass a stricter public evidence gate;
- recipe and cooldown coverage by profession;
- aggregate recruiting demand from approved guild listings;
- catalog, market, source-hint, and loot-lead coverage;
- map, encounter, boss, spell, location, and quest coverage;
- public data endpoints and publication methodology.

BiS, class scaling, content availability, source identity, and drop probability remain separate
claims. They must not be published merely because an item or encounter exists in client files.

## Evidence-to-action cycle

1. The catalog guardian publishes a validated immutable Helper build.
2. Accepted addon scans update market observations and price signals for one exact market/build.
3. The Helper observatory emits a versioned summary. Public market conclusions require at least 24
   accepted observations and 50% model confidence; the live Trader can still show collecting states.
4. `/research` turns that evidence into server-rendered reports with exact build/sample context.
5. Report links measure `research_action` and `dataset_download` intent. DNT and GPC opt out.
6. Readers can mark a report helpful, unclear, incorrect, or missing evidence. No email, Discord ID,
   or character identity is requested.
7. Staff reviews the queue at `/admin/research`. Status changes are written to the audit log.
8. Corrections change source data or report logic, then the same pages update. Search and conversion
   performance is evaluated over comparable seven- and 28-day windows, not one personalized result.

## Data contracts

- Observatory: `GET /api/v1/public/forever/observatory`
- Item: `GET /api/v1/public/forever/items/{itemId}`
- Recipe: `GET /api/v1/public/forever/recipes/{spellId}`
- Profession: `GET /api/v1/public/forever/professions/{slug}`

Public JSON uses explicit schema versions and canonical entity URLs. Large copper values are strings.
Responses allow cross-origin reads and advertise shared-cache lifetimes. Reusers must retain build,
market, timestamp, and evidence status.

## Operations

Release and recurring operations:

1. set `HELPER_PUBLIC_URL` when production differs from `https://helper.kfcguild.online`;
2. migration `034_research_feedback` was applied on October 4, 2026 after a verified backup restore;
3. deploy Helper before the community site so the public contract exists when reports become live;
4. verify `/api/v1/public/forever/observatory`, all seven report URLs, the sitemap, and one feedback
   submission/review cycle;
5. confirm `/admin/research` counts actions, downloads, and feedback without exposing identities;
6. submit the updated sitemap once through the existing Search Console property, then compare
   seven- and 28-day query/page results instead of repeatedly requesting indexing.

Production Helper release `kfc-helper-forever-research-20261004-r3` and community build directory
`.next-release-research-20261004-r2` are active. Search Console submission remains an account-side
owner action because this deployment has no Search Console credential or connected API.
