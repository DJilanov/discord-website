"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/ui";

const links = [
  ["/discord", "Discord"],
  ["/guild-recruitment", "Find a guild"],
  ["/lfg", "Find a group"],
  ["/guides", "Guides"],
  ["/addons", "Addons"],
] as const;

export function SiteNav({
  inviteAvailable,
}: {
  inviteAvailable: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const toggle = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && disclosure.current?.open) {
        disclosure.current.open = false;
        toggle.current?.focus();
      }
    };
    const onOutsideClick = (event: PointerEvent): void => {
      if (
        disclosure.current?.open &&
        event.target instanceof Node &&
        !disclosure.current.contains(event.target)
      ) {
        disclosure.current.open = false;
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutsideClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutsideClick);
    };
  }, []);
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={pathname.startsWith(href) ? "active" : ""}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-end">
          <Link href="/safety" className="safety-nav" title="Community safety">
            <ShieldCheck size={18} />
            <span>Safety</span>
          </Link>
          <Link
            prefetch={false}
            href={inviteAvailable ? "/join" : "/discord#invite"}
            className="button primary nav-join"
          >
            Join Discord
            <ArrowUpRight size={16} />
          </Link>
          <details className="mobile-disclosure" ref={disclosure}>
            <summary
              ref={toggle}
              role="button"
              className="icon-button mobile-toggle"
              aria-controls="mobile-navigation"
            >
              <Menu className="navigation-open" aria-hidden="true" />
              <X className="navigation-close" aria-hidden="true" />
              <span className="sr-only navigation-open">Open navigation</span>
              <span className="sr-only navigation-close">Close navigation</span>
            </summary>
            <nav
              id="mobile-navigation"
              aria-label="Mobile navigation"
              className="mobile-nav"
            >
              {[
                ...links,
                ["/safety", "Community safety"],
                ["/rules", "Community rules"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    if (disclosure.current) disclosure.current.open = false;
                  }}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  {label}
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
