# Forever recruitment feedback and officer workflow

October 31 follow-up: the five guides now also link directly to the Forever
raid schedule. See the [raiding-space release](kfc-raiding-release-2026-10-31.md)
for the live schedule, forums, guild-priority policy and opening-week events.

Status: Discord changes applied October 30, 2026. This extends the
[joining guidance release](kfc-forever-joining-release-2026-10-30.md).

## Implemented

| Player feedback | Result | Status |
| --- | --- | --- |
| KFC looks like only a PUG server | The pinned guides identify both the guild and its wider PUG community. They explain that this gives organizers more players to call on when raid spots need filling. | Implemented |
| Morning/daytime raids sound uncertain | Recruitment is explicitly active. Djilanov is named for morning/daytime and hardcore runs; Psyrogue is named for the guaranteed daily 20:00 Central European Forever run. | Implemented |
| Joining Discord can feel like guild acceptance | Guides distinguish community access, application received, officer acceptance and the later in-game invite. Open PUG runs remain available without a guild application. | Implemented |
| There is no obvious application action | All five existing pinned guides now have Apply to join KFC and Ask a recruiting question link buttons. The application opens the existing private website form; questions open forever-discussion. | Implemented |
| Players need an acceptance confirmation | Existing officer review states are reused, with a documented private confirmation step. Officers send this message themselves; this release does not add automatic DMs or email notifications. | Manual officer workflow |

The owner confirmed that either application route was acceptable. This release
uses the existing website workflow rather than introducing a second inbox or a
new ticket bot. No subscription, new application database, account linking or
membership automation was added.

## Member journey

1. Join KFC Discord as a community member. This alone does not confirm guild
   membership or require applying to KFC.
2. Select Apply to join KFC and submit the short website application. Include
   the character/planned name, class/role, casual or semi-hardcore preference,
   morning/daytime/evening availability and a contact method.
3. Keep the saved application reference. Received means pending review.
4. An officer reviews the application and explicitly confirms the decision
   privately using the applicant's chosen contact method.
5. Accepted members arrange the in-game invite from launch day. The existing
   invite contacts and public question route remain available.

Do not make public raiders apply for guild membership to use open PUG runs.
Existing guild members who only need access or invite help should speak to an
officer rather than submit duplicate applications.

## Officer workflow

The existing [recruitment dashboard](https://kfcguild.online/admin/recruitments)
requires an authorized KFC staff account. Its states are Pending, Reviewed,
Accepted and Rejected. This document does not grant new dashboard permissions.

1. Open the pending application and check the game/region and contact details.
   The website also accepts other games, so do not assume every record is Forever.
2. Match the player's application reference when discussing an existing request.
   Keep private notes and personal/contact information out of public Discord.
3. Contact the player through the selected method to resolve questions. If
   Discord DMs are blocked, arrange a private officer conversation; do not ask
   them to publish an application or change their privacy settings.
4. When accepting or rejecting, send the decision explicitly and update the
   dashboard status. Record the reviewing officer and confirmation method/date
   in the existing review notes. An Accepted dashboard label must not be the
   player's only indication that the decision happened.
5. Accepted applicants arrange the actual game invite with an officer. Handle
   any Discord guild-role assignment through the existing trusted staff process.
   An application button never grants trusted guild, staff or download roles.

Suggested private acceptance message:

> You're accepted into KFC for WoW Forever. Welcome! We'll arrange your in-game
> guild invite from launch day. Speak to Djilanov for morning/daytime and hardcore
> runs, or Psyrogue for the standard 20:00 Central European runs. Event signups
> and raid rosters are organized separately.

Suggested acknowledgement while reviewing:

> We received your KFC guild application and it is awaiting officer review.
> Keep your application reference. You are welcome in the community while we
> review it, and an officer will contact you with the decision.

The public guide is the common source for recruiting officers. No individual
officer was DMed, pinged, or claimed to have read the new guidance by this release.

## Public destinations and maintained source

- [Start here](https://discord.com/channels/1411533815356194968/1557974301095755900/1557974307580420160)
- [Joining KFC](https://discord.com/channels/1411533815356194968/1411545672313737346/1557974330955145330)
- [Forever applications](https://discord.com/channels/1411533815356194968/1558008778732077090/1558008811728666706)
- [Forever discussion](https://discord.com/channels/1411533815356194968/1548519535177629707/1565750725009604731)
- [Guild invites](https://discord.com/channels/1411533815356194968/1550970060812587028/1565750737655304374)

The shared copy, contacts and URL button builder are in
`content/kfc-forever-joining.ts`. The revision resources include the buttons in
their typed payload. Ownership comparisons and checksums now include button
labels/destinations while ignoring Discord-generated component metadata.
Resources without buttons retain their previous serialized checksum shape.

## Verification and operational limits

All 45 focused community, revision and readiness tests passed. Focused strict
TypeScript checking passed for the content modules, revision helper, revised
tests and their imported pure helpers. Coverage includes the new joining copy,
named organizers, private application URL, pending/accepted distinction, changed
button detection and unchanged checksums for references without buttons.

The application page returned HTTP 200 and its application-form anchor was
confirmed. The approval API and dashboard implementation were inspected. No real
application was submitted, reviewed or accepted for testing, and no applicant
was contacted by this operator. Automatic acceptance notifications remain absent
from the existing website update handler; the private confirmation step above
is a human operating responsibility.

Independent Discord reads verify the five pinned guides and topics, both link
buttons on each guide, original pins, roles, onboarding and all other channel
configuration. No channels, roles or messages were created or deleted by these
follow-up updates. No website deployment, process restart, commit or push ran.

Private snapshots, scoped write journals and verification receipts are in the
gitignored `.data/kfc-forever-feedback-20261030/` and
`.data/kfc-forever-application-links-20261030/` directories.
