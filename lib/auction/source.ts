import {
  auctionPackSchema,
  type AuctionMarket,
  type AuctionPack,
} from "./contracts";
export async function readAuctionPack(
  baseUrl: string,
  key: string,
  market: AuctionMarket,
  transport: typeof fetch = fetch,
): Promise<AuctionPack> {
  const url = new URL("/v1/market-intelligence", baseUrl);
  if (
    url.username ||
    url.password ||
    url.hash ||
    !(
      (url.protocol === "https:" &&
        url.hostname === "helper.kfcguild.online") ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname))
    )
  )
    throw new Error("source_configuration_invalid");
  url.search = new URLSearchParams({
    clientProduct: market.clientProduct,
    clientBuild: String(market.clientBuild),
    region: market.region,
    realmId: market.realmId,
    auctionHouseType: market.auctionHouseType,
  }).toString();
  const response = await transport(url, {
    headers: { Authorization: `Bearer ${key}` },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      response.status === 404
        ? "intelligence_not_available"
        : "source_unavailable",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("source_unreadable");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 10 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("source_too_large");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return auctionPackSchema.parse(
    JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown,
  );
}
