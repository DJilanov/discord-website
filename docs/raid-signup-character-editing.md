# Organizer class and specialization editor

Status: implemented locally on 22 October 2026. Not committed, pushed or deployed by this task.

## Using the editor

While an event's signups are open, its organizer can select **Class / spec** below a player's
name in either the confirmed party roster or a waiting-list entry. Choose a class, choose one
of its specializations, then select **Save player**. The preview uses the existing class/spec
artwork. Cancel and Escape discard the draft; saving disables further input.

The edit applies only to that event's signup snapshot. It preserves the player, character name,
saved profile, other event signups, role, attendance status, party and slot. A Feral edit does
not automatically turn a healer into DPS or consume another role's seat. Changing roles remains
outside this editor's scope.

A class or specialization change clears soft reserves, matching the existing signup policy.
If reserves exist, the organizer must explicitly confirm this before saving. Identical edits
are no-ops and never clear reserves. The player must select reserves again for the new build.

Non-organizers do not receive the controls, and the server rejects their edit requests. Closed,
locked and cancelled events are read-only. A withdrawn signup cannot be edited.

If someone changes the roster while an editor is open, saving is rejected rather than
overwriting their changes. The draft remains visible with the server error. **Reload roster**
loads the latest event before allowing another edit; ordinary retries retain the draft.

## Implementation and compatibility

- `components/raids/signup-character-editor.tsx`: one accessible native dialog per roster,
  existing artwork pickers, reserve confirmation, error/reload and saving states.
- `components/raids/event-roster.tsx`: organizer controls on confirmed and waiting signups,
  including participant-only events.
- `lib/raids/contracts.ts`: strict `edit_signup_character` manage action with event version,
  signup ID and validated class/spec pair. Role, identity and position injection are rejected.
- `lib/raids/service.ts`: organizer authorization, row-locked version checks, deadline checks,
  event-local update and `signup_character_updated` audit with before/after data. Incrementing
  the event version uses the existing primary/mirrored Discord synchronization path.
- `components/raids/workspace.tsx`: the player's own form explains a difference between their
  event class and saved class, and never initializes an invalid cross-class specialization.
  Returning to a saved character clears reserves even when both classes share a spec name,
  such as Protection.

There is no schema migration, new dependency, new endpoint or production configuration change.
The existing same-origin, member-authentication, rate-limit and private-response protections
still cover the request through `/api/raids/[id]`.

## Verification

- Full unit suite: 400 tests passed.
- Isolated PostgreSQL integration suite: 14 tests passed, including event/profile isolation,
  audit records, reserve consent, no-ops, roster-state preservation, concurrent and stale
  edits, foreign/withdrawn signups, closed/locked/cancelled events and shared spec names.
- Typecheck, focused lint and scoped formatting passed.
- The final optimized Next production build passed, including TypeScript and all 20 static
  pages, using the isolated build directory `.next-signup-editor-20261022`.
- Browser acceptance passed at 1440 px and 390 px: waiting and confirmed players, Escape/focus
  return, matching class/spec selection, explicit reserve consent, real stale-version rejection
  and reload recovery, saved profile isolation, position/status preservation, and non-organizer
  UI/API denial. The active dialog passed Axe checks and horizontal-overflow checks at both widths.
- The existing imported four-player leveling-group browser regression separately passed in
  member-beta mode with the synthetic/local Discord transport, including its responsive sweep.
- Final desktop/mobile modal screenshots were visually reviewed and are retained as ignored
  local files: `artifacts/signup-character-editor-1440.png` and
  `artifacts/signup-character-editor-390.png`.

The first browser attempt used the hidden radio input rather than its visible artwork label;
the helper now clicks the same visible label as a player. A later attempt exposed a real
reload race: the old dialog closed before the refreshed event arrived. The editor now keeps
refreshing state until the route transition completes. Those attempts are not passing checks.

Run the normal unit/type/lint scripts, `npm run test:raids:db`, and the focused browser case:

```sh
npx playwright test --config playwright.raids.config.ts \
  --grep 'Organizers edit signup class/spec'
```

Database integration and browser checks require the isolated local PostgreSQL instance on
port 55432. They must not target production. Browser fixtures and Discord membership are
synthetic/local; these checks do not publish live Discord messages.

The imported-group regression additionally requires `FOREVER_RAIDS_E2E_ACCESS_MODE=members`
and `FOREVER_RAIDS_E2E_DISCORD=true`, using the existing test configuration. Its initial run
under pilot defaults was skipped; the correctly configured rerun passed.

Existing development warnings about the external pnpm lockfile, logo LCP and concurrent-query
deprecation in `pg` remain outside this feature. No listener limit, timeout, authentication
check or unrelated production setting was weakened to hide them.
