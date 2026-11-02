import { kfcAccessIds } from "./kfc-access";
import { kfcWelcomeComponents } from "./kfc-raid-welcome";
import type { MessagePayload } from "../lib/kfc-raiding/contracts";

export interface KfcAccessNotice {
  key: "verification" | "roles";
  channelId: string;
  payload: MessagePayload;
}

export function kfcAccessNotices(): KfcAccessNotice[] {
  return [
    {
      key: "verification",
      channelId: kfcAccessIds.verification,
      payload: {
        content: "",
        embeds: [
          {
            title: "Community verification · Start here",
            color: 0xe7b65b,
            description:
              "Read the server rules, then use the **MEE6 Verify** button in the original message linked below. Check your roles for **verified** when you finish.\n\n**Community and guild access are separate.** Verification lets you join the community; private guild conversations require **KFC Certified**, granted by an officer after acceptance. Class choices, PUG signup and boosting interests do not grant guild access.\n\nNeed help or the button failed? Ask in <#1557974292854083615>. You can read the welcome and joining instructions while sorting out verification.",
            footer: { text: "KFC access guide · 2026-10-31.1" },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Open MEE6 verification",
                url: "https://discord.com/channels/1411533815356194968/1412584845829345280/1412584848656302082",
              },
              {
                type: 2,
                style: 5,
                label: "Read the rules",
                url: "https://discord.com/channels/1411533815356194968/1556204779531673723",
              },
              {
                type: 2,
                style: 5,
                label: "Get help",
                url: "https://discord.com/channels/1411533815356194968/1557974292854083615",
              },
            ],
          },
        ],
        allowed_mentions: { parse: [] },
      },
    },
    {
      key: "roles",
      channelId: kfcAccessIds.roleMenu,
      payload: {
        content: "",
        embeds: [
          {
            title: "Your interests are optional",
            color: 0xe7b65b,
            description:
              "Use **Channels & Roles** to choose Forever, TBC, classes and combat interests. You can change those choices later. The older menu below remains as history; its **NEEDED** wording is out of date.\n\n**Joining a raid:** open its post, add your character and **Confirm signup**.\n**Joining the guild:** apply through <#1411545672313737346>; an officer confirms acceptance and Certified access. An Applicant or Booster label alone is not guild membership.\n\nAlready in KFC but missing private guild channels? Ask Management to check your **KFC Certified** role. Need general help? Use <#1557974292854083615>.",
            footer: { text: "KFC access guide · 2026-10-31.1" },
          },
        ],
        components: kfcWelcomeComponents(),
        allowed_mentions: { parse: [] },
      },
    },
  ];
}
