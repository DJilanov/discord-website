export const classes = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid",
] as const;
export type ClassName = (typeof classes)[number];

export const specializationsByClass = {
  Warrior: ["Arms", "Fury", "Protection"],
  Paladin: ["Holy", "Protection", "Retribution"],
  Hunter: ["Beast Mastery", "Marksmanship", "Survival"],
  Rogue: ["Assassination", "Combat", "Subtlety"],
  Priest: ["Discipline", "Holy", "Shadow"],
  Shaman: ["Elemental", "Enhancement", "Restoration"],
  Mage: ["Arcane", "Fire", "Frost"],
  Warlock: ["Affliction", "Demonology", "Destruction"],
  Druid: ["Balance", "Feral", "Restoration"],
} as const satisfies Record<ClassName, readonly string[]>;
export type Specialization = (typeof specializationsByClass)[ClassName][number];
export const specializationNames = [
  ...new Set(Object.values(specializationsByClass).flat()),
];

export function specializationMatchesClass(
  className: ClassName,
  specialization: string,
): boolean {
  return (specializationsByClass[className] as readonly string[]).includes(
    specialization,
  );
}

export function suggestedRole(
  specialization: Specialization | null,
): "tank" | "healer" | "damage" {
  if (specialization === "Protection") return "tank";
  if (
    ["Holy", "Discipline", "Restoration"].some(
      (spec) => spec === specialization,
    )
  )
    return "healer";
  return "damage";
}
