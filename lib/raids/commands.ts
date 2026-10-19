import { specializationNames } from "./specializations";

export const raidCommand = {
  name: "raid",
  description:
    "Private Forever and TBC events: signups, rosters and raid reserves",
  type: 1,
  options: [
    {
      type: 1,
      name: "repost",
      description: "Move your event post to the bottom without losing signups",
      options: [
        {
          type: 3,
          name: "event",
          description: "Event ID or website event link",
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "create",
      description:
        "Create a private Forever or TBC raid, dungeon, PvP or community event",
    },
    {
      type: 1,
      name: "status",
      description: "Check a private event roster",
      options: [
        {
          type: 3,
          name: "event",
          description: "Event ID or website event link",
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "join",
      description: "Join a private event after reading its participation rules",
      options: [
        {
          type: 3,
          name: "event",
          description: "Event ID or website event link",
          required: true,
        },
        {
          type: 3,
          name: "character",
          description: "Exact name from your website character profile",
          required: true,
        },
        {
          type: 5,
          name: "accept_rules",
          description:
            "I read and accept this event's participation and loot rules",
          required: true,
        },
        {
          type: 3,
          name: "specialization",
          description: "Required for combat events; must match your class",
          required: false,
          choices: specializationNames.map((name) => ({ name, value: name })),
        },
        {
          type: 3,
          name: "role",
          description:
            "Required for combat events; social events use participant",
          required: false,
          choices: ["tank", "healer", "damage", "participant"].map((name) => ({
            name,
            value: name,
          })),
        },
      ],
    },
    {
      type: 1,
      name: "leave",
      description: "Withdraw from an unlocked private event",
      options: [
        {
          type: 3,
          name: "event",
          description: "Event ID or website event link",
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "reserves",
      description: "Open your private raid soft reserves",
      options: [
        {
          type: 3,
          name: "event",
          description: "Event ID or website event link",
          required: true,
        },
      ],
    },
  ],
};
