# WoW Forever Discord

Independent community website at https://www.wowforeverdiscord.online. Public Discord: https://discord.gg/ejn4UnDdcX.

This is a separate project from KFC. The About page discloses the organizing team's history. The new community does not inherit KFC's membership statistics or guild identity.

## Stack

Next.js App Router, React, TypeScript, PostgreSQL, Prisma with the PostgreSQL adapter, Auth.js credentials sessions, and private local file storage. Production runs as the unprivileged `wowforever` system user under PM2 behind Nginx. No Cloudflare or production Docker is required.

## Local Development

```sh
npm ci
npx tsx scripts/setup-local.ts
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://127.0.0.1:19300. Docker is an optional local-only PostgreSQL convenience; alternatively configure `DATABASE_URL` for an existing PostgreSQL instance. Keep `.env.local` private. The seeded guides are original community guidance; the seed never overwrites existing editorial work.

For a new local owner, set `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (16+ characters), and `ADMIN_ROLE=owner` privately, then run `npm run admin:create`. There is no default admin password. Production can initialize the named existing KFC owner's bcrypt credential server-side using `production:import-owner`; all later account changes are independent.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:addon
npm run test:e2e
npm run build
npm audit
```

Integration and browser fixtures refuse databases not using the isolated local port `55432`. Browser tests use installed Google Chrome and clean up their test staff and guild listings. Never run fixture tests against production. Screenshots and traces are ignored by Git.

## Administration

`/admin` provides settings and backup invitations, guide editing and preview, guild and group approval, private evidence and report review, independent appeals, alert state, addon release drafts, traffic analysis and CSV exports, staff access, and audit history. Permissions are checked on every protected request, including role changes and account/session revocation.

Owners manage staff. Admins manage settings and community operations. Moderators review submissions and evidence. Editors manage public content and addon releases without access to private reports. Public alerts require two distinct reviewers; original alert approvers cannot decide its appeal. Add at least three independent moderation accounts before using the public-alert process.

Traffic distinguishes direct, organic search, social, paid, email, referral, and AI referrals where referrers are available. IPs are keyed hashes, not raw addresses. Discord clicks measure invitation intent, not confirmed joins or unique people. DNT/GPC suppress collection.

`/admin/search` holds the search-account workflow and sitemap link. `/admin/settings` accepts public Google/Bing verification meta values and approved onboarding/organizer copy. Empty fields are omitted from public pages; a configured token is not proof of completed account verification. The owner confirmed Google verification on September 29, 2026; sitemap submission, URL inspection and Bing ownership still require account confirmation.

Guide covers and inline images share an approved local asset catalog. Use **Article images** in the guide editor to insert a screenshot, then preview before publishing. User-submitted Markdown does not gain image access. `npm run content:publish-editorial` adds the two new guides and updates only exact recognized starter versions of the original four; it preserves custom content, metadata, covers, authors and publication dates, except for the old default team byline. Repeating publication is a no-op. Back up production first.

Discord's report and appeal forums are readable by other members. The private website case system is separate; public Discord posts are not automatically imported, verified, or used to suspend website alerts. Keep sensitive evidence in the website forms.

## Operations

- [Production deployment and recovery](docs/deployment.md)
- [Implementation status and remaining work](docs/implementation-status.md)
- [Search and editorial release](docs/editorial-release.md)
- [Weekly search and community operations](docs/search-operations.md)
- [Source assets and attribution](docs/assets.md)
- [Full research and product blueprint](blueprint.md)

The website works without a Discord bot. Configure the optional Discord application variables privately and run `npm run bot:register` only after adding that application to the intended server. Public forms use a signed, short-lived proof-of-work challenge, single-use replay protection, a honeypot, strict origin validation, and persistent rate limits. This is a spam deterrent, not a proof of human identity or DDoS protection.

ForeverGuard is a draft alpha. `npm run addon:package` produces a real ZIP and an unpublished release. Pure Lua logic is tested; in-game beta APIs and tooltip behavior need playtesting before staff publish it. Old addon data cannot be recalled remotely; the public website always shows the current review state.
