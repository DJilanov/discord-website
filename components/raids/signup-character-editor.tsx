"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import {
  signupCharacterUpdateSchema,
  type EventView,
  type SignupView,
} from "@/lib/raids/contracts";
import type { ClassName, Specialization } from "@/lib/raids/specializations";
import {
  CharacterPortrait,
  ClassPicker,
  SpecializationPicker,
} from "./character-picker";
import { postRaid } from "./client-data";

interface SignupCharacterEditorProps {
  event: EventView;
  signup: SignupView;
  onClose: () => void;
}

export function SignupCharacterEditor({
  event,
  signup,
  onClose,
}: SignupCharacterEditorProps): React.JSX.Element {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [className, setClassName] = useState<ClassName>(
    signup.character.className,
  );
  const [specialization, setSpecialization] = useState<Specialization | "">(
    signup.character.specialization ?? "",
  );
  const [clearReserves, setClearReserves] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [refreshRequested, setRefreshRequested] = useState(false);
  const [error, setError] = useState("");
  const busy = saving || refreshRequested;
  const changed =
    className !== signup.character.className ||
    specialization !== (signup.character.specialization ?? "");
  const needsConfirmation = changed && signup.reserves.length > 0;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  useEffect(() => {
    if (refreshRequested && !refreshing) dialog.current?.close();
  }, [refreshRequested, refreshing]);

  function reloadRoster(): void {
    setRefreshRequested(true);
    startRefresh(() => router.refresh());
  }

  async function save(): Promise<void> {
    const character = signupCharacterUpdateSchema.safeParse({
      className,
      specialization,
      clearReserves,
    });
    if (!character.success) {
      setError("Choose a class and specialization before saving.");
      return;
    }
    if (!changed || busy || (needsConfirmation && !clearReserves)) return;
    setSaving(true);
    setError("");
    try {
      await postRaid(`/api/raids/${event.id}`, {
        operation: "manage",
        input: {
          action: "edit_signup_character",
          version: event.version,
          signupId: signup.id,
          character: character.data,
        },
      });
      reloadRoster();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save this player. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="raid-signup-editor"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={(change) => {
        if (busy) change.preventDefault();
      }}
    >
      <div className="raid-dialog-heading">
        <h2 id={titleId}>Edit {signup.character.name}’s class and spec</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close player editor"
          disabled={busy}
          onClick={() => dialog.current?.close()}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <p id={descriptionId} className="fine-print">
        This event only. Saved characters and other events stay unchanged. Their{" "}
        {signup.role === "participant"
          ? "participant"
          : signup.role === "damage"
            ? "DPS"
            : signup.role}{" "}
        role and roster position stay the same.
      </p>
      <form
        className="raid-form"
        onSubmit={(change) => {
          change.preventDefault();
          void save();
        }}
      >
        <div className="raid-signup-editor-preview">
          <CharacterPortrait
            className={className}
            specialization={specialization || null}
          />
          <div>
            <strong>{signup.character.name}</strong>
            <span>
              {specialization
                ? `${specialization} · ${className}`
                : `Choose a ${className} specialization`}
            </span>
          </div>
        </div>
        <ClassPicker
          value={className}
          disabled={busy}
          onChange={(value) => {
            if (value === className) return;
            setClassName(value);
            setSpecialization("");
            setClearReserves(false);
            setError("");
          }}
        />
        <SpecializationPicker
          className={className}
          value={specialization}
          disabled={busy}
          onChange={(value) => {
            setSpecialization(value);
            setClearReserves(false);
            setError("");
          }}
        />
        {needsConfirmation && (
          <label className="raid-check raid-signup-editor-warning">
            <input
              type="checkbox"
              checked={clearReserves}
              disabled={busy}
              required
              onChange={(change) =>
                setClearReserves(change.currentTarget.checked)
              }
            />
            <span>
              Clear {signup.character.name}’s {signup.reserves.length} soft{" "}
              {signup.reserves.length === 1 ? "reserve" : "reserves"}. They will
              need to choose again for the new class or spec.
            </span>
          </label>
        )}
        {error && (
          <div>
            <p className="raid-notice error" role="alert">
              {error}
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={reloadRoster}
            >
              Reload roster
            </button>
          </div>
        )}
        <div className="raid-signup-editor-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              !changed ||
              !specialization ||
              (needsConfirmation && !clearReserves)
            }
          >
            <Save size={16} aria-hidden="true" />
            {refreshRequested
              ? "Refreshing…"
              : saving
                ? "Saving…"
                : "Save player"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
