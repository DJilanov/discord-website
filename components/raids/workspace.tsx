"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Plus,
  Save,
  Pencil,
  Swords,
  Users,
  ArrowLeft,
  LockKeyhole,
  Download,
  UserMinus,
  X,
  RefreshCw,
  DoorOpen,
  Flag,
  MapPin,
  PartyPopper,
  ScrollText,
  MessageCircle,
  Clock3,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { z } from "zod";
import { toolGroupPrefill, type ToolGroupDraft } from "@/lib/tool-group-draft";
import {
  characterSchema,
  factions,
  regions,
  roles,
  attendanceChoices,
  type AttendanceChoice,
  type CatalogView,
  type CharacterView,
  type EventView,
  type EventSummary,
  type RaidRole,
  type EventHistoryPage,
} from "@/lib/raids/contracts";
import {
  suggestedRole,
  type ClassName,
  type Specialization,
} from "@/lib/raids/specializations";
import { classArtwork } from "@/lib/raids/presentation";
import {
  games,
  gameLabels,
  gameSchema,
  raidPresets,
  type RaidGame,
} from "@/lib/raids/games";
import { characterCanJoin } from "@/lib/raids/games";
import { reserveQuota, reservePolicyLabel } from "@/lib/raids/loot-policy";
import { localRaidStart } from "@/lib/raids/time";
import type { RaidDiscordDestinationView } from "@/lib/raids/discord-settings";
import {
  eventTypes,
  eventTypeDefinitions,
  type EventType,
} from "@/lib/raids/event-types";
import {
  CharacterPicker,
  CharacterPortrait,
  ClassPicker,
  RoleIcon,
  RolePicker,
  SpecializationPicker,
} from "./character-picker";
import { EventCover } from "./event-cover";
import { EventRoster } from "./event-roster";
import { EventChangeHistory } from "./change-history";
import { SignupImport } from "./signup-import";
import {
  categoryItemIds,
  hardReserveCategoryLabels,
  toggleHardReserveCategory,
} from "@/lib/raids/hard-reserve-selection";
import type { HardReserveCategories } from "@/lib/raids/item-detail-contracts";
import {
  eventDurationLabel,
  summarizeEventRoster,
  signupStatusLabel,
} from "@/lib/raids/event-preview";

