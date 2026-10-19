import { Temporal } from "@js-temporal/polyfill";

export function regionZone(region: string): string {
  return region === "EU"
    ? "Europe/Berlin"
    : region === "NA"
      ? "America/New_York"
      : "Australia/Sydney";
}

export function localRaidStart(iso: string, region: string): string {
  return Temporal.Instant.from(iso)
    .toZonedDateTimeISO(regionZone(region))
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}
