# Personal Loot Recommendations And Gear Comparison

Research date: 3 October 2026.

Status: the direct Discord SR link is implemented locally and covered by regression
tests. It has not been deployed as part of this task. The recommendation engine,
gear comparison and external character connections below are an implementation
plan, not shipped features. Existing live SR, HR, signup, audit and repost behavior
must remain intact throughout this work.

## What Is Wrong Today

The visual page is `components/raids/soft-reserves.tsx`. Its default is all loot,
ordered by source. `Available to me` checks the catalog's explicit class
restrictions and the event's HR list. It does not evaluate specialization, armor
or weapon proficiency, intended role, level, profession requirements or equipped
gear. It is a reserve-policy filter, not a recommendation system.

Consequently, an unrestricted cloth caster item can appear for a warrior. This
does not mean the source declares it warrior gear. Equippable, suitable for the
signed-up role, and an upgrade over current gear are three different questions.
The UI currently fails to make those distinctions.

The importer `scripts/raids-trader-item-details.ts` retains client icons and
text-safe tooltip lines, but the strict `raid-item-details.v1` contract does not
retain structured equipment slots, stats, level requirements or weapon properties.
Those already exist in owned WoW Trader's `apps/web/src/lib/data.ts`. Reimport the
facts; do not reconstruct them from English tooltip text or item names.

`ForeverCharacter` currently stores edition, realm, name, class, specialization,
region, faction and ruleset. It has no equipment snapshot or external identity.
Owned WoW Trader's collector currently exports auction data, not a gear profile.
Neither an Armory connection nor addon gear synchronization exists today.

## Target Member Journey

1. Open the Discord post's direct SR link. Discord authentication returns to that
   exact page, with the existing community-membership check.
2. Use the character already signed up for this event. If none is signed up, show
   the signup action without presenting somebody else's preferences as personal.
3. Start with items relevant to the signed-up class, spec and role. Choose an
   equipment slot or search an item; boss/source is a secondary filter.
4. Open a candidate to see why it fits, its source, HR status and competition.
   With gear connected, compare it to the relevant equipped item.
5. Add to the existing persistent basket and save explicitly. Role quotas, policy
   acknowledgement, duplicate rules and deadlines remain server-authoritative.

Recommendations must never silently select SR items, change signup specialization,
spend reserves or rewrite an already saved basket.

## Loot Page Design

Use the existing KFC-inspired spec icons, class colors, item icons and item
tooltips. Keep the page a dense, usable loot tool rather than a decorative hero.

The top context bar identifies the signed-up character, class/spec icon and role.
When connected, it also shows gear source, snapshot age, refresh state and a
disconnect action. No Battle.net connection is required to reserve loot.

The browsing controls are:

- View tabs: `For my spec`, `Equippable`, `All loot`, `Profession & materials`.
- Slot selector: recognizable item-slot icons with names/tooltips; `All slots`
  remains available. Rings and trinkets each remain one browsing category.
- Secondary controls: boss/source, search, main-spec/off-spec preference and sort.
- Sort choices: `Spec relevance`, `Upgrade candidates` only with usable gear/model
  coverage, `Name`, `Source`, and `Fewest competing players`.
- Keep `My selections` and `Hard reserves` available as independent views, along
  with the existing player-reservations view and transparent HR disclosure.

Default to `For my spec` only where a reviewed spec-fit policy exists. Otherwise
use factual browsing and state that recommendations are unavailable. Missing
specialization, incomplete facts and a model failure are not a zero score.

Selecting off-spec changes the browsing preference only. It must not change the
event's recorded role or SR allowance. Host restrictions, if later introduced,
must be an explicit audited policy, not an accidental side effect of recommendations.

Each item needs an icon, quality/name, slot, source, concise relevance reason,
competition count and selection state. HR items retain their named exclusion.
Already selected items stay visible in the basket even after filters or spec
preferences change. Search remains usable without imported gear.

Recommendation labels should describe evidence, not imply certainty:

| Label | Meaning |
| --- | --- |
| Strong fit | Reviewed main-spec/role candidate; not automatically an upgrade |
| Situational | Useful under named cap, set, encounter or loadout conditions |
| Off-spec | Equippable but not relevant to the currently selected objective |
| Not equippable | A known proficiency or requirement prevents equipping it |
| Not evaluated | Missing or unsupported facts/model prevent a useful conclusion |

Reserve eligibility remains separate. Recommendations cannot bypass class
restrictions, HR or deadlines. A newly discovered discrepancy in catalog
restrictions goes through review, not an unversioned eligibility rewrite.

On desktop, use compact item rows with a comparison side panel. On mobile, use a
full-height accessible comparison sheet and the existing fixed basket/save bar.
Keep slot controls scrollable without horizontal page overflow. Hover, focus and
tap must all provide item inspection; color alone cannot convey suitability.

