"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import {
  CLASSES,
  DAYS,
  FACTIONS,
  PLAYSTYLES,
  REGIONS,
  REPORT_CATEGORIES,
  RULESETS,
} from "@/lib/config";
import { Challenge } from "@/components/challenge";
import { CopyButton } from "@/components/copy-button";

export type SubmissionKind = "guild" | "group" | "report" | "appeal";
interface Receipt {
  message: string;
  reference?: string;
  token?: string;
}

export function Field({
  label,
  name,
  required = true,
  type = "text",
  maxLength = 120,
  hint,
  defaultValue = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  hint?: string;
  defaultValue?: string;
}): React.JSX.Element {
  return (
    <label className="field">
      <span>
        {label}
        {!required && " (optional)"}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
}): React.JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        name={name}
        aria-label={label}
        required
        defaultValue={defaultValue || ""}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
function ChoiceGrid({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: readonly string[];
}): React.JSX.Element {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="checkbox-grid">
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" name={name} value={option} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SubmissionForm({
  kind,
  enabled,
  reference = "",
}: {
  kind: SubmissionKind;
  enabled: boolean;
  reference?: string;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [challenge, setChallenge] = useState(""),
    [resetKey, setResetKey] = useState(0);
  const feedback = useRef<HTMLDivElement>(null);
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries())
      if (
        typeof value === "string" &&
        !["website", "evidence", "raidDays", "recruitingClasses"].includes(key)
      )
        payload[key] = value;
    if (kind === "guild") {
      payload.raidDays = form.getAll("raidDays");
      payload.recruitingClasses = form.getAll("recruitingClasses");
    }
    if (kind === "report" || kind === "appeal")
      payload.consent = form.get("consent") === "on";
    if (typeof payload.incidentAt === "string")
      payload.incidentAt = new Date(payload.incidentAt).toISOString();
    if (typeof payload.startsAt === "string")
      payload.startsAt = new Date(payload.startsAt).toISOString();
    let body: string | FormData;
    const headers: Record<string, string> = {};
    if (kind === "report" || kind === "appeal") {
      body = new FormData();
      body.set("payload", JSON.stringify(payload));
      body.set("challenge", challenge);
      body.set("website", String(form.get("website") || ""));
      for (const file of form.getAll("evidence"))
        if (file instanceof File && file.size) body.append("evidence", file);
    } else {
      body = JSON.stringify({
        payload,
        challenge,
        website: form.get("website"),
      });
      headers["Content-Type"] = "application/json";
    }
    try {
      const response = await fetch(`/api/submissions/${kind}`, {
        method: "POST",
        headers,
        body,
      });
      const data: Receipt & { error?: string } = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Submission failed. Please try again.");
      setReceipt(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The connection failed. Please try again.",
      );
      setChallenge("");
      setResetKey((value) => value + 1);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        feedback.current?.focus();
        feedback.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    }
  }
  if (receipt)
    return (
      <div
        className="receipt form-success"
        role="status"
        ref={feedback}
        tabIndex={-1}
      >
        <CheckCircle2 size={28} />
        <h2 style={{ marginTop: 15 }}>Submission received</h2>
        <p>{receipt.message}</p>
        {receipt.reference && (
          <>
            <p>
              Reference: <strong>{receipt.reference}</strong>
            </p>
            <p className="fine-print">
              Keep the access key private. It is shown only once.
            </p>
            <code className="token-reveal">{receipt.token}</code>
            <CopyButton
              text={`Reference: ${receipt.reference}\nAccess key: ${receipt.token}`}
              label="Copy receipt"
            />
            <p className="button-row">
              <Link href="/reports/status" className="button secondary">
                Check case status
              </Link>
            </p>
          </>
        )}
        <p className="button-row">
          <Link
            className="text-link"
            href={
              kind === "guild"
                ? "/guild-recruitment"
                : kind === "group"
                  ? "/lfg"
                  : "/safety"
            }
          >
            Back to the community
          </Link>
        </p>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      encType={
        kind === "report" || kind === "appeal"
          ? "multipart/form-data"
          : undefined
      }
    >
      {!enabled && (
        <div className="notice">
          Web submissions are temporarily unavailable. Please contact moderators
          in <Link href="/discord">Discord</Link>.
        </div>
      )}
      <fieldset disabled={busy || !enabled}>
        <div className="honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {kind === "guild" && (
          <>
            <section className="form-section">
              <h2>Your guild</h2>
              <div className="form-grid">
                <Field label="Guild name" name="name" />
                <SelectField label="Region" name="region" options={REGIONS} />
                <Field
                  label="Realm or realm plan"
                  name="realm"
                  hint="Write Unconfirmed if your realm is not decided."
                />
                <SelectField
                  label="Faction"
                  name="faction"
                  options={FACTIONS}
                />
                <SelectField
                  label="Main activity"
                  name="ruleset"
                  options={RULESETS}
                />
                <Field
                  label="Language"
                  name="language"
                  defaultValue="English"
                />
                <SelectField
                  label="Playstyle"
                  name="playstyle"
                  options={PLAYSTYLES}
                />
                <Field label="Loot system" name="lootSystem" />
              </div>
            </section>
            <section className="form-section">
              <h2>Your schedule &amp; roster</h2>
              <ChoiceGrid
                label="Raid days (leave empty for a flexible schedule)"
                name="raidDays"
                options={DAYS}
              />
              <Field
                label="Raid time and time zone"
                name="raidTime"
                hint="For example: 20:00-23:00 Europe/Sofia, or Flexible."
              />
              <ChoiceGrid
                label="Recruiting classes (choose at least one)"
                name="recruitingClasses"
                options={CLASSES}
              />
            </section>
            <section className="form-section">
              <h2>Introduce your community</h2>
              <label className="field">
                <span>Guild description</span>
                <textarea
                  name="description"
                  required
                  minLength={60}
                  maxLength={8000}
                  rows={7}
                />
                <small>
                  Include your expectations, atmosphere, and what new members
                  should know. Minimum 60 characters.
                </small>
              </label>
              <div className="form-grid">
                <Field
                  label="Recruiter's Discord handle"
                  name="contactDiscord"
                />
                <Field
                  label="Guild Discord invite"
                  name="inviteUrl"
                  type="url"
                  required={false}
                  maxLength={200}
                />
                <div className="full">
                  <Field
                    label="Guild website"
                    name="websiteUrl"
                    type="url"
                    required={false}
                    maxLength={500}
                  />
                </div>
              </div>
            </section>
          </>
        )}
        {kind === "group" && (
          <>
            <section className="form-section">
              <h2>The plan</h2>
              <Field label="Group title" name="title" maxLength={100} />
              <div className="form-grid">
                <SelectField
                  label="Activity"
                  name="activity"
                  options={[
                    "Dungeon",
                    "Raid",
                    "PvP premade",
                    "RP event",
                    "Questing",
                  ]}
                />
                <SelectField label="Region" name="region" options={REGIONS} />
                <Field label="Realm" name="realm" />
                <SelectField
                  label="Faction"
                  name="faction"
                  options={FACTIONS}
                />
                <Field
                  label="Start time"
                  name="startsAt"
                  type="datetime-local"
                  hint="Your device's local time, stored and displayed in UTC."
                />
                <Field label="Discord contact" name="contactDiscord" />
              </div>
              <label className="field">
                <span>Group details</span>
                <textarea
                  name="description"
                  minLength={20}
                  maxLength={2000}
                  required
                  rows={6}
                />
                <small>
                  Needed roles, meeting point, voice expectations, and loot
                  rules.
                </small>
              </label>
            </section>
          </>
        )}
        {kind === "report" && (
          <>
            <section className="form-section">
              <h2>Your details, kept private</h2>
              <div className="form-grid">
                <Field label="Your Discord handle" name="reporterDiscord" />
                <Field label="Your character" name="reporterCharacter" />
              </div>
            </section>
            <section className="form-section">
              <h2>The incident</h2>
              <div className="form-grid">
                <Field label="Character involved" name="character" />
                <Field label="Their guild" name="guild" required={false} />
                <Field label="Realm" name="realm" />
                <SelectField label="Region" name="region" options={REGIONS} />
                <SelectField
                  label="Faction"
                  name="faction"
                  options={FACTIONS}
                />
                <SelectField
                  label="Category"
                  name="category"
                  options={REPORT_CATEGORIES}
                />
                <Field
                  label="Incident date and time"
                  name="incidentAt"
                  type="datetime-local"
                  hint="Use your device's local time."
                />
              </div>
              <label className="field">
                <span>What happened?</span>
                <textarea
                  name="description"
                  required
                  minLength={80}
                  maxLength={10000}
                  rows={7}
                />
                <small>
                  Describe the sequence factually. Include context and a
                  location. Minimum 80 characters.
                </small>
              </label>
              <label className="field">
                <span>Agreed loot or group rules (optional)</span>
                <textarea name="lootRules" maxLength={3000} rows={3} />
              </label>
            </section>
          </>
        )}
        {kind === "appeal" && (
          <section className="form-section">
            <h2>Your appeal</h2>
            <div className="form-grid">
              <Field
                label="Report or alert reference"
                name="reportPublicId"
                defaultValue={reference}
                hint="Format: FG- followed by 12 letters or numbers."
              />
              <Field label="Your Discord handle" name="appellantDiscord" />
              <Field label="Your character" name="character" />
              <SelectField
                label="Requested outcome"
                name="requestedOutcome"
                options={[
                  "Remove alert",
                  "Correct identity",
                  "Reduce severity",
                  "Add context",
                ]}
              />
            </div>
            <label className="field">
              <span>Why should the decision change?</span>
              <textarea
                name="explanation"
                required
                minLength={60}
                maxLength={10000}
                rows={8}
              />
              <small>
                Include missing context, identity corrections, or new evidence.
                Minimum 60 characters.
              </small>
            </label>
          </section>
        )}
        {(kind === "report" || kind === "appeal") && (
          <section className="form-section">
            <h2>Supporting evidence</h2>
            <label className="field">
              <span>Screenshots{kind === "appeal" && " (optional)"}</span>
              <input
                type="file"
                name="evidence"
                accept="image/png,image/jpeg,image/webp"
                multiple
                required={kind === "report"}
              />
              <small>
                Up to 3 PNG, JPEG, or WebP images, 5 MB each. Remove unrelated
                personal information.
              </small>
            </label>
            <label className="checkbox-label">
              <input name="consent" type="checkbox" required />I confirm this
              account is accurate to the best of my knowledge and consent to
              private moderator review of these details and evidence.
            </label>
          </section>
        )}
        <p className="inline-note">
          By submitting, you agree to the{" "}
          <Link href="/rules">community rules</Link> and acknowledge the{" "}
          <Link href="/privacy">privacy notice</Link>.
        </p>
        <Challenge onToken={setChallenge} resetKey={resetKey} />
      </fieldset>
      {error && (
        <div className="form-error" role="alert" ref={feedback} tabIndex={-1}>
          {error}
        </div>
      )}
      <div className="form-actions">
        <button
          className="button primary"
          type="submit"
          disabled={busy || !enabled || !challenge}
        >
          {busy ? <LoaderCircle size={16} /> : <Send size={16} />}
          {busy ? "Submitting..." : `Submit ${kind}`}
        </button>
        <span className="fine-print">Reviewed before any public action.</span>
      </div>
    </form>
  );
}
