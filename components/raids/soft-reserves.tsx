"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Gem,
  LockKeyhole,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { participatingStatuses, type EventView } from "@/lib/raids/contracts";
import { reservePolicyLabel, reserveQuota } from "@/lib/raids/loot-policy";
import { EventCover } from "./event-cover";
import { ItemInspection, RaidItemIcon } from "./item-inspection";
import { CharacterPortrait } from "./character-picker";
import { postRaid, useRaidClock } from "./client-data";

type LootFilter = "all" | "eligible" | "selected" | "hr";
export function SoftReserves({
  event,
  initialNow,
}: {
  event: EventView;
  initialNow: number;
}): React.JSX.Element {
  const router = useRouter();
  const mine = event.signups.find((signup) => signup.isMine);
  const limit = reserveQuota(event, mine?.role ?? "participant");
  const [items, setItems] = useState<number[]>(mine?.reserves ?? []);
  const [baseline, setBaseline] = useState<number[]>(mine?.reserves ?? []);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [filter, setFilter] = useState<LootFilter>("all");
  const [view, setView] = useState<"loot" | "reservations">("loot");
  const [sort, setSort] = useState<"boss" | "name" | "competition">("boss");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const now = useRaidClock(initialNow);
  const reservesOpen =
    event.status === "open" && Date.parse(event.reservesCloseAt) > now;
  const dirty =
    JSON.stringify([...items].sort((a, b) => a - b)) !==
    JSON.stringify([...baseline].sort((a, b) => a - b));
  const canChoose =
    reservesOpen &&
    mine !== undefined &&
    participatingStatuses.some((status) => status === mine.status) &&
    limit > 0 &&
    !mine.needsAcknowledgement;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function reserve(id: number, direction: 1 | -1): void {
    if (!canChoose || busy) return;
    setSaved(false);
    if (direction === 1)
      setItems((current) =>
        current.length >= limit ||
        (!event.allowDuplicates && current.includes(id))
          ? current
          : [...current, id],
      );
    else
      setItems((current) => {
        const next = [...current];
        const index = next.indexOf(id);
        if (index >= 0) next.splice(index, 1);
        return next;
      });
  }
  async function save(): Promise<void> {
    if (busy || !canChoose) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await postRaid(`/api/raids/${event.id}`, {
        operation: "reserves",
        input: { itemIds: items },
      });
      setBaseline([...items]);
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Reserves could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const all = event.catalog?.items ?? [];
  const reservationCounts = new Map<number, number>();
  for (const signup of event.signups)
    for (const id of new Set(signup.reserves))
      reservationCounts.set(id, (reservationCounts.get(id) ?? 0) + 1);
  const eligible = (id: number): boolean =>
    Boolean(
      mine &&
      all
        .find((item) => item.itemId === id)
        ?.classes.includes(mine.character.className) &&
      !event.hardReserves.includes(id),
    );
  const shown = all
    .filter(
      (item) =>
        (!search ||
          `${item.name} ${item.lootSource}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())) &&
        (!source || item.lootSource === source) &&
        (filter === "all" ||
          (filter === "eligible" && eligible(item.itemId)) ||
          (filter === "selected" && items.includes(item.itemId)) ||
          (filter === "hr" && event.hardReserves.includes(item.itemId))),
    )
    .sort(
      (a, b) =>
        (sort === "competition"
          ? (reservationCounts.get(a.itemId) ?? 0) -
            (reservationCounts.get(b.itemId) ?? 0)
          : sort === "boss"
            ? a.lootSource.localeCompare(b.lootSource)
            : 0) || a.name.localeCompare(b.name),
    );
  const pageCount = Math.max(1, Math.ceil(shown.length / 24));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <div className="raid-reserves-page">
      <a
        className="text-link"
        href={`/raids/${event.id}`}
        onClick={(click) => {
          if (dirty && !confirm("Discard unsaved soft-reserve changes?"))
            click.preventDefault();
        }}
      >
        <ArrowLeft size={16} /> Back to event
      </a>
      <header className="raid-reserves-heading">
        <EventCover
          game={event.game}
          eventType={event.eventType}
          name={event.raidName}
        />
        <div>
          <span>{event.raidName}</span>
          <h1>Soft reserves</h1>
          <p>{event.title}</p>
        </div>
      </header>
      <div className="raid-reserves-policy">
        <span>
          <Gem size={17} />
          {reservePolicyLabel(event)}
        </span>
        <span>
          {event.allowDuplicates
            ? "Duplicate reserves allowed"
            : "Unique items"}
        </span>
        <span>
          <LockKeyhole size={16} />
          {event.hardReserves.length} HR
        </span>
        <time dateTime={event.reservesCloseAt}>
          Closes {event.reservesCloseLabel}
        </time>
      </div>
      <div
        className="raid-reserves-tabs"
        role="group"
        aria-label="Reserves view"
      >
        <button
          type="button"
          aria-pressed={view === "loot"}
          onClick={() => setView("loot")}
        >
          <Gem size={18} /> Choose loot
        </button>
        <button
          type="button"
          aria-pressed={view === "reservations"}
          onClick={() => setView("reservations")}
        >
          <Users size={18} /> Reservations{" "}
          <span>
            {
              event.signups.filter((signup) => signup.reserves.length > 0)
                .length
            }
          </span>
        </button>
      </div>
      {!event.catalog ? (
        <p className="raid-notice">
          Soft reserves disabled for this event. No reviewed loot catalog is
          attached.
        </p>
      ) : (
        <div className="raid-reserves-layout">
          <section
            className="raid-loot-browser"
            aria-label={view === "loot" ? "Raid loot" : "Player reservations"}
          >
            {view === "reservations" ? (
              <>
                <h2>Player reservations</h2>
                <ul className="raid-player-reservations">
                  {event.signups
                    .filter((signup) => signup.reserves.length > 0)
                    .map((signup) => (
                      <li key={signup.id}>
                        <div className="raid-reserve-character">
                          <CharacterPortrait
                            className={signup.character.className}
                            specialization={signup.character.specialization}
                          />
                          <span>
                            <strong>
                              {signup.character.name}
                              {signup.isMine ? " (you)" : ""}
                            </strong>
                            <small>
                              {signup.character.specialization} ·{" "}
                              {signup.status === "accepted"
                                ? "Confirmed"
                                : signup.status === "registered"
                                  ? "Signed up"
                                  : signup.status === "bench"
                                    ? "Bench"
                                    : "Awaiting approval"}
                            </small>
                          </span>
                          <b>{signup.reserves.length} SR</b>
                        </div>
                        <ul>
                          {[...new Set(signup.reserves)].map((id) => {
                            const item = all.find((item) => item.itemId === id);
                            const count = signup.reserves.filter(
                              (reserve) => reserve === id,
                            ).length;
                            return item ? (
                              <li key={id}>
                                <ItemInspection item={item} game={event.game} />
                                {count > 1 && <b>×{count}</b>}
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </li>
                    ))}
                </ul>
                {!event.signups.some(
                  (signup) => signup.reserves.length > 0,
                ) && (
                  <p className="raid-loot-empty">No saved reservations yet.</p>
                )}
              </>
            ) : (
              <>
                <div className="raid-loot-toolbar">
                  <label>
                    <Search size={17} />
                    <input
                      type="search"
                      aria-label="Search loot"
                      placeholder="Search items or bosses"
                      value={search}
                      onChange={(change) => {
                        setSearch(change.target.value);
                        setPage(0);
                      }}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Boss or source</span>
                    <select
                      aria-label="Boss or source"
                      value={source}
                      onChange={(change) => {
                        setSource(change.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">All bosses & sources</option>
                      {[...new Set(all.map((item) => item.lootSource))]
                        .sort()
                        .map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                    </select>
                  </label>
                </div>
                <div
                  className="raid-loot-filters"
                  role="group"
                  aria-label="Loot view"
                >
                  {(
                    [
                      ["all", "All loot"],
                      ["eligible", "Available to me"],
                      ["selected", "My selections"],
                      ["hr", "Hard reserves"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value);
                        setPage(0);
                      }}
                    >
                      {value === "hr" ? (
                        <Shield size={15} />
                      ) : value === "selected" ? (
                        <Check size={15} />
                      ) : (
                        <Gem size={15} />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
                <div className="raid-loot-results">
                  <span>{shown.length} items</span>
                  <label>
                    Sort{" "}
                    <select
                      aria-label="Sort loot"
                      value={sort}
                      onChange={(change) => {
                        setSort(change.target.value as typeof sort);
                        setPage(0);
                      }}
                    >
                      <option value="boss">Boss & source</option>
                      <option value="name">Item name</option>
                      <option value="competition">Fewest reservers</option>
                    </select>
                  </label>
                </div>
                <ul className="raid-loot-grid">
                  {shown
                    .slice(currentPage * 24, (currentPage + 1) * 24)
                    .map((item) => {
                      const count = items.filter(
                        (id) => id === item.itemId,
                      ).length;
                      const hr = event.hardReserves.includes(item.itemId);
                      const restricted = Boolean(
                        mine &&
                        !item.classes.includes(mine.character.className),
                      );
                      return (
                        <li
                          key={item.itemId}
                          className={`${count ? "selected" : ""} ${hr ? "hard-reserved" : ""}`}
                        >
                          <ItemInspection item={item} game={event.game} />
                          <details className="raid-item-competition">
                            <summary>
                              <Users size={13} />
                              {reservationCounts.get(item.itemId) ?? 0}{" "}
                              reservers
                            </summary>
                            <ul>
                              {event.signups
                                .filter((signup) =>
                                  signup.reserves.includes(item.itemId),
                                )
                                .map((signup) => (
                                  <li key={signup.id}>
                                    <CharacterPortrait
                                      className={signup.character.className}
                                      specialization={
                                        signup.character.specialization
                                      }
                                    />
                                    <span>
                                      {signup.character.name}
                                      {signup.isMine ? " (you)" : ""}
                                    </span>
                                    <small>
                                      {
                                        signup.reserves.filter(
                                          (id) => id === item.itemId,
                                        ).length
                                      }{" "}
                                      SR
                                    </small>
                                  </li>
                                ))}
                            </ul>
                          </details>
                          <div className="raid-loot-item-bottom">
                            <span>
                              {hr ? (
                                <>
                                  <Shield size={14} />
                                  Hard reserved
                                </>
                              ) : restricted ? (
                                "Class restricted"
                              ) : count ? (
                                `${count} selected`
                              ) : item.details?.binding === "equip" ? (
                                "Bind on equip"
                              ) : (
                                ""
                              )}
                            </span>
                            <div className="raid-item-actions">
                              <button
                                className="icon-button"
                                type="button"
                                title={`Remove ${item.name}`}
                                aria-label={`Remove ${item.name}`}
                                disabled={!count || !canChoose || busy}
                                onClick={() => reserve(item.itemId, -1)}
                              >
                                <Minus size={15} />
                              </button>
                              <span>{count}</span>
                              <button
                                className="icon-button"
                                type="button"
                                title={`Reserve ${item.name}`}
                                aria-label={`Reserve ${item.name}`}
                                disabled={
                                  !canChoose ||
                                  !eligible(item.itemId) ||
                                  busy ||
                                  items.length >= limit ||
                                  (!event.allowDuplicates && count > 0)
                                }
                                onClick={() => reserve(item.itemId, 1)}
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
                {pageCount > 1 && (
                  <nav className="raid-loot-pagination" aria-label="Loot pages">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Previous loot page"
                      title="Previous loot page"
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span aria-live="polite">
                      {currentPage + 1} / {pageCount}
                    </span>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Next loot page"
                      title="Next loot page"
                      disabled={currentPage === pageCount - 1}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </nav>
                )}
                {!shown.length && (
                  <div className="raid-loot-empty">
                    <Gem size={30} />
                    <h2>No matching loot</h2>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        setFilter("all");
                        setSearch("");
                        setSource("");
                        setPage(0);
                      }}
                    >
                      <RotateCcw size={16} /> Reset filters
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
          <aside
            className="raid-reserve-basket"
            aria-label="Your soft reserves"
          >
            <h2>Your reserves</h2>
            {mine && (
              <div className="raid-reserve-character">
                <CharacterPortrait
                  className={mine.character.className}
                  specialization={mine.character.specialization}
                />
                <span>
                  <strong>{mine.character.name}</strong>
                  <small>
                    {mine.character.specialization} ·{" "}
                    {mine.role === "damage" ? "DPS" : mine.role}
                  </small>
                </span>
              </div>
            )}
            <p className="raid-sr-count">
              {items.length}/{limit} selected
            </p>
            {canChoose && (
              <p className="raid-reserve-remaining">
                {Math.max(0, limit - items.length)} remaining
              </p>
            )}
            <div
              className="raid-reserve-progress"
              role="meter"
              aria-label="Reserve allowance"
              aria-valuemin={0}
              aria-valuemax={Math.max(1, limit)}
              aria-valuenow={items.length}
            >
              <span
                style={{
                  width: `${limit ? Math.min(100, (items.length / limit) * 100) : 0}%`,
                }}
              />
            </div>
            {!mine ? (
              <p className="raid-notice">
                Join the roster to choose your soft reserves.{" "}
                <Link href={`/raids/${event.id}#my-signup`}>Sign up</Link>
              </p>
            ) : !participatingStatuses.some(
                (status) => status === mine.status,
              ) ? (
              <p className="raid-notice">
                Change your response to Joining to choose soft reserves.{" "}
                <Link href={`/raids/${event.id}#my-signup`}>
                  Update availability
                </Link>
              </p>
            ) : !limit ? (
              <p className="raid-notice">
                This role has no soft-reserve allowance.
              </p>
            ) : mine.needsAcknowledgement ? (
              <p className="raid-notice">
                The organizer changed the loot rules.{" "}
                <Link href={`/raids/${event.id}#my-signup`}>
                  Review updated rules
                </Link>
              </p>
            ) : null}
            <ul className="raid-reserve-selected">
              {[...new Set(items)].map((id) => {
                const item = all.find((item) => item.itemId === id);
                if (!item) return null;
                const count = items.filter(
                  (selected) => selected === id,
                ).length;
                return (
                  <li key={id}>
                    <RaidItemIcon item={item} game={event.game} />
                    <span>
                      <strong
                        className={`raid-quality-${item.details?.quality ?? 1}`}
                      >
                        {item.name}
                      </strong>
                      {count > 1 && <small>×{count}</small>}
                    </span>
                    <button
                      className="icon-button"
                      type="button"
                      title={`Remove selected ${item.name}`}
                      aria-label={`Remove selected ${item.name}`}
                      disabled={!canChoose || busy}
                      onClick={() => reserve(id, -1)}
                    >
                      <X size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {!items.length && <p className="muted">No items selected.</p>}
            {error && (
              <p className="raid-notice error" role="alert">
                {error}
              </p>
            )}
            {saved && (
              <p className="raid-notice" role="status">
                Soft reserves saved.
              </p>
            )}
            {!reservesOpen && (
              <p className="raid-notice">Soft reserves closed.</p>
            )}
            <div className="raid-reserve-save">
              <span aria-live="polite">
                {dirty ? "Unsaved changes" : "Saved selections"}
              </span>
              <button
                className="button primary"
                type="button"
                disabled={busy || !canChoose || !dirty}
                onClick={() => void save()}
              >
                <Save size={17} />
                {busy ? "Saving..." : "Save reserves"}
              </button>
            </div>
            {dirty && (
              <button
                className="button secondary raid-reserve-discard"
                type="button"
                disabled={busy}
                onClick={() => {
                  setItems([...baseline]);
                  setError("");
                  setSaved(false);
                }}
              >
                <RotateCcw size={16} /> Discard changes
              </button>
            )}
          </aside>
        </div>
      )}
      {event.catalog && (
        <div className="raid-reserve-mobile-save">
          <span>
            <strong>
              {items.length}/{limit} SR
            </strong>
            <small>{dirty ? "Unsaved changes" : "Saved selections"}</small>
          </span>
          <button
            className="button primary"
            type="button"
            disabled={busy || !canChoose || !dirty}
            onClick={() => void save()}
          >
            <Save size={17} />
            {busy ? "Saving..." : "Save reserves"}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
