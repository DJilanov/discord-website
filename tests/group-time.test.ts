import test from "node:test";
import assert from "node:assert/strict";
import {
  formatGroupStart,
  localGroupStart,
  resolveGroupStart,
} from "../lib/group-time";

test("local group times resolve in the selected region rather than the browser timezone", (): void => {
  assert.equal(
    resolveGroupStart("2026-11-05T08:30", "EU").toISOString(),
    "2026-11-05T07:30:00.000Z",
  );
  assert.equal(
    resolveGroupStart("2026-07-05T08:30", "EU").toISOString(),
    "2026-07-05T06:30:00.000Z",
  );
  assert.equal(
    resolveGroupStart("2026-11-05T08:30", "NA").toISOString(),
    "2026-11-05T13:30:00.000Z",
  );
  assert.equal(
    resolveGroupStart("2026-11-05T08:30", "OCE").toISOString(),
    "2026-11-05T08:30:00.000Z",
  );
  assert.equal(
    localGroupStart("2026-11-05T07:30:00.000Z", "EU"),
    "2026-11-05T08:30",
  );
});

test("nonexistent and ambiguous regional wall-clock times are rejected", (): void => {
  assert.throws(() => resolveGroupStart("2026-03-29T02:30", "EU"));
  assert.throws(() => resolveGroupStart("2026-10-25T02:30", "EU"));
  assert.throws(() => resolveGroupStart("2026-03-08T02:30", "NA"));
  assert.throws(() => resolveGroupStart("2026-11-01T01:30", "NA"));
});

test("EU and NA start times are readable and use the event date's daylight-saving offset", (): void => {
  assert.equal(
    formatGroupStart("2026-11-05T06:30:00.000Z", "EU"),
    "5 Nov 2026, 07:30 Central Europe (UTC+1)",
  );
  assert.equal(
    formatGroupStart("2026-07-05T06:30:00.000Z", "EU"),
    "5 Jul 2026, 08:30 Central Europe (UTC+2)",
  );
  assert.equal(
    formatGroupStart("2026-11-05T06:30:00.000Z", "NA"),
    "5 Nov 2026, 01:30 New York (UTC-5)",
  );
  assert.equal(
    formatGroupStart("2026-07-05T06:30:00.000Z", "NA"),
    "5 Jul 2026, 02:30 New York (UTC-4)",
  );
  assert.equal(
    formatGroupStart("2026-11-05T01:30:00.000Z", "NA"),
    "4 Nov 2026, 20:30 New York (UTC-5)",
  );
});

test("DST transitions and unknown regions do not shift the stored scheduled instant", (): void => {
  assert.equal(
    formatGroupStart("2026-03-29T00:30:00Z", "EU"),
    "29 Mar 2026, 01:30 Central Europe (UTC+1)",
  );
  assert.equal(
    formatGroupStart("2026-03-29T01:30:00Z", "EU"),
    "29 Mar 2026, 03:30 Central Europe (UTC+2)",
  );
  assert.equal(
    formatGroupStart("2026-03-08T06:30:00Z", "NA"),
    "8 Mar 2026, 01:30 New York (UTC-5)",
  );
  assert.equal(
    formatGroupStart("2026-03-08T07:30:00Z", "NA"),
    "8 Mar 2026, 03:30 New York (UTC-4)",
  );
  const date = new Date("2026-11-05T06:30:00.000Z");
  for (const region of ["OCE", "UNKNOWN", ""])
    assert.equal(formatGroupStart(date, region), "5 Nov 2026, 06:30 UTC");
  assert.equal(date.toISOString(), "2026-11-05T06:30:00.000Z");
  assert.throws(() => formatGroupStart("invalid", "EU"), RangeError);
});
