"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsTracker(): null {
  const pathname = usePathname();
  useEffect(() => {
    if (
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    let sessionId = "";
    let attribution = {
      referrer: document.referrer,
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
    };
    try {
      sessionId =
        sessionStorage.getItem("forever-session") || crypto.randomUUID();
      sessionStorage.setItem("forever-session", sessionId);
      const saved = sessionStorage.getItem("forever-attribution");
      if (saved) attribution = JSON.parse(saved) as typeof attribution;
      else {
        const query = new URLSearchParams(location.search);
        attribution = {
          ...attribution,
          utmSource: query.get("utm_source") || "",
          utmMedium: query.get("utm_medium") || "",
          utmCampaign: query.get("utm_campaign") || "",
        };
        sessionStorage.setItem(
          "forever-attribution",
          JSON.stringify(attribution),
        );
      }
    } catch {
      /* Tracking remains optional when browser storage is unavailable. */
    }
    const send = (event: "page_view" | "discord_click", path: string): void => {
      void fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, path, sessionId, ...attribution }),
        keepalive: true,
      }).catch(() => {
        /* Analytics failures must not interrupt navigation. */
      });
    };
    send("page_view", pathname);
    const onClick = (event: MouseEvent): void => {
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (target?.getAttribute("href") === "/join")
        send("discord_click", pathname);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);
  return null;
}
