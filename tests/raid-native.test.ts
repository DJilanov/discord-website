import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type {
  CharacterView,
  EventView,
  SignupView,
} from "../lib/raids/contracts";
import { classes, specializationsByClass } from "../lib/raids/specializations";
import { discordEventPanel } from "../lib/raids/discord-panel";
import { discordMirrorPanel } from "../lib/raids/discord-mirrors";
import {
  damageKind,
  discordEmojis,
  discordEmoji,
  discordText,
  hardReserveText,
} from "../lib/raids/discord-format";
import {
  nativeAcknowledgementSchema,
  nativeMessageSchema,
  nativeStateSchema,
  nativeTarget,
  type NativeButton,
  type NativeSelect,
} from "../lib/raids/native-contracts";
import { draftControl, renderNativePanel } from "../lib/raids/native-ui";
import { raidCatalogFixture } from "./fixtures/raid-catalog";

const character: CharacterView = {
  id: "char-one",
  game: "forever",
  realm: "",
  name: "Test Hero",
  className: "Warrior",
  specialization: "Fury",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
};
const event: EventView = {
  id: "cmabcdefghijklmnopqrstuvw",
  game: "forever",
  realm: "",
  eventType: "raid",
  title: "Native test raid",
  raidName: "Test raid",
  region: "EU",
  faction: "Alliance",
  ruleset: "PvP",
  description: "Test rules",
  leaderName: "",
  assistantName: "",
  startsAt: "2035-11-05T18:00:00Z",
  endsAt: "2035-11-05T21:00:00Z",
  signupClosesAt: "2035-11-05T17:45:00Z",
  reservesCloseAt: "2035-11-05T17:00:00Z",
  timeLabel: "5 November · 19:00 CET",
  signupCloseLabel: "5 November · 18:45 CET",
  reservesCloseLabel: "5 November · 18:00 CET",
  capacity: 25,
  roleCaps: { tank: 3, healer: 6, damage: 16 },
  admission: "automatic",
  status: "open",
  version: 1,
  reserveLimit: 0,
  allowDuplicates: false,
  hardReserves: [],
  catalog: null,
  signups: [],
  isOrganizer: false,
  locked: false,
  discordAvailable: true,
  discord: null,
};
function signup(index: number, status = "accepted"): SignupView {
  const className = classes[index % classes.length];
  return {
    id: `signup-${index}`,
    character: {
      ...character,
      name: `Hero${index}`,
      className,
      specialization: specializationsByClass[className][0],
    },
    role: "damage",
    status,
    isMine: index === 0,
    reserves: [],
  };
}
function panel(
  mode: "signup" | "mine" | "leave" | "reserves" | "roster" | "manage",
  value: EventView = event,
  characters: CharacterView[] = [character],
): ReturnType<typeof renderNativePanel> {
  return renderNativePanel(
    value,
    characters,
    {
      id: randomUUID(),
      revision: 1,
      completed: false,
      state: nativeStateSchema.parse({
        mode,
        characterId: characters[0]?.id ?? null,
        className: characters[0]?.className ?? null,
        specialization: characters[0]?.specialization ?? null,
      }),
    },
    "http://127.0.0.1:19300",
  );
}

