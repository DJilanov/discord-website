# KFC guild joining review

Reviewed October 30, 2026. The findings below describe the original audit
snapshot. After the owner clarified the Forever group plans and invite contacts,
the joining copy, pins, topics and entry-channel ordering were updated live.
See the [Forever joining release](kfc-forever-joining-release-2026-10-30.md)
for implemented scope and remaining work. The broader workflow below remains a
proposal; it must not replace the owner's direct whisper/discussion joining route.

The joining information exists, but the member has to assemble the process from
several competing instructions. The most urgent defects are an invite tied to
an old raid channel, unpublished onboarding, and inconsistent access to the
channels referenced by the joining instructions.

## Evidence collected

The existing bot identity was verified before reading KFC Global Pugs, server
`1411533815356194968`. The review used documented bot REST endpoints, current
channel/role/onboarding configuration, and the latest/earliest 25 messages and
pins in eleven entry and recruitment channels. Only selected guidance channels
were read; no staff channels, DMs, applications database or member roster was
collected. The public KFC homepage and recruitment page were also checked.

Private evidence is in `.data/kfc-joining-review-20261030/`: `inventory.json`,
`guidance.json`, `permissions.json`, `website-invite.json` and `verification.json`.
Message samples stay private and are excluded from this document. That directory
is gitignored. The local review client only sends GET requests.

### What is going wrong

| Priority | Verified finding | Effect on a newcomer |
| --- | --- | --- |
| P0 | The website's public invite `WGv4APs9DY` is bound to `hyjal-30aug-630pm`, channel `1530905451498176522`, under Archives. The channel is readable but not writable for the no-role and verified profiles. | The invitation points at historical raid content rather than the joining guide. Exact client landing behavior still needs a fresh-member check. |
| P0 | KFC onboarding returns `enabled: false`. | The configured newcomer questions are not a published entry flow. Merely having questions saved does not guide new arrivals. |
| P0 | Start Here contains eight channels in this order: rules, announcements, verification, legacy-welcome, newcomers, role-select, joining-kfc, start-here. | Several channels look like the starting point. The channel literally called start-here is last. |
| P0 | The permissions model permits no-role members to read joining-kfc, but denies them access to rules and tbc-application. | A visible joining page links to a destination that this newcomer profile cannot open. Native screening state and third-party verification behavior were not tested. |
| P1 | The start-here welcome contains 209 words and eleven distinct channel mentions. Its dedicated Join the guild section starts 86% through the text. | Joining is buried beneath other activities and staff-contact instructions. The main action is difficult to spot on a phone. |
| P1 | joining-kfc directs players to the game application, which asks them to copy a template and find KFC Management in the member list. Forever also offers guild-invite for a simple invite. | The member must choose between an application, an invite request and a private message without a clear explanation of which one they need. |
| P1 | The old role-select message labels some roles NEEDED and includes KFC Guild Applicant. The newer welcome calls class/interests optional in Channels & Roles. The verified-only profile can view role-select but lacks Read Message History there. | There are conflicting role instructions, and an old applicant selection can look like a complete application. Reading the role-menu history can also fail. The third-party selector's current behavior is unverified. |
| P1 | guild-invite has nine sampled messages, no pins and no bot-authored guide. An October 30 message says an officer contact list will be posted at launch. | There is no pinned, current contact route or clear explanation of what happens after a request. The launch contact list remains future work in the sampled guidance. |
| P1 | Sampled automatic welcomes say hello without linking to joining instructions. The configured system channel is newcomers, which is hidden from the no-role profile. | The welcome does not provide a useful next action and may not be visible before verification. |
| P2 | The inventory contains 140 entries: 15 categories and 125 other channels. A no-role profile can access 66 non-category channels; a verified-only profile can access 101. | There is a large amount of discoverable content before a clear membership path. These are permission counts, not a claim that every channel appears in every sidebar. |
| P2 | The Discord server name is KFC Global Pugs while the website recruits for KFC Guild's Forever roster. | People arriving for guild membership can reasonably wonder whether they have joined only a public raid community. |

The configured default channels omit both start-here and joining-kfc. The saved
WoW Forever answer adds discussion, the November 5 leveling channel and
guild-invite; it does not add forever-application. These mappings also need
review before onboarding is published. Adding more explanatory channels would
increase the navigation problem.

The website already offers an application form at
<https://kfcguild.online/recruitment>, with Discord, email or in-game contact.
This audit did not submit the form or inspect its staff processing. A future
Discord application must reuse or deliberately integrate with that workflow,
rather than silently creating a separate application inbox.

## Intended member experience

The first screen should answer three questions: Is this the right guild? What
do I press? What happens afterward?

1. Arrive through an invite associated with the visible joining destination.
2. See Join KFC as the primary action, with WoW Forever and TBC clearly separated.
   Public raid signup and help remain secondary actions.
3. For a normal Forever invite, provide a character/planned name and class.
   Add availability when needed for contact. Do not require raid experience,
   logs, a spec commitment or a long application for a social introduction.
4. Receive a clear acknowledgement and instructions for the next step. A real
   officer confirms membership; selecting an interest or applicant role does
   not grant guild-member access.
5. After the in-game invite, confirm Discord guild access as a separate step.
   A member who is already in the guild needs a short confirmation path, not
   another application.

Proposed first-screen copy, to accompany working destination buttons:

