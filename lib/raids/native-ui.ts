import {
  rosterStatuses,
  participatingStatuses,
  attendanceChoices,
  type CharacterView,
  type EventView,
  type SignupView,
} from "./contracts";
import { signupStatusLabel } from "./event-preview";
import { classes, specializationsByClass } from "./specializations";
import { eventTypeDefinitions } from "./event-types";
import { gameLabels } from "./games";
import { reserveQuota, reservePolicyLabel } from "./loot-policy";
import {
  classAccent,
  discordEmoji,
  discordText,
  emojiText,
  signupLine,
  hardReserveText,
} from "./discord-format";
import {
  nativeMessageSchema,
  type NativeAction,
  type NativeButton,
  type NativeDraftView,
  type NativeMessage,
  type NativeOption,
  type NativeRow,
} from "./native-contracts";

export function draftControl(
  draft: Pick<NativeDraftView, "id" | "revision">,
  action: NativeAction,
): string {
  return `nraid:d:${draft.id}:${draft.revision}:${action}`;
}
function button(
  draft: NativeDraftView,
  action: NativeAction,
  label: string,
  style: NativeButton["style"] = 2,
  disabled = false,
): NativeButton {
  return {
    type: 2,
    style,
    custom_id: draftControl(draft, action),
    label,
    disabled,
  };
}
function row(buttons: NativeButton[]): NativeRow {
  return { type: 1, components: buttons };
}
function select(
  draft: NativeDraftView,
  action: NativeAction,
  placeholder: string,
  options: NativeOption[],
): NativeRow {
  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: draftControl(draft, action),
        placeholder,
        options,
        min_values: 1,
        max_values: 1,
      },
    ],
  };
}
export function nativeError(message: string): NativeMessage {
  return {
    content: discordText(message, 650),
    embeds: [],
    components: [],
    allowed_mentions: { parse: [] },
  };
}
export function nativeSignupStatus(signup: SignupView | undefined): string {
  return !signup
    ? "Not signed up"
    : signup.status === "accepted"
      ? "Confirmed"
      : signup.status === "registered"
        ? "Signed up; roster not selected"
        : signup.status === "pending"
          ? "Pending organizer approval"
          : signup.status === "bench"
            ? "On the bench"
            : signup.status === "absent" || signup.status === "tentative"
              ? signupStatusLabel(signup.status)
              : "Not signed up";
}
export function renderNativePanel(
  event: EventView,
  characters: CharacterView[],
  draft: NativeDraftView,
  origin: string,
  notice = "",
): NativeMessage {
  const state = draft.state;
  const mine = event.signups.find((signup) => signup.isMine);
  const definition = eventTypeDefinitions[event.eventType];
  const signupOpen =
    event.status === "open" && Date.parse(event.signupClosesAt) > Date.now();
  const reservesOpen =
    event.status === "open" && Date.parse(event.reservesCloseAt) > Date.now();
  const url = `${origin}/raids/${event.id}`;
  const details: NativeButton = {
    type: 2,
    style: 5,
    label: "Event details",
    url,
  };
  const scope = `${gameLabels[event.game]}${event.realm ? ` · ${discordText(event.realm)}` : ""} · ${event.region} · ${event.faction} · ${event.ruleset}`;
  const components: NativeRow[] = [];
  let title = "My signup";
  let description = `**${discordText(event.title, 120)}**\n${scope}\n${event.timeLabel}\n\n`;
  if (state.mode === "closed")
    return nativeError(
      notice ||
        "This private view is closed. Reopen the original event post to continue.",
    );
  if (state.mode === "signup" && !draft.completed) {
    title =
      state.attendance === "joining"
        ? "Join event"
        : `Respond ${signupStatusLabel(state.attendance)}`;
    const selected = characters.find(
      (character) => character.id === state.characterId,
    );
    if (characters.length)
      components.push(
        select(draft, "character", "Choose your character", [
          ...characters.map((character): NativeOption => ({
            label: character.name,
            value: character.id,
            description:
              `${character.specialization ?? "Spec not set"} ${character.className}${character.realm ? ` · ${character.realm}` : ""}`.slice(
                0,
                100,
              ),
            emoji: discordEmoji(character.className, character.specialization),
            default: selected?.id === character.id,
          })),
          {
            label: "Add a character",
            value: "new",
            default: state.characterId === null,
          },
        ]),
      );
    if (!selected)
      components.push(
        select(
          draft,
          "class",
          "Choose your class",
          classes.map((className): NativeOption => ({
            label: className,
            value: className,
            emoji: discordEmoji(className),
            default: state.className === className,
          })),
        ),
      );
    const className = selected?.className ?? state.className;
    if (className)
      components.push(
        select(
          draft,
          "spec",
          "Choose your specialization",
          specializationsByClass[className].map((spec): NativeOption => ({
            label: spec,
            value: spec,
            emoji: discordEmoji(className, spec),
            default: state.specialization === spec,
          })),
        ),
      );
    if (definition.combatRoles && selected)
      components.push(
        select(
          draft,
          "role",
          "Choose your event role",
          ["tank", "healer", "damage"].map((role): NativeOption => ({
            label:
              role === "damage"
                ? "Damage"
                : role === "tank"
                  ? "Tank"
                  : "Healer",
            value: role,
            default: state.role === role,
          })),
        ),
      );
    if (!selected) {
      description += `**New character:** ${state.name ? discordText(state.name) : "Name not entered"}\nClass: ${state.className ?? "Not selected"}\nSpec: ${state.specialization ?? "Not selected"}\n\nSave the character first; this does not sign you up.\n${event.game === "tbc" ? "Use the 2-12 letter in-game name." : "Use the in-game first and last name, if applicable."}`;
      components.push(
        row([
          button(draft, "name", state.name ? "Edit name" : "Enter name"),
          button(
            draft,
            "register",
            "Save character",
            1,
            !state.className || !state.name || !state.specialization,
          ),
          button(draft, "close", "Cancel"),
        ]),
      );
    } else {
      components.push(
        select(
          draft,
          "attendance",
          "Your availability",
          attendanceChoices.map((attendance): NativeOption => ({
            label:
              attendance === "joining"
                ? "Joining"
                : signupStatusLabel(attendance),
            value: attendance,
            default: state.attendance === attendance,
          })),
        ),
      );
      description += `${emojiText(selected.className, state.specialization)}**${discordText(selected.name)}** · ${state.specialization ?? "Choose a spec"} ${selected.className}\nRole: **${definition.combatRoles ? state.role : "Participant"}**\n\n`;
      description +=
        state.attendance !== "joining"
          ? `Your response will be listed as **${signupStatusLabel(state.attendance)}**. This releases any confirmed seat and clears soft reserves. You can choose Sign up again while signups remain open.\n`
          : event.admission === "open"
            ? "Immediate signup. The organizer selects the roster later; signing up does not guarantee a place.\n"
            : event.admission === "approval"
              ? "Signup needs organizer approval; it does not reserve a confirmed seat.\n"
              : "Automatic admission; if your role is full, you join the bench.\n";
      description += `Roster audience: **${discordText(event.discord?.label || "Private test channel")}**. Your character, spec, role, availability and applicable reserves are shared with this event's audience.\n`;
      if (event.eventType === "raid" && state.attendance === "joining")
        description += event.catalog
          ? `Loot: ${reserveQuota(event, state.role)} SR for your role; ${event.allowDuplicates ? "duplicates allowed" : "unique items only"}.\nHard reserves (${event.hardReserves.length}): ${hardReserveText(event)}\n`
          : "No soft-reserve pool configured.\n";
      if (
        mine &&
        (mine.character.name !== selected.name ||
          mine.character.specialization !== state.specialization)
      )
        description +=
          "**Changing character/spec clears existing reserves and may require organizer approval again.**\n";
      if (event.description)
        description += `\n${discordText(event.description, 500)}\nFull conditions: Event details.\n`;
      description +=
        "\n**Confirm accepts the participation rules and roster audience above.**";
      components.push(
        row([
          button(
            draft,
            "confirm",
            state.attendance === "joining"
              ? "Confirm signup"
              : `Confirm ${signupStatusLabel(state.attendance)}`,
            3,
            !signupOpen || (definition.combatRoles && !state.specialization),
          ),
          button(draft, "close", "Cancel"),
          details,
        ]),
      );
    }
  } else if (state.mode === "leave" && !draft.completed) {
    title = "Withdraw signup?";
    description += mine
      ? `${signupLine(mine)}\n\nThis releases your participation and removes its soft reserves. It does not delete your saved character.`
      : "You are not signed up.";
    components.push(
      row([
        button(
          draft,
          "withdraw",
          "Confirm withdrawal",
          4,
          !mine || event.status !== "open",
        ),
        button(draft, "mine", "Keep signup"),
        details,
      ]),
    );
  } else if (state.mode === "reserves" && !draft.completed) {
    title = "My soft reserves";
    const limit = reserveQuota(event, mine?.role ?? "participant");
    const eligible = Boolean(
      event.eventType === "raid" &&
      event.catalog &&
      limit &&
      mine &&
      participatingStatuses.some((status) => status === mine.status),
    );
    if (!eligible) {
      description +=
        "Soft reserves are unavailable. Join this event first; your role needs a soft-reserve allowance and a configured loot pool.";
      components.push(row([button(draft, "mine", "My signup"), details]));
    } else {
      const catalog = event.catalog!;
      description += `${state.itemIds.length}/${limit} selected · ${event.allowDuplicates ? "Duplicates allowed" : "Unique items"}\nCloses ${event.reservesCloseLabel}\n\n`;
      description +=
        state.itemIds
          .map(
            (id, index) =>
              `${index + 1}. ${discordText(catalog.items.find((item) => item.itemId === id)?.name ?? `Item ${id}`, 80)}`,
          )
          .join("\n") || "No items selected.";
      const results = catalog.items.filter((item) =>
        item.name.toLowerCase().includes(state.query.toLowerCase()),
      );
      const selectable = results.filter(
        (item) =>
          item.classes.includes(mine!.character.className) &&
          !event.hardReserves.includes(item.itemId),
      );
      const page = selectable.slice(state.page * 10, state.page * 10 + 10);
      description += `\n\n${selectable.length} eligible results${state.query ? ` for "${discordText(state.query)}"` : ""}. ${results.length - selectable.length} excluded by class/HR rules.`;
      const options = page
        .filter(
          (item) =>
            event.allowDuplicates || !state.itemIds.includes(item.itemId),
        )
        .map((item): NativeOption => ({
          label: item.name.slice(0, 100),
          value: String(item.itemId),
          description: `${item.kind} · ${item.lootSource}`.slice(0, 100),
        }));
      if (options.length && state.itemIds.length < limit)
        components.push(select(draft, "add", "Add a reserve", options));
      if (state.itemIds.length)
        components.push(
          select(
            draft,
            "remove",
            "Remove a reserve",
            [...new Set(state.itemIds)].map((id): NativeOption => ({
              label: (
                catalog.items.find((item) => item.itemId === id)?.name ??
                `Item ${id}`
              ).slice(0, 100),
              value: String(id),
            })),
          ),
        );
      components.push(
        row([
          button(draft, "search", "Search items"),
          button(draft, "previous", "Previous", 2, state.page === 0),
          button(
            draft,
            "next",
            "Next",
            2,
            (state.page + 1) * 10 >= selectable.length,
          ),
        ]),
      );
      components.push(
        row([
          button(draft, "save", "Save reserves", 3, !reservesOpen),
          button(draft, "mine", "Discard changes"),
          { ...details, label: "Visual loot page", url: `${url}/reserves` },
        ]),
      );
    }
  } else if (state.mode === "roster" || state.mode === "manage") {
    title = state.mode === "manage" ? "Manage roster" : "Event roster";
    const matches = event.signups.filter(
      (signup) => signup.status === state.filter,
    );
    const ordered = [...matches].sort((a, b) =>
      state.grouping === "class"
        ? classes.indexOf(a.character.className) -
          classes.indexOf(b.character.className)
        : a.role.localeCompare(b.role),
    );
    const pageIndex = Math.min(
      state.page,
      Math.max(0, Math.ceil(ordered.length / 10) - 1),
    );
    const page = ordered.slice(pageIndex * 10, pageIndex * 10 + 10);
    description += `**${signupStatusLabel(state.filter)}** · ${matches.length} players · page ${pageIndex + 1}/${Math.max(1, Math.ceil(matches.length / 10))}\n\n`;
    const groups = new Map<string, SignupView[]>();
    for (const signup of page) {
      const key =
        state.grouping === "class" ? signup.character.className : signup.role;
      groups.set(key, [...(groups.get(key) ?? []), signup]);
    }
    description +=
      [...groups]
        .map(
          ([key, signups]) =>
            `${state.grouping === "class" ? emojiText(signups[0].character.className) : ""}**${key}**\n${signups.map(signupLine).join("\n")}`,
        )
        .join("\n\n") || "No players in this list.";
    components.push(
      select(
        draft,
        "view",
        "Roster view",
        ["class", "role"].flatMap((grouping) =>
          rosterStatuses.map((filter): NativeOption => ({
            label: `${signupStatusLabel(filter)} · by ${grouping}`,
            value: `${grouping}:${filter}`,
            default: state.grouping === grouping && state.filter === filter,
          })),
        ),
      ),
    );
    if (
      state.mode === "manage" &&
      participatingStatuses.some((status) => status === state.filter) &&
      page.length &&
      signupOpen &&
      !state.lockConfirm
    ) {
      components.push(
        select(
          draft,
          "candidate",
          "Choose a player",
          page.map((signup): NativeOption => ({
            label: signup.character.name,
            description:
              `${signup.character.specialization ?? signup.character.className} · ${signup.role} · ${signup.status}`.slice(
                0,
                100,
              ),
            value: signup.id,
            default: state.signupId === signup.id,
            emoji: discordEmoji(
              signup.character.className,
              signup.character.specialization,
            ),
          })),
        ),
      );
      components.push(
        row([
          button(draft, "accept", "Add to roster", 3, !state.signupId),
          button(draft, "bench", "Move to bench", 2, !state.signupId),
        ]),
      );
    }
    components.push(
      row([
        button(draft, "previous", "Previous", 2, pageIndex === 0),
        button(
          draft,
          "next",
          "Next",
          2,
          (pageIndex + 1) * 10 >= matches.length,
        ),
        ...(state.mode === "manage" && event.status === "open"
          ? [
              button(
                draft,
                state.lockConfirm ? "lock_confirm" : "lock",
                state.lockConfirm ? "Confirm lock" : "Lock roster",
                state.lockConfirm ? 4 : 2,
              ),
            ]
          : []),
        details,
      ]),
    );
    if (state.lockConfirm)
      description +=
        "\n\n**Locking closes changes and captures an immutable roster/loot snapshot. Confirm only when the roster is final.**";
  } else {
    title = "My signup";
    description += `**${nativeSignupStatus(mine)}**\n${mine ? signupLine(mine) : "No participation recorded."}\n\nSignups close ${event.signupCloseLabel}`;
    if (mine?.reserves.length)
      description += `\n\nReserves:\n${mine.reserves.map((id) => discordText(event.catalog?.items.find((item) => item.itemId === id)?.name ?? `Item ${id}`, 80)).join("\n")}`;
    if (mine?.needsAcknowledgement && event.status === "open") {
      const review = mine.imported
        ? "Your signup was imported. Review the current event details before acknowledging."
        : "The organizer updated this event. Review the current details before acknowledging.";
      description += `\n\n**${review}**\nAdmission: ${event.admission}\n${event.catalog ? reservePolicyLabel(event) : "No soft reserves"}\nHard reserves: ${hardReserveText(event)}`;
      components.push(
        row([
          button(
            draft,
            "acknowledge",
            mine.imported
              ? "Acknowledge event rules"
              : "Acknowledge updated rules",
            3,
          ),
        ]),
      );
    }
    components.push(
      row([
        button(
          draft,
          "join",
          mine ? "Change signup" : "Sign up",
          1,
          !signupOpen,
        ),
        ...(mine
          ? [button(draft, "leave", "Withdraw", 2, event.status !== "open")]
          : []),
        ...(event.eventType === "raid" &&
        event.catalog &&
        event.reserveLimit &&
        mine &&
        participatingStatuses.some((status) => status === mine.status)
          ? [button(draft, "reserves", "Reserves", 2, !reservesOpen)]
          : []),
        ...(event.isOrganizer
          ? [button(draft, "manage", "Manage roster")]
          : []),
        details,
      ]),
    );
    if (signupOpen)
      components.push(
        row([
          button(draft, "tentative", "Tentative"),
          button(draft, "absent", "Absent"),
        ]),
      );
  }
  if (event.status !== "open")
    description += `\n\n**Event ${event.status}. Changes are closed.**`;
  return nativeMessageSchema.parse({
    content: notice ? discordText(notice, 300) : "",
    embeds: [
      {
        title,
        description,
        color: state.className ? classAccent(state.className) : 0xdfb956,
        footer: {
          text: "Private to you · selections are saved only after confirmation",
        },
      },
    ],
    components,
    allowed_mentions: { parse: [] },
  });
}
