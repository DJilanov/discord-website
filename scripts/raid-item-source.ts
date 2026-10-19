import { load, type CheerioAPI } from "cheerio";
import {
  itemDetailsSchema,
  type ItemDetails,
} from "../lib/raids/item-detail-contracts";
import type { RaidGame } from "../lib/raids/games";

export function readRaidItemXml(
  xml: string,
  itemId: number,
  game: RaidGame,
): ItemDetails {
  if (Buffer.byteLength(xml) > 250000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Unsupported item XML.");
  const record = load(xml, { xmlMode: true });
  const item = record("wowhead > item");
  if (item.length !== 1 || item.attr("id") !== String(itemId))
    throw new Error("Item identity mismatch.");
  const link = new URL(item.children("link").text());
  if (
    link.origin !== "https://www.wowhead.com" ||
    !link.pathname.startsWith(`/${game}/item=${itemId}/`)
  )
    throw new Error("Item edition mismatch.");
  const name = item.children("name").text();
  const document = load(item.children("htmlTooltip").text());
  const primaryText = document("body > table").first().text();
  const binding = primaryText.includes("Binds when equipped")
    ? "equip"
    : primaryText.includes("Binds when picked up")
      ? "pickup"
      : primaryText.includes("Binds when used")
        ? "use"
        : "none";
  const professionBook =
    document('a[href*="/skill="]').length > 0 &&
    /Use:.*(?:maximum (?:skill|potential)|teaches you (?:how to|the)|allows you to)/i.test(
      document.text(),
    );
  document(
    "script,style,iframe,object,img,.whtt-sellprice,.whtt-extra:not(.whtt-ilvl):not(.whtt-maxstack)",
  ).remove();
  document("b")
    .filter((_index, element) => document(element).text() === name)
    .first()
    .remove();
  const lines: ItemDetails["lines"] = [];
  let line: ItemDetails["lines"][number] = {
    left: "",
    right: "",
    tone: "normal",
  };
  const flush = (): void => {
    line.left = line.left.replace(/\s+/g, " ").trim();
    line.right = line.right.replace(/\s+/g, " ").trim();
    if (line.left || line.right) lines.push(line);
    line = { left: "", right: "", tone: "normal" };
  };
  let nodes = 0;
  function walk(
    node: ReturnType<CheerioAPI>[number],
    side: "left" | "right",
    tone: ItemDetails["lines"][number]["tone"],
  ): void {
    if (++nodes > 10000) throw new Error("Item tooltip too complex.");
    if (node.type === "text") {
      line[side] += node.data;
      if (tone !== "normal") line.tone = tone;
      return;
    }
    if (node.type !== "tag") return;
    if (node.name === "br") {
      flush();
      return;
    }
    if (node.name === "table") flush();
    const classes = (node.attribs.class || "").split(/\s+/);
    const nextTone = classes.includes("q2")
      ? "effect"
      : classes.includes("socket-bonus") ||
          classes.some((value) => value.startsWith("socket-"))
        ? "socket"
        : classes.includes("q") || classes.includes("q0")
          ? "muted"
          : tone;
    for (const child of node.children)
      walk(child, node.name === "th" ? "right" : side, nextTone);
    if (["tr", "div", "table"].includes(node.name)) flush();
  }
  for (const root of document("body").contents()) walk(root, "left", "normal");
  flush();
  return itemDetailsSchema.parse({
    itemId,
    name,
    quality: Number(item.children("quality").attr("id")),
    icon: item.children("icon").text().toLowerCase(),
    classId: Number(item.children("class").attr("id")),
    subclassId: Number(item.children("subclass").attr("id")),
    binding,
    professionBook,
    lines,
  });
}
