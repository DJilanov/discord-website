import assert from "node:assert/strict";
import { test } from "node:test";
import { kfcRulesId } from "../content/kfc-community";
import { assertRulesDeletion, retiredRulesIds } from "../lib/kfc-rules-cleanup";

test("Only the two explicitly approved rules IDs may be deleted", (): void => {
  for (const id of retiredRulesIds)
    assertRulesDeletion(id, { rules_channel_id: kfcRulesId }, []);
  assert.throws(() =>
    assertRulesDeletion(kfcRulesId, { rules_channel_id: kfcRulesId }, []),
  );
  assert.throws(() =>
    assertRulesDeletion(
      "1548747530790248610",
      { rules_channel_id: kfcRulesId },
      [],
    ),
  );
});
test("A rules/onboarding/system reference blocks deletion", (): void => {
  assert.throws(() =>
    assertRulesDeletion(
      retiredRulesIds[0],
      { rules_channel_id: retiredRulesIds[0] },
      [],
    ),
  );
  assert.throws(() =>
    assertRulesDeletion(
      retiredRulesIds[0],
      { rules_channel_id: kfcRulesId, system_channel_id: retiredRulesIds[0] },
      [],
    ),
  );
  assert.throws(() =>
    assertRulesDeletion(retiredRulesIds[0], { rules_channel_id: kfcRulesId }, [
      retiredRulesIds[0],
    ]),
  );
});
