import type { ExperienceTag } from "./discord-channel-experience";

export interface GroupFaction {
  key: "alliance" | "horde";
  label: "Alliance" | "Horde";
  parentId: string;
  optionId: string;
  rulesId: string;
  pveSourceId: string;
  pvpSourceId: string;
  scheduledId: string;
  lookingId: string;
  recruitmentId: string;
}

export const groupFactions: readonly GroupFaction[] = [
  {
    key: "alliance",
    label: "Alliance",
    parentId: "1554318980897046669",
    optionId: "1554621815840706584",
    rulesId: "1554325566856106036",
    pveSourceId: "1554327593560318052",
    pvpSourceId: "1554327610589450250",
    scheduledId: "1554327396990320741",
    lookingId: "1554327239733157958",
    recruitmentId: "1554327206396690432",
  },
  {
    key: "horde",
    label: "Horde",
    parentId: "1554318998466863224",
    optionId: "1554621815840706585",
    rulesId: "1554327700909592628",
    pveSourceId: "1554327821604888596",
    pvpSourceId: "1554327854471184455",
    scheduledId: "1554327956329865256",
    lookingId: "1554327900998869092",
    recruitmentId: "1554327927750000661",
  },
];

export const factionPromptId = "1554617788549697598";
export const levelingForumId = "1554946655244263628";
export const levelingParentId = "1554318429115392080";
export type GroupKind =
  "pve" | "pvp" | "scheduled" | "looking" | "recruitment" | "leveling";

const commonTags = [
  "EU",
  "NA",
  "Other",
  "Normal",
  "PvP ruleset",
  "Roleplaying",
];
const sessionStatus = ["Open", "Full", "In progress", "Completed", "Cancelled"];

export function groupTags(kind: GroupKind): ExperienceTag[] {
  const names =
    kind === "pve"
      ? [
          ...commonTags,
          "Dungeon",
          "Questing",
          ...sessionStatus,
          "Learning",
          "Relaxed",
          "Fast",
        ]
      : kind === "pvp"
        ? [
            ...commonTags,
            "Battleground",
            "World PvP",
            "Dungeon",
            "Questing",
            "Raid",
            "RP event",
            ...sessionStatus,
            "Casual",
            "Coordinated",
          ]
        : kind === "scheduled"
          ? [
              "EU",
              "NA",
              "Other",
              "PvE",
              "PvP",
              "RP",
              "Learning",
              "Relaxed",
              "Progression",
              ...sessionStatus,
            ]
          : kind === "looking"
            ? [...commonTags, "Social", "Looking", "Found"]
            : kind === "recruitment"
              ? [...commonTags, "Social", "Recruiting", "Paused"]
              : [
                  "EU",
                  "NA",
                  "Other",
                  "Alliance",
                  "Horde",
                  "Normal",
                  "PvP ruleset",
                  "Roleplaying",
                  "Looking for group",
                  "Looking for players",
                  "Full",
                  "Closed",
                  "Relaxed",
                  "Fast leveling",
                ];
  return names.map((name: string): ExperienceTag => ({
    name,
    moderated: false,
  }));
}

const closing =
  "Edit your original post as plans change; keep replies and coordination in its thread. Choose relevant tags (up to five); keep one current status. No duplicate adverts or mass mentions. Inactivity archiving is not cancellation or completion.";

