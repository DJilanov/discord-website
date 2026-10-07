import type { EditorialGuide } from "./guides";

export const toolGuides: EditorialGuide[] = [
  {
    slug: "wow-forever-playing-with-friends",
    title: "Playing WoW Forever With Friends: Rulesets, Factions and Names",
    excerpt:
      "Agree on region, character ruleset and faction before creating characters. A practical friends checklist with official sources and group-planning advice.",
    category: "Getting started",
    coverImage: "/images/forever-stories.webp",
    content: `Before creating characters, put three decisions in one shared message: region, character ruleset and faction. Then agree on a calendar date and a time people can actually make. This is a coordination checklist, not a promise of beta access or a reserved place in a group.

**Official information checked September 30, 2026.** Start with Blizzard's [ruleset explanation](https://news.blizzard.com/en-us/article/24302070/choose-your-ruleset-in-world-of-warcraft-forever) and [character naming announcement](https://news.blizzard.com/en-us/article/24304161/create-a-name-of-your-own-in-wow-forever). Recheck those sources when planning around a new client build.

## Understand the character choice

Forever replaces traditional realm selection with character rulesets: Normal, PvP and Roleplaying; Hardcore is announced for after launch. Blizzard says ordinary groups, dungeons and raids require the same ruleset and faction. A different ruleset generally means a new character, not a freely available switch.

That makes agreement before character creation worthwhile. Do not tell a friend to pick anything now and assume a transfer will repair the plan later. Write the exact choice in the same place as the session details, then ask everyone to acknowledge it.

## Separate an activity from a ruleset

Wanting a dungeon, a battleground or a roleplay evening describes your activity. It does not by itself tell your friends which character choice you made. An organizer should state both, even when the wording feels repetitive.

For example, a group listing has a character-ruleset field and a separate activity field. Do not infer one from the other or from a Discord role. Our social spaces welcome different interests; joining the same channel is not a compatibility check.

The guild directory also permits an Unconfirmed plan and a clearly labelled future Hardcore plan. Those are recruitment intentions, not evidence that everyone can enter the same session today. Ask the recruiter for a decision before committing your character or schedule.

## Use the full character name

Blizzard describes a two-part character name whose complete combination is unique within a region. When exchanging character contacts, use the full name and region rather than assuming a familiar first name identifies your friend.

You do not need a real name, Battle.net password, account screenshot or work schedule for a public recruitment conversation. Keep private account details out of a group worksheet. A public organizer handle should belong to someone who agreed to be contacted.

Our moderation and addon identity work is a separate validation task. This guide does not claim that legacy name-and-realm matching already supports Forever's naming model. For a safety issue, ask staff which intake is supported rather than guessing a realm or accusing a similarly named player.

## Make one readable plan

Use the [launch worksheet](/guides/wow-forever-launch-group-checklist) for an ongoing group, or the [single-session template](/guides/find-or-organize-wow-forever-group) for one evening. Include:

- Region, exact character ruleset and faction.
- Activity, pace and whether newcomers are welcome.
- Calendar date, start time, named time zone and expected finish.
- Roles already covered and roles still needed.
- A consenting organizer contact and one place for updates.
- A fallback date or activity if access is unavailable.

Ask another participant to read the plan back before inviting more people. If they cannot tell when to arrive or which character to bring, fix that uncertainty first. For a shared weekly schedule, say whether you stay at the same local time or the same UTC time when clocks change.

## Keep access and grouping separate

Being in the right community does not grant beta access. Each player should verify their own access through official services before accepting a test-session commitment. Our [beta checklist](/guides/wow-forever-beta-starter-checklist) covers that preparation without asking people to share account details.

A market label in WoW Trader is also not a character-creation instruction. It identifies the dataset you are viewing. Use official game choices for your group plan, not a label copied from an auction-data selector.

## Publish only a real session

When the host, activity and time are confirmed, use [looking for group](/lfg/new). With sharing consent, listings publish immediately and are queued for the Discord forum, then reviewed by moderators. Do not advertise unavailable content or a speculative roster as a ready-to-join session.

If plans change, contact staff with the listing URL and the exact correction, and update any ordinary Discord posts separately. The two do not synchronize automatically today. A short, maintained plan helps more than several confident but conflicting announcements.

Found a changed official rule or an unclear step? Take the [guide-check assignment](/contribute#guide-check) and include the specific section, source and date. Distinguish what a source confirms from what you personally tested.`,
  },
  {
    slug: "wow-trader-read-market-prices",
    title: "How to Read WoW Trader Prices Without Mistaking Listings for Sales",
    excerpt:
      "Check upload age, market scope, material depth and uncertainty before using a crafting quote. Includes a worked example, not a promise of profit.",
    category: "Addons",
    coverImage: "/images/wow-trader-workspace.webp",
    content: `WoW Trader helps compare material costs and auction listings. It cannot guarantee that an item will sell, how soon a buyer will arrive or what price will remain when you reach the auction house. Start with the [WoW Trader introduction](/addons/wow-trader) if you have not used the Forever workspace before.

**Workspace checked September 30, 2026.** The interface and data can change. This article explains how to read the evidence shown by the tool, not which item to buy today.

## Check the upload before the number

Prices update when someone uploads auction data from the app. This is a community contribution process, not a continuous official auction feed. Sometimes nobody uploads for a while. That gap is not evidence of a stable market.

Read the timestamp for the market you selected. A fresh upload in one dataset says nothing about another dataset's freshness. An old scan can help you understand a past observation, but it should not be treated as a current offer.

Do not install collection software just to browse prices. The public website is usable independently; the optional collector and desktop companion have their own controlled-test requirements.

## Check which market and build you are reading

Use the Forever workspace rather than the separate TBC tools. Record the displayed market label, faction scope where shown, catalog build and scan age. A market identifier is a data label, not a realm you should tell your friends to choose.

If a recipe or item is missing, do not replace it with a similar-looking result from another version. Missing information is a reason to investigate the catalog and input data. It is not a zero price or confirmation that the recipe is unavailable in game.

## An asking price is not a completed sale

A seller can list an item for a high amount without finding a buyer. The lowest visible listing is still an offer, not proof that someone recently paid it. A ranking based on those listings is useful for deciding what to inspect, not permission to spend all your gold.

History coverage matters separately from scan freshness. One recent observation may tell you what was listed at that moment, but not a normal price range. Respect collecting-history and speculative-ask labels instead of treating the absence of a warning as proof of demand.

## A worked example with invented numbers

The following values are deliberately invented to demonstrate the arithmetic. They are not current game prices, an actual item recommendation or a statement of Blizzard's auction fees. Assume one crafted item uses inputs costing 8 gold in total, could sell for 12 gold, and incurs 1 gold of combined selling costs.

| Assumption | Amount |
| --- | --- |
| Material cost for one craft | 8 gold |
| Assumed completed sale | 12 gold |
| Assumed selling costs | 1 gold |
| Difference if every assumption holds | 3 gold |

The calculation is 12 - 8 - 1 = 3 gold. Now change only the sale assumption: at 9 gold, the difference is zero. If the item never sells, the 12-gold listing did not create income at all; your gold remains tied up in materials or stock, and repeat listing costs may worsen the result.

That is why a large displayed margin is a question to investigate. Ask whether you can buy the necessary inputs at the quoted cost, whether the output has buyers, and which costs or assumptions the estimate leaves out.

## One craft is not twenty crafts

The cheapest material listing may cover only part of your batch. More units can require more expensive listings. A headline per-craft difference does not imply that multiplying by twenty preserves the same costs or sale price.

Inspect quantities and depth where available. Check whether a proposed route depends on buying more units than the visible supply covers. Include the time and risk of holding inventory in your own decision, even where the tool does not model them.

An estimated vendor or other exit also needs its own checks. Do not silently substitute an auction asking price for a guaranteed alternative. Read the route label and the input assumptions before comparing results.

## Pause when the evidence is weak

Before acting, confirm:

- The intended game version, market and catalog build are selected.
- The most recent upload is recent enough for your use.
- Required materials have prices and sufficient quantities.
- You understand whether the output value is a listing, estimate or another exit.
- History and uncertainty labels are not being ignored.
- You have checked the actual auction house and can tolerate the item not selling.

Nothing on the public website requires you to buy an item to finish a test. Browser feedback is useful without a trade: can you find the age of the scan, recognize missing data and explain what a quote represents?

## Return a reproducible finding

Use the [market-quote assignment](/contribute#trader-web) for an unclear label, broken interaction or mobile layout issue. Include the page, market, item, date, scan age, browser and what you expected.

A stale-data observation belongs in the report as context; it is not automatically a software defect. Do not post raw scan files, tokens or account information in public channels. Collection tests need prior coordination with the maintainer and a private diagnostic route.

For current tools and release boundaries, return to the [addon and tools hub](/addons). The most useful community contribution is an accurate, limited observation, not an unsupported claim that a tool guarantees profit.`,
  },
];
