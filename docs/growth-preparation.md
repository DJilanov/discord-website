# Growth Content and Integration Preparation

September 30, 2026. Prepared locally; no commit, push, production publication,
Nginx reload or bot activation is included in this task.

## Publication Hold: Game Model Review

Later September 30 research found that current Blizzard documentation describes
ruleset selection instead of traditional realms. Prepared launch/recruitment
copy and templates still contain realm-selection assumptions. Correct and
review those passages before following the publication steps below; passing
the earlier tests does not validate their game facts. Review affected forms
and group ruleset data too. The [community plan](community-excellence-plan.md)
records primary sources, affected files and the separate full-name/addon
identity compatibility gate. No production correction is claimed yet.

## Delivered in Source

- Additions to the existing onboarding, guild-recruitment writing and group
  guides: invitation error handling, blank worksheets and date-aware scheduling.
- Complete beta starter and friends/guild launch checklists with direct official
  sources checked September 30. Existing approved artwork is reused; no fake
  launcher screenshots or claims of hands-on beta testing.
- Three templates displayed as HTML text, with copy controls and plain-text
  downloads. Download responses are noindex; unknown names return 404 and
  cannot read arbitrary files. Clipboard denial keeps the text/download usable.
- The publisher recognizes exact September 29 article revisions in addition
  to the original starter versions. Custom titles, excerpts, bodies, drafts,
  covers, authors and custom metadata are preserved. Publication dates are not
  reset. Conditional `updatedAt` writes still protect intervening admin edits.
- A dry-run mode, full-batch schema validation before writes, and unchanged
  record skipping. The original September 29 content remains an immutable
  comparison baseline, not a second set of public URLs.
- The [expanded integration blueprint](web-discord-integration-blueprint.md)
  and [outreach kit](community-outreach-kit.md). No future bot capability is
  presented as already available in public guide copy.
- KFC's separate prepared search-only policy and activation checklist are in
  that repository's `docs/search-crawler-policy.md`.

## Content Review and Publication

The publisher still applies changes when run without `--dry-run`; it is an
operator command, not a website request. Inspect the selected environment and
database before running it. Do not run the seed or bootstrap scripts to publish
an article.

```sh
npm run content:publish-editorial -- --dry-run
```

Against the unchanged six-article local baseline, this reported two creations,
three updates and three preserved records. Local application matched that plan;
a second application reported zero creations, zero updates and eight preserved.

For production, first review the content with an organizer and assign the beta
resource an ongoing reviewer. Recheck official access/launch information; the
source announcement has inconsistent PDT/PST wording, so these articles do not
publish an inferred regional launch hour. Review beta instructions twice weekly
and after official changes; show ended/changed status at the same URL as needed.

Use the existing backup/build/activation runbook. Deploy code supporting the
template URLs before publishing content that links to them. Run the production
dry run, inspect counts and preserve any customized records. If a record is
preserved because an editor changed it, merge through `/admin/guides`; do not
disable the exact-version guard.

Then run `npm run content:publish-editorial` once and repeat the dry run to
confirm no further changes. Verify all eight guide pages, their internal links,
metadata, downloads and sitemap entries. The current public verification script
discovers sitemap URLs dynamically, so do not hardcode a 28-page expectation.

Retain a restricted pre-publication snapshot of the affected records. A content
rollback restores only those reviewed records while preserving intervening
edits; a whole shared-database restore is inappropriate. A code rollback alone
does not undo guide data and may remove the new template routes, so restore or
hide affected content first, or retain those route handlers in the rollback build.

## Remaining External Work

Google ownership is already owner-confirmed. Sitemap Success, Bing ownership,
consenting public organizer handles and the article maintenance reviewer still
need actual confirmation. Outreach drafts have not been sent. Real sessions,
guild listings and recaps need real participants, not generated examples.

The next implementation task is B0 in the integration blueprint: the configured
test application, reliable interaction/delivery foundation, least-privilege
destination checks and test-server evidence. Do not register the existing full
command list unchanged or launch a bot before that acceptance work.

## Verification Results

- Community: ESLint, strict typecheck and 26 unit/integration tests passed.
- The final complete Playwright run passed all 22 tests. New coverage includes
  320/390/1440px templates/articles, clipboard success and failure, downloads,
  no-JavaScript content, metadata, sitemap entries and accessibility checks.
  The first run timed out on a lazy off-screen image in the new test; explicitly
  loading images fixed the test, and both focused and complete reruns passed.
- The isolated `.next-growth-check` production build passed. No dependencies
  or Prisma schema were changed. Existing dev preview is at
  `http://127.0.0.1:19300/guides`.
- Local publisher dry-run/application counts matched, and subsequent runs made
  zero changes. Production content was not written by this task.
- KFC: focused ESLint, TypeScript and all four local tests passed. The full
  Nginx candidate passed `nginx -t` on the production machine using a separate
  temporary configuration. That temporary file was removed; no reload occurred.
- Desktop/mobile article and template screenshots were reviewed. Artifacts stay
  in ignored local directories. These checks do not replace live bot permission
  tests or physical-device/screen-reader verification.
