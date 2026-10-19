"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

export async function postRaid(
  path: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(result);
    throw new Error(
      error.success ? error.data.error : "The request failed. Try again.",
    );
  }
  if (result === null)
    throw new Error("The server returned an unexpected response. Try again.");
  return result;
}
export function useRaidClock(initialNow: number): number {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(
      () => setNow(initialNow + Math.floor(performance.now() - started)),
      15000,
    );
    return () => clearInterval(timer);
  }, [initialNow]);
  return now;
}
