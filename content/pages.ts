export interface ContentPage {
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
  body: string;
  cta?: { label: string; href: string };
}

export const pages: Record<string, ContentPage> = {
  about: {
    title: "Built by players. For the long run.",
    eyebrow: "ABOUT WOW FOREVER DISCORD",
    image: "/images/forever-hero.webp",
    description:
      "We know a good community is what keeps you logging in. We're bringing that experience to WoW Forever.",
    body: `## The people behind the hub

WoW Forever Discord is organized by the team behind [KFC Guild](https://kfcguild.online/about). Our experience comes from organizing raids and helping run two substantial guild communities. Organizer track-record figures describe those prior communities, not membership of this new Discord. Characters, guild rosters, and individual people are different measures.

We have spent plenty of evenings filling the last raid spot, explaining loot rules, welcoming returning players, and helping groups recover from a rough pull. That practical work shapes this hub: make it easy to find good company, set clear expectations, and treat people fairly when something goes wrong.

## A community beyond one guild

You do not need to join KFC to be here. The directory welcomes other guilds, including communities that recruit the same classes or choose the same character rulesets. Listings are reviewed against the same standards. Faction, guild size, donations, or friendship with an organizer must not buy a moderation decision.

The hub covers Alliance and Horde, PvE, PvP, and roleplay, with regional spaces for EU and NA players. Realm choices and activity schedules belong to individual guilds and hosts. We do not present community plans as Blizzard announcements.

## What we are building

The public website connects a Discord invitation, a searchable guild directory, group posts, practical guides, and private moderation. ForeverGuard adds local player notes and reviewed context, with an appeal route for any public alert.

The goal is simple: help more people find a community they enjoy spending time with. A successful visit might lead to a new guild, a single dungeon, a helpful answer, or a regular group of friends.

## Accountability

Read our [rules](/rules), [evidence standards](/safety), and [transparency page](/transparency). Reports involving staff or their own guild should be handled by independent reviewers. Appeals are part of the process, and public alerts expire unless reviewed again.

For corrections to guides or directory listings, contact staff in the [Discord community](/discord) and include the page URL. Use the website's private report form for sensitive misconduct evidence. For game account issues, contact Blizzard through its official support channels.

## Independent fan project

WoW Forever Discord is not affiliated with, sponsored by, or endorsed by Blizzard Entertainment. World of Warcraft and related imagery belong to their respective owners.`,
    cta: { label: "Meet the community", href: "/discord" },
  },
  rules: {
    title: "Good company. Clear rules.",
    eyebrow: "COMMUNITY STANDARDS",
    description:
      "The same standards for every player, every faction, and every guild. Read these before posting or joining an event.",
    body: `## 1. Treat people like people

No harassment, threats, hateful conduct, doxxing, or targeted pile-ons. Disagreement is allowed. Personal abuse is not. Keep public spaces appropriate for a mixed audience and respect other players' boundaries.

## 2. Keep recruitment useful

Post in the relevant faction and region. Include your schedule, playstyle, contact, and written loot rules. Do not impersonate another guild or inflate achievements. Repeated unsolicited direct messages and recruitment spam are not welcome.

Guild and group listings publish immediately on the website and are queued for the matching Discord forum, with the submitter's explicit public-sharing consent. Moderators review them afterward and can hide misleading, inactive, or abusive listings. Publication is not an endorsement, a verified misconduct finding, or a guarantee of a guild's conduct. Guilds can request corrections from staff in Discord with the listing URL. Scheduled events use a separate website-approval process.

## 3. Set expectations before the run

Group hosts should state the start time with a time zone, participation requirements, and loot rules before inviting players. Do not change loot rules after the relevant item drops. Be realistic about the length of an event and tell the group when plans change.

## 4. Protect evidence and personal information

Use the website's [private report form](/reports/new) for sensitive evidence. Discord's **report-here** and **appeal-here** forums are readable by other members. Follow **blacklist-rules**, keep public posts factual, and do not publish private conversations or personal information there. A forum post is not a verified finding or an automatic website case. Do not encourage mass reporting or contact a player's friends or guild to pressure them. Knowingly fabricated evidence can result in community moderation.

Community reports do not replace Blizzard's in-game reporting tools. Suspected cheating and account violations should also be reported through the platform that can investigate them.

## 5. Respect roleplay boundaries

Keep in-character conflict separate from out-of-character consent. Respect event rules, do not deliberately disrupt roleplay, and ask before involving someone in a storyline with lasting consequences.

## 6. Keep promotion relevant

No account sales, real-money services, malicious downloads, referral spam, or deceptive promotions. Addon authors should explain what their tool does, who maintains it, and how to uninstall it. Never ask for account passwords or session tokens.

## 7. Moderation must be accountable

Staff document decisions, avoid conflicts of interest, and use proportionate action. Website player alerts require two distinct reviewers, a neutral summary, and an expiry date. Website case submissions remain private; unreviewed Discord forum posts are separate from the website's safety feed.

You may [appeal a decision](/appeals). Retaliation for a good-faith report or appeal is not acceptable. An appeal does not automatically establish that the original report was false.

## 8. Ask when something is unclear

Ask staff in Discord about general questions. Use the website's private reporting process for sensitive incidents. Include the relevant page, message, or event and explain the issue. Our [safety policy](/safety) describes how website evidence and public alerts are handled.`,
  },
  safety: {
    title: "Fair reviews. Safer adventures.",
    eyebrow: "COMMUNITY SAFETY",
    description:
      "Reports need context. Decisions need evidence. Every player deserves a chance to be heard.",
    body: `## A report is not a verdict

Reports submitted through this website, reporter identities, screenshots, and moderator notes are private. Discord's **report-here** and **appeal-here** forums are readable by other members. Do not share sensitive evidence there; use the website forms instead. A Discord post does not automatically create a website case, suspend a website alert, or establish a verified finding. A name does not appear in the website's public safety feed simply because someone filed a complaint. We cannot restore loot, reverse trades, ban game accounts, or determine what happened without reliable context.

## What makes a useful report

Include the character, realm, region, date, and a factual description. For loot disputes, include the agreed rules before the run and the allocation or roll that is disputed. For harassment, include enough surrounding conversation to explain the context. Do not include unrelated personal information.

We distinguish a documented rule violation from a disagreement, a mistake, or an unproven suspicion. Losing a PvP match, leaving a guild, or declining a group invitation is not by itself grounds for an alert. Suspected botting should be reported to Blizzard rather than publicly labeled here.

## Two reviewers before publication

A moderator checks evidence and records a decision. A second, distinct moderator must approve a public alert. The public summary must be neutral, limited to the incident, and free of private evidence. Reviewers should recuse themselves from cases involving their own guild or close friends.

Every public alert names the character, realm, and region, states the category and severity, and includes a review date and expiry. Alerts normally expire within 7 to 180 days. Expired alerts disappear from the public feed and addon export without needing a scheduled cleanup to run first.

## Appeals suspend public distribution

Anyone affected can [submit an appeal](/appeals) with the public alert ID and supporting context. While an appeal is pending, the alert is suspended from public lists and exports. An independent reviewer can uphold, reduce, correct, or remove it. Local copies in an already-installed addon need to be refreshed; they cannot be remotely changed while the game is running.

## No collective guilt

Guild membership is context, not proof. A report about one player does not put their entire guild on a warning list. Character names can be duplicated across realms and regions; always check identity before drawing conclusions.

## Privacy and retention

Evidence is available only to authorized moderation staff. Uploaded images are re-encoded to remove metadata. Evidence is scheduled for deletion 180 days after submission, with a new review period when an appeal is filed. Aggregate outcomes can appear in our [transparency report](/transparency), without reporter details.

Read the [privacy notice](/privacy) for data handling and contact options.`,
    cta: { label: "Submit a private report", href: "/reports/new" },
  },
  privacy: {
    title: "Your privacy in the community",
    eyebrow: "PRIVACY NOTICE",
    description:
      "What the website collects, why it is used, and who can access it.",
    body: `## Who operates this website

WoW Forever Discord is an independent fan community organized by the KFC community team. Privacy questions and correction requests can be sent to staff through the [Discord community](/discord) or the private [report form](/reports/new). The contact address is shown below when configured.

## Public directory information

Guild and group submissions contain the details you choose to publish, including character or guild names, character ruleset, region, schedules, descriptions, and recruitment contacts. With your explicit consent, new submissions publish immediately on the website and are queued for the matching public Discord faction forum. Moderators review afterward and can hide posts that break the rules; publication does not mean the listing has already been checked. Discord delivery may be delayed or fail independently of website publication. Long submissions include a public full-text attachment in Discord. Existing submissions are not copied without sharing consent. Public website entries may be indexed by search engines. Scheduled events have a separate approval process. Do not submit a real name, private phone number, or contact belonging to someone who has not agreed. Discord and search engines may retain copies after website removal.

## Private reports and evidence

The website's report forms collect a Discord contact, character details, incident information, and screenshots so staff can review a case. Website evidence and reporter identities are accessible only to authorized moderation staff. Editors of public guides cannot access them. Public website alerts contain only the reviewed summary and relevant in-game identity.

Discord's **report-here** and **appeal-here** forums are readable by other members. They are not private evidence storage and are not automatically connected to website cases. Do not post sensitive evidence or personal information there. Discord controls its own platform data handling; use the website forms for a private website submission.

Evidence is scheduled for removal after 180 days, subject to an active appeal extending the review period. Staff actions are recorded in an internal audit log. Ask staff about access, correction, or removal of your data; moderation context and platform requirements may affect what can be removed immediately.

## Website measurement

We record page paths, traffic source, campaign labels, device category, and Discord invitation clicks. Referrer URLs are reduced to host names. Query strings and private case tokens are not stored as page paths. IP addresses are transformed into keyed hashes before storage; raw IP addresses are not stored by this application's analytics.

A random session identifier is held in browser session storage to connect pages during a visit. It is not an advertising identifier. The application respects Do Not Track and Global Privacy Control signals. Analytics records are scheduled for deletion after 90 days. Invitation clicks indicate intent; they are not proof that someone joined Discord.

The web server keeps access logs for security and troubleshooting; these can include raw IP addresses. Logs rotate daily with seven rotated files retained. Private local backups keep the latest seven copies, so deleted data may persist temporarily in a restricted recovery copy. Backups are not used for analytics or public distribution.

## Security and third parties

Staff authentication uses a secure session cookie. Public submissions use a short-lived, self-hosted browser challenge and rate limits to reduce automated abuse. No third-party CAPTCHA service is loaded. Discord receives traffic when you follow an invitation. Private files may be held in the operator's configured object storage. We do not sell personal information.

## Your choices

You can read public resources without submitting a report, listing, or installing an addon. Use a Discord handle instead of a real name. Do not upload unrelated personal information. Contact staff to correct a listing or appeal an alert. Public search engines may keep an older cached copy after a page changes.`,
  },
  "servers/pve": {
    title: "WoW Forever PvE community",
    eyebrow: "DUNGEONS. RAIDS. GOOD COMPANY.",
    image: "/images/forever-adventure.webp",
    description:
      "Find a reliable tank, a regular raid night, or a few friendly players for the next stretch of the journey.",
    body: `## A group for your pace

PvE means different things to different players. Some want a scheduled progression roster. Others want a dungeon after work, a patient group for unfamiliar content, or people to quest with. Our [guild directory](/guild-recruitment) separates schedule, playstyle, faction, and recruiting needs so you can compare what matters.

## Before the first pull

For a one-off run, use [looking for group](/lfg?activity=Dungeon). Give the region, character ruleset, faction, start time, needed roles, and loot rules. Say whether the run is for learning or expects prior experience. Agree on a finishing time and tell people if plans change.

## Alliance and Horde

Both factions belong here. Use your faction and regional roles in Discord to keep recruitment relevant. The community's PvE category is an organizational space, not confirmation of any particular character ruleset.

## What to expect from a guild

Ask about attendance, consumables, substitutes, loot distribution, and how leaders handle mistakes. A relaxed guild can still be organized. The right fit should leave room for the rest of your life.

Read [Find a guild that fits your life](/guides/find-your-wow-forever-guild) and [Clear loot rules. Better groups.](/guides/clear-loot-rules-better-groups) before committing to a regular roster.`,
    cta: { label: "Find a PvE guild", href: "/guild-recruitment" },
  },
  "servers/pvp": {
    title: "WoW Forever PvP Discord community",
    eyebrow: "QUEUE TOGETHER. PLAY TOGETHER.",
    image: "/images/pvp.webp",
    description:
      "Find teammates, organize premades, and enjoy the competition with people who are on the same page.",
    body: `## Build a team with a shared goal

The PvP space welcomes casual sessions and coordinated groups. A useful post states the activity, region, faction, start time, expected session length, and voice requirements. Explain whether you are learning, practicing a strategy, or looking for experienced teammates.

## Find a recurring group

Browse [PvP guild recruitment](/guild-recruitment?playstyle=PvP) for a regular team or [premade posts](/lfg?activity=PvP%20premade) for a single session. Include your class, role, and availability when contacting a leader. Confirm the character ruleset separately from your preferred activity; use the [friends checklist](/guides/wow-forever-playing-with-friends).

## Keep competition in the game

Discuss tactics, not personal attacks. Do not publish private information or organize harassment against opponents. Losing, leaving a team, or disagreeing over strategy is not itself a reportable safety incident. Documented threats or harassment should go through the private [report process](/reports).

## Both sides of the battlefield

Alliance and Horde receive the same moderation standards. Faction channels keep group coordination relevant; they do not make the public community a place for cross-faction abuse. Respect event organizers and their participation rules.`,
    cta: { label: "Find a PvP group", href: "/lfg?activity=PvP%20premade" },
  },
  "servers/rp": {
    title: "WoW Forever RP community",
    eyebrow: "A WORLD WITH STORIES TO TELL",
    image: "/images/forever-stories.webp",
    description:
      "Find a roleplay guild, meet new characters, and help make Azeroth a world worth inhabiting.",
    body: `## Find the kind of story you enjoy

Roleplay communities range from casual tavern evenings to recurring guild campaigns. A useful recruitment post describes the tone, faction, event schedule, newcomer expectations, and any out-of-character requirements. Browse [RP guilds](/guild-recruitment?playstyle=Roleplay) to start the conversation.

## Hosting an event

Use [group and event posts](/lfg?activity=RP%20event) to share the premise, region, character ruleset, faction, start time with a time zone, meeting location, and contact. Explain what new participants need to know without requiring them to read a long character history first.

## Consent comes before the storyline

Separate in-character disagreements from out-of-character consent. Ask before introducing lasting consequences for someone else's character. Respect a player's decision to step away. Deliberately disrupting an event, harassment, and personal attacks are covered by the [community rules](/rules).

## A welcome for new roleplayers

You do not need a polished backstory to join a friendly social event. Ask the host whether newcomers are welcome and which conventions the group uses. Keep public spaces suitable for a mixed audience. Roleplay as an activity is distinct from the character ruleset chosen during creation.`,
    cta: {
      label: "Explore RP guilds",
      href: "/guild-recruitment?playstyle=Roleplay",
    },
  },
  "discord/eu": {
    title: "WoW Forever EU Discord",
    eyebrow: "EUROPEAN COMMUNITY",
    image: "/images/forever-world.webp",
    description:
      "Find European guilds and groups for Alliance and Horde, with schedules that fit your evenings.",
    body: `## Start with your time zone

The EU community helps players organize around European hours. Recruitment posts should give a time zone alongside raid times. CET and CEST change seasonally, while UTC does not. Confirm whether a posted time is local time, server time, or a fixed UTC offset before committing to a recurring group.

## Find your guild

Browse the [EU guild directory](/guild-recruitment?region=EU), then narrow by faction, playstyle, raid day, or recruiting class. Language is listed separately so international and local-language guilds can explain how they communicate. Contact the recruiter to confirm current character-ruleset plans and roster needs.

## One evening, one group

Use [EU group posts](/lfg?region=EU) for dungeons, raids, premades, questing, and RP events. Include your character ruleset and faction in every post; a region alone does not identify where you can play together.

## Shared standards across regions

EU players use the same [rules](/rules), [report process](/reports), and [appeal route](/appeals) as the rest of the hub. Regional coverage describes who the community welcomes, not a guarantee of 24-hour moderator staffing or in-game availability.`,
    cta: { label: "Browse EU guilds", href: "/guild-recruitment?region=EU" },
  },
  "discord/na": {
    title: "WoW Forever NA Discord",
    eyebrow: "NORTH AMERICAN COMMUNITY",
    image: "/images/forever-mulgore.webp",
    description:
      "Meet North American players, compare guild schedules, and find your next group across Alliance and Horde.",
    body: `## Make the schedule explicit

North America spans several time zones. Guild and group posts should include ET, CT, MT, PT, or a clearly stated UTC offset rather than "evenings" alone. Confirm daylight saving changes and the expected finishing time, especially when members play from different regions.

## Find a regular community

The [NA guild directory](/guild-recruitment?region=NA) separates region, faction, playstyle, raid days, and recruiting classes. Read the full listing, ask about attendance and loot rules, and check that the character-ruleset plan is current before joining a roster.

## Organize a single session

Browse [NA groups](/lfg?region=NA) or post a dungeon, raid, premade, questing group, or RP event. Include the character ruleset, faction, time zone, needed roles, and voice expectations. Clear details save everyone a round of questions.

## A community with common standards

Alliance and Horde, PvE, PvP, and RP players are all welcome. The hub's [moderation standards](/safety) apply across regions and guilds. North American coverage is an invitation to participate, not a claim of round-the-clock staff coverage or a particular ruleset's availability.`,
    cta: { label: "Browse NA guilds", href: "/guild-recruitment?region=NA" },
  },
};

