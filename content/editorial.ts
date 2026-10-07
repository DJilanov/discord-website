import type { EditorialGuide } from "./guides";
import { guideAdditions, preparationGuides } from "./growth";
import history from "./editorial-history.json";
import { toolGuides } from "./tool-guides";
import october7History from "./editorial-october7-history.json";
import { classDiscussionTable } from "./community-paths";

// Retain exact published revisions so later updates cannot overwrite admin edits.
export const september29Guides: EditorialGuide[] = history.september29Guides;
export const september30Guides: EditorialGuide[] = history.september30Guides;
export const preOctober7Guides: EditorialGuide[] = october7History;

const communityGuides: EditorialGuide[] = [
  {
    slug: "join-wow-forever-discord",
    title: "How to Join WoW Forever Discord and Find Your Group",
    excerpt:
      "Join the community, choose the spaces that fit you, and find a guild, a group, or a first conversation. No KFC membership or addon required.",
    category: "Getting started",
    coverImage: "/images/forever-stories.webp",
    content: `Start at the [WoW Forever Discord invitation page](/discord). It holds this community's current invitation, so you do not need to track down a replacement when an old invite expires. We are an independent fan community, welcoming Alliance and Horde players interested in PvE, PvP, and roleplay.

## Check the invitation before joining

Open the invitation and check the server name in Discord's preview. You should be joining WoW Forever Discord, not a similarly named server. Use the Discord account you intend to play with; joining on an old account can make it look as though your roles or conversations have disappeared.

The website's member and online counts are approximate figures from Discord, not a count of moderators currently available. A temporary failure to load those figures does not necessarily mean an invitation is expired. If the website confirms that no invitation is available, return to the same public page later.

## Find your region and interests

**Channel layout checked through the server bot on October 7, 2026.** In **Start Here**, read **rules**, follow Discord's current welcome questions, and use **introductions** for your first hello. **announcements**, **useful-links**, and **faq** hold updates and references. Channel names here omit decorative emoji prefixes. The historical screenshots below were supplied by the owner on September 29; some labels have since changed, so use the checked names in this text rather than copying the old images.

![The actual WoW Forever Discord welcome and information channels](/images/discord-welcome.png)

Choose the available roles and spaces that match your region, faction, and interests. EU and NA organizer assignments are established; a regional label is not a promise of around-the-clock coverage or a confirmed game realm.

On a phone, open Discord's channel list rather than staying in the first conversation you land in. If a space is missing, check your selected roles and the server's available channels, then ask staff for help. Exact channel labels belong to the server's current setup and can change; follow its welcome instructions rather than a copied channel name from another community.

You do not need to see every conversation. Start with the activities you actually want, and adjust your notification preferences when you know which groups matter to you.

## Make a useful introduction

Give people enough information to suggest a group: region, faction, preferred role, usual availability, and what you enjoy. Your real name, address, employer, and account details are unnecessary.

> Example introduction: EU Alliance player, usually free after work. I enjoy relaxed dungeon groups and can play a healer. Looking to meet people before committing to a raid roster.

This is an example, not a real member testimonial. Replace the details with your own preferences. You can belong to the community without joining the organizers' guild.

## Choose a guild or a single session

For a long-term home, browse the [guild directory](/guild-recruitment) and compare schedules, language, playstyle, and contact details. Our [guild-selection guide](/guides/find-your-wow-forever-guild) explains which questions are worth asking before a trial.

In Discord, both **Alliance** and **Horde** have **post-rules**, **lfg-pve**, **lfg-pvp**, **lf-guild**, **guild-recruitment**, and **scheduled-runs**. The group and recruitment spaces are forums: open a relevant post or create one with the requested details and tags, rather than dropping an unrelated message into another group's conversation. Read **post-rules** first. Use **lf-guild** when seeking a guild, **guild-recruitment** when advertising one, and **scheduled-runs** for planned sessions. **group-leveling** is a separate community forum.

![Alliance and Horde group and recruitment channels in the actual server](/images/discord-faction-groups.png)

For one evening, you can also use the website's [looking for group](/lfg). Read the region, faction, time zone, activity, and organizer's expectations before making contact. The [group guide](/guides/find-or-organize-wow-forever-group) covers what a complete post should contain. A listing is a way to start a conversation, not an automatic signup or guaranteed place.

For addon questions, read **tool-rules** under **Addons & Tools**. Use **addon-discussion** for conversation, **tool-directory** for tool posts and **tool-support** for a specific support request. Trading has **trade-rules** and the **alliance-trade**, **horde-trade**, and **auction-house** forums. Auction tips depend on contributor scans; silence is preferable to a recommendation based on stale data. Public forums are not private places to share evidence or account details.

## Find your class discussion and compare a build

The **Classes** category contains all nine channels below. You do not need a separate class-server invitation. Ask a specific question in your class channel and use the linked public Helper calculator to compare your idea. These tools are maintained separately from Blizzard; a recorded talent is not proof of current beta balance or a recommended best build.

${classDiscussionTable}

Include the game version, client build if known, level, intended role and activity. Distinguish what you personally tested from a theory or a tooltip you read. A dungeon-tanking question, a leveling question and a PvP question can have different answers even for the same class. Check the calculator's source/build labels before sharing its result; never silently substitute TBC talents for Forever evidence.

For a first evening, introduce yourself, open one class conversation, and browse one actual group post. If nothing fits your hours, post a concrete request with a date, region, faction, ruleset and desired role. There is no need to join every channel or wait for a complete raid roster before meeting people.

## If something does not work

- An old invitation fails: return to the [current invitation page](/discord) instead of repeatedly trying a copied link.
- The wrong account is signed in: check the account in Discord before accepting again.
- A channel is missing: review the welcome flow and available roles, then contact staff without posting private account information.
- No group fits your hours: introduce yourself or submit a clear group post; an empty search does not mean you need to change guilds.

Never enter a Battle.net password into a community message or download a file sent as an account-verification requirement. Use the services' own verified settings for any account linking.

## Know where to get help

Read the [community rules](/rules). Members can report scams or griefing in **report-here** and discuss appeals in **appeal-here**, but other members can read those forum posts. Do not post private messages, personal details, or sensitive evidence there. Use the website's [private reporting process](/reports) or [appeal form](/appeals) for a private website case. A Discord forum post is not an automatic website submission or a verified finding.

No addon is required to join, and community staff cannot restore items or manage your Blizzard account. For official game announcements and account support, use [Blizzard's website](https://worldofwarcraft.blizzard.com/).

Ready to meet people? [Open the current WoW Forever Discord invitation](/discord).`,
  },
  {
    slug: "find-your-wow-forever-guild",
    title: "How to Find a WoW Forever Guild That Fits Your Schedule",
    excerpt:
      "Compare schedules, attendance, atmosphere, and loot expectations before you commit. Includes a practical checklist and first-contact example.",
    category: "Guilds",
    coverImage: "/images/forever-hero.webp",
    content: `Start with the evenings you can actually play, then compare guild expectations. The best fit is not necessarily the biggest roster or the most ambitious recruitment post. It is a group whose ordinary week works with yours. This advice draws on our organizers' previous WoW community experience, not a claim about progression in unreleased Forever content.

## Write down your real availability

List your region, faction, language, available days, time zone, and latest finishing time. Separate a reliable commitment from an occasional extra evening. Ask whether the advertised start means invitations, first pull, or time to begin forming the group.

Use a named local time zone or a date with an explicit UTC offset when arranging a trial. Daylight-saving changes do not happen on the same dates everywhere. A fixed UTC schedule and a fixed local-evening schedule are different promises.

## Compare what membership means

Social membership, an occasional public run, a raid trial, and a recurring roster place are different commitments. Ask which one the guild is offering and how absences are handled. Family, work, and changing availability are easier to manage when expectations are explicit.

| Question | What a useful answer explains |
| --- | --- |
| When does a normal night finish? | A realistic end time and what happens if the run is unfinished |
| How is attendance handled? | Notice, substitutions, and expectations during a trial |
| What preparation is required? | Consumables, assignments, and where information is posted |
| How are mistakes discussed? | Whether feedback is practical, respectful, and consistent |
| Can I join socially first? | Whether there is room to meet people before committing |

A calm atmosphere and efficient organization can coexist. Ask for a description of a normal evening rather than relying on labels such as casual or hardcore.

## Read the loot policy before a trial

Request the written rules. Ask about reservations, main/off-spec priority, contested items, tied rolls, and trial members. A rule that changes after a drop is not a shared expectation.

Our [pre-run checklist](/guides/clear-loot-rules-better-groups) provides a useful way to ask these questions without starting an argument. A published directory listing means the recruitment post passed posting standards; it is not a guarantee about every member or future decision.

## Compare the details in a listing

Browse the [WoW Forever guild directory](/guild-recruitment). Check region, character ruleset, faction, language, playstyle, raid days, time zone, current recruiting needs, and the named contact. A ruleset marked Unconfirmed still needs a decision from the recruiter. See our [playing with friends checklist](/guides/wow-forever-playing-with-friends) before creating a character.

Use this short worksheet when comparing two guilds:

- My reliable days and latest finish.
- Their advertised schedule and time zone.
- My desired membership: social, trial, or recurring roster.
- Preparation and attendance expectations.
- Written loot policy and dispute contact.
- What is still unanswered after the first conversation.

The purpose is to find a fit, not award a public score to another community.

## Send a specific first message

> Example: Hi, I am looking for a relaxed progression group and can reliably play Tuesday and Thursday evenings. I need to finish by 23:00 in my local time zone. Are those hours compatible with your schedule, and could you share your attendance and loot rules?

Add your region, faction, class/role, and exact time zone. Do not claim experience you do not have. Ask whether a voice conversation or suitable public session is possible before committing to a recurring roster.

## Reassess after you meet the group

Notice whether the advertised schedule, tone, and preparation match the actual conversation or session. It is acceptable to decide that a guild is not for you. A scheduling mismatch or different progression goal is not misconduct.

If a listing has a specific factual error, contact staff in the [Discord community](/discord) with its URL and the discrepancy. Keep recruitment disagreements out of public accusation threads, and use the website's private report form for sensitive misconduct evidence.

Looking for a single evening instead? Use [looking for group](/lfg). Recruiting for your own guild? Read [how to write a useful listing](/guides/write-wow-forever-guild-recruitment-post). You can also [join the community Discord](/discord) without changing guilds.`,
  },
  {
    slug: "clear-loot-rules-better-groups",
    title: "WoW Forever Group Loot Rules: A Pre-Run Checklist",
    excerpt:
      "Set clear expectations before a run: reservations, priorities, replacements, and what to do when a loot decision is unclear.",
    category: "Safety",
    coverImage: "/images/forever-adventure.webp",
    content: `Agree on the rules before people invest an evening, not after a contested item drops. A short, specific agreement usually helps more than a long list of assumed conventions. This is an organizer's communication checklist, not confirmation that a particular loot system is available in every version of WoW Forever.

## Put the agreement where everyone can read it

State the intended loot approach in the group post and repeat it before starting. Name reservations and exceptions explicitly. Explain the priority order, who distributes loot, and who reviews a disagreement involving that person.

The phrase "standard rules" is not enough when players arrive from different guilds or game versions. Link one stable written policy and announce any change before people agree to participate.

## Resolve the predictable edge cases

- Main role versus an off-spec or alternate role.
- Tied rolls and any restrictions on repeated wins.
- A late arrival, replacement, or early departure.
- A player disconnecting at the relevant moment.
- A reserved item and whether the reservation has conditions.
- A mistaken distribution and the limits of any correction.

Check the actual game rules before promising that an item can be traded or recovered. Community agreement cannot override the game's item restrictions.

## Replace an ambiguous rule with a useful one

> Ambiguous example: Main spec first, usual rules, one item reserved.

That leaves the reserved item unnamed and does not explain roles, ties, or exceptions. A better recruitment message names the reservation, identifies how a player's main role is agreed, describes how ties are resolved, and links the complete policy. If those decisions have not been made, resolve them before asking players to commit.

This is a communication example, not a ready-made policy or an endorsement of a particular loot system. Each host is responsible for choosing rules that are supported by the game and understood by the group.

## The pre-run check

1. The same written rules are visible to everyone.
2. Reservations and priorities are explicit.
3. Players have had a chance to ask questions.
4. The host, distributor, and second reviewer are identified.
5. Start time, expected finish, and replacement expectations are clear.
6. Any changes were announced before participation, not after a drop.

The [group-post guide](/guides/find-or-organize-wow-forever-group) explains where these details fit into recruitment.

## If a decision seems wrong

Ask for a calm explanation against the written agreement. A misclick, misunderstanding, or missed message may have a straightforward explanation. Do not threaten a player or ask others to pile on.

If review is still needed, preserve the original rules, relevant roll/allocation, surrounding conversation, date, region, ruleset, and complete character identity. For Forever, use the full two-part character name rather than only a first name. Avoid unrelated private messages or personal data, and do not present a cropped accusation as the whole sequence. The current safety tools still use a legacy realm field: ask staff to confirm the supported intake before filing a Forever-specific case; do not invent a realm or match someone by first name alone.

Submit relevant information through the [private report process](/reports). A report is not automatically published. Read the [evidence and safety policy](/safety) for how review works.

## Understand what moderation can do

Community staff cannot restore items, reverse trades, suspend game accounts, or verify every interaction. Use Blizzard's own reporting tools for issues requiring platform action. Our public alerts require separate review and have an [appeal route](/appeals); pending appeals suspend the alert during review.

No addon or directory badge can guarantee a trouble-free group. Clear expectations, specific evidence, and proportionate review are the practical tools available to organizers and players.`,
  },
  {
    slug: "pve-pvp-rp-find-your-community",
    title: "WoW Forever PvE, PvP and RP: Find Your Community",
    excerpt:
      "Choose the groups and conversations that suit your time, interests, and expectations, across PvE, PvP, and roleplay.",
    category: "Community",
    coverImage: "/images/forever-mulgore.webp",
    content: `Start with the kind of evening you enjoy, not a label you feel obliged to fit. You can enjoy dungeon groups, competitive sessions, and character stories without making one of them your whole identity. Our community welcomes Alliance and Horde players across PvE, PvP, and RP. These social categories do not confirm Blizzard's realm availability or game rules.

## PvE: choose the pace and commitment

For [PvE groups](/servers/pve), start with your faction's **post-rules** and **lfg-pve** channel. Ask whether a session is for learning, a familiar route, preparation, or recurring progression. Say when you are new to the content and what role you want to play. A group can then decide whether its pace fits yours.

Useful details include the activity, expected duration, voice expectations, and whether preparation is required. A calm atmosphere works best when those expectations are clear, not when nobody knows the plan.

For recurring raids, the [guild-selection checklist](/guides/find-your-wow-forever-guild) helps you compare attendance and schedules. For one evening, browse [group posts](/lfg).

## PvP: agree on the purpose of the session

The [PvP community](/servers/pvp) is a route to teammates and discussion. Discord has **pvp-chat** for general discussion and **lfg-pvp** under each faction for finding a session. A relaxed session and a coordinated team push can both be enjoyable, but they should not be advertised as the same experience.

Ask about activity, session length, communication, and expected experience. Keep feedback about the game rather than the person. Losing a match or disliking an opponent is not evidence of misconduct, and competition is not a reason to share private information or harass someone.

## Roleplay: understand the premise and boundaries

The [RP community](/servers/rp) helps players find shared stories and social events. Before attending, ask for the premise, location, time, newcomer guidance, and participation boundaries. A short out-of-character explanation can prevent confusion without spoiling the story.

Separate in-character disagreement from out-of-character consent. Ask before involving another player in a storyline with lasting consequences, and respect the host's rules. You do not need to improvise an elaborate character history before asking whether an event is suitable for a beginner.

## Use region and faction to find practical matches

Start with the [EU](/discord/eu) or [NA](/discord/na) page and choose spaces appropriate to your available hours. Record the time zone when discussing a session. A fixed local evening can shift relative to UTC during daylight-saving changes.

Faction spaces help people coordinate, but the public community applies the same posting and conduct standards across Alliance and Horde. A social welcome is not a statement about which factions can join a particular in-game activity; confirm the relevant game rules with the host and official sources.

## Turn an interest into a clear request

Here are the details a useful request might cover. These are examples of structure, not advertised events:

| Interest | Include in your request |
| --- | --- |
| Learning a dungeon | Region, faction, role, available time, and that you are learning |
| Coordinated PvP | Activity, experience expectations, communication, and session length |
| A first RP event | Character premise if relevant, newcomer status, available time, and boundaries |

Avoid posting the same request into every channel. Choose the relevant space and give people time to respond. Our [group guide](/guides/find-or-organize-wow-forever-group) covers the next step when you are ready to arrange a session.

## Keep plans separate from game announcements

Community hosts can announce their intentions; they cannot confirm a Blizzard realm, release feature, or game restriction. Check [Blizzard's official site](https://worldofwarcraft.blizzard.com/) for that information.

To get started, [join the Discord](/discord) and follow the [onboarding guide](/guides/join-wow-forever-discord). Pick one conversation or activity that interests you. You can explore the others later.`,
  },
  {
    slug: "find-or-organize-wow-forever-group",
    title: "How to Find or Organize a WoW Forever Group",
    excerpt:
      "Find a session that fits your evening or write a clear group post with the time, roles, expectations, and contact players need.",
    category: "Community",
    coverImage: "/images/forever-world.webp",
    content: `For a single session, use [WoW Forever looking for group](/lfg). For a recurring roster and long-term home, use the [guild directory](/guild-recruitment). A complete group post helps people decide whether your evening fits theirs before either side spends time arranging it.

## Read the practical details first

Check the region, character ruleset, faction, activity, start time, and host's contact. Public group times use **Central Europe for EU**, **New York for NA**, and **UTC for OCE**. Read the displayed UTC offset for the actual date; EU and North American daylight-saving changes can differ. The [friends checklist](/guides/wow-forever-playing-with-friends) explains the distinction between a character ruleset and an activity.

Read the description before messaging. Ordinary group listings do not reserve a place; contact the organizer to confirm availability. The separately labelled **Scheduled events** on the same page link to our event manager, with character/spec signup and the host's roster and loot rules. Those controls require Discord sign-in and membership of this community server; browsing a listing is not a signup.

## Write a post people can answer

Use a title that identifies the activity and purpose. "Learning group, two roles needed" is more useful than a general invitation to join something exciting. In the description, explain the goal, expected length, roles needed, preparation, voice expectations, and relevant loot rules.

| Form field | What belongs there |
| --- | --- |
| Region, character ruleset, faction | Confirm all three with the organizer; a PvP activity is not a character-ruleset choice |
| Activity | The game activity that matches the session |
| Start time | The actual date and time, checked against the form's time-zone label |
| Description | Goal, duration, roles, preparation, communication, and rules |
| Discord contact | A current handle the host agrees to publish |

There is no separate duration field, so put your intended finishing time or session length in the description. Do not advertise unavailable content as a confirmed run.

![The group form's actual fields, shown empty without a submitted event](/images/group-post-form-rulesets.png)

The form above was captured from this website on September 29, 2026. It is an empty form, not a live group or a completed signup.

## A useful description structure

> Example structure: We are forming a learning group and will explain the route before starting. State the region, faction, exact date/time, roles still needed, expected finish, voice requirements, and agreed loot policy. Ask interested players to contact the named organizer to confirm a place.

This is a writing example, not a live group. Fill it with your actual plan before submitting. The [loot checklist](/guides/clear-loot-rules-better-groups) helps you avoid ambiguous rules.

## Submit a listing or create a signup event

[Submit a group](/lfg/new) with a future date and a complete description. With your explicit public-sharing consent, the listing appears immediately on the website and is queued for the matching faction/activity Discord forum. Moderators review afterward and may hide posts that break the rules. Discord delivery is asynchronous: an available website listing does not prove that its Discord post has already arrived. Follow the confirmation's Discord link and allow the worker to deliver it; contact staff if delivery remains missing instead of submitting duplicates.

The form supports dungeon, raid, PvP premade, battleground, world PvP, RP, questing, social and other activities. A character's PvP ruleset does not turn a dungeon session into a PvP activity. Choose both fields for what they actually describe. Do not advertise unavailable content as a confirmed run.

For character/spec signups, roster selection and supported loot reservations, use [the event manager](/raids). Sign in with Discord, join the community first if needed, and read the selected game version and host rules. Event publication and website approval are separate from the immediate-publication listing form. Only staff can override the normal posting channel. A website approval is not a guarantee of a raid place or the host's conduct.

For an ordinary group listing that needs correction or cancellation, contact staff in the [Discord community](/discord) with its title, date and exact change. For a managed event you created, use its event controls; changes are recorded in its history. An unrelated ordinary Discord message is not a synchronized website listing.

## Read a real planning post carefully

The October 7 directory contains an EU Alliance PvP-ruleset questing plan titled **5ftofNovemberpowerleveling**, scheduled for November 5 at 08:30 Central Europe (UTC+1). That is a future plan, not a completed session or a promise of open places. Check the [current directory](/lfg) before responding because listings and availability change. Notice that its activity is Questing even though its character ruleset is PvP. Read the described starting location, level checkpoints and organizer contact before asking to join. A useful post lets you answer when, where and which character without inferring those details from the title.

## Confirm the plan before the session

- Confirm each participant's role and the host's current contact.
- Repeat the start time with a time zone and the intended finish.
- Make preparation and voice expectations available beforehand.
- Share the same written loot agreement with everyone.
- Tell the group promptly when a role opens or the plan changes.

Started or expired posts should not be relied on as upcoming availability. Ask the organizer rather than assuming an old listing still needs players.

## Find people you want to play with again

After a good session, ask whether people would enjoy another. A recurring group can form gradually without immediately becoming a guild. If your goal becomes a fixed raid roster, revisit the [guild-selection guide](/guides/find-your-wow-forever-guild).

[Browse upcoming groups](/lfg), [post your own](/lfg/new), or [join the community Discord](/discord) to start the conversation.`,
  },
  {
    slug: "write-wow-forever-guild-recruitment-post",
    title: "WoW Forever Guild Recruitment: Write a Useful Listing",
    excerpt:
      "Write a clear WoW Forever guild listing with schedules, recruitment needs, expectations, and a contact route that helps the right players respond.",
    category: "Guilds",
    coverImage: "/images/forever-adventure.webp",
    content: `A useful recruitment post helps suitable players recognize a fit and lets everyone else move on without wasting a conversation. Start with what your guild's ordinary week looks like, then explain who you are recruiting and how to contact you. Submit through the [guild directory](/guild-recruitment/new); you do not need to belong to KFC.

## Describe who the guild is for

Explain your atmosphere and expectations in concrete terms. "Relaxed voice chat, prepared pulls, and a firm finish time" tells a reader more than a stack of labels. Distinguish social membership, occasional participation, trials, and committed roster places.

Use achievements and size figures only when they are accurate and relevant. Characters, accounts, Discord members, and active raiders are different measures. If experience belongs to another game version or an earlier guild community, say so.

## Make schedules unambiguous

Include region, character ruleset, faction, language, raid days, start time, expected finish, and time zone. Label an undecided ruleset Unconfirmed and a future Hardcore roster as planned. Explain whether the time means invites or first pull. For international recruitment, describe whether the schedule stays fixed to local time or UTC when daylight saving changes.

The directory has separate fields for language, raid days, and raid time. Use them rather than burying all practical details inside a long description.

## Be specific about recruitment needs

Keep class and role needs current. State whether you accept social members even when a raid role is closed, and explain any experience or preparation expectations before a player applies.

The directory's class choices are recruitment labels, not a claim about game balance or guaranteed content access. Confirm current game-specific details against official information when writing your post.

## Explain how a trial works

Cover attendance, consumables or preparation, voice expectations, loot rules, and who makes roster decisions. Link a clear written policy where possible. If the plan is still developing, say what is decided and what will be discussed with applicants.

Our [player's guild checklist](/guides/find-your-wow-forever-guild) shows the questions a well-matched applicant is likely to ask. Answering them in advance makes the first conversation more useful.

## Replace vague promises with useful details

> Vague example: Friendly guild, all welcome, serious progression, message us.

A stronger version explains the actual evenings and time zone, the desired role, what preparation means, whether social membership is open, how loot is handled, and which recruiter to contact. You can keep a friendly tone without promising every playstyle the same experience.

This is an editorial example, not a real listing or testimonial. Avoid unsupported superlatives or claims about other guilds.

## Submit a complete listing

Before using the [submission form](/guild-recruitment/new), check:

- Guild name, region, character ruleset, faction, and language are accurate.
- The schedule includes a time zone and a realistic finish.
- Current recruiting classes and the intended role are clear.
- Loot, attendance, and trial expectations are explained.
- The public recruiter handle and optional invitation work.
- The description is specific and does not expose private information.

With your explicit sharing consent, listings publish immediately on the website and are queued for the matching Discord recruitment forum. Moderators review them afterward and may hide rule-breaking posts. Publication is not proof that the post has already been reviewed, an endorsement, or a guarantee that applicants will arrive. Discord delivery can lag behind website publication; use the confirmation link and contact staff if delivery fails rather than submitting duplicates.

## Keep it current

When needs, contacts, or schedules change, contact staff in the [Discord community](/discord) and include the listing URL plus the exact update. The current site does not give every recruiter a self-service editing account, and changing a Discord post does not update the directory automatically.

For a single session rather than a guild roster, use [group posts](/lfg). For questions and introductions, [join the community Discord](/discord). Recruitment works best as the start of a useful conversation, not a repeated unsolicited message.`,
  },
];

