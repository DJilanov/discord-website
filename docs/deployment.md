# Production Deployment

## Host Layout

- Host: `89.167.46.193`; DNS apex and www point to this host.
- Project: `/home/wow-forever-discord`.
- PM2 process: `wow-forever-discord`, running as system user `wowforever`.
- PM2 daemon and CLI: root's `/root/.pm2`; run the activation script as root. Do not start a second PM2 daemon as `wowforever`.
- App listener: `127.0.0.1:19320`. Port 19300 belongs to another existing service and must not be reused.
- Canonical domain: `https://www.wowforeverdiscord.online`.
- Nginx site: `/etc/nginx/sites-available/wow-forever-discord`.
- PostgreSQL: the existing local database, with isolated `Forever*` tables and login `forever_web`.
- Private files: `.data/private`, never under `public/`.
- Configuration: `.env.local`, mode 0600; do not put secrets in PM2's committed configuration.
- Jobs: `/etc/cron.d/wow-forever-discord` for maintenance every five minutes and nightly backups.

## Initial Bootstrap

Upload source without `.env*` (except `.env.example`), `.git`, node_modules, local database files, private storage, or build/test artifacts. Run `npm ci` in the new project only. The production bootstrap script reads KFC database credentials locally on the server, creates a separate application role, writes fresh application secrets, applies the additive migration, and verifies the new role cannot read KFC's User table. CREATE DATABASE privilege is never granted; CREATE within the existing database is temporarily granted for Prisma's initial schema statement and revoked immediately afterward.

```sh
npm run production:bootstrap
npm run db:generate
npm run db:seed
# Set OWNER_EMAIL privately to the intended existing KFC admin before this command.
npm run production:import-owner
npm run build
sh deploy/activate.sh
sh deploy/https-bootstrap.sh
```

`production:bootstrap`, owner import, and deployment shell scripts run as root. Normal web and cron processes run as `wowforever`. The HTTPS bootstrap is deliberately one-time and refuses to overwrite an existing Nginx site. Certbot uses webroot renewal; it does not need Cloudflare DNS APIs.

The supplied migration runner is checksum-protected and creates only this project's tables. Never run `prisma db push`, `migrate reset`, or a migration generated from this partial schema against the shared database. Add reviewed, additive migrations to the runner for later schema changes.

## Updating

Back up first. Stage and verify source, run the project's tests locally, install pinned dependencies, generate Prisma, and build on Linux. Preserve `.env.local` and `.data`. Restore ownership to `wowforever` after uploading as root. Reload only this named PM2 app, never all apps. Next's generated output is platform-specific; do not deploy a macOS node_modules directory.

```sh
npm run backup
npm ci
npm run db:generate
npm run build
sh deploy/activate.sh
```

Never rebuild the active output directory while PM2 serves it. Set a fresh `FOREVER_BUILD_DIR` (for example `.next-release-20260929`) for both `npm run build` and `sh deploy/activate.sh`. PM2 persists this selection for restarts. Keep the prior output and source snapshot; to roll back, restore its source and activate its original build directory. Do not roll back the shared database or erase later submissions. Schema changes must remain backward-compatible until the old build is retired.

## Backups And Recovery

`npm run backup` creates a PostgreSQL custom-format dump of explicitly enumerated `Forever*` tables and a private archive of evidence, addon ZIPs, and `.env.local`. Files are restricted to the system account, retained under `/var/backups/wow-forever-discord`, with the latest seven copies kept. They contain secrets and personal data. Do not upload them to Git or public object storage.

Local backups do not protect against host loss. Configure encrypted off-host copies and an external uptime monitor before growing moderation volume. Restore into an isolated empty PostgreSQL database first using `pg_restore --no-owner --no-acl`, then check record counts, file references, and a private evidence download. Never use `--clean` against the shared KFC database. Review the environment archive before restoring; keep production secrets separate from test environments.

Cron backups run as `wowforever`. If a manual root backup creates root-owned subdirectories, restore ownership of `/var/backups/wow-forever-discord` to `wowforever:wowforever` while retaining mode 0700 directories and 0600 files, so the scheduled retention job can remove old copies. Do not change permissions on any other project's backups.

`npm run backup:verify`, run as root, restores the latest dump into a uniquely named scratch database, checks published guide records, verifies the private archive, then drops only that scratch database. It never restores over the shared live database.

Maintenance expires rate limits and group listings, deletes analytics after 90 days, purges evidence after its 180-day retention window under the same report lock used by appeals, and delivers configured staff notifications. A failed notification retries at most five times; inspect `ForeverWebhookJob` and application logs for exhausted deliveries. Reports remain available in `/admin` regardless of notification delivery.

## Health And Security Checks

- `/api/health` checks database connectivity without exposing details.
- HTTP and apex HTTPS redirect to canonical www HTTPS.
- `/robots.txt` allows public search crawlers in production; private forms and staff routes remain excluded/noindex.
- `/sitemap.xml` contains public pages, published guides, and approved guild profiles only.
- `/join` must return the configured valid Discord invitation, or use the backup if the primary is known to have expired.
- `/admin` redirects anonymous visitors; private evidence APIs return 401/403 without authorized staff.
- The application trusts `X-Real-IP` only because Nginx overwrites it and the app binds to localhost.
- Existing KFC and all unrelated PM2 apps must remain healthy after changes.

Node 20.20 currently runs the project and its verified build. Prisma's unused streams development package reports a Node 22 engine warning. Plan a controlled supported-Node upgrade separately; do not replace the host's Node binary without checking its other applications.

## Image Processing Memory

The editorial release's cold-image verification exposed a PM2 restart at approximately 752 MiB RSS against its 650 MiB limit. The follow-up keeps that limit and bounds native work: two Node worker-pool slots, one libvips thread per image, disabled libvips operation caching, and `MALLOC_ARENA_MAX=2` in this app's PM2 environment. Encoded Next.js image disk caching remains enabled. These controls trade some cold-image throughput for lower peak memory; they do not remove request validation or change other applications' environments.

The installed Next version exposes `imgOptConcurrency` and `imgOptOperationCache`; check their support when upgrading Next. [Sharp's performance guidance](https://sharp.pixelplumbing.com/performance/) documents the worker pool and allocator controls. AVIF codecs can have their own internal threads, so verify actual RSS and PM2 restart counts after cold-cache checks rather than treating thread settings as a guaranteed memory ceiling.
