import type { KfcJoiningLinkRow } from "./kfc-forever-joining";
import { kfcForeverApplicationUrl } from "./kfc-forever-joining";

export const raidSignupHelpUrl =
  "https://www.wowforeverdiscord.online/raids/help";
export const kfcNewcomerFooter =
  "Maintained reference | Raid joining 2026-10-31.1";
export const kfcWelcomeDescription =
  "**Welcome to KFC — a guild and PUG raiding community.**\n\n" +
  "**Find a raid**\nChoose **WoW Forever** or **TBC Raids** below, open a raid post and press **Sign up**. Forever has morning, daytime and evening runs, with normal and semi-hardcore options. Check each published raid's time and requirements.\n\n" +
  "**First time?**\nAdd your character, then **Confirm signup** for that raid. Saving a character alone does not sign you up.\n\n" +
  "KFC guild members get roster priority; PUGs are welcome where places remain. The leader selects the roster.\n\n" +
  "Want to join the guild or need help? Use **Join KFC** or **Get help** below.";

export const kfcWelcomeTopic =
  "Start here: Forever or TBC raids → schedule → raid post → Sign up. Add your character, then Confirm signup. Guild applications and general help are separate links in the pinned welcome.";

export function kfcWelcomeComponents(): KfcJoiningLinkRow[] {
  const button = (
    label: string,
    url: string,
  ): KfcJoiningLinkRow["components"][number] => ({
    type: 2,
    style: 5,
    label,
    url,
  });
  return [
    {
      type: 1,
      components: [
        button(
          "Forever raids",
          "https://discord.com/channels/1411533815356194968/1565932272631283853/1565932279027466271",
        ),
        button(
          "TBC raids",
          "https://discord.com/channels/1411533815356194968/1460899582824153140/1565932315002273943",
        ),
      ],
    },
    {
      type: 1,
      components: [
        button("How to sign up", raidSignupHelpUrl),
        button(
          "Join KFC",
          "https://discord.com/channels/1411533815356194968/1411545672313737346/1557974330955145330",
        ),
        button(
          "Get help",
          "https://discord.com/channels/1411533815356194968/1557974292854083615",
        ),
      ],
    },
  ];
}

export const kfcForeverDiscussionGuide =
  "**Find your next Forever raid**\nOpen <#1565932272631283853>, choose a raid and press **Sign up**. First time? Save your character, then confirm the raid signup.\n\n" +
  "DJ leads morning runs with Vargos assisting. Psyrogue leads the published evening normal runs with DJ assisting. Normal and semi-hardcore runs have their own requirements.\n\n" +
  "KFC guild members have roster priority; PUGs are welcome where places remain. Signing up is followed by the leader's roster selection.\n\n" +
  "Ask general questions here; questions about one raid belong in that raid's replies. Guild applications: <#1411545672313737346>.";

export const kfcForeverInviteGuide =
  "**Join KFC in game**\nApply through <#1411545672313737346>. An officer confirms acceptance; joining Discord alone is community membership.\n\n" +
  "**Day-one invites**\nWhisper **Djilanov**, **psyrogue**, **nelf**, **nunk** or **Animagigel**, or ask in <#1548519535177629707>.\n\n" +
  "**Looking for a raid?**\nOpen <#1565932272631283853> and use the raid's **Sign up** button. Open PUG runs welcome eligible non-guild players; guild members receive roster priority.";

export const kfcTbcJoiningSummary =
  "**Playing TBC?**\nAfter community verification, post your TBC guild application in <#1411545946155909150>. Use the pinned template; an officer confirms acceptance and the in-game invite. You do not need KFC Certified to apply. For a public run, use the TBC schedule and that raid's signup; a guild application is separate.";

export const kfcTbcApplicationDescription =
  "**Apply for the TBC guild here**\nAfter community verification, post your application in this channel using the template below. KFC Certified is granted after officer approval; you do not need KFC Certified to apply. Applications posted here are visible to verified community members. If you prefer a private application, DM KFC Management.\n\n**Game:** TBC\n**Character, level, realm and faction:**\n**Class, spec and preferred role:**\n**Looking for:** social / PvP / raids\n**Usual availability and timezone:**\n**For raiding:** experience, preparation and relevant attunements; questions or learning goals are welcome.\n\nAn officer reviews your application and confirms acceptance and the in-game invite. A guild application does not guarantee a raid seat.\n\n**Only here for a public run?**\nUse <#1460899582824153140> and the event's signup.\n\n**Playing Forever instead?**\nUse <#1558008778732077090>. This channel is for the TBC guild.";

export const kfcForeverApplicationGuide =
  "**Apply to KFC · WoW Forever**\nEU · Alliance · PvP · English. Casual groups and semi-hardcore teams: two 10-player and one 20-player.\n\n" +
  `Use **Apply to join KFC** below or [open the application](${kfcForeverApplicationUrl}). Include character name, class/role, preferred pace, availability and a contact method.\n\n` +
  "Application received means pending review. An officer confirms acceptance privately through your chosen contact method; after acceptance, arrange the in-game invite.\n\n" +
  "Morning/daytime: DJ. Standard evening runs: Psyrogue. Full guild details and invite contacts: <#1411545672313737346>.\n\n" +
  "**Only looking for a raid?**\nOpen <#1565932272631283853> and sign up on the raid post. Eligible PUG players are welcome; guild members receive roster priority.\n\nPlaying TBC? Read the public joining instructions in <#1411545672313737346>.";

export const kfcRaidRolloutDescription =
  "**Finding a raid and signing up is now clearer.**\n\n" +
  "Open <#1557974301095755900> for **Forever raids** and **TBC raids**, or use the schedule buttons below.\n\n" +
  "**First time?** Add your character, then press **Confirm signup** for the raid. **My signup** shows your saved status and lets you change plans. KFC guild members get roster priority; eligible PUG players are welcome.\n\n" +
  `The [signup walkthrough](${raidSignupHelpUrl}) explains each step, roster selection and Raid-Helper events. Optional raid alerts are linked from each schedule.\n\n` +
  "If you get stuck, ask in <#1557974292854083615>. Tell us which step was unclear so we can improve it.";
