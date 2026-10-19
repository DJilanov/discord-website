import { kfcResources, kfcRulesId } from "./kfc-community";

export const revision = "2026-10-09.1";
export interface RevisionTarget {
  id: string;
  name: string;
  parentId?: string;
  parentKey?: string;
  topic?: string;
  readOnly?: boolean;
  maintained?: boolean;
}
export const revisionTargets: RevisionTarget[] = [
  {
    id: kfcRulesId,
    name: "rules",
    parentId: "1412555658108211280",
    readOnly: true,
    topic:
      "Current KFC community rules. Event-specific raid and loot terms remain in each event's published agreement.",
  },
  { id: "1411533816060842014", name: "Guild Members" },
  { id: "1411564696644882552", name: "Staff" },
  { id: "1411616134356009021", name: "Tools & Preparation" },
  { id: "1411614900861800589", name: "Crafting & Help" },
  { id: "1413349255263031458", name: "Optional Extras" },
  { id: "1411540931093598229", name: "Legacy Resources" },
  { id: "1411600830251012096", name: "Legacy Raid Resources" },
  { id: "1411564558107283486", name: "guild-chat" },
  { id: "1411567329485262909", name: "Guild Lounge" },
  { id: "1456753984760184923", name: "achievements" },
  { id: "1493989521606578368", name: "guild-crafters" },
  { id: "1411566738633523243", name: "guild-bank" },
  { id: "1411566702612840478", name: "guild-loot-priority" },
  { id: "1480274694648369353", name: "attendance-cases" },
  { id: "1411566664079769700", name: "conduct-cases" },
  { id: "1425680290160054322", name: "guild-macros" },
  {
    id: "1476724876914987181",
    name: "world-pvp-coordination",
    topic:
      "In-game coordination only. No harassment, personal information or public accusation lists. Send conduct concerns privately to KFC Management.",
  },
  { id: "1411564572501999690", name: "staff-chat" },
  { id: "1411591165534273661", name: "Staff Voice" },
  { id: "1412556202587459716", name: "membership-log" },
  { id: "1528518181163892957", name: "safety-review" },
  {
    id: "1556204779531673726",
    name: "discord-updates",
    parentId: "1411564696644882552",
  },
  {
    id: "1557975280184991756",
    name: "safety-alerts",
    parentId: "1411564696644882552",
  },
  { id: "1411566371942170665", name: "Community Lounge" },
  { id: "1411592694404218991", name: "TBC Raid Voice" },
  { id: "1411592741410050200", name: "TBC Arena Voice" },
  { id: "1411566288790097980", name: "music", parentId: "1413349255263031458" },
  {
    id: "1411837013711130717",
    name: "music-commands",
    parentId: "1413349255263031458",
  },
  {
    id: "1413347613536813217",
    name: "activity-checker",
    parentId: "1413349255263031458",
  },
  { id: "1548518038314295296", name: "character-plans" },
  { id: "1411545206704308235", name: "role-select" },
  { id: "1412584845829345280", name: "verification" },
  { id: "1412591212980080742", name: "legacy-welcome" },
  { id: "1411533816060842016", name: "newcomers" },
  {
    id: "1411545946155909150",
    name: "tbc-application",
    parentId: "1441654698519040114",
    readOnly: true,
    maintained: true,
    topic:
      "Apply to KFC for The Burning Crusade. Read the pinned template and DM KFC Management privately. Existing applications remain below; public raid signup is separate.",
  },
  {
    id: "1411545672313737346",
    name: "joining-kfc",
    readOnly: true,
    topic:
      "Join KFC for TBC or WoW Forever. Choose the matching application channel; Forever: EU Alliance PvP, English. Public raid signup does not require guild membership.",
  },
  {
    id: "1411546507848454204",
    name: "legacy-giveaway",
    parentId: "1465900977256140905",
    readOnly: true,
  },
  {
    id: "1411547682333528145",
    name: "legacy-macros",
    parentId: "1465900977256140905",
    readOnly: true,
  },
  {
    id: "1411570010534449173",
    name: "raid-and-loot-policy",
    parentId: "1411616134356009021",
    readOnly: true,
  },
  {
    id: "1411616311477534803",
    name: "tools-and-addons",
    parentId: "1411616134356009021",
    readOnly: true,
  },
  {
    id: "1428013966176550962",
    name: "raid-preparation",
    parentId: "1411616134356009021",
    readOnly: true,
  },
  {
    id: "1411616667879997530",
    name: "class-guides",
    parentKey: "classes",
    readOnly: true,
  },
  {
    id: "1411617535966843000",
    name: "raid-guides",
    parentKey: "raids",
    readOnly: true,
  },
  {
    id: "1413355626699952228",
    name: "crafting-and-help",
    readOnly: true,
    topic:
      "Crafting and cooperative help. Read the pinned current policy, then create a tagged request. No RMT, account piloting, broker commissions or escrow.",
  },
  {
    id: "1468673171925241867",
    name: "dungeon-group-preparation",
    parentId: "1411616134356009021",
    readOnly: true,
    topic:
      "Prepare a dungeon group: game, levels, roles, quests, meeting point, finish time and loot agreement. Find groups in looking-for-group.",
  },
  {
    id: "1411615903434539140",
    name: "legacy-professions",
    parentId: "1465900977256140905",
    readOnly: true,
    topic:
      "Historical profession chat. Current requests and opt-in provider listings are in Crafting & Help. Old offers are not current availability.",
  },
  {
    id: "1460335792336666830",
    name: "legacy-tbc-services",
    parentId: "1465900977256140905",
    readOnly: true,
    topic:
      "Historical services, not current offers. Use Crafting & Help for legitimate crafting and looking-for-group for cooperative runs.",
  },
  { id: "1411606305751437332", name: "old-raids-classic" },
  { id: "1411611350701965322", name: "logs" },
  { id: "1424952957954166814", name: "gear-logs-check" },
];

