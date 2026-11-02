export const classLabRelease = "kfc-class-labs-20261031-v1";
export const classLabGuildId = "1411533815356194968";
export const classLabBotId = "1554796912673169428";
export const classLabCategoryId = "1558000477210148915";
export const classLabDiscussionId = "1548519535177629707";
export const classLabIndex = {
  channelId: "1411616667879997530",
  messageId: "1557974393433489429",
} as const;

const tools = "https://kfcguild.online/tools/forever";
const guides = "https://www.wowforeverdiscord.online/guides";

export interface ClassLabLink {
  readonly label: string;
  readonly url: string;
}

export interface ClassLab {
  readonly slug: string;
  readonly name: string;
  readonly channelId: string;
  readonly messageId: string;
  readonly color: number;
  readonly introduction: string;
  readonly focus: string;
  readonly experiment: string;
  readonly question: string;
  readonly roleLinks: readonly ClassLabLink[];
  readonly extraLinks?: readonly ClassLabLink[];
}

const sim = (slug: string): string => `${tools}/simulator/${slug}`;

export const classLabs: readonly ClassLab[] = [
  {
    slug: "warrior",
    name: "Warrior",
    channelId: "1558000488459407411",
    messageId: "1558001254976978945",
    color: 0xc69b6d,
    introduction:
      "Arms, dual-wield Fury, two-handed Fury or a shield? Start with the build you actually want to play, then work out which gear and priorities support it.",
    focus:
      "Our damage guide explains the recorded stance changes, rage thresholds, Overpower and execute decisions. The tank simulator is separate: threat and incoming damage matter there, not just DPS.",
    experiment:
      "Compare one weapon upgrade in your current damage build before changing talents. Keep buffs and the encounter fixed. A weapon-plus-respec comparison answers a different question.",
    question:
      "Arms, dual-wield Fury or two-handed Fury at 60? Which weapon are you planning around? Tanks: what would make you trade some threat for a sturdier set?",
    roleLinks: [
      { label: "Damage", url: sim("warrior") },
      { label: "Protection", url: sim("tank-warrior") },
    ],
  },
  {
    slug: "paladin",
    name: "Paladin",
    channelId: "1558000490929721355",
    messageId: "1558001275612696627",
    color: 0xf48cba,
    introduction:
      "Ret, Prot and Holy need different answers. We now have a place to compare all three without treating a Holy damage build as a healing recommendation.",
    focus:
      "The damage notebook covers Retribution and Shockadin with their own seals, Judgements and mana rules. Protection has its own threat/survival model; Holy has a separate healing engine and assignment controls.",
    experiment:
      "For damage, compare complete weapon and off-hand packages. For healing, keep the assignment and recipients fixed. For tanking, inspect both threat and incoming damage before calling an item an upgrade.",
    question:
      "What is your main role at 60, and what will you keep as an off-spec? Post one gear or talent decision you are genuinely undecided on. Ret, Prot and Holy are all welcome here.",
    roleLinks: [
      { label: "Retribution", url: sim("retribution-paladin") },
      { label: "Protection", url: sim("protection-paladin") },
      { label: "Holy", url: sim("healing-paladin") },
    ],
    extraLinks: [
      {
        label: "Protection starter guide",
        url: `${guides}/wow-forever-protection-paladin-starter-kit`,
      },
    ],
  },
  {
    slug: "hunter",
    name: "Hunter",
    channelId: "1558000493093982208",
    messageId: "1558001286895636583",
    color: 0xaad372,
    introduction:
      "Beast Mastery, Marksmanship and Survival are all in our build notebook. Pet setup and positioning are part of the build, not footnotes to the damage number.",
    focus:
      "The recorded Survival reference is melee, while the other two recorded scenarios use ranged positioning. The guide includes the exact pet, equipment, talents and action priorities behind each saved setup.",
    experiment:
      "Try a weapon upgrade with the pet and encounter unchanged. When comparing specs, show the pet contribution and position too; a stationary melee result is not proof of equal uptime on every boss.",
    question:
      "BM, MM or melee Survival for your first level-60 groups? What pet or weapon is central to your plan, and which part would you like another hunter to sanity-check?",
    roleLinks: [{ label: "All Hunter damage builds", url: sim("hunter") }],
  },
  {
    slug: "rogue",
    name: "Rogue",
    channelId: "1558000496126464010",
    messageId: "1558001300287782933",
    color: 0xfff468,
    introduction:
      "Combat, Mutilate and Subtlety each have their own priorities. Your weapons, poisons and finishers need to agree with the build you choose.",
    focus:
      "The guide separates initial Slice and Dice from its refresh rules, preserves combo-point and energy conditions, and explains the positioning and stealth assumptions behind the recorded rotations.",
    experiment:
      "Compare two weapon pairs without silently changing poisons or target position. Then test a finisher or talent change separately so you can tell what actually helped.",
    question:
      "Daggers, swords or something else at 60? Share your talent plan and two weapons you are choosing between. What keeps you on Combat, Mutilate or Subtlety?",
    roleLinks: [{ label: "All Rogue damage builds", url: sim("rogue") }],
  },
  {
    slug: "priest",
    name: "Priest",
    channelId: "1558000498492047452",
    messageId: "1558001310836588576",
    color: 0xffffff,
    introduction:
      "Shadow, Smite and healing have separate tools now. Smite is a damage profile; actual healing comparisons use the healing engine, not a DPS result with Holy talents.",
    focus:
      "The damage guide explains each profile's upkeep, mana recovery and saved cast conditions. Healers can compare tank healing, group healing and burst recovery, including useful healing and consumed absorbs.",
    experiment:
      "Damage: compare the full encounter, not only the opening burst. Healing: hold incoming damage, recipients and buffs constant, then look at survival and mana alongside useful healing.",
    question:
      "Healing, Shadow or Smite for your level-60 group? Which talent or casting choice are you least sure about? Healers: are you building for the tank, the party or burst recovery?",
    roleLinks: [
      { label: "Shadow", url: sim("shadow-priest") },
      { label: "Smite damage", url: sim("smite-priest") },
      { label: "Healing", url: sim("healing-priest") },
    ],
  },
  {
    slug: "mage",
    name: "Mage",
    channelId: "1558000501029605476",
    messageId: "1558001337957093437",
    color: 0x3fc7eb,
    introduction:
      "Arcane, Fire and Frost are more than three labels on a tier list. The interesting choices are in the talents, proc conditions, mana plan and equipment that make each setup work.",
    focus:
      "Our guide exposes the recorded single-target priorities and explains how to read their proc and aura conditions. The dungeon starter guide separately covers control and group preparation.",
    experiment:
      "Compare a staff against a complete one-hand/off-hand package in the same setup. Keep fight length and mana support fixed; a short burst result does not answer a sustained-damage question.",
    question:
      "Arcane, Fire or Frost for your first level-60 runs? Show the build you are leaning toward and one staff or weapon/off-hand choice you want to compare. What would make you switch spec?",
    roleLinks: [{ label: "All Mage damage builds", url: sim("mage") }],
    extraLinks: [
      {
        label: "Dungeon starter guide",
        url: `${guides}/wow-forever-mage-dungeon-starter-kit`,
      },
    ],
  },
  {
    slug: "warlock",
    name: "Warlock",
    channelId: "1558000504137842732",
    messageId: "1558001353006121070",
    color: 0x8788ee,
    introduction:
      "Affliction, Demonology, Destruction and DS/Ruin have different saved setups. Pets, sacrifice choices, weapon stones and mana recovery belong in the comparison.",
    focus:
      "The guide includes exact talent allocations, equipment and recorded action priorities. An active-demon build and a sacrifice build should not be compared as though the pet settings were identical.",
    experiment:
      "Test one gear change while keeping pet/sacrifice, weapon stone and mana policy fixed. If changing the whole build, show both complete setups instead of attributing the result to one talent.",
    question:
      "Which build and demon are you taking toward 60? If you are torn between keeping a pet and sacrificing it, what matters most to your group besides the single-target number?",
    roleLinks: [{ label: "All Warlock damage builds", url: sim("warlock") }],
  },
  {
    slug: "druid",
    name: "Druid",
    channelId: "1558000506327011351",
    messageId: "1558001378004045988",
    color: 0xff7c0a,
    introduction:
      "Bear, cat, Balance and Restoration all have a route into the tools. Feral is one talent tree with two different jobs; a cat damage result is not a bear survival result.",
    focus:
      "The damage notebook includes the recorded Balance and Feral setups. Bear has a separate threat/incoming-damage model, and Restoration has its own healing engine. Each role needs its own equipment and assumptions.",
    experiment:
      "Compare an item or talent change within one role first. Bears: inspect threat and damage taken together. Healers: keep the assignment fixed and compare useful healing, survival and mana.",
    question:
      "Bear, cat, moonkin or heals for the first level-60 groups, and are you planning to cover two jobs? Share the build you would actually bring to a five-player premade and one compromise you are considering.",
    roleLinks: [
      { label: "Balance", url: sim("balance-druid") },
      { label: "Feral damage", url: sim("feral-druid") },
      { label: "Feral tank", url: sim("feral-tank-druid") },
      { label: "Restoration", url: sim("healing-druid") },
    ],
    extraLinks: [
      {
        label: "Feral tank starter guide",
        url: `${guides}/wow-forever-feral-tank-starter-kit`,
      },
    ],
  },
  {
    slug: "shaman",
    name: "Shaman",
    channelId: "1558000514099060846",
    messageId: "1558001390033436716",
    color: 0x0070dd,
    introduction:
      "Elemental, Enhancement and Restoration have separate tools. Build the comparison around your role, totems, equipment and party support rather than one class-wide score.",
    focus:
      "The damage guide keeps Elemental and Enhancement's recorded priorities and equipment together. Restoration uses its own healing model; the shared healer comparison offers tank, group and burst assignments.",
    experiment:
      "For damage, keep imbues, totems, support and position fixed when testing an upgrade. For healing, compare the same incoming damage and recipients, and include mana and survival with useful HPS.",
    question:
      "Elemental, Enhancement or Restoration in your level-60 premade? Which totem or utility choice would you keep even if it costs a little personal output? Post the setup you want to compare.",
    roleLinks: [
      { label: "Elemental", url: sim("elemental-shaman") },
      { label: "Enhancement", url: sim("enhancement-shaman") },
      { label: "Restoration", url: sim("healing-shaman") },
    ],
  },
];

