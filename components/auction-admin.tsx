"use client";
import { useState, type FormEvent } from "react";
import { Save, RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  auctionSettingsSchema,
  type AuctionAdminSnapshot,
  type AuctionMarket,
  type AuctionSettings,
} from "@/lib/auction/contracts";

export function AuctionAdmin({
  initial,
  canManage,
}: {
  initial: AuctionAdminSnapshot;
  canManage: boolean;
}): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(initial),
    [settings, setSettings] = useState<AuctionSettings>(initial.settings);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [draft, setDraft] = useState({
    clientBuild: "",
    region: "EU",
    realmId: "",
    auctionHouseType: "alliance",
    coverage: "regional",
  });
  async function request(save: boolean): Promise<void> {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (save) {
        const valid = auctionSettingsSchema.safeParse(settings);
        if (!valid.success)
          throw new Error(
            valid.error.issues[0]?.message ?? "Invalid configuration.",
          );
      }
      const response = await fetch(
        "/api/admin/auction",
        save
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ version: snapshot.version, settings }),
            }
          : { cache: "no-store" },
      );
      if (!response.ok) {
        const body = (await response.json()) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? "Request failed.");
      }
      const next = (await response.json()) as AuctionAdminSnapshot;
      setSnapshot(next);
      setSettings(next.settings);
      setStatus(save ? "Configuration saved." : "Status refreshed.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  function change<K extends keyof AuctionSettings>(
    key: K,
    value: AuctionSettings[K],
  ): void {
    setSettings((current) => ({ ...current, [key]: value }));
  }
  function addMarket(): void {
    const value = {
      clientProduct: "wow_classic_beta",
      clientBuild: Number(draft.clientBuild),
      region: draft.region,
      realmId: draft.realmId.trim(),
      auctionHouseType: draft.auctionHouseType,
      enabled: true,
      coverage: draft.coverage,
    };
    const parsed = auctionSettingsSchema.safeParse({
      ...settings,
      mode: "preview",
      markets: [...settings.markets, value],
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid market.");
      return;
    }
    setSettings({ ...parsed.data, reviewedPilot: false });
    setDraft({ ...draft, clientBuild: "", realmId: "" });
    setError("");
  }
  const online = snapshot.health.online;
  const numeric: readonly {
    key:
      | "minimumObservations"
      | "minimumHistoryHours"
      | "minimumQuality"
      | "minimumListings"
      | "freshMinutes"
      | "dailyLimit"
      | "minimumIntervalHours";
    label: string;
    min: number;
    max: number;
  }[] = [
    {
      key: "minimumObservations",
      label: "Minimum history buckets",
      min: 6,
      max: 336,
    },
    {
      key: "minimumHistoryHours",
      label: "Minimum history span (hours)",
      min: 24,
      max: 168,
    },
    {
      key: "minimumQuality",
      label: "Minimum quality score (0-10000)",
      min: 5000,
      max: 10000,
    },
    {
      key: "minimumListings",
      label: "Minimum current listings",
      min: 3,
      max: 100,
    },
    {
      key: "freshMinutes",
      label: "Freshness window (minutes)",
      min: 5,
      max: 60,
    },
    {
      key: "dailyLimit",
      label: "Reports per market / 24 hours",
      min: 1,
      max: 6,
    },
    {
      key: "minimumIntervalHours",
      label: "Minimum time between reports (hours)",
      min: 1,
      max: 24,
    },
  ];
  return (
    <div className="auction-admin">
      <div className="auction-header">
        <h1>Auction House</h1>
        <button
          className="button secondary"
          type="button"
          title="Refresh status"
          aria-label="Refresh status"
          disabled={busy}
          onClick={(): void => {
            void request(false);
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="auction-health">
        <span className="badge">
          {online ? "Worker online" : "Offline or stale"}
        </span>
        <span>{snapshot.health.status}</span>
        <time>
          {snapshot.health.checkedAt
            ? new Date(snapshot.health.checkedAt).toLocaleString()
            : "No checks recorded"}
        </time>
      </div>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>): void => {
          event.preventDefault();
          void request(true);
        }}
      >
        <fieldset disabled={!canManage || busy}>
          <legend>Publication controls</legend>
          <div className="auction-modes">
            {(["paused", "preview", "live"] as const).map((mode) => (
              <label key={mode}>
                <input
                  type="radio"
                  name="mode"
                  value={mode}
                  checked={settings.mode === mode}
                  onChange={(): void => change("mode", mode)}
                />
                {mode === "preview"
                  ? "Private preview"
                  : mode === "paused"
                    ? "Paused"
                    : "Live"}
              </label>
            ))}
          </div>
          <div className="form-grid">
            <label>
              Destination forum ID
              <input
                value={settings.channelId ?? ""}
                onChange={(event): void =>
                  change("channelId", event.target.value || null)
                }
                inputMode="numeric"
              />
            </label>
            {numeric.map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  required
                  value={settings[field.key]}
                  onChange={(event): void =>
                    change(field.key, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
          <label className="auction-check">
            <input
              type="checkbox"
              checked={settings.reviewedPilot}
              onChange={(event): void =>
                change("reviewedPilot", event.target.checked)
              }
            />
            Private pilot and market coverage reviewed
          </label>
        </fieldset>
        <fieldset disabled={!canManage || busy}>
          <legend>Allowed markets</legend>
          {!settings.markets.length && <p>No markets configured.</p>}
          <ul className="auction-markets">
            {settings.markets.map((market: AuctionMarket, index: number) => (
              <li
                key={`${market.clientBuild}-${market.region}-${market.realmId}-${market.auctionHouseType}`}
              >
                <label className="auction-check">
                  <input
                    type="checkbox"
                    checked={market.enabled}
                    aria-label={`Enable ${market.region} ${market.realmId} ${market.auctionHouseType}`}
                    onChange={(event): void =>
                      change(
                        "markets",
                        settings.markets.map((m, i) =>
                          i === index
                            ? { ...m, enabled: event.target.checked }
                            : m,
                        ),
                      )
                    }
                  />
                  <span>
                    {market.region} / {market.realmId} /{" "}
                    {market.auctionHouseType}
                    <small>
                      Forever beta, build {market.clientBuild} |{" "}
                      {market.coverage === "uploaded-beta-market"
                        ? "Uploaded market only"
                        : "Regional coverage"}
                    </small>
                  </span>
                </label>
                <button
                  type="button"
                  className="button secondary"
                  aria-label={`Remove ${market.region} ${market.realmId} ${market.auctionHouseType}`}
                  title="Remove market"
                  onClick={(): void => {
                    setSettings({
                      ...settings,
                      mode: "preview",
                      reviewedPilot: false,
                      markets: settings.markets.filter((_, i) => i !== index),
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="form-grid">
            <label>
              <span id="auction-coverage-label">Coverage</span>
              <select
                aria-labelledby="auction-coverage-label"
                value={draft.coverage}
                onChange={(event): void =>
                  setDraft({
                    ...draft,
                    coverage: event.target.value,
                    region:
                      event.target.value === "uploaded-beta-market"
                        ? "UNKNOWN"
                        : "EU",
                  })
                }
              >
                <option value="regional">Regional market</option>
                <option value="uploaded-beta-market">
                  Uploaded beta market only
                </option>
              </select>
            </label>
            <label>
              Client build
              <input
                type="number"
                min="1"
                value={draft.clientBuild}
                onChange={(event): void =>
                  setDraft({ ...draft, clientBuild: event.target.value })
                }
              />
            </label>
            <label>
              <span id="auction-region-label">Region</span>
              <select
                aria-labelledby="auction-region-label"
                value={draft.region}
                disabled={draft.coverage === "uploaded-beta-market"}
                onChange={(event): void =>
                  setDraft({ ...draft, region: event.target.value })
                }
              >
                {["EU", "NA", "OCE", "UNKNOWN"].map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
            </label>
            <label>
              Realm ID
              <input
                value={draft.realmId}
                maxLength={128}
                onChange={(event): void =>
                  setDraft({ ...draft, realmId: event.target.value })
                }
              />
            </label>
            <label>
              Auction House
              <select
                value={draft.auctionHouseType}
                onChange={(event): void =>
                  setDraft({ ...draft, auctionHouseType: event.target.value })
                }
              >
                {["alliance", "horde", "neutral"].map((faction) => (
                  <option key={faction}>{faction}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="button secondary"
            disabled={
              !draft.clientBuild ||
              !draft.realmId ||
              settings.markets.length >= 12
            }
            onClick={addMarket}
          >
            <Plus size={16} />
            Add market
          </button>
        </fieldset>
        {canManage && (
          <button className="button" type="submit" disabled={busy}>
            <Save size={16} />
            {busy ? "Saving..." : "Save configuration"}
          </button>
        )}
      </form>
      <section className="auction-runs">
        <h2>Recent checks and reports</h2>
        {!snapshot.runs.length ? (
          <p>No checks recorded.</p>
        ) : (
          snapshot.runs.map((run) => (
            <article key={run.id}>
              <div className="auction-run-heading">
                <h3>{run.marketKey}</h3>
                <span className="badge">{run.status}</span>
              </div>
              <p>{run.reason}</p>
              <time>
                Scan: {new Date(run.sourceAt).toLocaleString()} | Check:{" "}
                {new Date(run.createdAt).toLocaleString()}
              </time>
              <details>
                <summary>
                  {run.mode === "preview"
                    ? "Private preview"
                    : "Report content"}
                </summary>
                <pre>{run.content}</pre>
              </details>
              {run.threadId && (
                <a
                  href={`https://discord.com/channels/1554316932948172940/${run.threadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Discord post
                </a>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