export const editorialGuides: EditorialGuide[] = [
  ...communityGuides.map((guide): EditorialGuide => ({
    ...guide,
    content: guideAdditions[guide.slug]
      ? `${guide.content}\n\n${guideAdditions[guide.slug]}`
      : guide.content,
  })),
  ...preparationGuides,
  ...toolGuides,
];

export const startingGuideSlugs = [
  "join-wow-forever-discord",
  "find-your-wow-forever-guild",
];

export const guideReadingPaths: Record<string, string[]> = {
  "join-wow-forever-discord": [
    "find-your-wow-forever-guild",
    "find-or-organize-wow-forever-group",
  ],
  "find-your-wow-forever-guild": [
    "clear-loot-rules-better-groups",
    "write-wow-forever-guild-recruitment-post",
  ],
  "clear-loot-rules-better-groups": [
    "find-or-organize-wow-forever-group",
    "find-your-wow-forever-guild",
  ],
  "pve-pvp-rp-find-your-community": [
    "find-or-organize-wow-forever-group",
    "join-wow-forever-discord",
  ],
  "find-or-organize-wow-forever-group": [
    "clear-loot-rules-better-groups",
    "wow-forever-beta-starter-checklist",
    "wow-forever-launch-group-checklist",
  ],
  "write-wow-forever-guild-recruitment-post": [
    "find-your-wow-forever-guild",
    "clear-loot-rules-better-groups",
  ],
  "wow-forever-beta-starter-checklist": [
    "wow-forever-playing-with-friends",
    "find-or-organize-wow-forever-group",
    "wow-forever-launch-group-checklist",
  ],
  "wow-forever-launch-group-checklist": [
    "wow-forever-playing-with-friends",
    "write-wow-forever-guild-recruitment-post",
    "find-or-organize-wow-forever-group",
  ],
  "wow-forever-playing-with-friends": [
    "wow-forever-beta-starter-checklist",
    "wow-forever-launch-group-checklist",
    "find-or-organize-wow-forever-group",
  ],
  "wow-trader-read-market-prices": [
    "wow-forever-beta-starter-checklist",
    "wow-forever-playing-with-friends",
  ],
};
