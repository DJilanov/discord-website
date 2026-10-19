"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  Check,
  GripVertical,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  UserMinus,
  Users,
} from "lucide-react";
import {
  participatingStatuses,
  type EventView,
  type SignupView,
} from "@/lib/raids/contracts";
import {
  analyzeRosterComposition,
  type PartyCompositionReport,
  type RosterSuggestion,
} from "@/lib/raids/composition";
import type { EventRosterSummary } from "@/lib/raids/event-preview";
import { signupStatusLabel } from "@/lib/raids/event-preview";
import { eventTypeDefinitions } from "@/lib/raids/event-types";
import { classArtwork } from "@/lib/raids/presentation";
import {
  buildRosterParties,
  rosterAssignments,
  sameRosterLayout,
  type RosterAssignment,
  type RosterParty,
} from "@/lib/raids/roster-layout";
import { CharacterPortrait, RoleIcon } from "./character-picker";

interface RosterStyle extends CSSProperties {
  "--raid-class-color"?: string;
}

interface EventRosterProps {
  event: EventView;
  roster: EventRosterSummary;
  open: boolean;
  busy: boolean;
  onAdmit: (
    signupId: string,
    status: "accepted" | "bench",
    partyIndex?: number,
  ) => void;
  onSaveLayout: (assignments: RosterAssignment[]) => Promise<boolean>;
}

type PartyIdMap = Record<string, string[]>;

function partyKey(index: number): string {
  return `party-${index}`;
}

function idsFromParties(parties: readonly RosterParty[]): PartyIdMap {
  return Object.fromEntries(
    parties.map((party) => [
      partyKey(party.index),
      party.signups.map((signup) => signup.id),
    ]),
  );
}

function partiesFromIds(
  ids: PartyIdMap,
  templates: readonly RosterParty[],
  signups: ReadonlyMap<string, SignupView>,
): RosterParty[] {
  return templates.map((party) => ({
    ...party,
    signups: (ids[partyKey(party.index)] ?? [])
      .map((id) => signups.get(id))
      .filter((signup): signup is SignupView => signup !== undefined),
  }));
}

function findParty(ids: PartyIdMap, signupId: string): string | null {
  return Object.keys(ids).find((key) => ids[key]?.includes(signupId)) ?? null;
}

function rosterIdentity(
  signup: SignupView,
  event: EventView,
): React.JSX.Element {
  return (
    <div className="raid-roster-identity">
      <CharacterPortrait
        className={signup.character.className}
        specialization={signup.character.specialization}
      />
      <div>
        <strong
          style={{ color: classArtwork[signup.character.className].color }}
        >
          {signup.character.name}
          {signup.isMine ? " (you)" : ""}
        </strong>
        <span>
          {signup.character.specialization
            ? `${signup.character.specialization} · `
            : ""}
          {signup.character.className}
        </span>
        <span className="raid-role-label">
          <RoleIcon role={signup.role} />
          {signup.role === "participant" ? "Participant" : signup.role}
        </span>
        {signup.needsAcknowledgement && (
          <small className="raid-policy-pending">
            {signup.imported
              ? "Imported signup · rules need review"
              : "Updated rules need review"}
          </small>
        )}
        {signup.note && (
          <details className="raid-imported-note">
            <summary>Signup note</summary>
            <p>{signup.note}</p>
          </details>
        )}
        {event.catalog && (
          <small>
            {signup.reserves
              .map(
                (id) =>
                  event.catalog?.items.find((item) => item.itemId === id)?.name,
              )
              .filter(Boolean)
              .join(", ") || "No soft reserves"}
          </small>
        )}
      </div>
    </div>
  );
}

