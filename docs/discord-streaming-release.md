# Community streaming release

Owner-approved live server setup on 2026-10-01. This is a Discord configuration
release, not a website player or a video relay service.

## Live destinations

| Purpose                                               | Channel           | ID                    |
| ----------------------------------------------------- | ----------------- | --------------------- |
| Creator introductions and manual promotion, unchanged | streamers         | `1554324295143133184` |
| Read-only Twitch alert destination                    | live-now          | `1555138696678740039` |
| Native Discord Go Live and conversation               | Community Streams | `1555138702299234346` |

All three are in Social & Media (`1554318911082856538`). Only the latter two
channels were created. No Stage, individual creator room, notification role,
event, website route or extra bot was created.

- [Open live-now](https://discord.com/channels/1554316932948172940/1555138696678740039).
- [Open Community Streams](https://discord.com/channels/1554316932948172940/1555138702299234346).

## Permissions and guidance

Community Streams permits regular members to view, connect, speak, use voice
activity and Video/Go Live, and read/write its text chat. Audio bitrate is 64 kbps,
voice region is automatic, camera quality is automatic, user limit is zero
(Discord's own capacity limits still apply), and text chat has five-second
slowmode. No stream is started, recorded or rebroadcast by WoWForeverBot.

The existing Moderator role gets message cleanup and room-scoped mute, deafen
and move controls. No global role permissions or role assignments were changed.
Ordinary members do not gain management permissions. The intentional BAN role
cannot view, connect or participate in the new rooms with normal class roles.

live-now allows ordinary members to read, but not post, create threads or send
thread/voice messages. The existing Streamcord role can send messages and embeds;
moderators can manage the feed. Regular members cannot mass-mention from either
new channel. Streamcord's existing Administrator grant was not changed: that
grant bypasses overwrites, so no-ping behavior must also be configured in its
dashboard. Never claim the channel deny alone restricts an administrator bot.

The bot created two clearly attributed guides without mention notifications:

- Alert guide `1555138706371780619`, pinned in live-now.
- Native streaming guide `1555138713619796010`, in the voice room's text chat.

Discord rejected the voice guide's pin request with HTTP 400 / error 50019 even
though its message read-back reports that voice channel. The operator now pins
only the text guide; it does not retry the voice pin or create duplicate copies.
Both guides are verified. External broadcasts/recordings of participating
members require disclosure and permission; private data and unauthorized
rebroadcasts are prohibited.

## Optional navigation

An optional, multi-select question appears after joining, in Channels & Roles:

**Interested in streams and creators?** (`1555139337224462431`)

| Choice                          | Routing             | Assigned roles |
| ------------------------------- | ------------------- | -------------- |
| Twitch creators and live alerts | streamers, live-now | None           |
| Watch or stream inside Discord  | Community Streams   | None           |

Both choices can be skipped. There are no compulsory Twitch connections or
subscriptions. Existing onboarding questions, BOT choices, class assignments,
enabled/mode settings and seven default channels were preserved. This release
does not claim that the separate, broader manual onboarding plan is completed.

## Twitch activation still pending

Streamcord is installed, but its dashboard configuration was not available to
this bot operator. No creator has been enrolled or go-live notification tested.
Public creator Twitch links are still needed; never request passwords, user
tokens or stream keys. The guide states that alerts still need configuration.

In the [Streamcord dashboard](https://dash.streamcord.io/):

1. Select WoW Forever Discord, then Notifications.
2. Add a Twitch notification for each approved creator, targeting live-now.
3. Include the creator, stream title and Twitch link; agree language/region/focus
   labeling with the creator. Disable everyone, here and role mentions.
4. Review existing destinations before changing them to prevent duplicate
   alerts. Do not duplicate an existing notification for the same creator.
5. Restrict the pilot to relevant WoW Forever sessions. Game/title filtering is
   a Pro feature; verify actual stream categories rather than assuming a unique
   Forever category exists. Without filtering, use manual review or creators
   whose subscribed channel consistently meets the pilot scope.
6. With Pro, edit the original alert when the stream ends. Stream cleanup is a
   Pro feature; avoid additional offline notification posts.
7. Test with the creator genuinely going online/offline. Check relevance,
   labeling, no pings, reconnect behavior and desktop/mobile link opening.

The pilot policy is at most one promotional alert per creator per rolling
24 hours, independently of the existing manual-promotion rule. This is a
moderation policy, not a claim that Streamcord has an enforced rolling quota.
Review dashboard capabilities and enforce limits manually during the pilot;
future automated enforcement needs a separately tested bot feature. Do not
promise reconnect suppression before a live test.

Discord's official Twitch integration handles subscriber roles for eligible
Partner/Affiliate channels. It does not automatically start a Discord Go Live
session, and subscriber roles are not necessary for this community setup.

## Operator and verification

```sh
npm run bot:streams
npm run bot:streams -- --apply
```

The default is a GET-only preview. Apply is fixed to the approved Forever guild
and WoWForeverBot, reuses the existing bounded Discord client, records private
before snapshots and a write journal, and read-verifies configuration. Recovery
state is in ignored `.data/discord-streaming/`, protected by a private operator
lock. An uncertain creation stops retries; reconcile its journal and recorded
IDs instead of clearing pending state or duplicating the request blindly.
Renamed channels, edited guides/questions and unexpected permission changes
stop the operator for review. No channel/message DELETE requests are supported.

The first pass created both rooms and guides; the voice-pin rejection stopped
before onboarding. The corrected second pass added onboarding. Its preservation
check detected concurrent disappearance of old tool archive channels and
stopped rather than restoring them. Subsequent server cleanup was left intact.
A fresh third pass completed with 64 then-current channels/settings preserved
and no duplicate channels, guides or questions. Do not claim every channel from
the original pre-release inventory survived external cleanup.

Verification passed:

- 55 focused tests across streaming, group channels, channel experience and
  configuration audit.
- `npm run typecheck`.
- Focused ESLint with zero warnings.
- Discord read-back of room permissions, guides and optional onboarding.
- Repeated apply without duplicate creation or unnecessary configuration writes.

A real-member desktop/mobile Go Live session and Twitch online/offline/reconnect
tests remain outstanding. Neither native video playback nor Twitch alert
delivery is claimed tested by configuration read-back alone.

## References

- [Discord Go Live and permissions](https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share).
- [Discord onboarding API](https://docs.discord.com/developers/resources/guild#modify-guild-onboarding).
- [Discord Twitch integration](https://support.discord.com/hc/en-us/articles/212112068-Twitch-Integration-FAQ).
- [Streamcord notifications](https://docs.streamcord.io/notifications/add-twitch).
- [Streamcord Pro filtering](https://docs.streamcord.io/notifications/filters).
- [Streamcord Pro cleanup](https://docs.streamcord.io/notifications/cleanup).
