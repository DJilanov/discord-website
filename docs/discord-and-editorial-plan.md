# Discord Page and Editorial Content Plan

Date: 2026-09-29. Status: implementation-ready proposal; no application changes or publishing performed.

Implementation follow-up: see [the editorial release](editorial-release.md) and [operations handoff](search-operations.md). This document preserves the original proposal. The owner has since supplied channel screenshots, confirmed public Discord forum visibility, and confirmed Google ownership.

Parent strategy: [Search and community growth plan](search-growth-plan.md). This document specifies the `/discord` and article work in that strategy. It does not replace the search-account, outreach, or community-operations work.

## 1. Scope and Decisions

**Build one convincing invitation page and a small, useful editorial library around it.** Keep the current WoW Forever identity and visual design. Explain the actual community through real screenshots, organizers, listings, and examples instead of adding more promotional paragraphs.

- `/discord` answers: "Is this a community for me, and how do I join?"
- `/guides` answers: "Which resource helps me get started or organize something?"
- Individual guides answer distinct practical questions. They lead into Discord, the guild directory, or group posts when that is the useful next step.
- Retain all four existing guide slugs. Rewrite those four guides and add two complementary articles in the initial editorial cycle: six substantive evergreen articles in total.
- Use the existing guide CMS and its `News` category for later community stories. Do not create a parallel `/blog` system, duplicate the same articles at two URLs, or build a new CMS.
- Keep search target ownership: `/discord` for the main invitation query, EU/NA pages for useful regional detail, and articles for specific how-to tasks. The homepage remains the overall community overview.
- The approximately 100 people are a planned onboarding cohort, not a published membership fact. The owner has confirmed that channel names and EU/NA organizer assignments are finalized. The exact channel list, publishable organizer details, and screenshots still need to be supplied for the website copy; this is a documentation handoff, not a requirement to redesign the server.

Google's guidance supports first-hand, useful material with clear authorship rather than writing to a word-count target. That informs the approach; it does not guarantee a rank. [People-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## 2. Repository Findings That Affect Delivery

This pass read the page components, guide seeds, Markdown renderer, admin editor and validation, metadata helper, invite handling, directory filters, and publication model. It also reviewed the previous release's desktop/mobile screenshots. Those screenshots are historical design evidence, not a new live browser verification.

