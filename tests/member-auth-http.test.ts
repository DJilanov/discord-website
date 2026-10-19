import { test } from "node:test";
import assert from "node:assert/strict";
import {
  memberAuthRequest,
  privateMemberAuthResponse,
} from "../lib/member-auth-http";

const config = { providers: [], basePath: "/api/community/auth" };

test("OAuth requests preserve the actual loopback host, callback query, cookies and POST bodies", async () => {
  const request = new Request(
    "http://localhost:19300/api/community/auth/callback/discord?code=synthetic-code&state=synthetic-state",
    {
      headers: {
        host: "127.0.0.1:19300",
        cookie: "forever-member.state=synthetic-state",
      },
    },
  );
  const normalized = memberAuthRequest(request, config, {});
  assert.equal(
    normalized.url,
    "http://127.0.0.1:19300/api/community/auth/callback/discord?code=synthetic-code&state=synthetic-state",
  );
  assert.equal(normalized.method, "GET");
  assert.equal(normalized.headers.get("cookie"), request.headers.get("cookie"));
  assert.equal(normalized.signal.aborted, false);
  const post = memberAuthRequest(
    new Request("http://localhost:19300/api/community/auth/signout", {
      method: "POST",
      headers: { host: "127.0.0.1:19300" },
      body: new URLSearchParams({ csrfToken: "synthetic-csrf-token" }),
    }),
    config,
    {},
  );
  assert.equal(post.url, "http://127.0.0.1:19300/api/community/auth/signout");
  assert.equal(post.method, "POST");
  assert.match(post.headers.get("content-type") || "", /x-www-form-urlencoded/);
  assert.equal(await post.text(), "csrfToken=synthetic-csrf-token");
});

test("OAuth request origins follow Auth.js proxy and canonical URL configuration", () => {
  const request = new Request(
    "http://localhost:19300/api/community/auth/callback/discord?state=synthetic-state",
    {
      headers: {
        host: "127.0.0.1:19300",
        "x-forwarded-host": "community.example",
        "x-forwarded-proto": "https",
      },
    },
  );
  assert.equal(
    memberAuthRequest(request, config, {}).url,
    "https://community.example/api/community/auth/callback/discord?state=synthetic-state",
  );
  for (const variable of ["AUTH_URL", "NEXTAUTH_URL"]) {
    assert.equal(
      memberAuthRequest(request, config, {
        [variable]: "https://canonical.example/api/community/auth",
      }).url,
      "https://canonical.example/api/community/auth/callback/discord?state=synthetic-state",
    );
  }
});

test("Immutable OAuth error redirects retain status and destination without a header mutation crash", () => {
  const original = Response.redirect(
    "http://127.0.0.1:19300/raids?error=Configuration",
  );
  assert.throws(
    () => original.headers.set("Cache-Control", "no-store"),
    /immutable/,
  );
  const response = privateMemberAuthResponse(original);
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    original.headers.get("location"),
  );
  assert.equal(response.body, null);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(original.headers.get("cache-control"), null);
});

test("The authentication response wrapper preserves every cookie, other headers and streamed bodies", async () => {
  const cookies = [
    "forever-member.state=synthetic; Path=/; HttpOnly; SameSite=Lax",
    "forever-member.pkceCodeVerifier=synthetic; Max-Age=900; Path=/; HttpOnly; SameSite=Lax",
    "forever-member.session-token=synthetic; Path=/; HttpOnly; SameSite=Lax",
  ];
  const headers = new Headers({
    "Content-Type": "application/json",
    Vary: "Cookie",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  const original = new Response('{"ok":true}', {
    status: 201,
    statusText: "Created",
    headers,
  });
  const response = privateMemberAuthResponse(original);
  assert.deepEqual(response.headers.getSetCookie(), cookies);
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.status, 201);
  assert.equal(response.statusText, "Created");
  assert.equal(response.body, original.body);
  assert.deepEqual(await response.json(), { ok: true });
});