> **Want to join KFC?**
>
> **WoW Forever — EU · Alliance · PvP · English**
> Choose **Join Forever** and tell us your character name and class. A recruiting
> officer will reply with the next step. Already in the guild? Choose
> **Confirm guild access**.
>
> Playing TBC? Choose **Join TBC**. Only here for a public run? Open
> **Raid calendar**. Need help? Ask in **new-player-help**.

This is proposed copy, not an already published panel. No response-time promise
should be added until officers agree who covers recruitment and when.

## Implementation sequence

### 1. Repair discovery with existing channels

- Put the canonical joining destination first in Start Here. Reuse existing
  channel IDs; do not delete or recreate channels to obtain the order.
- Put a short guild-joining action at the top of start-here. Turn joining-kfc
  into the maintained canonical instructions. Replace competing entry copy with
  short redirects, preserving historical messages and links.
- Pin a brief current invite guide in guild-invite, with the character format,
  recruiting contacts, launch/beta distinction and an officer-confirmed next
  step. Ordinary public requests should contain only game details; retain a
  private alternative for applications or contact information.
- Create a non-expiring invitation associated with the joining destination and
  update the website/recruitment buttons and maintained external listings.
  Verify the new code's guild and channel through GET Invite. Preserve the old
  code for existing links; do not revoke it during this repair.
- Check the website's event-specific Sign Up on Discord links too: the homepage
  currently includes one using the same generic archived-raid invitation.
- Make required public instructions readable before any intended gate, and
  make the verified member's subsequent steps work. Change only the necessary
  public-channel overrides; retain private member/staff boundaries and review
  third-party verification bindings before any retirement of that gate.
- Correct or retire the obsolete role-select instructions after checking their
  third-party owner and bindings. Preserve existing member roles. Do not
  self-assign KFC Certified, management or other trusted-access roles.

### 2. Publish a coherent newcomer experience

- Make game/intent the short initial choice; keep optional class and combat
  interests afterward. Route Join Forever and Join TBC directly to their
  actual joining destinations.
- Revise the defaults to include the canonical joining page. Discord requires
  at least seven defaults, including five where everyone can view and send;
  a second read-only entry page cannot simply replace a writable default.
- Configure Server Guide tasks/resources in the owner UI and preview the actual
  first screen before publishing onboarding. The current public bot audit does
  not establish the Guide's configuration. Resource pages disappear from the
  ordinary channel list, so retain an obvious visible joining destination.
- Replace greeting-only automatic welcomes with a concise link to that same
  destination, after identifying the bot that owns those greetings. A greeting
  should not become another independent set of joining instructions.
- Reduce the default exposure to old raids and optional resources through
  channel subscriptions and navigation. Keep archives, IDs and permissions;
  do not mass-delete historical channels or automatically hide useful spaces
  from established members.

### 3. Make recruitment completion visible

- Reuse the existing application service where appropriate. If a Discord
  button/form is added, verify its real interaction handler and staff delivery
  before publishing it. A link to existing working instructions is the interim
  fallback; a button must never claim a workflow that does not exist.
- Track request acknowledgement, assigned officer, contact, in-game invite and
  Discord membership confirmation. The applicant should always know the next
  action. Website submissions and Discord requests must not become unrelated
  duplicate records.
- Keep private applications visible only to the applicant and authorized
  recruiters. Identify the applicant by authenticated Discord ID when available;
  do not infer trusted membership from display names or an applicant-role flag.
- Have officers agree current contacts and realistic response coverage. Handle
  duplicate clicks, an existing application, blocked DMs, a planned character,
  a missing/revoked member role, staff absence and a bot outage explicitly.

## Acceptance checks

Use real Discord desktop and mobile sessions with a fresh member and an
existing verified member. Bot administrator access is not a newcomer preview.

- The website invite targets the intended KFC channel; the new arrival can find
  the joining action without searching or opening the member list.
- The ordinary member can identify how to join within 30 seconds. This is a
  proposed usability target, not a measured result from this audit.
- Both TBC and Forever routes work with the relevant newcomer/verified profile.
- A public raider can sign up without accidentally applying for guild membership.
- A social member can request an invite without completing raid qualification.
- A request receives a real acknowledgement and reaches the recruiting staff.
- Confirmation of in-game membership leads to the correct Discord access, without
  granting staff privileges or exposing another applicant's private information.
- Blocked DMs and offline staff have an explicit fallback. Duplicate submissions
  do not create multiple unrelated cases.
- Existing channel bookmarks, member roles, private staff/member areas, historical
  posts and current raid integrations still work.

REST reads, saved-evidence assertions, and effective channel-permission checks
were completed for this review. A fresh-account join, verification button,
third-party role dropdown, native desktop/mobile rendering and an application
submission were not exercised. They remain required rollout checks.

## Discord references

- [Community Onboarding FAQ](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ)
- [Server Guide FAQ](https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ)
- [Invite API](https://github.com/discord/discord-api-docs/blob/main/developers/resources/invite.mdx)

Live reference channels:
[start-here](https://discord.com/channels/1411533815356194968/1557974301095755900),
[joining-kfc](https://discord.com/channels/1411533815356194968/1411545672313737346),
[guild-invite](https://discord.com/channels/1411533815356194968/1550970060812587028),
[forever-application](https://discord.com/channels/1411533815356194968/1558008778732077090)
and [tbc-application](https://discord.com/channels/1411533815356194968/1411545946155909150).
