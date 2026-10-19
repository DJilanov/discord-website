"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check, X, ExternalLink } from "lucide-react";
import { postRaid } from "./client-data";
import type { CatalogBundle } from "@/lib/raids/catalog";
import { gameLabels } from "@/lib/raids/games";

export interface StagedCatalogView {
  id: string;
  status: string;
  checksum: string;
  warnings: string[];
  bundle: CatalogBundle;
  reviewNote: string | null;
}
export function CatalogAdmin({
  catalogs,
  canManage,
}: {
  catalogs: StagedCatalogView[];
  canManage: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(body: unknown): Promise<void> {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await postRaid("/api/admin/raids/catalog", body);
      setSuccess("Catalog saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function stage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("bundle");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) {
      setError("Select a JSON source bundle smaller than 5 MiB.");
      return;
    }
    try {
      const bundle: unknown = JSON.parse(await file.text());
      await send({ operation: "stage", bundle });
    } catch {
      setError("The source bundle is not valid JSON.");
    }
  }
  return (
    <div className="raid-admin">
      <h1>Forever &amp; TBC raid catalogs</h1>
      <p className="muted">
        Private pilot. Source facts require review before use in an event.
      </p>
      {canManage && (
        <form className="raid-form" onSubmit={(event) => void stage(event)}>
          <label>
            Authorized source bundle
            <input
              name="bundle"
              type="file"
              accept="application/json,.json"
              required
            />
          </label>
          <button className="button primary" disabled={busy}>
            <Upload size={16} />
            Stage catalog
          </button>
        </form>
      )}
      {error && (
        <p className="raid-notice error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="raid-notice success" role="status">
          {success}
        </p>
      )}
      {!catalogs.length && (
        <p className="raid-empty muted">No source catalogs staged.</p>
      )}
      {catalogs.map((catalog) => (
        <section className="raid-catalog-review" key={catalog.id}>
          <div className="raid-toolbar">
            <h2>{catalog.bundle.raidName}</h2>
            <span className="raid-badge">{catalog.status}</span>
          </div>
          <p className="fine-print">
            {gameLabels[catalog.bundle.game]} | {catalog.bundle.items.length}{" "}
            items | {catalog.bundle.availability} | {catalog.bundle.coverage}{" "}
            coverage | {catalog.checksum.slice(0, 12)}
          </p>
          <a
            className="text-link"
            href={catalog.bundle.raidSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Review raid source
            <ExternalLink size={14} />
          </a>
          <ul>
            {catalog.warnings.map((warning) => (
              <li key={warning} className="muted">
                {warning}
              </li>
            ))}
          </ul>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Catalog items"
          >
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Loot source</th>
                  <th>Evidence</th>
                  <th>Classes</th>
                </tr>
              </thead>
              <tbody>
                {catalog.bundle.items.map((item) => (
                  <tr key={item.itemId}>
                    <td>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        {item.name} ({item.itemId})
                      </a>
                    </td>
                    <td>
                      {item.lootSource} / {item.kind}
                    </td>
                    <td>{item.evidence}</td>
                    <td>{item.classes.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {catalog.reviewNote && (
            <p className="raid-notice">{catalog.reviewNote}</p>
          )}
          {canManage && catalog.status === "staged" && (
            <form
              className="raid-form"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget),
                  button = (event.nativeEvent as SubmitEvent).submitter;
                void send({
                  operation: "review",
                  id: catalog.id,
                  decision:
                    button instanceof HTMLButtonElement
                      ? button.value
                      : "rejected",
                  note: String(data.get("note")),
                });
              }}
            >
              <label>
                Review evidence & decision
                <input name="note" required minLength={10} maxLength={1000} />
              </label>
              <div className="raid-toolbar">
                <button
                  className="button primary"
                  name="decision"
                  value="published"
                  disabled={busy || catalog.bundle.availability !== "confirmed"}
                >
                  <Check size={16} />
                  Publish reviewed catalog
                </button>
                <button
                  className="button danger"
                  name="decision"
                  value="rejected"
                  disabled={busy}
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </form>
          )}
        </section>
      ))}
    </div>
  );
}
