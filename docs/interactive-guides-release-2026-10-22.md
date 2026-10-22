# Interactive Guide Release

## Scope

The owner approved publication of all six starter resources, plus commit, push
and deployment of the expanded guides, visual library and sitemap changes.
This supersedes the earlier instruction to leave these six unpublished. It is
editorial publication approval, not evidence that the proposed combat priorities
or dungeon routes have been tested in game.

The three class playbooks add 28 talent explanations, rank-specific reference
text, level-aware combat scenarios, talented-ability controls, recovery advice
and a local readiness checklist. The 54 existing game icons and tooltip data
come from the published Tools snapshot for build `1.60.1.70425`. Attribution and
checksums are retained. No numerical engine, item catalog or reviewed build is
modified, and the guide controls send no account, character or analytics data.

The shared library component is used on the public Guides page and in the local
review export. It contains class, dungeon and community sections with working
category controls. The original review-index path shows the new design;
earlier source-matched review evidence is archived separately, not rewritten as
evidence for the expanded versions.

## Publication And Discovery

Default editorial publication still leaves source drafts private. The explicit
`--publish-starters` option applies only to the six named resources. Existing
drafts must match either their exact original fingerprint or the current source;
editor changes and previously published/unpublished records are preserved.
Updates compare the existing timestamp and publication state before writing.
Custom authors, cover images and metadata remain protected by the existing rules.

Before an authorized write, run:

```sh
npm run content:publish-editorial -- --dry-run --publish-starters
```

The production preview and actual run each reported six publications and eleven
preserved editorial entries. The repeat preview reported seventeen preserved
entries and zero changes. The affected rows and preceding website selection have
a protected server-side rollback record. No database migration or Discord
announcement is part of this release.

Published guide URLs are included dynamically in `/sitemap.xml`. The directory's
`lastmod` follows the latest real published guide revision, not the crawl time.
Drafts, private routes, invalid slugs and query variants are excluded. `/updates.xml`
continues to describe actual published revisions. Canonical URLs remain unchanged.

## Verification

The full local suite passed 368 tests with no skips against a uniquely named
temporary database. The initial run lacked required synthetic test settings;
those failures are not represented as passing runs. Production secrets were not
used. The final configured run also passed the production build, TypeScript and
scoped lint. Additional targeted tests cover publication authorization, exact
source refreshes, safe Markdown rendering, bitmap integrity and sitemap coverage.

Browser verification covers all six readers and both library modes at 1440,
390 and 320 pixels, with talent-rank, level, scenario and checklist interactions.
Three class playbooks pass automated accessibility checks. The source preview
alone does not establish production availability or gameplay results.

## Production Receipt

Application source `610703aa59043c5bbfd1aa5e345aa3fd37e03575` was pushed and
deployed to its immutable Linux source directory, with output
`.next-release-610703aa5904` and build ID `build-TfctsWXpff2fKS`.
All 1,185 tracked source blobs were verified against the exported commit.
The existing deployment guard verified 40 static assets and 72 server entries;
the loopback candidate returned healthy responses and all 13 referenced JS/CSS
assets before activation. Only `wow-forever-discord` was restarted.

The first candidate build lacked the bridge workspace dependencies. After those
were installed from their unchanged lockfile, Webpack compilation passed but its
asset layout did not satisfy the existing production guard. Neither candidate
was activated. The final build uses the existing default Turbopack bundler and
passes that guard without changing its requirements. Installing dependencies for
TypeScript does not activate or update the bridge worker.

All six guide records were published at 18:32:16 UTC on October 22. Read-only
post-publication checks confirmed exact committed-source fingerprints, preserved
IDs, authors, covers and custom metadata, eleven unchanged non-target guides,
eleven unchanged protected sibling processes and unchanged application settings.
Rollback records are retained under the protected server audit directory
`/home/wow-forever-discord-release-audit/interactive-guides-20261022-610703a`.
They contain no copied credentials.

Live browser verification passed 21 layouts at 1440/390/320 pixels, twelve
interaction groups and four scoped accessibility checks. It verified loaded
images, backgrounds, one H1, canonical links and metadata on every guide, Article
structured data, private-route noindex and unknown-guide 404 behavior. All six
appear exactly once in the 59-entry sitemap and in the RSS feed with real revision
dates; the guide directory's date follows the newest published guide revision.
The QA context used both browser privacy flags and request headers and denied
non-read requests; no synthetic usage events or Discord posts were submitted.

The temporary QA database cluster and SSH forward were stopped after the tests.
The expanded offline library remains at the original review-index path, while
the old HTML/PDF packet and its historical evidence remain in
`starter-review-source-archive-20261022`.

Detailed local receipts are in `artifacts/interactive-guides-20261022`, including
`production-build.log`, `production-publication.jsonl`,
`production-verification.json`, `live-verification.json` and screenshots.
The public submission URL is
`https://www.wowforeverdiscord.online/sitemap.xml`.

This completes this technical guide release, not the wider growth program.
Gameplay review, a consenting ordinary member's full production OAuth journey,
approved new hosts/schedules and genuine attendance/observation evidence remain
open. Publication and a valid sitemap do not guarantee indexing or ranking.