export interface ClassLabMessage {
  content: string;
  allowed_mentions: { parse: []; users: []; roles: []; replied_user: false };
  embeds: {
    title: string;
    description: string;
    color: number;
    thumbnail?: { url: string };
    fields: { name: string; value: string; inline: false }[];
    footer: { text: string };
  }[];
  components: {
    type: 1;
    components: { type: 2; style: 5; label: string; url: string }[];
  }[];
}

export function classLabUrl(lab: ClassLab): string {
  return `${guides}/wow-forever-${lab.slug}-dps-guide`;
}

export function classLabSimulator(lab: ClassLab): string {
  return `${tools}/simulator?class=${lab.slug}#simulator-profiles`;
}

export function classLabThreadName(lab: ClassLab): string {
  return `${lab.name} | Level 60 builds and gear`;
}

export function classLabMessage(
  lab: ClassLab,
  threadId: string,
): ClassLabMessage {
  if (!/^[1-9]\d{16,19}$/.test(threadId))
    throw new Error("Invalid class discussion identity");
  const links = lab.roleLinks.map(
    (link): string => `[${link.label}](${link.url})`,
  );
  links.push(`[Talent calculator](${tools}/encyclopedia/talents/${lab.slug})`);
  const fields = [
    { name: "What is in the guide?", value: lab.focus, inline: false as const },
    {
      name: "Choose your role",
      value: links.join(" | "),
      inline: false as const,
    },
    {
      name: "Try one useful comparison",
      value: lab.experiment,
      inline: false as const,
    },
  ];
  if (lab.extraLinks?.length)
    fields.push({
      name: "Starting out?",
      value: lab.extraLinks
        .map((link): string => `[${link.label}](${link.url})`)
        .join(" | "),
      inline: false,
    });
  fields.push({ name: "Bring your build", value: lab.question, inline: false });
  return {
    content: "",
    allowed_mentions: { parse: [], users: [], roles: [], replied_user: false },
    embeds: [
      {
        title: `${lab.name} | Level 60 build lab`,
        description: `${lab.introduction}\n\nOur own [damage guide](${classLabUrl(lab)}) includes talents, recorded rotations and equipment. Pick the role-specific tools below for your comparison.`,
        color: lab.color,
        thumbnail: {
          url: `https://kfcguild.online/tools/wow-assets/classes/${lab.slug}.jpg`,
        },
        fields,
        footer: {
          text: "Open source contributors | Forever beta models, not live logs | Links checked 31 Oct 2026",
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "DPS guide", url: classLabUrl(lab) },
          {
            type: 2,
            style: 5,
            label: "Simulator",
            url: classLabSimulator(lab),
          },
          {
            type: 2,
            style: 5,
            label: "Discuss",
            url: `https://discord.com/channels/${classLabGuildId}/${threadId}`,
          },
        ],
      },
    ],
  };
}

