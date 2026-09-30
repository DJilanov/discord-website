export interface ContributorTask {
  id: string;
  title: string;
  status: "Open browser check" | "Maintainer approval required";
  time: string;
  target: string;
  targetLabel: string;
  purpose: string;
  steps: string[];
  completion: string;
}

export const contributorTasks: ContributorTask[] = [
  {
    id: "trader-web",
    title: "Read one market quote",
    status: "Open browser check",
    time: "15 minutes",
    target: "https://helper.kfcguild.online/forever/trader",
    targetLabel: "Open the workspace",
    purpose:
      "Can a new visitor tell which market they are reading and how old its prices are?",
    steps: [
      "Select a market and record its displayed label, catalog build, last scan and history status.",
      "Find one item or recipe. Check whether you can identify its inputs and tell a listing price from an observed sale.",
      "Repeat on a phone or narrow window. Record any obscured controls or confusing warnings.",
      "Report a missing or stale scan as the state you observed, not automatically as a bug. Do not buy items just to complete this check.",
    ],
    completion:
      "One item, one dated observation and reproducible steps. A clear result with no problem found is useful too.",
  },
  {
    id: "guide-check",
    title: "Check a starter guide",
    status: "Open browser check",
    time: "15 minutes",
    target: "/guides/wow-forever-playing-with-friends",
    targetLabel: "Open the friends checklist",
    purpose:
      "Find a step that is missing, unclear or no longer supported by an official source.",
    steps: [
      "Read the friends checklist and open its official sources.",
      "Choose one statement to check. Note the section, source URL and date.",
      "Try the guide on mobile and follow one related link.",
      "Suggest the exact replacement wording. Separate a source correction from a personal preference.",
    ],
    completion:
      "One specific correction with a source, or a dated confirmation of the section you checked. Do not claim a whole guide was tested in game after only reading it.",
  },
  {
    id: "compatibility",
    title: "Verify one addon feature",
    status: "Maintainer approval required",
    time: "20-30 minutes",
    target: "/addons",
    targetLabel: "Check tool status",
    purpose:
      "Produce a narrowly scoped compatibility result, not a blanket works-on-Forever badge.",
    steps: [
      "Agree on an existing approved package and feature with its maintainer. Do not install an unreviewed binary for this task.",
      "Record addon version, client version and build, operating system and the feature being exercised.",
      "Back up your own configuration before testing. Record required dependencies and the exact actions taken.",
      "Report pass, fail or not tested for that feature only. Stop if the content or access needed is unavailable.",
    ],
    completion:
      "A maintainer-reviewed result tied to one feature and exact versions. Guild raid-addon testing remains blocked until the relevant content is available.",
  },
  {
    id: "collector",
    title: "Run one approved collection test",
    status: "Maintainer approval required",
    time: "One agreed test window",
    target: "/addons/wow-trader#collector",
    targetLabel: "Read collector boundaries",
    purpose:
      "Check one upload without exposing private data or starting unattended collection.",
    steps: [
      "Wait for maintainer approval of your exact package, platform, upload limit and private diagnostic route.",
      "Use only the documented player-initiated scan procedure and the approved save/upload sequence.",
      "Record whether the app accepted the upload and whether the intended market freshness changed.",
      "Stop after the agreed test. Do not publish tokens, SavedVariables, raw uploads, local paths or account screenshots.",
    ],
    completion:
      "One acknowledged test result returned privately through the route agreed with the maintainer. No automatic upload schedule or public diagnostic attachment.",
  },
  {
    id: "organizer",
    title: "Rehearse a group post",
    status: "Open browser check",
    time: "15 minutes",
    target: "/guides/find-or-organize-wow-forever-group",
    targetLabel: "Open the group worksheet",
    purpose:
      "Check whether another player can understand the plan without a second round of questions.",
    steps: [
      "Copy the blank group template and fill it for a proposed session privately.",
      "Check region, character ruleset, faction, calendar date, named time zone and UTC conversion.",
      "Ask a consenting participant to explain the start time, finish, needed roles and loot rules back to you.",
      "Report an unclear field or instruction. Do not submit a fake event to the public board; publish only a real session you will host.",
    ],
    completion:
      "One usability finding or confirmed worksheet check. An actual hosted session is a separate commitment.",
  },
];

export const testerReportTemplate = {
  slug: "tester-report",
  title: "Community tester report",
  text: `Task ID:
Date and time (include zone):
Page URL or approved package:
Browser / operating system:
Client build / addon version (if relevant):
Selected market / scan age (if relevant):
Feature or section checked:
Steps to reproduce:
Expected result:
Actual result:
Result: pass / fail / not tested
Impact: blocked / confusing / cosmetic / information correction
Official source URL (for a factual correction):
What remains untested:
Public screenshot attached only after removing private information: yes / no
Public credit requested: no / approved display name`,
};
