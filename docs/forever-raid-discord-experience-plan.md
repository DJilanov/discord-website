# Forever Event Posts: Design And Adoption Plan

Research date: 3 October 2026.
Status: the native signup and class/spec roster slice is implemented and hosted
as an allowlisted private pilot. See the [release ledger](raid-native-release.md)
for verified capabilities and remaining work. This document retains historical
diagnosis and future design proposals, not a claim that the entire Raid-Helper
replacement is complete.

This expands the presentation and interaction work in the
[raid-manager blueprint](forever-raid-manager-implementation-plan.md). The
[private-pilot ledger](forever-raid-manager-private-pilot.md) remains the source
of truth for implemented features. The community remains Forever-focused, but
the owner subsequently expanded the private manager to **Forever and TBC**.
Use the [TBC pilot contract](raid-manager-tbc-pilot.md) for that edition;
characters, artwork, definitions and reviewed loot remain edition-scoped.
The supplied Black Temple screenshot is a visual reference, not a loot dataset.

## 1. Diagnosis And Recommendation

The current post exposes the engine's fields instead of presenting an event
people want to join. Adding a banner alone would not fix that.

The first redesign should combine a recognizable WoW roster with a short,
Discord-native signup. The website becomes the detailed organizer, composition
and loot workspace, not a required detour for every returning member.

**Recommended first format: an enhanced classic embed with application-owned
class/spec emojis and native buttons.** That is sufficient to match the
screenshot's strongest qualities and preserves compact inline class groups.
Compare a Components V2 candidate privately before choosing it for new posts;
V2 offers useful hierarchy, but does not automatically make a roster better.
Native signup must not wait for that format experiment.

Artwork direction updated on 3 October: the owner requested beautiful wide
activity covers. The [50-cover artwork library](../public/images/raids/events/README.md)
is now prepared: 36 dungeon/wing concepts, all three announced raids, all four
battlegrounds and the seven existing type fallbacks. The original 14 images
remain unchanged; the expanded inventory includes the returning Classic wings.
Nine TBC raid covers were subsequently added. This supersedes the initial
thumbnail-only preference. Attachment-based delivery is now implemented: the
private questing post was refreshed and its Discord-hosted cover checked against
the local asset. Artwork is not a CSS background behind live roster text.

The browser event preview now has an illustrated header, class/spec portraits,
role-grouped confirmed positions, separate pending/bench lists and responsive
signup controls. That does not implement signup buttons inside Discord.

The differentiation is one event, one character identity and one reserve
agreement, with clear membership, seat and publication states. It is not a claim
that we already exceed Raid-Helper or support unreleased loot.

## 2. Evidence: Reference Versus Current Post

The owner supplied `Screenshot 2026-10-03 at 9.11.19.png`. It shows a closed
Raid-Helper Black Temple event, six signups and four absences. It does not show
the active signup interaction, its creator wizard or a mobile rendering.

| What works in the reference                      | What our post currently does                      | Design response                                                                       |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Distinct title and accent                        | Title/activity/administrative information compete | Event title first; scope and status subordinate                                       |
| Calendar, clock, organizer and participant icons | Plain When/Roster/Admission fields                | Compact icon-led summary with a real host                                             |
| Tank/healer/melee/ranged counters                | Only tank/healer/damage text                      | Preserve truthful role totals; add damage breakdown only after Forever mapping review |
| Class headings and spec icons next to names      | Repeats full spec/class text for every name       | Class-led roster, recognizable spec portraits and clear role exceptions               |
| Omits empty class groups                         | Three empty role fields in the test event         | One recruitment summary; no empty roster columns                                      |
| Bold names with distinct rows                    | Six-name truncation per generic role              | Budgeted roster preview and complete private roster view                              |
| Separate absence line                            | Pending and bench only                            | Keep current states accurate; plan availability separately                            |
| Web/Comp/calendar links support the roster       | A website link is the only signup control         | Native Sign up and My signup; web becomes secondary                                   |

The reference also has weaknesses we should not copy: repeated BT text,
oversized blank gaps, a long name wrapping badly, an opaque numbered roster,
and small calendar links. Its closed-state dropdown cannot establish the UX of
an open event.

