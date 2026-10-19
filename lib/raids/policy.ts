import { Temporal } from "@js-temporal/polyfill";
import { HttpError } from "@/lib/security";
import type { EventSettings, RaidRole, SignupRole } from "./contracts";
import { eventTypeDefinitions } from "./event-types";
import { regionZone } from "./time";
export { regionZone } from "./time";

export function resolveStart(localStart: string, region: string): Date {
  try {
    const time = Temporal.PlainDateTime.from(localStart, {
      overflow: "reject",
    });
    return new Date(
      time.toZonedDateTime(regionZone(region), { disambiguation: "reject" })
        .epochMilliseconds,
    );
  } catch {
    throw new HttpError(
      400,
      "Choose a valid, unambiguous local time. This time may fall in a daylight-saving change.",
    );
  }
}
export function formatRaidTime(start: Date, region: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: regionZone(region),
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start) + ` (${regionZone(region)})`
  );
}
export function validateEvent(
  input: EventSettings,
  now: Date,
  existing?: { signupClosesAt: Date; reservesCloseAt: Date },
): {
  startsAt: Date;
  endsAt: Date;
  signupClosesAt: Date;
  reservesCloseAt: Date;
} {
  const definition = eventTypeDefinitions[input.eventType];
  if (
    input.reserveLimits &&
    (!input.catalogId ||
      input.eventType !== "raid" ||
      input.reserveLimit !== Math.max(...Object.values(input.reserveLimits)))
  )
    throw new HttpError(
      400,
      "Role reserve allowances require raid loot and a matching maximum allowance.",
    );
  if (
    input.eventType !== "raid" &&
    (input.catalogId ||
      input.reserveLimit ||
      input.hardReserves.length ||
      input.allowDuplicates)
  )
    throw new HttpError(
      400,
      "Loot catalogs and reserves are currently available only for raid events.",
    );
  if (
    !definition.combatRoles &&
    Object.values(input.roleCaps).some((count) => count !== 0)
  )
    throw new HttpError(
      400,
      "Social and other events use participant capacity, not combat role limits.",
    );
  const startsAt = resolveStart(input.localStart, input.region);
  const signupClosesAt = new Date(
    startsAt.getTime() - input.signupMinutesBefore * 60000,
  );
  const reservesCloseAt = new Date(
    startsAt.getTime() - input.reserveMinutesBefore * 60000,
  );
  if (
    startsAt <= now ||
    (signupClosesAt <= now &&
      signupClosesAt.getTime() !== existing?.signupClosesAt.getTime()) ||
    (reservesCloseAt <= now &&
      reservesCloseAt.getTime() !== existing?.reservesCloseAt.getTime())
  )
    throw new HttpError(
      400,
      "The start and both closing times must be in the future.",
    );
  if (
    definition.combatRoles &&
    Object.values(input.roleCaps).reduce((sum, count) => sum + count, 0) <
      input.capacity
  )
    throw new HttpError(400, "Role limits must allow the full event capacity.");
  if (Object.values(input.roleCaps).some((count) => count > input.capacity))
    throw new HttpError(400, "A role limit cannot exceed total capacity.");
  if (!input.catalogId && (input.reserveLimit || input.hardReserves.length))
    throw new HttpError(
      400,
      "Soft and hard reserves require a reviewed catalog for this game edition.",
    );
  if (new Set(input.hardReserves).size !== input.hardReserves.length)
    throw new HttpError(400, "Hard reserves must be unique.");
  return {
    startsAt,
    signupClosesAt,
    reservesCloseAt,
    endsAt: new Date(startsAt.getTime() + input.durationMinutes * 60000),
  };
}
export { characterCanJoin } from "./games";
export function seatAvailable(
  signups: { id: string; role: string; status: string }[],
  role: SignupRole,
  capacity: number,
  caps: Record<RaidRole, number>,
  excludeId?: string,
): boolean {
  const accepted = signups.filter(
    (signup) => signup.status === "accepted" && signup.id !== excludeId,
  );
  return (
    accepted.length < capacity &&
    (role === "participant" ||
      accepted.filter((signup) => signup.role === role).length < caps[role])
  );
}