## Spec Fit Before Gear Scores

Do not solve the cloth problem with a primary-armor-only blacklist. TBC caster
and healer builds can have legitimate lower-armor choices. Rules must be keyed by
edition, class, specialization, signed-up role and objective.

Required review cases include:

- Protection warrior: tank mitigation/threat and shield context; caster cloth is
  not a main-spec recommendation merely because it can be equipped.
- Arms/Fury warrior: distinguish two-handed and dual-wield loadouts, weapon type,
  hit/expertise and attack-power candidates; do not apply Retail weapon mechanics.
- Holy paladin: preserve legitimate non-plate healing candidates.
- Elemental/Restoration shaman: caster/healing context, not a mail-only rule.
- Enhancement shaman: melee weapons and melee-oriented stats, not caster gear.
- Feral druid: use event role to distinguish tank and damage; the shared `Feral`
  label is not enough to choose a model.
- Hunter, rogue and casters: weapon/armor proficiency, intended stats, school-
  specific effects, level and profession constraints where evidence exists.
- Tier tokens: recommend verified redeemable class/spec items, not the token as
  though it occupies an equipment slot. Redemption mappings need their own source.
- Recipes/materials: show in their own view with profession requirements; they
  do not receive equipment-upgrade scores.

PvP realm ruleset must not imply a PvP gear objective. A player on a PvP ruleset
can be signing up for a PvE raid. Likewise, a character's last observed talents
must not silently overwrite the spec chosen for an upcoming event.

Ship reviewed relevance rules before attempting to market every spec as BiS.
Where a requirement is unknown, explain it rather than inventing proficiency,
profession skill or a stat cap.

## Structured Facts And Engine Reuse

Add a versioned, build-pinned structured item-facts contract alongside the
existing safe tooltip presentation. Include inventory type/slots, required level,
class/race masks, armor/weapon subclass, weapon damage/speed, raw stat identifiers,
resistances, requirements, sockets, set membership, unique-equipped limits and
supported effects. Preserve unresolved-effect markers and source provenance.

Reviewed catalogs remain immutable sources for the reservable pool and explicit
class restrictions. Enrichment cannot add unreviewed reservable items. Conversely,
an equipped baseline can contain quest, dungeon, crafted or PvP items outside the
raid pool; it needs the edition-matched full item library.

Owned WoW Trader already contains `packages/bis`: a catalog adapter, eligibility
checks, a rule-based evaluator and a constrained loadout optimizer with validation
and confidence diagnostics. Reuse those parts through a reviewed, versioned
package/service integration. Do not introduce a second optimizer or depend on a
sibling checkout being present on the production server.

The generic engine does not establish that every TBC or Forever spec has a
production-validated model. Model data is a separate delivery: versioned
assumptions, stat/cap rules, weapon handling, set effects, supported procs and
hand-checked fixtures. Whole-loadout search is not required for the first browse
screen; constrained replacement evaluation is enough for the first comparisons.

The response records item-facts version/checksum, catalog checksum, model version,
gear revision, objective, reason codes and confidence. A numeric score, when
available, is a model score, not measured DPS. Unknown effects do not become zero
value. Current imported tooltips mark unresolved effects on 97 TBC loot items;
these need explicit uncertainty in recommendations, especially trinkets.

No LLM chooses equipment legality, stat deltas, loot policy or upgrade scores.
Optional generated wording can explain already computed facts, with a deterministic
fallback, but cannot add new claims about items or performance.

## Equipped-Item Comparison

Show `Equipped` and `Candidate` with equal-sized icons, item names, stats and
provenance. Display factual stat differences before any optional model judgement.
Unknown values are unknown, not zero. Without imported gear, show spec fit and
an option to enter the relevant equipped item manually.

Replacement rules must handle the actual loadout:

- Rings/trinkets: compare both legal replacement positions, and identify which
  one is being replaced; never blindly compare to the first slot.
- Two-handed weapons: account for displacement of both main hand and off hand.
  Dual-wield comparisons include the relevant hand and weapon interactions.
- Unique-equipped limits and set breakpoints: evaluate the proposed combination,
  including lost as well as gained bonuses.
- Gems/enchants: label whether comparison is base-item or enhanced-loadout. Do not
  compare an enchanted current item to an ungemmed candidate and call that BiS.
- Tokens: compare a verified redemption outcome; keep the actual token as the
  reservable ID so basket/export semantics do not change.
- Equipped is not owned: a gear snapshot cannot prove what is in a bank or bags.
  `Already equipped` is factual; `Already owned` needs additional explicit data.

If the gear snapshot is old, has the wrong edition/build, or the relevant effect
model is unsupported, suppress definitive upgrade ordering. Browsing and saving
SR must still work. Explanations need practical reasons such as a cap threshold
or a set breakpoint, not fabricated percentage improvements.

