import type { EditorialGuide } from "./guides";
import { templateMarkdown } from "./templates";

export const guideAdditions: Record<string, string> = {
  "join-wow-forever-discord": `## Invitation troubleshooting by symptom

Start with what Discord actually says, rather than assuming every problem means the invitation expired. The actions below follow [Discord's invitation support guidance](https://support.discord.com/hc/en-us/articles/360001556852-Invalid-Invite-Links), checked September 30, 2026.

| What you see | What to check next |
| --- | --- |
| Unknown or expired invitation | Open the current link on our [Discord page](/discord). An old copied invitation may no longer work |
| Invalid invitation | Open the original link rather than retyping its case-sensitive code. Ask staff for a replacement if it still fails |
| Server limit reached | Check Discord's current account/server limit. This is an account limit, not proof the community invitation is broken |
| A ban message | Ask the server's administrators about review. Do not make replacement accounts or evade a ban |
| Joined, but channels are missing | Check the signed-in account, **rules**, the current welcome questions, selected roles and available channels |

On mobile, confirm that the browser and Discord app are using the account you intended. If opening the app loses your place, return to the website's invitation page and check the preview again. Never share a login code, session token or password with someone offering to fix access.

## When you cannot reach the server

If you can enter, ask staff in the welcome/help spaces and describe the error without exposing account information. If you cannot join at all, use the public contact details, when supplied, on our [About page](/about), or [Discord Support](https://support.discord.com/hc/en-us/requests/new) for account/client problems. The website's appeal form is for reviewed website alerts, not a way to lift a Discord server ban.

Useful details are the error wording, whether you used the website's current link, and whether it happened in the browser or app. A cropped screenshot of the error is enough; remove email addresses and unrelated conversations. Community staff cannot override Discord's account restrictions.

Once access works, choose one activity and one region to start. [Find a session](/lfg) or [compare guilds](/guild-recruitment) without changing your existing guild membership.`,
  "write-wow-forever-guild-recruitment-post": `## Blank recruitment template

Use this worksheet for your own guild. Leave undecided plans explicitly undecided, remove fields that do not apply, and fill in the actual public contact. It is not a live recruitment listing.

${templateMarkdown("guild-recruitment")}

## A short example with a clear promise

> Illustrative wording: We are putting together an EU Alliance group for two relaxed evenings a week, with a firm finish time. Social players are welcome too. Our character ruleset is still undecided. Before a trial, we will agree on attendance, preparation and written loot rules. Contact our recruiter to compare schedules.

This is a writing example, not a real guild or an available roster place. Add your actual days, named time zone, roles and recruiter before posting. Do not copy an example as if its plans were your own.

Keep one maintained [website listing](/guild-recruitment/new). With your explicit consent, the bot queues it for the matching Discord recruitment forum. Do not create duplicates while delivery is pending. Corrections to ordinary listings still need staff; editing a separate Discord message is not a website-editing control.

If you are coordinating the first week with an existing roster, use the [friends and guild launch checklist](/guides/wow-forever-launch-group-checklist).`,
  "find-or-organize-wow-forever-group": `## Blank group-post template

Complete this for one real session, not an entire guild's launch. A place is confirmed only when the organizer agrees; copying this template does not create a signup.

${templateMarkdown("group-post")}

## Check the date, not just the clock

1. Pick the calendar date before converting any time.
2. Use a named zone such as Europe/Sofia or America/New_York, not only "server time" or "evening."
3. Check the UTC equivalent for that date in your calendar. Do not reuse an offset from a different season.
4. In the website form, follow its displayed time-zone label. Compare the resulting regional time and UTC offset with your original plan.
5. Ask one other participant to confirm the same instant before recruiting more players.

Example only: a weekly group can remain at 20:00 in its organizer's local zone while its UTC time changes when local clocks change. A fixed 20:00 UTC group makes a different commitment. EU and North American clock changes can fall on different dates; do not silently shift a recurring group's schedule.

For a shared launch plan across several days, use the [launch checklist](/guides/wow-forever-launch-group-checklist). If you are arranging beta testing, check the [beta preparation guide](/guides/wow-forever-beta-starter-checklist) before advertising access or content.`,
};