function SortableRosterEntry({
  signup,
  event,
  party,
  parties,
  editable,
  disabled,
  canAdmit,
  busy,
  onMove,
  onBench,
}: {
  signup: SignupView;
  event: EventView;
  party: RosterParty;
  parties: readonly RosterParty[];
  editable: boolean;
  disabled: boolean;
  canAdmit: boolean;
  busy: boolean;
  onMove: (signupId: string, partyIndex: number) => void;
  onBench: (signupId: string) => void;
}): React.JSX.Element {
  const { ref, handleRef, isDragSource } = useSortable({
    id: signup.id,
    index: party.signups.findIndex((candidate) => candidate.id === signup.id),
    group: partyKey(party.index),
    type: "roster-signup",
    disabled: !editable || disabled,
  });

  return (
    <li
      ref={ref}
      className={`raid-party-player${isDragSource ? " is-dragging" : ""}`}
      style={
        {
          "--raid-class-color": classArtwork[signup.character.className].color,
        } as RosterStyle
      }
    >
      {editable && (
        <button
          ref={handleRef}
          type="button"
          className="raid-drag-handle"
          aria-label={`Move ${signup.character.name}`}
          title="Drag to move or reorder"
          disabled={busy}
        >
          <GripVertical size={18} />
        </button>
      )}
      <div className="raid-party-player-main">
        {rosterIdentity(signup, event)}
      </div>
      {editable && (
        <div className="raid-party-player-controls">
          <label>
            <span className="sr-only">Move {signup.character.name}</span>
            <select
              className="raid-move-select"
              value={party.index}
              disabled={busy}
              onChange={(change) =>
                onMove(signup.id, Number(change.currentTarget.value))
              }
              aria-label={`Move ${signup.character.name} to group`}
            >
              {parties.map((candidate) => (
                <option
                  key={candidate.index}
                  value={candidate.index}
                  disabled={
                    candidate.index !== party.index &&
                    candidate.signups.length >= candidate.capacity
                  }
                >
                  Group {candidate.index + 1}
                </option>
              ))}
            </select>
          </label>
          {canAdmit && (
            <button
              className="icon-button"
              type="button"
              disabled={busy}
              title="Move to bench"
              aria-label={`Bench ${signup.character.name}`}
              onClick={() => onBench(signup.id)}
            >
              <UserMinus size={16} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function EffectCoverage({
  report,
}: {
  report: PartyCompositionReport;
}): React.JSX.Element {
  if (!report.effects.length)
    return (
      <p className="raid-party-no-effects">
        No tracked party support effects yet.
      </p>
    );

  return (
    <ul className="raid-party-effects" aria-label="Party support effects">
      {report.effects.map((effect) => {
        const warning = effect.conflict
          ? "Overlapping effect"
          : effect.duplicate
            ? "Duplicate provider"
            : effect.rule.state === "provisional"
              ? "Verify in Forever"
              : effect.rule.state === "conditional"
                ? "Talent or setup required"
                : "Available";
        return (
          <li
            key={effect.rule.id}
            className={`raid-effect ${effect.rule.state}${effect.conflict || effect.duplicate ? " warning" : ""}`}
            title={`${effect.rule.description} ${effect.rule.requirement}.`}
          >
            <Image
              src={effect.rule.icon}
              alt=""
              width={30}
              height={30}
              unoptimized
            />
            <span>
              <strong>{effect.rule.name}</strong>
              <small>
                {warning} · {effect.beneficiaryCount} benefit
              </small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PartyColumn({
  party,
  event,
  report,
  allParties,
  editable,
  canAdmit,
  busy,
  onMove,
  onBench,
}: {
  party: RosterParty;
  event: EventView;
  report: PartyCompositionReport;
  allParties: readonly RosterParty[];
  editable: boolean;
  canAdmit: boolean;
  busy: boolean;
  onMove: (signupId: string, partyIndex: number) => void;
  onBench: (signupId: string) => void;
}): React.JSX.Element {
  const { ref, isDropTarget } = useDroppable({
    id: partyKey(party.index),
    type: "roster-party",
    accept: "roster-signup",
    disabled: !editable || busy || party.signups.length >= party.capacity,
  });
  const openPlaces = Math.max(0, party.capacity - party.signups.length);

  return (
    <section
      ref={ref}
      className={`raid-party${isDropTarget ? " is-drop-target" : ""}`}
      aria-label={`Group ${party.index + 1}`}
    >
      <header className="raid-party-heading">
        <div>
          <span>Party</span>
          <h4>Group {party.index + 1}</h4>
        </div>
        <strong>
          {party.signups.length}/{party.capacity}
        </strong>
      </header>
      <ol className="raid-party-list">
        {party.signups.map((signup) => (
          <SortableRosterEntry
            key={signup.id}
            signup={signup}
            event={event}
            party={party}
            parties={allParties}
            editable={editable}
            disabled={busy}
            canAdmit={canAdmit}
            busy={busy}
            onMove={onMove}
            onBench={onBench}
          />
        ))}
        {Array.from({ length: openPlaces }, (_, index) => (
          <li
            aria-label="Open party slot"
            className="raid-party-empty"
            key={`empty-${index}`}
          >
            <Users size={16} />
            <span>Open party slot</span>
          </li>
        ))}
      </ol>
      <div className="raid-party-support">
        <h5>Party effects</h5>
        <EffectCoverage report={report} />
      </div>
    </section>
  );
}

function CandidateSuggestion({
  suggestion,
  busy,
  onAccept,
}: {
  suggestion: RosterSuggestion;
  busy: boolean;
  onAccept: (signupId: string, partyIndex: number) => void;
}): React.JSX.Element {
  const signupId = suggestion.signupId;
  return (
    <li>
      <CharacterPortrait
        className={suggestion.className}
        specialization={suggestion.specialization}
      />
      <div>
        <strong>
          {suggestion.characterName ??
            `${suggestion.specialization} ${suggestion.className}`}
        </strong>
        <span>
          <RoleIcon role={suggestion.role} />
          {suggestion.role} · Group {suggestion.partyIndex + 1}
        </span>
        <small>{suggestion.reasons.join(" · ")}</small>
      </div>
      {signupId && (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => onAccept(signupId, suggestion.partyIndex)}
        >
          <Check size={15} />
          Add
        </button>
      )}
    </li>
  );
}

function WaitingEntry({
  event,
  signup,
  open,
  busy,
  onAdmit,
}: {
  event: EventView;
  signup: SignupView;
  open: boolean;
  busy: boolean;
  onAdmit: EventRosterProps["onAdmit"];
}): React.JSX.Element {
  return (
    <li
      style={
        {
          "--raid-class-color": classArtwork[signup.character.className].color,
        } as RosterStyle
      }
    >
      {rosterIdentity(signup, event)}
      <div className="raid-roster-actions">
        <span className={`raid-badge ${signup.status}`}>
          {signupStatusLabel(signup.status)}
        </span>
        {event.isOrganizer &&
          open &&
          participatingStatuses.some((status) => status === signup.status) && (
            <button
              className="icon-button"
              type="button"
              disabled={busy}
              title={
                signup.status === "accepted" ? "Move to bench" : "Add to roster"
              }
              aria-label={`${signup.status === "accepted" ? "Bench" : "Accept"} ${signup.character.name}`}
              onClick={() =>
                onAdmit(
                  signup.id,
                  signup.status === "accepted" ? "bench" : "accepted",
                )
              }
            >
              {signup.status === "accepted" ? (
                <UserMinus size={16} />
              ) : (
                <Check size={16} />
              )}
            </button>
          )}
      </div>
    </li>
  );
}

function ParticipantRoster({
  event,
  roster,
  open,
  busy,
  onAdmit,
}: Omit<EventRosterProps, "onSaveLayout">): React.JSX.Element {
  const openPool = event.admission === "open" && event.status === "open";
  const displayed = openPool
    ? event.signups.filter((signup) =>
        ["accepted", "registered"].includes(signup.status),
      )
    : roster.confirmed;
  return (
    <div className="raid-visual-roster raid-roster-compact">
      <div className="raid-confirmed-heading">
        <h3>{openPool ? "Signed up" : "Confirmed"}</h3>
        <span>
          {displayed.length} / {event.capacity}
        </span>
      </div>
      {openPool && (
        <p className="fine-print">
          {roster.registered.length
            ? `${roster.registered.length} awaiting roster selection.`
            : roster.confirmed.length
              ? `${roster.confirmed.length} confirmed.`
              : "Roster selection pending."}
        </p>
      )}
      <ul className="raid-roster">
        {displayed.map((signup) => (
          <WaitingEntry
            key={signup.id}
            event={event}
            signup={signup}
            open={open}
            busy={busy}
            onAdmit={onAdmit}
          />
        ))}
      </ul>
      {!event.signups.length && (
        <p className="muted raid-no-signups">No signups yet.</p>
      )}
      {[
        ...(!openPool
          ? [
              {
                label: "Signed up",
                ariaLabel: "Open signups",
                signups: roster.registered,
              },
              {
                label: "Awaiting approval",
                ariaLabel: "Pending signups",
                signups: roster.pending,
              },
              { label: "Bench", ariaLabel: "Bench", signups: roster.bench },
            ]
          : []),
        {
          label: "Tentative",
          ariaLabel: "Tentative",
          signups: roster.tentative,
        },
        { label: "Absent", ariaLabel: "Absent", signups: roster.absent },
      ].map(
        (section) =>
          section.signups.length > 0 && (
            <section
              className="raid-roster-waiting"
              aria-label={section.ariaLabel}
              key={section.label}
            >
              <h3>
                {section.label} <span>{section.signups.length}</span>
              </h3>
              <ul className="raid-roster">
                {section.signups.map((signup) => (
                  <WaitingEntry
                    key={signup.id}
                    event={event}
                    signup={signup}
                    open={open}
                    busy={busy}
                    onAdmit={onAdmit}
                  />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}

export function EventRoster({
  event,
  roster,
  open,
  busy,
  onAdmit,
  onSaveLayout,
}: EventRosterProps): React.JSX.Element {
  const combat = eventTypeDefinitions[event.eventType].combatRoles;
  const templates = useMemo(
    () => buildRosterParties(event.signups, event.capacity),
    [event.capacity, event.signups],
  );
  const signupMap = useMemo(
    () => new Map(event.signups.map((signup) => [signup.id, signup])),
    [event.signups],
  );
  const [partyIds, setPartyIds] = useState<PartyIdMap>(() =>
    idsFromParties(templates),
  );
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const parties = useMemo(
    () => partiesFromIds(partyIds, templates, signupMap),
    [partyIds, signupMap, templates],
  );
  const analysis = useMemo(
    () =>
      analyzeRosterComposition(
        event.game,
        parties,
        event.roleCaps,
        event.signups,
      ),
    [event.game, event.roleCaps, event.signups, parties],
  );
  const arrangeAllowed = event.isOrganizer && event.status === "open";

  async function persist(next: RosterParty[], message: string): Promise<void> {
    if (sameRosterLayout(templates, next)) {
      setPartyIds(idsFromParties(templates));
      return;
    }
    setPartyIds(idsFromParties(next));
    setSaving(true);
    const saved = await onSaveLayout(rosterAssignments(next));
    setSaving(false);
    if (saved) setAnnouncement(message);
    else setPartyIds(idsFromParties(templates));
  }

  function moveToParty(signupId: string, partyIndex: number): void {
    const sourceKey = findParty(partyIds, signupId);
    const targetKey = partyKey(partyIndex);
    if (!sourceKey || sourceKey === targetKey) return;
    const target = templates.find((party) => party.index === partyIndex);
    if (!target || (partyIds[targetKey]?.length ?? 0) >= target.capacity)
      return;
    const next: PartyIdMap = Object.fromEntries(
      Object.entries(partyIds).map(([key, ids]) => [key, [...ids]]),
    );
    next[sourceKey] = next[sourceKey].filter((id) => id !== signupId);
    next[targetKey] = [...next[targetKey], signupId];
    const nextParties = partiesFromIds(next, templates, signupMap);
    void persist(
      nextParties,
      `${signupMap.get(signupId)?.character.name ?? "Player"} moved to Group ${partyIndex + 1}.`,
    );
  }

  if (!combat)
    return (
      <ParticipantRoster
        event={event}
        roster={roster}
        open={open}
        busy={busy}
        onAdmit={onAdmit}
      />
    );

  const waitingSections = [
    {
      label: "Signed up",
      ariaLabel: "Open signups",
      hint: "Roster not selected yet.",
      signups: roster.registered,
    },
    {
      label: "Awaiting approval",
      ariaLabel: "Pending signups",
      hint: "",
      signups: roster.pending,
    },
    { label: "Bench", ariaLabel: "Bench", hint: "", signups: roster.bench },
    {
      label: "Tentative",
      ariaLabel: "Tentative",
      hint: "Not counted in the confirmed roster.",
      signups: roster.tentative,
    },
    {
      label: "Absent",
      ariaLabel: "Absent",
      hint: "Not attending; can sign up again while signups are open.",
      signups: roster.absent,
    },
  ];

  return (
    <div className="raid-visual-roster raid-party-roster">
      <div className="raid-confirmed-heading">
        <div>
          <h3>Raid parties</h3>
          <p className="fine-print">
            Five players per party · party effects do not apply raid-wide
          </p>
        </div>
        <span>
          {roster.confirmed.length} / {event.capacity}
        </span>
      </div>
      {event.isOrganizer && (
        <div className="raid-party-toolbar">
          <p>
            {arrangeAllowed
              ? "Drag players between parties or use each player’s group selector."
              : "Party layout is read-only because the event is locked or cancelled."}
          </p>
          {arrangeAllowed && analysis.arrangementImproves && (
            <button
              type="button"
              className="button secondary"
              disabled={busy || saving}
              onClick={() =>
                void persist(
                  analysis.optimizedParties,
                  "Suggested party arrangement applied.",
                )
              }
            >
              <Sparkles size={16} />
              Apply suggested layout
            </button>
          )}
        </div>
      )}
      <DragDropProvider
        onDragEnd={(dragEvent) => {
          if (dragEvent.canceled || !arrangeAllowed || busy || saving) {
            return;
          }
          const signupId = String(dragEvent.operation.source?.id ?? "");
          const targetId = String(dragEvent.operation.target?.id ?? "");
          const sourceKey = findParty(partyIds, signupId);
          const targetKey = targetId.startsWith("party-")
            ? targetId
            : findParty(partyIds, targetId);
          if (!sourceKey || !targetKey) {
            return;
          }
          if (sourceKey === targetKey && targetId === signupId) return;
          const next: PartyIdMap = Object.fromEntries(
            Object.entries(partyIds).map(([key, ids]) => [key, [...ids]]),
          );
          const source = next[sourceKey];
          const target = next[targetKey];
          const sourceIndex = source.indexOf(signupId);
          const targetParty = templates.find(
            (party) => partyKey(party.index) === targetKey,
          );
          if (
            sourceIndex < 0 ||
            !targetParty ||
            (sourceKey !== targetKey && target.length >= targetParty.capacity)
          ) {
            return;
          }
          source.splice(sourceIndex, 1);
          const targetIndex = target.indexOf(targetId);
          target.splice(
            targetIndex < 0 ? target.length : targetIndex,
            0,
            signupId,
          );
          const nextParties = partiesFromIds(next, templates, signupMap);
          void persist(
            nextParties,
            `${signupMap.get(signupId)?.character.name ?? "Player"} moved to Group ${targetParty.index + 1}.`,
          );
        }}
      >
        <div className="raid-party-grid">
          {parties.map((party) => (
            <PartyColumn
              key={party.index}
              party={party}
              event={event}
              report={analysis.parties[party.index]}
              allParties={parties}
              editable={arrangeAllowed}
              canAdmit={open}
              busy={busy || saving}
              onMove={moveToParty}
              onBench={(signupId) => onAdmit(signupId, "bench")}
            />
          ))}
        </div>
      </DragDropProvider>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {(analysis.availableCandidates.length > 0 ||
        analysis.recruitment.length > 0) && (
        <section
          className="raid-composition-advice"
          aria-label="Roster suggestions"
        >
          <div className="raid-composition-advice-heading">
            <Lightbulb size={20} />
            <div>
              <h3>Roster suggestions</h3>
              <p>Role gaps first, then the strongest new party coverage.</p>
            </div>
          </div>
          {analysis.availableCandidates.length > 0 && (
            <div>
              <h4>Best available signups</h4>
              <ul className="raid-suggestion-list">
                {analysis.availableCandidates.map((suggestion) => (
                  <CandidateSuggestion
                    key={suggestion.signupId}
                    suggestion={suggestion}
                    busy={busy || saving}
                    onAccept={(signupId, partyIndex) =>
                      onAdmit(signupId, "accepted", partyIndex)
                    }
                  />
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4>Recruit next</h4>
            <ul className="raid-suggestion-list">
              {analysis.recruitment.map((suggestion) => (
                <CandidateSuggestion
                  key={`${suggestion.className}-${suggestion.specialization}-${suggestion.role}`}
                  suggestion={suggestion}
                  busy={busy || saving}
                  onAccept={() => undefined}
                />
              ))}
            </ul>
          </div>
          <p className="raid-composition-evidence">
            <ShieldAlert size={16} />
            “Talent or setup required” effects are capabilities, not confirmed
            loadouts. Forever effects marked “Verify” use provisional client
            data. Rules: {event.compositionRevision ?? "legacy"}.
          </p>
        </section>
      )}

      {!event.signups.length && (
        <p className="muted raid-no-signups">No signups yet.</p>
      )}
      {waitingSections.map(
        (section) =>
          section.signups.length > 0 && (
            <section
              className="raid-roster-waiting"
              aria-label={section.ariaLabel}
              key={section.label}
            >
              <h3>
                {section.label} <span>{section.signups.length}</span>
              </h3>
              {section.hint && <p className="fine-print">{section.hint}</p>}
              <ul className="raid-roster">
                {section.signups.map((signup) => (
                  <WaitingEntry
                    key={signup.id}
                    event={event}
                    signup={signup}
                    open={open}
                    busy={busy || saving}
                    onAdmit={onAdmit}
                  />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
