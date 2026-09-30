# Owner-Approved Channel Cleanup

September 30, 2026. The owner requested channel cleanup and will publish
messages from the WoWForever account personally. This operation edits channel
configuration only. After the owner confirmed token rotation and granted the
bot's role View Channels plus Manage Channels, 28 topic updates and all six
forum tag sets were applied and verified. Ten channels still deny effective
Manage Channels and remain unchanged. No messages were posted.

## Live Result

The operator narrowed the reviewed plan to the 28 accessible channels; the
existing writer's identity, fixed-content, permission and stale-state checks
remained enabled. The other ten changes were deferred, not forced through.
The private plan, write journal and verification record are in
`.data/kfcbot-audits/1554316932948172940-adhxnI/`. The post-change audit is in
`.data/kfcbot-audits/1554316932948172940-kccaU0/`. These directories are not
published or committed.

Verification confirmed 28 matching topics and six matching tag sets. All 30
unselected channels/categories matched the original captured configuration.
Roles, bot role membership, onboarding, guild settings and protected channel
fields were unchanged. Guild feature flags were compared as an unordered set
because Discord returned the same flags in a different order. All 14 focused
cleanup tests passed immediately before the live run. Native Discord desktop
and mobile rendering still require an owner check.

A fresh planning run now contains only these ten blocked topic updates:

| Category | Channels |
| --- | --- |
| Informations | announcements, rules, relevant-links, wow-forever-faq |
| Addons & Tools | rules |
| Media | wowhead |
| Blacklist | blacklist-rules, blacklisted-users |
| Alliance | post-rules |
| Horde | post-rules |

For each remaining channel, the owner must explicitly allow Manage Channels
for WoWForeverBot under Edit Channel > Permissions. Preserve the existing
`@everyone` restrictions. Do not grant Administrator. Generate a fresh plan
after the permission changes, since old plans will detect the changed
overwrites. Remove temporary management grants after the last batch is verified.

## Scope

- Correct and shorten 38 existing channel topics, including both faction LFG
  areas, recruitment guidance, class/help information and public report warnings.
- Add region/ruleset/status or activity tags to six originally untagged guild/PUG
  forums. Activity and character ruleset are distinct; templates state both.
- Preserve six-hour bump limits, one-post rules, anti-bypass policy and the
  existing gold-only PvP boost advertising policy. No new trading policy is applied.
- Preserve all channel IDs, names, order, parents, visibility, slowmode and
  permission overwrites. No messages, threads, roles, onboarding or guild settings
  are written. The intentional staff Rogue role and both BOT traps are untouched.
- Do not send announcements, pin messages, create channels or manage competitors'
  servers. The original `bot:audit` command remains GET-only.

## Before Applying

1. Rotate the chat-exposed bot token in the owner's Developer Portal and update
   `KFCBOT_TOKEN` in the existing gitignored `.env.local` without sharing it.
2. Give WoWForeverBot Manage Channels and View Channels on the target channels.
   Administrator, Manage Roles, Manage Server and message permissions are not
   required for this batch. Check channel-specific denies as well as its role.
3. Generate a plan and inspect its private before/after preview:

```sh
npm run bot:channels -- plan
```

The returned private audit directory contains `cleanup-plan.json` and
`cleanup-preview.md` beside the original configuration audit. Files are mode
0600 and the directory is mode 0700. Do not commit or publish these files.

Apply the reviewed original plan with the exact printed path:

```sh
npm run bot:channels -- apply --plan .data/kfcbot-audits/SNAPSHOT/cleanup-plan.json --confirm-token-rotated
```

`SNAPSHOT` denotes the directory printed by the planning command. The rotation
flag is an explicit operator confirmation, not proof that Discord rotated it.
The application and guild are fixed to the owner-approved IDs, and patch bodies
must match the checked-in topic/tag definitions. This is not a generic writer.

## Failure and Recovery

The writer validates bot/application/guild identity, checks permissions for the
whole batch and compares all planned channels before its first write. Each
channel is re-read immediately before PATCH and after it. Only topic and
available_tags are sent. Existing nonempty, differing tag sets cause a stop;
they are never overwritten. Already matching channels are skipped on resume.

Discord does not provide a compare-and-swap transaction for these channel edits.
Avoid simultaneous topic/tag edits during the batch. A narrow read/write race
remains despite the preflight checks. Unrelated mutable fields are never sent.

A private fsynced journal records a pending entry before each write and the
verified result afterward. On timeout, ambiguous failure, malformed response,
permission error or stale state, the batch stops. It does not blindly retry a
possibly successful PATCH. Confirmed 429 rejections have bounded retries with
a fresh channel check. Completed channels remain changed; this is not atomic.

After an interruption, inspect the journal and re-run the read-only audit.
Reusing the same reviewed plan skips already matching changes. A concurrent
legitimate topic/tag edit requires a fresh plan/review, not forced overwrite.

Rollback is deliberately manual and narrow: restore only a channel's original
topic after comparing its current topic with the journal's verified result.
Do not automatically remove newly created tags: members may already have used
their IDs on posts. Review their usage with the owner before any tag removal.
No automatic rollback or complete-server restoration is claimed by this tool.

## Verification and Handoff

Run focused cleanup tests, the existing full test suite, typecheck and lint.
After a successful live run, re-run `npm run bot:audit`, compare unaffected
fields and have the owner inspect desktop/mobile forum creation. Automated
configuration checks do not verify native Discord rendering or event activity.

Remove temporary Manage Channels permission after verification. Public copy
does not claim that the inactive website bot, future signups or addon release
are available. `/appeals` remains the FG-reference player-case appeal flow,
not a server-ban appeal endpoint.

The owner can then post welcome/rules/recruitment messages and pin them with
their own account. No announcement or message is posted by this command.

## References

- [Discord channel modification and tag limits](https://docs.discord.com/developers/resources/channel#modify-channel)
- [Permission evaluation](https://docs.discord.com/developers/topics/permissions)
- [Rate limits](https://docs.discord.com/developers/topics/rate-limits)
- [Broader community plan](community-excellence-plan.md)
