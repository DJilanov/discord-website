import type { Edition, MessagePayload } from "../lib/kfc-raiding/contracts";
import { raidSignupHelpUrl } from "./kfc-raid-welcome";

export const raidTags = [
  "Morning/daytime",
  "Evening",
  "Casual",
  "Semi-hardcore",
  "Hardcore pace",
  "Open PUG",
  "Guild priority",
  "Guild only",
  "Open",
  "Signup closed",
  "Cancelled",
  "Finished",
];
export const helpTags = [
  "Gear",
  "Logs",
  "Preparation",
  "Attendance",
  "Open",
  "Resolved",
];
export const kfcRaidForumIds = {
  forever: "1565932273944231957",
  tbc: "1565932309171937411",
} as const;
export const raidingLayout = {
  forever: {
    categoryId: "1548517693957869619",
    chatId: "1548519535177629707",
    scheduleName: "forever-schedule",
    forumName: "forever-raids",
    voiceName: "Forever Raid Voice 1",
  },
  tbc: {
    categoryId: "1441654698519040114",
    chatId: "1557974295651557436",
    scheduleName: "tbc-schedule",
    forumName: "tbc-raids",
    voiceName: "TBC Raid Voice",
  },
} satisfies Record<
  Edition,
  {
    categoryId: string;
    chatId: string;
    scheduleName: string;
    forumName: string;
    voiceName: string;
  }
>;

export function forumGuide(game: Edition): MessagePayload {
  return {
    content: "",
    embeds: [
      {
        title: `Join a ${game === "forever" ? "Forever" : "TBC"} raid`,
        description:
          "**1 · Find your raid**\nOpen the schedule, choose a raid and read its local time, preparation and loot rules. Normal and semi-hardcore runs have different expectations.\n\n**2 · Press Sign up**\nFirst time? Enter your character name, class and spec, then **Save character & continue**. Check your event role and use **Confirm signup**. Saving a character alone does not sign you up. Returning players can reuse a saved character.\n\n**3 · Check your result**\n**Signed up** means the leader will select the roster. **Confirmed** means you have a place. **Bench** means a place is not confirmed. Discord's **Interested** is separate from character signup.\n\n**Change plans**\nOpen **My signup** to change availability or withdraw. The confirmation explains any seat or reserve changes. If an interaction expires, reopen the original post and check **My signup**.\n\n**Raid-Helper event?**\nUse its linked original signup and buttons; your roster stays there.\n\nKFC guild members have roster priority; eligible PUG players are welcome. Ask raid-specific questions in that raid's replies.",
        color: game === "forever" ? 0xe7b65b : 0x78bd70,
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Signup walkthrough",
            url: raidSignupHelpUrl,
          },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

export function alertGuide(game: Edition): MessagePayload {
  return {
    content: "",
    embeds: [
      {
        title: `${game === "forever" ? "Forever" : "TBC"} raid alerts · Your choice`,
        description:
          "React with 🔔 below to subscribe to this game's raid digest. Remove your reaction to unsubscribe. Changes normally take effect within one minute.\n\nAt most one digest per day, after 18:00 Central European time, covering published raids in the next 24 hours. No digest is sent when there are no upcoming raids. Your Discord notification settings still apply.\n\nThe alert role grants no channel access, guild membership or raid seat. Normal schedule and roster updates do not ping it.",
        color: 0xe7b65b,
      },
    ],
    components: [],
    allowed_mentions: { parse: [] },
  };
}
