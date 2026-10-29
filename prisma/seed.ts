/**
 * REMEAL seed script — demo data for local development ONLY.
 * All seeded content is synthetic and clearly labeled as demo data.
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, createHash } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function hashCode(len = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const DEMO_PASSWORD = "Demo@1234";

async function main() {
  console.log("Seeding REMEAL demo data...");

  // Wipe in dependency order
  await db.auditLog.deleteMany();
  await db.safetyReport.deleteMany();
  await db.volunteerAssignment.deleteMany();
  await db.claimStatusHistory.deleteMany();
  await db.foodClaim.deleteMany();
  await db.foodListing.deleteMany();
  await db.notification.deleteMany();
  await db.organizationVerification.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.contactMessage.deleteMany();
  await db.upload.deleteMany();
  await db.foodCategory.deleteMany();
  await db.platformSetting.deleteMany();
  await db.user.deleteMany();

  // ---- Platform settings (configurable safety & impact rules) ----
  await db.platformSetting.createMany({
    data: [
      { key: "co2_conversion_enabled", value: "false" },
      { key: "co2_kg_per_kg_food", value: "2.5" },
      { key: "meals_per_kg_estimate", value: "2" },
      { key: "support_email", value: "support@remeal.example.org" },
      { key: "support_phone", value: "+91-40000-12345" },
      { key: "service_radius_default_km", value: "25" },
      { key: "reservation_expiry_hours", value: "12" },
      { key: "max_upload_mb", value: "4" },
    ],
  });

  // ---- Food categories ----
  const categories = [
    ["PREPARED_MEALS", "Prepared Meals", 1],
    ["BAKERY", "Bakery & Confections", 2],
    ["FRUITS_VEGETABLES", "Fruits & Vegetables", 3],
    ["PACKAGED", "Packaged & Sealed", 4],
    ["DAIRY", "Dairy & Cold Items", 5],
    ["BEVERAGES", "Beverages", 6],
    ["GRAINS_STAPLES", "Grains & Staples", 7],
    ["DESSERTS", "Desserts & Sweets", 8],
    ["OTHER", "Other", 9],
  ] as const;
  await db.foodCategory.createMany({
    data: categories.map(([key, label, sortOrder]) => ({ key, label, sortOrder })),
  });

  // ---- Users ----
  const pw = hashPassword(DEMO_PASSWORD);
  const mkUser = (data: Record<string, unknown>) => ({ passwordHash: pw, state: "Tamil Nadu", ...data });

  const [admin, donor, donor2, ngo, ngo2, ngo3, volunteer] = await Promise.all([
    db.user.create({ data: mkUser({ email: "admin@demo.remeal.app", role: "ADMIN", displayName: "Platform Admin", organizationName: "REMEAL Operations", district: "Chennai", emailVerified: true, verificationStatus: "VERIFIED" }) }),
    db.user.create({ data: mkUser({ email: "donor@demo.remeal.app", role: "DONOR", displayName: "Lakshmi Sundaram", organizationName: "Annai Catering Services", organizationType: "CATERING", phone: "+91 98400 11223", address: "12/4 Gandhi Road", locality: "Gandhipuram", district: "Coimbatore", emailVerified: true, verificationStatus: "VERIFIED" }) }),
    db.user.create({ data: mkUser({ email: "donor2@demo.remeal.app", role: "DONOR", displayName: "Ravi Kumar", organizationName: "Hotel Meenakshi Grand", organizationType: "HOTEL", phone: "+91 98400 55667", address: "45 West Masi Street", locality: "Teppakulam", district: "Madurai", emailVerified: true, verificationStatus: "VERIFIED" }) }),
    db.user.create({ data: mkUser({ email: "ngo@demo.remeal.app", role: "NGO", displayName: "Priya Rajan", organizationName: "Ullam Ketrpom Trust", organizationType: "NGO", phone: "+91 98847 22334", address: "8 Church Colony", locality: "Anna Nagar", district: "Madurai", emailVerified: true, verificationStatus: "VERIFIED", preferredCategories: JSON.stringify(["PREPARED_MEALS", "GRAINS_STAPLES"]), capacityPerPickup: 150 }) }),
    db.user.create({ data: mkUser({ email: "ngo2@demo.remeal.app", role: "NGO", displayName: "Suresh Balan", organizationName: "Nalaiya Sevai Foundation", organizationType: "SHELTER", phone: "+91 98847 55669", address: "22 Kamarajar Salai", locality: "Peelamedu", district: "Coimbatore", emailVerified: true, verificationStatus: "VERIFIED", preferredCategories: JSON.stringify(["FRUITS_VEGETABLES", "PACKAGED"]), capacityPerPickup: 80 }) }),
    db.user.create({ data: mkUser({ email: "ngo3@demo.remeal.app", role: "NGO", displayName: "Fatima Zahra", organizationName: "Hope Dindigul Community Kitchen", organizationType: "CHARITY", phone: "+91 97510 33445", address: "3 SP Road", locality: "Balakrishnapuram", district: "Dindigul", emailVerified: true, verificationStatus: "PENDING", preferredCategories: JSON.stringify(["PREPARED_MEALS"]), capacityPerPickup: 60 }) }),
    db.user.create({ data: mkUser({ email: "volunteer@demo.remeal.app", role: "VOLUNTEER", displayName: "Arun Prakash", organizationName: "REMEAL Volunteer Network", phone: "+91 90031 77889", address: "17 Bazaar Main Road", locality: "Oddanchatram", district: "Dindigul", emailVerified: true, verificationStatus: "VERIFIED", available: true }) }),
  ]);

  // ---- NGO verification requests ----
  await db.organizationVerification.createMany({
    data: [
      { organizationId: ngo3.id, reviewStatus: "PENDING", registrationNo: "TN/2019/0087321", website: "https://hopedindigul.example.org" },
      { organizationId: ngo.id, reviewStatus: "APPROVED", registrationNo: "TN/2015/0044512", reviewerId: admin.id, reviewNotes: "Registration certificate and 12A verified.", reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      { organizationId: ngo2.id, reviewStatus: "APPROVED", registrationNo: "TN/2017/0066102", reviewerId: admin.id, reviewNotes: "Shelter license verified.", reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20) },
    ],
  });

  const h = (n: number) => 1000 * 60 * 60 * n;

  // ---- Listings (synthetic demo content) ----
  const listingData = [
    {
      donorId: donor.id, title: "Wedding lunch surplus — full vegetarian meals",
      description: "Un served vegetarian meals from a wedding catering event. Sealed meal boxes with rice, sambar, poriyal, curd. Kept in hot-hold carriers, packed 1 hour before pickup window.",
      category: "PREPARED_MEALS", dietary: "VEGETARIAN", quantity: 120, unit: "MEALS", servings: 120,
      preparedAt: new Date(Date.now() - h(2)), pickupStartAt: new Date(Date.now() + h(1)), pickupDeadline: new Date(Date.now() + h(7)),
      storage: "HOT_HOLD", allergens: JSON.stringify(["MILK", "TREE_NUTS"]), packaging: "Sealed disposable meal boxes",
      pickupAddress: "VK Wedding Hall, 100 Feet Road", pickupLocality: "Gandhipuram", district: "Coimbatore",
      contactInstructions: "Ask for Mr. Sekar at the catering desk.", status: "AVAILABLE", safetyReview: "DONOR_CONFIRMED", donorConfirmed: true,
    },
    {
      donorId: donor2.id, title: "Buffet bakery items — breads & buns",
      description: "Unsold morning fresh bakery stock: sandwich bread loaves, dinner rolls and sweet buns. Factory sealed where applicable.",
      category: "BAKERY", dietary: "VEGETARIAN", quantity: 30, unit: "KG", servings: 90,
      preparedAt: new Date(Date.now() - h(4)), pickupStartAt: new Date(Date.now() - h(1)), pickupDeadline: new Date(Date.now() + h(10)),
      storage: "AMBIENT", allergens: JSON.stringify(["GLUTEN", "MILK"]), packaging: "Bakery trays",
      pickupAddress: "Hotel Meenakshi Grand, kitchen gate", pickupLocality: "Teppakulam", district: "Madurai",
      contactInstructions: "Enter via kitchen gate, ask for store manager.", status: "AVAILABLE", safetyReview: "DONOR_CONFIRMED", donorConfirmed: true,
    },
    {
      donorId: donor.id, title: "Conference refreshment surplus — fruits & juices",
      description: "Cut fruit trays and sealed juice cartons from a corporate conference. Fruits refrigerated since morning.",
      category: "FRUITS_VEGETABLES", dietary: "VEGAN", quantity: 18, unit: "KG", servings: 60,
      preparedAt: new Date(Date.now() - h(5)), pickupStartAt: new Date(Date.now() + h(2)), pickupDeadline: new Date(Date.now() + h(6)),
      storage: "REFRIGERATED", allergens: JSON.stringify([]), packaging: "Sealed trays and cartons",
      pickupAddress: "CODISSIA Trade Centre, hall 2 entrance", pickupLocality: "Avinashi Road", district: "Coimbatore",
      contactInstructions: "Call registration desk on arrival.", status: "AVAILABLE", safetyReview: "PENDING", donorConfirmed: false,
    },
    {
      donorId: donor2.id, title: "Rice bags & pulses — supermarket overstock",
      description: "Sealed 5kg rice bags and 1kg toor dal packs, near best-before but well within date. Palletised.",
      category: "GRAINS_STAPLES", dietary: "VEGETARIAN", quantity: 45, unit: "KG", servings: 200,
      preparedAt: new Date(Date.now() - h(24)), pickupStartAt: new Date(Date.now() + h(3)), pickupDeadline: new Date(Date.now() + h(30)),
      storage: "AMBIENT", allergens: JSON.stringify([]), packaging: "Factory sealed retail packs",
      pickupAddress: "Store back entrance, loading bay 3", pickupLocality: "KK Nagar", district: "Madurai",
      contactInstructions: "Report to stores-in-charge.", status: "AVAILABLE", safetyReview: "DONOR_CONFIRMED", donorConfirmed: true,
    },
    {
      donorId: donor.id, title: "Milk & curd cartons — unopened dairy surplus",
      description: "Unopened pasteurised milk sachets and curd cups. Cold-chain maintained. Needs same-day pickup.",
      category: "DAIRY", dietary: "VEGETARIAN", quantity: 40, unit: "LITRES", servings: 80,
      preparedAt: new Date(Date.now() - h(8)), pickupStartAt: new Date(Date.now() - h(1)), pickupDeadline: new Date(Date.now() + h(4)),
      storage: "REFRIGERATED", allergens: JSON.stringify(["MILK"]), packaging: "Original sealed sachets/cups",
      pickupAddress: "Annai Catering cold room", pickupLocality: "Gandhipuram", district: "Coimbatore",
      status: "AVAILABLE", safetyReview: "DONOR_CONFIRMED", donorConfirmed: true,
    },
    {
      donorId: donor2.id, title: "Birthday party dessert surplus",
      description: "Sliced cake portions and gulab jamun from a birthday event. Boxed separately.",
      category: "DESSERTS", dietary: "VEGETARIAN", quantity: 25, unit: "PLATES", servings: 25,
      preparedAt: new Date(Date.now() - h(6)), pickupStartAt: new Date(Date.now() + h(1)), pickupDeadline: new Date(Date.now() + h(8)),
      storage: "REFRIGERATED", allergens: JSON.stringify(["GLUTEN", "MILK", "EGG", "TREE_NUTS"]), packaging: "Sealed dessert boxes",
      pickupAddress: "Hotel Meenakshi Grand, banquet lobby", pickupLocality: "Teppakulam", district: "Madurai",
      status: "AVAILABLE", safetyReview: "PENDING", donorConfirmed: false,
    },
  ];
  const listings: Record<string, string> = {};
  for (const [i, l] of listingData.entries()) {
    const rec = await db.foodListing.create({ data: { ...l, remainingQuantity: l.quantity, images: JSON.stringify([]) } as never });
    listings[`L${i + 1}`] = rec.id;
  }

  // ---- Claims across the workflow (synthetic) ----
  const claimAccepted = await db.foodClaim.create({
    data: {
      listingId: listings.L2, ngoId: ngo.id, requestedQuantity: 10, approvedQuantity: 10,
      peopleToServe: 40, collectionNotes: "Will bring 2 hatchback cars.", intendedPickupAt: new Date(Date.now() + h(2)),
      pickupCode: hashCode(), status: "ACCEPTED",
    },
  });
  await db.claimStatusHistory.createMany({
    data: [
      { claimId: claimAccepted.id, actorId: ngo.id, previousStatus: null, newStatus: "REQUESTED", reason: "Claim submitted" },
      { claimId: claimAccepted.id, actorId: donor2.id, previousStatus: "REQUESTED", newStatus: "ACCEPTED", reason: "Verified NGO nearby" },
    ],
  });

  const claimReady = await db.foodClaim.create({
    data: {
      listingId: listings.L4, ngoId: ngo2.id, requestedQuantity: 20, approvedQuantity: 20,
      peopleToServe: 80, intendedPickupAt: new Date(Date.now() + h(4)), pickupCode: hashCode(), status: "READY_FOR_PICKUP",
    },
  });
  await db.claimStatusHistory.createMany({
    data: [
      { claimId: claimReady.id, actorId: ngo2.id, previousStatus: null, newStatus: "REQUESTED", reason: "Claim submitted" },
      { claimId: claimReady.id, actorId: donor2.id, previousStatus: "REQUESTED", newStatus: "ACCEPTED", reason: "Approved full quantity" },
      { claimId: claimReady.id, actorId: donor2.id, previousStatus: "ACCEPTED", newStatus: "READY_FOR_PICKUP", reason: "Packed and ready" },
    ],
  });

  const claimCompleted = await db.foodClaim.create({
    data: {
      listingId: listings.L5, ngoId: ngo.id, requestedQuantity: 25, approvedQuantity: 25,
      peopleToServe: 90, pickupCode: hashCode(), status: "COMPLETED",
    },
  });
  await db.claimStatusHistory.createMany({
    data: [
      { claimId: claimCompleted.id, actorId: ngo.id, previousStatus: null, newStatus: "REQUESTED", reason: "Claim submitted" },
      { claimId: claimCompleted.id, actorId: donor.id, previousStatus: "REQUESTED", newStatus: "ACCEPTED", reason: "Approved" },
      { claimId: claimCompleted.id, actorId: donor.id, previousStatus: "ACCEPTED", newStatus: "PICKED_UP", reason: "Collected by NGO" },
      { claimId: claimCompleted.id, actorId: ngo.id, previousStatus: "PICKED_UP", newStatus: "COMPLETED", reason: "Distributed at shelter" },
    ],
  });

  const claimPending = await db.foodClaim.create({
    data: {
      listingId: listings.L1, ngoId: ngo.id, requestedQuantity: 50,
      peopleToServe: 150, intendedPickupAt: new Date(Date.now() + h(3)), status: "REQUESTED",
    },
  });
  await db.claimStatusHistory.create({
    data: { claimId: claimPending.id, actorId: ngo.id, previousStatus: null, newStatus: "REQUESTED", reason: "Claim submitted" },
  });

  // ---- Volunteer assignment on the completed claim ----
  await db.volunteerAssignment.create({
    data: {
      claimId: claimCompleted.id, volunteerId: volunteer.id, status: "DELIVERED",
      dropoffAddress: "Ullam Ketrpom community kitchen, Anna Nagar", completedAt: new Date(Date.now() - h(1)),
    },
  });

  // ---- Notifications ----
  await db.notification.createMany({
    data: [
      { recipientId: donor.id, type: "CLAIM_SUBMITTED", title: "New claim request", message: "Ullam Ketrpom Trust requested 50 MEALS from \"Wedding lunch surplus\".", linkUrl: "/dashboard/donor/claims" },
      { recipientId: donor.id, type: "PICKUP_REMINDER", title: "Pickup window opening soon", message: "NGO collection for the dairy surplus listing starts within the hour.", linkUrl: "/dashboard/donor/claims" },
      { recipientId: ngo.id, type: "CLAIM_ACCEPTED", title: "Claim accepted", message: "Hotel Meenakshi Grand accepted your claim for 10 KG of bakery items.", linkUrl: "/dashboard/ngo/claims" },
      { recipientId: ngo.id, type: "NEW_MATCHING_LISTING", title: "New matching listing", message: "New vegetarian prepared meals are available in Coimbatore.", linkUrl: "/dashboard/ngo/browse" },
      { recipientId: volunteer.id, type: "DELIVERY_COMPLETED", title: "Delivery logged", message: "Your delivery for Ullam Ketrpom Trust was recorded as DELIVERED.", linkUrl: "/dashboard/volunteer" },
      { recipientId: admin.id, type: "VERIFICATION_UPDATE", title: "Verification pending", message: "Hope Dindigul Community Kitchen submitted verification documents.", linkUrl: "/dashboard/admin/verifications" },
    ],
  });

  // ---- Safety report (demo) ----
  await db.safetyReport.create({
    data: {
      reporterId: ngo2.id, listingId: listings.L3, category: "HYGIENE_CONCERN",
      description: "Demo report: cut fruits stored without lids at previous pickup — requesting review.",
      status: "OPEN",
    },
  });

  // ---- Contact messages ----
  await db.contactMessage.create({
    data: { name: "Demo Visitor", email: "visitor@example.org", subject: "Partnership enquiry", message: "Demo message — we run a food bank in Trichy and would like to join." },
  });

  // ---- Audit log ----
  await db.auditLog.createMany({
    data: [
      { actorId: admin.id, action: "SEED_DEMO_DATA", targetType: "SYSTEM", reason: "Initial demo seed" },
      { actorId: admin.id, action: "NGO_VERIFICATION_APPROVED", targetType: "USER", targetId: ngo.id, reason: "Registration verified" },
    ],
  });

  console.log("Seed complete. Demo accounts (password: %s):", DEMO_PASSWORD);
  console.log("  admin@demo.remeal.app     (Administrator)");
  console.log("  donor@demo.remeal.app     (Donor — Annai Catering)");
  console.log("  ngo@demo.remeal.app       (NGO — verified)");
  console.log("  ngo3@demo.remeal.app      (NGO — pending verification)");
  console.log("  volunteer@demo.remeal.app (Volunteer)");
  console.log("All seeded listings/claims/stories are synthetic demo data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
