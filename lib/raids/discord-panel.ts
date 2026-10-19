import type { EventView, SignupView } from "./contracts";
import { eventTypeDefinitions } from "./event-types";
import { gameLabels } from "./games";
import { reservePolicyLabel } from "./loot-policy";
import { eventArtwork } from "./event-artwork";
import { classes } from "./specializations";
import { buildRosterParties } from "./roster-layout";
import { eventDurationLabel, summarizeEventRoster } from "./event-preview";
import {
  damageKind,
  discordText,
  emojiText,
  nativeRaidsEnabled,
  hardReserveText,
} from "./discord-format";
import type { NativeButton, NativeRow } from "./native-contracts";

interface DiscordField {
  name: string;
  value: string;
  inline: boolean;
}
export interface DiscordEventPanel {
  content: string;
  allowed_mentions: { parse: never[] };
  embeds: Array<{
    title: string;
    url: string;
    description: string;
    color: number;
    fields: DiscordField[];
    image: { url: string };
  }>;
  components: NativeRow[];
}
export function raidPostMarker(id: string): string {
  return `Forever event ${id}`;
}

function rosterLines(signups: SignupView[], budget: number): string {
  const lines: string[] = [];
  for (const signup of signups) {
    const line = `${emojiText(signup.character.className, signup.character.specialization)}**${discordText(signup.character.name, 40)}**`;
    // Reserve space for an honest overflow count, including escaped names/emojis.
    if ([...lines, line].join("\n").length + 70 > budget) break;
    lines.push(line);
  }
  if (lines.length < signups.length)
    lines.push(
      `+${signups.length - lines.length} more · open Roster / Event details`,
    );
  return lines.join("\n");
}

