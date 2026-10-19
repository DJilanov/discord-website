import {
  specializationMatchesClass,
  type ClassName,
  type Specialization,
} from "./specializations";

interface ClassArtwork {
  color: string;
  icon: string;
  specs: Partial<Record<Specialization, string>>;
}

export const classArtwork: Record<ClassName, ClassArtwork> = {
  Warrior: {
    color: "#c79c6e",
    icon: "classicon_warrior",
    specs: {
      Arms: "ability_warrior_savageblow",
      Fury: "ability_warrior_innerrage",
      Protection: "ability_warrior_defensivestance",
    },
  },
  Paladin: {
    color: "#f58cba",
    icon: "classicon_paladin",
    specs: {
      Holy: "spell_holy_holybolt",
      Protection: "spell_holy_devotionaura",
      Retribution: "spell_holy_auraoflight",
    },
  },
  Hunter: {
    color: "#abd473",
    icon: "classicon_hunter",
    specs: {
      "Beast Mastery": "ability_hunter_beasttaming",
      Marksmanship: "ability_marksmanship",
      Survival: "ability_hunter_swiftstrike",
    },
  },
  Rogue: {
    color: "#fff569",
    icon: "classicon_rogue",
    specs: {
      Assassination: "ability_rogue_eviscerate",
      Combat: "ability_backstab",
      Subtlety: "ability_stealth",
    },
  },
  Priest: {
    color: "#ffffff",
    icon: "classicon_priest",
    specs: {
      Discipline: "spell_holy_wordfortitude",
      Holy: "spell_holy_holybolt",
      Shadow: "spell_shadow_shadowwordpain",
    },
  },
  Shaman: {
    color: "#70a9ff",
    icon: "classicon_shaman",
    specs: {
      Elemental: "spell_nature_lightning",
      Enhancement: "spell_nature_lightningshield",
      Restoration: "spell_nature_magicimmunity",
    },
  },
  Mage: {
    color: "#69ccf0",
    icon: "classicon_mage",
    specs: {
      Arcane: "spell_holy_magicalsentry",
      Fire: "spell_fire_firebolt02",
      Frost: "spell_frost_frostbolt02",
    },
  },
  Warlock: {
    color: "#b3a2e2",
    icon: "classicon_warlock",
    specs: {
      Affliction: "spell_shadow_deathcoil",
      Demonology: "spell_shadow_metamorphosis",
      Destruction: "spell_shadow_rainoffire",
    },
  },
  Druid: {
    color: "#ff9c55",
    icon: "classicon_druid",
    specs: {
      Balance: "spell_nature_starfall",
      Feral: "ability_racial_bearform",
      Restoration: "spell_nature_healingtouch",
    },
  },
};

export function classIcon(className: ClassName): string {
  return `/images/raids/icons/${classArtwork[className].icon}.jpg`;
}

export function specializationIcon(
  className: ClassName,
  specialization: Specialization | null,
): string {
  const icon =
    specialization && specializationMatchesClass(className, specialization)
      ? classArtwork[className].specs[specialization]
      : null;
  return icon ? `/images/raids/icons/${icon}.jpg` : classIcon(className);
}