export interface RevisionChannel {
  key: string;
  name: string;
  type: 0 | 4 | 15;
  parentId?: string;
  parentKey?: string;
  topic?: string;
  tags?: string[];
}
interface SpecGuide {
  name: string;
  path: string;
  role: "dps" | "tank" | "healer";
  advice: string;
}
interface ClassGuide {
  name: string;
  color: number;
  preparation: string;
  specs: SpecGuide[];
}
export const classGuides: ClassGuide[] = [
  {
    name: "Warrior",
    color: 0xc79c6e,
    preparation:
      "Keep a damage weapon and a separate tank set. Tell your group whether you are tanking or dealing damage; talent choice alone does not assign a raid role.",
    specs: [
      {
        name: "Arms",
        path: "arms",
        role: "dps",
        advice:
          "Plan around your weapon and rage. Use the current level-30 build below rather than a TBC Mortal Strike build; review the source's single-target and multi-target priorities separately.",
      },
      {
        name: "Fury",
        path: "fury",
        role: "dps",
        advice:
          "Compare weapon upgrades before changing your build. Follow the beta guide's rage priorities; dual-wielding alone does not establish that a weapon pair is an upgrade.",
      },
      {
        name: "Protection",
        path: "protection",
        role: "tank",
        advice:
          "Prepare a shield, use Sunder Armor and Revenge for threat, and plan Shield Block around incoming attacks. Gather casters safely and let the healer's mana determine the next pull.",
      },
    ],
  },
  {
    name: "Paladin",
    color: 0xf58cba,
    preparation:
      "Keep blessings and an aura active. Carry water, learn your dispel tools and agree the group's utility assignments. Tanking, healing and melee damage need different equipment.",
    specs: [
      {
        name: "Holy",
        path: "holy",
        role: "healer",
        advice:
          "Flash of Light is a smaller, cheaper heal; Holy Light covers larger damage. Holy Shock adds an instant option. Seek explicit healing bonuses: Intellect helps your mana pool but does not itself raise healing power.",
      },
      {
        name: "Protection",
        path: "protection",
        role: "tank",
        advice:
          "Use Righteous Fury and keep packs within Consecration. Line-of-sight caster pulls help the group stay together. Templar's Bulwark is a defensive tool; do not use beta damage performance as a reason to overpull.",
      },
      {
        name: "Retribution",
        path: "retribution",
        role: "dps",
        advice:
          "Maintain your seal, use Judgement and Holy Strike, and budget Consecration for multiple enemies. Start gear comparisons with your two-handed weapon; spell power can also benefit this beta toolkit.",
      },
    ],
  },
  {
    name: "Hunter",
    color: 0xabd473,
    preparation:
      "Bring ammunition and pet food, train your pet's abilities and complete your taming quest. Beta pet damage and Auto Shot behaviour include reported bugs; don't build permanent expectations around them.",
    specs: [
      {
        name: "Beast Mastery",
        path: "beast-mastery",
        role: "dps",
        advice:
          "Pet preparation is part of your damage setup. Check training and happiness before a run; control pulls with pet commands rather than leaving your companion to choose targets.",
      },
      {
        name: "Marksmanship",
        path: "marksmanship",
        role: "dps",
        advice:
          "Hunter's Mark and Serpent Sting prepare a target, then use the source's shot priority. Keep a trained pet: the current beta guide does not recommend assuming Lone Wolf wins at level 30.",
      },
      {
        name: "Survival",
        path: "survival",
        role: "dps",
        advice:
          "Check the current build's melee and ranged tools before choosing a playstyle. The source has inconsistent level wording around Strider Kick; verify the ability in your client instead of assuming access from the summary.",
      },
    ],
  },
  {
    name: "Rogue",
    color: 0xfff569,
    preparation:
      "Check weapon type, poisons and your chosen build together. Coordinate interrupts and crowd control; don't open a new pull while the tank or healer is recovering.",
    specs: [
      {
        name: "Assassination",
        path: "assassination",
        role: "dps",
        advice:
          "Use the current guide to check weapon requirements and poison interactions before spending on upgrades. Build combo points on the intended target, not one the group is about to crowd-control.",
      },
      {
        name: "Combat",
        path: "combat",
        role: "dps",
        advice:
          "Match weapon upgrades to your talent choices. Compare the guide's sustained-damage approach against your actual leveling needs, and keep defensive and interrupt tools available.",
      },
      {
        name: "Subtlety",
        path: "subtlety",
        role: "dps",
        advice:
          "Read opener and stealth guidance separately from sustained dungeon damage. A leveling build isn't automatically a battleground build; explain your goal when asking for a talent review.",
      },
    ],
  },
  {
    name: "Priest",
    color: 0xffffff,
    preparation:
      "Bring water, maintain your buffs and upgrade your wand while leveling. Pick equipment for the job: mana sustain, healing bonuses and spell damage aren't interchangeable.",
    specs: [
      {
        name: "Discipline",
        path: "discipline",
        role: "healer",
        advice:
          "Penance gives the level-30 build a distinct tool for an ally or enemy. Shielding and wand use help solo preparation. Prayer of Healing is expensive: save group healing for damage that warrants the mana.",
      },
      {
        name: "Holy",
        path: "holy",
        role: "healer",
        advice:
          "Choose healing spells for the damage actually coming in, not just the largest heal available. Keep a leveling wand and a dungeon-healing setup; use the linked build to compare your talent options.",
      },
      {
        name: "Shadow",
        path: "shadow",
        role: "dps",
        advice:
          "Check the beta's current damage priority and mana tools in the source. Tell the group when you are joining as damage; having healing spells doesn't mean you have signed up to be its healer.",
      },
    ],
  },
  {
    name: "Mage",
    color: 0x69ccf0,
    preparation:
      "Bring or conjure water, upgrade your wand and agree crowd-control targets. Match your mana spending to the pull size; reliable interrupts and safe control matter as much as damage.",
    specs: [
      {
        name: "Arcane",
        path: "arcane",
        role: "dps",
        advice:
          "Manage Arcane Blast stacks and use Missile Barrage when available. Do not assume Clearcasting's reported beta multi-target behaviour will persist; test mana sustain with your group's actual pulls.",
      },
      {
        name: "Fire",
        path: "fire",
        role: "dps",
        advice:
          "Use the linked level-30 build for your current fire tools and proc priorities. Keep a controlled single-target approach ready; a large damage pull is only useful when your tank and healer can support it.",
      },
      {
        name: "Frost",
        path: "frost",
        role: "dps",
        advice:
          "Frostbolt and Ice Lance interact with freezes and Fingers of Frost. Choose defensive talents for your content: the beta level cap forces trade-offs, and a dungeon setup is not automatically a PvP setup.",
      },
    ],
  },
  {
    name: "Warlock",
    color: 0x9482c9,
    preparation:
      "Bring soul shards, prepare Healthstones and agree a Soulstone target. Control your pet and avoid Fear paths that bring extra packs. Warn the healer before heavy Life Tap use.",
    specs: [
      {
        name: "Affliction",
        path: "affliction",
        role: "dps",
        advice:
          "Match damage-over-time spending to how long enemies live. Keep sustain and pet control in the plan; a long solo encounter and a fast dungeon pack need different decisions.",
      },
      {
        name: "Demonology",
        path: "demonology",
        role: "dps",
        advice:
          "The current guide centres on pet damage and Demonic Brand applied through Searing Pain. Check that talent before expecting a Succubus to hold threat; choose safer pet tools for dangerous enemies.",
      },
      {
        name: "Destruction",
        path: "destruction",
        role: "dps",
        advice:
          "Compare the source's current cast priorities with your spell ranks and mana budget. Prepare a safe pet and a defensive option before pursuing burst damage in a leveling group.",
      },
    ],
  },
  {
    name: "Druid",
    color: 0xff7d0a,
    preparation:
      "Feral is one talent specialization with two group roles. Keep tank, cat, caster and healing equipment distinct, and choose the role you can actually fulfil on each event.",
    specs: [
      {
        name: "Balance",
        path: "balance",
        role: "dps",
        advice:
          "Check the current beta spell priority and mana costs rather than copying a TBC caster build. Keep healing and control available without abandoning your assigned damage role.",
      },
      {
        name: "Feral damage",
        path: "feral",
        role: "dps",
        advice:
          "Use the cat-damage reference below, not the bear-tanking one. Compare equipment for your form and practice your current energy/combo-point tools before the group starts.",
      },
      {
        name: "Feral tank",
        path: "feral",
        role: "tank",
        advice:
          "Use the bear reference and prepare tank equipment. Plan pulls, threat and defensive tools with the healer; a cat signup is not a tank signup even when the talent tree is shared.",
      },
      {
        name: "Restoration",
        path: "restoration",
        role: "healer",
        advice:
          "Budget healing-over-time and direct heals around incoming damage. Bring water and compare explicit healing bonuses with mana sustain; don't assume caster damage equipment is your best healing set.",
      },
    ],
  },
  {
    name: "Shaman",
    color: 0x0070de,
    preparation:
      "Keep totem quests and training current. Bring water and coordinate buffs with the party. Select your actual tank/healer/damage assignment separately from class interests.",
    specs: [
      {
        name: "Elemental",
        path: "elemental",
        role: "dps",
        advice:
          "Watch the beta build's mana costs before committing to long caster pulls. Use the current guide to compare talents and totems; don't spend on a presumed level-60 raid BiS list.",
      },
      {
        name: "Enhancement",
        path: "enhancement",
        role: "dps",
        advice:
          "Check weapon, imbue and melee priorities in the linked guide. Keep utility available and coordinate totem placement so it supports the group without pulling another pack.",
      },
      {
        name: "Restoration",
        path: "restoration",
        role: "healer",
        advice:
          "Plan your mana recovery, Water Shield and totem choices before the pull. Ask the host which group you support and use the beta healing reference rather than TBC raid assumptions.",
      },
    ],
  },
];
export const newRevisionChannels: RevisionChannel[] = [
  { key: "classes", name: "Class Guides", type: 4 },
  { key: "raids", name: "Raid Guides", type: 4 },
  {
    key: "application-forever",
    name: "forever-application",
    type: 0,
    parentId: "1548517693957869619",
    topic:
      "Apply to KFC for WoW Forever: EU, Alliance, PvP, English. Read the pinned template and DM KFC Management privately. For a simple in-game invite, use guild-invite.",
  },
  ...classGuides.map((guide): RevisionChannel => ({
    key: guide.name.toLowerCase(),
    name: guide.name.toLowerCase(),
    type: 0,
    parentKey: "classes",
    topic: `WoW Forever ${guide.name}: ${guide.specs.map((s): string => s.name).join(", ")}. Level-30 beta quick reference; check the review date before using a build.`,
  })),
  ...["hyjal", "barrow-deeps", "onyxia"].map((raid): RevisionChannel => ({
    key: `forever-${raid}`,
    name: `forever-${raid}`,
    type: 0,
    parentKey: "raids",
    topic:
      "WoW Forever raid planning and sources. Not a TBC encounter guide. Boss tactics and loot require current test evidence.",
  })),
  ...["black-temple", "hyjal"].map((raid): RevisionChannel => ({
    key: `tbc-${raid}`,
    name: `tbc-${raid}`,
    type: 0,
    parentKey: "raids",
    topic:
      "TBC encounter and attunement references. Follow your event's current requirements and loot rules.",
  })),
  {
    key: "crafting",
    name: "crafting-requests",
    type: 15,
    parentId: "1411614900861800589",
    topic:
      "Create a request or opt-in provider listing.\nTitle: [TBC/Forever] Item or service - profession\nCharacter, faction, region/realm/ruleset:\nItem link and quantity:\nMaterials supplied / returned:\nFee: free or agreed in-game gold (no cash)\nAvailability, timezone, deadline:\nContact in this thread; status: Open / Fulfilled / Withdrawn.\nProvider listings must include a last-confirmed date; reconfirm every 30 days. Staff Reviewed checks listing clarity, not a trade guarantee.\nNo RMT, account sharing, piloting, cheats, prohibited loot auctions, brokers or escrow. Disputes: privately DM KFC Management, not public accusations.",
    tags: [
      "TBC",
      "Forever",
      "Request",
      "Provider",
      "Crafting",
      "Enchanting",
      "Consumables",
      "Camping",
      "Other",
      "Open",
      "Fulfilled",
      "Withdrawn",
      "Reviewed",
    ],
  },
];

