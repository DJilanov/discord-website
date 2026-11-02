# KFC Forever joining guidance

Status: live and verified on October 30, 2026 at 15:35 UTC.

Later that day, the [recruitment feedback update](kfc-forever-recruitment-feedback-2026-10-30.md)
added the guild/PUG explanation, named daytime and evening organizers, an
application button and the explicit pending/accepted officer workflow. The
initial release details below are retained as history.

The owner confirmed two ways to play: casual groups and semi-hardcore groups,
with two 10-player teams and one 20-player team. From day one, players can
whisper Djilanov, psyrogue, nelf, nunk or Animagigel in game, or request a guild
invite directly in forever-discussion. These contacts are character names, not
assumed Discord account IDs. No user or role mentions were sent.

## Published

- Updated the existing pinned start-here, joining-kfc and forever-application
  guides in place. Forever joining now leads with the group options and contacts
  rather than a private application template or a search through the member list.
- Added and pinned the same concise guide in forever-discussion and guild-invite.
  All existing pins, posts and replies were preserved.
- Updated those five channels' topics with the group lineup and contact route.
- Moved start-here and joining-kfc to the first two positions within Start Here.
  Existing channel IDs, parents, roles and permission overwrites were preserved.
- Kept the TBC application route and the existing event signup destinations.

Direct links:

- [Welcome](https://discord.com/channels/1411533815356194968/1557974301095755900/1557974307580420160)
- [Joining KFC](https://discord.com/channels/1411533815356194968/1411545672313737346/1557974330955145330)
- [Forever joining](https://discord.com/channels/1411533815356194968/1558008778732077090/1558008811728666706)
- [Forever discussion guide](https://discord.com/channels/1411533815356194968/1548519535177629707/1565750725009604731)
- [Invite-channel guide](https://discord.com/channels/1411533815356194968/1550970060812587028/1565750737655304374)

## Source and checks

`content/kfc-forever-joining.ts` holds the shared contacts, description and topic.
The community and revision resources both use it so a future publication does
not restore the old Forever application instructions. The October 9 publisher
revision identifier remains unchanged for unrelated resources; the three revised
entry embeds carry a separate October 30 review footer.

All 43 focused community/revision/readiness tests passed. Strict TypeScript
checking of the three content modules passed. Live reads confirmed five matching
pinned guides, five matching topics, entry order and zero user/role mentions.
The complete original role set, onboarding configuration, other channel settings,
permission overwrites and previous pins were independently compared and preserved.

Discord adds content-scan metadata to embeds. An initial comparison stopped
after the first intended welcome edit because it included that metadata.
The operator reconciled the confirmed write, ignored only Discord's type and
content-scan metadata, and continued without creating duplicate messages.

Private operational evidence and the fsynced write journal are in the gitignored
`.data/kfc-forever-welcome-20261030/` directory. No application deployment,
restart, Git commit or push was performed.

## Remaining work

- A new permanent invitation was created and verified for start-here:
  <https://discord.gg/BT3CgxbqZF>. It is used in the Guild Finder draft. The
  website's existing invitation remains associated with the archived August
  Hyjal channel and still needs replacing in its managed configuration. No
  existing invitation was revoked.
- Native onboarding remains disabled. Publishing it, retiring third-party gates,
  and changing rules/TBC visibility are outside this content update.
- Actual desktop/mobile newcomer walkthroughs and recruiter response coverage
  still need checking. The live checks establish configuration and message
  delivery, not human response times or confirmed raid schedules.
- The WoW Guild Finder listing is a separate requested follow-up. It must use the
  owner's account, accurate Forever metadata and genuine private authority
  evidence; no fabricated schedules, progression or officer screenshots.
