import ReactMarkdown from "react-markdown";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import { remarkContents } from "@/lib/markdown-contents";
import { getArtwork } from "@/content/artwork";

export function Markdown({
  children,
  contents = false,
  editorial = false,
}: {
  children: string;
  contents?: boolean;
  editorial?: boolean;
}): React.JSX.Element {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={contents ? [remarkGfm, remarkContents] : [remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              {...(href?.startsWith("https://")
                ? { target: "_blank", rel: "noopener noreferrer nofollow" }
                : {})}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            const approved =
              typeof src === "string" ? getArtwork(src) : undefined;
            if (!editorial || !approved || typeof src !== "string")
              return <span className="muted">{alt || "Image omitted"}</span>;
            return (
              <Image
                className="editorial-inline-image"
                src={src}
                alt={alt || approved.alt}
                width={approved.width}
                height={approved.height}
                sizes="(max-width: 800px) calc(100vw - 40px), 760px"
                loading="lazy"
              />
            );
          },
          table: ({ children }) => (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable article table"
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
