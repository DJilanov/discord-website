"use client";
import { RefreshCw } from "lucide-react";

export default function RaidError({
  reset,
}: {
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="raid-empty">
      <h1>Event planner unavailable</h1>
      <p className="muted">The request could not be completed.</p>
      <button className="button secondary" onClick={reset}>
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}
