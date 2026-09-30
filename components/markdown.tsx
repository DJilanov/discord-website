import ReactMarkdown from "react-markdown";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import { remarkContents } from "@/lib/markdown-contents";
import { getArtwork } from "@/content/artwork";
import { isValidElement } from "react";
import { CopyButton } from "@/components/copy-button";

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
          pre: ({ children }) => {
            const text =
              editorial &&
              isValidElement<{ className?: string; children?: unknown }>(
                children,
              ) &&
              children.props.className === "language-text" &&
              typeof children.props.children === "string"
                ? children.props.children
                : null;
            if (!text) return <pre>{children}</pre>;
            return (
              <div className="article-template">
                <CopyButton
                  text={text}
                  label="Copy template"
                  errorMessage="Clipboard unavailable. Select the template text or use its download link."
                />
                <pre>{children}</pre>
              </div>
            );
          },
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