export const preparationGuides: EditorialGuide[] = [
  {
    slug: "wow-forever-beta-starter-checklist",
    title: "WoW Forever Beta Starter Checklist: Access, Setup and Groups",
    excerpt:
      "Check beta access, prepare your setup, and arrange a testing session with a clear time and fallback plan. Official sources and a practical group checklist.",
    category: "Getting started",
    coverImage: "/images/forever-world.webp",
    content: `Before arranging a WoW Forever beta session, confirm that each player can access the test, install the right client, and agree on one achievable goal. Finding a group does not grant beta access. This is a preparation guide, not a hands-on review or a promise that a particular feature is available.

**Official information checked September 30, 2026.** Blizzard's [beta instructions](https://news.blizzard.com/en-us/article/24304160/the-world-of-warcraft-forever-beta-now-live) say the beta is live. Selected opt-in accounts and eligible bundle purchasers can obtain access; opting in alone is not a guaranteed invitation. The announced final full test day is October 21. Check the linked official page again before making plans.

## Confirm access privately

Sign in through Battle.net itself and check the account you intend to use. Do not give a group organizer your password, authentication code or account screenshot. Each player can simply confirm that they can enter the test.

If you are not selected, do not promise a session that depends on access. Joining our Discord, submitting a guild listing or installing a community addon does not unlock Blizzard's beta. There is no purchase required by this community and we do not sell invitations.

## Install before the agreed start

In the Battle.net desktop app, select World of Warcraft, then choose the Forever beta in the Game Version menu under In Development and install it. Blizzard notes that eligible purchased access may take up to 30 minutes to appear and can require a launcher restart. For missing access or installation trouble, follow the official beta page's technical-support link rather than trying files sent by a stranger.

Our preparation checklist is deliberately separate from those official installation instructions:

- Leave time for downloads and updates before inviting the group.
- Check that the intended account and client open successfully.
- Agree on your voice or text contact and how to announce a delay.
- Tell the host what you have actually checked, not what you assume will work.
- Keep one fallback activity or another date in mind if the test is unavailable.

## Choose one testing goal

Ask the group what it wants to learn or try, then verify that the current test supports it. A short exploration session and a carefully coordinated activity need different preparation. Agree on pace, newcomer expectations, spoilers and a firm finish.

Do not turn the original announcement's week-one level limits into claims about today's build. Ruleset availability, test content and maintenance can change. The artwork on this page is approved game artwork, not a screenshot proving that our organizers tested a specific build.

## Find compatible people

Use the [community Discord](/discord) to discuss region, faction, available hours and interests. Read the relevant faction's **post-rules** before using its activity-specific group channel. A role label in Discord does not establish in-game compatibility.

For a website listing, use the [group-post guide and blank template](/guides/find-or-organize-wow-forever-group). Include the date, named time zone, expected finish, test activity and public organizer handle. Agree on region, character ruleset and faction first; see [playing with friends](/guides/wow-forever-playing-with-friends) and confirm test availability. Listings publish immediately with sharing consent and are queued for the Discord forum, then reviewed by moderators. A listing is not an automatic signup; managed events have separate signup controls.

## Agree on the fallback before login

Decide how long to wait if someone cannot enter. A host can postpone, switch to a discussion or agree another session; nobody should feel pressured to buy access to keep a social invitation. Never promise a queue bypass, account fix or guaranteed test slot.

Use the same contact point to announce changes. If you posted on both the website and Discord, update both through their current processes. A message edited in one place does not currently update the other.

## Finish with useful notes

After the session, write down the date, actual client build if known, what you tried and what remains untested. Share game bugs through Blizzard's current official feedback route. For a public community recap, obtain permission for names and screenshots and leave private chat out.

Preparing for launch rather than testing? Use the [friends and guild launch checklist](/guides/wow-forever-launch-group-checklist). If official access instructions change or the beta ends, they take precedence over this dated checklist.`,
  },
  {
    slug: "wow-forever-launch-group-checklist",
    title: "WoW Forever Launch Checklist for Friends and Guilds",
    excerpt:
      "Agree on region, ruleset, faction, schedules and fallback plans before launch. Includes a blank plan for friends and guild organizers.",
    category: "Community",
    coverImage: "/images/forever-hero.webp",
    content: `A shared launch starts with a few clear agreements, not a large roster spreadsheet. Write down where you intend to play, when you can meet, who confirms the final plan and what happens when someone arrives late. This checklist is for several days of coordination; the [group-post template](/guides/find-or-organize-wow-forever-group) is for a single session.

**Official information checked September 30, 2026.** Blizzard's [Forever announcement](https://news.blizzard.com/en-us/article/24302093/carve-a-new-path-with-world-of-warcraft-forever) gives November 4, 2026 as the launch date. Confirm the latest regional timing with Blizzard before committing to a calendar invitation. A community plan does not establish a local launch hour.

## Agree on region, character ruleset and faction

Start with region, faction, language, preferred activities and the hours people can reliably play. Ask which choices are essential and which are flexible. A group of friends may prefer staying together over a particular ruleset; another may care more about its usual playstyle. Make that tradeoff explicit instead of assuming everyone agrees.

Our community welcomes both factions and PvE, PvP and RP interests. Those interests are not the same as a character ruleset. Read [playing with friends](/guides/wow-forever-playing-with-friends) together before creating characters; it links Blizzard's grouping restrictions and distinguishes future Hardcore plans from launch choices.

## Name a decision maker and an update location

Choose who will check official ruleset information and announce the final decision. Mark the ruleset Unconfirmed until everyone agrees. Keep one readable plan with a last-reviewed date and a public contact handle. A Trader market identifier is not a realm choice for your characters.

Do not scatter conflicting versions through several channels. Pin or link the maintained plan, explain changes, and ask players to acknowledge decisions that affect them. There is no need to collect real names, account credentials or personal work schedules.

## Make room for ordinary life

Separate launch-night availability from a sustainable weekly schedule. Decide when the group stops, whether people can join later, and what happens if someone misses a day. A player with work or family commitments should not have to promise an unrealistic first week just to belong.

Agree on pace, breaks, spoilers and voice expectations. Identify roles people would like to try, but do not present speculative balance or an untested composition as settled advice. For a long-term roster, use the [guild-selection checklist](/guides/find-your-wow-forever-guild) to discuss attendance and expectations.

## Fill in the shared plan

This is a blank worksheet, not a scheduled community event. Complete it with consenting participants. Downloading it does not publish a listing, reserve a place or create a Discord event.

${templateMarkdown("launch-group-plan")}

## Rehearse the practical details

Before the first session, ask each player to check their own access and installation through official services. Confirm the intended contact point works on mobile as well as desktop. Put the calendar date and a named time zone beside the start time, then check its UTC equivalent for that date.

If the group agrees to a fixed local-evening schedule, say so. Do not silently convert it into a fixed UTC schedule when clocks change. Our [session guide](/guides/find-or-organize-wow-forever-group) includes the time-zone check.

## Have a fallback that does not split the group

Agree how long to wait for access or a delayed participant and who can decide to postpone. Do not promise a transfer or cross-region grouping to repair a mismatched plan. Confirm compatibility before investing time in characters, and recheck official information when a test build changes.

A reasonable fallback can simply be another date and a short conversation to keep everyone informed. Announce a cancellation in every place where the session was advertised. Today an ordinary Discord edit does not automatically change a website listing.

## Turn the plan into real activity

When details are confirmed, advertise one achievable session through [looking for group](/lfg/new), or maintain a complete [guild listing](/guild-recruitment/new) for a recurring roster. Both use the community's review process. A Discord-only welcome conversation belongs in Discord or an announcement, not a falsely labelled dungeon or raid.

After the first session, ask what worked and what needs changing. A factual recap with consenting participants is more useful than claiming a successful launch before it happens. You can use this plan with your own guild or friends; joining KFC is not required.`,
  },
];