export interface ResourcePayload {
  content: string;
  allowed_mentions: { parse: string[] };
  embeds: {
    title: string;
    description: string;
    color: number;
    footer: { text: string };
    thumbnail?: { url: string };
    image?: { url: string };
  }[];
}
export interface RevisionResource {
  key: string;
  channelId: string;
  payload: ResourcePayload;
  legacyKey?: string;
}
export function specUrl(className: string, spec: SpecGuide): string {
  return `https://www.wowhead.com/forever/guide/classes/${className.toLowerCase()}/${spec.path}/level-30-${spec.role}-overview`;
}
export function revisionResources(
  ids: Record<string, string>,
): RevisionResource[] {
  function id(key: string): string {
    if (!ids[key]) throw new Error(`Missing revision destination: ${key}`);
    return ids[key];
  }
  function resource(
    key: string,
    channelId: string,
    title: string,
    description: string,
    color = 0x8bbd73,
    image?: string,
  ): RevisionResource {
    const payload: ResourcePayload = {
      content: "",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title,
          description,
          color,
          footer: {
            text: `Maintained reference | Reviewed 9 October 2026 | ${revision}`,
          },
          ...(image ? { image: { url: image } } : {}),
        },
      ],
    };
    if (title.length > 256 || description.length > 4096)
      throw new Error("Guide exceeds Discord embed limits.");
    return { key, channelId, payload };
  }
  const oldIds = {
    calendar: "1557974287602819164",
    introductions: "1557974290165661809",
    help: "1557974292854083615",
    raidChat: "1557974295651557436",
    lfg: "1557974298805805066",
    start: "1557974301095755900",
    pvp: "1557974303432118272",
  };
  const resources = kfcResources(oldIds)
    .filter((r): boolean => r.key !== "calendar")
    .map((r): RevisionResource => ({
      ...resource(
        r.key === "conduct" ? "rules" : r.key,
        r.channelId,
        r.title,
        r.description,
      ),
      ...(r.key === "conduct" ? {} : { legacyKey: r.key }),
    }));
  const tbcApplication = "1411545946155909150";
  const foreverApplication = id("application-forever");
  resources.find(
    (r): boolean => r.key === "welcome",
  )!.payload.embeds[0].description +=
    `\n\n**Join the guild**\n<#${tbcApplication}> - TBC\n<#${foreverApplication}> - WoW Forever\nRead the matching template and send it privately to KFC Management. Guild applications are separate from public event signups.`;
  resources.find(
    (r): boolean => r.key === "joining",
  )!.payload.embeds[0].description =
    `**Two games. One welcoming guild community.**\nKFC brings together raiders, social players and PvPers who enjoy good company and a relaxed atmosphere.\n\n**Experienced hosts. Flexible schedules.**\nWe've hosted nearly 500 TBC raids, with guild members organising runs throughout the week. Choose the groups that suit your schedule and enjoy the game together.\n\n**Choose your game**\n<#${tbcApplication}> - TBC guild applications; include your realm, character and what you enjoy playing.\n<#${foreverApplication}> - WoW Forever guild applications: EU, Alliance, PvP, English. New and returning players are welcome.\n\nRead the matching channel's pinned template, then DM a member of KFC Management from the member list. Applications stay private; no passwords or personal documents. For a simple Forever in-game invite, post your character name in <#1550970060812587028>.\n\n**Looking for a run instead?**\nCheck <#1557974287602819164> for upcoming events. Each signup has the host's times, requirements and loot rules. You don't need to join the guild to take part in an open run.\n\nhttps://kfcguild.online/`;
  resources.push(
    resource(
      "application-tbc",
      tbcApplication,
      "Join KFC | The Burning Crusade",
      `**Raids, PvP and good company**\nTell us what you enjoy and we'll help you find the right part of the guild. Social players and public raiders are welcome; joining the guild and earning a specific raid seat are different things.\n\n**Apply privately**\nOpen the server member list and DM a member of **KFC Management**. Copy this short template:\n\n**Game:** TBC\n**Character, level, realm and faction:**\n**Class, spec and preferred role:**\n**Looking for:** social / PvP / raids\n**Usual availability and timezone:**\n**For raiding:** experience, preparation and relevant access/attunements; questions or learning goals are welcome.\n\nNo fixed attendance promise is required just to introduce yourself. Officers confirm guild fit and the host confirms each event's requirements. Never send passwords, real-world documents or unrelated personal information.\n\n**Only here for a public run?**\nUse <#1557974287602819164> and the event's signup; a guild application isn't required.\n\n**Playing Forever instead?**\nUse <#${foreverApplication}>. Earlier applications remain below as history; new applications go privately to Management.`,
      0x79b55b,
    ),
    resource(
      "application-forever",
      foreverApplication,
      "Join KFC | WoW Forever",
      `**EU | Alliance | PvP | English**\nA relaxed guild for raiders, social players and PvPers. New and returning players are welcome; flexible availability is fine.\n\n**Apply privately**\nOpen the server member list and DM a member of **KFC Management**. Copy this short template:\n\n**Game:** WoW Forever\n**Character name and current level, or planned character:**\n**Class, spec and preferred role:**\n**Looking for:** social / PvP / leveling / raids when available\n**Usual availability and timezone:**\n**Anything you'd like help with:**\n\nConfirm you're joining our EU Alliance PvP community. Future raid places depend on the event and roster; an application is not a guaranteed seat. Never send passwords, real-world documents or unrelated personal information.\n\n**Just need an in-game invite?**\nPost your character name in <#1550970060812587028>. Keep that request to game details only.\n\n**Find people to play with**\n<#1548519535177629707> - Forever discussion\n<#1548747530790248610> - leveling groups\n<#1557974287602819164> - upcoming events\n\n**Playing TBC instead?**\nUse <#${tbcApplication}>. This is KFC's guild application, not admission to the separate open-faction Forever community server.`,
      0x4ca89b,
    ),
  );
  const classIndex = resources.find((r): boolean => r.key === "class")!;
  classIndex.payload.embeds[0].description = `**Choose your class**\n${classGuides.map((g): string => `<#${id(g.name.toLowerCase())}> - ${g.specs.map((s): string => s.name).join(" / ")}`).join("\n")}\n\n**WoW Forever | Level 30 beta | Patch 1.60.1**\nOriginal quick references with links to current spec builds and gear tables. These are not level-60 rankings.\n\nAsk in <#1557974292854083615> with your level, spec and goal. Report a correction with your client build and evidence; interest roles never grant guild or staff access.\n\nTBC class advice belongs in <#1557974295651557436>; don't apply these Forever builds to TBC.`;
  for (const guide of classGuides) {
    const description = `**WoW Forever | Level 30 beta | Patch 1.60.1**\n${guide.preparation}\n\n${guide.specs.map((s): string => `**${s.name} - ${s.role === "dps" ? "Damage" : s.role === "tank" ? "Tank" : "Healer"}**\n${s.advice}\n[Build, priorities and gear](${specUrl(guide.name, s)})`).join("\n\n")}\n\n**Before buying gear**\nCompare role, required level, binding and the source's quest/dungeon/crafted tables. Test upgrades in your client; beta bugs and tuning can change the answer.\n\n**Get help**\n<#1557974292854083615> - include level, spec, goal and build. These are source-based starting points, not independently tested endgame recommendations.`;
    const item = resource(
      `class-${guide.name.toLowerCase()}`,
      id(guide.name.toLowerCase()),
      `${guide.name} | Choose your path`,
      description,
      guide.color,
    );
    item.payload.embeds[0].thumbnail = {
      url: `https://www.wowforeverdiscord.online/images/raids/icons/classicon_${guide.name.toLowerCase()}.jpg`,
    };
    resources.push(item);
  }
  const official =
    "https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap";
  const raidHub =
    "https://www.wowhead.com/forever/guide/raids-overview-hub-dates-locations";
  for (const [key, title, fact, asset] of [
    [
      "forever-hyjal",
      "Forever | Hyjal",
      "Blizzard's recap describes a 20-player raid and a December 9 unlock. This is Forever's Hyjal, not the TBC wave encounter.",
      "hyjal-summit",
    ],
    [
      "forever-barrow-deeps",
      "Forever | Barrow Deeps",
      "Blizzard's recap describes a 10-player raid and a December 9 unlock. Plan a group of that scale, but wait for current encounter evidence before making boss assignments.",
      "barrow-deeps",
    ],
    [
      "forever-onyxia",
      "Forever | Onyxia",
      "Wowhead's current raid hub lists a 40-player Onyxia raid. Treat that as source-reported planning information, not independent confirmation of final encounters, rewards or access requirements.",
      "onyxias-lair",
    ],
  ] as const)
    resources.push(
      resource(
        key,
        id(key),
        title,
        `**WoW Forever | Preparation, not boss tactics**\n${fact}\n\n**Build a useful group now**\n- Agree start and finish, host and attendance expectations.\n- Recruit actual tank/healer/damage roles and identify backups.\n- Check voice, addons and consumables against the released client.\n- Publish loot mode, every HR item, SR allowance and deadline before signup.\n\n**Not yet established here**\nFinal loot, attunement requirements, role counts and boss strategies. Don't spend on an assumed BiS list or reuse another edition's mechanics.\n\n[Official recap](${official}) | [Raid overview](${raidHub})\nFind real runs in <#1557974287602819164>; discuss preparation in <#1557974295651557436>.`,
        0x4ca89b,
        `https://www.wowforeverdiscord.online/images/raids/events/${asset}.webp`,
      ),
    );
  for (const [key, title] of [
    ["tbc-black-temple", "TBC | Black Temple"],
    ["tbc-hyjal", "TBC | Hyjal Summit"],
  ] as const)
    resources.push(
      resource(
        key,
        id(key),
        title,
        `**The Burning Crusade | Existing guild references**\n[Encounter guide](https://kfcguild.online/guides/${key === "tbc-hyjal" ? "hyjal-summit" : "black-temple"}-raid-guide-tbc-classic) | [Attunement reference](https://kfcguild.online/guides/${key === "tbc-hyjal" ? "hyjal-summit" : "black-temple"}-attunement-guide-tbc-classic)\nSelect the TBC guide for this raid; Forever Hyjal is a different raid.\n\n**Before signup**\n- Read the current event's access, preparation and loot requirements. Phase-specific attunement rules can change.\n- Check the host's assignments and resistance/equipment requirements.\n- Confirm your role, start/finish and voice availability.\n- Review named HR items and submit SRs before its deadline.\n\nCheck <#1557974287602819164> for current runs. Existing runs retain their original agreements. Questions: <#1557974295651557436>.`,
        0xc79c6e,
        `https://kfcguild.online/images/guides/${key === "tbc-hyjal" ? "hyjal-summit-archimonde.jpg" : "black-temple-attunement.avif"}`,
      ),
    );
  resources.find(
    (r): boolean => r.key === "guides",
  )!.payload.embeds[0].description =
    `**WoW Forever - raid planning**\n<#${id("forever-hyjal")}> / <#${id("forever-barrow-deeps")}> / <#${id("forever-onyxia")}>\nPreparation and current source links; no invented unreleased tactics.\n\n**TBC - encounter and attunement references**\n<#${id("tbc-black-temple")}> / <#${id("tbc-hyjal")}>\n[KFC guide library](https://kfcguild.online/guides). Your host's published requirements take precedence over historical phase instructions.\n\nChoose the game first: the two Hyjal resources are not interchangeable.`;
  resources.push(
    resource(
      "crafting-policy",
      "1413355626699952228",
      "Crafting & Help | Clear terms, fair exchanges",
      `Find a crafter, request an item or offer your own current profession skills in <#${id("crafting")}>. No profession role or old post guarantees recipe ownership or availability.\n\n**A good request**\nInclude game, character, faction/realm/ruleset, profession, item link, quantity, materials, fee and availability with timezone. Agree materials returned and the fee before trading. Check whether the finished item is tradable.\n\n**Keep the board useful**\nUse game, Request/Provider, service and status tags. Mark Fulfilled or Withdrawn when done. Providers opt in themselves and reconfirm availability every 30 days; older listings aren't current availability. Reviewed is staff-only and checks listing clarity, not a guarantee of the exchange.\n\n**Our boundary**\nNo real-money trading, account sharing/piloting, cheats, prohibited loot auctions, boosting brokers, commission matchmaking or escrow. Ordinary raid seats and cooperative leveling belong in the group channels, not a service marketplace. Follow the applicable Blizzard edition/realm policies.\n\n**A problem with an exchange?**\nDM KFC Management privately with the post link and relevant evidence. Do not publish accusations or unrelated personal information.\n\n[Current TBC Anniversary services policy](https://us.forums.blizzard.com/en/wow/t/in-game-advertising-services-channel-in-burning-crusade-classic-anniversary/2238861/). Earlier messages below are historical instructions, not the current policy.`,
    ),
  );
  resources.push(
    resource(
      "dungeon-preparation",
      "1468673171925241867",
      "Dungeon groups | Ready before the first pull",
      "**Post a clear plan**\nGame, dungeon or quest route, character levels, faction/realm/ruleset, start and finish with timezone, host and roles needed. Include whether beginners are welcome.\n\n**Get ready together**\nCollect relevant quests, repair, bring water/food and check the group's meeting point. Agree the tank's pull pace, healer breaks, interrupts and crowd control.\n\n**Avoid surprises**\nPublish the loot agreement before starting; name reserved items. Agree what happens if someone leaves or needs a replacement.\n\n**Find a group**\n<#1557974298805805066> for quick requests; <#1548747530790248610> for Forever leveling. Use the event post for Signup, Tentative or Absent when an event exists. Don't promise another edition's XP rates or untested beta strategies.",
    ),
  );
  return resources;
}
