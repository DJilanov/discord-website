import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, ExternalLink, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { SITE_URL } from "@/lib/config";
import { formatGroupStart } from "@/lib/group-time";
import { eventArtwork } from "@/lib/raids/event-artwork";
import type { PublicEvent } from "@/lib/raids/public-events";

export function PublicEventSummary({
  event,
  now = new Date(),
}: {
  event: PublicEvent;
  now?: Date;
}): React.JSX.Element {
  const artwork = eventArtwork("forever", event.eventType, event.raidName);
  const ended = event.endsAt <= now;
  const signupClosed = event.signupClosesAt <= now || event.status !== "open";
  return (
    <div className="container public-event">
      <Breadcrumbs
        items={[
          { label: "Find a group", href: "/lfg" },
          { label: event.title, href: `/events/${event.id}` },
        ]}
      />
      <header className="public-event-heading">
        <p className="eyebrow">
          {event.activity} · {event.region} · {event.faction} · {event.ruleset}
        </p>
        <h1>{event.title}</h1>
        <p className="page-lead">
          <time dateTime={event.startsAt.toISOString()}>
            {formatGroupStart(event.startsAt, event.region)}
          </time>
        </p>
      </header>
      <Image
        className="public-event-artwork"
        src={artwork.file}
        alt={artwork.alt}
        width={artwork.width}
        height={artwork.height}
        priority
      />
      <div className="public-event-layout">
        <article>
          <dl className="detail-grid">
            {[
              ["Activity", event.raidName],
              ["Finish", formatGroupStart(event.endsAt, event.region)],
              ["Group size", `${event.capacity} players`],
              [
                "Signup closes",
                formatGroupStart(event.signupClosesAt, event.region),
              ],
              [
                "Places",
                `${event.accepted} accepted · ${event.capacity} planned`,
              ],
              [
                "Signup",
                event.admission === "open"
                  ? "Open signup; organizer selects the roster"
                  : event.admission === "automatic"
                    ? "Automatic acceptance, subject to available places"
                    : "Organizer approval required",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2>The plan</h2>
          <p className="public-event-description">
            {event.description ||
              "Check the event with the organizer before joining."}
          </p>
        </article>
        <aside className="article-aside">
          <Users size={28} />
          <h2>
            {ended
              ? "This session has ended"
              : signupClosed
                ? "Signup is closed"
                : "Join the group"}
          </h2>
          <p>
            {ended
              ? "Browse upcoming groups for another session."
              : "A Discord account in this community is required to sign up. A signup is not a selected roster place."}
          </p>
          <div className="public-event-actions">
            <Link
              className="button primary"
              href={ended ? "/lfg" : `/raids/${event.id}`}
            >
              {ended
                ? "Upcoming groups"
                : signupClosed
                  ? "Open event"
                  : "Sign up with Discord"}
            </Link>
            <a
              className="button secondary"
              href={event.discordUrl}
              target="_blank"
              rel="noreferrer"
            >
              Discord post <ExternalLink size={16} />
            </a>
            {!ended && (
              <a
                className="button secondary"
                href={`/events/${event.id}/calendar`}
                data-analytics-event="calendar_download"
              >
                <CalendarPlus size={16} /> Add to calendar
              </a>
            )}
            <CopyButton text={`${SITE_URL}/events/${event.id}`} />
          </div>
          <p className="fine-print">
            Calendar downloads are snapshots. Recheck the event for changes.
            Attendee names and character details are not included in this public
            preview.
          </p>
        </aside>
      </div>
    </div>
  );
}
