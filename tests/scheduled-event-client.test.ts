import assert from "node:assert/strict";
import { test } from "node:test";
import {
  foreverGuildId,
  kfcApplicationId,
  kfcGuildId,
  scheduledEventBindings,
} from "../content/kfc-community";
import { scheduledEventRequest } from "../lib/scheduled-event-client";

const credentials = {
  applicationId: kfcApplicationId,
  guildId: kfcGuildId,
  token: "private-test-token-not-a-real-credential",
};
const foreverProjection = scheduledEventBindings[0].projections.find(
  (projection): boolean => projection.guildId === foreverGuildId,
)!;

test("Scheduled-event client reads only approved guilds and edits only bound projections", async (): Promise<void> => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const transport: typeof fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ url: String(input), init });
    return Response.json({ ok: true });
  };
  await scheduledEventRequest(
    credentials,
    `/guilds/${foreverGuildId}/scheduled-events`,
    "GET",
    undefined,
    { fetch: transport },
  );
  await scheduledEventRequest(
    credentials,
    `/guilds/${foreverGuildId}/scheduled-events/${foreverProjection.scheduledId}`,
    "PATCH",
    { name: "Updated event" },
    { fetch: transport },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init?.method, "PATCH");
  assert.equal(calls[1].init?.body, JSON.stringify({ name: "Updated event" }));

  for (const [route, method, body] of [
    ["/guilds/1556000000000000999/scheduled-events", "GET", undefined],
    [
      `/guilds/${foreverGuildId}/scheduled-events/1556000000000000999`,
      "GET",
      undefined,
    ],
    [`/guilds/${foreverGuildId}/scheduled-events`, "PATCH", { status: 4 }],
    [
      `/guilds/${foreverGuildId}/scheduled-events/${foreverProjection.scheduledId}`,
      "PATCH",
      { description: "Unscoped field" },
    ],
  ] as const)
    await assert.rejects(
      scheduledEventRequest(credentials, route, method, body, {
        fetch: transport,
      }),
    );
  assert.equal(calls.length, 2);
});

test("Scheduled-event client retries bounded rate limits and rechecks before each request", async (): Promise<void> => {
  let calls = 0,
    checks = 0;
  const sleeps: number[] = [];
  const transport: typeof fetch = async (): Promise<Response> => {
    calls++;
    return calls === 1
      ? Response.json({ retry_after: 0.01 }, { status: 429 })
      : Response.json({ id: foreverProjection.scheduledId });
  };
  const result = await scheduledEventRequest(
    credentials,
    `/guilds/${foreverGuildId}/scheduled-events/${foreverProjection.scheduledId}`,
    "GET",
    undefined,
    {
      fetch: transport,
      sleep: async (milliseconds): Promise<void> => {
        sleeps.push(milliseconds);
      },
      recheck: async (): Promise<void> => {
        checks++;
      },
    },
  );
  assert.deepEqual(result, { id: foreverProjection.scheduledId });
  assert.equal(calls, 2);
  assert.equal(checks, 2);
  assert.deepEqual(sleeps, [110]);
});
