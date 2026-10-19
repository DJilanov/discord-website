import { Temporal } from "@js-temporal/polyfill";

export function groupTimeZone(region: string): string {
  return region === "EU"
    ? "Europe/Berlin"
    : region === "NA"
      ? "America/New_York"
      : "UTC";
}

export function resolveGroupStart(localStart: string, region: string): Date {
  const time = Temporal.PlainDateTime.from(localStart, { overflow: "reject" });
  return new Date(
    time.toZonedDateTime(groupTimeZone(region), { disambiguation: "reject" })
      .epochMilliseconds,
  );
}

export function localGroupStart(value: Date | string, region: string): string {
  const instant =
    value instanceof Date
      ? Temporal.Instant.fromEpochMilliseconds(value.getTime())
      : Temporal.Instant.from(value);
  return instant
    .toZonedDateTimeISO(groupTimeZone(region))
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}

export function formatGroupStart(value: Date | string, region: string): string {
  const date = new Date(value);
  const timeZone = groupTimeZone(region);
  const label =
    region === "EU" ? "Central Europe" : region === "NA" ? "New York" : "UTC";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  if (timeZone === "UTC") return `${time} UTC`;
  const offset = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part): boolean => part.type === "timeZoneName")!
    .value.replace("GMT", "UTC");
  return `${time} ${label} (${offset})`;
}
