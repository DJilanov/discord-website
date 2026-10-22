import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeToolGroupDraft,
  encodeToolGroupDraft,
  toolGroupCreatePath,
  toolGroupPrefill,
  toolGroupDraftSchema,
  toolGroupEventType,
  type ToolGroupDraft,
} from "../lib/tool-group-draft";
import { memberRedirectPath } from "../lib/member-auth-options";
import { groupFilter } from "../lib/directory";

const draft: ToolGroupDraft = {
  version: 1,
  kind: "leveling",
  label: "Human leveling",
  sourceUrl:
    "https://kfcguild.online/tools/forever/leveling/routes/alliance-human",
  faction: "Alliance",
  capacity: 5,
};

test("tool plans survive UTF-8 wire encoding without gaining publication authority", () => {
  const value = { ...draft, label: "Human leveling - Δοκιμή" };
  assert.deepEqual(decodeToolGroupDraft(encodeToolGroupDraft(value)), value);
  assert.equal(decodeToolGroupDraft("not-json"), null);
  assert.equal(decodeToolGroupDraft("x".repeat(2401)), null);
  assert.equal(decodeToolGroupDraft([encodeToolGroupDraft(draft)]), null);
  assert.equal(
    toolGroupDraftSchema.safeParse({ ...draft, discordChannelId: "123" })
      .success,
    false,
  );
  assert.equal(
    toolGroupDraftSchema.safeParse({ ...draft, approved: true }).success,
    false,
  );
});

test("source plans cannot become external redirects, operational endpoints or credential links", () => {
  assert.equal(
    toolGroupDraftSchema.safeParse({ ...draft, faction: "Horde" }).success,
    false,
  );
  for (const sourceUrl of [
    "https://evil.test/tools/forever/leveling/routes/alliance-human",
    "https://kfcguild.online.evil.test/tools/forever/leveling/routes/alliance-human",
    "https://user:password@kfcguild.online/tools/forever/leveling/routes/alliance-human",
    "https://kfcguild.online/tools/api/admin",
    "https://kfcguild.online/tools/forever/leveling/routes/alliance-human?token=private",
    "https://kfcguild.online/tools/forever/leveling/routes/alliance-human#private",
    "https://kfcguild.online/tools/forever/leveling/routes/../../admin",
    "https://kfcguild.online/tools/forever/encyclopedia/quests/10",
  ])
    assert.equal(
      toolGroupDraftSchema.safeParse({ ...draft, sourceUrl }).success,
      false,
      sourceUrl,
    );
});

test("only an explicit validated tool draft can extend the member login return path", () => {
  const path = toolGroupCreatePath(draft);
  assert.equal(memberRedirectPath(path), path);
  for (const value of [
    `${path}&next=https://evil.test`,
    `${path}&draft=${encodeToolGroupDraft(draft)}`,
    `${path}#fragment`,
    "/raids/new?draft=invalid",
    `https://evil.test${path}`,
    `/account/characters?draft=${encodeToolGroupDraft(draft)}`,
  ])
    assert.equal(memberRedirectPath(value), "/raids", value);
});

test("drafts prefill ordinary editable event fields, never channel or approval settings", () => {
  const dungeonBranch = {
    ...draft,
    sourceUrl:
      "https://kfcguild.online/tools/forever/leveling/routes/alliance-human/dungeons/thanes?chapter=chapter-126-14-16-darkshore&plan=alternative",
  };
  assert.equal(toolGroupDraftSchema.safeParse(dungeonBranch).success, true);
  assert.equal(toolGroupEventType(dungeonBranch), "dungeon");
  assert.equal(toolGroupPrefill(dungeonBranch).eventType, "dungeon");
  assert.deepEqual(toolGroupPrefill(draft), {
    title: "Human leveling group",
    target: "Human leveling",
    eventType: "questing",
    capacity: 5,
    admission: "open",
    faction: "Alliance",
    roleCaps: { tank: 1, healer: 1, damage: 3 },
    description: `Our planning reference: ${draft.sourceUrl}\n\nConfirm the route, character levels, prerequisites and pace with the organizer before joining. The linked reference does not establish live availability or guarantee a finish time.`,
  });
  assert.equal(
    toolGroupPrefill({
      ...draft,
      kind: "dungeon",
      sourceUrl:
        "https://kfcguild.online/tools/forever/encyclopedia/instances/36",
    }).eventType,
    "dungeon",
  );
  for (const capacity of [2, 3, 4, 5]) {
    const caps = toolGroupPrefill({ ...draft, capacity }).roleCaps;
    assert.equal(caps.tank + caps.healer + caps.damage, capacity);
  }
  const where = groupFilter({ q: "Human leveling" });
  assert.deepEqual(where.OR, [
    { title: { contains: "Human leveling", mode: "insensitive" } },
    { description: { contains: "Human leveling", mode: "insensitive" } },
  ]);
  assert.equal(where.status, "approved");
});