for (const faction of ["Alliance", "Horde"]) {
  const slug = faction.toLowerCase();
  pages[slug] = {
    title: `WoW Forever ${faction} community`,
    eyebrow: `FOR THE ${faction.toUpperCase()}`,
    image:
      faction === "Alliance"
        ? "/images/forever-world.webp"
        : "/images/forever-mulgore.webp",
    description: `Find ${faction} guilds, dungeon groups, PvP teammates, and roleplay events in the WoW Forever community.`,
    body: `## Find your next guild

Browse the [${faction} directory](/guild-recruitment?faction=${faction}) and compare region, character ruleset, language, playstyle, and raid schedule. Ask the recruiter which roles are currently needed and read the loot rules before signing up. A published listing is reviewed for posting standards, not a guarantee of every member's conduct.

## Meet people outside your roster

The [group board](/lfg?faction=${faction}) is for single sessions: dungeons, questing, raids, premades, and RP events. State your character ruleset and region as well as faction. Include a start time with a time zone and the kind of group you want to build.

## Choose your adventure

You can take part in [PvE](/servers/pve), [PvP](/servers/pvp), and [roleplay](/servers/rp) spaces without changing your guild. Regional pages for [EU](/discord/eu) and [NA](/discord/na) help organize players on similar schedules. Use the [friends checklist](/guides/wow-forever-playing-with-friends) to distinguish character choices from community interests.

## The same fair standards

Faction rivalry belongs in the game. The hub applies the same [rules](/rules) and [evidence standards](/safety) to everyone. Website report submissions remain private, guild membership does not establish guilt, and players can appeal public website alerts. Join the [Discord](/discord) to meet the community.`,
    cta: {
      label: `Find a ${faction} guild`,
      href: `/guild-recruitment?faction=${faction}`,
    },
  };
}
