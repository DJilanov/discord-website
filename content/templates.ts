import { testerReportTemplate } from "./contributor-tasks";

export interface CommunityTemplate {
  slug: string;
  title: string;
  text: string;
}

export const communityTemplates: CommunityTemplate[] = [
  {
    slug: "guild-recruitment",
    title: "Guild recruitment template",
    text: `Guild name:
Region / faction / language:
Character ruleset (Normal / PvP / Roleplaying / Hardcore planned / Unconfirmed):
Who we welcome (social, trial, roster):
Days and named time zone:
Invites / start / hard finish:
Local-time or fixed-UTC schedule:
Current classes and roles needed:
Atmosphere and progression expectations:
Attendance, preparation and voice:
Written loot policy:
Trial process and decision maker:
Public recruiter handle:
Guild website or invitation:
Last checked (date):`,
  },
  {
    slug: "group-post",
    title: "Group post template",
    text: `Activity and purpose:
Region / character ruleset / faction:
Date (YYYY-MM-DD):
Start time and named time zone:
UTC start for that date:
Expected finish or duration:
Roles confirmed / roles still needed:
Newcomers and experience expectations:
Preparation and voice requirements:
Written loot rules / reservations:
Public organizer handle:
How to confirm a place:
Cancellation or change contact:`,
  },
  {
    slug: "launch-group-plan",
    title: "Friends and guild launch plan",
    text: `Plan owner and public contact:
Last reviewed (date):
Region / faction / language:
Character ruleset: Normal / PvP / Roleplaying / Hardcore planned / Unconfirmed
Official source and date checked:
Who confirms the final ruleset and faction:
Usual hours and named time zone:
First shared session (date / time / UTC):
Hard finish and breaks:
Who can join later or miss launch night:
Pace, goals and spoiler preferences:
Roles we want to try (not guaranteed slots):
Voice / text preferences:
Shared meeting and update location:
Access checks each player handles privately:
Backup plan if login or the chosen ruleset is unavailable:
When to stop waiting and reschedule:
Next check-in date:`,
  },
];

export function getCommunityTemplate(
  slug: string,
): CommunityTemplate | undefined {
  if (slug === testerReportTemplate.slug) return testerReportTemplate;
  return communityTemplates.find((template) => template.slug === slug);
}

export function templateMarkdown(slug: string): string {
  const template = getCommunityTemplate(slug);
  if (!template) throw new Error(`Unknown community template: ${slug}`);
  return `\`\`\`text\n${template.text}\n\`\`\`\n\n[Download the blank template](/templates/${template.slug})`;
}