Raid-Helper's own guides describe class fields, per-class specs and independent
role counters, including remembering a spec for later signups. Those are useful
workflow expectations, not proof of this server's exact active interaction.
[Raid-Helper guides](https://www.raid-helper.dev/documentation/guides)

### Earlier Read-Only Baseline

On 3 October, the existing private test post was inspected through the bot:

- One classic embed, no thumbnail or image, and a 328-character description.
- When, Roster, Admission, three empty role sections, and one pending signup.
  Pending is not accepted attendance; it must not inflate the participant count.
- One link-style `Sign up / manage roster` button, without an icon.
- The community has 62 guild emojis, including all nine class names. A complete
  spec/role mapping has not been established.
- The application has zero application-owned emojis.

No competitor accounts, private DMs or ordinary-user automation were used.

### Additional Signup And Roster Evidence

The owner supplied two further screenshots on 3 October:

- `Screenshot 2026-10-03 at 15.34.23.png`: an open native class dropdown with
  recognizable WoW icons beside Warrior, Druid, Paladin, Rogue and Hunter.
  It demonstrates a discoverable in-message choice, not the full registration,
  spec selection, persistence or error recovery behind it.
- `Screenshot 2026-10-03 at 15.35.06.png`: a 15-person roster with tank/healer/
  ranged/melee summaries, class headings and spec icons beside named players.
  This is a visual roster, not evidence that it is a generated chart image.
  The numbered labels' meaning and the inclusion rules for the separate Tank
  group cannot be established from a screenshot alone.

The strongest combination is **who is attending + what they play + a direct
signup action**. Retain that combination without copying the large blank gaps,
unexplained numbers or a mixture of grouping rules that could list someone twice.

Current code confirms the gap: `discord-panel.ts` emits link-style controls;
`interactions.ts` accepts `/raid` commands only, not component clicks or modal
submissions. `/raid join` needs a previously registered character and explicit
options, while `/raid reserves` returns a website link. All event types currently
share that limitation. The engine, ownership validation, frozen character/spec
snapshots, admission rules and Discord signature route are reusable.

The later live post has an attached cover and one confirmed participant. Do not
reuse the earlier no-image/one-pending baseline as its present state. Emoji
inventory observations above are dated observations, not an upload manifest or
a guarantee that all desired icons remain available.

## 3. Visual Direction

### Identity And Art

- Brand the post as WoW Forever through the bot identity and one relevant
  activity cover. Keep contributor credit as **Open source contributors**, not a
  guild team. Do not repeat a credit block in every event.
- Use the existing class/spec bitmap artwork and neutral community logo after
  checking provenance and permitted use. The icon README records Blizzard
  ownership; having downloaded an asset is not a redistribution licence.
- Prefer the activity/location's reviewed cover, with a type-specific fallback
  for custom names. Do not show Black Temple art for a Forever
  questing event or invent an unreleased raid's appearance.
- Use one wide cover per post, without repeating it behind every section.
  Avoid decorative alphabet emojis, animated backgrounds or a rasterized roster.
  Real text stays selectable, readable and updateable.
- Keep one restrained accent, readable headings, compact spacing and familiar
  WoW icons. Class colours belong in the art; Discord does not provide arbitrary
  per-name colours or custom fonts.

### Order Of Information

1. Event title, actual activity/location and one wide cover.
2. Localized date/time and relative start; region, faction and ruleset.
3. Organizer, occupied seats/capacity and admission policy.
4. Combat role summary or a simple participant count; actual openings.
5. Short organizer note and applicable loot agreement.
6. Accepted roster, then compact pending and bench summaries.
7. Member actions; secondary web/detail links and a discreet stable reference.

Put lengthy requirements and explanation in Details rather than before signup.
Keep a concise event-specific condition visible when it affects joining. If
truncating notes, show that more detail exists; do not hide HR or eligibility
terms to make the post shorter.

### Structure Sketch

This is a wireframe with placeholders, not a fabricated event or participant
list, and not a pixel-perfect prediction of Discord's rendering:

```text
<event title>                               OPEN
<activity / location>
<wide activity artwork; no baked-in event text>

<calendar icon> <localized date and time>   <relative start>
<scope icons> EU | Alliance | PvP
<host icon> <organizer>                     <people icon> N / C seats

<tank icon> T / target   <healer icon> H / target   <damage icon> D / target
Looking for: <actual unfilled roles>
<short organizer note; real loot policy when applicable>

<class icon> <Class> (N)        <class icon> <Class> (N)
<spec icon> <character>        <spec icon> <character>
<spec icon> <character>

Pending signups (N) | Bench (N)             <private complete-roster action>

[Sign up] [My signup] [Roster] [Reserves, only if usable]
[Event details, web]
<small, stable event reference and meaningful update time>
```

Inline classic fields may stack on mobile. Do not implement fake columns using
padding, spaces or a monospace table. For V2, the primary actions can sit near
the summary before the roster; a long post should not bury the signup action.

### Accepted Roster

For a five-person session, use one compact list. For larger combat events,
group by class, show only occupied classes, and keep a stable class order and
signup order within each group. A class heading avoids repeating the class
name on every row.

Each row has a spec icon and bold character name. When the chosen role is
ambiguous or differs from the reviewed spec suggestion, include an explicit
role indicator. Feral tank and Feral damage must not become the same assignment.
The stored event-specific role remains authoritative, not the character's later
profile or a guessed icon mapping.

Keep recognizable spec names available in My signup and the complete roster;
use descriptive emoji names and text fallbacks. Discord emoji hover is not a
replacement for an accessible, labelled character/spec/role view.

Avoid numbering unless it has a real meaning. Signup order is not an assigned
raid group or a promise of FIFO bench promotion. A later composition view can
show actual group/slot numbers after organizer assignment.

### Visual Roster Specification

Use two complementary views of the **same accepted signup set**:

| Surface                        | Default layout                                                                                                           | Interaction                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Main Discord post, small party | One compact list with every accepted character, spec and chosen role; truthful openings                                  | Sign up, My signup and complete roster                                        |
| Main Discord post, raid        | Populated class groups with class icons; each row has spec icon, bold character name and a short role label where needed | Class-led view is shared and stable, not changed by a member's private filter |
| Private Discord roster         | Class or role grouping; accepted, pending and bench filters with pagination                                              | Filters update only that member's ephemeral response                          |
| Browser event                  | Responsive class/role view using the same projections; clear counts and real empty positions where configured            | Richer searchable roster and authorized organizer actions                     |

Keep the existing fixed-position five-person browser view useful; do not force a
three-column raid layout onto dungeon/questing events. Social/Other events use
participants and class portraits only when known, without requiring combat specs.

Every accepted character appears **once** in a displayed grouping. In the
class-led post, tanks stay in their own class group and carry a Tank indicator;
do not also add a separate Tank roster that repeats those names. In the
role-led private view, class/spec icons remain beside each name. Class totals
and role totals are separate summaries of the same people, not additive seats.

For each populated class, render a real class emoji and `Class (N)` heading.
Render a real specialization emoji followed by the character name, with spec
text and explicit role in the full private view. Use a readable class/name/spec
fallback when an emoji is missing. An icon never establishes a player's
verified in-game identity; profiles are member-declared until an actual
verification method exists.

The summary must reconcile exactly:

- Accepted seats = tanks + healers + damage for combat events.
- Damage = reviewed melee + reviewed ranged + unclassified damage.
- The sum of accepted class groups = accepted seats.
- Pending, bench and withdrawn do not inflate any accepted counter.
- A role cap is the organizer's configured limit, not a proven optimal setup.

Melee/ranged classification needs an edition-aware reviewed mapping. The current
domain stores `damage`, not separate melee/ranged admission quotas. Do not create
new quotas merely for this display. A Feral signup's chosen Tank/Damage role
distinguishes bear/cat participation; spec alone is insufficient. A chosen Tank
role on another supported spec is still a tank signup. Unsupported or changing
Forever builds remain labelled Damage until their classification is reviewed.
Changing a profile must not relabel an existing frozen event signup.

Show missing seats as `Looking for: ...` based on actual capacity and role caps,
not a generic claim that every raid needs another shaman or a specific buff.
Buff coverage, gear checks and an "optimal composition" score require reviewed
edition/content data and explicit declarations. They are later organizer tools,
not facts inferable from a class icon or an AI-written summary.

For classic embeds, populated class groups can be inline fields, but Discord
owns column widths and mobile stacking. Never pad text to force the screenshot's
exact three-column geometry. At 20/25 players, show the full accepted roster when
the assembled field/overall budgets permit it. Larger or long-name rosters get
fairly allocated previews, per-group overflow counts and a complete private view.
Never silently discard the classes at the end of the list.

Do not rasterize the live named roster into a graph: that loses selectable text,
accessibility and compact client-dependent layout. A later optional browser
composition graphic can add role-distribution bars with exact labelled totals,
but it must supplement the named roster. No decorative pie chart should replace
the information the owner wants: **who signed up with which character/spec**.

Membership/class listings are not assigned raid groups. Actual party planning
requires persisted group assignments and permissioned organizer edits. Plan
that as a separate feature; do not invent Group 1/2 numbers from signup order.

### Adaptive Event Types

| Type         | Main emphasis                                          | What should not appear                           |
| ------------ | ------------------------------------------------------ | ------------------------------------------------ |
| Raid         | Composition, seats, signup and reviewed loot policy    | Empty SR promises or other-edition tables        |
| Dungeon      | Destination, start, five-player preset and openings    | Giant nine-class empty roster                    |
| Battleground | Battleground, team count and configured needs          | Mandatory tank vacancy with a zero tank target   |
| World PVP    | Location/objective, scope, gathering time and capacity | Raid loot controls                               |
| Questing     | Zone/quest, small group and agreed start               | Raid-shaped text wall or mandatory invented loot |
| Social event | Activity, meeting place and participants               | Combat-role counters and mandatory event specs   |
| Other        | Organizer's actual activity and participants           | Invented role or item requirements               |

Capacity and composition remain editable organizer presets, not asserted game
limits. Flexible-role questing is a later explicit admission mode; do not
silently bypass the current combat-role checks for a cosmetic improvement.

### Time And Scope

Use Discord timestamps for each reader's local time and relative start. Add a
short labelled organizer-time reference where it helps coordination: EU uses
Europe/Berlin and NA uses America/New_York, with date-specific CET/CEST or
EST/EDT. Preserve the stored instant; do not reinterpret it using the browser or
server timezone. Never expose an ISO UTC string as the main event time.

Region, ruleset and faction describe the event; they do not automatically
determine every viewer's timezone. Long-future events remain supported.

## 4. Discord Format And Platform Constraints

### Classic First, V2 Compared

Classic is the lowest-risk first improvement: one embed, real emojis, compact
class fields and native action rows. V2 should be a private comparison using
the same event/roster view model, not a second engine.

The V2 candidate uses one accented Container, a compact title, one wide Media
Gallery cover, summary Text Displays, restrained Separators, actions near the summary and
short roster sections. It is not a webpage: no arbitrary CSS, draggable roster,
custom fonts, responsive breakpoint rules or guaranteed multi-column grid.

Discord recommends newer components, while retaining legacy message behavior.
[Components overview](https://docs.discord.com/developers/components/overview)

The published component constraints include 40 total components, five buttons
per action row, 25 string-select options and 100-character custom IDs. Layout
choices include Containers, Sections, Thumbnails and Separators. We should
leave budget headroom, not build against every maximum.
[Component reference](https://docs.discord.com/developers/components/reference)

Classic embeds permit 25 fields, 1,024 characters per field value and 6,000
combined embed characters. Validate the assembled payload after escaping and
emoji expansion, not merely the original character-name lengths.
[Message limits](https://docs.discord.com/developers/resources/message#embed-limits)

For V2, set a conservative internal total-text budget below 4,000 characters
and verify its acceptance on Discord during the private experiment; this is
our safety budget, not a promise that unlimited text fits in separate blocks.
Count nested components and account for serialized UTF-8 size as well.

**Migration constraint:** V2 replaces content/embeds, and its flag cannot be
removed from that message. A converted post cannot simply switch back to the
classic renderer on error.
[V2 message behavior](https://docs.discord.com/developers/components/using-message-components)

Keep the existing live message classic while comparing separately labelled
private design previews. Prefer format selection for newly created posts. If
conversion is later approved, preserve source identity, approval evidence and
old references in an audited migration; never silently delete/repost events.
Rollback for an existing V2 post means a simpler valid V2 layout, not an embed.

### Emoji Delivery

Prefer application-owned emojis for class/spec/role artwork. This avoids
depending on server boosts, filling guild emoji slots or changing members'
permissions. Discord supports up to 2,000 app emojis, usable by the app without
Use External Emojis; uploads are bounded to 256 KiB.
[Application emoji resource](https://docs.discord.com/developers/resources/emoji#application-owned-emoji)

Use a reviewed manifest with explicit keys such as class-warrior and
warrior-protection. Shared names such as Holy and Protection must remain
class-specific. The initial set is nine classes, 27 specs and a small set of
role/scheduling icons; reuse identical art only where its meaning is clear.

Register assets through a separate idempotent setup operation: preview new
uploads, record their IDs/checksums, do not delete unrelated emojis, and handle
missing/deleted assets with readable text. The runtime renderer only reads that
mapping. It must not upload emojis on every signup or require Administrator.

Existing 56-pixel website assets are sufficient to test legibility; prefer
reviewed higher-resolution originals for Discord's emoji source rather than
inventing detail by enlarging a JPEG. Share semantic mappings with the website,
not a duplicate class/spec definition or blindly copied third-party emoji IDs.

### Roster And Payload Budgets

Show all five participants in a small group. Aim to show a normal 20-player
roster when the assembled payload fits. For up to the supported 100-person
capacity, show truthful totals plus a clearly labelled preview and a paginated
complete roster visible only to the authorized audience.

Allocate the text budget across groups; do not always truncate after six names
per role or omit the last classes. Show an accurate `+N more` for each shortened
group. Pending and bench are separate from occupied seats and accepted-role
totals. Zero-capacity roles do not generate recruitment requests.

Truncate display text by grapheme boundaries before safe Markdown serialization,
without cutting an escape sequence, custom emoji or mention. Full names remain
available privately. Duplicate/truncated display names are never identity keys;
owned character IDs and signed Discord actor IDs decide actions.

## 5. Native Member Experience

### Public Controls

The event post has one clear primary **Sign up** action. Secondary actions are
**My signup**, **Roster**, usable **Reserves**, and a web **Event details** link.
Use short labels and familiar icons where useful. Do not expose 27 spec buttons
or nine competing class-signup commands.

Use this first public action row:

```text
[Sign up] [My signup] [Roster] [Reserves, when usable] [Event details]
```

Sign up is the only primary action. The first four are bot interactions, not
website links; Event details remains a secondary link. Class/spec dropdowns
appear inside the private signup flow. This keeps a returning member's saved
character one confirmation away and avoids advertising a generic class choice
that is not tied to an owned character.

The first screenshot's familiar icon-led dropdown is still the right control
for choosing a class when registering a new character. A saved-character menu
should instead show the character name, with class/spec and realm in its short
description. Select options support custom emojis, not arbitrary image URLs;
use the reviewed app emoji mapping for those icons.
[String select options](https://docs.discord.com/developers/components/reference#string-select)

Public messages cannot have a different primary label for every reader. An
already-signed-up member's Sign up click should open their current signup,
not create a duplicate. Host and staff tools are reached through an ephemeral
authorized menu or context command; a visible button never grants permission.

### Returning Member

1. Click Sign up. Open a private confirmation with the saved matching character,
   event-specific spec, chosen role and actual admission/loot terms.
2. Confirm explicitly. Changing character/spec/role is available in the same
   private flow; selecting an option alone does not occupy a seat.
3. Return a precise result: accepted, pending organizer approval, or bench.
   Show the character/spec and the next action, including reserves only when
   the real catalog/policy allows them.

Target two deliberate clicks for the common saved-character case, not a claim
that every first-time signup can happen in two clicks. Remember defaults without
copying a previous event's acceptance, reserves or rule acknowledgement.

### Concrete Interaction Journeys

| Situation                                  | Private journey                                                                                    | Commit and result                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| One compatible saved character with spec   | Sign up opens a prefilled character/spec/role summary and the current event/audience agreement     | Confirm once; return Accepted, Pending organizer approval or Bench, exactly as saved |
| Several compatible characters              | Icon-led character dropdown, spec selection, suggested editable role, review                       | Selecting alone changes a draft; Confirm commits one signup                          |
| No compatible character                    | Class selection and name modal, then class-specific spec/role step with event scope displayed      | Save character; final explicit signup confirmation remains separate                  |
| Already signed up                          | Sign up and My signup open the same current participation view                                     | Change or confirmed Leave, never a duplicate signup                                  |
| Class/spec changed                         | Warn that existing reserves may be cleared and approval may be reapplied                           | Use canonical service transition; display the resulting admission and reserves state |
| Full or approval-only event                | Explain Bench or Pending before confirmation; report the actual outcome after the capacity recheck | No stale "last seat" promise or automatic promotion claim                            |
| Locked, cancelled, closed or expired draft | Show the relevant reason and current read-only status or Start again                               | Do not mutate or falsely report success                                              |

For first registration, enter the actual game character name, not a guessed
Discord nickname. Derive game, realm, region, faction and ruleset from the event
and show them in the confirmation. Apply existing Forever first/last-name and
TBC name validation without weakening either. If a compatible character already
exists, offer it rather than silently creating a duplicate identity.

The main summary and the private result state the admission policy. Keep short
event-specific conditions, audience disclosure and the applicable loot agreement
visible at the final confirmation. It is a conscious join action, not an unnoticed
acknowledgement caused by choosing an icon. Public-channel signups can use this
same native consent step later; the current slash-command block must not be
removed until equivalent disclosure and stored acknowledgement actually exist.

Do not invalidate a draft merely because another player joined. Recheck the
current capacity at commit and bind rule acceptance to the existing event policy
checksum. A material rule/scope/catalog change requires a fresh review; another
member's roster revision does not. Changes to the same member's participation
need a revision guard so two open private flows cannot overwrite each other.

Treat My signup as the durable receipt after a slow or lost response. A saved
signup can be read again even if its ephemeral confirmation expired. Never
repeat a database mutation simply because Discord could not show the follow-up.

### First-Time Member

Do not require website OAuth merely to use a correctly signed in-server bot
interaction. The actor still maps to the same member and character records.
Keep website OAuth for website access, and keep staff authentication separate.

If no compatible character exists, provide an ephemeral registration flow:
choose a class and enter a validated name, then select the class's spec and
review role/scope before final signup. Scope defaults from the event and is
shown explicitly; defaults never silently change an existing character.

The spec picker depends on class. Do not pretend a static modal can dynamically
reload its options. Collect class/name first, then show an ephemeral spec/role
step. Discord currently supports labelled modal inputs and string selects.
[Modal components](https://docs.discord.com/developers/components/using-modal-components)

Character creation and event participation are distinct operations. Cancelling
the second step must not create a signup. Reuse the website's name normalization,
class/spec validation and current profile ownership rules.

For many saved characters, paginate compatible choices rather than exceeding
select limits. Never use a server member picker to impersonate another player's
character. Ordinary members can change only their own participation.

### My Signup And Leave

My signup shows actual admission, character/spec/role, applicable deadlines,
reserves and lock state. It offers Change and Leave only where allowed. Leave
requires a short actor/event-bound confirmation and accurately reports any
released seat/reserve consequences. Expired controls reopen a fresh view;
they do not claim success or replay a stale destructive intent.

Changing character/spec uses the existing service semantics: reserves are
cleared and organizer approval is reapplied when required. The native flow
must warn before that transition, not hide it behind an attractive spec icon.

### Native Reserves

After signup, an eligible raid participant can enter the same event's reserve
flow: reviewed item search, explicit choices, allowance, HR exclusions, policy
acknowledgement and deadline. Keep the full item-browser/composition view on the
website; native menus use bounded search or pagination, not an enormous select.

No catalog means no actionable reserve button and no invented SR count. Keep
the truthful `Loot pool not yet configured` explanation where it affects the
raid's agreement. Real Forever loot, permissions, immutable locks and the
loot-master handoff gate from the blueprint still apply.

For the later combined Raid-Helper/Softres milestone, use a native item-search
modal followed by a bounded icon-led result menu. Each choice shows the item
name and its actual catalog facts; HR/unavailable items explain why they cannot
be selected. A reserve basket displays selected quantities, remaining allowance
and duplicate policy, with one explicit Save reserves action. Searching/selecting
does not commit immediately or clear existing reserves on its own.

Use the same immutable catalog, class restrictions, quotas and deadline checks
as the browser. Native and browser edits must detect conflicting versions before
overwriting each other. A five- or ten-result page is preferable to a 25-entry
wall. Real catalog availability, not the event's label, decides whether the
Reserves button exists. This works for TBC reviewed pools too; it does not
authorize importing another edition's tables into Forever.

## 6. States That Must Remain Distinct

| State dimension          | Member-facing treatment                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Signup open              | Sign up available until the real deadline/capacity policy says otherwise                |
| Accepted                 | Occupies a seat; role totals count this signup once                                     |
| Pending admission        | `Pending signups`, not ambiguous `Awaiting approval`; not accepted attendance           |
| Bench                    | Waiting for a seat, with the current promotion policy stated honestly                   |
| Roster locked            | Changes disabled; My signup, permitted roster and event details still readable          |
| Cancelled                | Explicit cancellation, subdued red accent and no signup/reserve mutation                |
| Start/end reached        | Time-aware wording; no false completion/attendance claim based only on the clock        |
| Website approval pending | Discreet publication status for reviewers, separate from organizer admission            |
| Projection delayed       | Honest receipt/host status; a saved signup does not depend on an immediate message edit |
| Bot/service unavailable  | No false accepted result; retry/status path without creating another event              |
| Lost membership/access   | Deny new participation; preserve permitted own-data/removal and recovery paths          |

Do not put technical IDs, delivery errors and three competing approval labels
in the main visual summary. Keep a compact stable reference until reconciliation
can validate the new format. Never remove that reference merely to clean up the
footer while the worker still depends on it.

Use the actual last meaningful event/roster revision time if an update timestamp
is displayed. The current renderer's `new Date()` is a render time, not evidence
of a new signup. Do not refresh an apparent activity clock to make a quiet event
look busy.

### Availability: Subsequent Domain Work

Late, tentative and absent are valuable, but not current implemented states.
Model availability separately from admission; bench is not availability and
legacy withdrawal must not be relabelled as absence.

A proposed explicit absence action releases the seat through an audited
transition while retaining its permitted character/spec history. Late retains
a seat and can include a private ETA. Tentative needs an explicit host policy
about occupying capacity; do not count it as confirmed attendance by default.
Review effects on reserves, promotion and locked snapshots before adding these
controls. Additive migrations and concurrency tests are required.

Melee/ranged is initially a presentation breakdown of accepted damage, not a
new admission quota. Review Forever-specific mappings and handle hybrid choices
explicitly; unknown damage stays Damage. Never infer eligibility from the TBC
reference or double-count class and spec counters.

## 7. Organizer Experience And Useful Differentiation

The host's private management panel should show pending signups, open roles,
bench candidates, the actual loot lock, delivery health and website review.
Prioritize accepting/declining requests and promoting an eligible benched
participant with a confirmation. Do not make an organizer paste event IDs to
perform ordinary management.

Future improvements, after the native roster pilot works:

- Saved activity presets and Duplicate event with a fresh date and empty roster
  and reserves; never copy other people's participation.
- Accessible group composition with class/spec portraits, role counts, flexible
  role choices and host-confirmed group assignments.
- Native soft reserves and one canonical locked roster/loot export.
- Opt-in reminders and useful check-in; no public no-show ranking or mass pings.
- Personal calendar support and one approved native Discord Scheduled Event.
  Calendar Interested remains distinct from a roster seat.
- Far-future session planning, recurrence and rescheduling with explicit DST
  handling and participant notice.

None should be shown as a working action until it has an end-to-end path.
The current prototype has no native calendar, recurrence, availability, check-in
or composition editor. Existing publication approval handlers are local and
must be deployed/registered before claiming their commands work in Discord.

## 8. Implementation Boundaries

### Presentation

Keep `lib/raids/discord-panel.ts` as the owning renderer. Introduce a narrow
typed presentation model only where it is shared by classic/V2 and private
roster views: safe title/notes, scope, real host label, canonical time, counts,
class groups, applicable controls and a versioned source reference.

`EventView` currently has no host label or meaningful update timestamp. Supply
these from the authorized event projection; do not fetch an entire member list
or add public user IDs to a general website response just for decoration.
Reuse `presentation.ts`, `specializations.ts` and `event-types.ts`.

### Components And Authorization

Extend `lib/raids/interactions.ts` with discriminated component/modal schemas,
not a generic unvalidated callback. Preserve the signed interaction route and
existing bridge/community command dispatch. Every action checks:

- Application, server, actor, current member/host authority and pilot access.
- Stored source channel/message identity and the allowed event audience.
- Owned character, valid class/spec/role and current event/policy revision.
- Deadline, capacity, lock and rate limits through the existing event service.

Component IDs are bounded lookup keys, never secrets or permission grants.
Ephemeral drafts bind to actor/event/revision, expire and have one explicit
commit. Repeated selections only update the draft. Signed forwarded/copied
buttons and another member's confirmation cannot create participation.

Discord requires acknowledgement within three seconds; follow-up tokens last
15 minutes. A modal must be opened as the immediate appropriate response, not
after an arbitrary defer or directly from another modal submission. If data
loading takes longer, defer to a private message with a Continue button, then
open the modal from that new click.
[Interaction responses](https://docs.discord.com/developers/interactions/receiving-and-responding)

Separate the quick acknowledgement from durable service work. Preserve
idempotent response/mutation receipts; a token timeout cannot undo a committed
signup. Continuation tokens, if needed by a worker, are encrypted with a short
TTL, excluded from logs and removed after use/expiry. No normal-user token,
self-bot, privileged message-content intent or Raid-Helper API key is needed.

### Projection, Approval And Deployment

The current `discord-delivery.ts` verifier recognizes a classic embed footer.
Before changing markers or adopting V2, implement a versioned formatter/verifier
pair, persist the expected projection/source generation, and test reconciliation
of both formats, including a crash after an uncertain create. A decorative
event reference alone must not grant authority.

Edit the mapped bot message in place. Coalesce roster updates, serialize writes
per event and reject stale revisions. Deletion or unexpected source changes
stop publication; do not automatically create replacement posts. Preserve human
approval across roster-only changes and require fresh review for material event
changes. Native `/approve` remains administrator-only and is distinct from
legacy listings' protected Verified tags.

Honor Discord's bucket/global limit responses and Retry-After across the bot's
raid, listing, bridge and auction workloads; do not make roster refreshes starve
moderation or shared channels.
[Rate limits](https://docs.discord.com/developers/topics/rate-limits)

The pilot defaults to its configured private text channel. Administrators can
already choose eligible text/announcement destinations with the existing
confirmation and per-channel checks. Public faction forum routing, native
calendar and a narrowly privileged production PM2 worker require their own
release gates. Keep PostgreSQL as the one source of truth and preserve the
existing simple-server deployment model.

Channel selection remains restricted to the community server owner or its
current Administrator permission, checked by both the create page and backend.
Normal users follow the configured expected destination. Native signup must
never include a channel picker or use a submitted guild/channel ID to move an
event. Organizer roster rights, administrator publication approval and channel
override rights remain separate authorizations.

Real Discord interactions call the configured application endpoint, not a
developer's localhost. A production-deployed but private allowlisted pilot is
needed for real button testing. Do not change that endpoint to a tunnel or break
existing commands merely to demonstrate a prettier local post.

### Smallest Implementable Native Slice

The next batch should extend the current owning modules, not introduce a second
raid engine or a new bot framework solely for dropdowns:

| Module or contract                                | Required change                                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/raids/discord-panel.ts`                      | Typed, budgeted class/spec roster; custom-ID Sign up/My signup/Roster controls; safe existing marker and link fallback                                      |
| `lib/raids/interactions.ts`                       | Distinct slash, component and modal schemas; actor-bound private state machine; canonical service calls                                                     |
| `lib/discord-bot.ts`                              | Dispatch the raid component namespace before generic commands without catching bridge/listing actions                                                       |
| `lib/raids/service.ts`                            | Reuse admission, character, deadline, capacity and reserve logic; add narrowly scoped conflict guards only where the draft commit needs them                |
| `lib/raids/specializations.ts`, `presentation.ts` | Reuse class/spec/artwork semantics; add explicit reviewed edition-aware damage classification rather than guessing from an icon                             |
| `lib/raids/discord-delivery.ts`                   | Re-render the same mapped message from the latest committed roster; preserve the classic source verifier, attachment and uncertain-delivery handling        |
| Raid interaction storage                          | Extend existing replay receipts to support deferred/component responses; add only the short-lived draft and durable continuation work required by this flow |
| Additive SQL migration and scoped grants          | Register new draft/work fields, expiry indexes and least-privilege worker access; do not rewrite previous migrations                                        |

Drafts hold a random ID, actor/member ID, event/source identity, policy checksum,
the member's original signup revision, selected character/spec/role, draft
revision, expiry and open/committed/cancelled state. Custom IDs carry bounded
lookup/action references, not raw character names, tokens or authoritative roles.
Use a ten-minute initial draft TTL, with Start again after expiry. Consumed drafts
retain only the minimal receipt needed for the documented retention window.
Starting over does not remove a saved character or previous signup.

A selection submits a compare-and-swap draft revision. A commit atomically
validates the current event policy and owned character, applies the service
mutation once and stores the receipt. Duplicate confirms return the receipt.
Conflicting own-signup changes reopen My signup instead of silently applying a
stale Change/Leave intent. Another member taking the final seat is handled by
the canonical admission policy, not by a second capacity implementation.

Fast handlers can return a private response or open a static class/name modal.
Anything involving slow membership checks or durable work acknowledges first,
then completes through a persisted job/private follow-up. Do not hold a
transaction open while calling Discord. Capture only validated minimal job
inputs; continuation tokens, if needed, are short-lived encrypted values and
never part of logs, browser responses or audit details. A lost token cannot
cause another commit; status remains readable from My signup.

For an event posted in KFC, validate the original mapped guild/channel/message
and the signed actor there, then separately verify WoW Forever membership and
pilot eligibility. Being a KFC member alone must not grant access to the new
community's service. The current slash-command main-guild restriction is not a
complete component-routing policy. A copied post/button, DM invocation,
unmapped channel or forged draft is rejected. Subsequent ephemeral clicks bind
to that actor and original source through the stored draft, not through a
user-supplied message link.

### Real Button Testing And Deployment Gate

The current post was delivered from the local pilot database and its link
targets localhost. Adding a clickable custom ID to that message does not make
the production interaction endpoint able to read the local event. This must be
solved explicitly before a real native-signup demonstration.

Use the existing production HTTPS interaction endpoint, with a disabled-by-
default native-raid feature flag and a private allowlisted server-side pilot.
Apply reviewed migrations and scoped grants there, configure a private default
destination, then create a **new real private test event in that same server
database**. Do not copy synthetic browser-test members, sessions, grants or
historical signups into production. Production links use HTTPS, never localhost.
Retain the old local event for browser experiments and make the two test origins
clear to the organizer.

Deploy the handlers/worker before publishing native controls. Existing messages
keep usable website links until their owning backend supports the new component
version. Native-disabled or outage states show a truthful retry/web fallback,
not a dead primary action. The bot is shared with moderation/listings/bridging:
do not repoint its global interaction endpoint for a one-off experiment.
No Discord user-account automation or Raid-Helper API key is required.

Keep this deployment gate distinct from implementing/testing the local code.
Only an explicit release request authorizes the server rollout, and a real
pilot member must execute the interaction before it is reported as live-tested.

### Audience And Privacy

Private pilot events remain private, including linked pages, previews and
rosters. Joining must disclose the event's approved roster audience. An approved
public event summary does not authorize publishing character names, reserves
or user IDs to Google, anonymous website visitors or another server.

Do not automatically bridge event posts or import KFC roster/history. Keep
public discovery fields and member-only detail separate. Use no-store/noindex
and authorization, not just robots rules, for private views. Emit no pings from
untrusted names/notes; summaries use allowed_mentions with an empty parse list.

## 9. Ordered Delivery Plan

Every row is planned, not completed by this document.

| Stage                    | Deliverable                                                                                                                                                    | Acceptance gate                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: visual parity        | Reviewed emoji manifest; improved classic header, named class/spec roster, reconciled composition totals, adaptive empty states, readable deadlines and footer | Payload tests pass; all names/counts reconcile; actual private desktop/mobile screenshots are readable; old source verification/reconciliation still works |
| P1: native signup        | Ephemeral character/spec/role confirmation, first-character registration, My signup, Change and Leave; shared service and durable receipts                     | A real allowlisted member joins without leaving Discord; accepted/pending/bench, cancellation, expired controls and concurrency all work                   |
| P2: format decision      | Same-state classic/V2 comparison with short and large rosters; versioned projection verifier before any migration                                              | Choose based on actual client renderings and signup usability; preserve existing message identity; V2 rollback is tested                                   |
| P3: meaningful advantage | Reviewed native SR flow, organizer pending/bench actions and composition detail; explicit availability model in a separate slice                               | Real edition-scoped data and loot handoff verified; no ambiguous seats or duplicated reserve state; mobile/permission cases pass                           |
| P4: public readiness     | Approved forum destinations, human publication review, scoped PM2 worker, health/recovery and opt-in calendar/reminders                                        | Real forum/channel tests, protected approval/removal, member privacy, production OAuth and rollback pass without affecting other bot features              |

Ship small verified slices; do not defer native signup behind a complete calendar
or decorate unfinished features as if they work. Appearance alone can be
reviewed in private previews, but adoption depends on P1 and a dependable roster.

## 10. Verification And Feedback Loop

### Automated

Extend `tests/forever-raid-discord.test.ts` and the raid integration/browser
suites rather than replacing their existing guarantees:

- All seven event types; empty/full/locked/cancelled states and zero role targets.
- Five-, twenty- and hundred-person rosters, all nine classes, duplicate names,
  very long Unicode names, Markdown/control characters and invalid artwork.
- Payload limits after escaping/emoji expansion; valid components and fallbacks.
- Correct role totals, hidden overflow counts, no pending/bench double-counting,
  and reviewed/unknown damage classifications.
- Each accepted signup occurs once in each chosen grouping; class counts and
  Tank/Healer/Melee/Ranged/Unclassified totals reconcile to the same accepted set.
- Feral tank/cat and manual role overrides remain distinct; missing/deleted
  emojis fall back to class/spec text; mixed-edition characters cannot appear.
- Private roster filters never mutate the shared post or expose another
  reader's draft; long names and pagination preserve complete private access.
- Signed component/modal replay, foreign server/source, wrong actor/character,
  stale policy/version, revoked membership, removed host role and expired draft.
- Many concurrent requests for the final seat; repeated confirms; Change versus
  Leave; reserve clearing and bench promotion against the canonical database.
- Slow acknowledgement paths, lost follow-up, worker restart, 429/403 responses,
  uncertain creation, source deletion and format rollback.
- Draft selection versus commit; double clicks, two open drafts, character
  creation without signup, changed policy versus unrelated roster updates,
  expired private controls and committed work after follow-up token expiry.
- Original source checks in each approved server; mandatory main-community
  membership; non-admin channel override rejection in both browser and API.
- Approval retained on roster-only change, invalidated on material/source change;
  no private fields in anonymous HTML, metadata, cache or public discovery.

Run focused unit and real-PostgreSQL tests first, then `npm test`, lint,
typecheck, build and the focused raid Playwright suite when code is implemented.
This planning document does not claim those future changes have passed tests.

### Actual Discord Clients

Web Playwright tests cannot prove how Discord renders our message. Review actual
Discord web/desktop and mobile clients, including light/dark themes and enlarged
text. Native emoji size, inline-field wrapping and button rows are client-owned.
The browser website separately needs its 360/390/768/1440-pixel screenshots,
keyboard/accessibility checks and no horizontal overflow.

Use the real private event for meaningful behavior. Rich visual fixture posts,
if needed, are clearly labelled private design previews; never add synthetic
signups to a live event or make public activity appear larger than it is.
Recruit a few consenting pilot participants before calling the multi-user flow
validated. The present frozen pilot audience must not expand automatically.

### Review Sequence And Launch Bar

1. Capture our baseline and the reference; list hierarchy, wrapping and action
   problems rather than just asking whether the new post looks fancy.
2. Render an icon-led classic candidate. Compare empty and populated states;
   fix missing information and awkward density before adding more decoration.
3. Test native signup with a real organizer and members. Ask them to find the
   start, required role, loot agreement and their exact signup state without help.
4. Compare V2 only with equivalent content and working actions. Retain classic
   if V2 is taller, harder to scan or less reliable on the tested clients.
5. Re-test long names, a full roster, bench, pending, locked and cancelled states;
   rehearse source deletion, restart and recovery before expanding access.

Acceptance targets, not measured results:

- Date/time, activity, scope and primary action are obvious at a glance.
- A compatible returning member confirms in roughly two deliberate clicks and
  normally under ten seconds, excluding Discord/network delays.
- First registration stays in Discord and shows human-readable validation.
- No label suggests a pending member has an accepted seat.
- After a healthy worker cycle, Discord and website show the same roster
  revision; any delay has an honest receipt/host status, not fabricated activity.
- A real organizer can manage requests and locate reserves without raw IDs or
  a second roster. No duplicate event appears after a retry.

Collect only minimal, disclosed aggregate completion/error/timing metrics.
Do not store message content, passwords, interaction tokens or unnecessary
behavioral profiles for a cosmetic experiment. Success is completed signups,
returning organizers and trustworthy state, not merely more decorative clicks.

## 11. Definition Of The Next Coding Batch

The next implementation should cover P0 and P1 together in the private pilot:

1. Typed, budgeted presentation and safe classic-format/source compatibility.
2. Reviewed emoji setup and shared class/spec mapping with text fallback;
   named class groups, accurate totals and a complete private roster view.
3. Native Sign up and My signup with explicit confirmation, remembered matching
   characters, precise admission outcomes and safe existing audience disclosure.
4. Native first-character registration, spec/role editing and confirmed Leave;
   durable actor-bound drafts, replay receipts and acknowledgement handling.
5. Regression tests on both supported editions and all seven event types,
   including final-seat races and non-admin routing. Use local synthetic actors
   only in automated tests, never as real Discord participation.
6. Prepare the production private-pilot release separately. After explicit
   deployment approval, validate real private desktop/mobile signup, named
   roster updates, restart/retry and membership loss with consenting members.

Only then decide V2 or expand to availability, composition, real reserve
datasets and public destinations. This keeps the next milestone useful and
visibly better without pretending the whole long-term manager is finished.
