const source = new URL(process.env.AUCTION_SOURCE_URL);
const database = new URL(process.env.DATABASE_URL);
if (
  process.env.NODE_ENV !== "test" ||
  source.hostname !== "127.0.0.1" ||
  database.port !== "55432" ||
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  process.env.AUCTION_BOT_TOKEN !== "auction-worker-test-token-not-real"
) {
  throw new Error("Isolated worker test transport required.");
}
const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const target = new URL(String(input));
  if (
    target.origin === "https://api.deepseek.com" &&
    target.pathname === "/chat/completions"
  ) {
    if (
      process.env.DEEPSEEK_API_KEY !== "deepseek-worker-test-key-not-real-123"
    )
      throw new Error("Only the isolated test copywriting key is permitted.");
    return original(new URL("/mock-deepseek", source), init).then(
      (response) => {
        // Exercise the final freshness recheck after a slow copy request without sleeping.
        if (process.env.AUCTION_TEST_EXPIRE_AFTER_COPY === "1") {
          const OriginalDate = globalThis.Date;
          globalThis.Date = class extends OriginalDate {
            constructor(...args) {
              if (args.length === 0) super(OriginalDate.now() + 7200000);
              else super(...args);
            }
            static now() {
              return OriginalDate.now() + 7200000;
            }
          };
        }
        return response;
      },
    );
  }
  if (
    target.origin === "https://discord.com" &&
    target.pathname.startsWith("/api/v10/")
  ) {
    return original(
      new URL(`/mock-discord${target.pathname.slice(8)}`, source),
      init,
    );
  }
  if (target.origin !== source.origin)
    throw new Error("External network is forbidden in worker tests.");
  return original(input, init);
};
