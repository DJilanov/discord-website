"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  ExternalLink,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import type { SerializedSnapshot } from "@/lib/discord-bridge/admin";
import type { Control, Mode } from "@/lib/discord-bridge/contracts";
import { maxBridgePairs, messageLink } from "@/lib/discord-bridge/contracts";

const tabs = [
  "Connections",
  "Shared channels",
  "Participation",
  "Delivery",
  "Operations",
] as const;
type Tab = (typeof tabs)[number];
interface ActionDialog {
  title: string;
  bridgeId?: string;
  bridgeVersion?: number;
  action?: Control["action"];
  mode?: Mode;
  rootId?: string;
  actorId?: string;
  side?: "a" | "b";
  warning: string;
}
function label(value: string): string {
  return value.replaceAll("_", " ");
}
function time(value: string | null): string {
  return value
    ? `${new Date(value).toLocaleString("en-GB", { timeZone: "UTC" })} UTC`
    : "Not yet";
}

export function DiscordBridgeAdmin({
  initial,
}: {
  initial: SerializedSnapshot;
}): React.JSX.Element {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("Connections");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState<ActionDialog | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(initial.observedAt);
  const bridge = data.bridges.find((pair) => pair.id === data.selectedBridgeId);
  const availableSlots =
    maxBridgePairs -
    data.bridges.filter((pair) => pair.state !== "retired").length;
  const online =
    data.runtime.gateway === "ready" &&
    !!data.runtime.heartbeatAt &&
    now - Date.parse(data.runtime.heartbeatAt) < 60000;
  const pending = data.cleanupCount;

  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (dialog || busy || refreshing) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const query = new URLSearchParams({
        offset: String(data.deliveryOffset),
      });
      if (data.selectedBridgeId) query.set("bridgeId", data.selectedBridgeId);
      void fetch(`/api/admin/discord/status?${query}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok)
            throw new Error(
              "Status refresh failed. Displayed data may be out of date.",
            );
          const next = (await response.json()) as SerializedSnapshot;
          if (!controller.signal.aborted) setData(next);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError(
              "Status refresh failed. Displayed data may be out of date.",
            );
        });
    }, 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [dialog, busy, refreshing, data.deliveryOffset, data.selectedBridgeId]);

  async function refresh(
    offset = data.deliveryOffset,
    selectedId: string | null = data.selectedBridgeId,
  ): Promise<void> {
    setRefreshing(true);
    try {
      const query = new URLSearchParams({ offset: String(offset) });
      if (selectedId) query.set("bridgeId", selectedId);
      const response = await fetch(`/api/admin/discord/status?${query}`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Status is unavailable. Your last loaded configuration remains below.",
        );
      setData((await response.json()) as SerializedSnapshot);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Status is unavailable.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  async function send(action: string, payload: unknown): Promise<void> {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/discord/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "The change could not be completed.");
      setDialog(null);
      setSuccess("Change recorded.");
      await refresh(
        action === "draft" ? 0 : data.deliveryOffset,
        action === "draft" ? null : data.selectedBridgeId,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "The change could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function switchTab(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    setTab(tabs[next]);
    document.getElementById(`bridge-tab-${next}`)?.focus();
  }
  async function submitDialog(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") || "");
    if (dialog.mode) {
      await send("mode", {
        mode: dialog.mode,
        version: data.runtime.version,
        reason,
      });
      return;
    }
    if (!dialog.bridgeId || !dialog.bridgeVersion) return;
    const payload: Record<string, unknown> = {
      id: dialog.bridgeId,
      version: dialog.bridgeVersion,
      action: dialog.action,
      reason,
      rootId: dialog.rootId,
      actorId: dialog.actorId,
      side: dialog.side,
    };
    if (dialog.action === "approve" || dialog.action === "resolve")
      payload.link = String(form.get("link") || "");
    if (dialog.action === "activate")
      payload.approvals = {
        membership: true,
        retention: true,
        moderation: true,
        tests: true,
      };
    if (dialog.action === "pilot")
      payload.testerIds = String(form.get("testerIds") || "")
        .split(/\s+/)
        .filter(Boolean);
    if (dialog.action === "configure") {
      payload.reviewRequired = form.get("reviewRequired") === "on";
      payload.moderatorIds = form.getAll("moderatorIds").map(String);
      payload.blockedTerms = String(form.get("blockedTerms") || "")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    await send("control", payload);
  }
  const command = (
    title: string,
    action: Control["action"],
    warning: string,
    extra: Partial<ActionDialog> = {},
  ): void => {
    if (busy || refreshing || !bridge) return;
    setDialog({
      title,
      action,
      warning,
      bridgeId: bridge.id,
      bridgeVersion: bridge.version,
      ...extra,
    });
  };

  return (
    <div className="bridge-workspace">
      <header className="bridge-heading">
        <div>
          <span className="eyebrow">WoWForeverBot</span>
          <h1>Discord bridge</h1>
        </div>
        <button
          className="button secondary"
          onClick={() => void refresh()}
          disabled={refreshing || busy}
          title="Refresh bridge status"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "bridge-spinning" : ""}
          />
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </header>
      {error && !dialog && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="bridge-feedback" role="status">
          <Check size={16} />
          {success}
        </p>
      )}
      {data.bridges.length > 0 && (
        <label className="field bridge-pair-selector">
          <span id="bridge-pair-label">Channel pair</span>
          <select
            aria-labelledby="bridge-pair-label"
            value={data.selectedBridgeId || ""}
            disabled={busy || refreshing || !!dialog}
            onChange={(event) => void refresh(0, event.target.value)}
          >
            {data.bridges.map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.name} ({pair.state})
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="bridge-summary">
        <div>
          <span>Worker</span>
          <strong className={online ? "bridge-good" : ""}>
            {online ? "Connected" : "Offline or stale"}
          </strong>
        </div>
        <div>
          <span>Publication</span>
          <strong>
            {(bridge?.state === "active" ||
              (bridge?.state === "pilot" &&
                !!bridge.pilotUntil &&
                Date.parse(bridge.pilotUntil) > now)) &&
            data.runtime.mode === "running" &&
            online
              ? bridge?.state === "pilot"
                ? "Restricted test"
                : "Active"
              : "Stopped"}
          </strong>
        </div>
        <div>
          <span>Unresolved cleanup</span>
          <strong>
            {pending}
            {pending === 100 ? "+" : ""}
          </strong>
        </div>
      </div>
      <div
        className="bridge-tabs"
        role="tablist"
        aria-label="Discord bridge views"
      >
        {tabs.map((name, index) => (
          <button
            key={name}
            id={`bridge-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={tab === name}
            aria-controls="bridge-panel"
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(event) => switchTab(event, index)}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        id="bridge-panel"
        role="tabpanel"
        aria-labelledby={`bridge-tab-${tabs.indexOf(tab)}`}
        tabIndex={0}
        className="bridge-panel"
      >
        {tab === "Connections" && (
          <>
            <h2>Connection status</h2>
            <dl className="bridge-facts">
              <dt>Application</dt>
              <dd>
                <code>{data.applicationId}</code>
              </dd>
              <dt>Gateway</dt>
              <dd>{label(data.runtime.gateway)}</dd>
              <dt>Heartbeat</dt>
              <dd>{time(data.runtime.heartbeatAt)}</dd>
              <dt>Worker build</dt>
              <dd>{data.runtime.build || "Not installed"}</dd>
              <dt>Command endpoint</dt>
              <dd>{data.setupEnabled ? "Enabled" : "Disabled"}</dd>
              <dt>Last coverage gap</dt>
              <dd>{time(data.runtime.gapAt)}</dd>
              <dt>Global mode</dt>
              <dd>{label(data.runtime.mode)}</dd>
              <dt>Operational issue</dt>
              <dd>
                {data.runtime.error
                  ? label(data.runtime.error)
                  : "None recorded"}
              </dd>
            </dl>
            <div className="bridge-policy-links">
              <a href="/bot/shared-channels" target="_blank" rel="noreferrer">
                Shared-channel policy <ExternalLink size={14} />
              </a>
              <a href="/bot/privacy" target="_blank" rel="noreferrer">
                Bot privacy <ExternalLink size={14} />
              </a>
            </div>
          </>
        )}
        {tab === "Shared channels" && (
          <>
            {bridge && bridge.state !== "retired" ? (
              <>
                <div className="bridge-section-heading">
                  <h2>{bridge.name}</h2>
                  <span className="badge">{bridge.state}</span>
                </div>
                <div className="bridge-pair">
                  <div>
                    <span>KFC Global Pugs</span>
                    <code>{bridge.channelA}</code>
                  </div>
                  <ArrowLeftRight size={22} aria-label="Two-way" />
                  <div>
                    <span>WoW Forever Discord</span>
                    <code>{bridge.channelB}</code>
                  </div>
                </div>
                <dl className="bridge-facts">
                  <dt>Direction</dt>
                  <dd>Two-way</dd>
                  <dt>Moderation</dt>
                  <dd>
                    {bridge.reviewRequired
                      ? "Every new message requires review"
                      : "Automatic, with eligibility checks"}
                  </dd>
                  <dt>Validation</dt>
                  <dd>{time(bridge.validatedAt)}</dd>
                  <dt>Participation generation</dt>
                  <dd>{bridge.generation}</dd>
                  {bridge.state === "pilot" && (
                    <>
                      <dt>Test ends</dt>
                      <dd>{time(bridge.pilotUntil)}</dd>
                      <dt>Approved testers</dt>
                      <dd>{bridge.pilotActorIds.length}</dd>
                    </>
                  )}
                  <dt>State reason</dt>
                  <dd>{bridge.reason ? label(bridge.reason) : "None"}</dd>
                  <dt>KFC notice</dt>
                  <dd>
                    {bridge.noticeA ? (
                      <a href={bridge.noticeA} target="_blank" rel="noreferrer">
                        Approved notice <ExternalLink size={13} />
                      </a>
                    ) : (
                      "Approval pending"
                    )}
                  </dd>
                  <dt>Forever notice</dt>
                  <dd>
                    {bridge.noticeB ? (
                      <a href={bridge.noticeB} target="_blank" rel="noreferrer">
                        Approved notice <ExternalLink size={13} />
                      </a>
                    ) : (
                      "Approval pending"
                    )}
                  </dd>
                </dl>
                <div className="button-row">
                  {data.canManage && (
                    <>
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          ["active", "pilot", "retiring"].includes(bridge.state)
                        }
                        onClick={() =>
                          command(
                            "Bridge settings",
                            "configure",
                            "Changes invalidate approvals and existing participation.",
                          )
                        }
                      >
                        <Settings2 size={16} />
                        Settings
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          ["active", "pilot", "retiring"].includes(bridge.state)
                        }
                        onClick={() =>
                          command(
                            "Approve KFC endpoint",
                            "approve",
                            "Confirm this exact channel, its other-server audience and its sharing notice are approved by KFC staff. Existing messages will not be imported.",
                            { side: "a" },
                          )
                        }
                      >
                        <ShieldCheck size={16} />
                        KFC approval
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          ["active", "pilot", "retiring"].includes(bridge.state)
                        }
                        onClick={() =>
                          command(
                            "Approve Forever endpoint",
                            "approve",
                            "Confirm this exact channel, its other-server audience and its sharing notice are approved by Forever staff. Existing messages will not be imported.",
                            { side: "b" },
                          )
                        }
                      >
                        <ShieldCheck size={16} />
                        Forever approval
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          !online ||
                          !bridge.approvalA ||
                          !bridge.approvalB ||
                          ["active", "pilot", "retiring"].includes(bridge.state)
                        }
                        onClick={() =>
                          command(
                            "Validate endpoints",
                            "validate",
                            "The worker will check the exact channels, notices, command registration and permissions.",
                          )
                        }
                      >
                        <RefreshCw size={16} />
                        Validate
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          !online ||
                          bridge.state !== "ready" ||
                          !bridge.reviewRequired ||
                          data.runtime.mode !== "running" ||
                          !data.setupEnabled
                        }
                        onClick={() =>
                          command(
                            "Start restricted test",
                            "pilot",
                            "Only the listed Discord accounts may opt in for one hour, with manual review and at most 20 messages per pair. The other channel's audience can read approved test copies. Ending the test withdraws test participation and queues removal. This does not approve general publication or attest that live tests passed.",
                          )
                        }
                      >
                        <Play size={16} />
                        Test pilot
                      </button>
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          !online ||
                          bridge.state !== "ready" ||
                          data.runtime.mode !== "running" ||
                          !data.setupEnabled
                        }
                        onClick={() =>
                          command(
                            "Activate shared channels",
                            "activate",
                            "This enables two-way delivery for members who explicitly opt in. Existing opt-ins do not carry into a new activation.",
                          )
                        }
                      >
                        <Play size={16} />
                        Activate
                      </button>
                    </>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy || bridge.state === "retiring"}
                    onClick={() =>
                      command(
                        "Pause publication",
                        "pause",
                        "New copies and edits stop. Removal requests continue. Members must opt in again after reactivation.",
                      )
                    }
                  >
                    <Pause size={16} />
                    Pause
                  </button>
                </div>
              </>
            ) : !data.canManage ? (
              <p>No shared channels are assigned to your account.</p>
            ) : null}
            {data.canManage && availableSlots > 0 && (
              <>
                <h2>New shared-channel pair</h2>
                <form
                  className="bridge-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void send("draft", {
                      name: form.get("name"),
                      channelA: form.get("channelA"),
                      channelB: form.get("channelB"),
                      direction: "two_way",
                    });
                  }}
                >
                  <label className="field">
                    <span>Pair name</span>
                    <input
                      name="name"
                      required
                      minLength={3}
                      maxLength={80}
                      defaultValue="Forever shared chat"
                    />
                  </label>
                  <label className="field">
                    <span>KFC channel ID</span>
                    <input
                      name="channelA"
                      inputMode="numeric"
                      required
                      pattern="[1-9][0-9]{16,19}"
                    />
                  </label>
                  <label className="field">
                    <span>WoW Forever channel ID</span>
                    <input
                      name="channelB"
                      inputMode="numeric"
                      required
                      pattern="[1-9][0-9]{16,19}"
                    />
                  </label>
                  <p className="bridge-muted">
                    <ArrowLeftRight size={16} />
                    Two-way · Draft · Manual review
                  </p>
                  <button className="button primary" disabled={busy}>
                    <Plus size={16} />
                    {busy ? "Creating" : "Create draft"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
        {tab === "Participation" && (
          <>
            <h2>Participant consent</h2>
            {!data.consents.length ? (
              <p className="bridge-empty">No participation recorded.</p>
            ) : (
              <div className="bridge-list">
                {data.consents.map((consent) => (
                  <article key={`${consent.guildId}:${consent.actorId}`}>
                    <div>
                      <strong>
                        <code>{consent.actorId}</code>
                      </strong>
                      <span>
                        {consent.guildId === bridge?.guildA
                          ? "KFC"
                          : "WoW Forever"}
                      </span>
                      <small>
                        {consent.blocked
                          ? "Staff blocked"
                          : consent.withdrawnAt ||
                              consent.generation !== bridge?.generation
                            ? "Not participating"
                            : "Opted in"}{" "}
                        · {time(consent.optedAt)}
                      </small>
                    </div>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        command(
                          consent.blocked
                            ? "Unblock participant"
                            : "Block participant",
                          consent.blocked ? "unblock" : "block",
                          consent.blocked
                            ? "The participant must opt in again; unblocking does not restore consent."
                            : "Sharing stops in both directions for this participant. Managed copies and reply chains are queued for removal.",
                          { actorId: consent.actorId },
                        )
                      }
                    >
                      <ShieldCheck size={16} />
                      {consent.blocked ? "Unblock" : "Block"}
                    </button>
                  </article>
                ))}
              </div>
            )}
            <p className="bridge-muted">
              Latest 100 participation records. No member roster is collected.
            </p>
          </>
        )}
        {tab === "Delivery" && (
          <>
            <h2>Delivery &amp; cleanup</h2>
            <div className="bridge-counts">
              {data.totals.map((value) => (
                <span key={value.state}>
                  {label(value.state)} <strong>{value.count}</strong>
                </span>
              ))}
            </div>
            {!data.delivery.length ? (
              <p className="bridge-empty">No shared messages recorded.</p>
            ) : (
              <div className="bridge-list">
                {data.delivery.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>
                        {item.guildId === bridge?.guildA
                          ? "KFC to Forever"
                          : "Forever to KFC"}
                      </strong>
                      <span>
                        {label(item.state)} / {label(item.deliveryState)}
                      </span>
                      <small>
                        {time(item.createdAt)}
                        {item.error ? ` · ${label(item.error)}` : ""}
                      </small>
                      <div className="bridge-source-links">
                        <a
                          href={messageLink(
                            item.guildId,
                            item.channelId,
                            item.messageId,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Original <ExternalLink size={13} />
                        </a>
                        {item.outputId && (
                          <a
                            href={messageLink(
                              item.outputGuild,
                              item.outputChannel,
                              item.outputId,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Bot copy <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="bridge-row-actions">
                      {item.state === "held" && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            command(
                              "Approve message",
                              "review",
                              "Confirm you reviewed the original in Discord. New revisions and messages older than two minutes cannot use this approval.",
                              { rootId: item.id },
                            )
                          }
                        >
                          <Check size={15} />
                          Approve
                        </button>
                      )}
                      {item.deliveryState === "uncertain" && data.canManage && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            command(
                              "Resolve uncertain delivery",
                              "resolve",
                              "Provide the exact bot message link. The worker verifies the author, channel and relay reference. It will not send another copy.",
                              { rootId: item.id },
                            )
                          }
                        >
                          <Unplug size={15} />
                          Resolve
                        </button>
                      )}
                      <button
                        className="button secondary"
                        disabled={
                          busy ||
                          ["removed", "suppressed"].includes(item.deliveryState)
                        }
                        onClick={() =>
                          command(
                            "Remove managed copy",
                            "suppress",
                            "The bot copy and its managed reply chain will be removed. Human originals remain.",
                            { rootId: item.id },
                          )
                        }
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="bridge-muted">
              {data.deliveryCount} records. Prioritized by uncertain delivery,
              review and cleanup.
            </p>
            <nav className="button-row" aria-label="Delivery pages">
              <button
                type="button"
                className="button secondary"
                aria-label="Previous delivery page"
                title="Previous delivery page"
                disabled={refreshing || data.deliveryOffset === 0}
                onClick={() =>
                  void refresh(Math.max(0, data.deliveryOffset - 100))
                }
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                Page {Math.floor(data.deliveryOffset / 100) + 1} of{" "}
                {Math.max(1, Math.ceil(data.deliveryCount / 100))}
              </span>
              <button
                type="button"
                className="button secondary"
                aria-label="Next delivery page"
                title="Next delivery page"
                disabled={
                  refreshing || data.deliveryOffset + 100 >= data.deliveryCount
                }
                onClick={() => void refresh(data.deliveryOffset + 100)}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          </>
        )}
        {tab === "Operations" && (
          <>
            <h2>Runtime controls</h2>
            <p className="bridge-muted">
              Current mode: <strong>{label(data.runtime.mode)}</strong>
            </p>
            {data.canManage ? (
              <div className="bridge-operations">
                <div>
                  <h3>Cleanup only</h3>
                  <p>
                    Stop publication. Continue removal requests and endpoint
                    validation.
                  </p>
                  <button
                    className="button secondary"
                    disabled={busy || data.runtime.mode === "cleanup_only"}
                    onClick={() =>
                      setDialog({
                        title: "Switch to cleanup only",
                        mode: "cleanup_only",
                        warning:
                          "Publication stops for every pair. Cleanup continues. Reactivation requires validation and new opt-ins.",
                      })
                    }
                  >
                    <Pause size={16} />
                    Cleanup only
                  </button>
                </div>
                <div>
                  <h3>Allow publication</h3>
                  <p>
                    Enable the runtime. Channel activation remains a separate
                    approval.
                  </p>
                  <button
                    className="button secondary"
                    disabled={
                      busy || !online || data.runtime.mode === "running"
                    }
                    onClick={() =>
                      setDialog({
                        title: "Enable runtime",
                        mode: "running",
                        warning:
                          "The runtime can deliver messages from active, approved pairs. Draft or paused channels remain stopped.",
                      })
                    }
                  >
                    <Play size={16} />
                    Enable runtime
                  </button>
                </div>
                <div>
                  <h3>Hard stop</h3>
                  <p>
                    Stop all Discord writes, including removals and command
                    follow-ups.
                  </p>
                  <button
                    className="button danger"
                    disabled={busy || data.runtime.mode === "hard_stop"}
                    onClick={() =>
                      setDialog({
                        title: "Hard stop all writes",
                        mode: "hard_stop",
                        warning:
                          "Copies already sent remain in Discord. Cleanup is blocked until this stop is lifted. A request already accepted by Discord may still complete.",
                      })
                    }
                  >
                    <CircleStop size={16} />
                    Hard stop
                  </button>
                </div>
                {bridge && bridge.state !== "retired" && (
                  <div>
                    <h3>Retire channel pair</h3>
                    <p>
                      Remove managed copies and close participation. Uncertain
                      copies need resolution.
                    </p>
                    <button
                      className="button danger"
                      disabled={busy || bridge.state === "retiring"}
                      onClick={() =>
                        command(
                          "Retire shared channels",
                          "retire",
                          "This permanently closes the pair after cleanup. Originals remain. Unresolved outputs prevent retirement from completing.",
                        )
                      }
                    >
                      <Trash2 size={16} />
                      Retire
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p>Runtime controls require an owner or administrator.</p>
            )}
          </>
        )}
      </section>
      <dialog
        ref={dialogRef}
        className="bridge-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setDialog(null);
        }}
        aria-labelledby="bridge-dialog-title"
      >
        <form onSubmit={(event) => void submitDialog(event)}>
          <div className="bridge-section-heading">
            <h2 id="bridge-dialog-title">{dialog?.title}</h2>
            <button
              className="bridge-icon-button"
              type="button"
              onClick={() => setDialog(null)}
              disabled={busy}
              aria-label="Close dialog"
              title="Close dialog"
            >
              <X size={20} />
            </button>
          </div>
          <p>{dialog?.warning}</p>
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          {(dialog?.action === "approve" || dialog?.action === "resolve") && (
            <label className="field">
              <span>Exact Discord message link</span>
              <input type="url" name="link" required maxLength={200} />
            </label>
          )}
          {dialog?.action === "activate" && (
            <fieldset className="bridge-checks">
              <legend>Launch approvals</legend>
              {[
                "Both-server membership rule accepted",
                "Retention and recovery policy approved",
                "Moderators assigned to both audiences",
                "Isolated Discord lifecycle tests passed",
              ].map((text) => (
                <label key={text}>
                  <input type="checkbox" required />
                  {text}
                </label>
              ))}
            </fieldset>
          )}
          {dialog?.action === "pilot" && (
            <label className="field">
              <span>Tester Discord IDs (one per line, maximum 5)</span>
              <textarea name="testerIds" required rows={5} maxLength={104} />
            </label>
          )}
          {dialog?.action === "configure" && (
            <>
              <label className="bridge-check">
                <input
                  type="checkbox"
                  name="reviewRequired"
                  defaultChecked={bridge?.reviewRequired}
                />
                Require review for every new message
              </label>
              <fieldset className="bridge-checks">
                <legend>Approved moderators for both audiences</legend>
                {data.moderators.length ? (
                  data.moderators.map((moderator) => (
                    <label key={moderator.id}>
                      <input
                        type="checkbox"
                        name="moderatorIds"
                        value={moderator.id}
                        defaultChecked={bridge?.moderatorIds.includes(
                          moderator.id,
                        )}
                      />
                      {moderator.name}
                    </label>
                  ))
                ) : (
                  <p>No active moderator accounts.</p>
                )}
              </fieldset>
              <label className="field">
                <span>Prohibited text, one phrase per line</span>
                <textarea
                  name="blockedTerms"
                  defaultValue={bridge?.blockedTerms.join("\n")}
                  rows={4}
                />
              </label>
            </>
          )}
          <label className="field">
            <span>Reason for audit log</span>
            <textarea
              name="reason"
              required
              minLength={5}
              maxLength={300}
              rows={2}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              <Check size={16} />
              {busy ? "Saving" : "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
