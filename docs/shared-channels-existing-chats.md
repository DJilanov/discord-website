# Existing Forever Chats

September 30, 2026. This supersedes the dedicated-channel selection in the initial
[bridge release](shared-channels-release.md). The owner first selected three existing
KFC channels, then explicitly excluded `classic-plus-who-plays-what`. Only the two
pairs below are approved for preparation. The owner will publish notices personally.

## Selected Channels

| Pair | KFC Global Pugs | WoW Forever Discord |
| --- | --- | --- |
| Discussion | [classic-plus-discussion](https://discord.com/channels/1411533815356194968/1548519535177629707) | [general](https://discord.com/channels/1554316932948172940/1554322593589235732) |
| Leveling | [group-leveling-5ft-november](https://discord.com/channels/1411533815356194968/1548747530790248610) | [group-leveling](https://discord.com/channels/1554316932948172940/1554898196721967137) |

`classic-plus-who-plays-what` and `ask-guild-invite` are not selected. The earlier
unused WoW Forever `forever-shared-chat` is not connected; no new KFC channel with
that name was created. No counterpart for who-plays-what was created.

Existing access rules are preserved. The general-channel topic is preserved with
a sharing disclosure appended; selected KFC topics include the policy URL. The new
leveling channel is public, non-NSFW, under General chats. No member messages or
sharing notices were posted by the bot during preparation. No history was fetched.

## Pair Isolation

- Migration `006_bridge_channel_pairs` replaces the single-pair constraint with
  three bounded slots and unique non-retired endpoints. Only two are selected.
- Consent and commands are scoped to the originating channel and its exact pair.
  `/bridge join` in discussion does not enroll leveling. Confirmation cannot be
  reused in another pair. `/bridge leave` stops both directions of that pair only.
- Run status, leave and removal commands inside the relevant paired channel.
  Members who lose access can contact staff privately for withdrawal and cleanup.
- Each pair has its own notices, staff approvals, validation, moderation and
  lifecycle. The admin selector scopes records, counters and actions to that pair.
- Only the two owner-selected existing KFC channel IDs can use the existing-channel
  exception. Role-gated KFC access is not widened. A public counterpart may have a
  larger reading audience, disclosed in the opt-in and policies; participants must
  still have speaking permission in both channels.
- Worker-wide quotas remain 100 pending deliveries, 1,000 active copies and the
  existing author rate limits, not multiplied by the number of pairs. A channel
  permission change pauses its own pair without marking the Gateway disconnected.
- Restart recovery still stops publication, withdraws consent and cleans up known
  copies. No automatic opt-in, backlog, channel merging or history import is added.

## Owner Notice

Post this personally in **all four selected channels**, then provide the four exact
message links. These are notices, not proof that publication or live tests passed.

> We're connecting this chat two-way with its matching chat in KFC Global Pugs / WoW Forever Discord. The counterpart is named in this channel's topic.
>
> Sharing starts only after staff activate the pair. To share, use /bridge join here and accept the confirmation. You must be able to chat in both servers. Only your new eligible text is copied, showing your Discord name and original community. Old messages are not imported. People in the other community can read the copy even if they cannot open the original channel.
>
> /bridge leave here stops sharing in both directions of this pair and requests cleanup. /bridge remove requests removal of a particular copy. Other channel pairs are separate. Copies expire after 30 days; cleanup can be delayed by outages. Your originals stay. The pilot requires moderator review and does not relay links, mentions or attachments.
>
> Details: https://www.wowforeverdiscord.online/bot/shared-channels

## Release State

Channel preparation and local verification are complete. All 104 unit/integration
tests, all 31 browser tests, lint, strict typecheck, production website build and
worker build passed. The isolated worker-package installation/build/disabled-start
check passed. The pair selector and actions were checked at 320/390/768/1440px,
including accessibility and cross-pair authorization. These tests use simulated
Discord transport, not member conversations. Production deployment is in progress.

Keep both pairs stopped until their notices, moderation/retention approvals and
truthful live-test sign-off are complete. Off-host secret recovery and independent
alerting remain outstanding from the initial release. Never record a human opt-in
or a successful live relay test on someone's behalf.
