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
    /15\/25 confirmed/,
  );
  assert.match(
    embed.fields.find((field) => field.name.startsWith("Damage"))!.value,
    /15 unclassified/,
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
    embed.fields.find((field) => field.name === "Admission")!.value,
    /Open signup.*roster selection pending/,
  );
  assert.match(
    embed.fields.find((field) => field.name === "Roster")!.value,
    /2 signed up.*25 planned seats/,
  );
  const groups = embed.fields.filter((field) => classes.some((name) => field.name.includes(name)) || field.name.includes("group"));
  assert.ok(groups.some((group) => group.value.includes("Hero0")));
  assert.ok(groups.some((group) => group.value.includes("Hero1")));
  assert.ok(!embed.fields.some((field) => field.name.startsWith("Signed up")));
  assert.ok(groups.every((group) => !group.value.includes(" · damage")));
  assert.match(
    panel("mine", raid).embeds[0].description,
    /Signed up; roster not selected/,
  );
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
    process.env.COMMUNITY_AUTH_SECRET = "synthetic-native-secret-only-for-tests";
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
        assert.ok(post.embeds[0].fields.every((field) => field.value.length <= 1024));
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
          .flatMap((row) => row.components.filter((control) => control.type === 2))
          .some(
            (control) => control.type === 2 && control.url?.endsWith("/reserves"),
          ),
      );
      assert.ok(
        !post.embeds[0].fields.some((field) => field.value.includes("/reserves")),
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
