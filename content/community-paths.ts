export const channelReviewDate = "7 October 2026";

export const classDiscussions = [
  "Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Shaman", "Mage", "Warlock", "Druid",
].map((name) => ({
  name,
  channel: name.toLowerCase(),
  calculator: `https://helper.kfcguild.online/forever/encyclopedia/talents/${name.toLowerCase()}`,
}));

export const classDiscussionTable = [
  "| Class channel | Talent calculator and spellbook |",
  "| --- | --- |",
  ...classDiscussions.map(({ name, channel, calculator }) =>
    `| **${channel}** | [${name} calculator](${calculator}) |`,
  ),
].join("\n");
