"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

export function useEventRefresh(
  id: string,
  version: number,
  enabled: boolean,
): "live" | "paused" {
  const router = useRouter();
  const [status, setStatus] = useState<"live" | "paused">("live");
  useEffect(() => {
    if (!enabled) return;
    let request: AbortController | undefined;
    async function check(): Promise<void> {
      if (document.visibilityState !== "visible" || request) return;
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => {
        if (!controller.signal.aborted) setStatus("paused");
        controller.abort();
      }, 8000);
      try {
        const response = await fetch(
          `/api/raids/${encodeURIComponent(id)}/revision`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) {
          setStatus("paused");
          return;
        }
        const latest = z
          .object({ version: z.number().int().positive() })
          .parse(await response.json());
        if (!controller.signal.aborted) {
          setStatus("live");
          if (latest.version !== version) router.refresh();
        }
      } catch {
        // A failed background check leaves the existing roster and manual Refresh usable.
        if (!controller.signal.aborted) setStatus("paused");
      } finally {
        window.clearTimeout(timeout);
        if (request === controller) request = undefined;
      }
    }
    const timer = window.setInterval(() => {
      void check();
    }, 15000);
    const focus = (): void => {
      void check();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      request?.abort();
    };
  }, [id, version, enabled, router]);
  return status;
}
