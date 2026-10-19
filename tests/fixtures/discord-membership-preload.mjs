// Injected only by the local browser-test process, never by website configuration.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (
  process.env.PORT !== "19306" ||
  process.env.NODE_ENV === "production" ||
  process.env.DISCORD_BOT_TOKEN !== "synthetic-browser-membership-token" ||
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55432"
)
  throw new Error(
    "Discord test transport requires the isolated local raid browser fixture.",
  );

const originalFetch = globalThis.fetch;
/** @type {typeof fetch} */
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.hostname !== "discord.com") return originalFetch(input, init);
  if (url.pathname === "/api/oauth2/token") {
    if (
      request.method !== "POST" ||
      request.headers.get("authorization") !==
        `Basic ${Buffer.from("1556000000000000063:local-test-only").toString("base64")}`
    )
      throw new Error(
        "Unexpected OAuth credentials in isolated browser tests.",
      );
    const body = new URLSearchParams(await request.text());
    if (
      body.get("redirect_uri") !==
        "http://127.0.0.1:19306/api/community/auth/callback/discord" ||
      body.get("code") !== "synthetic-browser-authorization-code" ||
      !body.get("code_verifier")
    )
      throw new Error(
        "OAuth callback origin, code or verifier does not match the browser authorization.",
      );
    return Response.json({
      access_token: "synthetic-browser-access-token",
      refresh_token: "synthetic-browser-refresh-token",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "identify",
    });
  }
  if (url.pathname === "/api/users/@me") {
    if (
      request.method !== "GET" ||
      request.headers.get("authorization") !==
        "Bearer synthetic-browser-access-token"
    )
      throw new Error(
        "Unexpected OAuth profile call in isolated browser tests.",
      );
    return Response.json({
      id: "1556000000000000061",
      username: "synthetic-browser-user",
      global_name: "Synthetic browser member",
      avatar: null,
      discriminator: "0",
    });
  }
  if (
    request.method !== "GET" ||
    request.headers.get("authorization") !==
      "Bot synthetic-browser-membership-token" ||
    !/^\/api\/v10\/guilds\/(1554316932948172940|1411533815356194968)(\/(members\/155600000000000006[1234]|roles|channels))?$/.test(
      url.pathname,
    )
  )
    throw new Error("Unexpected Discord call in isolated browser tests.");
  const parts = url.pathname.split("/");
  const guildId = parts[4];
  const kind = parts[5];
  const id = parts.at(-1);
  if (kind === "members")
    return id === "1556000000000000064"
      ? Response.json({ code: 10007 }, { status: 404 })
      : Response.json({
          user: { id, bot: id === "1556000000000000063" },
          roles: [],
        });
  if (kind === "roles")
    return Response.json([
      {
        id: guildId,
        name: "@everyone",
        position: 0,
        permissions: "117760",
        managed: false,
        mentionable: false,
      },
    ]);
  if (kind === "channels") {
    const channel = (channelId, name, privateTarget) => ({
      id: channelId,
      guild_id: guildId,
      name,
      type: 0,
      parent_id: null,
      position: 0,
      permission_overwrites: privateTarget
        ? [
            { id: guildId, type: 0, allow: "0", deny: "1024" },
            ...[
              "1556000000000000061",
              "1556000000000000062",
              "1556000000000000063",
            ].map((memberId) => ({
              id: memberId,
              type: 1,
              allow: "1024",
              deny: "0",
            })),
          ]
        : [],
    });
    return Response.json(
      guildId === "1411533815356194968"
        ? [channel("1556000000000000073", "raid-feedback", false)]
        : [
            channel("1556000000000000071", "raid-manager-test", true),
            channel("1556000000000000072", "second-private-test", true),
            ...(process.env.FOREVER_RAIDS_ACCESS_MODE === "members"
              ? [channel("1556000000000000074", "event-beta", false)]
              : []),
          ],
    );
  }
  return Response.json({
    id: guildId,
    name:
      guildId === "1411533815356194968"
        ? "KFC test server"
        : "Forever test server",
    owner_id: "1556000000000000061",
  });
};
