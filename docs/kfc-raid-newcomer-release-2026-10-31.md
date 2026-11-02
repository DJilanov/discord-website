# KFC raid newcomer release

Status: deployed October 31, 2026. Website source:
`/home/wow-forever-discord-source-releases/kfc-raid-newcomers-20261031-r2`.
Website build: `.next-release-kfc-raid-newcomers-20261031-r2`.
Raid and calendar workers continue from `/home/wow-forever-discord`.

This implements the [newcomer experience plan](kfc-raid-newcomer-experience-plan-2026-10-31.md).
Source changes remain uncommitted; this was a scoped artifact deployment.
Unrelated local edits were excluded.

Follow-up at 10:46 UTC: onboarding is now enabled with 16 defaults. A fresh
configuration audit found inaccessible verification/rules/joining instructions
and a Booster-role exception to Certified-only guild access. These findings,
the staged repair and the access model are in the
[verification/access plan](kfc-verified-access-plan-2026-10-31.md). The disabled
onboarding results below describe this release's earlier verification time.

The later [access repair](kfc-verified-access-release-2026-10-31.md) is now live:
entry destinations are readable and guild Booster exceptions are closed. Native
screening still requires the owner UI step before the prepared cutover.

## Delivered

| Area | Result | Status |
| --- | --- | --- |
| Arrival | Short welcome, Forever/TBC buttons first, separate guild/help routes | Published |
| Existing guides | Seven owned messages edited in place, with purpose-specific joining copy | Published and read back |
| Signup help | Public [walkthrough](https://www.wowforeverdiscord.online/raids/help), edition guides and schedule links | Live |
| Native signup | Two explicit stages; Save character & continue, then Confirm signup; consistent status explanations | Live |
| Website roster | Open signups before the party grid; own signup status explained | Live |
| Website freshness | Visible open raid pages check revision every 15 seconds and on focus; refresh only after a version change | Live |
| Raid edits | Existing managed sessions keep syncing while directory reapproval is pending; owned forum titles update too | Live |
| Controls | Compare normalized component content as well as embeds, so changed buttons reach existing posts | Live |
| Discovery | Existing onboarding interests route to the correct edition's schedule, forum and chat; start-here joins the defaults | Saved and verified; onboarding still disabled |
| Invitation | Managed fallback invite lands in start-here | Verified |
| Rollout | One announcement, zero mentions; durable receipt prevents duplicate publication | Published |

The public walkthrough explains that saving a character and marking a native
Event Interested are separate from completing a raid signup. Registered,
confirmed, bench, tentative and absent remain distinct states. Guild priority,
host selection, shared rules, alert consent, event audiences and organizer
permissions retain their existing meaning.

The revision endpoint requires the same active member and event audience as
the event page. Polling pauses while editing or busy, ignores hidden pages and
uses an eight-second request timeout. Manual Refresh remains available. A page
opened before this release needs one reload to load the new client code.

## User-reported corrections

An edit to morning Hyjal updated its signup embed but left the forum title and
native Event at the previous time. The edit had cleared public-directory
approval, which excluded this already-bound session from calendar maintenance.
Only explicitly configured, confirmed KFC managed sessions now retain that
maintenance while review is pending. This does not approve them for the public
directory or expand their audience. Thread synchronization verifies the bot,
forum and guild and preserves moderator locks and later manual title changes.

The owner then selected **December 14, 11:30–13:30 CET**. The normal audited
service saved version 4 for Hyjal `cmvvvosad00035o4s2cyoici8`; worker readback
confirmed delivery version 4, the signup timestamps, 11:30 CET thread title and
native Event's 10:30–12:30 UTC interval. Morning Onyxia's description was also
corrected from noon to 11:30 CET without moving its own 11:00 start.

For that exact Hyjal, initial inspection found zero stored signups and a public
card saying No signups yet. At 06:06 UTC a real signup from another member
appeared in both the stored roster and public card, with delivery version 5.
The organizer's account still had no separate player signup. Do not fabricate
an attendee to make the displays agree. The reported private/public discrepancy
still needs the user's panel state to establish where their attempted signup
ended. Separately, a real
website presentation issue was corrected: registered players were below a
large empty party grid and already-open pages did not refresh Discord changes.

## Verification

- Initial release: 137 unit/render/contract checks and 30 native PostgreSQL
  checks passed; full production build and TypeScript checks passed.
- Follow-up release: 42 focused tests and 30 native PostgreSQL checks passed;
  production Webpack build and TypeScript checks passed.
- The later 11:30 campaign correction passed all six opening-week tests on the
  server. Local execution was unavailable because this checkout has no
  `node_modules/.bin/tsx`; the existing server dependencies were used instead.
- A completion-audit regression exercises subscribe/unsubscribe in both
  editions, preserving the other subscription and manually assigned roles.
  All 31 raiding tests passed, using synthetic state and mocked Discord calls.
- Two isolated browser sessions proved a newly saved signup appeared in an
  already-open organizer page in 12,197 ms. It stayed registered and was not
  automatically confirmed. Open signups preceded the party grid.
- Browser widths 1440, 390 and 320 passed without page errors. Anonymous
  revision access returned 401; database checks covered denied audience access.
- Seven published entry messages, saved routing and the single rollout receipt
  were read back. Onboarding enabled state, ordinary roles and unrelated
  interests were preserved.
- Hyjal's four time surfaces were verified against the canonical saved event.
  No raids, member signups or native Event interest were recreated.
- Temporary database, preview servers and tunnels were stopped; synthetic
  fixtures never entered the live database.
- Final HTTP checks returned 200 for the Discord-site home, help and exact
  Hyjal page, KFC home and the helper-to-KFC redirect. The private revision
  endpoint returned 401 anonymously. Website, raid worker and calendar worker
  were online at the intended working directories; calendar reconciliation
  succeeded at 06:04:22 UTC with eight managed native Events.

These automated and API checks do not establish actual Discord mobile rendering
or successful unaided signup by a newcomer.

## Completion audit

The 06:09 UTC readback matched all seven live guide payloads to their maintained
source, confirmed eight default channels and correct saved edition routing,
and found native onboarding still disabled. It made no Discord writes.
The receipt is `completion-audit-readback.json` alongside the release logs.

| Requirement | Evidence and scope | Result |
| --- | --- | --- |
| Short arrival, both editions first, guild choice separate | All seven exact live messages match `newcomerMessages`; content tests cover welcome length and button order | Implemented; live payload verified |
| Purpose-specific guides, schedule help and human fallback | Live guide readback; schedule renderer tests; help page render and browser checks | Implemented |
| Honest time, preparation, leader/assistant and roster status | Native/public renderer tests, eight opening-week readbacks, owner-edited Hyjal readback | Implemented |
| Preserve Raid-Helper's original signup | Source parser and linked-card test retain original controls/URL without creating a roster | Implemented; actual client walkthrough pending |
| First/returning signup, class/spec, registration and approval states | Thirty PostgreSQL checks include setup, explicit confirmation, compatible saved characters, pending/bench/open admission | Automated workflow verified |
| Availability, withdrawal and uncertain/expired replies | PostgreSQL checks cover seat/SR release, withdrawal, durable retry, deadline, expiry, forged source and revoked audience | Automated workflow verified |
| Protected events and newcomer-readable discovery | Native database audience checks; anonymous revision 401; no-role Discord permission assertions in publisher preflight | Access rules verified; fresh-member client journey pending |
| Forever/TBC/both/browsing routing, unchanged roles and IDs | Live saved-routing readback and preservation/idempotency tests | Saved configuration verified; owner preview/publication pending |
| Native Server Guide welcome, tasks and resources | Exact values in desktop checklist; bot readback cannot establish rendered Guide state | Pending administrator desktop session |
| Illustrated native and Raid-Helper guide | Text walkthrough is live; available images cover website layouts only | Actual Discord-client images pending |
| Independent alerts and unsubscribe, without extra privileges | Both-edition regression plus digest, transport and ownership tests; current alert role configuration | Automated behavior verified; member delivery depends on Discord settings |
| One quiet rollout announcement | Durable sent receipt and recorded message ID; zero mentions | Published |
| Stable website layouts and visible external signup updates | Browser widths 1440/390/320; two-session update in 12,197 ms without auto-confirmation | Browser verified |
| Real desktop and phone usability | No actual client observations or five-volunteer results have been supplied | Pending; timing targets are unmeasured |
| Relevant tests, TypeScript/build, retained user work | Release logs, 36 deployed source hashes, scoped roster patch and focused follow-up checks | Verified for the deployed changes |

The remaining native-client and volunteer requirements prevent a full
completion claim. More mock screenshots or repeated server health checks
cannot establish those outcomes. Continue from real desktop/phone captures and
volunteer observations; do not replace them with generated images or assumed
success rates.

## Owner steps still open

Use the [desktop setup checklist](kfc-raid-server-guide-setup-2026-10-31.md):

1. Review the currently enabled onboarding against the later
   [verification/access plan](kfc-verified-access-plan-2026-10-31.md), then preview
   Forever, TBC, both and browsing choices. Verify the Server Guide welcome and
   three navigation tasks, and publish only the corrected setup after it passes.
2. Check actual desktop and phone rendering. Capture two synthetic signup
   screens plus the Raid-Helper variant for the illustrated guide.
3. Run the five-volunteer usability pilot and record discovery/completion time,
   friction and correctly understood signup status. No success rate is claimed.

## Operations and rollback

Private receipts and logs are under
`.data/kfc-raid-newcomers-20261031/`; the message publisher's snapshots and
idempotency state are under `.data/kfc-raid-newcomers/`. Bot credentials remain
in the existing environment and are excluded from artifacts.

`r2-release-manifest.json` records local and deployed hashes. The roster file
deliberately deploys only the list-order change against the previous live
baseline, excluding unrelated, unreleased local character-editor work. Do not
overwrite those local changes to force hashes to match.

The website's prior release configuration and scoped worker backups are kept
with the receipts. Switching release directories requires replacing only the
website PM2 process; reload previously retained the old cwd. Verify effective
cwd, build directory and HTTP health before saving PM2. Old static assets are
retained for cached clients. Rollback code deliberately without reverting real
signups, schedule edits, posted messages or consent state.
