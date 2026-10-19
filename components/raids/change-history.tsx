"use client";

import { useState } from "react";
import { ChevronDown, History, RefreshCw } from "lucide-react";
import {
  eventHistoryPageSchema,
  type EventHistoryPage,
} from "@/lib/raids/contracts";

export function EventChangeHistory({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EventHistoryPage;
}): React.JSX.Element {
  const [history, setHistory] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function earlier(): Promise<void> {
    if (!history.nextCursor || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/raids/${eventId}/history?cursor=${encodeURIComponent(history.nextCursor)}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error("Change history could not be loaded. Try again.");
      const page = eventHistoryPageSchema.parse(await response.json());
      setHistory({
        changes: [...history.changes, ...page.changes],
        nextCursor: page.nextCursor,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Change history could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="raid-change-history"
      aria-labelledby="event-history-heading"
    >
      <h2 id="event-history-heading">
        <History size={19} />
        Change history
      </h2>
      {!history.changes.length && (
        <p className="muted">No event settings have been changed.</p>
      )}
      <ol>
        {history.changes.map((change) => (
          <li key={change.id}>
            <details>
              <summary>
                <span>
                  Event creator changed{" "}
                  <strong>
                    {change.fields.map((field) => field.label).join(", ")}
                  </strong>
                </span>
                <time dateTime={change.changedAt}>{change.timeLabel}</time>
                <ChevronDown size={16} />
              </summary>
              <dl>
                {change.fields.map((field) => (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>
                      <span className="raid-history-before">
                        {field.before}
                      </span>
                      <span className="raid-history-after">{field.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ol>
      {error && (
        <p className="raid-notice error" role="alert">
          {error}
        </p>
      )}
      {history.nextCursor && (
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => void earlier()}
        >
          <RefreshCw size={16} />
          {busy ? "Loading..." : "Earlier changes"}
        </button>
      )}
    </section>
  );
}
