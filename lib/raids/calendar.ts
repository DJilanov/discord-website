import { SITE_URL } from "@/lib/config";
import type { PublicEvent } from "./public-events";

function calendarText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function calendarDate(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

// RFC 5545 folds at 75 octets, without splitting UTF-8 characters.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let result = "",
    length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      result += "\r\n ";
      length = 1;
    }
    result += character;
    length += bytes;
  }
  return result;
}

export function publicEventCalendar(
  event: PublicEvent,
  now = new Date(),
): string {
  const url = `${SITE_URL}/events/${event.id}`;
  const description = `${event.activity} · ${event.region} · ${event.faction} · ${event.ruleset}\n\n${event.description}\n\nCheck the current event for changes and signup: ${url}\nThis calendar entry is a snapshot, not a confirmed roster place.`;
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//WoW Forever Community//Public Events//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${event.id}@${new URL(SITE_URL).hostname}`,
      `DTSTAMP:${calendarDate(now)}`,
      `DTSTART:${calendarDate(event.startsAt)}`,
      `DTEND:${calendarDate(event.endsAt)}`,
      `SUMMARY:${calendarText(event.title)}`,
      `DESCRIPTION:${calendarText(description)}`,
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(foldLine)
      .join("\r\n") + "\r\n"
  );
}
