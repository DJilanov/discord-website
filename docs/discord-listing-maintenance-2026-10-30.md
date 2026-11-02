# Discord listing maintenance — October 30, 2026

Status: applied and verified against WoW Forever Discord (`1554316932948172940`) at
`2026-10-30T06:38:42.643Z`. This was an owner-requested, one-time operation, not an automated schedule.

## KFC ordering

The Alliance recruitment forum (`1554327206396690432`) previously sorted by creation date, so a
reply could not move an existing listing above newer posts. Its default is now latest activity.
Only `default_sort_order` changed; topics, tags, permissions, layout, channel positions and other
forum settings remain unchanged. Other forums keep their existing sorting.

One attributed bot bump, with mentions disabled, was posted to each existing KFC listing after
checking the six-hour cooldown. Their prior replies were from October 24. No listing was recreated
or pinned; original URLs, starter contents, embeds, attachments, tags and earlier replies remain.
Fresh Discord API results confirmed these are the top two entries by latest activity:

1. [KFC — relaxed raids, socials and PvP](https://discord.com/channels/1554316932948172940/1563427255781294222)
2. [KFC Hardcore — performance and parse team](https://discord.com/channels/1554316932948172940/1563427580470763561)

Members who manually selected a different sorting option can choose **Latest Activity** to see
that ordering. Other members' future replies can naturally change it.

## Departed-owner check

The scan covered active and publicly archived threads in 11 recruitment, looking-for-guild,
faction LFG, scheduled-run and group-leveling forums: 18 listings and eight unique Discord authors.
Membership was checked before writes and again during final verification. No author returned
Discord's `404 / 10007 Unknown Member`, so **zero posts were deleted**. Permission errors,
timeouts and unreadable responses are never interpreted as a departure.

Bot-authored listings remain attributed to the bot. This check does not infer an anonymous website
submitter's identity or membership from a recruiter name. Safety/report forums, resources,
trading guidance and ordinary chat history were outside the cleanup scope.

## Evidence and verification

Private, gitignored records are under `.data/forever-listing-maintenance-20261030/`: inventory,
paginated scan and plan, membership checks, before-write backup, fsynced write journal, API
receipts and `verification.json`. Credential values are excluded. Public documentation contains
no other posters' membership identifiers or message histories.

Final verification confirmed both new reply IDs, preserved starter data and earlier replies,
unchanged tags/pin states, the top-two ordering, zero mentions and unchanged other channel
configuration. Permission overwrites are compared by target identity because their array order
does not change their meaning; an initial strict array-order check was corrected and the full
read-only verification passed. No website database, application source, worker or deployment changed.
