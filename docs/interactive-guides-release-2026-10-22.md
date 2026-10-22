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
category controls. The original review-index path will show the new design;
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

Expected for this release: six publications and eleven preserved editorial
entries. The second authorized run must be idempotent. Keep a protected rollback
record of the affected rows and the preceding website selection. No database
migration or Discord announcement is part of this release.

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
does not establish production availability or gameplay results; immutable-release,
publication, live-browser, canonical and XML checks must pass before release is
reported complete.
