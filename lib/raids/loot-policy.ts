import type { ReserveLimits, SignupRole } from "./contracts";

interface ReservePolicy {
  reserveLimit: number;
  reserveLimits?: ReserveLimits | null;
}

export function reserveQuota(event: ReservePolicy, role: SignupRole): number {
  return role === "participant"
    ? 0
    : (event.reserveLimits?.[role] ?? event.reserveLimit);
}

export function reservePolicyLabel(event: ReservePolicy): string {
  return event.reserveLimits
    ? `Tanks ${event.reserveLimits.tank} / Healers ${event.reserveLimits.healer} / DPS ${event.reserveLimits.damage} SR`
    : `${event.reserveLimit} SR per character`;
}