export function groupGuidelines(
  kind: GroupKind,
  faction?: GroupFaction,
): string {
  const label = faction?.label ?? "Both factions";
  const scope =
    "State your region and character ruleset separately from the activity. Identify the game/client or beta build when relevant, and choose only content you can actually access. No account details or paid promotion; existing server and trading rules still apply.";
  switch (kind) {
    case "pve":
      return `${label} dungeon and questing groups for a single session. For a regular leveling team use group-leveling; for a hosted session with a signup roster use scheduled-runs. Players seeking a group can post too: state your role and availability.\n\nTitle: region | activity | open roles | date and start\n\nCopy the relevant fields:\n\`\`\`text\nActivity / dungeon / quest objective:\nRegion / character ruleset / game or build:\nYour role, current level / eligible level range:\nStart date, time and named timezone:\nExpected duration:\nCurrent group / open roles and spots:\nPace: learning, relaxed or fast:\nLoot expectations, if relevant:\nVoice: optional, required or text-only:\nHost / Discord contact:\nStatus: Open / Full / In progress / Completed / Cancelled:\n\`\`\`\n"In one hour" must also include an absolute date and time. Omit fields that do not apply, not the activity, start, duration, spots or contact. ${scope}\n\n${closing}`;
    case "pvp":
      return `${label} groups for PvP-ruleset characters, plus battleground and world PvP teams on any ruleset. Website submissions with the PvP character ruleset arrive here, including dungeon, questing, raid and RP sessions; the activity tag describes what the group is doing. Players looking for a team should include availability and what they can play. No boosts or sales.\n\nTitle: region | activity or PvP objective | open spots | date and start\n\n\`\`\`text\nActivity: dungeon, questing, raid, RP, battleground or world PvP:\nObjective / battleground / meeting place:\nRegion / character ruleset / game or build:\nLevel range / your class or role:\nStart date, time and named timezone:\nExpected duration:\nCurrent group / open spots and roles:\nGoal: casual or coordinated / experience expectations:\nVoice: optional, required or text-only:\nHost / Discord contact:\nStatus: Open / Full / In progress / Completed / Cancelled:\n\`\`\`\nInclude an absolute start even when writing "in one hour". Rating or rank is relevant only if that system exists and matters to the group. ${scope}\n\n${closing}`;
    case "scheduled":
      return `${label} hosted sessions with an organized signup roster: PvE, PvP or RP. Create a new dated post for each session; never reuse an old run's roster by changing its date. For an informal pickup group use lfg-pve or lfg-pvp.\n\nTitle: region | activity | date and start | open roles\n\n\`\`\`text\nActivity / game or build:\nRegion / character ruleset:\nStart date, time, named timezone / expected finish:\nHost and backup contact, if available:\nLevel / preparation / experience requirements:\nCapacity / accepted players / open roles / waitlist:\nPace / voice expectations:\nLoot rules, if applicable (agreed before starting):\nOne authoritative signup link or this thread's host-managed roster:\nHow the host confirms a spot and handles a cancellation:\nStatus: Open / Full / In progress / Completed / Cancelled:\n\`\`\`\nReply with your class/role and availability or use the host's one linked signup destination. A reply, reaction or Discord Event "Interested" is not an accepted place: the host must confirm accepted and waitlisted players in that same roster. No competing signup lists. ${scope}\n\n${closing} Keep the existing six-hour bump cooldown; it is separate from the post-creation cooldown.`;
    case "looking":
      return `${label} players looking for a guild. One maintained post per player; recruiters should reply with a relevant fit, not mass adverts. All guilds are welcome under the same rules.\n\nTitle: region | class/role | preferred playstyle\n\n\`\`\`text\nRegion / character ruleset / game or build:\nClass / role / level / relevant experience:\nActivities and pace you enjoy:\nAvailable days, times and named timezone:\nLanguage / voice preferences:\nWhat you want from a guild:\nDiscord contact:\nLast updated date:\nStatus: Looking / Found:\n\`\`\`\nUndecided choices are fine; say so. Personal background is optional, not an application requirement. Update Found only when your search is complete. ${scope}\n\nEdit your original post rather than duplicating it. Keep the existing six-hour bump cooldown. Archiving is not proof that someone found a guild.`;
    case "recruitment":
      return `${label} guild recruitment. One maintained entry per guild, with equal posting rules for every guild; no featured home-guild treatment.\n\nTitle: guild name | region | playstyle | current needs\n\n\`\`\`text\nGuild name / region / character ruleset / game or build:\nLanguage / activities / pace:\nRegular days, start and finish times with named timezone:\nCurrent class / role needs and whether social members are welcome:\nPreparation, attendance and voice expectations:\nLoot policy, where relevant:\nPublic recruiter contact / application destination:\nLast confirmed date:\nStatus: Recruiting / Paused:\n\`\`\`\nMark undecided schedules honestly. Edit needs and the confirmation date when they change; do not create duplicate entries. Mark Paused when recruitment closes. Reconfirm every two weeks; staff may check stale entries without assuming the guild closed. ${scope}\n\nKeep the existing six-hour bump cooldown. Inactivity archiving is not a recruitment decision.`;
    case "leveling":
      return `Find a leveling partner or build a recurring group across both factions. One post per group or personal search. Single-session dungeon or quest requests belong in your faction's lfg-pve; organized one-run signups belong in scheduled-runs.\n\nTitle: region | faction | level range | regular play times\n\n\`\`\`text\nRegion / faction / character ruleset / game or build:\nClass / role / current level and compatible level range:\nRegular days, start and finish times with named timezone:\nFirst planned session, if agreed:\nPace / goals / catch-up or missed-session expectations:\nCurrent group / open roles and spots:\nVoice: optional, required or text-only:\nDiscord contact:\nStatus: Looking for group / Looking for players / Full / Closed:\n\`\`\`\nChoose region, faction and status tags; add ruleset or pace within the five-tag limit. Coordinate in your thread and edit the original post as plans change. Mark Full or Closed when appropriate; reopening is fine if a spot becomes available. No duplicate bumps, paid boosts, mass mentions or account details. Inactivity archiving is not a finished group. No cross-server copying is enabled by posting here.`;
  }
}

