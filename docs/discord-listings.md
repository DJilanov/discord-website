# Publish-first guild and group listings

New website submissions require explicit consent to public website and Discord posting. The approved listing, delivery job, review-notification job state, and audit record are inserted atomically. Publication does not depend on Discord availability. Migration 033 publishes existing pending guilds and unexpired groups; prior hidden, rejected, and expired decisions remain unchanged.

The worker posts to the correct Alliance/Horde recruitment, PvE, PvP, or scheduled-runs forum. A PvP character ruleset always selects that faction's PvP forum, independently of activity. PvP premades on other rulesets also select PvP; remaining raids and RP events select scheduled-runs, and remaining dungeons and questing select PvE. Activity and character ruleset remain separate tags/details. Long submissions have a `listing.txt` attachment containing all submitted fields. Mentions are disabled. The post is attributed to the bot, not impersonated as the submitter.

Group start times remain stored as UTC instants. The form interprets the entered wall-clock time in the selected region: EU uses `Europe/Berlin`, NA uses `America/New_York`, and OCE uses UTC. Website and Discord posts use the same zone and the event date's daylight-saving offset. Nonexistent or ambiguous clock times during daylight-saving transitions are rejected instead of being shifted silently. The submitter's device timezone does not change the scheduled instant.

## Review notification and moderation

The restricted listings bot sends the configured reviewer a direct message for every newly published listing. If `LISTINGS_REVIEWER_DISCORD_ID` is absent, the worker uses the configured Discord server owner. Each reminder links to the website admin record and, once available, the Discord forum post. Notification state is persisted, retried with a deterministic Discord nonce, and reported in worker health. A failed notification never withdraws an otherwise valid public listing.

Website administrators keep, hide, or reject listings from `/admin/guilds` and `/admin/groups`. Those decisions are authoritative; Discord tags cannot republish a hidden or rejected record. Deleting or altering the linked bot-authored starter hides the listing because the public copies no longer match. Closing a group in Discord also hides it. Upcoming groups stop being listed at their start time. Automatic Discord archiving alone does not withdraw a guild.

`/admin/guilds` and `/admin/groups` show worker health; each linked record shows its delivery state, reviewer-notification state, Discord link, and actionable errors.

## Operations

Production uses PM2 and local PostgreSQL, with a separate `foreverlistings` OS user and `forever_listings` database role. The worker only reads consented listing jobs and limited listing status columns; it cannot read users, private reports, evidence or audit history. Its bot token lives only in the private 0600 `.env.listings` file. The existing auction and bridge processes are separate.

After deploying the additive migration and grants, run `npm run listings:setup` as the worker user. This validates the eight configured forums and reviewer identity without changing Discord settings. Start `deploy/listings.ecosystem.config.cjs` through PM2.

Delivery states:

- `queued`: not sent; safe to retry after temporary read checks or a definite rate-limit rejection.
- `posting`: persisted before the network side effect; restart converts it to `uncertain`.
- `posted`: linked to a specific Discord thread and monitored for identity changes or group closure.
- `failed`: Discord explicitly rejected creation; correct the error, then use `--retry JOB_ID`.
- `uncertain`: do not automatically repost. Locate the existing bot post, then use `--reconcile JOB_ID --thread THREAD_ID`. Reconciliation checks the forum and original starter before recording the link.
- `removed` or `expired`: synchronization stopped for a deleted, withdrawn or expired listing.

Reviewer-notification states are `queued`, `sending`, `sent`, and `failed`. A restart safely requeues `sending` work with the same nonce. Explicit client errors and five unsuccessful attempts stop automatic retries and appear in worker health.

Run operational options with `node_modules/.bin/tsx scripts/discord-listings-worker.ts` while the PM2 worker is stopped; both share a singleton advisory lock. Never retry an uncertain delivery without finding and reconciling its original post. No historical messages or unrelated forums are modified.

Discord constraints are verified against its [forum-channel documentation](https://docs.discord.com/developers/resources/channel#channel-object) and [message API](https://docs.discord.com/developers/resources/message#create-message).
