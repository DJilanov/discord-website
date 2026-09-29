"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui";

interface CaseResult {
  publicId: string;
  status: string;
  decisionReason: string | null;
  updatedAt: string;
}
export function CaseStatus(): React.JSX.Element {
  const [result, setResult] = useState<CaseResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/cases/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: String(form.get("reference")).trim().toUpperCase(),
          token: String(form.get("token")).trim(),
        }),
      });
      const data = (await response.json()) as CaseResult & { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Could not load this case.");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={submit}>
        <label className="field">
          <span>Case reference</span>
          <input name="reference" required maxLength={15} autoComplete="off" />
        </label>
        <label className="field">
          <span>Private access key</span>
          <input
            name="token"
            type="password"
            required
            minLength={40}
            maxLength={80}
            autoComplete="off"
          />
        </label>
        <button className="button primary" disabled={busy}>
          <Search size={16} />
          {busy ? "Checking..." : "Check status"}
        </button>
      </form>
      {error && (
        <div role="alert" className="form-error" style={{ marginTop: 24 }}>
          {error}
        </div>
      )}
      {result && (
        <div className="form-section" role="status">
          <h2>{result.publicId}</h2>
          <StatusBadge value={result.status} />
          <p className="muted" style={{ marginTop: 16 }}>
            {result.decisionReason ||
              "Your case is waiting for moderator review."}
          </p>
          <p className="fine-print">
            Updated {new Date(result.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </>
  );
}
