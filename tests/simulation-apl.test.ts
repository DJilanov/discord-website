import assert from "node:assert/strict";
import { test } from "node:test";
import { describeRecordedRotation } from "../lib/simulation-apl";

const names = { "spell:1": "Recorded attack", "spell:2": "Recorded aura" };
const attack = { castSpell: { spellId: { spellId: 1 } } };
test("recorded priorities preserve order, nested AND/OR/NOT, thresholds, disabled actions and prepull", () => {
  const result = describeRecordedRotation(
    {
      type: "TypeAPL",
      prepullActions: [
        { action: attack, doAtValue: { const: { val: "-1s" } } },
      ],
      priorityList: [
        { action: { ...attack, condition: { const: { val: "false" } } } },
        {
          action: {
            ...attack,
            condition: {
              and: {
                vals: [
                  {
                    cmp: {
                      op: "OpGe",
                      lhs: { currentRage: {} },
                      rhs: { const: { val: "30" } },
                    },
                  },
                  {
                    not: {
                      val: {
                        or: {
                          vals: [
                            { isExecutePhase: { threshold: "E20" } },
                            { auraIsActive: { auraId: { spellId: 2 } } },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        { action: { autocastOtherCooldowns: {} } },
      ],
    },
    names,
  );
  assert.deepEqual(result.priorities, [
    "Use Recorded attack when available if ((rage >= 30) AND NOT ((execute phase below 20% OR Recorded aura is active))).",
    "Use other enabled cooldowns when available.",
  ]);
  assert.deepEqual(result.disabled, [
    "Use Recorded attack when available if false.",
  ]);
  assert.deepEqual(result.prepull, [
    "-1s before/relative to pull: Use Recorded attack when available.",
  ]);
});
test("unsupported or ambiguous APL semantics fail closed rather than manufacturing rotation advice", () => {
  for (const action of [
    { ...attack, condition: { unknown: {} } },
    {
      ...attack,
      condition: {
        cmp: {
          op: "invented",
          lhs: { currentRage: {} },
          rhs: { const: { val: "1" } },
        },
      },
    },
    { castSpell: { spellId: { spellId: 999 } } },
    { ...attack, autocastOtherCooldowns: {} },
    { ...attack, channelSpell: {} },
    { ...attack, condition: { currentRage: {}, currentEnergy: {} } },
  ])
    assert.throws(() =>
      describeRecordedRotation(
        { type: "TypeAPL", priorityList: [{ action }] },
        names,
      ),
    );
  assert.throws(() => describeRecordedRotation({ type: "auto" }, names));
});
