import { createHash } from "node:crypto";
import {
  editionLabels,
  type Edition,
  type MessagePayload,
  type RaidSession,
  type RaidingConfig,
  type RaidingState,
} from "./contracts";

export function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function safeText(value: string, limit = 120): string {
  return [...value]
    .slice(0, limit)
    .join("")
    .replace(/[\r\n\x00-\x1f\x7f]/g, " ")
    .replace(/@/g, "@\u200b")
    .replace(/[\\*_`~|>\[\]]/g, "\\$&");
}

export function messageLink(channelId: string, messageId = channelId): string {
  return `https://discord.com/channels/1411533815356194968/${channelId}/${messageId}`;
}

export function sessionMarker(key: string): string {
  return `KFC session ${key}`;
}

export function upcomingSessions(
  sessions: readonly RaidSession[],
  game: Edition,
  now: Date,
  days = 7,
): RaidSession[] {
  const seen = new Set<string>();
  return [...sessions]
    .filter((session): boolean => {
      const start = Date.parse(session.startsAt);
      const finish =
        session.endsAt === null ? start : Date.parse(session.endsAt);
      if (
        session.game !== game ||
        !Number.isFinite(start) ||
        !Number.isFinite(finish) ||
        finish <= now.getTime() ||
        start > now.getTime() + days * 86400000 ||
        session.status === "cancelled" ||
        session.status === "finished" ||
        seen.has(session.key)
      )
        return false;
      seen.add(session.key);
      return true;
    })
    .sort(
      (a, b): number =>
        Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
        a.key.localeCompare(b.key),
    );
}

function slotText(session: RaidSession): string {
  if (session.confirmed === null || session.capacity === null)
    return "View signup";
  return `${session.confirmed}/${session.capacity} confirmed${session.registered ? ` · ${session.registered} awaiting selection` : ""}`;
}

export function schedulePanel(
  game: Edition,
  sessions: readonly RaidSession[],
  config: RaidingConfig,
  now: Date,
  verifiedAt: Date,
  stale = false,
  posts: RaidingState["posts"] = {},
): MessagePayload {
  const space = config.spaces[game];
  const upcoming = upcomingSessions(sessions, game, now, 60);
  const raids = upcoming.filter(
    (session): boolean => session.eventType === "raid",
  );
  const other = upcoming.filter(
    (session): boolean => session.eventType !== "raid",
  );
  const lines: string[] = [];
  if (stale)
    lines.push(
      "⚠️ **Schedule refresh delayed. Check the linked signup before making plans.**\n",
    );
  lines.push("**Next raids**");
  if (!raids.length)
    lines.push(
      "No confirmed raid dates are published yet. New runs will appear here.",
    );
  for (const session of raids.slice(0, 8)) {
    const post = posts[session.key];
    const url =
      post?.status === "sent" && post.threadId
        ? messageLink(post.threadId)
        : session.signupUrl;
    lines.push(
      `**[${safeText(session.title, 90)}](${url})**\n<t:${Math.floor(Date.parse(session.startsAt) / 1000)}:f> · ${slotText(session)}${session.host ? ` · ${safeText(session.host, 35)}` : ""}`,
    );
  }
  if (raids.length > 8)
    lines.push(`**${raids.length - 8} more runs:** open <#${space.forumId}>.`);
  if (other.length) {
    lines.push("\n**Other planned groups**");
    for (const session of other.slice(0, 2))
      lines.push(
        `[${safeText(session.title, 85)}](${session.signupUrl}) · <t:${Math.floor(Date.parse(session.startsAt) / 1000)}:f>`,
      );
    if (other.length > 2)
      lines.push(
        `${other.length - 2} more groups are linked from their event posts.`,
      );
  }
  if (game === "forever")
    lines.push(
      "\n**Your hosts**\nDjilanov: morning/daytime and hardcore runs.\nPsyrogue: standard daily 20:00 Central European runs.\nCasual groups and semi-hardcore teams: two 10-player and one 20-player. Dates appear when published.",
    );
  lines.push(
    "\nTimes above follow your Discord timezone. Open the signup for requirements, loot and current places. **Interested does not reserve a raid seat.**",
  );
  return {
    content: "",
    embeds: [
      {
        title: `${editionLabels[game]} · Upcoming runs`,
        description: lines.join("\n\n"),
        color: game === "forever" ? 0xe7b65b : 0x78bd70,
        footer: {
          text: `Next 60 days · Checked ${verifiedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Raid posts",
            url: messageLink(space.forumId),
          },
          {
            type: 2,
            style: 5,
            label: "How to sign up",
            url: messageLink(space.forumGuideId),
          },
          {
            type: 2,
            style: 5,
            label: "Raid alerts",
            url: messageLink(space.alerts.channelId, space.alerts.messageId),
          },
          {
            type: 2,
            style: 5,
            label: "Ask a question",
            url: messageLink(space.chatId),
          },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

export function sessionPanel(session: RaidSession): MessagePayload {
  const start = Math.floor(Date.parse(session.startsAt) / 1000);
  const fields = [
    { name: "Start", value: `<t:${start}:F>\n<t:${start}:R>`, inline: true },
    { name: "Signup", value: slotText(session), inline: true },
    {
      name: "Host",
      value: session.host ? safeText(session.host, 80) : "See original signup",
      inline: true,
    },
  ];
  if (session.endsAt)
    fields.push({
      name: "Scheduled finish",
      value: `<t:${Math.floor(Date.parse(session.endsAt) / 1000)}:f>`,
      inline: true,
    });
  fields.push({
    name: "Status",
    value:
      session.status === "cancelled"
        ? "Cancelled"
        : session.status === "finished"
          ? "Finished"
          : session.status === "locked"
            ? "Roster locked"
            : "Open signup",
    inline: true,
  });
  return {
    content: "",
    embeds: [
      {
        title: safeText(session.title, 150),
        description: `**${editionLabels[session.game]} · ${safeText(session.activity, 100)}**\n\nUse the original signup below for class/spec, availability, roster selection and loot terms. This post keeps the raid conversation together.${session.source === "raid-helper" ? "\n\n**Raid-Helper is the authoritative signup.** Your existing signup stays there." : "\n\n**The event manager holds the shared roster.** Signing up here opens that same event."}`,
        color:
          session.status === "cancelled"
            ? 0xc85b55
            : session.game === "forever"
              ? 0xe7b65b
              : 0x78bd70,
        fields,
        footer: { text: sessionMarker(session.key) },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Sign up / My signup",
            url: session.signupUrl,
          },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

export function sessionTitle(session: RaidSession): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(session.startsAt));
  return [...`${date} · ${session.title}`].slice(0, 100).join("");
}

export function managedThreadTitle(
  session: Pick<RaidSession, "startsAt" | "title">,
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).formatToParts(new Date(session.startsAt));
  const part = (name: string): string =>
    parts.find((value) => value.type === name)?.value ?? "";
  return [
    ...`${part("day")} ${part("month")} · ${part("hour")}:${part("minute")} ${part("timeZoneName")} · ${session.title}`,
  ]
    .slice(0, 100)
    .join("");
}

export function localDigestDate(now: Date, hour: number): string | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const field = (name: string): string =>
    parts.find((part): boolean => part.type === name)!.value;
  return Number(field("hour")) >= hour
    ? `${field("year")}-${field("month")}-${field("day")}`
    : null;
}

export function hubPanel(config: RaidingConfig): MessagePayload {
  return {
    flags: 0,
    content: "",
    embeds: [
      {
        title: "Find your next KFC run",
        description:
          "Choose your game to see the upcoming schedule and sign up. Each raid has one signup and its own conversation.\n\nKFC is a guild and a PUG community. Guild members have roster priority; PUG players can fill available places. Regular raiders are encouraged to join KFC. Check each event's preparation and loot rules.",
        color: 0xe7b65b,
      },
    ],
    components: [{ type: 1, components: editionsButtons(config) }],
    allowed_mentions: { parse: [] },
  };
}

function editionsButtons(
  config: RaidingConfig,
): MessagePayload["components"][number]["components"] {
  return (["forever", "tbc"] as const).map((game) => ({
    type: 2,
    style: 5,
    label: `${editionLabels[game]} schedule`,
    url: messageLink(
      config.spaces[game].schedule.channelId,
      config.spaces[game].schedule.messageId,
    ),
  }));
}
