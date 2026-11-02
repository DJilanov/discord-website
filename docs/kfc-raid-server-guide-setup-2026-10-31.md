# KFC Server Guide setup

Scope: KFC server `1411533815356194968`. This is the native UI step for the
[newcomer experience](kfc-raid-newcomer-experience-plan-2026-10-31.md).

Follow-up at 10:46 UTC: onboarding is now enabled with 16 defaults, including
inaccessible entry destinations. Use this checklist to review the existing
setup alongside the [verification/access plan](kfc-verified-access-plan-2026-10-31.md).
Repair those permissions before treating the join flow as verified; do not
blindly republish the old default list.

The scoped publisher updates saved channel routing while retaining the current
onboarding enabled/disabled state. Server Guide's welcome, tasks and rendered
preview need an administrator's desktop session. Do not rerun the original full
community migration to publish this change.

## Before publishing

Open **Server Settings → Onboarding** on Discord desktop. Check that:

- **What brings you here?** still permits multiple choices.
- **WoW Forever** opens forever-schedule, forever-raids and forever-discussion.
- **TBC raids** opens tbc-schedule, tbc-raids and tbc-raid-chat.
- PvP and browsing choices remain present.
- Class and combat-role choices remain optional after entry.
- start-here is a default alongside the existing seven channels.

The publisher checks that the resulting defaults are readable and at least
five remain writable by a member with no special roles. Keep the schedule and
rules channels read-only. Existing screening and guild acceptance are separate.

## Welcome sign

Title: **Find your next raid with KFC**

Copy:

> Welcome to KFC — a guild and PUG raiding community.
>
> Choose Forever or TBC, open a raid from its schedule, then press Sign up.
> First time? Save your character and continue to Confirm signup.
>
> Guild members receive roster priority; PUGs are welcome where places remain.
> Check the raid's preparation and loot rules before confirming.

## Three navigation tasks

| Title | Destination | Description |
| --- | --- | --- |
| Find a raid | raid-calendar `1557974287602819164` | Choose Forever or TBC and open a scheduled raid. |
| Learn how signup works | start-here `1557974301095755900` | Read the short joining steps and open How to sign up for the walkthrough. |
| Meet the community or get help | new-player-help `1557974292854083615` | Browse questions or ask when you need help. Introducing yourself is optional. |

Use navigation/view tasks if the picker supports them. Confirm in Preview that
each task opens the intended content. Task completion must not require a public
introduction, guild application or commitment to an actual raid.

If the native picker cannot target a read-only destination for the second task,
use the existing help channel and its pinned signup guidance instead. Confirm
that fallback guidance exists before selecting it; do not add an empty task.

## Resources

Initially keep start-here visible in the sidebar. The welcome and each edition's
pinned signup guide already link the public walkthrough:

<https://www.wowforeverdiscord.online/raids/help>

Add only reviewed resource channels. Converting a read-only channel to a Guide
resource removes it from the ordinary sidebar, so do not bulk-convert rules,
applications or existing raid destinations during setup.

## Preview and publish

Preview as a fresh member for Forever, TBC, both, and browsing. Confirm the
welcome, three tasks and matching schedule/forum destinations. Publish once
those checks pass. Then open the server on a phone and verify the same links.

Tell the operator when the native UI is published so it can independently read
back onboarding configuration. A bot API readback verifies channel routing and
enabled state; it cannot prove how the Server Guide welcome/tasks render.

For the illustrated signup guide, capture the first character-setup screen and
the following raid-confirmation screen using a clearly identified private test
raid and synthetic character. Exclude real member names and private messages.
These are the remaining Discord-client images; website/browser checks do not
substitute for actual Discord client screenshots.

## Usability pilot

Recruit five volunteers, including a phone user and someone unfamiliar with
the server. Let each find a suitable raid and complete a permitted signup
without coaching. Record discovery time, completion time, any point requiring
help, and whether they correctly identify their resulting status. Use a private
test event for participants who do not intend to attend a real raid.

Compare the observations with the plan's targets. Do not claim a successful
pilot or publish invented conversion figures before receiving observations.

Discord's current setup references: [Community Onboarding](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ)
and [Server Guide](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ).
