"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, MessageCircle, X } from "lucide-react";

export function DiscordSignInButton(): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" disabled={pending}>
      <MessageCircle size={18} aria-hidden="true" />
      {pending ? "Opening Discord..." : "Sign in with Discord"}
    </button>
  );
}

export function DiscordMembershipDialog({
  foreverInvite,
  kfcInvite,
}: {
  foreverInvite: string;
  kfcInvite: string;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="raid-membership-dialog"
      aria-labelledby="membership-title"
      aria-describedby="membership-description"
    >
      <div className="raid-dialog-heading">
        <h2 id="membership-title">Join one of our Discord servers</h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => dialog.current?.close()}
          aria-label="Close dialog"
          title="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <p id="membership-description">
        The event planner and reserve pages are available to members of either
        KFC Guild or WoW Forever Discord. Join either server, then return here
        and sign in again.
      </p>
      <div className="raid-membership-actions">
        <a
          className="button primary"
          href={foreverInvite}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" /> Join WoW Forever
          <ExternalLink size={16} aria-hidden="true" />
        </a>
        <a
          className="button secondary"
          href={kfcInvite}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" /> Join KFC Guild
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
    </dialog>
  );
}
