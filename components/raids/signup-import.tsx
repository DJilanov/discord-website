"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Check, FileJson, RotateCcw, Upload, Users, X } from "lucide-react";
import {
  classes,
  storedCharacterSchema,
  type EventView,
  type SignupRole,
} from "@/lib/raids/contracts";
import {
  specializationsByClass,
  suggestedRole,
  type ClassName,
  type Specialization,
} from "@/lib/raids/specializations";
import { eventTypeDefinitions } from "@/lib/raids/event-types";
import {
  SIGNUP_IMPORT_MAX_BYTES,
  signupImportPreviewSchema,
  signupImportResultSchema,
  type ImportAttendance,
  type ImportSelection,
  type SignupImportPreview,
  type SignupImportResult,
  type SignupImportRow,
} from "@/lib/raids/signup-import";
import { postRaid } from "./client-data";
import { CharacterPortrait } from "./character-picker";

interface EditableRow {
  source: SignupImportRow;
  selected: boolean;
  characterId: string | null;
  name: string;
  className: ClassName | "";
  specialization: Specialization | "";
  role: SignupRole | "";
  attendance: ImportAttendance | "";
}
function rowSelection(
  row: EditableRow,
  event: EventView,
): ImportSelection | null {
  if (!row.className || !row.role || !row.attendance) return null;
  if (eventTypeDefinitions[event.eventType].combatRoles && !row.specialization)
    return null;
  const character = storedCharacterSchema.safeParse({
    name: row.name,
    className: row.className,
    specialization: row.specialization || null,
    game: event.game,
    realm: event.realm,
    region: event.region,
    faction: event.faction,
    ruleset: event.ruleset,
  });
  if (
    !character.success ||
    (event.game === "tbc" && !/^[\p{L}\p{M}]{2,12}$/u.test(character.data.name))
  )
    return null;
  return {
    userId: row.source.userId,
    characterId: row.characterId,
    name: character.data.name,
    className: character.data.className,
    specialization: character.data.specialization,
    role: row.role,
    attendance: row.attendance,
  };
}

