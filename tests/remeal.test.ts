// REMEAL unit tests — business rules, validation, auth, and state machines.
// Run with: bun test tests/remeal.test.ts

import { describe, test, expect } from "bun:test";
import { canTransitionClaim, releasesInventory, canTransitionVolunteer } from "../src/lib/claims";
import { registerSchema, listingSchema, claimCreateSchema, resetPasswordSchema } from "../src/lib/validations";
import { hashPassword, verifyPassword, verifySessionToken, createSessionToken } from "../src/lib/auth";
import { categorizeFood, scoreNGOMatches, forecastDemand } from "../src/lib/ai";

// ---------------- Claim state machine ----------------

describe("claim state machine", () => {
  test("donor can accept a REQUESTED claim", () => {
    expect(canTransitionClaim("REQUESTED", "ACCEPTED", "DONOR")).toBe(true);
  });

  test("ngo cannot accept its own claim", () => {
    expect(canTransitionClaim("REQUESTED", "ACCEPTED", "NGO")).toBe(false);
  });

  test("ngo can cancel its own REQUESTED claim", () => {
    expect(canTransitionClaim("REQUESTED", "CANCELLED", "NGO")).toBe(true);
  });

  test("completed claims cannot be cancelled", () => {
    expect(canTransitionClaim("COMPLETED", "CANCELLED", "ADMIN")).toBe(false);
  });

  test("completion requires prior pickup (admin override aside)", () => {
    // NGO can complete only from PICKED_UP / DELIVERED
    expect(canTransitionClaim("PICKED_UP", "COMPLETED", "NGO")).toBe(true);
    expect(canTransitionClaim("DELIVERED", "COMPLETED", "NGO")).toBe(true);
    expect(canTransitionClaim("ACCEPTED", "COMPLETED", "NGO")).toBe(false);
    expect(canTransitionClaim("REQUESTED", "COMPLETED", "NGO")).toBe(false);
  });

  test("terminal states are terminal for ordinary actors", () => {
    expect(canTransitionClaim("REJECTED", "ACCEPTED", "DONOR")).toBe(false);
    expect(canTransitionClaim("CANCELLED", "ACCEPTED", "DONOR")).toBe(false);
    expect(canTransitionClaim("COMPLETED", "PICKED_UP", "NGO")).toBe(false);
  });

  test("admin can recover a disputed claim", () => {
    expect(canTransitionClaim("DISPUTED", "COMPLETED", "ADMIN")).toBe(true);
    expect(canTransitionClaim("DISPUTED", "CANCELLED", "ADMIN")).toBe(true);
    expect(canTransitionClaim("DISPUTED", "COMPLETED", "NGO")).toBe(false);
  });

  test("accepted/rejected claims release reserved inventory", () => {
    expect(releasesInventory("ACCEPTED", 10)).toBe(true);
    expect(releasesInventory("READY_FOR_PICKUP", 10)).toBe(true);
    expect(releasesInventory("REQUESTED", 10)).toBe(false); // never reserved
    expect(releasesInventory("COMPLETED", 10)).toBe(false); // consumed, not released
    expect(releasesInventory("ACCEPTED", 0)).toBe(false);
    expect(releasesInventory("ACCEPTED", null)).toBe(false);
  });

  test("volunteer delivery flow enforces order", () => {
    expect(canTransitionVolunteer("ASSIGNED", "ACCEPTED")).toBe(true);
    expect(canTransitionVolunteer("ACCEPTED", "ON_THE_WAY")).toBe(true);
    expect(canTransitionVolunteer("ON_THE_WAY", "PICKED_UP")).toBe(true);
    expect(canTransitionVolunteer("PICKED_UP", "DELIVERED")).toBe(true);
    expect(canTransitionVolunteer("DELIVERED", "VERIFIED_COMPLETE")).toBe(true);
    expect(canTransitionVolunteer("ASSIGNED", "DELIVERED")).toBe(false);
    expect(canTransitionVolunteer("PICKED_UP", "ACCEPTED")).toBe(false);
    expect(canTransitionVolunteer("VERIFIED_COMPLETE", "CANCELLED")).toBe(false);
  });
});

// ---------------- Auth ----------------

describe("password & session security", () => {
  test("scrypt hash round-trips and salts uniquely", () => {
    const a = hashPassword("Demo@1234");
    const b = hashPassword("Demo@1234");
    expect(a).not.toEqual(b); // unique salts
    expect(verifyPassword("Demo@1234", a)).toBe(true);
    expect(verifyPassword("WrongPass1", a)).toBe(false);
  });

  test("tampered session tokens are rejected", () => {
    const token = createSessionToken({ userId: "u1", email: "x@y.z", role: "DONOR", name: "X" });
    expect(verifySessionToken(token)?.userId).toBe("u1");
    const [body] = token.split(".");
    expect(verifySessionToken(`${body}.forged-signature`)).toBeNull();
    expect(verifySessionToken(`${body}`)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });
});

// ---------------- Validation schemas ----------------

describe("registration validation", () => {
  const base = {
    role: "NGO", email: "org@example.org", password: "Passw0rd!", confirmPassword: "Passw0rd!",
    displayName: "Test Person", organizationName: "Test Org", district: "Madurai",
    acceptTerms: true,
  };

  test("accepts a valid NGO registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  test("rejects admin role from public registration", () => {
    const res = registerSchema.safeParse({ ...base, role: "ADMIN" });
    expect(res.success).toBe(false);
  });

  test("requires organization name for NGOs and donors", () => {
    expect(registerSchema.safeParse({ ...base, organizationName: "" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "DONOR", organizationName: "Cafe X" }).success).toBe(true);
  });

  test("enforces password strength and match", () => {
    expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "NoNumbers!", confirmPassword: "NoNumbers!" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, confirmPassword: "Different1" }).success).toBe(false);
  });

  test("requires terms acceptance", () => {
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
  });
});