test("Published rosters close signup panels and expose public attendance labels before the original deadline", (): void => {
  const value: EventView = {
    ...event,
    rosterPublished: true,
    signups: [
      { ...signup(0), attendanceReply: "pending" },
      { ...signup(1), attendanceReply: "confirmed" },
      { ...signup(2, "absent"), attendanceReply: "declined" },
    ],
  };
  const text = JSON.stringify(discordEventPanel(value, "https://example.test"));
  assert.match(text, /Signups closed/);
  assert.match(text, /Waiting/);
  assert.match(text, /Confirmed/);
  assert.match(text, /Declined/);
  const native = panel("signup", value);
  const manage = panel("manage", { ...value, isOrganizer: true });
  assert(
    manage.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .some(
        (control) =>
          control.type === 3 && control.custom_id.endsWith(":candidate"),
      ),
  );
  assert(
    !native.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .some(
        (control) =>
          control.type === 2 &&
          control.label === "Confirm signup" &&
          !control.disabled,
      ),
  );
});
test("First signup separates saved character setup from explicit raid confirmation", (): void => {
  const setup = panel("signup", event, []);
  assert.equal(setup.embeds[0].title, "Step 1 of 2 · Your character");
  assert(
    setup.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .some(
        (control) =>
          control.type === 2 && control.label === "Save character & continue",
      ),
  );
  assert(
    !setup.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .some(
        (control) => control.type === 2 && control.label === "Confirm signup",
      ),
  );
  const confirm = panel("signup");
  assert.equal(confirm.embeds[0].title, "Step 2 of 2 · Confirm your signup");
  assert(
    confirm.components
      .flatMap<NativeButton | NativeSelect>((row) => row.components)
      .some(
        (control) => control.type === 2 && control.label === "Confirm signup",
      ),
  );
  const mine = panel("mine", {
    ...event,
    signups: [{ ...signup(0, "registered"), isMine: true }],
  });
  assert.match(mine.embeds[0].description, /leader will select the roster/);
});

test("Availability controls and named lists keep unavailable people out of seats and remain within Discord limits", () => {
  const value: EventView = {
    ...event,
    admission: "open",
    signups: [
      signup(0, "registered"),
      signup(1, "tentative"),
      signup(2, "absent"),
    ],
  };
  const post = discordEventPanel(value, "https://example.test");
  assert.match(
    post.embeds[0].fields.find((field) => field.name === "Roster")!.value,
    /1 signed up/,
  );
  assert.match(
    post.embeds[0].fields.find((field) => field.name === "Tentative (1)")!
      .value,
    /Hero1/,
  );
  assert.match(
    post.embeds[0].fields.find((field) => field.name === "Absent (1)")!.value,
    /Hero2/,
  );
  for (const action of ["absent", "tentative"] as const)
    assert.equal(nativeTarget(`nraid:e:${event.id}:${action}`).action, action);
  const signupPanel = panel("signup", value);
  nativeMessageSchema.parse(signupPanel);
  assert.equal(signupPanel.components.length, 5);
  const unavailable = {
    ...value,
    isOrganizer: true,
    signups: [{ ...signup(0, "absent"), isMine: true }],
  };
  const mine = panel("mine", unavailable);
  assert.match(mine.embeds[0].description, /Absent/);
  const prompt = renderNativePanel(
    unavailable,
    [character],
    {
      id: randomUUID(),
      revision: 1,
      completed: false,
      state: nativeStateSchema.parse({
        mode: "signup",
        characterId: character.id,
        specialization: "Fury",
        attendance: "tentative",
      }),
    },
    "https://example.test",
  );
  assert.match(prompt.embeds[0].description, /clears soft reserves/);
  assert.ok(
    prompt.components.some((row) =>
      row.components.some(
        (control) =>
          "label" in control && control.label === "Confirm Tentative",
      ),
    ),
  );
  const large = discordEventPanel(
    {
      ...event,
      capacity: 100,
      signups: Array.from({ length: 300 }, (_, index) =>
        signup(
          index,
          index % 3 === 0
            ? "tentative"
            : index % 3 === 1
              ? "absent"
              : "accepted",
        ),
      ),
    },
    "https://example.test",
  );
  const embed = large.embeds[0];
  assert.ok(embed.fields.some((field) => field.name === "Absent (100)"));
  assert.ok(embed.fields.some((field) => field.name === "Tentative (100)"));
  assert.ok(embed.fields.length <= 25);
  assert.ok(embed.fields.every((field) => field.value.length <= 1024));
  assert.ok(
    embed.title.length +
      embed.description.length +
      embed.fields.reduce(
        (sum, field) => sum + field.name.length + field.value.length,
        0,
      ) <=
      6000,
  );
});

