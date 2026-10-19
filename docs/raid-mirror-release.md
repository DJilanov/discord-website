# Linked Discord event posts

The main Discord event remains the native signup post. Additional approved
text-channel announcements can be registered as tracked copies of that same
event. Their link buttons open the existing website signup, roster, soft-reserve
page or main Discord post. They never create a second event or independent
signup roster, and do not copy native interaction IDs into unsupported channels.

Every post shows the saved finish time and elapsed duration. Forever DPS fields
show occupancy and the target without exposing internal unclassified-range
markers. Melee/ranged counts are shown only when all DPS have reviewed range
classifications.

## Registration

Preview an existing, bot-owned public event announcement:

```sh
node_modules/.bin/tsx scripts/raids-mirror.ts \
  EVENT_ID GUILD_ID CHANNEL_ID MESSAGE_ID
```

Add `--apply` to attach it after review. The operation validates the approved
guild, public source event, exact bot/message identity, event URL and live
organizer/bot channel permissions. Repeating an active registration is
idempotent. Registration does not change event settings or signups and adds an
immutable event audit receipt. New or replacement announcements must be posted
separately and explicitly registered.

## Synchronization

The existing PM2 raid worker edits the registered message in place. Database
event revisions enqueue all active copies; the five-second worker cycle normally
propagates changes within a few seconds. Periodic checks also detect presentation
updates and new links after a primary-post repost, without re-editing unchanged
messages. Delivery leases, persisted versions/checksums and bounded retries
survive restarts and avoid dropping an edit that races with delivery.

Deleted posts stop syncing and are not recreated. Removed permissions, altered
message identities, unapproved destinations and private source events fail
closed. Resolve the underlying problem and explicitly re-register to resume.
Inspect `ForeverRaidDiscordMirror.status`, `lastError`, `desiredVersion` and
`deliveredVersion` for diagnostics. Check approved/failed copies after any change
to server access; disabling synchronization does not erase an earlier public
announcement.

## Deployment

Apply `037_raid_discord_mirrors.sql` through the existing migration ledger and
regenerate Prisma. In production, apply the new table's `forever_web` grants in
the same migration transaction: its event trigger must be writable by the
runtime role before normal event editing resumes. Do not grant schema or DDL
permissions to the runtime role. Reload the website and raid worker, then attach
the existing KFC announcement. Keep the prior application build available for
rollback; the additive schema does not need to be removed when rolling back.

Verification:

```sh
npx tsx --test tests/raid-native.test.ts tests/forever-raid-discord.test.ts
npx tsx --test tests/raid-mirrors-db.integration.ts
```

The PostgreSQL integration suite refuses nonlocal databases or ports other than 55432. Discord is mocked: no synthetic messages are posted to live channels.
