# Event availability and listing conversion

Production build: `.next-release-attendance-20261008-r1`, October 8, 2026.
The public November 5 listing is now `/raids/cmuz20aal0000fu4s0vf3f2wx`, using
its original Discord thread/starter `1555464828921978970`. It has open signup,
five planned seats, and an 08:30-22:30 Central Europe schedule. The separate
private prototype and its one signup were not converted or copied.

Members can respond Joining, Tentative or Absent from the website or the native
Discord event controls. Every response retains the member's character and is
listed by name. Tentative and Absent are not roster seats and cannot hold soft
reserves. Changing to either releases the party position and clears reserves.
Choosing Joining again uses normal admission and capacity rules: open signup,
organizer approval, or automatic admission with a bench when full. Signups must
still be open, and event rules and audience must be acknowledged.

Organizers cannot admit unavailable members. Those members must choose Joining
themselves. Response changes use the existing transaction, audit log, policy
acknowledgement and Discord projection; one signup per member/event is retained.

Signup totals include confirmed, registered, awaiting-approval and benched
players. Confirming a player does not remove them from that total. Tentative,
absent and withdrawn responses are excluded. Confirmed places and remaining
capacity are still calculated only from accepted players. Website and Discord
summaries use the same roster summary; awaiting roster selection is not labelled
as the total number of signups.

Apply migration `035_raid_attendance` with `npm run db:migrate` before restarting
the website and raid worker. It extends the status constraint and prohibits party
positions or reserves on unavailable responses. No existing signup is changed.
In production the application account is not the table owner; run migrations as
the established PostgreSQL migration owner over its local socket, not by granting
DDL permissions to the runtime account.

Approved, bot-owned public LFG forum listings can be converted operationally:

```sh
node_modules/.bin/tsx scripts/convert-group-event.ts \
  --group LISTING_ID --organizer DISCORD_USER_ID \
  --finish 2026-11-05T22:30 --capacity 5 --admission open \
  --target "Northshire / Goldshire leveling"
```

This previews without writes. Add `--apply` to confirm. The finish time uses the
listing's regional timezone. The conversion verifies the organizer's live Discord
administrator permission, source checksum and parent-forum permissions. It reuses
the original thread/starter message, preserves replies, hides the legacy listing
and publishes the native event only after delivery is verified. Re-running an
interrupted conversion recovers the same event and post without importing any
private prototype or its participants. Other listing submission flows are unchanged.