export function discordEventPanel(
  event: EventView,
  origin: string,
  coverUrl?: string,
): DiscordEventPanel {
  const definition = eventTypeDefinitions[event.eventType];
  const roster = summarizeEventRoster(
    event.signups,
    event.capacity,
    event.roleCaps,
    definition.combatRoles,
  );
  const {
    confirmed: accepted,
    registered,
    pending,
    bench,
    tentative,
    absent,
  } = roster;
  const openPool = event.admission === "open" && event.status === "open";
  const displayed = openPool
    ? event.signups.filter(
        (signup) =>
          signup.status === "accepted" || signup.status === "registered",
      )
    : accepted;
  const compactRoles = definition.combatRoles && event.capacity <= 5;
  const url = `${origin}/raids/${event.id}`;
  const reservesUrl = `${url}/reserves`;
  const hasReserves =
    event.eventType === "raid" &&
    event.catalog !== null &&
    event.reserveLimit > 0;
  const start = Math.floor(Date.parse(event.startsAt) / 1000);
  const title = discordText(event.title, 120).slice(0, 256);
  const context = `${gameLabels[event.game]} · ${definition.label}\n${event.region} · ${event.faction} · ${event.ruleset}${event.realm ? ` · ${discordText(event.realm, 50)}` : ""}`;
  const excerpt = discordText(event.description, 180);
  const description = `**${discordText(event.raidName, 100)}**\n${context}${excerpt ? `\n\n${excerpt}${Array.from(event.description).length > 180 ? `\n[Full event details](${url})` : ""}` : ""}`;
  const openSignupProgress =
    [
      ...(accepted.length ? [`${accepted.length} confirmed`] : []),
      ...(registered.length
        ? [`${registered.length} awaiting roster selection`]
        : []),
    ].join(" · ") || "roster selection pending";
  const fields: DiscordField[] = [
    { name: "When", value: `<t:${start}:f>\n<t:${start}:R>`, inline: true },
    {
      name: "Finish",
      value: `<t:${Math.floor(Date.parse(event.endsAt) / 1000)}:f>\n${eventDurationLabel(event.startsAt, event.endsAt)}`,
      inline: true,
    },
    {
      name: "Roster",
      value: `${openPool ? `**${roster.signedUp.length} signed up** · ${event.capacity} planned seats` : `**${accepted.length}/${event.capacity} confirmed** · **${roster.signedUp.length} signed up**`}\n${event.admission === "open" ? `Open signup · ${openSignupProgress}` : event.admission === "approval" ? "Organizer approval" : "Automatic signup · bench when full"}`,
      inline: false,
    },
  ];
  if (event.status === "cancelled" || event.status === "locked")
    fields.push({
      name: "Event status",
      value: event.status === "cancelled" ? "Cancelled" : "Roster locked",
      inline: false,
    });
  if (definition.combatRoles && !compactRoles) {
    for (const [role, label] of [
      ["tank", "Tanks"],
      ["healer", "Healers"],
      ["damage", "DPS"],
    ] as const) {
      const members = displayed.filter((signup) => signup.role === role);
      const count = members.length;
      const damageKinds = role === "damage" ? members.map(damageKind) : [];
      const breakdown =
        damageKinds.length &&
        damageKinds.every((kind) => kind === "melee" || kind === "ranged")
          ? `\n${damageKinds.filter((kind) => kind === "melee").length} melee · ${damageKinds.filter((kind) => kind === "ranged").length} ranged`
          : "";
      fields.push({
        name: `${label} (${count}/${event.roleCaps[role]})`,
        value: `Target ${event.roleCaps[role]}${breakdown}`,
        inline: true,
      });
    }
  }
  if (event.eventType === "raid")
    fields.push({
      name: "Loot",
      value: event.catalog
        ? `${reservePolicyLabel(event)} · ${event.allowDuplicates ? "duplicates allowed" : "unique items"}\nHard reserves (${event.hardReserves.length}): ${hardReserveText(event)}\nSR closes <t:${Math.floor(Date.parse(event.reservesCloseAt) / 1000)}:f>${hasReserves ? `\n[Open soft reserves](${reservesUrl})` : ""}`
        : "No soft-reserve pool attached",
      inline: false,
    });
  const groups: Array<{
    name: string;
    signups: SignupView[];
    inline: boolean;
    summary?: string;
  }> = [];
  if (compactRoles) {
    for (const [role, label] of [
      ["tank", "Tanks"],
      ["healer", "Healers"],
      ["damage", "DPS"],
    ] as const) {
      const members = displayed.filter((signup) => signup.role === role);
      const target = event.roleCaps[role];
      if (!target && !members.length) continue;
      groups.push({
        name: `${label} (${members.length}/${target})`,
        signups: members,
        inline: true,
        ...(members.length < target
          ? { summary: `*${target - members.length} more needed*` }
          : {}),
      });
    }
  } else if (definition.combatRoles && !openPool) {
    for (const party of buildRosterParties(displayed, event.capacity))
      if (party.signups.length)
        groups.push({
          name: `Group ${party.index + 1} (${party.signups.length}/${party.capacity})`,
          signups: party.signups,
          inline: true,
        });
  } else if (!definition.combatRoles && displayed.length <= 5)
    groups.push({
      name: `Participants (${displayed.length})`,
      signups: displayed,
      inline: false,
    });
  else {
    if (definition.combatRoles)
      for (const [role, label] of [
        ["tank", "Tank group"],
        ["healer", "Healer group"],
      ] as const) {
        const signups = displayed.filter((signup) => signup.role === role);
        if (signups.length)
          groups.push({
            name: `${label} (${signups.length})`,
            signups,
            inline: true,
          });
      }
    for (const className of classes) {
      const signups = displayed.filter(
        (signup) =>
          signup.character.className === className &&
          (!definition.combatRoles || signup.role === "damage"),
      );
      if (signups.length)
        groups.push({
          name: `${emojiText(className)}${className} (${signups.length})`,
          signups,
          inline: true,
        });
    }
  }
  if (!groups.length)
    groups.push({
      name: openPool ? "Signups" : "Confirmed roster",
      signups: [],
      inline: false,
    });
  if (registered.length && !openPool)
    groups.push({
      name: `Signed up (${registered.length}) · roster not selected`,
      signups: registered,
      inline: false,
    });
  if (pending.length)
    groups.push({
      name: `Awaiting approval (${pending.length})`,
      signups: pending,
      inline: false,
    });
  if (bench.length)
    groups.push({
      name: `Bench (${bench.length})`,
      signups: bench,
      inline: false,
    });
  if (tentative.length)
    groups.push({
      name: `Tentative (${tentative.length})`,
      signups: tentative,
      inline: false,
    });
  if (absent.length)
    groups.push({
      name: `Absent (${absent.length})`,
      signups: absent,
      inline: false,
    });
  const availableGroupFields = Math.max(1, 25 - fields.length);
  if (groups.length > availableGroupFields) {
    const responses = groups.filter(
      (group) =>
        group.signups.length &&
        group.signups.every(
          (signup) =>
            signup.status === "tentative" || signup.status === "absent",
        ),
    );
    const rosterGroups = groups.filter((group) => !responses.includes(group));
    const visible = rosterGroups.slice(
      0,
      availableGroupFields - responses.length - 1,
    );
    const overflow = rosterGroups.slice(
      availableGroupFields - responses.length - 1,
    );
    groups.splice(
      0,
      groups.length,
      ...visible,
      {
        name: `More roster groups (${overflow.length})`,
        signups: overflow.flatMap((group) => group.signups),
        inline: false,
      },
      ...responses,
    );
  }
  // Discord's 6,000-character limit includes every field name and title.
  const fixedSize =
    title.length +
    description.length +
    fields.reduce(
      (sum, field) => sum + field.name.length + field.value.length,
      0,
    ) +
    groups.reduce(
      (sum, group) =>
        sum + group.name.length + (group.summary?.length ?? 0) + 2,
      0,
    );
  const budget = Math.min(1024, Math.floor((5900 - fixedSize) / groups.length));
  fields.push(
    ...groups.map((group): DiscordField => ({
      name: group.name,
      value:
        [
          rosterLines(
            group.signups,
            Math.min(budget, 1024 - (group.summary?.length ?? 0) - 2),
          ),
          group.summary,
        ]
          .filter(Boolean)
          .join("\n\n") || "No signups yet",
      inline: group.inline,
    })),
  );
  const native = nativeRaidsEnabled();
  const signupClosed =
    event.status !== "open" || Date.parse(event.signupClosesAt) <= Date.now();
  const reservesClosed =
    event.status !== "open" || Date.parse(event.reservesCloseAt) <= Date.now();
  const controls: NativeButton[] = native
    ? [
        {
          type: 2,
          style: 3,
          label: "Sign up",
          custom_id: `nraid:e:${event.id}:join`,
          disabled: signupClosed,
        },
        {
          type: 2,
          style: 2,
          label: "My signup",
          custom_id: `nraid:e:${event.id}:mine`,
        },
        {
          type: 2,
          style: 2,
          label: "Roster",
          custom_id: `nraid:e:${event.id}:roster`,
        },
        ...(hasReserves
          ? [
              {
                type: 2 as const,
                style: 2 as const,
                label: "Soft reserves",
                custom_id: `nraid:e:${event.id}:reserves`,
                disabled: reservesClosed,
              },
            ]
          : []),
        { type: 2, style: 5, label: "Event details", url },
      ]
    : [
        { type: 2, style: 5, label: "Sign up / manage roster", url },
        ...(hasReserves
          ? [
              {
                type: 2 as const,
                style: 5 as const,
                label: "Soft reserves",
                url: reservesUrl,
              },
            ]
          : []),
      ];
  const rows: NativeRow[] = [{ type: 1, components: controls }];
  if (native)
    rows.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "Tentative",
          custom_id: `nraid:e:${event.id}:tentative`,
          disabled: signupClosed,
        },
        {
          type: 2,
          style: 2,
          label: "Absent",
          custom_id: `nraid:e:${event.id}:absent`,
          disabled: signupClosed,
        },
        ...(hasReserves
          ? [
              {
                type: 2 as const,
                style: 5 as const,
                label: "SR loot page",
                url: reservesUrl,
              },
            ]
          : []),
      ],
    });
  return {
    content: "",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title,
        url,
        description,
        color:
          event.status === "cancelled"
            ? 0xb45b5b
            : event.status === "locked"
              ? 0x7296b1
              : 0xdfb956,
        fields,
        image: {
          url:
            coverUrl ??
            `${origin}${eventArtwork(event.game, event.eventType, event.raidName).file}`,
        },
      },
    ],
    components: rows,
  };
}