export function factionRulesTopic(
  faction: GroupFaction,
  pveId: string,
  pvpId: string,
): string {
  return `${faction.label} group finding and recruitment. Single sessions: <#${pveId}> (dungeons/quests), <#${pvpId}> (PvP). Hosted sessions with one signup roster: <#${faction.scheduledId}>. Players seeking guilds: <#${faction.lookingId}>; guild listings: <#${faction.recruitmentId}>. Recurring teams: <#${levelingForumId}>. See the pinned current guide: replies inside a group post are allowed, replacing the old DM-only instruction. Existing trading restrictions and six-hour bump cooldown still apply. Every guild follows the same rules.`;
}

export function factionGroupGuide(
  faction: GroupFaction,
  pveId: string,
  pvpId: string,
): string {
  return `**${faction.label}: groups and guilds**\n\n<#${pveId}> - one dungeon or questing session\n<#${pvpId}> - battleground or world PvP teammates\n<#${faction.scheduledId}> - a hosted session with one signup roster\n<#${faction.lookingId}> - players looking for a guild\n<#${faction.recruitmentId}> - guild recruitment\n<#${levelingForumId}> - recurring leveling teams\n\n**Current posting rules**\nReplies and coordination inside a group's forum post are welcome. This replaces the older blanket "DM only / no replies" instruction; keep unrelated chat out of listings. Contact a host privately when sensitive details are needed.\n\nUse the forum's template. Include region, character ruleset, activity, exact date/time with a named timezone, duration, open spots and a contact. "In one hour" also needs an absolute start. Choose relevant tags and one current status; update your original post as plans change.\n\nFor hosted runs, create a new dated post per session and use one signup destination. The host confirms accepted and waitlisted players; a reply, reaction or Event "Interested" is not a confirmed place.\n\nOne maintained entry per guild or personal guild search. Keep the existing six-hour bump cooldown; post-creation slowmode does not replace it. No duplicate adverts, mass mentions or account details. Boosts and sales do not belong in LFG: existing trading restrictions still apply, including in-game-gold-only terms where permitted. All guilds follow the same rules.\n\nArchiving after inactivity does not mean a group completed, cancelled or found a guild. Hosts update status manually; no automatic signup or reminder bot is promised here.`;
}
