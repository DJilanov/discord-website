# Visual Redesign Release

Released: 2026-09-29
Site: https://www.wowforeverdiscord.online/
Specification: [design-blueprint.md](design-blueprint.md)

## Shipped

- Full-bleed official Forever artwork with a separately composed portrait source for phones, prominent game logo, clear Community Discord identity, direct join action, and visible next-section content.
- Three art-led playstyle destinations, published guild/group previews, honest empty states, editorial guides, concise safety links, FAQ, and an illustrated closing invitation.
- Readable responsive navigation, directories, forms, Discord/community pages, guide articles, and social share image. Guide contents and mobile disclosure navigation remain usable without JavaScript.
- Native Markdown-AST contents links, shared group approval/expiry filtering, reduced-motion behavior, and focused regression coverage.
- Admin-managed invites, membership values, publication controls, privacy, moderation, canonical URLs, and existing analytics remain intact. No invented community activity, membership counts, or testimonials.

The actual desktop artwork places the party on the left, so the identity sits in the quieter right side of one continuous scene. This deliberately adapts the blueprint's preferred centered composition to the source image. Mobile uses a centered identity over the official portrait scene. There are no boxed hero illustrations, background videos, particle effects, or new animation dependencies.

The public styling is scoped in `app/(site)/site.css`; superseded homepage rules were removed from the shared stylesheet. No production dependency, database schema, authentication, bot configuration, Nginx, or DNS change was required. Asset sources and bounded starter-content updates are documented in [assets.md](assets.md).

## Feedback And Verification

- Baseline KFC/Forever captures were reviewed against the new desktop, phone, short-phone, and full-page compositions. Guide, directory, navigation, closing-scene, and social-image captures were inspected separately.
- `npm test`: 16 unit/integration tests passed.
- `npm run test:e2e`: 14 Playwright tests passed, including actual local submission/approval and permission workflows with cleanup.
- `npm run lint` and `npm run typecheck`: passed.
- `npm run build`: local build passed during implementation; the final updated source passed a fresh Linux production build before activation.
- Homepage matrix: 320x740, 390x667, 390x844, 430x932, 768x1024, 1366x768, 1440x1000, 1920x1080, and 844x390. Image decoding, responsive source selection, overflow, and relevant hero/action visibility checks passed.
- Chromium and WebKit: six representative pages at 390px and 1440px, 24 page/browser/size checks. Additional checks covered no-JavaScript navigation and article contents, Escape/focus return, reduced motion, enlarged article text, keyboard operation, and reflow.
- Existing axe scans passed on public routes and mobile/desktop admin settings. Automated scans do not replace a screen-reader audit.
- `npm run verify:public`: all 26 public sitemap pages plus live desktop/mobile assets, accessibility, metadata, HTTPS redirects, invitation behavior, secure forms, and private-route denial passed after the redesign deployment.
- KFC remained online and returned HTTP 200. Its source, tables, and processes were not modified or restarted by this release.

Screenshots and measurement JSON are local, ignored artifacts under `artifacts/design-audit/` and `artifacts/redesign/`. Live verification captures are `artifacts/live-*`.

## Mobile Performance

Three fresh Chrome contexts per version on the same production hostname: 390x844 viewport, DPR 2, browser cache disabled, 150ms emulated latency, 1.6Mbps download, 750Kbps upload, and 4x CPU slowdown. Measurements use browser PerformanceObserver entries and CDP encoded transfer totals, with Do Not Track enabled. This is a repeatable lab profile, not field Core Web Vitals or INP.

| Measurement                                  | Before redesign | Initial redesign | Final optimized release |
| -------------------------------------------- | --------------: | ---------------: | ----------------------: |
| Median LCP                                   |          1.268s |           2.488s |                  2.208s |
| LCP range                                    |    1.216-1.428s |     2.488-2.836s |            2.200-2.556s |
| Median transfer                              |   429,853 bytes |    465,510 bytes |           441,934 bytes |
| Observed CLS                                 |       0.0000114 |                0 |                       0 |
| Median cumulative long-task excess over 50ms |           108ms |             82ms |                    85ms |

The larger scene is now the LCP element, so the redesigned page is slower to reach LCP than the less substantial baseline. Reducing only the portrait's delivery quality from 75 to 60 cut that image's measured transfer from 66,570 to 42,942 bytes, about 35%, without changing its dimensions or composition. Making the visible hero logo eager also avoids unnecessary lazy discovery. Final total transfer is about 2.8% above the baseline, and the final median LCP is below the 2.5s design target; one cold run still reached 2.556s. These three runs do not establish a field percentile or guarantee every visit meets the target.

Evidence: `performance-before.json`, `performance-after.json` (initial redesign), and `performance-final.json` in `artifacts/redesign/`.

## Deployment And Recovery

- Production remains Nginx, PM2, and local PostgreSQL, without Docker or Cloudflare.
- Active PM2 app: `wow-forever-discord`, user `wowforever`, listener `127.0.0.1:19320`.
- Active build: `/home/wow-forever-discord/.next-release-20260929-design-v2`.
- Retained builds: `.next-release-20260929-design` and pre-redesign `.next-release-20260929-final`.
- The backup command completed before source changes. A source-only pre-design snapshot is retained privately at `/var/backups/wow-forever-discord/source-before-design-20260929.tgz`.
- Prior hashed static assets were preserved in the new release for browsers with older HTML. Production secrets, private files, and custom admin values were not replaced.
- `npm run content:refresh-design` changed one untouched starter settings record and four untouched seeded guide covers. It changed zero records on its second local execution. There was no schema migration.

For a pre-design rollback, preserve the current source separately, restore the source-only snapshot into the project, and activate `.next-release-20260929-final` using `FOREVER_BUILD_DIR` and `deploy/activate.sh`. Do not rebuild an active output directory. Do not restore the shared database or erase later submissions; the old build can read the unchanged schema and updated image paths. The source snapshot excludes secrets, private storage, dependencies, build outputs, and local artifacts. General operating instructions are in [deployment.md](deployment.md).

## Remaining Limits

Physical iPhone/Android testing, a full screen-reader audit, field INP/LCP percentiles, and statistically meaningful conversion effects are not verified by this release. Browser emulation and WebKit coverage are useful but are not physical-device testing.

Discord application activation and in-game addon compatibility remain deferred. Search rankings, real membership growth, editorial updates, and community moderation require ongoing work; the redesign makes no first-place or AI-recommendation guarantee.