test("All class/spec emojis are application-owned, complete and distinct by class", () => {
  assert.equal(Object.keys(discordEmojis()).length, 36);
  for (const className of classes) {
    assert.ok(discordEmoji(className));
    for (const spec of specializationsByClass[className])
      assert.ok(discordEmoji(className, spec));
  }
  assert.notEqual(
    discordEmoji("Warrior", "Protection")?.id,
    discordEmoji("Paladin", "Protection")?.id,
  );
});
test("Discord escaping neutralizes mentions and preserves complete Unicode graphemes", () => {
  assert.equal(discordText("e\u0301X", 1), "e\u0301...");
  const escaped = discordText(
    "@everyone **name**\n[link](https://example.test)",
  );
  assert.ok(!escaped.includes("@everyone"));
  assert.ok(escaped.includes("\\*\\*name\\*\\*"));
  assert.ok(!escaped.includes("\n"));
});
test("Controls round-trip with actor-bound draft revision, bounded IDs and invalid targets rejected", () => {
  const draft = { id: randomUUID(), revision: 10 };
  const target = nativeTarget(draftControl(draft, "confirm"));
  assert.deepEqual(target, { kind: "draft", ...draft, action: "confirm" });
  assert.ok(draftControl(draft, "lock_confirm").length <= 100);
  for (const value of [
    "nraid:d:bad:1:confirm",
    `nraid:d:${draft.id}:0:confirm`,
    `nraid:d:${draft.id}:1:delete`,
    "nraid:e:bad:join",
  ])
    assert.throws(() => nativeTarget(value));
});
test("Acknowledgements validate ephemeral deferral and reject public or malformed responses", () => {
  assert.deepEqual(
    nativeAcknowledgementSchema.parse({ type: 5, data: { flags: 64 } }),
    { type: 5, data: { flags: 64 } },
  );
  assert.throws(() =>
    nativeAcknowledgementSchema.parse({ type: 5, data: { flags: 0 } }),
  );
  assert.throws(() =>
    nativeMessageSchema.parse({
      ...panel("mine"),
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "test",
              placeholder: "test",
              options: [],
              min_values: 1,
              max_values: 1,
            },
          ],
        },
      ],
    }),
  );
});
test("Fifteen-player public rosters list each confirmed name once, with class/spec icons and separate queues", () => {
  const signups = Array.from({ length: 15 }, (_, index) => signup(index));
  const embed = discordEventPanel(
    {
      ...event,
      signups: [...signups, signup(15, "pending"), signup(16, "bench")],
    },
    "https://example.test",
  ).embeds[0];
  const confirmed = embed.fields
    .filter((field) => field.name.startsWith("Group "))
    .map((field) => field.value)
    .join("\n");
  for (const member of signups)
    assert.equal(confirmed.split(`**${member.character.name}**`).length - 1, 1);
  assert.ok(confirmed.includes("<:wr_"));
  assert.ok(!confirmed.includes("Hero15") && !confirmed.includes("Hero16"));
  assert.match(
    embed.fields.find((field) => field.name === "Roster")!.value,
    /15\/25 selected/,
  );
  assert.doesNotMatch(
    embed.fields.find((field) => field.name.startsWith("DPS"))!.value,
    /unclassified|melee|ranged/,
  );
});
test("Large hostile-text rosters stay within every Discord embed budget and retain overflow counts", () => {
  const signups = Array.from({ length: 100 }, (_, index) => ({
    ...signup(
      index,
      index >= 80 ? "pending" : index >= 70 ? "bench" : "accepted",
    ),
    character: { ...signup(index).character, name: "*".repeat(40) },
  }));
  const embed = discordEventPanel(
    {
      ...event,
      title: "*".repeat(120),
      description: "*".repeat(5000),
      signups,
    },
    "https://example.test",
  ).embeds[0];
  assert.ok(embed.fields.length <= 25);
  assert.ok(embed.fields.every((field) => field.value.length <= 1024));
  assert.ok(
    embed.title.length +
      embed.description.length +
      embed.fields.reduce(
        (sum, field) => sum + field.name.length + field.value.length,
        0,
      ) <=
      6000,
  );
  assert.ok(embed.fields.some((field) => field.value.includes("more")));
});
test("TBC damage classifications are reviewed; Forever talent names never imply a range", () => {
  const warrior = signup(0);
  assert.equal(damageKind(warrior), "unclassified");
  assert.equal(
    damageKind({
      ...warrior,
      character: { ...warrior.character, game: "tbc" },
    }),
    "melee",
  );
  const hunter = signup(2);
  assert.equal(
    damageKind({ ...hunter, character: { ...hunter.character, game: "tbc" } }),
    "ranged",
  );
  assert.equal(damageKind({ ...warrior, role: "tank" }), null);
});
test("Forever DPS summaries show occupancy without unknown or invented range counts", () => {
  const value: EventView = {
    ...event,
    eventType: "questing",
    admission: "open",
    capacity: 5,
    roleCaps: { tank: 1, healer: 1, damage: 3 },
    signups: [signup(0), signup(1)],
  };
  const field = discordEventPanel(
    value,
    "https://example.test",
  ).embeds[0].fields.find((entry) => entry.name === "DPS (2/3)");
  assert.ok(field);
  assert.match(field.value, /1 more needed/);
  assert.match(field.value, /Hero0/);
  assert.match(field.value, /Hero1/);
  assert.doesNotMatch(field.value, /unclassified|melee|ranged/);
});
test("Five-player posts pair compact dates and show each player directly under their role once", () => {
  const members = [
    { ...signup(0), role: "tank" as const },
    { ...signup(1), role: "healer" as const },
    signup(2),
    signup(3),
  ];
  const embed = discordEventPanel(
    {
      ...event,
      eventType: "questing",
      admission: "open",
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      signups: members,
    },
    "https://example.test",
  ).embeds[0];
  assert.deepEqual(
    embed.fields.map((field) => field.name),
    ["When", "Finish", "Roster", "Tanks (1/1)", "Healers (1/1)", "DPS (2/3)"],
  );
  assert.match(embed.fields[0].value, /:f>/);
  assert.doesNotMatch(embed.fields[0].value, /:F>/);
  assert.ok(embed.fields[0].inline && embed.fields[1].inline);
  assert.equal(embed.fields[2].inline, false);
  const text = embed.fields.map((field) => field.value).join("\n");
  for (const member of members)
    assert.equal(text.split(`**${member.character.name}**`).length - 1, 1);
  assert.doesNotMatch(text, /▰|▱|`\d{2}`/);
  assert.match(embed.fields[5].value, /1 more needed/);
  assert.match(embed.description, /WoW Forever · Questing/);
});
test("Five-player DPS lines distinguish a Marksmanship Hunter from Combat Rogues in text", (): void => {
  const hunter: SignupView = {
    ...signup(2, "registered"),
    character: {
      ...character,
      name: "Vargos Inc",
      className: "Hunter",
      specialization: "Marksmanship",
    },
  };
  const rogue: SignupView = {
    ...signup(3),
    character: {
      ...character,
      name: "Psyrogue",
      className: "Rogue",
      specialization: "Combat",
    },
  };
  const value: EventView = {
    ...event,
    eventType: "questing",
    capacity: 5,
    admission: "open",
    roleCaps: { tank: 1, healer: 1, damage: 3 },
    signups: [hunter, rogue],
  };
  const dps = discordEventPanel(
    value,
    "https://example.test",
  ).embeds[0].fields.find((field) => field.name === "DPS (2/3)");
  assert.ok(dps);
  const hunterLine = dps.value
    .split("\n")
    .find((line) => line.includes("Vargos Inc"));
  assert.ok(hunterLine);
  assert.match(hunterLine, /\*\*Vargos Inc\*\* · Hunter · Marksmanship/);
  assert.doesNotMatch(hunterLine, /Rogue|Combat/);
  assert.match(dps.value, /\*\*Psyrogue\*\* · Rogue · Combat/);
  assert.equal(hunter.character.className, "Hunter");
  const noSpec = discordEventPanel(
    {
      ...value,
      signups: [
        { ...hunter, character: { ...hunter.character, specialization: null } },
      ],
    },
    "https://example.test",
  ).embeds[0].fields.find((field) => field.name === "DPS (1/3)")!;
  assert.match(noSpec.value, /\*\*Vargos Inc\*\* · Hunter/);
  assert.doesNotMatch(noSpec.value, /null|undefined/);
  const raid = discordEventPanel(
    { ...value, eventType: "raid", capacity: 20 },
    "https://example.test",
  )
    .embeds[0].fields.map((field) => field.value)
    .join("\n");
  assert.ok(raid.includes("**Vargos Inc**"));
  assert.doesNotMatch(raid, /\*\*Vargos Inc\*\* · Hunter/);
});

