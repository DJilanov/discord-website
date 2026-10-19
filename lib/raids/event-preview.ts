import { roles, type RaidRole, type SignupView } from "./contracts";

export interface EventRosterGroup {
  role: RaidRole | "participant";
  signups: SignupView[];
  limit: number;
  openPlaces: number;
}

export interface EventRosterSummary {
  signedUp: SignupView[];
  confirmed: SignupView[];
  registered: SignupView[];
  pending: SignupView[];
  bench: SignupView[];
  tentative: SignupView[];
  absent: SignupView[];
  available: number;
  groups: EventRosterGroup[];
  fixedSmallGroup: boolean;
}

export function summarizeEventRoster(
  signups: SignupView[],
  capacity: number,
  roleCaps: Record<RaidRole, number>,
  combatRoles: boolean,
): EventRosterSummary {
  const confirmed = signups.filter((signup) => signup.status === "accepted");
  const available = Math.max(0, capacity - confirmed.length);
  const fixedSmallGroup =
    combatRoles &&
    capacity <= 5 &&
    roles.reduce((total, role) => total + roleCaps[role], 0) === capacity;
  const groups = combatRoles
    ? roles.map((role): EventRosterGroup => {
        const members = confirmed.filter((signup) => signup.role === role);
        return {
          role,
          signups: members,
          limit: roleCaps[role],
          openPlaces: Math.min(
            available,
            Math.max(0, roleCaps[role] - members.length),
          ),
        };
      })
    : [
        {
          role: "participant" as const,
          signups: confirmed,
          limit: capacity,
          openPlaces: available,
        },
      ];
  return {
    signedUp: signups.filter((signup) =>
      ["accepted", "registered", "pending", "bench"].includes(signup.status),
    ),
    confirmed,
    registered: signups.filter((signup) => signup.status === "registered"),
    pending: signups.filter((signup) => signup.status === "pending"),
    bench: signups.filter((signup) => signup.status === "bench"),
    tentative: signups.filter((signup) => signup.status === "tentative"),
    absent: signups.filter((signup) => signup.status === "absent"),
    available,
    groups,
    fixedSmallGroup,
  };
}

export function signupStatusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Confirmed";
    case "registered":
      return "Signed up";
    case "pending":
      return "Awaiting approval";
    case "bench":
      return "Bench";
    case "tentative":
      return "Tentative";
    case "absent":
      return "Absent";
    default:
      return "Withdrawn";
  }
}

export function eventDurationLabel(startsAt: string, endsAt: string): string {
  const minutes = Math.round(
    (Date.parse(endsAt) - Date.parse(startsAt)) / 60000,
  );
  if (!Number.isFinite(minutes) || minutes <= 0) return "Duration unavailable";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""]
    .filter(Boolean)
    .join(" ");
}