## Character Data: Armory And Alternatives

### What Research Establishes

Blizzard announced Classic character/status/equipment and account-profile
endpoints in 2023. This establishes that a Classic equipment API exists, not that
every Classic edition or beta has the same namespace and coverage.
[Blizzard's Classic API announcement](https://eu.forums.blizzard.com/en/wow/t/new-apis-now-available-for-testing/461426).

TBC Anniversary has public developer reports of namespace/refresh problems.
Those community observations are leads for testing, not an official endpoint
contract. Verify the current edition-specific documentation and actual character
responses before selecting a provider.
[Anniversary namespace discussion](https://us.forums.blizzard.com/en/blizzard/t/tbc-anniversary-namespaces-and-data-refreshes/57155).

This research did not verify a supported Forever character/equipment endpoint or
an official promise of one. The recent API-access discussion contains community
requests, not a supported contract. Do not infer availability from Retail or
TBC, or treat the forum's unsupported assertions as Blizzard policy.
[Forever API-access discussion](https://us.forums.blizzard.com/en/blizzard/t/when-will-we-gain-api-access-to-forever-apis/59595).

Therefore: use an official Blizzard API when the exact edition is proven;
keep manual input available for both editions; plan an opt-in owned-addon export
for Forever rather than block the product on an unverified Armory.

### Provider A: Official Blizzard Equipment

Keep Discord as the login and membership authority. An optional `Connect
Battle.net` connection is separate from Discord authentication. Public profile
lookup by name does not prove that the Discord member owns that character.
Where supported, obtain the user's account character list through the official
OAuth authorization flow and match the selected character identity.
[Blizzard's account-profile OAuth explanation](https://us.forums.blizzard.com/en/blizzard/t/wow-profile-api-403-response-from-app-200-in-browser/6007).

Before enabling TBC sync, perform a read-only capability spike:

1. Register a separate Battle.net API client with current terms accepted. Keep
   its client secret server-side; no Battle.net password is given to this website.
2. Verify the current Anniversary profile namespace, API host, region/realm
   identifiers and public versus user-authorized endpoints in the Developer Portal.
3. Test equipment and status for a consenting real EU character and US character;
   test optional account ownership linking separately. Validate edition, returned
   identity, slots, item IDs and update timestamps.
4. Document supported regions, profile freshness, missing/protected profile behavior,
   rate limits and required scopes. Enable only the proven capabilities.
5. Repeat the spike independently for Forever when an official contract exists.

Never guess a namespace and silently fall back to Retail or Era on a 404. A
same-named character in a different product is not a valid fallback. Name changes
and transfers require identity reconciliation; a numeric character ID must not
be assumed globally stable across editions, regions or transfers.

Use a server worker for refresh, bounded timeouts and retry/backoff on 429/5xx.
Page rendering and SR saving must not wait on external API calls. Distinguish
provider data-update time from the time we fetched it: refetching an old profile
does not make its equipped loadout fresh.

### Provider B: Owned Addon And Companion

Extend WoW Trader's collector only as a separately scoped addon/companion release.
The current market collector must keep working independently of gear opt-in.

An explicit `Export my gear` action captures a versioned equipment snapshot:
edition/product, client build, character identity/region/ruleset, level, class,
capture time and slot-to-item-link/ID records. Include gems/enchants and talents
only where their client APIs are available and the member opts in. Verify those
APIs on each client rather than assume Retail compatibility.

The addon cannot directly send HTTP. Reuse the companion's SavedVariables
watch/upload pipeline with a new bounded, validated gear payload. SavedVariables
disk write latency must be explicit in the product flow; the existing collector
already uses interface reload to persist exports. A manual copy/export can be a
browser-only fallback after the format is implemented and tested.

Pair the companion to an authenticated Discord member through a short-lived,
single-use challenge. Give it a scoped revocable credential, not a Discord login
token or a market-upload credential that can write arbitrary character gear.
An addon upload remains self-reported; pairing authenticates the uploader, not
independent game ownership or the truth of every exported item.

The server validates identity, slot uniqueness, item-link structure, plausible
edition/build, capture age and payload size; resolves item stats from trusted
edition-matched data; and rejects malformed, replayed or out-of-order snapshots.
It must not trust uploaded stat totals, Lua code or arbitrary remote URLs.

### Provider C: Manual Gear

Start with a slot-based editor that accepts validated item IDs or game item links.
Look up trusted facts server-side and clearly label the result as self-reported.
Allow partial gear without forcing twenty fields just to compare one trinket.
Missing slots stay unknown. Keep the last usable snapshot when an upload fails;
never replace a full loadout with an empty result from a transient error.

This gives a testable comparison experience before API credentials, external
availability or a new addon release are ready.

## Storage, Privacy And Authorization

Proposed additive records are external character identities, optional provider
connections and private gear snapshots. Snapshots carry source, capture time,
provider update time, observed time, edition/build, normalized equipped slots,
integrity checksum and revision. These are new contracts to design, not tables
already present in the database.

Gear belongs to the existing member-owned character. Every import, refresh,
comparison and deletion checks ownership and community membership. Admin channel
selection remains server-enforced and unrelated to any Battle.net permission.
Organizers cannot automatically access a member's full gear history. Public
Discord posts and SEO pages do not acquire private equipment or account identifiers.

Battle.net tokens are encrypted at rest with a dedicated server key and never
logged, exposed to the browser or placed in an item URL. OAuth linking uses state,
secure cookies, callback allowlisting and replay prevention. Manual/addon actions
retain CSRF checks, scoped authorization, request limits and auditability.

Blizzard's published data policy requires API-derived player data to be refreshed
or deleted within 30 days and deleted when it becomes unavailable through 404.
Recheck current terms at integration time and implement purge/revalidation rather
than retain revoked profiles indefinitely.
[Blizzard's data-protection notice](https://us.forums.blizzard.com/en/blizzard/t/data-protection-notice-and-faq/609).

A provider's explicit privacy/removal response purges its derived gear. A malformed
namespace/configuration error is not silently treated as character deletion.
Transient service failures never extend the retention limit. Purge also covers
caches, queued jobs and backup restoration behavior; restoring old provider data
must trigger revalidation before use. Disconnect removes provider secrets and
equipment derived from that connection. Manual/addon profiles use the member's
separate deletion choice and documented retention policy.

For UX, propose a 24-hour stale-gear warning and a manual refresh cooldown. These
are product choices, not Blizzard API guarantees. Cache recommendations by member,
character, event catalog, gear revision, objective and model/facts versions, never
in a shared public cache. Expiry or deletion invalidates derived comparisons too.

## Implementation Order

1. **Direct SR discovery:** current local patch adds an embed link and, in native
   mode, a direct browser button on a second row. Native reserve controls remain.
   Closed raids keep the browser link for read-only inspection. Events without
   an SR pool do not advertise a nonfunctional SR action.
2. **Fix browsing without external dependencies:** export structured item facts,
   add slot filters and reviewed spec/role relevance, separate profession loot,
   preserve all-loot and off-spec access, and test primary-armor exceptions.
3. **Manual gear and comparisons:** add private snapshots, relevant-slot entry,
   factual comparison and safe replacement/set/unique handling. This is the first
   complete recommendation-to-reserve feedback loop.
4. **Optional data connections:** prove TBC's official API coverage; build the
   owned-addon snapshot as its own compatible release. Either provider can be
   activated independently with explicit capability/freshness state.
5. **Validated ranking:** integrate reviewed WoW Trader evaluator/model coverage,
   initially for a narrow set of pilot specs; expand only after fixture and player
   review. Forever stays on its own facts and models, not copied TBC scoring.

Deploy each implemented phase after its verification, not the entire speculative
engine in one release. Use member beta for feedback from a tank, melee DPS,
ranged caster and healer. Recommendation feedback records a reason and model
revision without turning popularity into authoritative item facts.

## Acceptance And Regression Coverage

- Discord embed and direct button both reach the exact event SR page; native
  interaction controls and five-buttons-per-row limits are preserved.
- Main-spec warrior browsing does not promote caster cloth. Holy paladin and
  supported shaman healing/caster exceptions remain usable.
- Feral tank and damage, two-handed and dual-wield loadouts, tokens, unique items,
  rings/trinkets, profession restrictions and set gains/losses have reviewed fixtures.
- Missing equipment, wrong edition, partial slots, unknown effects and unsupported
  models never create a fake upgrade score or a false definitive BiS claim.
- Known real item fixtures test spec relevance, factual stat deltas and caps;
  structured metadata validation prevents parsing tooltip prose as numerical data.
- Filter/spec changes preserve saved and unsaved baskets; quotas, duplicate rules,
  named HR, policy acknowledgement and deadlines are unchanged.
- Ownership, membership loss, CSRF, OAuth replay, snapshot tampering, wrong
  namespace/identity, 404/privacy removal, 429/5xx, stale data, deletion and
  out-of-order uploads have automated tests.
- Browser checks at 1440, 768, 390, 360 and 320px verify images, text overflow,
  keyboard focus, hover/tap comparison, accessible controls and save behavior.
- A consenting real character proves each activated provider. Mock responses
  establish parsing/error behavior, not real edition support or current gear.
- The final end-to-end check is Discord SR link -> Discord login -> signed-up
  character -> relevant slot -> inspect/compare -> reserve/save -> current Discord
  event state, without exposing private gear in the public post.
