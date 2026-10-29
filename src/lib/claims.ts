// REMEAL claim workflow state machine + volunteer delivery state machine.
// Every transition is validated SERVER-SIDE before touching the database.

import type { ClaimStatus, ListingStatus, VolunteerStatus } from "@/lib/constants";

/** Allowed claim status transitions: current -> set of allowed next statuses with who may trigger them. */
export const CLAIM_TRANSITIONS: Record<ClaimStatus, { next: ClaimStatus[]; actors: Array<"DONOR" | "NGO" | "ADMIN" | "SYSTEM"> }[]> = {
  REQUESTED: [
    { next: ["ACCEPTED"], actors: ["DONOR", "ADMIN"] },
    { next: ["REJECTED"], actors: ["DONOR", "ADMIN"] },
    { next: ["CANCELLED"], actors: ["NGO", "ADMIN"] },
    { next: ["DISPUTED"], actors: ["ADMIN"] },
  ],
  ACCEPTED: [
    { next: ["READY_FOR_PICKUP"], actors: ["DONOR", "ADMIN"] },
    { next: ["PICKED_UP"], actors: ["DONOR", "ADMIN"] },
    { next: ["REJECTED"], actors: ["DONOR", "ADMIN"] }, // donor reversal before pickup, restores inventory
    { next: ["CANCELLED"], actors: ["NGO", "ADMIN"] },
    { next: ["DISPUTED"], actors: ["ADMIN", "NGO", "DONOR"] },
  ],
  READY_FOR_PICKUP: [
    { next: ["PICKED_UP"], actors: ["DONOR", "ADMIN"] },
    { next: ["CANCELLED"], actors: ["NGO", "ADMIN"] },
    { next: ["DISPUTED"], actors: ["ADMIN", "NGO", "DONOR"] },
  ],
  PICKED_UP: [
    { next: ["COMPLETED"], actors: ["NGO", "ADMIN"] },
    { next: ["DELIVERED"], actors: ["DONOR", "NGO", "ADMIN"] }, // when a volunteer delivers
    { next: ["DISPUTED"], actors: ["ADMIN", "NGO", "DONOR"] },
  ],
  DELIVERED: [
    { next: ["COMPLETED"], actors: ["NGO", "ADMIN"] },
    { next: ["DISPUTED"], actors: ["ADMIN", "NGO", "DONOR"] },
  ],
  COMPLETED: [
    { next: ["DISPUTED"], actors: ["ADMIN"] },
  ],
  REJECTED: [],
  CANCELLED: [],
  DISPUTED: [
    { next: ["COMPLETED"], actors: ["ADMIN"] },
    { next: ["CANCELLED"], actors: ["ADMIN"] },
    { next: ["PICKED_UP"], actors: ["ADMIN"] },
  ],
};

/** Can `actorRole` move the claim from `from` to `to`? */
export function canTransitionClaim(
  from: ClaimStatus,
  to: ClaimStatus,
  actorRole: "DONOR" | "NGO" | "ADMIN" | "SYSTEM"
): boolean {
  const rules = CLAIM_TRANSITIONS[from];
  if (!rules) return false;
  return rules.some((r) => r.next.includes(to) && r.actors.includes(actorRole));
}

/** Does moving the claim OUT of `from` status release reserved inventory back to the listing? */
export function releasesInventory(from: ClaimStatus, approvedQty: number | null): boolean {
  if (approvedQty == null || approvedQty <= 0) return false;
  // Claim reserved inventory while it was Accepted / Ready / Picked-up.
  return ["ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"].includes(from);
}

/** Does moving the claim INTO `to` status consume (not reserve) the inventory as rescued? */
export function isTerminalPositive(to: ClaimStatus): boolean {
  return to === "COMPLETED";
}

export const VOLUNTEER_TRANSITIONS: Record<VolunteerStatus, VolunteerStatus[]> = {
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERED"],
  DELIVERED: ["VERIFIED_COMPLETE"],
  VERIFIED_COMPLETE: [],
  CANCELLED: [],
};

export function canTransitionVolunteer(from: VolunteerStatus, to: VolunteerStatus): boolean {
  return (VOLUNTEER_TRANSITIONS[from] ?? []).includes(to);
}

/** Listing statuses that are publicly visible in Explore. */
export const PUBLIC_LISTING_STATUSES: ListingStatus[] = ["AVAILABLE", "PARTIALLY_RESERVED"];

/** Listing statuses considered "actively rescuable". */
export const ACTIVE_LISTING_STATUSES: ListingStatus[] = [
  "AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED", "PICKED_UP",
];

export function listingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    AVAILABLE: "Available",
    PARTIALLY_RESERVED: "Partially reserved",
    FULLY_RESERVED: "Fully reserved",
    PICKED_UP: "Picked up",
    COMPLETED: "Completed",
    EXPIRED: "Expired",
    WITHDRAWN: "Withdrawn",
    FLAGGED: "Under review",
  };
  return map[status] ?? status;
}

export function claimStatusLabel(status: string): string {
  const map: Record<string, string> = {
    REQUESTED: "Requested",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    READY_FOR_PICKUP: "Ready for pickup",
    PICKED_UP: "Picked up",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    DISPUTED: "Disputed",
  };
  return map[status] ?? status;
}
