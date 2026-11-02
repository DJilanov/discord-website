"use client";

import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { EventView } from "@/lib/raids/contracts";
import {
  confirmationDashboardSchema,
  defaultPreparation,
  rosterPreviewSchema,
  type ConfirmationDashboard,
  type InvitationView,
  type RosterPreview,
  type RaidPreparation,
} from "@/lib/raids/roster-confirmation-contracts";
import { classPreparation } from "@/lib/raids/roster-confirmation-contracts";
import { postRaid, useRaidClock } from "./client-data";
import "./roster-confirmations.css";

function label(state: string): string {
  return (
    (
      {
        pending: "Awaiting reply",
        confirmed: "Attendance confirmed",
        declined: "Declined",
        manual: "Verified by leader",
        expired: "No response",
        changed: "Updated invitation needed",
        revoked: "Revoked",
      } as Record<string, string>
    )[state] ?? state
  );
}
function time(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function localDate(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function Preparation({
  invitation,
}: {
  invitation: InvitationView;
}): React.JSX.Element {
  const prep = invitation.preparation,
    role = invitation.offer.role;
  return (
    <details className="roster-preparation">
      <summary>Raid preparation</summary>
      <p className="roster-prep-text">{prep.general}</p>
      {role !== "participant" && prep[role] && (
        <p className="roster-prep-text">{prep[role]}</p>
      )}
      <p>{classPreparation(invitation.offer.character.className)}</p>
      <p>
        Be ready{" "}
        {time(
          new Date(
            Date.parse(invitation.offer.startsAt) - prep.musterMinutes * 60000,
          ).toISOString(),
        )}
        . {prep.meeting}
      </p>
      {prep.voiceUrl && <a href={prep.voiceUrl}>Voice channel</a>}
      {prep.guideUrl && (
        <a href={prep.guideUrl} target="_blank" rel="noreferrer">
          Read raid tactics
        </a>
      )}
      <p>
        {invitation.offer.reserveLimit} SR ·{" "}
        {invitation.offer.allowDuplicates
          ? "duplicates allowed"
          : "unique items"}
        .{" "}
        {invitation.offer.hardReserves.length
          ? `Hard reserves: ${invitation.offer.hardReserves.join(", ")}`
          : "No named hard reserves."}
      </p>
    </details>
  );
}
export function RosterConfirmations({
  event,
  initialNow,
}: {
  event: EventView;
  initialNow: number;
}): React.JSX.Element {
  const router = useRouter(),
    endpoint = `/api/raids/${event.id}/confirmations`;
  const [data, setData] = useState<ConfirmationDashboard | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState<{
    input: {
      requestKey: string;
      version: number;
      deadline: string;
      preparation: RaidPreparation;
    };
    result: RosterPreview;
  } | null>(null);
  const [reasonFor, setReasonFor] = useState<{
    id: string;
    manual: boolean;
  } | null>(null);
  const [composing, setComposing] = useState(false);
  const [deadline, setDeadline] = useState("");
  const paused = useRef(false);
  const now = useRaidClock(initialNow);
  useEffect(() => {
    paused.current = busy || composing || reasonFor !== null;
  }, [busy, composing, reasonFor]);
  const defaults = defaultPreparation(event.raidName, event.game);
  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      if (!response.ok)
        throw new Error(
          "Attendance confirmations could not be loaded. Retry shortly.",
        );
      const value = confirmationDashboardSchema.parse(await response.json());
      if (!signal?.aborted) setData(value);
    },
    [endpoint],
  );
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => {
      void load(controller.signal).catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load confirmations.",
          );
      });
    }, 0);
    const timer = setInterval(() => {
      if (!document.hidden && !paused.current)
        void load(controller.signal).catch(() => {
          if (!controller.signal.aborted)
            setError(
              "Could not refresh confirmations. Your saved replies remain unchanged.",
            );
        });
    }, 15000);
    return () => {
      controller.abort();
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load, event.version]);
  async function mutate(body: unknown, message: string): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setData(
        confirmationDashboardSchema.parse(await postRaid(endpoint, body)),
      );
      setNotice(message);
      setReasonFor(null);
      router.refresh();
      return true;
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "The request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function prepare(submit: FormEvent<HTMLFormElement>): Promise<void> {
    submit.preventDefault();
    const fields = new FormData(submit.currentTarget);
    const preparation = {
      ...defaults,
      general: String(fields.get("general")),
      tank: String(fields.get("tank")),
      healer: String(fields.get("healer")),
      damage: String(fields.get("damage")),
      meeting: String(fields.get("meeting")),
      voiceUrl: String(fields.get("voiceUrl")),
      guideUrl: String(fields.get("guideUrl")),
      musterMinutes: Number(fields.get("musterMinutes")),
      reminders: fields.get("reminders") === "on",
    };
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const input = {
        requestKey: crypto.randomUUID(),
        version: event.version,
        deadline: new Date(deadline).toISOString(),
        preparation,
      };
      const result = rosterPreviewSchema.parse(
        await postRaid(endpoint, { operation: "preview", input }),
      );
      setPreview({ input, result });
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Check the reply deadline and preparation.",
      );
    } finally {
      setBusy(false);
    }
  }
  const owner = data?.organizer ?? event.isOrganizer;
  const selected = event.signups.filter(
    (signup) => signup.status === "accepted",
  );
  const invitations = data?.invitations ?? [];
  const rows = invitations.filter(
    (invite) =>
      filter === "all" ||
      (filter === "delivery"
        ? ["blocked", "failed", "uncertain"].includes(invite.delivery)
        : invite.state === filter),
  );
  if (!event.isOrganizer && data && !invitations.length) return <></>;
  return (
    <section
      className="raid-panel roster-confirmations"
      id="attendance-confirmations"
      aria-labelledby="attendance-heading"
    >
      <header className="roster-confirmation-header">
        <div>
          <span className="eyebrow">Selected is the first step</span>
          <h2 id="attendance-heading">Attendance confirmations</h2>
          <p>
            {owner
              ? "Publish the finished roster, collect each player's reply and resolve vacancies before the final loot lock."
              : "Reply to your selected raid place here or through the assistant in Discord."}
          </p>
        </div>
        {owner && event.status === "open" && (
          <button
            className="button primary"
            onClick={() => {
              if (!deadline) {
                const proposed = Math.min(
                  Date.now() + 24 * 3600000,
                  Date.parse(event.startsAt) - 2 * 3600000,
                );
                setDeadline(
                  proposed > Date.now() ? localDate(new Date(proposed)) : "",
                );
              }
              setComposing(!composing);
            }}
            disabled={busy}
          >
            Publish roster & request confirmations
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading attendance replies…</p>}
      {owner && (
        <div className="roster-confirmation-counts">
          <span>
            <strong>{selected.length}</strong> selected
          </span>
          <span>
            <strong>
              {invitations.filter((i) => i.state === "confirmed").length}
            </strong>{" "}
            player-confirmed
          </span>
          <span>
            <strong>
              {invitations.filter((i) => i.state === "pending").length}
            </strong>{" "}
            awaiting reply
          </span>
          <span>
            <strong>
              {invitations.filter((i) => i.state === "declined").length}
            </strong>{" "}
            declined
          </span>
          <span>
            <strong>
              {
                invitations.filter((i) =>
                  ["blocked", "failed", "uncertain"].includes(i.delivery),
                ).length
              }
            </strong>{" "}
            delivery issues
          </span>
        </div>
      )}
      {composing && owner && (
        <form
          onSubmit={(submit) => void prepare(submit)}
          onChange={() => setPreview(null)}
          className="roster-publication-form"
        >
          <fieldset disabled={busy}>
            <legend>Review what your players receive</legend>
            <p>
              Publishing closes new signups and posts the roster in the signup
              channel. Selected players can still confirm or decline.
            </p>
            <label>
              Reply deadline · your local time
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(input) => setDeadline(input.target.value)}
              />
            </label>
            <label>
              Be ready before start · minutes
              <input
                name="musterMinutes"
                type="number"
                min="0"
                max="120"
                defaultValue={15}
                required
              />
            </label>
            <label>
              Meeting place
              <input name="meeting" maxLength={200} defaultValue="" />
            </label>
            <label>
              Discord voice channel URL
              <input name="voiceUrl" type="url" defaultValue="" />
            </label>
            <label>
              Tactics guide URL
              <input
                name="guideUrl"
                type="url"
                defaultValue={defaults.guideUrl}
              />
            </label>
            <label className="roster-wide">
              General preparation
              <textarea
                name="general"
                required
                maxLength={1800}
                rows={5}
                defaultValue={defaults.general}
              />
            </label>
            {(["tank", "healer", "damage"] as const).map((role) => (
              <label key={role}>
                {role} preparation
                <textarea
                  name={role}
                  maxLength={600}
                  rows={3}
                  defaultValue={defaults[role]}
                />
              </label>
            ))}
            <label className="roster-wide roster-check">
              <input type="checkbox" name="reminders" defaultChecked />
              One reminder for unanswered invitations and one preparation
              reminder for confirmed players
            </label>
            <button
              type="submit"
              className="button"
              disabled={busy || !selected.length}
            >
              {busy ? "Checking the roster…" : "Preview player messages"}
            </button>
          </fieldset>
        </form>
      )}
      {preview && composing && (
        <div
          className="roster-publication-preview"
          role="region"
          aria-label="Publication preview"
        >
          <h3>
            {preview.result.recipients.length} selected players will receive a
            private invitation
          </h3>
          <p>
            Reply by {time(preview.result.deadline)}. Existing unchanged
            confirmations are preserved.
          </p>
          <ul>
            {preview.result.recipients.map((offer, index) => (
              <li key={index}>
                {offer.character.name} · {offer.character.specialization}{" "}
                {offer.character.className} · {offer.role}
                {offer.partyIndex !== null
                  ? ` · Group ${offer.partyIndex + 1}`
                  : ""}
              </li>
            ))}
          </ul>
          <p className="roster-prep-text">
            {preview.result.preparation.general}
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              void mutate(
                { operation: "publish", input: preview.input },
                "Roster published. Private invitations are queued; delivery status appears below.",
              ).then((saved) => {
                if (saved) {
                  setPreview(null);
                  setComposing(false);
                }
              });
            }}
          >
            Publish roster & send confirmations
          </button>
        </div>
      )}
      {owner && invitations.length > 0 && (
        <label className="roster-filter">
          Show
          <select
            value={filter}
            onChange={(input) => setFilter(input.target.value)}
          >
            <option value="all">All invitations</option>
            <option value="pending">Awaiting reply</option>
            <option value="confirmed">Confirmed attendance</option>
            <option value="declined">Declined</option>
            <option value="expired">No response</option>
            <option value="changed">Updated invitation needed</option>
            <option value="delivery">Delivery problems</option>
          </select>
        </label>
      )}
      <ul className="roster-confirmation-list">
        {rows.map((invite) => (
          <li key={invite.id}>
            <article className="roster-confirmation-card">
              <div>
                <h3>{invite.offer.character.name}</h3>
                <p>
                  {invite.offer.character.specialization}{" "}
                  {invite.offer.character.className} · {invite.offer.role}
                  {invite.offer.partyIndex !== null
                    ? ` · Group ${invite.offer.partyIndex + 1}`
                    : ""}
                </p>
              </div>
              <div>
                <span className={`roster-reply roster-reply-${invite.state}`}>
                  {label(invite.state)}
                </span>
                <small>
                  Message:{" "}
                  {invite.directMessages ? invite.delivery : "My signup only"} ·
                  Reply by {time(invite.deadline)}
                </small>
                {invite.repliedAt && (
                  <small>Last response {time(invite.repliedAt)}</small>
                )}
              </div>
              {invite.reason && (
                <p className="roster-private-reason">
                  <strong>Private explanation:</strong> {invite.reason}
                </p>
              )}
              {owner ? (
                <div className="roster-card-actions">
                  {["pending", "expired", "manual"].includes(invite.state) && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        setReasonFor({ id: invite.id, manual: true })
                      }
                    >
                      Record manual verification
                    </button>
                  )}
                  {["blocked", "failed"].includes(invite.delivery) && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          { operation: "retry", invitationId: invite.id },
                          "Delivery retry queued. The player can also respond through My signup in Discord.",
                        )
                      }
                    >
                      Retry DM
                    </button>
                  )}
                  {["blocked", "uncertain", "failed"].includes(
                    invite.delivery,
                  ) && (
                    <p>
                      Use the raid&apos;s My signup control inside Discord if a
                      DM cannot be delivered. A delivery problem is not a
                      decline.
                    </p>
                  )}
                  {event.locked &&
                    invite.state === "declined" &&
                    selected.some((s) => s.id === invite.signupId) && (
                      <form
                        className="roster-amendment"
                        onSubmit={(submit) => {
                          submit.preventDefault();
                          const fields = new FormData(submit.currentTarget);
                          void mutate(
                            {
                              operation: "amend",
                              input: {
                                requestKey: crypto.randomUUID(),
                                version: event.version,
                                removedSignupId: invite.signupId,
                                ...(fields.get("replacement")
                                  ? {
                                      replacementSignupId: String(
                                        fields.get("replacement"),
                                      ),
                                    }
                                  : {}),
                                reason: String(fields.get("reason")),
                                manualVerified:
                                  fields.get("manualVerified") === "on",
                              },
                            },
                            "Explicit roster amendment recorded. The original loot snapshot is preserved; export the new revision.",
                          );
                        }}
                      >
                        <label>
                          Replacement
                          <select name="replacement">
                            <option value="">Leave this seat vacant</option>
                            {event.signups
                              .filter((signup) =>
                                ["bench", "registered", "pending"].includes(
                                  signup.status,
                                ),
                              )
                              .map((signup) => (
                                <option key={signup.id} value={signup.id}>
                                  {signup.character.name} · {signup.role}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Amendment reason
                          <input
                            name="reason"
                            required
                            minLength={3}
                            maxLength={500}
                          />
                        </label>
                        <label className="roster-check">
                          <input name="manualVerified" type="checkbox" />I
                          verified the replacement&apos;s availability; record
                          this as manual confirmation.
                        </label>
                        <button className="button" disabled={busy}>
                          Record amendment & invite replacement
                        </button>
                      </form>
                    )}
                </div>
              ) : (
                <>
                  <div className="roster-card-actions">
                    <button
                      className="button primary"
                      disabled={
                        busy ||
                        !["pending", "manual"].includes(invite.state) ||
                        Date.parse(invite.deadline) <= now
                      }
                      onClick={() =>
                        void mutate(
                          {
                            operation: "reply",
                            input: {
                              requestKey: crypto.randomUUID(),
                              invitationId: invite.id,
                              version: invite.version,
                              choice: "confirmed",
                              reason: "",
                            },
                          },
                          "Your attendance is confirmed.",
                        )
                      }
                    >
                      Confirm attendance
                    </button>
                    <button
                      className="button"
                      disabled={
                        busy || ["revoked", "declined"].includes(invite.state)
                      }
                      onClick={() =>
                        setReasonFor({ id: invite.id, manual: false })
                      }
                    >
                      {["confirmed", "manual"].includes(invite.state)
                        ? "I can no longer attend"
                        : "Decline"}
                    </button>
                    <a className="button" href={invite.offer.discordUrl}>
                      Open raid in Discord
                    </a>
                  </div>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        {
                          operation: "preference",
                          enabled: !invite.directMessages,
                        },
                        invite.directMessages
                          ? "Automatic raid DMs are off for this event. Use My signup in Discord."
                          : "Raid DMs are enabled.",
                      )
                    }
                  >
                    {invite.directMessages
                      ? "Use My signup only"
                      : "Enable raid DMs"}
                  </button>
                  <Preparation invitation={invite} />
                </>
              )}
              {reasonFor?.id === invite.id && (
                <form
                  className="roster-reason-form"
                  onSubmit={(submit) => {
                    submit.preventDefault();
                    const fields = new FormData(submit.currentTarget);
                    void mutate(
                      reasonFor.manual
                        ? {
                            operation: "manual",
                            invitationId: invite.id,
                            reason: String(fields.get("reason")),
                          }
                        : {
                            operation: "reply",
                            input: {
                              requestKey: crypto.randomUUID(),
                              invitationId: invite.id,
                              version: invite.version,
                              choice: "declined",
                              reason: String(fields.get("reason")),
                            },
                          },
                      reasonFor.manual
                        ? "Manual verification recorded separately from the player's reply."
                        : "Your decline is saved and the leader has been notified.",
                    );
                  }}
                >
                  <label>
                    {reasonFor.manual
                      ? "How did you verify this player's availability?"
                      : "Private reason · visible only to you and the leader"}
                    <textarea
                      name="reason"
                      autoFocus
                      required
                      minLength={3}
                      maxLength={500}
                      placeholder={
                        reasonFor.manual
                          ? "For example: confirmed with the player in voice"
                          : "Schedule conflict, preparation issue, or Prefer not to say"
                      }
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    {reasonFor.manual ? "Save verification" : "Confirm decline"}
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => setReasonFor(null)}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </article>
          </li>
        ))}
      </ul>
      {data && !invitations.length && owner && (
        <p>
          No roster invitations have been published. Assign the selected
          players, then preview their messages.
        </p>
      )}
      {data && invitations.length > 0 && !rows.length && (
        <p>No invitations match this filter.</p>
      )}
      {data && data.latestAmendment > 0 && (
        <p>
          Current locked roster amendment: {data.latestAmendment}. Download the
          latest export before importing a replacement roster.
        </p>
      )}
    </section>
  );
}
