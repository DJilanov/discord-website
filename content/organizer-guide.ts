import type { EditorialGuide } from "./guides";
import { templateMarkdown } from "./templates";

export const organizerGuide: EditorialGuide = {
  slug: "host-first-wow-forever-group",
  title: "Host Your First WoW Forever Group",
  excerpt:
    "Choose one achievable session, set clear expectations, use native signups and keep the plan current. Includes a host availability worksheet.",
  category: "Community",
  coverImage: "/images/forever-stories.webp",
  content: `You do not need a large guild or a perfect raid roster to host something useful. Start with one activity you can reliably lead, a finish time you can keep and a clear place for people to sign up. This is an organizer workflow, not an advertised session or a promise that volunteers are already available.

## Offer a specific commitment

Choose an activity that fits your actual experience: a first dungeon visit, a questing evening, a build discussion or a route review. State whether you are teaching, learning alongside the group or checking one particular feature. Do not label an exploratory session as a proven speed run.

Before publishing, give staff a short availability brief in the Discord's **tool-support** space or ask for a private staff conversation. Ordinary channels are member-readable. Include only a public handle you approve, not a real name, account screenshot or full work schedule. Availability is an offer to coordinate; it does not automatically create an event or staff role.

${templateMarkdown("host-availability")}

For a first two-week operating cycle, aim for a small dependable set of hosts rather than filling every day. Three reliable hosts and two recurring activities are an operating target, not a claim about current staffing. Confirm each person's own dates before advertising them.

## Create one achievable session

Use [Create event](/raids/new) for a character signup roster. Sign in with the Discord account that belongs to this community. Nonmembers must join before using the member service; public tool browsing remains separate.

Review region, faction and character ruleset independently. Set an activity, meeting objective, start time, duration and realistic capacity. EU event times use Central Europe and NA uses New York; check the displayed date-specific conversion. Include whether the start means meeting or first pull, and make a hard finish explicit in the description.

If coming from a leveling route, quest or dungeon tool, review the prefilled planning reference. The draft does not establish completed prerequisites, verified character levels or available content. It does not publish itself. Normal members use the routed destination; arbitrary channel choices are reserved for authorized administrators.

## Choose how signup works

Use open signup when you want people to register first and select the roster later. Automatic acceptance is a different setting, and approval mode requires a host decision. Explain the mode rather than treating every signup as a confirmed place.

Participants can mark Tentative or Absent and return to joining when their plans change. Keep those choices visible without pressuring players to explain private circumstances. Confirm replacements and roster changes through the managed event, not a competing spreadsheet that nobody else can see.

For raids with supported published loot data, read the soft-reserve quotas and named hard reserves before inviting players. A reserved-item count is not a complete policy. A learning dungeon can use a simpler written loot agreement, but it still needs to be stated before the relevant drop.

## Check publication before sharing

An event draft, a delivered Discord post and website approval are separate states. Check that Discord delivery is current. A human administrator can approve the current post for website display; changed material details can require a new approval. Do not repeatedly create copies when delivery is delayed.

Only an approved event with confirmed community visibility receives a public event preview. Private test sessions remain private even if an administrator reviewed their post. The public preview omits attendee and character details. Share that preview when appropriate; a calendar download is a snapshot, not a live subscription or a confirmed roster place.

Basic [LFG listings](/lfg) are useful for a contact-based request, but they are not the same as a native event roster. Choose one signup destination and tell participants which process you are using. Keep coordination replies in the relevant group conversation.

## Lead a comfortable session

Before starting, repeat the goal, finish time, loot expectations and how people ask for a pause. Confirm the tools people actually have at their current level. Assign a co-host for a recurring activity when someone is available; do not invent one to make the event look staffed.

If the plan changes, edit the maintained event and verify the Discord update. Contact staff for an ordinary listing correction. If you cancel, tell participants in the same place they signed up. Do not rely on a forgotten calendar file to convey a new time.

## Turn one session into a better next visit

Afterward, record whether the session happened, its actual scope and one improvement for next time. A scheduled date or signup count is not evidence of attendance or a clear. Ask permission before publishing participant names, screenshots or quotes.

For a factual correction, use the [contributor report](/contribute#report). For a recurring group, agree on a sustainable next date before advertising a series. Hosts from other guilds follow the same rules; contributing here does not require joining KFC or promoting any particular roster.`,
};