import { postRaid, useRaidClock } from "./client-data";
function message(error: unknown): string {
  return error instanceof Error ? error.message : "The request failed.";
}
function values(event: FormEvent<HTMLFormElement>): FormData {
  event.preventDefault();
  return new FormData(event.currentTarget);
}
function text(data: FormData, key: string): string {
  return String(data.get(key) ?? "");
}
function number(data: FormData, key: string): number {
  return Number(text(data, key));
}
function Notice({
  error,
  success,
}: {
  error: string;
  success?: string;
}): React.JSX.Element | null {
  if (!error && !success) return null;
  return (
    <p
      className={`raid-notice ${error ? "error" : "success"}`}
      role={error ? "alert" : "status"}
    >
      {error || success}
    </p>
  );
}
function EventTypeIcon({
  eventType,
  size = 23,
}: {
  eventType: EventType;
  size?: number;
}): React.JSX.Element {
  const Icon = {
    raid: Swords,
    dungeon: DoorOpen,
    battleground: Flag,
    world_pvp: MapPin,
    questing: ScrollText,
    social: PartyPopper,
    other: CalendarDays,
  }[eventType];
  return <Icon size={size} aria-hidden="true" />;
}
export function RaidList({
  events,
  initialNow,
}: {
  events: EventSummary[];
  initialNow: number;
}): React.JSX.Element {
  const [filter, setFilter] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [gameFilter, setGameFilter] = useState<RaidGame | "all">("all");
  const now = useRaidClock(initialNow);
  const filtered = events.filter(
    (event) =>
      (gameFilter === "all" || event.game === gameFilter) &&
      (typeFilter === "all" || event.eventType === typeFilter) &&
      (filter === "all" ||
        (event.status !== "cancelled" &&
          new Date(event.endsAt).getTime() > now)),
  );
  return (
    <>
      <div className="raid-heading">
        <div>
          <p className="eyebrow">Community events</p>
          <h1>Event planner</h1>
        </div>
        <label className="raid-type-filter">
          Game edition
          <select
            aria-label="Game edition"
            value={gameFilter}
            onChange={(event) =>
              setGameFilter(
                event.target.value === "all"
                  ? "all"
                  : gameSchema.parse(event.target.value),
              )
            }
          >
            <option value="all">All editions</option>
            {games.map((game) => (
              <option key={game} value={game}>
                {gameLabels[game]}
              </option>
            ))}
          </select>
        </label>
        <label className="raid-type-filter">
          Event type
          <select
            aria-label="Event type"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value === "all"
                  ? "all"
                  : z.enum(eventTypes).parse(event.target.value),
              )
            }
          >
            <option value="all">All types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {eventTypeDefinitions[type].label}
              </option>
            ))}
          </select>
        </label>
        <Link className="button primary" href="/raids/new">
          <Plus size={17} />
          Create event
        </Link>
      </div>
      <div className="raid-toolbar">
        <div className="raid-tabs" role="group" aria-label="Event filter">
          {["upcoming", "all"].map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All events" : "Upcoming"}
            </button>
          ))}
        </div>
        <Link className="text-link" href="/account/characters">
          <Users size={16} />
          My characters
        </Link>
      </div>
      {!filtered.length ? (
        <div className="raid-empty">
          <CalendarDays size={32} />
          <h2>{events.length ? "No matching events" : "No events yet"}</h2>
          <Link href="/raids/new" className="text-link">
            Create an event
            <Plus size={16} />
          </Link>
        </div>
      ) : (
        <div className="raid-event-list">
          {filtered.map((event) => (
            <Link
              key={event.id}
              href={`/raids/${event.id}`}
              className="raid-event-row"
            >
              <EventTypeIcon eventType={event.eventType} />
              <div>
                <h2>{event.title}</h2>
                <p>{event.timeLabel}</p>
                <span className="muted">
                  {eventTypeDefinitions[event.eventType].label} &middot;{" "}
                  {event.raidName} &middot; {event.region} &middot;{" "}
                  {event.faction} &middot; {event.ruleset} &middot;{" "}
                  {gameLabels[event.game]}
                  {event.realm ? ` · ${event.realm}` : ""}
                </span>
              </div>
              <div className="raid-event-count">
                <strong>
                  {event.acceptedCount}/{event.capacity}
                </strong>
                <span className={`raid-badge ${event.status}`}>
                  {event.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
function CharacterSpecializationEditor({
  character,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  character: CharacterView;
  onSaved: () => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}): React.JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const [specialization, setSpecialization] = useState<Specialization | "">(
    character.specialization ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const form = formRef.current;
    (
      form?.querySelector<HTMLInputElement>("input:checked") ??
      form?.querySelector<HTMLInputElement>('input[type="radio"]')
    )?.focus();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    onBusyChange(true);
    setError("");
    let saved = false;
    try {
      await postRaid(
        "/api/community/characters",
        { id: character.id, specialization },
        "PATCH",
      );
      saved = true;
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
    if (saved) onSaved();
  }
  return (
    <form
      ref={formRef}
      className="raid-form raid-character-editor"
      onSubmit={submit}
    >
      <SpecializationPicker
        className={character.className}
        value={specialization}
        onChange={setSpecialization}
        label="Default specialization"
        accessibleLabel={`Default specialization for ${character.name}`}
        disabled={busy}
      />
      <Notice error={error} />
      <div className="raid-editor-actions">
        <button
          type="submit"
          className="button primary"
          disabled={busy || specialization === character.specialization}
          aria-label={`Save specialization for ${character.name}`}
        >
          <Save size={17} />
          {busy ? "Saving..." : "Save default"}
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          onClick={onCancel}
          title="Cancel editing"
          aria-label={`Cancel editing ${character.name}`}
        >
          <X size={17} />
        </button>
      </div>
    </form>
  );
}

function CharacterCard({
  character,
  editing,
  onToggle,
  onClose,
  saving,
  onBusyChange,
}: {
  character: CharacterView;
  editing: boolean;
  onToggle: () => void;
  onClose: () => void;
  saving: boolean;
  onBusyChange: (busy: boolean) => void;
}): React.JSX.Element {
  const router = useRouter();
  const panelId = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const [success, setSuccess] = useState("");
  function close(): void {
    onClose();
    requestAnimationFrame(() => editRef.current?.focus());
  }
  return (
    <li className="raid-character-card">
      <div className="raid-character-header">
        <CharacterPortrait
          className={character.className}
          specialization={character.specialization}
        />
        <div className="raid-character-copy">
          <strong style={{ color: classArtwork[character.className].color }}>
            {character.name}
          </strong>
          <p>
            {character.specialization ?? "Spec not selected"} &middot;{" "}
            {character.className}
          </p>
          <small>
            {gameLabels[character.game]}
            {character.realm ? ` · ${character.realm}` : ""} &middot;{" "}
            {character.region} &middot; {character.faction} &middot;{" "}
            {character.ruleset}
          </small>
        </div>
        <button
          ref={editRef}
          type="button"
          className="icon-button"
          disabled={saving}
          aria-expanded={editing}
          aria-controls={panelId}
          title={
            editing ? "Close specialization editor" : "Edit specialization"
          }
          aria-label={`Edit specialization for ${character.name}`}
          onClick={() => {
            setSuccess("");
            onToggle();
          }}
        >
          <Pencil size={17} />
        </button>
      </div>
      <div id={panelId} hidden={!editing}>
        {editing && (
          <CharacterSpecializationEditor
            character={character}
            onBusyChange={onBusyChange}
            onCancel={close}
            onSaved={() => {
              setSuccess("Default saved.");
              close();
              router.refresh();
            }}
          />
        )}
      </div>
      <Notice error="" success={success} />
    </li>
  );
}

export function CharacterManager({
  characters,
}: {
  characters: CharacterView[];
}): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [className, setClassName] = useState<ClassName>("Warrior");
  const [game, setGame] = useState<RaidGame>("forever");
  const [specialization, setSpecialization] = useState<Specialization | "">("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(
    null,
  );
  const [savingCharacter, setSavingCharacter] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    const form = event.currentTarget,
      data = values(event);
    setError("");
    setNameError("");
    const input = characterSchema.safeParse({
      ...Object.fromEntries(data),
      game,
    });
    if (!input.success) {
      const nameIssue = input.error.issues.find(
        (issue) => issue.path[0] === "name",
      );
      if (nameIssue) {
        setNameError(nameIssue.message);
        form.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
      } else setError("Check the character details and try again.");
      return;
    }
    setBusy(true);
    try {
      await postRaid("/api/community/characters", input.data);
      form.reset();
      setClassName("Warrior");
      setSpecialization("");
      router.refresh();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="raid-heading">
        <h1>My characters</h1>
        <Link className="text-link" href="/raids">
          <ArrowLeft size={16} />
          Events
        </Link>
      </div>
      <div className="raid-columns raid-character-workspace">
        <section>
          <h2>Characters</h2>
          {!characters.length && <p className="muted">No characters added.</p>}
          <ul className="raid-character-list">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                editing={editingCharacterId === character.id}
                saving={savingCharacter}
                onBusyChange={setSavingCharacter}
                onToggle={() =>
                  setEditingCharacterId(
                    editingCharacterId === character.id ? null : character.id,
                  )
                }
                onClose={() => setEditingCharacterId(null)}
              />
            ))}
          </ul>
        </section>
        <section>
          <h2>Add character</h2>
          <form onSubmit={submit} className="raid-form">
            <label>
              Game edition
              <select
                aria-label="Game edition"
                value={game}
                disabled={busy}
                onChange={(event) => {
                  setGame(gameSchema.parse(event.target.value));
                  setNameError("");
                }}
              >
                {games.map((value) => (
                  <option value={value} key={value}>
                    {gameLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            {game === "tbc" && (
              <label>
                Realm
                <input
                  name="realm"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Spineshatter"
                />
              </label>
            )}
            <label>
              {game === "tbc" ? "Character name" : "Full character name"}
              <input
                name="name"
                required
                minLength={2}
                maxLength={game === "tbc" ? 12 : 40}
                autoComplete="off"
                placeholder={game === "tbc" ? "Character" : "First Last"}
                aria-invalid={Boolean(nameError)}
                aria-describedby={
                  nameError ? "character-name-error" : undefined
                }
                onChange={() => setNameError("")}
              />
            </label>
            {nameError && (
              <p
                id="character-name-error"
                className="raid-notice error"
                role="alert"
              >
                {nameError}
              </p>
            )}
            <ClassPicker
              value={className}
              disabled={busy}
              onChange={(value) => {
                setClassName(value);
                setSpecialization("");
              }}
            />
            <SpecializationPicker
              className={className}
              value={specialization}
              onChange={setSpecialization}
              disabled={busy}
            />
            <div className="raid-form-grid">
              <label>
                Region
                <select name="region" aria-label="Region">
                  {regions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Faction
                <select name="faction" aria-label="Faction">
                  {factions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Character ruleset
              <select
                name="ruleset"
                aria-label="Character ruleset"
                defaultValue="PvP"
              >
                {["PvE", "PvP", "RP"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <Notice error={error} />
            <button disabled={busy} className="button primary">
              <Plus size={16} />
              {busy ? "Adding..." : "Add character"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
export function CreateRaid({
  catalogs,
  destinations,
  canSelectChannels,
  channelAccessError,
  initialEvent,
  toolDraft,
  onSaved,
  onCancel,
}: {
  catalogs: CatalogView[];
  destinations: RaidDiscordDestinationView[];
  canSelectChannels: boolean;
  channelAccessError: string;
  initialEvent?: EventView;
  toolDraft?: ToolGroupDraft;
  onSaved?: () => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const prefill =
    !initialEvent && toolDraft ? toolGroupPrefill(toolDraft) : null;
  const [catalogId, setCatalogId] = useState(initialEvent?.catalog?.id ?? "");
  const [game, setGame] = useState<RaidGame>(initialEvent?.game ?? "forever");
  const [presetName, setPresetName] = useState(
    initialEvent?.eventType === "raid" &&
      raidPresets[initialEvent.game].some(
        (preset) => preset.name === initialEvent.raidName,
      )
      ? initialEvent.raidName
      : "",
  );
  const [targetName, setTargetName] = useState(
    initialEvent?.raidName ?? prefill?.target ?? "",
  );
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [channels, setChannels] = useState(destinations);
  const [channelWarnings, setChannelWarnings] = useState<string[]>([]);
  const [channelError, setChannelError] = useState("");
  const [channelsLoading, setChannelsLoading] = useState(
    canSelectChannels && destinations.length > 0,
  );
  const [channelRefresh, setChannelRefresh] = useState(0);
  const [channelFilter, setChannelFilter] = useState("");
  const [eventType, setEventType] = useState<EventType>(
    initialEvent?.eventType ?? prefill?.eventType ?? "raid",
  );
  const [capacity, setCapacity] = useState(
    String(
      initialEvent?.capacity ??
        prefill?.capacity ??
        eventTypeDefinitions.raid.capacity,
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const [hardReserves, setHardReserves] = useState<number[]>(
    initialEvent?.hardReserves ?? [],
  );
  const [hardReserveSearch, setHardReserveSearch] = useState("");
  const [region, setRegion] = useState(initialEvent?.region ?? "EU");
  const editionCatalogs = catalogs.filter((record) => record.game === game);
  const catalog = editionCatalogs.find((record) => record.id === catalogId);
  const preset = raidPresets[game].find((record) => record.name === presetName);
  const definition = eventTypeDefinitions[eventType];
  const initialRoles =
    initialEvent?.game === game &&
    initialEvent.eventType === eventType &&
    initialEvent.raidName === (catalog?.raidName ?? (presetName || targetName))
      ? initialEvent.roleCaps
      : null;
  const selectedChannel = channels.find(
    (entry) =>
      entry.channelId === (discordChannelId || destinations[0]?.channelId),
  );
  useEffect(() => {
    if (!canSelectChannels || !destinations.length) return;
    const controller = new AbortController();
    async function load(): Promise<void> {
      setChannelsLoading(true);
      setChannelError("");
      try {
        const response = await fetch("/api/raids/channels", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok)
          throw new Error(z.object({ error: z.string() }).parse(body).error);
        const result = z
          .object({
            channels: z.array(
              z.object({
                guildId: z.string(),
                channelId: z.string(),
                label: z.string(),
                visibility: z.enum(["private", "community"]),
              }),
            ),
            warnings: z.array(z.string()),
          })
          .parse(body);
        if (!controller.signal.aborted) {
          setChannels(result.channels);
          setChannelWarnings(result.warnings);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setChannelError(message(cause));
      } finally {
        if (!controller.signal.aborted) setChannelsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [destinations, channelRefresh, canSelectChannels]);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    const data = values(event),
      key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    setBusy(true);
    setError("");
    try {
      const settings = {
        title: text(data, "title"),
        eventType,
        game,
        realm: game === "tbc" ? text(data, "realm") : "",
        raidName: catalog?.raidName ?? (preset?.name || text(data, "raidName")),
        region,
        faction: text(data, "faction"),
        ruleset: text(data, "ruleset"),
        localStart: text(data, "localStart"),
        durationMinutes: number(data, "durationMinutes"),
        signupMinutesBefore: number(data, "signupMinutesBefore"),
        reserveMinutesBefore:
          eventType === "raid"
            ? number(data, "reserveMinutesBefore")
            : number(data, "signupMinutesBefore"),
        capacity: number(data, "capacity"),
        roleCaps: {
          tank: definition.combatRoles ? number(data, "tank") : 0,
          healer: definition.combatRoles ? number(data, "healer") : 0,
          damage: definition.combatRoles ? number(data, "damage") : 0,
        },
        admission: text(data, "admission"),
        description: text(data, "description"),
        catalogId: catalogId || null,
        reserveLimit: catalog
          ? Math.max(...roles.map((role) => number(data, `sr-${role}`)))
          : 0,
        reserveLimits: catalog
          ? {
              tank: number(data, "sr-tank"),
              healer: number(data, "sr-healer"),
              damage: number(data, "sr-damage"),
            }
          : null,
        allowDuplicates: data.has("allowDuplicates"),
        hardReserves,
      };
      if (initialEvent) {
        if (
          !initialEvent.reserveLimits &&
          initialEvent.catalog?.id === settings.catalogId &&
          roles.every(
            (role) =>
              settings.reserveLimits?.[role] === initialEvent.reserveLimit,
          )
        )
          settings.reserveLimits = null;
        await postRaid(`/api/raids/${initialEvent.id}`, {
          operation: "manage",
          input: { action: "edit", version: initialEvent.version, settings },
        });
        onSaved?.();
        router.refresh();
        return;
      }
      const result = z.object({ id: z.string() }).parse(
        await postRaid("/api/raids", {
          ...settings,
          requestKey: key,
          discordChannelId: canSelectChannels ? discordChannelId || null : null,
          confirmDiscordPublication: data.has("confirmDiscordPublication"),
        }),
      );
      router.push(`/raids/${result.id}`);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="raid-heading">
        {initialEvent ? <h2>Edit event</h2> : <h1>Create event</h1>}
        {initialEvent ? (
          <button
            className="icon-button"
            type="button"
            title="Close editor"
            aria-label="Close editor"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        ) : (
          <Link className="text-link" href="/raids">
            <ArrowLeft size={16} />
            Events
          </Link>
        )}
      </div>
      {prefill && toolDraft && (
        <section
          className="raid-source-plan"
          aria-label="Shared planning reference"
        >
          <div>
            <span>Draft only</span>
            <strong>{toolDraft.label}</strong>
          </div>
          <div className="button-row">
            <a
              className="text-link"
              href={toolDraft.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open source plan
            </a>
            <Link
              className="text-link"
              href="/raids/new"
              title="Discard this shared plan and start a blank event"
            >
              <X size={14} />
              Start blank
            </Link>
          </div>
        </section>
      )}
      <form
        onSubmit={submit}
        className="raid-form"
        onChange={() => {
          if (!busy) setRequestKey("");
        }}
      >
        <fieldset
          className="raid-form-fields"
          aria-label="Event settings"
          disabled={busy}
        >
          <div className="raid-columns">
            <section>
              <h2>Event</h2>
              <label>
                Game edition
                <select
                  aria-label="Game edition"
                  value={game}
                  disabled={busy || Boolean(prefill)}
                  title={
                    prefill
                      ? "The shared plan is for Forever. Start a blank event to choose another edition."
                      : undefined
                  }
                  onChange={(event) => {
                    const value = gameSchema.parse(event.target.value);
                    setGame(value);
                    setCatalogId("");
                    setHardReserves([]);
                    setPresetName("");
                    setCapacity(
                      String(
                        eventType === "raid" && value === "tbc"
                          ? 25
                          : definition.capacity,
                      ),
                    );
                  }}
                >
                  {games.map((value) => (
                    <option value={value} key={value}>
                      {gameLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              {channelAccessError && <p role="alert">{channelAccessError}</p>}
              {!canSelectChannels && destinations[0] && (
                <p className="raid-default-destination">
                  <MessageCircle size={17} />
                  <span>
                    Discord destination<strong>{destinations[0].label}</strong>
                  </span>
                </p>
              )}
              {canSelectChannels && destinations.length > 0 && (
                <div className="raid-channel-picker">
                  <label>
                    Find a channel
                    <input
                      type="search"
                      value={channelFilter}
                      disabled={busy}
                      onChange={(event) => {
                        // Filtering choices does not change the event or its retry key.
                        event.stopPropagation();
                        setChannelFilter(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Discord channel
                    <select
                      aria-label="Discord channel"
                      title={selectedChannel?.label ?? destinations[0].label}
                      value={discordChannelId}
                      disabled={busy}
                      onChange={(event) =>
                        setDiscordChannelId(event.target.value)
                      }
                    >
                      <option value="">
                        {destinations[0].label} (default)
                      </option>
                      {channels
                        .filter(
                          (entry) =>
                            entry.channelId !== destinations[0].channelId &&
                            (entry.channelId === discordChannelId ||
                              entry.label
                                .toLowerCase()
                                .includes(channelFilter.trim().toLowerCase())),
                        )
                        .map((destination) => (
                          <option
                            value={destination.channelId}
                            key={destination.channelId}
                          >
                            {destination.label}
                            {destination.visibility === "community"
                              ? " (shared)"
                              : " (private)"}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button secondary"
                    title="Refresh Discord channels"
                    disabled={busy || channelsLoading}
                    onClick={() => setChannelRefresh((value) => value + 1)}
                  >
                    <RefreshCw size={16} />
                    {channelsLoading
                      ? "Loading channels..."
                      : "Refresh channels"}
                  </button>
                  {channelError && <p role="alert">{channelError}</p>}
                  {channelWarnings.map((warning) => (
                    <p className="fine-print" key={warning}>
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              {selectedChannel?.visibility === "community" && (
                <label className="raid-check" key={discordChannelId}>
                  <input
                    type="checkbox"
                    name="confirmDiscordPublication"
                    required
                    disabled={busy}
                  />
                  I confirm this event and its character roster, specializations
                  and reserves may be shown in {selectedChannel.label}.
                </label>
              )}
              <label>
                Event type
                <select
                  aria-label="Event type"
                  value={eventType}
                  disabled={busy}
                  onChange={(event) => {
                    const type = z.enum(eventTypes).parse(event.target.value);
                    setEventType(type);
                    setCapacity(
                      String(
                        type === "raid" && game === "tbc"
                          ? 25
                          : eventTypeDefinitions[type].capacity,
                      ),
                    );
                    setCatalogId("");
                    setPresetName("");
                    setHardReserves([]);
                  }}
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {eventTypeDefinitions[type].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  name="title"
                  required
                  minLength={3}
                  maxLength={120}
                  defaultValue={initialEvent?.title ?? prefill?.title}
                />
              </label>
              {eventType === "raid" && (
                <label>
                  Raid
                  <select
                    aria-label="Raid preset"
                    value={presetName}
                    disabled={busy}
                    onChange={(change) => {
                      const name = change.target.value;
                      setPresetName(name);
                      setHardReserves([]);
                      const selected = raidPresets[game].find(
                        (record) => record.name === name,
                      );
                      setCatalogId(
                        editionCatalogs.find(
                          (record) => record.raidName === name,
                        )?.id ?? "",
                      );
                      setCapacity(
                        String(
                          selected?.capacity ??
                            (game === "tbc" ? 25 : definition.capacity),
                        ),
                      );
                    }}
                  >
                    <option value="">Choose a raid / custom raid</option>
                    {raidPresets[game].map((record) => (
                      <option key={record.name} value={record.name}>
                        {record.name}
                        {game === "tbc" ? ` · ${record.capacity} players` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {eventType === "raid" && (
                <label>
                  Loot catalog
                  <select
                    aria-label="Loot catalog"
                    value={catalogId}
                    onChange={(event) => {
                      setCatalogId(event.target.value);
                      setHardReserves([]);
                      const selected = editionCatalogs.find(
                        (record) => record.id === event.target.value,
                      );
                      if (!selected) return;
                      const selectedPreset = raidPresets[game].find(
                        (record) => record.name === selected?.raidName,
                      );
                      setPresetName(selectedPreset?.name ?? "");
                      setCapacity(
                        String(
                          selectedPreset?.capacity ??
                            (game === "tbc" ? 25 : definition.capacity),
                        ),
                      );
                    }}
                  >
                    <option value="">Planning only / no loot</option>
                    {editionCatalogs
                      .filter(
                        (record) =>
                          !presetName || record.raidName === presetName,
                      )
                      .map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.raidName} &middot;{" "}
                          {record.checksum.slice(0, 8)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {!catalog &&
                (eventType === "raid" ? (
                  <>
                    {!presetName && (
                      <label>
                        {game === "forever"
                          ? "Forever raid name"
                          : "TBC raid name"}
                        <input
                          name="raidName"
                          required
                          minLength={3}
                          maxLength={100}
                          defaultValue={targetName}
                          onChange={(event) =>
                            setTargetName(event.target.value)
                          }
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <label>
                    {definition.targetLabel}
                    <input
                      name="raidName"
                      required
                      minLength={3}
                      maxLength={100}
                      defaultValue={targetName}
                      onChange={(event) => setTargetName(event.target.value)}
                    />
                  </label>
                ))}
              {game === "tbc" && (
                <label>
                  Realm
                  <input
                    name="realm"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Spineshatter"
                    defaultValue={initialEvent?.realm}
                  />
                </label>
              )}
              <div className="raid-form-grid">
                <label>
                  Region
                  <select
                    aria-label="Region"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                  >
                    {regions.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Faction
                  <select
                    name="faction"
                    aria-label="Faction"
                    defaultValue={initialEvent?.faction ?? prefill?.faction}
                  >
                    {factions.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Character ruleset
                <select
                  name="ruleset"
                  aria-label="Character ruleset"
                  defaultValue={initialEvent?.ruleset ?? "PvP"}
                >
                  {["PvE", "PvP", "RP"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Starts (
                {region === "EU"
                  ? "Central European time"
                  : region === "NA"
                    ? "New York time"
                    : "Sydney time"}
                )
                <input
                  type="datetime-local"
                  name="localStart"
                  required
                  defaultValue={
                    initialEvent
                      ? localRaidStart(
                          initialEvent.startsAt,
                          initialEvent.region,
                        )
                      : undefined
                  }
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  name="durationMinutes"
                  min={30}
                  max={1440}
                  defaultValue={
                    initialEvent
                      ? (Date.parse(initialEvent.endsAt) -
                          Date.parse(initialEvent.startsAt)) /
                        60000
                      : 180
                  }
                  required
                />
              </label>
              <label>
                Details
                <textarea
                  name="description"
                  aria-label="Details"
                  maxLength={3000}
                  rows={4}
                  defaultValue={
                    initialEvent?.description ?? prefill?.description
                  }
                />
              </label>
            </section>
            <section>
              <EventCover
                game={game}
                eventType={eventType}
                name={catalog?.raidName ?? (presetName || targetName)}
              />
              <h2>{eventType === "raid" ? "Roster & loot" : "Participants"}</h2>
              <label>
                Capacity
                <input
                  type="number"
                  name="capacity"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(event) => setCapacity(event.currentTarget.value)}
                  required
                />
              </label>
              {definition.combatRoles && (
                <div
                  className="raid-form-grid three"
                  key={`${game}-${eventType}-${presetName}`}
                >
                  {roles.map((role) => (
                    <label key={role}>
                      {role === "damage"
                        ? "Damage"
                        : role === "tank"
                          ? "Tanks"
                          : "Healers"}
                      <input
                        type="number"
                        name={role}
                        min={0}
                        max={100}
                        defaultValue={
                          (initialRoles ??
                            (prefill?.eventType === eventType
                              ? prefill.roleCaps
                              : null) ??
                            preset?.roleCaps ??
                            (game === "tbc" && eventType === "raid"
                              ? raidPresets.tbc[1].roleCaps
                              : definition.roleCaps))[role]
                        }
                        required
                      />
                    </label>
                  ))}
                </div>
              )}
              <label>
                Admission
                <select
                  name="admission"
                  aria-label="Admission"
                  defaultValue={initialEvent?.admission ?? prefill?.admission}
                >
                  <option value="automatic">Automatic / bench when full</option>
                  <option value="open">
                    Open signup / select roster later
                  </option>
                  <option value="approval">Organizer approval</option>
                </select>
              </label>
              <div className="raid-form-grid">
                <label>
                  Close signups (minutes before)
                  <input
                    type="number"
                    name="signupMinutesBefore"
                    min={0}
                    max={10080}
                    defaultValue={
                      initialEvent
                        ? (Date.parse(initialEvent.startsAt) -
                            Date.parse(initialEvent.signupClosesAt)) /
                          60000
                        : 15
                    }
                    required
                  />
                </label>
                {eventType === "raid" && (
                  <label>
                    Close reserves (minutes before)
                    <input
                      type="number"
                      name="reserveMinutesBefore"
                      min={0}
                      max={10080}
                      defaultValue={
                        initialEvent
                          ? (Date.parse(initialEvent.startsAt) -
                              Date.parse(initialEvent.reservesCloseAt)) /
                            60000
                          : 15
                      }
                      required
                    />
                  </label>
                )}
              </div>
              {catalog ? (
                <>
                  <fieldset key={catalog.id}>
                    <legend>Soft reserves by role</legend>
                    <div className="raid-form-grid three">
                      {roles.map((role) => (
                        <label key={role}>
                          {role === "tank"
                            ? "Tank SR"
                            : role === "healer"
                              ? "Healer SR"
                              : "DPS SR"}
                          <input
                            name={`sr-${role}`}
                            type="number"
                            min={0}
                            max={10}
                            defaultValue={
                              initialEvent?.catalog?.id === catalog.id
                                ? reserveQuota(initialEvent, role)
                                : 2
                            }
                            required
                            disabled={busy}
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="raid-check">
                    <input
                      name="allowDuplicates"
                      type="checkbox"
                      defaultChecked={initialEvent?.allowDuplicates}
                    />
                    Allow multiple reserves on one item
                  </label>
                  <fieldset>
                    <legend>Hard reserves</legend>
                    <div className="raid-hr-categories">
                      {(
                        Object.keys(
                          hardReserveCategoryLabels,
                        ) as (keyof HardReserveCategories)[]
                      ).map((category) => {
                        const ids = categoryItemIds(catalog.items, category);
                        const complete = catalog.items.every(
                          (item) => item.details,
                        );
                        return (
                          <label className="raid-check" key={category}>
                            <input
                              type="checkbox"
                              aria-label={hardReserveCategoryLabels[category]}
                              title={
                                !complete
                                  ? "Item categories have not been verified for this catalog"
                                  : !ids.length
                                    ? "No matching items in this loot catalog"
                                    : undefined
                              }
                              disabled={!complete || !ids.length || busy}
                              checked={
                                ids.length > 0 &&
                                ids.every((id) => hardReserves.includes(id))
                              }
                              onChange={(change) =>
                                setHardReserves(
                                  toggleHardReserveCategory(
                                    catalog.items,
                                    hardReserves,
                                    category,
                                    change.target.checked,
                                  ),
                                )
                              }
                            />
                            <span>
                              {hardReserveCategoryLabels[category]}{" "}
                              <small className="muted">
                                ({complete ? ids.length : "unavailable"})
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <label>
                      Search hard-reserve loot
                      <input
                        type="search"
                        value={hardReserveSearch}
                        onChange={(change) =>
                          setHardReserveSearch(change.target.value)
                        }
                      />
                    </label>
                    <p className="fine-print">
                      {hardReserves.length} hard reserved
                    </p>
                    <div className="raid-item-checks">
                      {catalog.items
                        .filter(
                          (item) =>
                            !hardReserveSearch ||
                            item.name
                              .toLowerCase()
                              .includes(hardReserveSearch.toLowerCase()) ||
                            hardReserves.includes(item.itemId),
                        )
                        .map((item) => (
                          <label className="raid-check" key={item.itemId}>
                            <input
                              type="checkbox"
                              aria-label={item.name}
                              checked={hardReserves.includes(item.itemId)}
                              onChange={(event) =>
                                setHardReserves(
                                  event.target.checked
                                    ? [...hardReserves, item.itemId]
                                    : hardReserves.filter(
                                        (id) => id !== item.itemId,
                                      ),
                                )
                              }
                            />
                            <span>
                              {item.name}
                              <small className="muted">
                                {" "}
                                · {item.lootSource}
                              </small>
                            </span>
                          </label>
                        ))}
                    </div>
                  </fieldset>
                  <p className="fine-print">
                    {catalog.clientBuild
                      ? `${gameLabels[game]} client build ${catalog.clientBuild}`
                      : `Source-reported loot; not verified in the ${gameLabels[game]} client.`}
                  </p>
                </>
              ) : (
                eventType === "raid" && (
                  <p className="raid-notice">
                    Soft reserves disabled: no reviewed catalog selected.
                  </p>
                )
              )}
            </section>
          </div>
        </fieldset>
        <Notice error={error} />
        <div className="raid-toolbar">
          <span className="muted">
            {initialEvent
              ? "Existing signups and Discord post are retained"
              : "Discord members only"}
          </span>
          {initialEvent && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={onCancel}
            >
              <X size={17} />
              Discard changes
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {initialEvent ? <Save size={17} /> : <Plus size={17} />}
            {busy
              ? initialEvent
                ? "Saving..."
                : "Creating..."
              : initialEvent
                ? "Save changes"
                : "Create event"}
          </button>
        </div>
      </form>
    </>
  );
}
export function RaidDetail({
  event,
  characters,
  initialNow,
  catalogs,
  history,
}: {
  event: EventView;
  characters: CharacterView[];
  initialNow: number;
  catalogs: CatalogView[];
  history: EventHistoryPage;
}): React.JSX.Element {
  const router = useRouter();
  const definition = eventTypeDefinitions[event.eventType];
  const mine = event.signups.find((signup) => signup.isMine);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const roster = summarizeEventRoster(
    event.signups,
    event.capacity,
    event.roleCaps,
    definition.combatRoles,
  );
  const accepted = roster.confirmed;
  const matching = characters.filter((character) =>
    characterCanJoin(character, event),
  );
  const initialCharacter =
    matching.find((character) => character.name === mine?.character.name) ??
    matching[0];
  const [characterId, setCharacterId] = useState(initialCharacter?.id ?? "");
  const [attendance, setAttendance] = useState<AttendanceChoice>(
    mine?.status === "absent" || mine?.status === "tentative"
      ? mine.status
      : "joining",
  );
  const selectedCharacter = matching.find(
    (character) => character.id === characterId,
  );
  const [specialization, setSpecialization] = useState<Specialization | "">(
    mine?.character.specialization ?? initialCharacter?.specialization ?? "",
  );
  const [role, setRole] = useState<RaidRole>(
    (mine?.role && mine.role !== "participant" ? mine.role : null) ??
      suggestedRole(initialCharacter?.specialization ?? null),
  );
  const clearsReserves = Boolean(
    mine?.reserves.length &&
    (mine.character.name !== selectedCharacter?.name ||
      mine.character.specialization !== specialization),
  );
  const now = useRaidClock(initialNow);
  const rosterOpen =
    event.status === "open" && new Date(event.signupClosesAt).getTime() > now;
  const canBuildRoster =
    event.isOrganizer &&
    definition.combatRoles &&
    !event.locked &&
    event.status !== "cancelled";
  async function mutate(
    body: unknown,
    confirmation: string,
    chooseReserves = false,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await postRaid(`/api/raids/${event.id}`, body);
      setSuccess(confirmation);
      if (chooseReserves && event.catalog && reserveQuota(event, role) > 0) {
        router.push(`/raids/${event.id}/reserves`);
        return true;
      }
      router.refresh();
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="raid-event-page">
      <div className="raid-toolbar">
        <Link className="text-link" href="/raids">
          <ArrowLeft size={16} />
          All events
        </Link>
        {event.isOrganizer && (
          <div className="raid-event-actions">
            {canBuildRoster && (
              <a className="button primary" href="#event-roster">
                <Users size={16} />
                Roster builder
              </a>
            )}
            {event.status === "open" && Date.parse(event.startsAt) > now && (
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setEditing(!editing)}
              >
                <Pencil size={16} />
                {editing ? "Close editor" : "Edit event"}
              </button>
            )}
            {rosterOpen && <SignupImport event={event} />}
          </div>
        )}
      </div>
      <header className="raid-event-hero raid-heading">
        <EventCover
          game={event.game}
          eventType={event.eventType}
          name={event.raidName}
          banner
        />
        <div className="raid-hero-topline">
          <p className="eyebrow">
            {gameLabels[event.game]}
            {event.realm ? ` \u00b7 ${event.realm}` : ""}
            <span className={`raid-faction ${event.faction.toLowerCase()}`}>
              {event.faction}
            </span>
            <span>
              {event.region} &middot; {event.ruleset}
            </span>
          </p>
          <span className={`raid-badge ${event.status}`}>{event.status}</span>
        </div>
        <div className="raid-hero-bottomline">
          <div
            className={`raid-hero-title${event.title.length > 75 ? " raid-hero-title-long" : ""}`}
          >
            <p className="raid-event-type">
              <EventTypeIcon eventType={event.eventType} size={18} />
              {definition.label}
            </p>
            <h1>{event.title}</h1>
          </div>
          {rosterOpen ? (
            <a className="button primary raid-hero-action" href="#my-signup">
              <Users size={18} />
              {mine ? "My signup" : "Join event"}
            </a>
          ) : (
            <span className="raid-hero-closed">
              <LockKeyhole size={16} />
              Signups closed
            </span>
          )}
        </div>
      </header>
      <div className="raid-summary raid-event-facts">
        <div>
          <CalendarDays size={21} />
          <div>
            <span>Starts</span>
            <strong>
              <time dateTime={event.startsAt}>{event.timeLabel}</time>
            </strong>
          </div>
        </div>
        <div>
          <Users size={21} />
          <div>
            <span>{event.capacity} places</span>
            <strong>
              {event.admission === "open"
                ? `${roster.signedUp.length} signed up \u00b7 ${accepted.length} confirmed`
                : `${accepted.length} confirmed \u00b7 ${roster.pending.length} pending`}
            </strong>
          </div>
        </div>
        <div>
          <Clock3 size={21} />
          <div>
            <span>Duration</span>
            <strong>{eventDurationLabel(event.startsAt, event.endsAt)}</strong>
          </div>
        </div>
        {event.eventType === "raid" && (
          <div>
            <Swords size={21} />
            <div>
              <span>Loot rules</span>
              <strong>
                {event.catalog
                  ? `${reservePolicyLabel(event)} \u00b7 ${event.allowDuplicates ? "Duplicates allowed" : "Unique items"} \u00b7 ${event.hardReserves.length} HR`
                  : "No soft reserves"}
              </strong>
            </div>
          </div>
        )}
      </div>
      {event.isOrganizer && (event.discordAvailable || event.discord) && (
        <section
          className="raid-discord-status"
          aria-label="Discord publication"
        >
          <MessageCircle size={17} aria-hidden="true" />
          <div>
            <p className="muted" role="status">
              {event.discord
                ? `${event.discord.status}${event.discord.inSync ? " · Roster synced" : " · Sync pending"}${event.discord.approved ? " · Website approved" : " · Pending website approval"}`
                : "Not posted"}
            </p>
            {event.discord?.lastError && (
              <p role="alert">
                {event.discord.lastError ===
                "discord_posting_permission_missing"
                  ? "The bot or organizer no longer has permission to post in this channel. Restore access, then retry delivery."
                  : event.discord.lastError}
              </p>
            )}
          </div>
          {event.discord?.url && (
            <a
              className="text-link"
              href={event.discord.url}
              target="_blank"
              rel="noreferrer"
            >
              Open Discord post
            </a>
          )}
          {event.game === "forever" &&
            event.discord?.visibility === "community" &&
            event.discord.approved && (
              <Link className="text-link" href={`/events/${event.id}`}>
                Public event preview
              </Link>
            )}
          {event.discordAvailable &&
            (!event.discord || event.discord.status === "failed") && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    { operation: "publish_discord" },
                    "Discord delivery queued.",
                  )
                }
              >
                <MessageCircle size={16} />
                {event.discord ? "Retry Discord delivery" : "Post to Discord"}
              </button>
            )}
        </section>
      )}
      <Notice error={error} success={success} />
      {editing && event.isOrganizer && event.status === "open" && (
        <section
          className="raid-event-editor"
          aria-label="Edit event"
          id="edit-event"
        >
          <CreateRaid
            catalogs={catalogs}
            destinations={[]}
            canSelectChannels={false}
            channelAccessError=""
            initialEvent={event}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </section>
      )}
      <div className="raid-columns raid-detail-layout">
        <section className="raid-event-content">
          <nav className="raid-section-nav" aria-label="Event sections">
            <a href="#event-details">Overview</a>
            <a href="#event-roster">
              {canBuildRoster ? "Roster builder" : "Roster"}
            </a>
            {event.eventType === "raid" && (
              <Link prefetch={false} href={`/raids/${event.id}/reserves`}>
                Soft reserves
              </Link>
            )}
          </nav>
          <section
            className="raid-event-overview"
            id="event-details"
            aria-labelledby="event-details-heading"
          >
            <h2 id="event-details-heading">Event details</h2>
            <div className="raid-activity-line">
              <MapPin size={18} />
              <div>
                <span>
                  {event.eventType === "questing"
                    ? "Quest / zone"
                    : "Activity / location"}
                </span>
                <strong>{event.raidName}</strong>
              </div>
            </div>
            {event.description && (
              <p className="raid-description">{event.description}</p>
            )}
          </section>
          <section
            className="raid-event-roster-section"
            id="event-roster"
            aria-labelledby="event-roster-heading"
          >
            <div className="raid-toolbar">
              <h2 id="event-roster-heading">
                {canBuildRoster ? "Roster builder" : "Roster"}
              </h2>
              <button
                className="icon-button"
                type="button"
                title="Refresh roster"
                aria-label="Refresh roster"
                disabled={busy}
                onClick={() => router.refresh()}
              >
                <RefreshCw size={17} />
              </button>
            </div>
            {definition.combatRoles && (
              <div className="raid-role-counts">
                {roster.groups.map((group) => (
                  <span key={group.role}>
                    <RoleIcon role={group.role} />
                    {group.role}: {group.signups.length}/{group.limit}
                  </span>
                ))}
              </div>
            )}
            <EventRoster
              key={event.version}
              event={event}
              roster={roster}
              open={rosterOpen}
              busy={busy}
              onAdmit={(signupId, status, partyIndex) =>
                void mutate(
                  {
                    operation: "manage",
                    input: {
                      action: "admit",
                      version: event.version,
                      signupId,
                      status,
                      ...(partyIndex === undefined ? {} : { partyIndex }),
                    },
                  },
                  "Roster updated.",
                )
              }
              onSaveLayout={(assignments) =>
                mutate(
                  {
                    operation: "manage",
                    input: {
                      action: "set_roster_layout",
                      version: event.version,
                      assignments,
                    },
                  },
                  "Party layout saved.",
                )
              }
            />
          </section>
          {event.isOrganizer && (
            <details
              className="raid-organizer raid-management"
              open={event.locked || cancel}
            >
              <summary>
                <Settings2 size={18} />
                Manage event
                <ChevronDown size={17} />
              </summary>
              <div className="raid-management-controls">
                {event.status === "open" &&
                  Date.parse(event.startsAt) > now && (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(true);
                        requestAnimationFrame(() =>
                          document
                            .getElementById("edit-event")
                            ?.scrollIntoView({
                              block: "start",
                              behavior: "smooth",
                            }),
                        );
                      }}
                    >
                      <Pencil size={16} />
                      Edit event settings
                    </button>
                  )}
                {event.status === "open" && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          event.eventType === "raid"
                            ? "Lock the roster and soft reserves? This creates an immutable loot snapshot."
                            : "Lock the roster? This creates an immutable participant snapshot.",
                        )
                      )
                        void mutate(
                          {
                            operation: "manage",
                            input: { action: "lock", version: event.version },
                          },
                          event.eventType === "raid"
                            ? "Roster and loot snapshot locked."
                            : "Participant roster locked.",
                        );
                    }}
                  >
                    <LockKeyhole size={16} />
                    {event.eventType === "raid"
                      ? "Lock roster & reserves"
                      : "Lock roster"}
                  </button>
                )}
                {event.locked && (
                  <a
                    className="button secondary"
                    href={`/api/raids/${event.id}/export`}
                  >
                    <Download size={16} />
                    Download locked JSON
                  </a>
                )}
                {event.status !== "cancelled" && (
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() => setCancel(!cancel)}
                  >
                    <X size={16} />
                    Cancel event
                  </button>
                )}
                {cancel && (
                  <form
                    className="raid-form"
                    onSubmit={(submitEvent) => {
                      const data = values(submitEvent);
                      void mutate(
                        {
                          operation: "manage",
                          input: {
                            action: "cancel",
                            version: event.version,
                            reason: text(data, "reason"),
                          },
                        },
                        "Event cancelled.",
                      );
                    }}
                  >
                    <label>
                      Cancellation reason
                      <input
                        name="reason"
                        required
                        minLength={3}
                        maxLength={500}
                      />
                    </label>
                    <button disabled={busy} className="button danger">
                      <X size={16} />
                      Confirm cancellation
                    </button>
                  </form>
                )}
              </div>
            </details>
          )}
        </section>
        <aside
          className="raid-signup-panel"
          id="my-signup"
          tabIndex={-1}
          aria-labelledby="my-signup-heading"
        >
          <div className="raid-signup-heading">
            <Users size={20} />
            <h2 id="my-signup-heading">My signup</h2>
          </div>
          {mine && (
            <p className={`raid-badge ${mine.status}`}>
              {signupStatusLabel(mine.status)}
            </p>
          )}
          {mine?.needsAcknowledgement && event.status === "open" && (
            <form
              className="raid-form raid-policy-review"
              onSubmit={(submitEvent) => {
                const data = values(submitEvent);
                void mutate(
                  {
                    operation: "acknowledge",
                    acknowledge: data.has("acknowledgeUpdatedRules"),
                    policyChecksum: event.policyChecksum,
                  },
                  "Event rules acknowledged. Your signup is unchanged.",
                );
              }}
            >
              <p className="raid-notice" role="status">
                {mine.imported
                  ? "Your signup was imported. Review the current event details and loot rules before confirming them."
                  : "The organizer updated this event. Review the current details and loot rules; your signup and reserves are retained."}
              </p>
              <label className="raid-check">
                <input
                  type="checkbox"
                  name="acknowledgeUpdatedRules"
                  required
                  disabled={busy}
                />
                {mine.imported
                  ? "I have reviewed and accept the current event and loot rules."
                  : "I have reviewed and accept the updated event and loot rules."}
              </label>
              <button className="button secondary" disabled={busy}>
                <Save size={16} />
                {mine.imported
                  ? "Acknowledge event rules"
                  : "Acknowledge updated rules"}
              </button>
            </form>
          )}
          {event.admission === "open" && (
            <p className="fine-print">
              Signup is immediate. The organizer selects the roster later;
              signing up does not guarantee a place.
            </p>
          )}
          <p className="raid-signup-deadline">
            Signups close{" "}
            <time dateTime={event.signupClosesAt}>
              {event.signupCloseLabel}
            </time>
          </p>
          {rosterOpen ? (
            matching.length ? (
              <form
                className="raid-form"
                onSubmit={(submitEvent) => {
                  const data = values(submitEvent);
                  void mutate(
                    {
                      operation: "signup",
                      input: {
                        acknowledge: data.has("acknowledge"),
                        policyChecksum: event.policyChecksum,
                        characterId: text(data, "characterId"),
                        specialization: definition.combatRoles
                          ? text(data, "specialization")
                          : (selectedCharacter?.specialization ?? null),
                        role: definition.combatRoles
                          ? text(data, "role")
                          : "participant",
                        attendance,
                      },
                    },
                    attendance !== "joining"
                      ? `${signupStatusLabel(attendance)} response saved. Your seat and soft reserves are released.`
                      : clearsReserves
                        ? "Signup saved. Select soft reserves again for your new character or specialization."
                        : event.catalog && reserveQuota(event, role) > 0
                          ? "Signup saved. Choose your soft reserves."
                          : "Signup saved.",
                    attendance === "joining",
                  );
                }}
              >
                <fieldset className="raid-attendance-picker" disabled={busy}>
                  <legend>Availability</legend>
                  <div className="raid-attendance-options">
                    {attendanceChoices.map((choice) => {
                      const Icon =
                        choice === "joining"
                          ? Users
                          : choice === "tentative"
                            ? Clock3
                            : UserMinus;
                      return (
                        <label
                          key={choice}
                          className={attendance === choice ? "is-selected" : ""}
                        >
                          <input
                            type="radio"
                            name="attendance"
                            value={choice}
                            checked={attendance === choice}
                            onChange={() => setAttendance(choice)}
                          />
                          <Icon size={17} aria-hidden="true" />
                          <span>
                            {choice === "joining"
                              ? "Joining"
                              : signupStatusLabel(choice)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <details
                  className="raid-signup-character"
                  open={
                    matching.length > 1 ||
                    (definition.combatRoles && !specialization)
                  }
                >
                  <summary aria-label="Change character and specialization">
                    {selectedCharacter && (
                      <CharacterPortrait
                        className={selectedCharacter.className}
                        specialization={
                          specialization || selectedCharacter.specialization
                        }
                        compact
                      />
                    )}
                    <span>
                      <strong
                        style={{
                          color: selectedCharacter
                            ? classArtwork[selectedCharacter.className].color
                            : undefined,
                        }}
                      >
                        {selectedCharacter?.name ?? "Select character"}
                      </strong>
                      <small>
                        {selectedCharacter
                          ? `${specialization || selectedCharacter.className}${definition.combatRoles ? ` \u00b7 ${role === "damage" ? "Damage" : role === "healer" ? "Healer" : "Tank"}` : ""}`
                          : ""}
                      </small>
                    </span>
                    <ChevronDown size={18} />
                  </summary>
                  <div className="raid-signup-choices">
                    <CharacterPicker
                      characters={matching}
                      value={characterId}
                      disabled={busy}
                      onChange={(id) => {
                        const character = matching.find(
                          (entry) => entry.id === id,
                        );
                        setCharacterId(id);
                        setSpecialization(character?.specialization ?? "");
                        setRole(
                          suggestedRole(character?.specialization ?? null),
                        );
                      }}
                    />
                    {selectedCharacter && definition.combatRoles && (
                      <SpecializationPicker
                        className={selectedCharacter.className}
                        value={specialization}
                        disabled={busy}
                        onChange={(spec) => {
                          setSpecialization(spec);
                          setRole(suggestedRole(spec));
                        }}
                      />
                    )}
                  </div>
                </details>
                {definition.combatRoles && (
                  <RolePicker value={role} disabled={busy} onChange={setRole} />
                )}
                {clearsReserves && (
                  <p className="raid-notice" role="status">
                    Changing character or specialization clears your soft
                    reserves.
                  </p>
                )}
                {attendance !== "joining" && (
                  <p className="fine-print">
                    No confirmed seat or soft reserves are held. Choose Joining
                    to sign up again while signups are open.
                  </p>
                )}
                <label className="raid-check">
                  <input type="checkbox" name="acknowledge" required />I accept{" "}
                  {event.eventType === "raid"
                    ? "this event's roster and loot rules, including the hard reserves."
                    : "this event's participation rules."}
                  {event.discord?.visibility === "community" &&
                    ` My character name, specialization, role, availability and reserves will be visible in ${event.discord.label}.`}
                </label>
                <button disabled={busy} className="button primary">
                  <Users size={16} />
                  {busy
                    ? "Saving..."
                    : attendance !== "joining"
                      ? `Save ${signupStatusLabel(attendance)}`
                      : mine
                        ? "Update signup"
                        : "Join roster"}
                </button>
              </form>
            ) : (
              <p>
                <Link className="text-link" href="/account/characters">
                  Add a matching character
                  <Plus size={16} />
                </Link>
              </p>
            )
          ) : (
            <p className="muted">Signups closed.</p>
          )}
          {mine && event.status === "open" && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void mutate({ operation: "withdraw" }, "Signup withdrawn.")
              }
            >
              <UserMinus size={16} />
              Withdraw
            </button>
          )}
          {event.eventType === "raid" && (
            <section className="raid-loot" id="soft-reserves">
              <h2>Soft reserves</h2>
              <p className="fine-print">Close: {event.reservesCloseLabel}</p>
              {(event.status !== "open" ||
                Date.parse(event.reservesCloseAt) <= now) && (
                <p className="muted">Soft reserves closed.</p>
              )}
              {!event.catalog || !event.reserveLimit ? (
                <p className="muted">Soft reserves disabled for this event.</p>
              ) : (
                <>
                  <p className="raid-sr-count">
                    {mine?.reserves.length ?? 0}/
                    {reserveQuota(event, mine?.role ?? "participant")} selected
                  </p>
                  <Link
                    className="button secondary"
                    prefetch={false}
                    href={`/raids/${event.id}/reserves`}
                  >
                    <ScrollText size={17} />
                    {mine ? "Choose soft reserves" : "Browse raid loot"}
                  </Link>
                </>
              )}
              {event.hardReserves.length > 0 && (
                <p className="raid-notice">
                  Hard reserves:{" "}
                  {event.hardReserves
                    .map(
                      (id) =>
                        event.catalog?.items.find((item) => item.itemId === id)
                          ?.name ?? id,
                    )
                    .join(", ")}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
      <EventChangeHistory
        key={`${event.id}:${event.version}`}
        eventId={event.id}
        initial={history}
      />
      <div className="raid-mobile-signup" aria-label="Event participation">
        <div>
          <strong>
            {mine
              ? signupStatusLabel(mine.status)
              : `${roster.available} unfilled places`}
          </strong>
          <span>
            {definition.label} &middot; {event.capacity} places
          </span>
        </div>
        {rosterOpen ? (
          <a className="button primary" href="#my-signup">
            <Users size={17} />
            {mine
              ? "View signup"
              : matching.length
                ? "Sign up"
                : "Add character"}
          </a>
        ) : (
          <span className="raid-mobile-closed">
            <LockKeyhole size={16} />
            Signups closed
          </span>
        )}
      </div>
    </div>
  );
}
