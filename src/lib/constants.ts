// REMEAL domain constants — single source of truth for enum-like values.

export const ROLES = ["DONOR", "NGO", "VOLUNTEER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  DONOR: "Food Donor",
  NGO: "NGO / Recipient",
  VOLUNTEER: "Delivery Volunteer",
  ADMIN: "Administrator",
};

export const DONOR_TYPES = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "HOTEL", label: "Hotel" },
  { value: "WEDDING_HALL", label: "Wedding / Event Hall" },
  { value: "CATERING", label: "Catering Service" },
  { value: "SUPERMARKET", label: "Supermarket / Grocery" },
  { value: "EVENT_ORGANIZER", label: "Event Organizer" },
  { value: "OTHER", label: "Other" },
] as const;

export const NGO_TYPES = [
  { value: "NGO", label: "NGO" },
  { value: "CHARITY", label: "Charity" },
  { value: "SHELTER", label: "Shelter / Homeless Support" },
  { value: "COMMUNITY_ORG", label: "Community Organization" },
] as const;

export const FOOD_CATEGORIES = [
  { value: "PREPARED_MEALS", label: "Prepared Meals" },
  { value: "BAKERY", label: "Bakery & Confections" },
  { value: "FRUITS_VEGETABLES", label: "Fruits & Vegetables" },
  { value: "PACKAGED", label: "Packaged & Sealed" },
  { value: "DAIRY", label: "Dairy & Cold Items" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "GRAINS_STAPLES", label: "Grains & Staples" },
  { value: "DESSERTS", label: "Desserts & Sweets" },
  { value: "OTHER", label: "Other" },
] as const;

export const DIETARY_TYPES = [
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "NON_VEGETARIAN", label: "Non-vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "UNKNOWN", label: "Unknown" },
] as const;

export const QUANTITY_UNITS = [
  { value: "MEALS", label: "Meals" },
  { value: "KG", label: "Kilograms" },
  { value: "PLATES", label: "Plates" },
  { value: "BOXES", label: "Boxes" },
  { value: "LITRES", label: "Litres" },
  { value: "ITEMS", label: "Items" },
] as const;

export const STORAGE_CONDITIONS = [
  { value: "AMBIENT", label: "Ambient (room temperature)" },
  { value: "REFRIGERATED", label: "Refrigerated" },
  { value: "HOT_HOLD", label: "Hot hold (warmed carriers)" },
  { value: "FROZEN", label: "Frozen" },
  { value: "UNKNOWN", label: "Not specified" },
] as const;

export const ALLERGENS = [
  { value: "GLUTEN", label: "Gluten" },
  { value: "MILK", label: "Milk / Dairy" },
  { value: "EGG", label: "Egg" },
  { value: "TREE_NUTS", label: "Tree nuts" },
  { value: "PEANUTS", label: "Peanuts" },
  { value: "SOY", label: "Soy" },
  { value: "FISH", label: "Fish" },
  { value: "SHELLFISH", label: "Shellfish" },
  { value: "SESAME", label: "Sesame" },
  { value: "MUSTARD", label: "Mustard" },
] as const;

export const LISTING_STATUSES = [
  "DRAFT",
  "AVAILABLE",
  "PARTIALLY_RESERVED",
  "FULLY_RESERVED",
  "PICKED_UP",
  "COMPLETED",
  "EXPIRED",
  "WITHDRAWN",
  "FLAGGED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const CLAIM_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "DELIVERED",
  "COMPLETED",
  "DISPUTED",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const VOLUNTEER_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "ON_THE_WAY",
  "PICKED_UP",
  "DELIVERED",
  "VERIFIED_COMPLETE",
  "CANCELLED",
] as const;
export type VolunteerStatus = (typeof VOLUNTEER_STATUSES)[number];

export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;

export const VERIFICATION_REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const SAFETY_REPORT_CATEGORIES = [
  { value: "SPOILED_FOOD", label: "Spoiled / unsafe food" },
  { value: "WRONG_INFO", label: "Inaccurate listing information" },
  { value: "HYGIENE_CONCERN", label: "Hygiene concern" },
  { value: "ALLERGEN_MISSING", label: "Missing allergen information" },
  { value: "SUSPICIOUS", label: "Suspicious / fraudulent activity" },
  { value: "OTHER", label: "Other" },
] as const;

export const NOTIFICATION_TYPES = [
  "NEW_MATCHING_LISTING",
  "CLAIM_SUBMITTED",
  "CLAIM_ACCEPTED",
  "CLAIM_REJECTED",
  "PICKUP_REMINDER",
  "LISTING_EXPIRING",
  "VOLUNTEER_ASSIGNMENT",
  "DELIVERY_COMPLETED",
  "VERIFICATION_UPDATE",
  "SAFETY_REPORT_UPDATE",
  "SYSTEM",
] as const;

// Tamil Nadu districts (initial launch region) — extendable to other states.
export const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
  "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem",
  "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli",
  "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai",
  "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
] as const;

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const CLAIM_ACCEPTANCE_RATE_WINDOW_DAYS = 90;
export const DEFAULT_MEALS_PER_KG = 2; // documented conversion estimate — labeled as estimate in UI

export function labelFor<T extends { value: string; label: string }>(list: readonly T[], value?: string | null): string {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}
