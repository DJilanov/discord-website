# Restricted Live Test

September 30, 2026. The owner requested activation and explicitly authorized
WoWForeverBot to publish the four notices, replacing the earlier personal-posting
choice. The two approved discussion/leveling pairs are unchanged. Who-plays-what
and guild-invite requests remain excluded.

## Test Mode

General activation still requires its existing governance and live-test sign-off.
The previous workflow could not perform real opt-in tests before that sign-off,
because it allowed enrollment only after general activation. A separate `pilot`
state now resolves that dependency without claiming tests passed:

- Owner/admin selects one to five unique Discord tester IDs after fresh endpoint
  validation. Notices, both endpoint approvals, the healthy worker and running
  runtime are still required. Test mode always requires manual message review.
- Testers accept the normal signed, actor-bound `/bridge join` themselves. A test
  allowlist is not consent. Membership, speaking permissions, timeouts, staff blocks
  and per-channel-pair isolation remain enforced. Non-testers cannot enroll or send.
- Each test lasts one hour, with at most 20 messages per pair and the existing
  global limits. Enrollment, review, queue claiming and the final send check all
  enforce the cutoff. A late acknowledged send queues compensating removal.
- Expiry, any pause, global stop or restart withdraws test participation and queues
  cleanup of test copies, including managed replies. Hard stop still prevents all
  writes, so cleanup waits until it is lifted. No human originals are deleted.
- The admin distinguishes **Restricted test** from **Active**, shows the end time
  and tester count, and offers a separate Test pilot action. General activation is
  never automatic. Pause, finish cleanup, revalidate and record truthful approvals
  before opening normal participation. Existing consent does not carry forward.

Migration `007_bridge_test_pilot` adds the fields and a database constraint requiring
manual review, a bounded duration and valid tester IDs. The old worker fails closed
on the new state rather than treating it as an ordinary active connection.

## Current Discord Findings

The bot successfully posted and immediately verified all four labelled notices.
Later exact-ID GETs returned Discord `10008` (unknown message) for KFC discussion,
KFC leveling and Forever general. The fourth original notice was also confirmed
missing immediately before launch; none of the original notices remains.
The bot has no View Audit Log permission in either server. The owner subsequently
confirmed personally deleting the three notices because inactive announcements
looked like spam. Do not repost while inactive. Use concise launch notices only
when the restricted test is ready to start, without disabling moderation.

The owner's endpoint approvals and original notice links were recorded through the
normal audited control functions. Validation rejected the missing notices and
paused both pairs. Once deployment finished, four concise replacement notices and
the matching topic disclosures were verified without changing permissions or
duplicating the already-posted replacements:

- [KFC discussion](https://discord.com/channels/1411533815356194968/1548519535177629707/1554916018563063889)
- [Forever general](https://discord.com/channels/1554316932948172940/1554322593589235732/1554916040729960558)
- [KFC leveling](https://discord.com/channels/1411533815356194968/1548747530790248610/1554916043334361249)
- [Forever leveling](https://discord.com/channels/1554316932948172940/1554898196721967137/1554916391876960396)

Chrome exposed no open window. A targeted bot lookup, not a personal-session token
or member-list scrape, identified the same owner of both servers. That account is
the intended initial tester; its ID remains in restricted operational configuration.
This does not prove which account is signed into Chrome.

## Verification And Handoff

Local verification passed all 111 unit/integration tests, including 46 bridge
tests, all 32 browser tests, lint, strict typecheck, website
and worker builds, and the standalone worker-package install/build/disabled-start
check. One earlier full run had three failures that did not recur on those reruns;
do not describe that earlier run as passing. Responsive/axe checks cover the test
controls and state at 320/390/768/1440px. These use simulated Discord transport.
Successful revalidation now cancels only older failed validation jobs for that
same pair, retaining their error and audit history. Failed deliveries and failures
for other pairs are untouched. A regression test covers replacement notices.

Production website and worker release `0cd1af4` is deployed, including the pilot
implementation from `ef97a9a`. Migration 007 was applied and a second migration run
confirmed the schema current. Linux website/worker builds and the isolated worker
production install passed. Only Forever services were restarted; KFC and both
Helper process IDs/restart counters were unchanged. Live verification passed all
34 sitemap pages and desktop/mobile rendering, assets, accessibility, metadata,
redirects and authorization checks. Bot policies additionally passed at
320/390/768/1440px. A post-migration backup restored into an isolated scratch
database and passed archive integrity verification.

At 18:03 UTC on September 30, both pairs passed fresh Discord endpoint validation
and entered the manually reviewed, one-account pilot through the normal audited
control actions. Both expire at approximately **19:03 UTC / 22:03 Europe/Sofia**.
Runtime is `running`, Gateway `ready`, build `0cd1af4`, with no runtime error or
failed/uncertain jobs. The four old validation failures were superseded only after
successful replacement validation. There are still zero consent records and zero
relayed messages: no human live test or general-launch sign-off is claimed.

The tester must
confirm `/bridge join` in each originating channel and send clearly labelled test
text. Review it within two minutes in Delivery; verify both directions, replies,
edits, source deletion, `/bridge remove` and `/bridge leave`. Record actual results,
not fabricated actions or a generic all-passed checkbox. Off-host recovery and
independent alerting remain gates before general publication.
