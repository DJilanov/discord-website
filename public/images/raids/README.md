# Raid Character Icons

World of Warcraft class and talent artwork belongs to Blizzard Entertainment.
Unmodified 56 x 56 JPEGs were retrieved from Wowhead's icon CDN:
`https://wow.zamimg.com/images/wow/icons/large/<icon-name>.jpg`.

The explicit class/spec assignments live in `lib/raids/presentation.ts`.
These are presentation assets, not a raid loot or ability dataset, and do not
change the Forever-only catalog import boundary. Class/spec validation remains
in `lib/raids/specializations.ts`. Duplicate names such as Protection are mapped
independently for each class. The Holy illustration is intentionally shared;
class badges distinguish Paladin and Priest portraits.

Icons are served locally to avoid third-party browser requests and preserve the
existing `img-src 'self' data:` policy. Render them at or below their native
resolution. All downloads were checked for JPEG format and 56 x 56 dimensions;
automated tests check complete mappings, local files and browser decoding.
