import assert from "node:assert/strict";
import { test } from "node:test";
import {
  kfcWelcomeDescription,
  kfcWelcomeComponents,
  kfcForeverApplicationGuide,
  kfcForeverDiscussionGuide,
  kfcForeverInviteGuide,
  raidSignupHelpUrl,
  kfcTbcJoiningSummary,
} from "../content/kfc-raid-welcome";
import { routeRaidOnboarding } from "../lib/kfc-revision";
import { raidingConfigSchema } from "../lib/kfc-raiding/contracts";
import { signupStatusExplanation } from "../lib/raids/event-preview";
import { schedulePanel } from "../lib/kfc-raiding/presentation";
import { newcomerMessages } from "../lib/kfc-raiding/newcomer-content";

function config(): ReturnType<typeof raidingConfigSchema.parse> {
  const space = (offset: number): object => {
    const id = (n: number): string =>
      String(1559000000000000000n + BigInt(offset + n));
    return {
      categoryId: id(1),
      schedule: { channelId: id(2), messageId: id(3) },
      forumId: id(4),
      forumGuideId: id(5),
      chatId: id(6),
      alertRoleId: id(7),
      alerts: { channelId: id(2), messageId: id(8) },
      tags: {},
    };
  };
  return raidingConfigSchema.parse({
    version: 1,
    guildId: "1411533815356194968",
    applicationId: "1554796912673169428",
    hub: { channelId: "1559000000000000090", messageId: "1559000000000000091" },
    spaces: { forever: space(0), tbc: space(20) },
  });
}
function onboarding(): object {
  const option = (id: string, title: string): object => ({
    id,
    title,
    channel_ids: ["1559000000000000080"],
    role_ids: [],
    description: "Existing",
  });
  return {
    enabled: false,
    mode: 0,
    default_channel_ids: ["1559000000000000080"],
    prompts: [
      {
        id: "1557977148621586494",
        title: "What brings you here?",
        type: 0,
        required: true,
        single_select: false,
        in_onboarding: true,
        options: [
          option("1557977148621586497", "TBC raids"),
          option("1557977148621586498", "WoW Forever"),
          option("1554796912673170013", "Friends / still deciding"),
        ],
      },
      {
        id: "1554796912673170002",
        title: "Which classes do you play?",
        type: 0,
        required: false,
        single_select: false,
        in_onboarding: false,
        options: [
          {
            id: "1554796912673170030",
            title: "Warrior",
            channel_ids: [],
            role_ids: ["1559000000000000070"],
          },
        ],
      },
    ],
  };
}
test("Welcome is short and puts both game schedules ahead of applications", (): void => {
  assert(
    kfcWelcomeDescription.length >= 500 && kfcWelcomeDescription.length <= 800,
  );
  const rows = kfcWelcomeComponents();
  assert.deepEqual(
    rows[0].components.map((button) => button.label),
    ["Forever raids", "TBC raids"],
  );
  assert.equal(rows[1].components[0].url, raidSignupHelpUrl);
  assert.match(
    kfcWelcomeDescription,
    /Saving a character alone does not sign you up/,
  );
  assert.match(kfcWelcomeDescription, /guild members get roster priority/);
  for (const row of rows) assert(row.components.length <= 5);
});
test("Secondary guidance matches its destination instead of repeating the recruitment essay", (): void => {
  for (const text of [
    kfcForeverApplicationGuide,
    kfcForeverDiscussionGuide,
    kfcForeverInviteGuide,
  ])
    assert(text.length < 1400);
  assert.match(kfcForeverApplicationGuide, /pending review/);
  assert.match(kfcForeverDiscussionGuide, /Vargos/);
  assert.match(kfcForeverInviteGuide, /Animagigel/);
});
test("Raid interest routing preserves other choices, roles, IDs and disabled publication state", (): void => {
  const original = onboarding();
  const result = routeRaidOnboarding(original, config());
  assert.equal(result.enabled, false);
  const source = original as { prompts: { options: unknown[] }[] };
  const prompts = result.prompts as {
    options: { channel_ids: string[]; role_ids: string[] }[];
  }[];
  assert.deepEqual(prompts[0].options[0].channel_ids, [
    config().spaces.tbc.schedule.channelId,
    config().spaces.tbc.forumId,
    config().spaces.tbc.chatId,
  ]);
  assert.deepEqual(prompts[0].options[1].channel_ids, [
    config().spaces.forever.schedule.channelId,
    config().spaces.forever.forumId,
    config().spaces.forever.chatId,
  ]);
  assert.deepEqual(prompts[0].options[2], source.prompts[0].options[2]);
  assert.deepEqual(prompts[1], source.prompts[1]);
  assert.deepEqual(routeRaidOnboarding(result, config()), result);
  assert.deepEqual(original, onboarding());
});
test("Raid routing rejects a changed question or role-granting raid choice", (): void => {
  const changed = onboarding() as {
    prompts: { title: string; options: { role_ids: string[] }[] }[];
  };
  changed.prompts[0].title = "Owner changed this";
  assert.throws(
    () => routeRaidOnboarding(changed, config()),
    /edition question changed/,
  );
  changed.prompts[0].title = "What brings you here?";
  changed.prompts[0].options[0].role_ids = ["1559000000000000070"];
  assert.throws(() => routeRaidOnboarding(changed, config()), /grants a role/);
});
test("Schedules link to their own configured signup guide", (): void => {
  for (const game of ["forever", "tbc"] as const) {
    const payload = schedulePanel(game, [], config(), new Date(), new Date());
    const guide = payload.components
      .flatMap((row) => row.components)
      .find((button) => button.label === "How to sign up");
    assert(guide?.url.includes(config().spaces[game].forumGuideId));
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
  }
});
test("Signup explanations distinguish registration, approval, seat and availability", (): void => {
  assert.match(signupStatusExplanation("registered"), /leader will select/);
  assert.match(signupStatusExplanation("pending"), /approval/);
  assert.equal(signupStatusExplanation("accepted"), "You are selected for the roster. Reply to an attendance invitation if the leader requests one.");
  for (const state of ["tentative", "absent"])
    assert.match(signupStatusExplanation(state), /No seat is held/);
  assert.match(signupStatusExplanation("bench"), /not been confirmed/);
  assert.match(signupStatusExplanation(undefined), /not signed up/);
});

test("TBC joining guidance points verified applicants to their dedicated channel", (): void => {
  const joining = newcomerMessages(config()).find(
    (message) => message.key === "joining",
  )!;
  assert.match(kfcTbcJoiningSummary, /After community verification/);
  assert.match(kfcTbcJoiningSummary, /1411545946155909150/);
  assert.match(
    joining.payload.embeds[0].description ?? "",
    /do not need KFC Certified to apply/,
  );
});