test("Long organizer notes stay available behind a bounded excerpt instead of pushing down the roster", () => {
  const origin = "https://example.test";
  const embed = discordEventPanel(
    { ...event, description: "@everyone **rules** ".repeat(150) },
    origin,
  ).embeds[0];
  assert.ok(embed.description.length < 550);
  assert.ok(
    embed.description.includes(
      `[Full event details](${origin}/raids/${event.id})`,
    ),
  );
  assert.doesNotMatch(embed.description, /@everyone/);
  const short = discordEventPanel(event, origin).embeds[0];
  assert.ok(short.description.includes(event.description));
  assert.doesNotMatch(short.description, /Full event details/);
});
test("Over-subscribed small groups keep role captions and overflow inside Discord's field limits", () => {
  const embed = discordEventPanel(
    {
      ...event,
      eventType: "dungeon",
      admission: "open",
      capacity: 5,
      roleCaps: { tank: 1, healer: 1, damage: 3 },
      signups: Array.from({ length: 100 }, (_, index) => ({
        ...signup(index, "registered"),
        character: { ...character, name: "*".repeat(40) },
      })),
    },
    "https://example.test",
  ).embeds[0];
  assert.ok(embed.fields.every((field) => field.value.length <= 1024));
  assert.match(
    embed.fields.find((field) => field.name === "DPS (100/3)")!.value,
    /more/,
  );
  assert.match(
    embed.fields.find((field) => field.name === "Tanks (0/1)")!.value,
    /1 more needed/,
  );
  assert.ok(embed.fields.length <= 25);
});
test("Discord posts expose the saved finish and duration, and linked copies use the same event", () => {
  const value = { ...event, endsAt: "2035-11-06T06:00:00Z" };
  const source = {
    guildId: "1557000000000000010",
    channelId: "1557000000000000012",
    messageId: "1557000000000000013",
  };
  const primary = discordEventPanel(value, "https://example.test");
  const mirror = discordMirrorPanel(value, "https://example.test", source);
  const finish = primary.embeds[0].fields.find(
    (field) => field.name === "Finish",
  );
  assert.ok(finish);
  assert.equal(finish.value, `<t:${Date.parse(value.endsAt) / 1000}:f>\n12h`);
  assert.deepEqual(mirror.embeds, primary.embeds);
  assert.ok(
    mirror.components.every((row) =>
      row.components.every(
        (control) => control.type === 2 && control.style === 5,
      ),
    ),
  );
  assert.ok(
    mirror.components.some((row) =>
      row.components.some(
        (control) =>
          control.type === 2 &&
          control.url === `https://example.test/raids/${value.id}`,
      ),
    ),
  );
});
test("DPS range breakdowns are shown only when every damage player has a reviewed classification", () => {
  const warrior: SignupView = {
    ...signup(0),
    character: {
      ...character,
      game: "tbc",
      className: "Warrior",
      specialization: "Fury",
    },
  };
  const hunter: SignupView = {
    ...signup(2),
    character: {
      ...character,
      game: "tbc",
      className: "Hunter",
      specialization: "Marksmanship",
    },
  };
  const reviewed = discordEventPanel(
    { ...event, game: "tbc", signups: [warrior, hunter] },
    "https://example.test",
  ).embeds[0].fields.find((entry) => entry.name.startsWith("DPS"));
  assert.ok(reviewed);
  assert.match(reviewed.value, /1 melee · 1 ranged/);
  const unknown = discordEventPanel(
    {
      ...event,
      game: "tbc",
      signups: [
        warrior,
        { ...hunter, character: { ...hunter.character, specialization: null } },
      ],
    },
    "https://example.test",
  ).embeds[0].fields.find((entry) => entry.name.startsWith("DPS"));
  assert.ok(unknown);
  assert.doesNotMatch(unknown.value, /unclassified|melee|ranged/);
});
test("HR names are disclosed publicly and before signup without internal footers or unbounded lists", () => {
  const raid: EventView = {
    ...event,
    reserveLimit: 4,
    reserveLimits: { tank: 4, healer: 4, damage: 3 },
    hardReserves: [900002],
    catalog: {
      id: "catalog",
      game: "forever",
      raidName: raidCatalogFixture.raidName,
      checksum: "fixture",
      sourcePatch: null,
      clientBuild: null,
      items: raidCatalogFixture.items,
    },
  };
  const embed = discordEventPanel(raid, "https://example.test").embeds[0];
  assert.match(
    embed.fields.find((field) => field.name === "Loot")!.value,
    /Hard reserves \(1\): \*\*Synthetic hard reserve\*\*/,
  );
  assert.ok(!("footer" in embed) && !("timestamp" in embed));
  for (const status of ["locked", "cancelled"])
    assert.ok(
      discordEventPanel(
        { ...raid, status },
        "https://example.test",
      ).embeds[0].fields.some((field) => field.name === "Event status"),
    );
  assert.match(
    panel("signup", raid).embeds[0].description,
    /Synthetic hard reserve/,
  );
  assert.equal(hardReserveText({ ...raid, hardReserves: [] }), "None");
  const large = {
    ...raid,
    hardReserves: Array.from({ length: 200 }, (_, i) => i + 1),
    catalog: {
      ...raid.catalog!,
      items: Array.from({ length: 200 }, (_, i) => ({
        ...raidCatalogFixture.items[0],
        itemId: i + 1,
        name: "*".repeat(150),
      })),
    },
  };
  assert.ok(hardReserveText(large).length < 500);
  assert.match(hardReserveText(large), /more \(Event details\)/);
});

