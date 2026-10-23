interface RecordValue {
  [key: string]: unknown;
}
export interface RecordedRotation {
  priorities: string[];
  prepull: string[];
  disabled: string[];
}

function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a recorded APL object");
  return value as RecordValue;
}

export function describeRecordedRotation(
  value: unknown,
  names: Readonly<Record<string, string>>,
): RecordedRotation {
  function name(value: unknown): string {
    const id = record(value);
    const key = id.spellId ? `spell:${id.spellId}` : `item:${id.itemId}`;
    const label = names[key];
    if (!label) throw new Error(`Missing recorded ability name: ${key}`);
    const variants = [
      id.rank ? `rank ${id.rank}` : "",
      id.tag ? `tag ${id.tag}` : "",
    ].filter(Boolean);
    return label + (variants.length ? ` (${variants.join(", ")})` : "");
  }
  function condition(value: unknown, depth = 0): string {
    if (depth > 24) throw new Error("Recorded APL nesting limit exceeded");
    const node = record(value),
      keys = Object.keys(node);
    if (keys.length !== 1) throw new Error("Ambiguous recorded APL condition");
    const kind = keys[0],
      data = record(node[kind]);
    const recurse = (next: unknown): string => condition(next, depth + 1);
    if (kind === "const") {
      if (typeof data.val !== "string") throw new Error("Invalid APL constant");
      return data.val;
    }
    if (kind === "and" || kind === "or") {
      if (
        !Array.isArray(data.vals) ||
        !data.vals.length ||
        data.vals.length > 32
      )
        throw new Error("Invalid APL condition group");
      return `(${data.vals.map(recurse).join(kind === "and" ? " AND " : " OR ")})`;
    }
    if (kind === "not") return `NOT (${recurse(data.val)})`;
    if (kind === "cmp" || kind === "math") {
      const operators: Record<string, string> =
        kind === "cmp"
          ? {
              OpEq: "=",
              OpNe: "!=",
              OpGe: ">=",
              OpGt: ">",
              OpLe: "<=",
              OpLt: "<",
            }
          : { OpAdd: "+", OpSub: "-", OpMul: "*", OpDiv: "/" };
      const op = typeof data.op === "string" ? operators[data.op] : undefined;
      if (!op) throw new Error("Unsupported recorded APL operator");
      return `(${recurse(data.lhs)} ${op} ${recurse(data.rhs)})`;
    }
    const resources: Record<string, string> = {
      currentRage: "rage",
      currentEnergy: "energy",
      currentComboPoints: "combo points",
      currentMana: "mana",
      maxMana: "maximum mana",
      remainingTime: "fight time remaining",
    };
    if (Object.hasOwn(resources, kind)) return resources[kind];
    if (kind === "isExecutePhase") {
      if (typeof data.threshold !== "string" || !/^E\d+$/.test(data.threshold))
        throw new Error("Unknown execute threshold");
      return `execute phase below ${data.threshold.slice(1)}%`;
    }
    if (kind === "autoTimeToNext" || kind === "autoSwingTime") {
      if (data.autoType !== "MainHand" && data.autoType !== "OffHand")
        throw new Error("Unsupported auto-attack kind");
      return `${data.autoType === "MainHand" ? "main-hand" : "off-hand"} ${kind === "autoTimeToNext" ? "time to next attack" : "swing interval"}`;
    }
    if (kind === "auraIsActive") return `${name(data.auraId)} is active`;
    if (kind === "auraRemainingTime")
      return `${name(data.auraId)} time remaining`;
    if (kind === "dotIsActive")
      return `${name(data.spellId)} is active on the target`;
    if (kind === "spellIsReady") return `${name(data.spellId)} is ready`;
    if (kind === "spellTimeToReady")
      return `${name(data.spellId)} cooldown remaining`;
    if (kind === "spellCanCast") return `${name(data.spellId)} can be cast`;
    throw new Error(`Unsupported recorded APL condition: ${kind}`);
  }
  function action(value: unknown): string {
    const node = record(value);
    if (
      Object.keys(node).some(
        (key) =>
          !["condition", "castSpell", "autocastOtherCooldowns"].includes(key),
      )
    )
      throw new Error("Unsupported recorded APL action");
    if (Boolean(node.castSpell) === Boolean(node.autocastOtherCooldowns))
      throw new Error("Ambiguous recorded APL action");
    const text = node.castSpell
      ? `Use ${name(record(node.castSpell).spellId)} when available`
      : "Use other enabled cooldowns when available";
    return (
      text + (node.condition ? ` if ${condition(node.condition)}` : "") + "."
    );
  }
  const rotation = record(value),
    result: RecordedRotation = { priorities: [], prepull: [], disabled: [] };
  if (rotation.type !== "TypeAPL" || !Array.isArray(rotation.priorityList))
    throw new Error("An explicit recorded rotation is required");
  for (const entry of rotation.priorityList) {
    const row = record(entry),
      node = record(row.action);
    const disabled =
      row.hide === true ||
      (node.condition &&
        record(record(node.condition).const ?? {}).val === "false");
    const text = action(node);
    (disabled ? result.disabled : result.priorities).push(text);
  }
  if (rotation.prepullActions !== undefined) {
    if (!Array.isArray(rotation.prepullActions))
      throw new Error("Invalid prepull actions");
    for (const entry of rotation.prepullActions) {
      const row = record(entry);
      result.prepull.push(
        `${condition(row.doAtValue)} before/relative to pull: ${action(row.action)}`,
      );
    }
  }
  return result;
}
