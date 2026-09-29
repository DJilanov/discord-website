import type { FaqItem } from "@/components/ui";

export const communityFaq: FaqItem[] = [
  {
    question: "Is this the official WoW Forever Discord?",
    answer:
      "No. WoW Forever Discord is an independent, unofficial fan community. We are not affiliated with or endorsed by Blizzard Entertainment. Game announcements and account support belong to Blizzard's official channels.",
  },
  {
    question: "Do I need to belong to a particular guild?",
    answer:
      "No. This community is open to players and guilds of all sizes. You do not need to change guilds or install an addon. Come for the people, groups, and playstyles you enjoy.",
  },
  {
    question: "Do you cover Alliance, Horde, PvE, PvP, and RP?",
    answer:
      "Yes. The community is organized around both factions and all three playstyles, with region and realm details included in recruitment and group posts. Community categories do not confirm official realm availability.",
  },
  {
    question: "How do player reports and appeals work?",
    answer:
      "The website's report and appeal forms keep submissions private to authorized staff. Discord's report-here and appeal-here forums are readable by other members; do not post sensitive evidence there. Website safety alerts require two distinct reviewers, and a website appeal suspends an alert during review. A forum post is not an automatic website case or a verified finding.",
  },
  {
    question: "Where can I find a working Discord invite?",
    answer:
      "The Discord page holds the current invitation. Staff can replace it when necessary, so the website link stays the same. If the invite is not ready or is temporarily unavailable, the page clearly shows that status.",
  },
];

export const communities = [
  {
    slug: "pve",
    label: "PvE",
    title: "Find your next group",
    text: "Dungeon runs. Raid nights. The journey between them.",
    image: "/images/forever-adventure.webp",
    color: "green",
    links: ["Dungeons & raids", "Guild recruitment", "Questing groups"],
  },
  {
    slug: "pvp",
    label: "PvP",
    title: "Meet your teammates",
    text: "Battlegrounds, premades, and people who have your back.",
    image: "/images/pvp.webp",
    color: "red",
    links: ["Premades", "Team finding", "Tactics & discussion"],
  },
  {
    slug: "rp",
    label: "Roleplay",
    title: "Find your story",
    text: "Shared stories, new characters, and a world worth living in.",
    image: "/images/forever-stories.webp",
    color: "blue",
    links: ["Roleplay guilds", "Community events", "Character stories"],
  },
] as const;