export function classLabThreadStarter(lab: ClassLab): string {
  return `**${lab.name}: what are you taking to 60?**\n\n${lab.question}\n\nA talent or saved-setup link and your intended role is enough to start. If you have two items or builds in mind, post both.\n\nSharing numbers? Include the gear, buffs, target count, fight length and model/version. Keep Solo and Raid separate; healer assignments and tank survival need their own context. Real client observations are welcome too: include the build and what you saw.\n\n[Open the class resources](https://discord.com/channels/${classLabGuildId}/${lab.channelId}/${lab.messageId})`;
}

export function classLabIndexMessage(): ClassLabMessage {
  return {
    content: "",
    allowed_mentions: { parse: [], users: [], roles: [], replied_user: false },
    embeds: [
      {
        title: "Your class at 60 | Guides, builds and discussion",
        description: `Our level-60 workbench is now the starting point here: original class guides with talent explanations, recorded rotations and equipment, plus tools for damage, tanking and healing.\n\n**Choose your class**\n${classLabs.map((lab): string => `<#${lab.channelId}> - ${lab.name}`).join("\n")}\n\nEach guide has a **Discuss** button leading to its class thread in <#${classLabDiscussionId}>. The guide channels remain reference shelves; discussion lives in the threads.`,
        color: 0xd7913a,
        fields: [
          {
            name: "Read, then try your own setup",
            value: `[All class guides](${guides}) | [Choose your class and simulate](${tools}/simulator)\nEach class post also links its own talent calculator.`,
            inline: false,
          },
          {
            name: "Compare the right thing",
            value: `[Raid DPS](${tools}/tier-list) | [Solo DPS](${tools}/tier-list/solo)\n[Raid tanks](${tools}/tier-list/tanks) | [Dungeon tanks](${tools}/tier-list/tanks/solo) | [Healers](${tools}/tier-list/healers)`,
            inline: false,
          },
          {
            name: "What the results mean",
            value:
              "Guides keep their original benchmark dates; a current simulator may use a newer model. Check both versions. Compare the same gear, buffs, targets and duration. Tank and healer results need their own metrics and assignments. These are beta models, not live combat logs or raid-slot requirements.",
            inline: false,
          },
          {
            name: "TBC is separate",
            value:
              "These nine class labs cover WoW Forever. Keep TBC builds and mechanics in the TBC channels; shared spell names do not make the versions interchangeable.",
            inline: false,
          },
        ],
        footer: {
          text: "Open source contributors | Resources checked 31 Oct 2026 | No fixed DPS promises",
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "Class guides", url: guides },
          { type: 2, style: 5, label: "Simulators", url: `${tools}/simulator` },
          {
            type: 2,
            style: 5,
            label: "Class channels",
            url: `https://discord.com/channels/${classLabGuildId}/${classLabIndex.channelId}`,
          },
        ],
      },
    ],
  };
}

export function classLabAnnouncement(): string {
  return `We have refreshed all nine class-guide channels with our own **level-60 guides, talent calculators and simulators**, including separate tank and healer tools. Each class now has a **Discuss** button linking to a build thread.\n\n**What are you planning to play at 60?** Pick your class in <#${classLabIndex.channelId}> and share a talent plan, two upgrades you are choosing between, or the role you want to bring to your first groups. No polished spreadsheet needed.\n\nThe guide benchmarks keep their dates, and Solo, Raid, tank and healer comparisons have different assumptions. Treat them as a starting point to test and discuss, not a promise of live performance.`;
}
