# Public Disclosure Removal

September 30, 2026: the owner requested removing both informational messages and
the bot-added channel-topic disclosures. Public posting and topic text are no
longer activation requirements. This supersedes those requirements in earlier
shared-channel plans and rollout records; they must not be reposted automatically.

Endpoint approval in `/admin/discord` now records the exact side and staff audit
reason without asking for a message link. Both approvals, staff authorization,
fresh channel/command/permission validation and the other activation gates remain.
The worker does not read notice IDs or require any topic text. Legacy notice
columns remain historical data, with no schema migration or audit deletion.

The private, actor-bound `/bridge join` confirmation still discloses both
communities and audiences, the exact pair, attribution, retention and withdrawal.
The user must confirm it; installing the bot, approving endpoints or removing
public announcements never enrolls anyone. Copies remain attributed to their
actual author and community. Other message eligibility and moderation rules are
unchanged.

The four known WoWForeverBot launch messages were removed and exact-ID absence
verified. Their exact bot-added topic suffixes were removed, preserving the
original Forever general topic. Permissions, human messages and other channels
are unchanged. No new public notices were posted.

The website and worker are deployed as `no-notices-ec0b4b88`, a working-tree release
on base `e8b365f`. No new commit or push was requested for this follow-up. The four
changed production source files have matching local/server SHA-256 hashes; the
release suffix is the first eight characters of their binary diff's SHA-256.
Source and database backups were taken; the database backup and private archive
passed isolated restore/integrity verification. No schema change was needed.

Both actual Discord pairs passed validation without notices or disclosure topics
at 18:28 UTC, then resumed the existing one-account, manually reviewed test. It
expires at **19:28:56 UTC / 22:28:56 Europe/Sofia on September 30**. Runtime is
running, Gateway ready, with zero errors, failed/uncertain jobs, human consent
records or relayed messages. General publication remains closed; no real human
message-lifecycle test has been claimed. KFC and both Helper process IDs and
restart counts were unchanged.

Verification passed all 112 unit/integration tests (47 bridge tests), five focused
bridge browser tests, lint, typecheck, local worker build and Linux website/worker
builds. Browser checks covered 320/390/768/1440px, approval without a message link,
private confirmation wording, authorization, responsive layout and accessibility.
Live bot-policy checks at the same widths passed, with anonymous admin and unsigned
interaction requests rejected. The updated public policy is confirmed live.

## Tester Correction

The later signed join failure identified an operator configuration mistake: the
server-owner account was not the website owner's testing account. The actual
`djilanov` account was confirmed in both guilds by targeted bot lookups. Both
pairs were paused, revalidated and restarted through normal audited controls at
18:34 UTC with that single tester replacing `Psyrogue`. The new cutoff is
19:34:23 UTC / 22:34:23 Sofia on September 30. The old denied receipt remains
historical; the tester must issue a fresh `/bridge join`. No application code or
permissions changed, and private confirmation/manual review remain required.

## Confirmation Retry Fix

The tester successfully confirmed the KFC discussion pair at 18:36:27 UTC.
The later `consent_confirmation_expired_or_mismatched` report exposed misleading
handling of reused confirmation buttons: a successful confirmation consumes its
challenge, so another click previously returned the same error as an expired or
wrong-account challenge. Read-only production checks confirmed current consent;
the error did not undo enrollment.

Reused buttons now report existing opt-in or an already-submitted confirmation
without queuing another enrollment or resetting consent dates. Expired,
withdrawn, or superseded confirmations direct the same actor to a fresh
`/bridge join`. Unknown challenges and actor/guild/pair mismatches still fail
closed. The private prompt states the existing five-minute expiry. No identity,
membership, policy-version, generation, pilot or withdrawal checks were removed.

Only `lib/discord-bridge/interactions.ts` was deployed, with website build
`.next-release-consent-c8032a09` (source SHA-256 prefix). The previous source and
website build remain available for rollback. The worker stayed on
`no-notices-ec0b4b88`, with unchanged PID/restart count, preserving current consent.
No database migration, command registration, public post, history scan or import
ran. The unfinished local history-import work was excluded. No commit or push
was made for this fix.

Both new regression tests failed before the fix. All 114 unit/integration tests,
lint, typecheck and the Linux production build passed afterward. A further
focused run verified expired reused buttons and the Discord prompt length limit.
Live health and post-deployment consent checks passed; KFC and both Helper process
IDs/restart counts stayed unchanged. The pilot cutoff remains 19:34:23 UTC;
general sharing and the real message lifecycle test are still pending.
