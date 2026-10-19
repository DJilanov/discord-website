"use client";

import { useState } from "react";

type FeedbackKind = "helpful" | "unclear" | "incorrect" | "missing";

const options: readonly {
  readonly value: FeedbackKind;
  readonly label: string;
}[] = [
  { value: "helpful", label: "Helpful" },
  { value: "unclear", label: "Unclear" },
  { value: "incorrect", label: "Incorrect" },
  { value: "missing", label: "Missing evidence" },
];

export function ResearchFeedback({
  path,
}: {
  path: string;
}): React.JSX.Element {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!kind) return;
    setStatus("saving");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/research/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          kind,
          message,
          website: String(form.get("website") ?? ""),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Feedback could not be saved.");
      setStatus("saved");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Feedback could not be saved.",
      );
      setStatus("error");
    }
  }

  if (status === "saved") {
    return (
      <aside
        className="research-feedback research-feedback-saved"
        role="status"
      >
        <strong>Feedback received.</strong>
        <p>
          It is now in the research review queue. Thank you for helping improve
          the evidence.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="research-feedback"
      aria-labelledby="research-feedback-heading"
    >
      <div>
        <p className="eyebrow">Close the loop</p>
        <h2 id="research-feedback-heading">
          Does this report answer the question?
        </h2>
        <p>
          Flag unclear claims, missing evidence, or mistakes. No email or
          Discord ID is collected.
        </p>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={status === "saving"}>
          <legend>Your assessment</legend>
          <div className="research-feedback-options">
            {options.map((option) => (
              <label key={option.value}>
                <input
                  checked={kind === option.value}
                  name="kind"
                  onChange={() => setKind(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {kind ? (
            <label className="field">
              <span>
                {kind === "incorrect" || kind === "missing"
                  ? "What should we investigate?"
                  : "Anything else? (optional)"}
              </span>
              <textarea
                maxLength={2000}
                minLength={
                  kind === "incorrect" || kind === "missing" ? 10 : undefined
                }
                onChange={(event) => setMessage(event.target.value)}
                required={kind === "incorrect" || kind === "missing"}
                rows={4}
                value={message}
              />
            </label>
          ) : null}
          <label className="research-feedback-honeypot" aria-hidden="true">
            Website
            <input autoComplete="off" name="website" tabIndex={-1} />
          </label>
          <button
            className="button secondary"
            disabled={!kind || status === "saving"}
            type="submit"
          >
            {status === "saving" ? "Sending…" : "Send feedback"}
          </button>
          {status === "error" ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </fieldset>
      </form>
    </aside>
  );
}
