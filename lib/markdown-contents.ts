import type { Heading, ListItem, PhrasingContent, Root } from "mdast";

function headingText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      if (node.type === "text" || node.type === "inlineCode") return node.value;
      if (node.type === "image" || node.type === "imageReference")
        return node.alt || "";
      if ("children" in node) return headingText(node.children);
      return "";
    })
    .join("");
}

export function remarkContents(): (tree: Root) => void {
  return (tree: Root): void => {
    const headings = tree.children.filter(
      (node): node is Heading => node.type === "heading" && node.depth === 2,
    );
    if (headings.length < 3) return;
    const items: ListItem[] = headings.map((heading, index): ListItem => {
      const id = `section-${index + 1}`;
      heading.data = {
        ...heading.data,
        hProperties: { ...heading.data?.hProperties, id },
      };
      return {
        type: "listItem",
        spread: false,
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: `#${id}`,
                children: [
                  { type: "text", value: headingText(heading.children) },
                ],
              },
            ],
          },
        ],
      };
    });
    tree.children.unshift({
      type: "blockquote",
      data: {
        hName: "details",
        hProperties: { className: ["article-contents"] },
      },
      children: [
        {
          type: "paragraph",
          data: { hName: "summary" },
          children: [{ type: "text", value: "On this page" }],
        },
        { type: "list", ordered: false, spread: false, children: items },
      ],
    });
  };
}