export function SignupImport({
  event,
}: {
  event: EventView;
}): React.JSX.Element {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestKey = useRef("");
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<SignupImportPreview | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<SignupImportResult | null>(null);
  const combat = eventTypeDefinitions[event.eventType].combatRoles;
  const selected = rows.filter((row) => row.selected);
  const invalid = selected.filter((row) => rowSelection(row, event) === null);
  function update(userId: string, changes: Partial<EditableRow>): void {
    if (busy || result) return;
    if (changes.selected && selected.length >= 50) {
      setError("Import up to 50 players at a time.");
      return;
    }
    setRows((current) =>
      current.map((row) =>
        row.source.userId === userId ? { ...row, ...changes } : row,
      ),
    );
    setConfirmed(false);
    setError("");
    requestKey.current = crypto.randomUUID();
  }
  function reset(): void {
    setPreview(null);
    setRows([]);
    setError("");
    setConfirmed(false);
    setResult(null);
    requestKey.current = "";
  }
  async function loadPreview(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const data = z.object({ preview: signupImportPreviewSchema }).parse(
        await postRaid(`/api/raids/${event.id}/import`, {
          operation: "preview",
          source,
        }),
      );
      setPreview(data.preview);
      let eligible = 0;
      setRows(
        data.preview.rows.map((row) => ({
          source: row,
          selected: !row.blocked && eligible++ < 50,
          characterId: row.characterId,
          name: row.name,
          className: row.className ?? "",
          specialization: row.specialization ?? "",
          role: row.role ?? "",
          attendance: row.attendance ?? "",
        })),
      );
      requestKey.current = crypto.randomUUID();
    } catch (cause) {
      setError(
        cause instanceof z.ZodError
          ? "The server returned an unexpected preview. Try again."
          : cause instanceof Error
            ? cause.message
            : "Could not preview this export.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function importPlayers(): Promise<void> {
    if (!preview || !confirmed || invalid.length || !selected.length) return;
    setBusy(true);
    setError("");
    try {
      const selections = selected
        .map((row) => rowSelection(row, event))
        .filter((row): row is ImportSelection => row !== null);
      const data = z.object({ result: signupImportResultSchema }).parse(
        await postRaid(`/api/raids/${event.id}/import`, {
          operation: "import",
          source,
          version: preview.version,
          requestKey: requestKey.current,
          confirm: true,
          selections,
        }),
      );
      setResult(data.result);
    } catch (cause) {
      setError(
        cause instanceof z.ZodError
          ? "The server returned an unexpected result. Preview the roster before retrying."
          : cause instanceof Error
            ? cause.message
            : "Could not import these players.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="button secondary raid-import-trigger"
        onClick={() => {
          reset();
          setSource("");
          if (fileInput.current) fileInput.current.value = "";
          dialog.current?.showModal();
        }}
      >
        <Upload size={16} />
        Import Raid-Helper signups
      </button>
      <dialog
        ref={dialog}
        className="raid-import-dialog"
        aria-labelledby="raid-import-title"
        onCancel={(change) => {
          if (busy) change.preventDefault();
        }}
        onClose={() => {
          // Refreshing earlier remounts the event and discards the import receipt.
          if (result) router.refresh();
        }}
      >
        <div className="raid-import-heading">
          <div>
            <p className="eyebrow">{event.title}</p>
            <h2 id="raid-import-title">Import signups</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            title="Close import"
            aria-label="Close import"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {error && (
          <p role="alert" className="raid-sign-in-error">
            {error}
          </p>
        )}
        {!preview ? (
          <form
            className="raid-form"
            onSubmit={(change) => {
              change.preventDefault();
              void loadPreview();
            }}
          >
            <label>
              Raid-Helper JSON file
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={async (change) => {
                  const file = change.currentTarget.files?.[0];
                  if (!file) return;
                  if (file.size > SIGNUP_IMPORT_MAX_BYTES) {
                    setSource("");
                    setError("The export must be 512 KB or smaller.");
                    return;
                  }
                  try {
                    setSource(await file.text());
                    setError("");
                  } catch {
                    setError("The file could not be opened. Choose it again.");
                  }
                }}
              />
            </label>
            <label>
              JSON export
              <textarea
                value={source}
                onChange={(change) => {
                  setSource(change.currentTarget.value);
                  setError("");
                }}
                maxLength={SIGNUP_IMPORT_MAX_BYTES}
                rows={10}
                required
                disabled={busy}
                spellCheck={false}
              />
            </label>
            <div className="raid-import-footer">
              <span>Raid-Helper roster · no soft-reserve selections</span>
              <button
                className="button primary"
                disabled={busy || !source.trim()}
              >
                <FileJson size={17} />
                {busy ? "Reading export..." : "Preview players"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="raid-import-source">
              <div>
                <strong>{preview.sourceTitle}</strong>
                {preview.sourceStartLabel && (
                  <span>{preview.sourceStartLabel}</span>
                )}
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={reset}
              >
                <RotateCcw size={16} />
                Choose another export
              </button>
            </div>
            {preview.warnings.map((warning) => (
              <p className="muted raid-import-warning" key={warning}>
                {warning}
              </p>
            ))}
            <p className="raid-import-count">
              <Users size={17} />
              {selected.length} selected · {rows.length} in source
            </p>
            <ul className="raid-import-rows">
              {rows.map((row) => (
                <li
                  key={row.source.userId}
                  className={`raid-import-row${row.source.blocked ? " is-skipped" : ""}`}
                >
                  <div className="raid-import-identity">
                    <label>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={
                          busy || Boolean(result) || Boolean(row.source.blocked)
                        }
                        aria-label={`Import ${row.source.originalName}`}
                        onChange={(change) =>
                          update(row.source.userId, {
                            selected: change.currentTarget.checked,
                          })
                        }
                      />
                      {row.className ? (
                        <CharacterPortrait
                          className={row.className}
                          specialization={row.specialization || null}
                        />
                      ) : (
                        <Users size={28} />
                      )}
                      <span>
                        <strong>{row.source.originalName}</strong>
                        <small>
                          {row.source.originalClass} {row.source.originalSpec}
                        </small>
                        <small
                          className="raid-import-discord-id"
                          title={row.source.userId}
                        >
                          {row.source.userId}
                        </small>
                      </span>
                    </label>
                    {row.source.note && (
                      <details>
                        <summary>Signup note</summary>
                        <p>{row.source.note}</p>
                      </details>
                    )}
                    {row.source.blocked && <p>{row.source.blocked}</p>}
                  </div>
                  {!row.source.blocked && (
                    <fieldset
                      className="raid-import-fields"
                      disabled={busy || Boolean(result) || !row.selected}
                    >
                      {row.source.characters.length > 0 && (
                        <label>
                          Saved character
                          <select
                            value={row.characterId ?? ""}
                            onChange={(change) => {
                              const character = row.source.characters.find(
                                (value) =>
                                  value.id === change.currentTarget.value,
                              );
                              update(
                                row.source.userId,
                                character
                                  ? {
                                      characterId: character.id,
                                      name: character.name,
                                      className: character.className,
                                      specialization:
                                        character.specialization ?? "",
                                      role: combat
                                        ? suggestedRole(
                                            character.specialization,
                                          )
                                        : "participant",
                                    }
                                  : { characterId: null },
                              );
                            }}
                          >
                            <option value="">New character</option>
                            {row.source.characters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name} · {character.className}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label>
                        Character name
                        <input
                          value={row.name}
                          maxLength={40}
                          required
                          disabled={row.characterId !== null}
                          aria-label={`Character name for ${row.source.originalName}`}
                          onChange={(change) =>
                            update(row.source.userId, {
                              name: change.currentTarget.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Class
                        <select
                          value={row.className}
                          required
                          disabled={row.characterId !== null}
                          aria-label={`Class for ${row.source.originalName}`}
                          onChange={(change) =>
                            update(row.source.userId, {
                              className: change.currentTarget
                                .value as ClassName,
                              specialization: "",
                              role: combat ? "" : "participant",
                            })
                          }
                        >
                          <option value="">Choose class</option>
                          {classes.map((className) => (
                            <option key={className}>{className}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Specialization
                        <select
                          value={row.specialization}
                          required={combat}
                          aria-label={`Specialization for ${row.source.originalName}`}
                          onChange={(change) => {
                            const spec = change.currentTarget.value as
                              Specialization | "";
                            update(row.source.userId, {
                              specialization: spec,
                              ...(combat && spec
                                ? { role: suggestedRole(spec) }
                                : {}),
                            });
                          }}
                        >
                          <option value="">Choose spec</option>
                          {row.className &&
                            specializationsByClass[row.className].map(
                              (spec) => <option key={spec}>{spec}</option>,
                            )}
                        </select>
                      </label>
                      {combat && (
                        <label>
                          Role
                          <select
                            value={row.role}
                            required
                            aria-label={`Role for ${row.source.originalName}`}
                            onChange={(change) =>
                              update(row.source.userId, {
                                role: change.currentTarget.value as SignupRole,
                              })
                            }
                          >
                            <option value="">Choose role</option>
                            <option value="tank">Tank</option>
                            <option value="healer">Healer</option>
                            <option value="damage">DPS</option>
                          </select>
                        </label>
                      )}
                      <label>
                        Attendance
                        <select
                          value={row.attendance}
                          required
                          aria-label={`Attendance for ${row.source.originalName}`}
                          onChange={(change) =>
                            update(row.source.userId, {
                              attendance: change.currentTarget
                                .value as ImportAttendance,
                            })
                          }
                        >
                          <option value="">Choose attendance</option>
                          <option value="joining">Joining</option>
                          <option value="bench">Bench</option>
                          <option value="tentative">Tentative</option>
                          <option value="absent">Absent</option>
                        </select>
                      </label>
                      {row.selected && rowSelection(row, event) === null && (
                        <p className="raid-import-row-error">
                          Complete a valid character name, class, specialization
                          and role.
                        </p>
                      )}
                    </fieldset>
                  )}
                </li>
              ))}
            </ul>
            {result ? (
              <div className="raid-import-footer">
                <p role="status">
                  <Check size={18} />
                  {result.imported} imported · {result.skipped} existing signups
                  preserved
                </p>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => dialog.current?.close()}
                >
                  <Check size={17} />
                  Done
                </button>
              </div>
            ) : (
              <div className="raid-import-footer">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={
                      busy || invalid.length > 0 || selected.length === 0
                    }
                    onChange={(change) =>
                      setConfirmed(change.currentTarget.checked)
                    }
                  />
                  I reviewed each character name, role and attendance choice.
                </label>
                <button
                  type="button"
                  className="button primary"
                  disabled={
                    busy ||
                    !confirmed ||
                    invalid.length > 0 ||
                    selected.length === 0
                  }
                  onClick={() => void importPlayers()}
                >
                  <Upload size={17} />
                  {busy ? "Importing..." : `Import ${selected.length} players`}
                </button>
              </div>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