| Finding                                                                                                                         | Verified location                                  | Required response                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/discord` checks only the first configured invitation for its preview; `/join` can fall back after a confirmed invalid primary | `app/(site)/discord/page.tsx`, `app/join/route.ts` | Share invitation selection semantics so a usable backup is not hidden by the page                                                    |
| Body images render as their alt text rather than images                                                                         | `components/markdown.tsx`                          | Add explicitly enabled, approved editorial images before publishing screenshot tutorials; preserve the default restriction elsewhere |
| All four redesigned seed-guide covers fail `guideSchema` validation                                                             | `content/guides.ts`, `lib/validation.ts`           | Unify approved cover choices with `lib/admin-fields.ts`; preserve existing images on an unrelated edit                               |
| Guide social previews inherit the generic site image even though Article data uses the guide cover                              | `lib/seo.ts`, `app/(site)/guides/[slug]/page.tsx`  | Set article-specific Open Graph and Twitter images together, using approved assets                                                   |
| Article header uses the stored author but the footer hardcodes the team name                                                    | `app/(site)/guides/[slug]/page.tsx`                | Keep the visible byline, footer, and structured data consistent                                                                      |
| The article sidebar shows the newest three articles, not necessarily related ones                                               | `app/(site)/guides/[slug]/page.tsx`                | Use deliberate body links first; label the sidebar honestly or provide a small explicit reading-path selection                       |
| Article contents already use a Markdown AST and native disclosure                                                               | `lib/markdown-contents.ts`                         | Reuse this; do not introduce an independent heading parser or client-only contents system                                            |
| Saving an existing published guide writes directly to the public record                                                         | `lib/admin-content.ts`                             | Review a proposed rewrite before saving; the current model is not a draft-revision system                                            |
| `groupFilter` excludes expired posts but not every already-started post                                                         | `lib/directory.ts`                                 | An "Upcoming" section must also require `startsAt` to be in the future                                                               |
| Group submissions support game activities, not generic Discord welcome sessions                                                 | `lib/validation.ts`                                | Do not label a voice welcome as a raid to fit the form; use a News article and existing announcement for the first cycle             |

Read-only reproduction: each of the four `initialGuides`, supplied with a valid author and publication flag, failed validation solely on `coverImage`. This confirms a content-editing mismatch; it is not evidence of lost production content. The admin select also lacks those covers, so preservation needs an end-to-end regression check.

### Delivery consequence

Before publishing rewritten guides, complete the cover-validation correction and safe screenshot support. Before encouraging more invitation traffic, align page/redirect fallback behavior. These are focused prerequisites, not reasons to rebuild the site.

## 3. `/discord`: Page Specification

### First-screen message

Keep the literal H1 **WoW Forever Discord**. Suggested supporting copy:

> An independent community for Alliance and Horde players who enjoy PvE, PvP, and roleplay. Meet people, find a guild, and arrange your next group.

Primary action: **Join Discord**, still routed through `/join` so the configured invite can change. Secondary action: **See the community**, linking to the actual server-preview section.

Supporting facts: independent and unofficial; no KFC membership required; no addon required; actual approximate membership if available. Add EU/NA and language details only with wording that distinguishes welcoming a region from actively staffing it.

Keep the current relevant search title for the first release. Improve the page itself before testing title variations. A suitable description is:

> Join the unofficial WoW Forever Discord for Alliance and Horde. Find guilds and groups, meet PvE, PvP and RP players, and see how to get started.

### Section order and contents

| Order | Section                 | Content and interaction                                                                                  | Source / release condition                                                                           |
| ----- | ----------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1     | Identity and invitation | H1, short explanation, visible join action, approximate counts or honest unavailable state               | Existing settings and the selected Discord invitation; no invented counts                            |
| 2     | Inside the community    | One useful wide screenshot plus a mobile-friendly detail; three concise descriptions of actual spaces    | Owner-confirmed channel map and approved screenshots                                                 |
| 3     | Find your people        | Compact EU/NA links, then PvE/PvP/RP routes and Alliance/Horde context                                   | Existing regional/playstyle pages; disclose where organizers are still needed                        |
| 4     | Coming up               | Up to three approved future group posts, with date, time zone, activity, region, and destination         | Existing directory records; no pending, hidden, expired, or already-started posts under this heading |
| 5     | Guilds in the community | Up to three approved guilds with region, faction, schedule where available, and a clear recruiter route  | Existing public guild records; a reviewed post is not a guarantee about every member                 |
| 6     | Your first evening      | Three brief steps: accept the invitation, choose available roles, find an activity or introduce yourself | Actual server flow; link to the full onboarding guide rather than duplicating it                     |
| 7     | People and standards    | Consenting organizer handles, actual responsibilities/coverage, and short rules/help/appeal links        | Approved staff facts; retain the separate community identity and link to About for KFC background    |
| 8     | Before you join         | Six to eight practical questions answered in visible HTML                                                | Confirmed facts; native expandable answers remain available without JavaScript                       |
| 9     | Closing invitation      | Join action, onboarding-guide link, and permanent-page share control                                     | Same invite state as the opening section                                                             |

Do not add all sections as empty framed panels. At launch, a section with no records becomes one concise honest line and the appropriate submission/browse link, or is omitted when it would repeat another empty state. The page must be useful before the directory grows.

If there are no approved future groups, say "No upcoming groups are listed yet" and link to `/lfg`. Do not show static sample events. A Discord-only welcome can be announced via a real News article and the existing announcement, without pretending it is supported by the game-group data model.

### Layout and visual treatment

The previous 390px capture has a visible global header join action, but the in-page invitation action falls below a tall illustration and repeated server identity. Bring the contextual action above that artwork. This is a hierarchy adjustment, not a full visual redesign.

```text
Desktop
Navigation
H1 + short introduction + Join Discord + server facts
Actual server preview + compact explanation of useful spaces
Region/playstyle routes
Upcoming groups and approved guilds
First-evening steps
Organizers, standards, practical questions
Closing invitation

