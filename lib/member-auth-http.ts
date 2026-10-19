import { createActionURL } from "@auth/core";
import type { NextAuthConfig } from "next-auth";

export function memberAuthRequest(
  request: Request,
  config: NextAuthConfig,
  environment: Record<string, string | undefined> = process.env,
): Request {
  const url = new URL(request.url);
  // Match the server action's Auth.js origin; NextRequest normalizes loopback IPs.
  const origin = createActionURL(
    "callback",
    url.protocol,
    request.headers,
    environment,
    config,
  );
  url.protocol = origin.protocol;
  url.hostname = origin.hostname;
  url.port = origin.port;
  return new Request(url, request);
}

export function privateMemberAuthResponse(response: Response): Response {
  // Auth.js error redirects use immutable headers; preserve redirects and all cookies.
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
