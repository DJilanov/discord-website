import ReactMarkdown from "react-markdown";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import { remarkContents } from "@/lib/markdown-contents";
import { getArtwork } from "@/content/artwork";
import { isValidElement } from "react";
import { CopyButton } from "@/components/copy-button";
import { canonicalToolHref } from "@/content/tool-links";
import { ClassGuide } from "@/components/class-guide";
import { getClassGuide } from "@/content/class-guides";
import {
  SimulationGuide,
  SimulationTierList,
} from "@/components/simulation-guide";
import { simulationClassProfiles } from "@/content/simulation-class-profiles";

export function Markdown({
  children,
  contents = false,
  editorial = false,
  classGuideAssetBase,
  linkBaseUrl,
  simulationAssetBase,
  simulationDataBase,
}: {
  children: string;
  contents?: boolean;
  editorial?: boolean;
  classGuideAssetBase?: string;
  linkBaseUrl?: string;
  simulationAssetBase?: string;
  simulationDataBase?: string;
}): React.JSX.Element {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={contents ? [remarkGfm, remarkContents] : [remarkGfm]}
        skipHtml
        components={{
          pre: ({ children }) => {
            if (
              editorial &&
              isValidElement<{ className?: string; children?: unknown }>(
                children,
              ) &&
              typeof children.props.children === "string"
            ) {
              const key = children.props.children.trim();
              if (
                children.props.className === "language-simulation-guide" &&
                simulationClassProfiles.some((profile) => profile.key === key)
              )
                return (
                  <SimulationGuide
                    classKey={key}
                    assetBase={simulationAssetBase}
                    dataBase={simulationDataBase}
                  />
                );
              if (
                children.props.className === "language-simulation-tier" &&
                key === "standard"
              )
                return (
                  <SimulationTierList
                    assetBase={simulationAssetBase}
                    dataBase={simulationDataBase}
                  />
                );
            }
            if (
              editorial &&
              isValidElement<{ className?: string; children?: unknown }>(
                children,
              ) &&
              children.props.className === "language-class-guide" &&
              typeof children.props.children === "string" &&
              getClassGuide(children.props.children.trim())
            ) {
              return (
                <ClassGuide
                  guideKey={children.props.children.trim()}
                  assetBase={classGuideAssetBase}
                />
              );
            }
            const text =
              editorial &&
              isValidElement<{ className?: string; children?: unknown }>(
                children,
              ) &&
              children.props.className === "language-text" &&
              typeof children.props.children === "string"
                ? children.props.children
                : null;
            if (!text) return <pre tabIndex={0}>{children}</pre>;
            return (
              <div className="article-template">
                <CopyButton
                  text={text}
                  label="Copy template"
                  errorMessage="Clipboard unavailable. Select the template text or use its download link."
                />
                <pre tabIndex={0}>{children}</pre>
              </div>
            );
          },
          a: ({ href, children }) => {
            // Stored guides may predate the move; preserve editor content in storage.
            const canonical = href ? canonicalToolHref(href) : href;
            const canonicalHref =
              linkBaseUrl && canonical?.startsWith("/")
                ? new URL(canonical, linkBaseUrl).href
                : canonical;
            return (
              <a
                href={canonicalHref}
                {...(canonicalHref?.startsWith("https://")
                  ? { target: "_blank", rel: "noopener noreferrer nofollow" }
                  : {})}
              >
                {typeof children === "string" && children === href
                  ? canonicalHref
                  : children}
              </a>
            );
          },
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
