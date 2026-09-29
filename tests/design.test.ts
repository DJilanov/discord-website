import assert from "node:assert/strict";
import { test } from "node:test";
import type { Heading, Root } from "mdast";
import { remarkContents } from "../lib/markdown-contents";

test("guide contents use real headings, unique anchors and formatted text", () => {
  const headings: Heading[] = [
    {
      type: "heading",
      depth: 2,
      children: [{ type: "text", value: "Start here" }],
    },
    {
      type: "heading",
      depth: 2,
      children: [{ type: "text", value: "Start here" }],
    },
    {
      type: "heading",
      depth: 2,
      children: [
        { type: "strong", children: [{ type: "text", value: "Loot rules" }] },
      ],
    },
  ];
  const tree: Root = {
    type: "root",
    children: [{ type: "code", value: "## Not a heading" }, ...headings],
  };
  remarkContents()(tree);
  assert.equal(tree.children[0].data?.hName, "details");
  assert.deepEqual(
    headings.map((heading) => heading.data?.hProperties?.id),
    ["section-1", "section-2", "section-3"],
  );
  const contents = tree.children[0];
  assert.equal(contents.type, "blockquote");
  if (contents.type !== "blockquote")
    throw new Error("Contents were not inserted.");
  const list = contents.children[1];
  assert.equal(list.type, "list");
  if (list.type !== "list") throw new Error("Contents list missing.");
  assert.equal(list.children.length, 3);
  assert.match(JSON.stringify(list.children[2]), /Loot rules/);
  assert.doesNotMatch(JSON.stringify(list), /Not a heading/);
});

test("short guides do not get an empty or unnecessary contents menu", () => {
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "heading",
        depth: 2,
        children: [{ type: "text", value: "One section" }],
      },
    ],
  };
  const original = structuredClone(tree);
  remarkContents()(tree);
  assert.deepEqual(tree, original);
});