describe("listing validation & safety rules", () => {
  const past = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  const future = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
  const base = {
    title: "Wedding lunch surplus meals",
    description: "Unserved sealed vegetarian meal boxes kept in hot-hold carriers since service.",
    category: "PREPARED_MEALS", dietary: "VEGETARIAN", quantity: 120, unit: "MEALS",
    preparedAt: past(2), pickupStartAt: future(1), pickupDeadline: future(7),
    storage: "HOT_HOLD", allergens: ["MILK"], pickupAddress: "VK Wedding Hall, 100 Feet Road",
    pickupLocality: "Gandhipuram", district: "Coimbatore", donorConfirmed: true,
    images: [], status: "AVAILABLE",
  };

  test("accepts a valid listing", () => {
    expect(listingSchema.safeParse(base).success).toBe(true);
  });

  test("rejects pickup deadlines in the past", () => {
    const res = listingSchema.safeParse({ ...base, pickupDeadline: past(1) });
    expect(res.success).toBe(false);
  });

  test("rejects deadline earlier than pickup start", () => {
    const res = listingSchema.safeParse({ ...base, pickupDeadline: past(0.5) });
    expect(res.success).toBe(false);
  });

  test("rejects >72h window from preparation", () => {
    const res = listingSchema.safeParse({ ...base, preparedAt: past(80), pickupDeadline: future(1) });
    expect(res.success).toBe(false);
  });

  test("rejects future preparation timestamps", () => {
    const res = listingSchema.safeParse({ ...base, preparedAt: future(3) });
    expect(res.success).toBe(false);
  });

  test("rejects non-positive quantities", () => {
    expect(listingSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, quantity: -5 }).success).toBe(false);
  });

  test("requires the donor safety confirmation", () => {
    expect(listingSchema.safeParse({ ...base, donorConfirmed: false }).success).toBe(false);
  });

  test("rejects unknown enum values", () => {
    expect(listingSchema.safeParse({ ...base, category: "MYSTERY" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, unit: "SPACESHIPS" }).success).toBe(false);
  });
});

describe("claim request validation", () => {
  test("requires positive quantities", () => {
    expect(claimCreateSchema.safeParse({ listingId: "abc12345", requestedQuantity: 5 }).success).toBe(true);
    expect(claimCreateSchema.safeParse({ listingId: "abc12345", requestedQuantity: 0 }).success).toBe(false);
    expect(claimCreateSchema.safeParse({ listingId: "abc12345", requestedQuantity: -1 }).success).toBe(false);
  });
});

describe("password reset validation", () => {
  test("requires matching strong passwords", () => {
    const base = { token: "abcdef1234567890", password: "NewPass123", confirmPassword: "NewPass123" };
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, confirmPassword: "Different1" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...base, password: "nodigits", confirmPassword: "nodigits" }).success).toBe(false);
  });
});

// ---------------- AI service (rule-based fallback paths) ----------------

describe("AI rule-based fallbacks", () => {
  test("categorization infers category, dietary and allergens from text", async () => {
    const res = await categorizeFood({
      title: "Veg rice meals with sambar and curd",
      description: "Freshly cooked vegetarian rice plates with wheat chapati, packed in sealed boxes. Contains milk-based curd.",
    });
    expect(res.estimate).toBe(true);
    expect(res.data.category).toBe("PREPARED_MEALS");
    expect(res.data.dietary).toBe("VEGETARIAN");
    // Both the rule-based path and the AI path agree milk is present.
    expect(res.data.suggestedAllergens).toContain("MILK");
    expect(typeof res.source).toBe("string");
  });

  test("NGO matching is transparent, explainable and eligibility-aware", () => {
    const res = scoreNGOMatches({
      listing: { district: "Madurai", locality: "Teppakulam", category: "PREPARED_MEALS", dietary: "VEGETARIAN", remainingQuantity: 50, unit: "MEALS", pickupDeadline: new Date(Date.now() + 3600000) },
      ngos: [
        { id: "ngo1", displayName: "A", organizationName: "Trust A", district: "Madurai", locality: "Anna Nagar", verificationStatus: "VERIFIED", preferredCategories: JSON.stringify(["PREPARED_MEALS"]), capacityPerPickup: 100 },
        { id: "ngo2", displayName: "B", organizationName: "Trust B", district: "Chennai", locality: "T Nagar", verificationStatus: "PENDING", preferredCategories: null, capacityPerPickup: 20 },
      ],
    });
    expect(res.estimate).toBe(true);
    expect(res.data[0].ngoId).toBe("ngo1");
    expect(res.data[0].score).toBeGreaterThan(res.data[1].score);
    expect(res.data[1].explanation.join(" ")).toContain("pending");
  });

  test("demand forecasting refuses to fabricate with insufficient data", async () => {
    const res = await forecastDemand({
      claims: Array.from({ length: 5 }, (_, i) => ({
        district: "Madurai", category: "PREPARED_MEALS", createdAt: new Date(Date.now() - i * 3600000), status: "COMPLETED", quantity: 10,
      })),
    });
    expect(res.estimate).toBe(true);
    expect(res.data.sufficient).toBe(false);
    expect(res.data.message).toContain("Not enough data yet");
    expect(res.data.byLocality).toHaveLength(0);
  });
});