test("Open signups use compact roster groups without pretending they are confirmed seats", () => {
  const raid = {
    ...event,
    admission: "open",
    signups: [signup(0, "registered"), signup(1, "registered")],
  };
  const embed = discordEventPanel(raid, "https://example.test").embeds[0];
  assert.match(
    embed.fields.find((field) => field.name === "Roster")!.value,
    /Open signup.*2 awaiting roster selection/,
  );
  assert.match(
    embed.fields.find((field) => field.name === "Roster")!.value,
    /2 signed up.*25 planned seats/,
  );
  const groups = embed.fields.filter(
    (field) =>
      classes.some((name) => field.name.includes(name)) ||
      field.name.includes("group"),
  );
  assert.ok(groups.some((group) => group.value.includes("Hero0")));
  assert.ok(groups.some((group) => group.value.includes("Hero1")));
  assert.ok(!embed.fields.some((field) => field.name.startsWith("Signed up")));
  assert.ok(groups.every((group) => !group.value.includes(" · damage")));
  assert.match(
    panel("mine", raid).embeds[0].description,
    /Signed up; roster not selected/,
  );
});

test("Discord signup totals include confirmed players and exclude nonattending responses", () => {
  for (const admission of ["open", "automatic", "approval"]) {
    const value = {
      ...event,
      admission,
      signups: [
        ...Array.from({ length: 4 }, (_, index) => signup(index)),
        signup(4, "tentative"),
        signup(5, "absent"),
        signup(6, "withdrawn"),
      ],
    };
    const embed = discordEventPanel(value, "https://example.test").embeds[0];
    const roster = embed.fields.find((field) => field.name === "Roster")!;
    assert.match(roster.value, /4 signed up/);
    assert.match(roster.value, /4(?:\/25)? selected/);
    assert.doesNotMatch(roster.value, /0 signed up/);
    if (admission === "open")
      assert.doesNotMatch(
        embed.fields.find((field) => field.name === "Roster")!.value,
        /roster selection pending/,
      );
  }
});

