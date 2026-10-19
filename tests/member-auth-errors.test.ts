import { test } from "node:test";
import assert from "node:assert/strict";
import { CallbackRouteError } from "@auth/core/errors";
import { memberAuthErrorDetails } from "../lib/member-auth-errors";

test("Member auth diagnostics expose only allowlisted OAuth failure details", () => {
  const cause = Object.assign(new Error("secret token and callback code"), {
    name: "ResponseBodyError",
    code: "OAUTH_RESPONSE_BODY_ERROR",
    error: "invalid_grant",
    status: 400,
    cause: {
      error: "invalid_grant",
      error_description: "secret token and callback code",
      access_token: "secret access token",
      profile: { id: "private Discord ID" },
    },
  });
  assert.deepEqual(
    memberAuthErrorDetails(
      new CallbackRouteError("Callback failed", { cause: { err: cause } }),
    ),
    {
      type: "CallbackRouteError",
      cause: "ResponseBodyError",
      code: "OAUTH_RESPONSE_BODY_ERROR",
      oauthError: "invalid_grant",
      status: 400,
    },
  );
});

test("Member auth diagnostics retain database and nested network error codes", () => {
  const database = Object.assign(new Error("private database connection"), {
    name: "PrismaClientKnownRequestError",
    code: "P2002",
  });
  assert.deepEqual(
    memberAuthErrorDetails(
      new CallbackRouteError("Callback failed", { cause: { err: database } }),
    ),
    {
      type: "CallbackRouteError",
      cause: "PrismaClientKnownRequestError",
      code: "P2002",
    },
  );
  const network = new TypeError("fetch failed", {
    cause: { code: "UND_ERR_CONNECT_TIMEOUT", address: "private address" },
  });
  assert.deepEqual(
    memberAuthErrorDetails(
      new CallbackRouteError("Callback failed", { cause: { err: network } }),
    ),
    {
      type: "CallbackRouteError",
      cause: "TypeError",
      code: "UND_ERR_CONNECT_TIMEOUT",
    },
  );
});

test("Member auth diagnostics ignore arbitrary strings and cyclic causes", () => {
  const error: Record<string, unknown> = {
    name: "private profile name",
    code: "secret token",
    error: "secret callback code",
    status: 900,
    message: "private error message",
  };
  error.cause = error;
  error.err = error;
  assert.deepEqual(memberAuthErrorDetails(error), { type: "InternalError" });
  for (const value of [null, undefined, "secret", 42])
    assert.deepEqual(memberAuthErrorDetails(value), {
      type: "InternalError",
    });
});
