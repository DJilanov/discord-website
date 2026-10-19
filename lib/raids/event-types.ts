export const eventTypes = [
  "raid",
  "dungeon",
  "battleground",
  "world_pvp",
  "questing",
  "social",
  "other",
] as const;
export type EventType = (typeof eventTypes)[number];

interface EventTypeDefinition {
  label: string;
  targetLabel: string;
  combatRoles: boolean;
  capacity: number;
  roleCaps: { tank: number; healer: number; damage: number };
}

// Editable organizer presets, not limits imposed by the game.
export const eventTypeDefinitions: Record<EventType, EventTypeDefinition> = {
  raid: {
    label: "Raid",
    targetLabel: "Forever raid name",
    combatRoles: true,
    capacity: 20,
    roleCaps: { tank: 2, healer: 4, damage: 14 },
  },
  dungeon: {
    label: "Dungeon",
    targetLabel: "Dungeon name",
    combatRoles: true,
    capacity: 5,
    roleCaps: { tank: 1, healer: 1, damage: 3 },
  },
  battleground: {
    label: "Battleground",
    targetLabel: "Battleground name",
    combatRoles: true,
    capacity: 10,
    roleCaps: { tank: 0, healer: 2, damage: 8 },
  },
  world_pvp: {
    label: "World PVP",
    targetLabel: "Location / objective",
    combatRoles: true,
    capacity: 20,
    roleCaps: { tank: 0, healer: 4, damage: 16 },
  },
  questing: {
    label: "Questing",
    targetLabel: "Quest / zone",
    combatRoles: true,
    capacity: 5,
    roleCaps: { tank: 1, healer: 1, damage: 3 },
  },
  social: {
    label: "Social event",
    targetLabel: "Activity / location",
    combatRoles: false,
    capacity: 20,
    roleCaps: { tank: 0, healer: 0, damage: 0 },
  },
  other: {
    label: "Other",
    targetLabel: "Activity / location",
    combatRoles: false,
    capacity: 20,
    roleCaps: { tank: 0, healer: 0, damage: 0 },
  },
};
