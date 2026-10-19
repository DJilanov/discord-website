"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Package, X } from "lucide-react";
import type { CatalogItem } from "@/lib/raids/contracts";
import type { RaidGame } from "@/lib/raids/games";

export function RaidItemIcon({
  item,
  game,
}: {
  item: CatalogItem;
  game: RaidGame;
}): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`raid-item-icon raid-quality-${item.details?.quality ?? 1}`}
    >
      {item.details && !failed ? (
        <Image
          src={`/images/raids/items/${game}/${item.details.icon}.jpg`}
          width={56}
          height={56}
          alt=""
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={28} aria-hidden="true" />
      )}
    </span>
  );
}
function ItemFacts({ item }: { item: CatalogItem }): React.JSX.Element {
  return (
    <div className="raid-item-facts">
      <p
        className={`raid-item-fact-name raid-quality-${item.details?.quality ?? 1}`}
      >
        {item.name}
      </p>
      {item.details ? (
        item.details.lines.map((line, index) => (
          <p key={index} className={`raid-item-fact-line tone-${line.tone}`}>
            <span>{line.left}</span>
            {line.right && <span>{line.right}</span>}
          </p>
        ))
      ) : (
        <p className="muted">
          Item stats have not been imported for this catalog.
        </p>
      )}
      <p className="raid-item-fact-source">{item.lootSource}</p>
      {item.details?.source && (
        <p className="raid-item-fact-evidence">
          Client build {item.details.source.buildNumber}
          {item.details.source.unresolvedEffects > 0
            ? ` · ${item.details.source.unresolvedEffects} effect formulas unavailable; spell names shown`
            : ""}
        </p>
      )}
    </div>
  );
}
export function ItemInspection({
  item,
  game,
}: {
  item: CatalogItem;
  game: RaidGame;
}): React.JSX.Element {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const cancelClose = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const closeHover = (): void => {
    cancelClose();
    closeTimer.current = setTimeout(() => setPosition(null), 150);
  };
  const preview = (): void => {
    cancelClose();
    if (
      !anchor.current ||
      dismissed.current ||
      !matchMedia("(hover: hover) and (min-width: 600px)").matches ||
      open
    )
      return;
    const bounds = anchor.current.getBoundingClientRect();
    const right = bounds.right + 10;
    setPosition({
      left: Math.max(
        12,
        Math.min(
          right + 320 < innerWidth ? right : bounds.left - 330,
          innerWidth - 332,
        ),
      ),
      top: Math.max(12, Math.min(bounds.top, innerHeight - 380)),
      maxHeight: Math.max(180, innerHeight - 24),
    });
  };
  useEffect(() => {
    if (!position) return;
    const hide = (): void => setPosition(null);
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissed.current = true;
        hide();
      }
    };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide);
    return () => {
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [position]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="raid-item-inspect"
        aria-label={`Inspect ${item.name}`}
        aria-describedby={position ? id : undefined}
        onMouseEnter={preview}
        onMouseLeave={() => {
          dismissed.current = false;
          closeHover();
        }}
        onFocus={preview}
        onBlur={() => {
          dismissed.current = false;
          setPosition(null);
        }}
        onClick={() => {
          setPosition(null);
          setOpen(true);
        }}
      >
        <RaidItemIcon item={item} game={game} />
        <span>
          <strong className={`raid-quality-${item.details?.quality ?? 1}`}>
            {item.name}
          </strong>
          <small>{item.lootSource}</small>
        </span>
      </button>
      {position &&
        createPortal(
          <div
            className="raid-item-tooltip"
            id={id}
            role="tooltip"
            style={{
              left: position.left,
              top: position.top,
              maxHeight: Math.min(
                position.maxHeight,
                innerHeight - position.top - 12,
              ),
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={closeHover}
          >
            <ItemFacts item={item} />
          </div>,
          document.body,
        )}
      {open && (
        <dialog
          ref={dialog}
          className="raid-item-dialog"
          aria-labelledby={`${id}-title`}
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              )
                setOpen(false);
            }
          }}
        >
          <header>
            <h2 id={`${id}-title`}>Item details</h2>
            <button
              className="icon-button"
              aria-label="Close item details"
              title="Close item details"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <RaidItemIcon item={item} game={game} />
          <ItemFacts item={item} />
          <a
            className="text-link"
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} /> Wowhead source
          </a>
        </dialog>
      )}
    </>
  );
}