Mobile
Navigation
H1 + concise introduction
Join Discord + available server facts
Readable server screenshot detail
Same sections in a single logical column
Closing invitation
```

- Preserve existing typography, dark neutral surfaces, gold action color, and Warcraft assets. Real Discord imagery should provide useful evidence, not an imitation chat interface.
- Keep the main experience unframed. Use full-width section bands with constrained inner content; cards are only for individual repeated guilds/groups or a genuinely framed invite preview.
- Put the primary in-page action within the first viewport at 390x844 and 1440x900 under normal text settings. At 320px or enlarged text, prioritize no overlap and a sensible reading order over an absolute fold target.
- Do not add a sticky bottom CTA that obscures screenshots, browser controls, or article text. The existing header already provides a persistent route.
- Keep screenshots uncropped where channel labels matter. Provide a natural-size view and explanatory nearby text; do not shrink a full desktop Discord capture into unreadable phone text.
- Set explicit image dimensions/aspect ratios; lazy-load below-fold media. No autoplay video, screenshot carousel, counters animated from zero, or new animation library.
- Use the existing icon library and accessible labels for share/copy actions. Keep long server names and translations from resizing or overflowing controls.

### Invitation state contract

The page, closing action, and redirect should agree on the selected invitation. Keep existing URL validation and bounded fetch behavior.

| State                                                            | Required public behavior                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary is valid                                                 | Show its preview/counts and join action                                                                                                                |
| Primary is absent or confirmed invalid; backup is valid          | Show backup preview/counts and keep joining available                                                                                                  |
| Validity is unknown because of timeout, 429, or upstream failure | Do not call it expired. Preserve the existing ability to try a configured invitation; hide unverified counts and do not claim a fresh successful check |
| Both configured invitations are confirmed invalid, or none exist | Show the unavailable state consistently; never redirect to an unrelated server                                                                         |
| Response payload is malformed                                    | Treat it as unknown/unverified, not as proof that the invite expired; no exception leaking into the page                                               |
| `?invite=unavailable` remains after settings are fixed           | Re-evaluate current invitation state; an old query parameter must not permanently override a now-working invite                                        |

A displayed verification timestamp, if included, must come from a successful preview result and identify its freshness correctly. Do not show a new "checked now" time merely because a cached page rendered. Omit this feature until its semantics are reliable; the first release does not require a timestamp.

Primary and backup should belong to the intended community. Include an admin verification check and warn about a detected mismatch; do not silently present a different server's members as ours. No bot setup is required for the existing invite preview.

### Practical questions to cover

- Is this the official Blizzard Discord? No; state the independent status clearly.
- Can I join without joining KFC? Yes; point to the community's open membership.
- Is it for Alliance, Horde, PvE, PvP, and RP? Explain the welcome and real spaces without inventing official realm availability.
- Are EU and NA both supported? State actual roles and organizer coverage, not an unverified 24/7 promise.
- What should I do after joining? A short answer and the onboarding guide.
- What if an invitation does not open? Distinguish a confirmed expired invitation from a Discord/network problem; retain the stable `/discord` address.
- Are addons required, and who handles problems? Explain optional participation and the actual private help/report route.
- Which languages are currently organized? Publish the confirmed answer rather than inferring it from the site's English copy.

## 4. Article Library and Search Coverage

Use descriptive article titles without repeating the main invitation page. These are proposed editorial titles, not measured search-volume claims. Existing slugs remain unchanged even when the title improves.

| ID  | Article H1 / proposed search title                      | URL                                                      | Role and primary next step                                                       |
| --- | ------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| G01 | How to Join WoW Forever Discord and Find Your Group     | `/guides/join-wow-forever-discord`                       | Actual onboarding walkthrough; join or return to `/discord`                      |
| G02 | How to Find a WoW Forever Guild That Fits Your Schedule | `/guides/find-your-wow-forever-guild`                    | Player choosing a long-term guild; browse `/guild-recruitment`                   |
| G03 | WoW Forever Group Loot Rules: A Pre-Run Checklist       | `/guides/clear-loot-rules-better-groups`                 | Organizer/player setting expectations; use the checklist, then find/post a group |
| G04 | WoW Forever PvE, PvP and RP: Find Your Community        | `/guides/pve-pvp-rp-find-your-community`                 | Player choosing activities and social fit; relevant playstyle page               |
| G05 | How to Find or Organize a WoW Forever Group             | `/guides/find-or-organize-wow-forever-group` (new)       | Player or host arranging one session; browse/post in `/lfg`                      |
| G06 | WoW Forever Guild Recruitment: Write a Useful Listing   | `/guides/write-wow-forever-guild-recruitment-post` (new) | Guild leader advertising clearly; submit a guild listing                         |

G02 and G06 serve opposite sides of recruitment. G01 explains joining and navigating the actual Discord; `/discord` explains whether to join and supplies the invitation. G04 compares social preferences, not unverified game mechanics. G05 is about a single session, not joining a guild. These distinctions prevent six versions of the same sales pitch.

### G01: Joining and first-session onboarding

**Reader outcome:** independently enter the correct server and reach a relevant conversation or activity on phone or desktop.

Proposed sections:

1. Use the current invitation and confirm the server identity.
2. Complete the actual welcome/rules flow, with platform differences where verified.
3. Choose available region, faction, language, and activity roles.
4. Find the right channel for a guild, one-off group, or introduction.
5. Post a useful introduction without sharing private information.
6. Troubleshoot a missing channel, wrong account, or unsuccessful invite.
7. Get help from the correct moderation route.

**Original material:** two or three approved screenshots with real channel labels, one mobile walkthrough, and a brief introduction example explicitly labelled as an example.

**Suggested excerpt:** "Join the community, choose the roles that fit you, and find the right place for guilds, groups, or a first introduction."

**Links:** `/discord`, G02, G05, `/rules`, and the verified help route. Put the invitation near the answer, not only at the bottom.

**Gate:** document and walk through the finalized role/channel sequence using a current screenshot or list. The old desktop screenshots supplied during the initial idea phase are not proof of the current server's configuration. Keep factual generic guidance if an exact step has not been verified.

### G02: Choosing a guild

**Reader outcome:** compare guilds on availability and expectations, then send a useful enquiry.

Proposed sections:

1. Start with your region, available evenings, and real finishing time.
2. Distinguish social membership, a trial, and a committed raid roster.
3. Ask about attendance, preparation, voice chat, progression, and time away.
4. Compare written loot rules and how disputes are handled.
5. Read a guild listing, including what remains unconfirmed.
6. Use a first-contact message and a comparison checklist.
7. Reassess after a conversation or trial without treating a poor fit as misconduct.

**Original material:** a compact comparison worksheet, an organizer-reviewed enquiry example, and two or three current guild examples only with permission. Label illustrative examples; never turn them into fake directory records or testimonials.

**Suggested excerpt:** "Compare schedules, attendance, atmosphere, and loot expectations before you commit. Includes a practical checklist and first-contact example."

**Links:** `/guild-recruitment`, G03, relevant EU/NA page, and G01 for readers who have not joined. G06 is the separate route for a recruiter.

**Gate:** an experienced organizer reviews the advice. Statements about previous TBC raids must remain attributed to that experience, not to unplayed Forever content. Use a time zone tied to a real date or location when illustrating schedules; avoid implying that CET always means local Central European time.

### G03: Clear group and loot expectations

**Reader outcome:** agree on rules before spending an evening together and know how to resolve ambiguity calmly.

Proposed sections:

1. What the recruitment post needs to state before anyone joins.
2. Reservations, priorities, ties, off-spec, replacements, and disconnects.
3. One worked example of an ambiguous rule and a clearer version.
4. A concise pre-run confirmation checklist.
5. Clarification, useful evidence, and a private report if still necessary.
6. Limits of community moderation and how appeals work.

**Original material:** an organizer-reviewed rules example and a clean checklist readers can use. Generic examples must not imply that every named loot system is supported by Forever's current game client.

**Suggested excerpt:** "Set clear expectations before a run: reservations, priorities, replacements, and what to do when a loot decision is unclear."

**Links:** G05, `/safety`, `/reports`, and `/appeals`; the reporting route is secondary, not a fear-based acquisition CTA.

**Gate:** check against the actual published moderation policy and have an organizer verify the examples. No player accusations, exposed evidence, guaranteed protection claims, or unsupported addon endorsements.

### G04: Finding the right playstyle community

**Reader outcome:** choose useful social spaces and activities without mistaking a community label for an official realm announcement.

Proposed sections:

1. Choose what you enjoy and how much time you can give it.
2. PvE: learning groups, recurring groups, preparation, and finishing times.
3. PvP: casual sessions, coordinated teams, voice expectations, and conduct.
4. RP: event premises, newcomer guidance, and out-of-character boundaries.
5. Alliance/Horde and EU/NA coordination in this community.
6. Make one practical next step rather than joining every channel.

**Original material:** three short organizer-approved example activity briefs. Replace them with real upcoming activity when that exists; do not claim scheduled activity where there is none.

**Suggested excerpt:** "Choose the groups and conversations that suit your time, interests, and expectations, across PvE, PvP, and roleplay."

**Links:** `/servers/pve`, `/servers/pvp`, `/servers/rp`, relevant regional pages, G05, and G01.

**Gate:** keep ruleset descriptions separate from official game/realm availability. PvP and RP-specific advice needs a reviewer familiar with those communities; do not stretch PvE organizing experience into an invented qualification.

### G05: Finding or organizing one group

**Reader outcome:** find a suitable session or publish a complete, understandable group post.

Proposed sections:

1. Decide whether you need a one-off group or a guild.
2. Browse region, faction, activity, start time, and organizer details.
3. Write the goal, date, time zone, duration, roles, and experience expectations.
4. State voice, preparation, and loot expectations before signup.
5. Submit the post and understand review, changes, cancellation, and expiry.
6. Confirm the plan and handle a late replacement without confusion.

**Original material:** a worked example mapped to the actual form fields, one screenshot of the current public form, and a practical confirmation checklist. The current form has no dedicated duration field, so duration belongs in the description unless that model later changes.

**Suggested excerpt:** "Find a session that fits your evening or write a clear group post with the time, roles, expectations, and contact players need."

**Links:** `/lfg`, `/lfg/new`, G03, G02, and `/discord`.

**Gate:** perform a local end-to-end submission/review check and confirm what users can actually edit or cancel. Do not describe an unimplemented signup roster, calendar sync, user-edit button, or Discord bot command. Screenshots must use clearly labelled local examples, never seed fake public activity.

### G06: Useful guild recruitment posts

**Reader outcome:** a guild leader writes a current listing that attracts suitable players instead of irrelevant enquiries.

Proposed sections:

1. Explain who the guild is for and what a typical week involves.
2. Specify region, faction, language, realm status, and actual schedule.
3. List current role/class needs and distinguish social from raid recruitment.
4. Explain loot, attendance, trial expectations, and how to contact the recruiter.
5. Compare a vague post with a complete, plainly written example.
6. Submit for review and keep the listing current.

**Original material:** one permissioned guild example or a clearly labelled illustration, a before/after rewrite, and a checklist matched to the existing submission form.

**Suggested excerpt:** "Write a clear WoW Forever guild listing with schedules, recruitment needs, expectations, and a contact route that helps the right players respond."

**Links:** `/guild-recruitment/new`, `/guild-recruitment`, G02, and `/discord`. Do not promise publication, endorsement, or a guaranteed flow of recruits.

**Gate:** check the actual moderation/update process. Use neutral criteria for all guilds, and disclose a shared organizer relationship if using KFC as an example.

### Community stories after the evergreen batch

Use `News` for one real welcome-session recap and then an organizer/guild interview when available. A recap should name the event/date and consenting hosts, describe what happened, answer the useful questions raised, and link to an actual next step. An interview should offer a distinctive scheduling, organization, or community lesson.

No invented attendance, staged testimonials presented as real, private chat transcripts, or repetitive weekly posts with no new information. Do not create a realm/class/recruitment-statistics series until there is enough verified information to maintain it.

## 5. Article and Library Experience

### Shared article template

1. Breadcrumb, literal article title, and an excerpt that gives the immediate answer or task.
2. Accurate byline, meaningful update date, and existing reading-time indication.
3. A relevant cover at restrained height; generic scenery should not push all useful content below the first screen.
4. Existing native contents disclosure and a concise opening answer.
5. Practical sections with original examples, screenshots near the relevant instruction, and short checklists.
6. One context-specific primary next step, followed by two genuinely useful further-reading links.
7. Accurate attribution, sources where needed, and correction route.

Use the existing editorial typography and reading width. Keep paragraph text comfortably readable on phones. Tables must scroll within their container rather than forcing page overflow; where a table becomes difficult to compare on mobile, present a short list instead.

Do not turn every paragraph into a card, repeat a join banner after every section, or add a promotional interstitial. The shared header already offers joining. A practical article should still help a reader who chooses not to join.

The current Markdown-AST contents feature is sufficient. Use helpful H2 headings and retain native no-JavaScript navigation. Use the excerpt for the above-cover quick answer rather than inventing a custom Markdown syntax or a new summary column.

### `/guides` landing page

- Keep the URL and literal H1 **WoW Forever Guides**; introduce the practical community focus in the supporting text.
- Add a compact "Start here" reading path to G01 and G02, only when they are published. Do not rely solely on newest-first sorting to keep onboarding findable.
- Reuse the existing guide cards and cover system. Keep categories that already exist: Getting started, Guilds, Community, Safety, News, and Addons when populated.
- With six evergreen articles, avoid a complex search/filter interface. Add category navigation only when the collection makes it useful; do not create indexable empty tag pages.
- Keep news/recaps identifiable as stories so they do not displace evergreen onboarding resources. A small separate section is enough when the first real story exists.
- Every public guide must be discoverable through ordinary links. No orphan articles accessible only through a sitemap or a client-side search.

### Internal linking map

| From        | Intentional destinations                                                          |
| ----------- | --------------------------------------------------------------------------------- |
| `/discord`  | G01 prominently; G02/G05 near guild/group sections; rules and help near standards |
| G01         | `/discord`, G02, G05                                                              |
| G02         | Guild directory, G03, G06 for recruiters                                          |
| G03         | G05, safety/report/appeal policies                                                |
| G04         | Matching playstyle pages, G05, regional pages                                     |
| G05         | LFG browse/submit, G03, G02 for recurring commitments                             |
| G06         | Guild submission/directory, G02, `/discord`                                       |
| EU/NA pages | `/discord`, region-relevant approved listings, G01/G02/G05 where useful           |

Use natural anchor text that describes the destination. Do not use the exact main keyword as every link. Keep invitation metadata canonical on `/discord`; existing guides remain self-canonical because they serve distinct purposes.

## 6. Media and Publishing Foundations

### Small approved asset catalogue

Extend the current artwork metadata into one bounded catalogue for approved covers and editorial images. Use it across the server validation, admin choices, image rendering, and descriptions; the current cover mismatch demonstrates why one source is justified.

Phase one uses reviewed files shipped under the existing public images area. Each approved image needs its path, descriptive alt text or allowed contextual alt text, intrinsic width/height, and source/permission note. Preserve both existing legacy covers and deployed Forever covers. Editorial screenshots need their own descriptions, not the fallback "Warcraft artwork" text.

Allow those images only in an explicitly enabled editorial Markdown mode used by public guides and their authenticated admin preview. Keep arbitrary URLs, protocol-relative URLs, data URLs, private evidence routes, and raw HTML disabled. Do not enable images globally in guild descriptions, player submissions, addon changelogs, or moderation views.

The rendered markup must remain valid when Markdown places an image inside a paragraph; do not insert a block-level figure into a paragraph without AST handling. Use standard Markdown parsing, not a regex replacement. Support captions with adjacent plain text initially rather than inventing a new block language.

Render responsive images with actual dimensions, useful nearby text, and a real `img` source. Check readability before squeezing files smaller. These choices align with [Google's image guidance](https://developers.google.com/search/docs/appearance/google-images); image markup alone does not guarantee search appearance.

No generic public upload endpoint or new storage service is required. If editors later need self-service media uploads, design that as a separate authenticated, size-bounded, MIME-validated, re-encoded image workflow. Never reuse the private report-evidence storage as the public article library.

### Metadata and authors

- Keep each title descriptive and distinct. Fit the existing 80-character `metaTitle` and 180-character `metaDescription` limits, while recognizing that search display is not a guaranteed character count.
- Use the excerpt as the initial description when it fits and accurately summarizes the page. Longer admin excerpts can have a separate shorter search description.
- Set article-specific Open Graph and Twitter images together; keep the site-wide fallback for other page types. The selected share image should agree with the visible article subject and Article structured data.
- Preserve the initial publication date. Record meaningful updates without presenting a stylesheet change or routine save as a new article. If a dedicated editorial review date is introduced later, model it explicitly rather than pretending the current `updatedAt` means human fact-checking.
- In the first release, retain an honestly attributed organization/team author unless personal contributor metadata is implemented consistently. A personal name cannot simply be inserted into an `Organization` schema and called finished.
- Keep structured data faithful to visible content. No invented reviewer credentials, fake ratings, official status, or new schema type solely as an "AI SEO" tactic. [Google's AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

### Admin workflow without a new CMS

1. Fix the approved-cover list and preserve currently selected covers.
2. Support editorial images in both public rendering and the editor's preview, with the same validation and contents behavior.
3. Draft the rewrites outside the live published record, with the current content retained for comparison. Existing published records have no isolated draft revision; do not toggle them unpublished just to stage a rewrite.
4. Review facts, screenshots, title, excerpt, and links; then save the approved rewrite through the existing authenticated admin flow.
5. New articles can use the existing unpublished state until reviewed. Confirm unpublished guides are absent from public pages, related links, and sitemap.
6. Smoke-check the public article and share metadata after publishing. Record what changed and who reviewed it in the editorial working record.

The existing audit log is not a full content-revision history. Keep a private before/after export for the first batch. A revision system and scheduled publication are optional later improvements, not prerequisites.

## 7. Facts and Assets Needed

Owner confirmation: the channel structure and EU/NA organizer assignments are finalized. Keep them as the implementation baseline. The remaining handoff is their exact names, publishable details, and current screenshots; assigned organizers alone do not establish particular service hours or 24/7 availability.

| Needed                                                                   | Owner                   | Used by                                      | What can happen without it                                                        |
| ------------------------------------------------------------------------ | ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Actual channel names, rules/roles flow, language support                 | Community owner         | `/discord`, G01                              | Engineering, page structure, and generic draft text can proceed                   |
| Current desktop and mobile screenshots with permission/redaction checked | Owner + editor          | Server preview and G01                       | Safe image support and layout can be implemented without publishing fake captures |
| Consenting organizer handles, responsibilities, EU/NA coverage           | Community owner         | Organizers section and regional links        | Keep published claims limited to welcoming players; omit unsupported coverage     |
| Real guild submissions and future group posts                            | Guild leaders and hosts | Live activity sections, G02/G05/G06 examples | Implement honest empty states and generic labelled examples                       |
| Practical review from PvE, PvP, and RP organizers                        | Relevant organizers     | G02/G03/G04                                  | Draft the advice; hold unreviewed specialist claims                               |
| Current submission/update/cancellation behavior verified                 | Engineer + moderator    | G05/G06                                      | Draft around the existing public form; omit unimplemented account features        |

Screenshots should be captured on the actual intended server. Remove private conversations, unnecessary member identities, personal notifications, and sensitive account details before approval. A sample screenshot from another community is not evidence of ours.

### Optional gap check, not a server rebuild

Review the existing setup for these functions before suggesting any additional channel. Names below describe purposes, not verified names in this server.

- **One clear starting point:** a short welcome, rules, the current role-selection route, and the next useful action. Keep the stable website `/discord` address in the relevant resource message.
- **Relevant channels on arrival:** use the finalized region, faction, and playstyle choices to help members find appropriate spaces. If using Discord Community Onboarding, its questions can assign roles and channels; preview the result as a newcomer. Preserve safety protections. [Discord onboarding documentation](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ).
- **Findable recruitment and groups:** if posts are already difficult to follow, consider forum posts with a small set of region/faction/activity tags and posting guidelines. Do not migrate a working setup just for appearance. [Discord forum documentation](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ).
- **Visible organizers and real activity:** make the assigned EU/NA contacts easy to find and label event times clearly. Ask permission before publishing handles and coverage on the website.
- **Private help and appeals:** provide an obvious route to the existing private forms or staff contact. A public help message must not invite public accusations or evidence uploads; no new ticket bot is required.
- **A useful resource route:** pin or link the relevant website guides where newcomers ask those questions. Turn recurring questions into reviewed public articles without copying private conversations.

If these functions already exist, add no channels. Use the existing labels in `/discord` and G01, and concentrate on screenshots, examples, and the first real sessions.

Do not wait for 100 members to start this work, and do not keep reworking the design while the facts are gathered. Ship the working invitation and useful confirmed material first; add evidence-backed sections as they become ready.

## 8. Delivery Order

All items below are planned, not completed. Estimates describe focused engineering/editorial effort after required facts arrive, not search outcomes.

| Batch                      | Work                                                                                                              | Rough effort                            | Release gate                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A: correctness             | Invite selection parity; cover validation/admin preservation; focused regression tests                            | 1-2 engineering days                    | Backup behavior and existing-guide save path work without changing covers                         |
| B: publishing foundation   | Approved editorial images, matching admin preview, article social images/byline consistency                       | 1-2 engineering days                    | Safe images render; existing non-editorial Markdown restrictions and private routes remain intact |
| C: primary conversion page | `/discord` section order, compact first-screen action, real preview, bounded guild/group queries, truthful states | 1-2 engineering days plus facts/assets  | Mobile/desktop review, invite states, approved/future-only activity, no fabricated content        |
| D: core rewrites           | G01-G04, internal links, starter reading path                                                                     | 2-4 editorial days with reviewers       | Each brief's evidence gate, preview, metadata, and link review passed                             |
| E: complementary articles  | G05-G06, then one real community story                                                                            | 1-2 editorial days plus completed event | Actual workflows verified; new articles are distinct and all public links resolve                 |

Editorial drafting can run alongside A/B. C can release with confirmed sections without waiting for every future event or testimonial. Do not wait for the full library before improving the invitation's reliability.

### Implementation boundaries

| File or module                                                                       | Scope                                                                                    |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `lib/discord.ts`, `app/join/route.ts`, `app/(site)/discord/page.tsx`                 | One invitation-selection contract, matching page states, bounded previews                |
| `lib/validation.ts`, `lib/admin-fields.ts`, `content/artwork.ts`                     | Approved-cover and editorial-image catalogue, validation, consistent admin choices       |
| `components/markdown.tsx`, `components/admin-editor.tsx`, `lib/markdown-contents.ts` | Opt-in safe image rendering and identical editorial preview behavior; reuse AST contents |
| `app/(site)/guides/[slug]/page.tsx`, `lib/seo.ts`                                    | Article presentation, social images, honest attribution; preserve other metadata callers |
| `app/(site)/guides/page.tsx`, `components/guide-card.tsx`                            | Starter path and existing card reuse; no duplicate blog routing                          |
| `lib/directory.ts`, existing public record queries                                   | Approved/expiry policy retained; additional future-start condition for "Upcoming"        |
| `app/(site)/site.css`                                                                | Scoped layout adjustments; preserve the shared admin experience                          |
| `content/guides.ts` and persisted `ForeverGuide` records                             | Starter content kept in sync with reviewed changes; existing production edits preserved  |

Prefer the current stack, admin, database models, and first-party analytics. No new package, bot, external CMS, generalized media platform, or schema migration is required for this initial plan.

## 9. Verification and Feedback Loop

### Engineering acceptance

- Add regression tests for valid/invalid/unknown primary and backup invites, malformed preview responses, and a stale unavailable query parameter. The page and redirect must agree without leaking errors or creating unrelated-server redirects.
- Test all currently deployed cover choices and malicious/unknown image paths. Saving an unrelated guide field must retain its cover. Check the actual editor select as well as the API schema.
- Test editorial images, blocked external/private URLs, raw HTML rejection, alt text, valid markup, and unchanged behavior in non-editorial Markdown consumers.
- Verify Open Graph, Twitter, canonical, Article image, and byline against the visible article. Confirm unpublished guides and unpublished related entries stay private.
- Test groups that are pending, hidden, expired, already started, and in the future. Only approved future entries appear as upcoming; guilds must also be approved.
- Run the relevant unit tests, `npm run lint`, `npm run typecheck`, `npm run build`, and focused Playwright coverage. Use existing `tests/core.test.ts`, `tests/design.test.ts`, and `tests/e2e` conventions rather than a new test framework.

### Visual and editorial review

Review `/discord`, the guide index, one screenshot-rich article, one table/checklist article, and the actual editor preview at 320, 390, 768, and 1440px widths. Check a 390x667 short phone as well as 390x844. Review Chromium and WebKit, JavaScript-disabled rendering, enlarged text, keyboard focus, and narrow table/image behavior.

Use three passes: first check whether the page answers the reader's question; then inspect screenshots and interaction; finally have an organizer verify every community/game claim. Record findings and repeat the affected checks after fixes. Do not equate a passing screenshot test with perfect usability.

At launch, verify links, counts, invitation behavior, public images, and share metadata again on production. A plan, local preview, or seed-file edit is not proof that a published database article was updated.

### Outcome review

Keep the initial title changes limited and record release dates. After sufficient traffic accumulates, compare `/discord` and article landing sessions with sessions that click `/join`; use the existing `discord_click` event and preserve privacy controls. Keep the literal `/join` destination unless the tracker is updated and tested too.

Review relevant Search Console queries, entry pages, reader questions, and successful onboarding. Invitation clicks are not confirmed joins. Fix confusing onboarding if traffic increases without participation; do not respond by publishing more generic articles.

## 10. First Publishable Milestone

The first meaningful release is **a reliable, clearer `/discord` page plus an accurate screenshot-based onboarding guide**, supported by safe image rendering and a working guide-editing flow. Follow it with the guild-selection rewrite, remaining evergreen briefs, and genuine community stories.

That gives visitors a complete path: understand the community, join the correct server, choose a useful space, and find people to play with. It also gives search systems substantive public information to reference without duplicating the same invitation text across a large set of pages.
