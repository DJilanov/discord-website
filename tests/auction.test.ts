import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auctionPackSchema,
  auctionSettingsSchema,
  defaultAuctionSettings,
  type AuctionMarket,
  type AuctionPack,
  type AuctionPublication,
} from "../lib/auction/contracts";
import {
  auctionJobKey,
  auctionPublicationHold,
  buildAuctionDigest,
} from "../lib/auction/engine";
import { readAuctionPack } from "../lib/auction/source";
const now = new Date("2026-10-01T10:00:00Z");
const market: AuctionMarket = {
  clientProduct: "wow_classic_beta",
  clientBuild: 70124,
  region: "EU",
  realmId: "TestRealm",
  auctionHouseType: "alliance",
  enabled: true,
  coverage: "regional",
};
function pack(): AuctionPack {
  return {
    schemaVersion: "market-intelligence.v1",
    modelVersion: "robust-market-signal-v1",
    ...market,
    sourceScanId: "f6714653-a4c4-4208-b7ee-b0a21a816593",
    sourceScanAt: "2026-10-01T09:45:00Z",
    generatedAt: "2026-10-01T09:45:00Z",
    items: [
      {
        itemId: 123,
        name: "Test material",
        signal: "bargain",
        observationCount: 24,
        minimumObservationCount: 6,
        recentObservationCount: 24,
        historyStartedAt: "2026-09-29T09:45:00Z",
        currentPriceCopper: "10000",
        normalPriceCopper: "15000",
        differenceBasisPoints: -3333,
        currentQuantity: 50,
        currentListingCount: 10,
        confidenceBasisPoints: 9000,
      },
    ],
  };
}
test("fresh exact-scope data produces explainable quotes, not guaranteed profits", (): void => {
  const result = buildAuctionDigest(
    market,
    pack(),
    defaultAuctionSettings,
    now,
  );
  assert.equal(result.eligible, true);
  assert.match(result.content, /1g 0s 0c per unit/);
  assert.match(result.content, /not a guaranteed flip/);
  assert.deepEqual(result.itemIds, [123]);
  assert.ok(result.content.length <= 1850);
});
test("four-hour spacing is rolling, permits the exact boundary, and caps six posts per day", (): void => {
  const settings = {
    ...defaultAuctionSettings,
    minimumIntervalHours: 4,
    dailyLimit: 6,
  };
  const publication: AuctionPublication = {
    sourceScanId: pack().sourceScanId,
    sourceAt: new Date(pack().sourceScanAt),
    publishedAt: new Date(now.getTime() - 4 * 3600000 + 1),
    observations: [],
  };
  assert.match(auctionPublicationHold([publication], settings, now)!, /4-hour/);
  publication.publishedAt = new Date(now.getTime() - 4 * 3600000);
  assert.equal(auctionPublicationHold([publication], settings, now), null);
  const fullDay = Array.from({ length: 6 }, (_, i) => ({
    ...publication,
    publishedAt: new Date(now.getTime() - (4 + i * 3) * 3600000),
  }));
  assert.match(
    auctionPublicationHold(fullDay, settings, now)!,
    /daily publication limit/,
  );
  fullDay[5].publishedAt = new Date(now.getTime() - 86400000);
  assert.equal(auctionPublicationHold(fullDay, settings, now), null);
});
test("new scans do not repeat unchanged item signals; other items take priority", (): void => {
  const data = pack();
  const previous = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
  ).observations;
  data.sourceScanId = "a6714653-a4c4-4208-b7ee-b0a21a816593";
  data.items[0].currentPriceCopper = "10999";
  const unchanged = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
    previous,
  );
  assert.equal(unchanged.eligible, false);
  assert.match(unchanged.reason, /Nothing meaningfully new/);
  data.items[0].currentPriceCopper = "11000";
  const moved = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
    previous,
  );
  assert.equal(moved.eligible, true);
  assert.match(moved.content, /Price changed by at least 10%/);
  data.items.push({
    ...data.items[0],
    itemId: 456,
    name: "Another material",
    differenceBasisPoints: -1500,
  });
  const rotated = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
    previous,
  );
  assert.equal(rotated.itemIds[0], 456);
  assert.equal(rotated.observations.length, rotated.itemIds.length);
});
test("signal changes are reportable but cycling back to a covered signal is not", (): void => {
  const data = pack();
  const previous = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
  ).observations;
  data.items[0].signal = "falling";
  const changed = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
    previous,
  );
  assert.equal(changed.eligible, true);
  assert.match(changed.content, /New signal since its last report/);
  data.items[0].signal = "bargain";
  assert.equal(
    buildAuctionDigest(market, data, defaultAuctionSettings, now, [
      ...changed.observations,
      ...previous,
    ]).eligible,
    false,
  );
});
test("repeat detection uses exact copper arithmetic and deduplicates source item IDs", (): void => {
  const data = pack();
  data.items[0].currentPriceCopper = "99999999999999999999";
  const previous = buildAuctionDigest(
    market,
    data,
    defaultAuctionSettings,
    now,
  ).observations;
  data.items[0].currentPriceCopper = "99999999999999999998";
  assert.equal(
    buildAuctionDigest(market, data, defaultAuctionSettings, now, previous)
      .eligible,
    false,
  );
  data.items.push({ ...data.items[0] });
  assert.deepEqual(
    buildAuctionDigest(market, data, defaultAuctionSettings, now).itemIds,
    [123],
  );
});
test("stale, aging, future, unknown-region and wrong-build data cannot produce live recommendations", (): void => {
  for (const changed of [
    { sourceScanAt: "2026-10-01T06:00:00Z" },
    { sourceScanAt: "2026-10-01T08:00:00Z" },
    { sourceScanAt: "2026-10-01T11:00:00Z" },
    { clientBuild: 70058 },
    { region: "NA" },
  ])
    assert.equal(
      buildAuctionDigest(
        market,
        { ...pack(), ...changed },
        defaultAuctionSettings,
        now,
      ).eligible,
      false,
    );
  assert.equal(
    buildAuctionDigest(
      { ...market, region: "UNKNOWN" },
      { ...pack(), region: "UNKNOWN" },
      defaultAuctionSettings,
      now,
    ).eligible,
    false,
  );
});
test("thin, short, missing and low-quality history is withheld", (): void => {
  for (const changed of [
    { currentListingCount: 2 },
    { currentQuantity: 1 },
    { observationCount: 5 },
    { recentObservationCount: 5 },
    { historyStartedAt: null },
    { historyStartedAt: "2026-10-01T09:00:00Z" },
    { confidenceBasisPoints: 4000 },
    { signal: "collecting" as const },
    { signal: "too_thin" as const },
  ]) {
    const data = pack();
    data.items[0] = { ...data.items[0], ...changed };
    assert.equal(
      buildAuctionDigest(market, data, defaultAuctionSettings, now).eligible,
      false,
    );
  }
});
test("six-observation beta pilot retains independent quality, freshness, history and supply gates", (): void => {
  const settings = auctionSettingsSchema.parse({
    ...defaultAuctionSettings,
    minimumObservations: 6,
    minimumQuality: 5000,
  });
  const data = pack();
  data.items[0] = {
    ...data.items[0],
    observationCount: 6,
    recentObservationCount: 6,
    confidenceBasisPoints: 5625,
  };
  assert.equal(buildAuctionDigest(market, data, settings, now).eligible, true);
  assert.equal(
    buildAuctionDigest(market, data, { ...settings, minimumQuality: 7500 }, now)
      .eligible,
    false,
  );
  for (const changed of [
    { observationCount: 5 },
    { recentObservationCount: 5 },
    { confidenceBasisPoints: 4999 },
    { historyStartedAt: "2026-10-01T09:00:00Z" },
    { currentListingCount: 2 },
    { currentQuantity: 1 },
    { signal: "collecting" as const },
    { signal: "normal" as const },
  ]) {
    const withheld = { ...data, items: [{ ...data.items[0], ...changed }] };
    assert.equal(
      buildAuctionDigest(market, withheld, settings, now).eligible,
      false,
    );
  }
  assert.equal(
    buildAuctionDigest(
      market,
      { ...data, sourceScanAt: "2026-10-01T06:00:00Z" },
      settings,
      now,
    ).eligible,
    false,
  );
});
test("collecting data explains its exact scoped history shortfall without generating a tip", (): void => {
  const data = pack();
  data.items[0] = {
    ...data.items[0],
    signal: "collecting",
    observationCount: 5,
    recentObservationCount: 5,
    currentPriceCopper: null,
    normalPriceCopper: null,
  };
  const result = buildAuctionDigest(market, data, defaultAuctionSettings, now);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /5 observations and 5 recent/);
  assert.match(result.reason, /at least 12 buckets, 24 hours/);
  assert.deepEqual(result.observations, []);
});
test("explicit uploaded beta coverage permits fresh exact-market tips without claiming global or Horde data", (): void => {
  const beta: AuctionMarket = {
    ...market,
    region: "UNKNOWN",
    coverage: "uploaded-beta-market",
  };
  const data = { ...pack(), region: "UNKNOWN" };
  const result = buildAuctionDigest(beta, data, defaultAuctionSettings, now);
  assert.equal(result.eligible, true);
  assert.match(result.content, /uploaded alliance beta market only/);
  assert.match(
    result.content,
    /worldwide and other ruleset coverage are not verified/,
  );
  assert.match(result.title, /^Forever beta/);
  assert.equal(
    buildAuctionDigest(
      beta,
      { ...data, auctionHouseType: "horde" },
      defaultAuctionSettings,
      now,
    ).eligible,
    false,
  );
  assert.equal(
    buildAuctionDigest(
      beta,
      { ...data, sourceScanAt: "2026-10-01T06:00:00Z" },
      defaultAuctionSettings,
      now,
    ).eligible,
    false,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      mode: "live",
      reviewedPilot: true,
      channelId: "1555101000000000001",
      markets: [beta],
    }).success,
    true,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      mode: "live",
      reviewedPilot: true,
      channelId: "1555101000000000001",
      markets: [{ ...beta, coverage: "regional" }],
    }).success,
    false,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      markets: [{ ...market, coverage: "uploaded-beta-market" }],
    }).success,
    false,
  );
});
test("new fresh uploads qualify after a stale scan; unchanged scan IDs retain the same job identity", (): void => {
  const data = pack();
  data.sourceScanAt = "2026-10-01T06:00:00Z";
  assert.equal(
    buildAuctionDigest(market, data, defaultAuctionSettings, now).eligible,
    false,
  );
  const uploaded = {
    ...pack(),
    sourceScanId: "b6714653-a4c4-4208-b7ee-b0a21a816593",
  };
  assert.equal(
    buildAuctionDigest(market, uploaded, defaultAuctionSettings, now).eligible,
    true,
  );
  assert.notEqual(
    auctionJobKey(market, data, 1, "live"),
    auctionJobKey(market, uploaded, 1, "live"),
  );
  assert.equal(
    auctionJobKey(market, uploaded, 1, "live"),
    auctionJobKey(market, { ...uploaded }, 1, "live"),
  );
});
test("large fresh digests keep a bounded subset instead of discarding every eligible tip", (): void => {
  const data = pack();
  const beta: AuctionMarket = {
    ...market,
    region: "UNKNOWN",
    coverage: "uploaded-beta-market",
    realmId: "Long beta source identifier ".repeat(4),
  };
  data.region = beta.region;
  data.realmId = beta.realmId;
  data.items = Array.from({ length: 5 }, (_, index) => ({
    ...data.items[0],
    itemId: index + 1,
    name: "Long material name ".repeat(8),
    currentPriceCopper: "99999999999999999999",
    normalPriceCopper: "99999999999999999998",
  }));
  const result = buildAuctionDigest(beta, data, defaultAuctionSettings, now);
  assert.equal(result.eligible, true);
  assert.ok(result.itemIds.length > 0 && result.itemIds.length < 5);
  assert.ok(result.content.length <= 1850);
});
test("digest names cannot inject pings, links or multiline markdown", (): void => {
  const data = pack();
  data.items[0].name =
    "@everyone <@123>\n[click](https://bad.invalid) **title**";
  const result = buildAuctionDigest(market, data, defaultAuctionSettings, now);
  assert.doesNotMatch(result.content, /@everyone|<@|\[click\]/);
});
test("configuration defaults to private previews; live mode requires explicit review and confirmed coverage", (): void => {
  assert.equal(defaultAuctionSettings.mode, "preview");
  const legacy: Record<string, unknown> = { ...defaultAuctionSettings };
  delete legacy.minimumIntervalHours;
  assert.equal(auctionSettingsSchema.parse(legacy).minimumIntervalHours, 24);
  for (const invalid of [
    { dailyLimit: 7 },
    { minimumIntervalHours: 0 },
    { minimumIntervalHours: 25 },
  ])
    assert.equal(
      auctionSettingsSchema.safeParse({ ...defaultAuctionSettings, ...invalid })
        .success,
      false,
    );
  assert.equal(
    auctionSettingsSchema.safeParse({ ...defaultAuctionSettings, mode: "live" })
      .success,
    false,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      mode: "live",
      reviewedPilot: true,
      channelId: "1555101000000000001",
      markets: [market],
    }).success,
    true,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      freshMinutes: 61,
    }).success,
    false,
  );
  assert.equal(
    auctionSettingsSchema.safeParse({
      ...defaultAuctionSettings,
      markets: [market, market],
    }).success,
    false,
  );
});
test("job identity includes scan, exact market, configuration and publication mode", (): void => {
  const first = auctionJobKey(market, pack(), 1, "preview");
  assert.equal(first, auctionJobKey(market, pack(), 1, "preview"));
  assert.notEqual(first, auctionJobKey(market, pack(), 1, "live"));
  assert.notEqual(first, auctionJobKey(market, pack(), 2, "preview"));
  assert.notEqual(
    first,
    auctionJobKey(
      { ...market, auctionHouseType: "horde" },
      pack(),
      1,
      "preview",
    ),
  );
});
test("source API is read-only, scoped, authenticated and redirect-resistant", async (): Promise<void> => {
  let called = false;
  const transport: typeof fetch = async (input, init): Promise<Response> => {
    called = true;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/v1/market-intelligence");
    assert.equal(url.searchParams.get("clientProduct"), market.clientProduct);
    assert.equal(url.searchParams.get("region"), "EU");
    assert.equal(init?.redirect, "error");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer test-read-only-credential",
    );
    return Response.json(pack());
  };
  assert.deepEqual(
    await readAuctionPack(
      "https://helper.kfcguild.online",
      "test-read-only-credential",
      market,
      transport,
    ),
    auctionPackSchema.parse(pack()),
  );
  assert.equal(called, true);
  await assert.rejects(
    readAuctionPack(
      "https://attacker.invalid",
      "never-forward",
      market,
      transport,
    ),
    /source_configuration/,
  );
});
test("malformed or unavailable source data fails closed", async (): Promise<void> => {
  await assert.rejects(
    readAuctionPack(
      "http://127.0.0.1:4000",
      "test",
      market,
      async (): Promise<Response> => Response.json({}, { status: 404 }),
    ),
    /intelligence_not_available/,
  );
  await assert.rejects(
    readAuctionPack(
      "http://127.0.0.1:4000",
      "test",
      market,
      async (): Promise<Response> => Response.json({}),
    ),
  );
});