test("Native buttons are rollout-gated, use explicit actions and disable closed mutation controls", () => {
  const saved = {
    enabled: process.env.FOREVER_RAIDS_NATIVE_ENABLED,
    secret: process.env.COMMUNITY_AUTH_SECRET,
  };
  try {
    process.env.FOREVER_RAIDS_NATIVE_ENABLED = "false";
    assert.ok(
      discordEventPanel(
        event,
        "https://example.test",
      ).components[0].components.every(
        (component) => component.type === 2 && component.style === 5,
      ),
    );
    process.env.FOREVER_RAIDS_NATIVE_ENABLED = "true";
    process.env.COMMUNITY_AUTH_SECRET =
      "synthetic-native-secret-only-for-tests";
    const controls = discordEventPanel(
      { ...event, status: "locked" },
      "https://example.test",
    ).components[0].components;
    assert.ok(
      controls.some(
        (control) =>
          control.type === 2 &&
          control.custom_id?.endsWith(":join") &&
          control.disabled,
      ),
    );
    assert.ok(
      controls.some(
        (control) =>
          control.type === 2 &&
          control.custom_id?.endsWith(":roster") &&
          !control.disabled,
      ),
    );
  } finally {
    for (const [key, value] of [
      ["FOREVER_RAIDS_NATIVE_ENABLED", saved.enabled],
      ["COMMUNITY_AUTH_SECRET", saved.secret],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
test("Raid posts link directly to the visual SR page without replacing native reserve controls", () => {
  const saved = {
    enabled: process.env.FOREVER_RAIDS_NATIVE_ENABLED,
    secret: process.env.COMMUNITY_AUTH_SECRET,
  };
  const raid: EventView = {
    ...event,
    catalog: {
      id: "catalog",
      game: "forever",
      raidName: raidCatalogFixture.raidName,
      checksum: "fixture",
      sourcePatch: null,
      clientBuild: null,
      items: raidCatalogFixture.items,
    },
    reserveLimit: 3,
  };
  const reservesUrl = `https://example.test/raids/${raid.id}/reserves`;
  try {
    process.env.COMMUNITY_AUTH_SECRET =
      "synthetic-native-secret-only-for-tests";
    for (const native of ["false", "true"])
      for (const status of ["open", "locked", "cancelled"]) {
        process.env.FOREVER_RAIDS_NATIVE_ENABLED = native;
        const post = discordEventPanel(
          { ...raid, status },
          "https://example.test",
        );
        const controls = post.components.flatMap((row) =>
          row.components.filter((control) => control.type === 2),
        );
        const links = controls.filter(
          (control) => control.type === 2 && control.url === reservesUrl,
        );
        assert.equal(links.length, 1);
        assert.equal(links[0].style, 5);
        assert.ok(!links[0].disabled);
        assert.ok(!links[0].custom_id);
        assert.ok(
          post.embeds[0].fields
            .find((field) => field.name === "Loot")!
            .value.includes(`[Open soft reserves](${reservesUrl})`),
        );
        assert.ok(post.components.length <= 5);
        assert.ok(post.components.every((row) => row.components.length <= 5));
        assert.ok(
          post.embeds[0].fields.every((field) => field.value.length <= 1024),
        );
        nativeMessageSchema.parse(post);
        if (native === "true") {
          const reserveControl = controls.find(
            (control) =>
              control.type === 2 && control.custom_id?.endsWith(":reserves"),
          );
          assert.ok(reserveControl);
          assert.equal(reserveControl.disabled, status !== "open");
        }
      }
    for (const value of [
      event,
      { ...raid, reserveLimit: 0 },
      { ...raid, eventType: "dungeon" as const },
    ]) {
      const post = discordEventPanel(value, "https://example.test");
      assert.ok(
        !post.components
          .flatMap((row) =>
            row.components.filter((control) => control.type === 2),
          )
          .some(
            (control) =>
              control.type === 2 && control.url?.endsWith("/reserves"),
          ),
      );
      assert.ok(
        !post.embeds[0].fields.some((field) =>
          field.value.includes("/reserves"),
        ),
      );
    }
  } finally {
    for (const [key, value] of [
      ["FOREVER_RAIDS_NATIVE_ENABLED", saved.enabled],
      ["COMMUNITY_AUTH_SECRET", saved.secret],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
test("All native views have bounded, valid controls across empty/full, combat/social, locked/cancelled cases", () => {
  const characters = Array.from({ length: 20 }, (_, index) => ({
    ...character,
    id: `char-${index}`,
    name: `Hero${index}`,
  }));
  for (const eventType of ["raid", "dungeon", "questing", "social"] as const)
    for (const status of ["open", "locked", "cancelled"])
      for (const mode of [
        "signup",
        "mine",
        "leave",
        "reserves",
        "roster",
        "manage",
      ] as const) {
        const value = {
          ...event,
          eventType,
          status,
          isOrganizer: true,
          signups: Array.from({ length: 100 }, (_, index) => signup(index)),
        };
        nativeMessageSchema.parse(panel(mode, value, characters));
        nativeMessageSchema.parse(panel(mode, { ...value, signups: [] }, []));
      }
});
test("Native registration is distinct from confirmation and does not promise a seat", () => {
  const registration = panel("signup", event, []);
  assert.match(registration.embeds[0].description, /does not sign you up/);
  const signupPanel = panel("signup", { ...event, admission: "approval" });
  assert.match(
    signupPanel.embeds[0].description,
    /does not reserve a confirmed seat/,
  );
  assert.match(
    signupPanel.embeds[0].description,
    /participation rules and roster audience/,
  );
});
test("Native reserve basket remains valid when every visible item is selected and HR/class items are excluded", () => {
  const mine = signup(0);
  const value = {
    ...event,
    reserveLimit: 2,
    hardReserves: [900002],
    signups: [mine],
    catalog: {
      id: "catalog-test",
      game: "forever" as const,
      raidName: event.raidName,
      checksum: "test",
      sourcePatch: "test",
      clientBuild: null,
      items: raidCatalogFixture.items,
    },
  };
  const draft = {
    id: randomUUID(),
    revision: 1,
    completed: false,
    state: nativeStateSchema.parse({ mode: "reserves", itemIds: [900001] }),
  };
  const result = renderNativePanel(
    value,
    [character],
    draft,
    "https://example.test",
  );
  nativeMessageSchema.parse(result);
  assert.ok(
    !result.components.some((row) =>
      row.components.some(
        (component) =>
          component.type === 3 && component.custom_id.endsWith(":add"),
      ),
    ),
  );
  assert.match(result.embeds[0].description, /2 excluded/);
});
test("Withdrawal remains available after signup deadline while the event is open", () => {
  const result = panel("leave", {
    ...event,
    signupClosesAt: "2000-01-01T00:00:00Z",
    signups: [signup(0)],
  });
  assert.ok(
    result.components.some((row) =>
      row.components.some(
        (component) =>
          component.type === 2 &&
          component.custom_id?.endsWith(":withdraw") &&
          !component.disabled,
      ),
    ),
  );
});
