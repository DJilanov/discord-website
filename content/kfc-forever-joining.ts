export const kfcForeverDiscussionId = "1548519535177629707";
export const kfcForeverScheduleId = "1565932272631283853";
export const kfcForeverApplicationUrl =
  "https://kfcguild.online/recruitment#application-form";
export const kfcForeverInviteContacts = [
  "Djilanov",
  "psyrogue",
  "nelf",
  "nunk",
  "Animagigel",
] as const;

export const kfcForeverJoiningDescription =
  `**WoW Forever | EU | Alliance | PvP | English**\n\n` +
  `**A guild and a PUG community**\n` +
  `KFC is both a guild and a wider community for public raids. Our PUG community gives us more players to call on when a raid needs replacements, helping fill empty spots and keep groups running.\n\n` +
  `**Choose your pace**\n` +
  `• **Casual groups** for relaxed play.\n` +
  `• **Semi-hardcore:** two **10-player** groups and one **20-player** group.\n\n` +
  `**Morning, daytime and evening raids**\n` +
  `We are **actively recruiting for morning and daytime Forever raids**. **Djilanov** is our experienced organizer for **morning/daytime and hardcore runs**.\n` +
  `**Psyrogue** leads our standard daily Forever evening raid at **20:00 Central European local time (CET/CEST)**. That daily evening run is guaranteed; TBC raids will run outside that slot.\n` +
  `Our community has hosted **500+ TBC raids**, and we are aiming for **7+ Forever raids in the first week**.\n\n` +
  `**Find your next run**\n` +
  `Open <#${kfcForeverScheduleId}> for upcoming dates and signup links. Each raid has its own post in <#1565932273944231957>; questions and coordination stay with that raid.\n\n` +
  `**Joining the guild**\n` +
  `Joining Discord gives you access to the community. **An officer confirms your acceptance into the guild separately.**\n` +
  `1. Use **Apply to join KFC** below, or open our [guild application](${kfcForeverApplicationUrl}). Include your character name, class, preferred group (casual or semi-hardcore), and whether you play mornings, daytime or evenings.\n` +
  `2. Keep your application reference. An officer reviews the request and confirms the decision privately through your chosen contact method. **Application received means pending, not accepted.**\n` +
  `3. Once accepted, arrange your in-game invite from launch day. Questions or trouble applying? Ask in <#${kfcForeverDiscussionId}>; keep private application details out of public chat.\n` +
  `Only here for PUG raids? You are welcome to stay in the community and join open runs without applying to the guild.\n\n` +
  `**Guild invites from day one**\n` +
  `Whisper ${kfcForeverInviteContacts.map((name): string => `**${name}**`).join(", ")} in game.\n` +
  `Or ask directly in <#${kfcForeverDiscussionId}> for a guild invite.\n\n` +
  `Undecided about a group? Say hello. New and returning players are welcome!`;

export const kfcForeverJoiningTopic =
  `KFC guild & PUG community | Forever EU Alliance PvP, English. Casual groups; semi-hardcore: 2 x 10-player and 1 x 20-player. ` +
  `Morning/daytime and hardcore: Djilanov. Standard daily 20:00 CET/CEST: Psyrogue. Apply using the pinned button; an officer confirms guild acceptance. ` +
  `Upcoming raids: <#${kfcForeverScheduleId}>. ` +
  `Day-one invites: whisper ${kfcForeverInviteContacts.join(", ")} in game, or ask in <#${kfcForeverDiscussionId}>.`;

export const kfcForeverJoiningFooter =
  "Maintained reference | Reviewed 31 October 2026 | Forever joining 2026-10-31.1";

export interface KfcJoiningLinkRow {
  type: 1;
  components: {
    type: 2;
    style: 5;
    label: string;
    url: string;
  }[];
}

export function kfcForeverJoiningComponents(): KfcJoiningLinkRow[] {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Apply to join KFC",
          url: kfcForeverApplicationUrl,
        },
        {
          type: 2,
          style: 5,
          label: "Ask a recruiting question",
          url: `https://discord.com/channels/1411533815356194968/${kfcForeverDiscussionId}`,
        },
        {
          type: 2,
          style: 5,
          label: "Forever raid schedule",
          url: `https://discord.com/channels/1411533815356194968/${kfcForeverScheduleId}/1565932279027466271`,
        },
      ],
    },
  ];
}
