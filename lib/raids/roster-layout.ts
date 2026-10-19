import type { SignupView } from "./contracts";

export const RAID_PARTY_SIZE = 5;

export interface RosterParty {
  index: number;
  capacity: number;
  signups: SignupView[];
}

export interface RosterAssignment {
  signupId: string;
  partyIndex: number;
  slotIndex: number;
}

export function raidPartyCount(capacity: number, accepted = 0): number {
  return Math.max(1, Math.ceil(Math.max(capacity, accepted) / RAID_PARTY_SIZE));
}

export function buildRosterParties(
  signups: SignupView[],
  capacity: number,
): RosterParty[] {
  const accepted = signups.filter((signup) => signup.status === "accepted");
  const count = raidPartyCount(capacity, accepted.length);
  const slots = Array.from({ length: count }, () =>
    Array<SignupView | null>(RAID_PARTY_SIZE).fill(null),
  );
  const unassigned: SignupView[] = [];

  for (const signup of accepted) {
    const party = signup.partyIndex;
    const slot = signup.slotIndex;
    if (
      typeof party === "number" &&
      typeof slot === "number" &&
      party >= 0 &&
      party < count &&
      slot >= 0 &&
      slot < RAID_PARTY_SIZE &&
      slots[party][slot] === null
    ) {
      slots[party][slot] = signup;
    } else {
      unassigned.push(signup);
    }
  }

  for (const signup of unassigned) {
    const party = slots.find((candidate) => candidate.includes(null));
    if (!party) break;
    party[party.indexOf(null)] = signup;
  }

  return slots.map((partySlots, index) => ({
    index,
    capacity: Math.min(
      RAID_PARTY_SIZE,
      Math.max(0, capacity - index * RAID_PARTY_SIZE),
    ),
    signups: partySlots.filter(
      (signup): signup is SignupView => signup !== null,
    ),
  }));
}

export function rosterAssignments(
  parties: readonly RosterParty[],
): RosterAssignment[] {
  return parties.flatMap((party) =>
    party.signups.map((signup, slotIndex) => ({
      signupId: signup.id,
      partyIndex: party.index,
      slotIndex,
    })),
  );
}

export function sameRosterLayout(
  left: readonly RosterParty[],
  right: readonly RosterParty[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (party, index) =>
        party.signups.length === right[index]?.signups.length &&
        party.signups.every(
          (signup, slot) => signup.id === right[index]?.signups[slot]?.id,
        ),
    )
  );
}
