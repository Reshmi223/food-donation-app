// REMEAL zod validation schemas — shared by API routes and forms.
import { z } from "zod";
import {
  DONOR_TYPES, NGO_TYPES, FOOD_CATEGORIES, DIETARY_TYPES, QUANTITY_UNITS,
  STORAGE_CONDITIONS, ALLERGENS,
} from "@/lib/constants";

const valueList = (arr: readonly { value: string }[]) => arr.map((x) => x.value);

export const registerSchema = z
  .object({
    role: z.enum(["DONOR", "NGO", "VOLUNTEER"], {
      message: "Select a role. Administrator accounts cannot be created by public registration.",
    }),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
    displayName: z.string().trim().min(2, "Enter your full name").max(120),
    organizationName: z.string().trim().max(160).optional().or(z.literal("")),
    organizationType: z.string().trim().optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .regex(/^(\+91[\s-]?)?[6-9][0-9]{9}$/, "Enter a valid Indian mobile number")
      .optional()
      .or(z.literal("")),
    locality: z.string().trim().max(120).optional().or(z.literal("")),
    district: z.string().trim().min(1, "Select your district"),
    state: z.string().trim().default("Tamil Nadu"),
    acceptTerms: z.boolean().refine((v) => v, { message: "You must accept the terms and privacy policy" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => d.role !== "DONOR" || !!d.organizationName,
    { message: "Organization name is required for food donors", path: ["organizationName"] }
  )
  .refine(
    (d) => d.role !== "NGO" || !!d.organizationName,
    { message: "Organization name is required for NGOs", path: ["organizationName"] }
  );

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters").regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  organizationName: z.string().trim().max(160).nullable().optional(),
  organizationType: z.string().trim().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  locality: z.string().trim().max(120).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  preferredCategories: z.array(z.string()).max(20).optional(),
  capacityPerPickup: z.number().int().min(0).max(100000).nullable().optional(),
  available: z.boolean().optional(),
});

// NOTE: role, verificationStatus, email are intentionally NOT updatable here.
// Role changes happen only through protected admin/server-side flows.

export const listingSchema = z
  .object({
    title: z.string().trim().min(4, "Give the listing a descriptive title").max(140),
    description: z.string().trim().min(20, "Describe the food in at least 20 characters").max(2000),
    category: z.enum(valueList(FOOD_CATEGORIES) as [string, ...string[]], { message: "Select a food category" }),
    dietary: z.enum(valueList(DIETARY_TYPES) as [string, ...string[]]),
    quantity: z.number().positive("Quantity must be greater than zero").max(100000),
    unit: z.enum(valueList(QUANTITY_UNITS) as [string, ...string[]]),
    servings: z.number().int().min(0).max(1000000).nullable().optional(),
    preparedAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
    pickupStartAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
    pickupDeadline: z.string().datetime({ offset: true }).or(z.string().min(10)),
    storage: z.enum(valueList(STORAGE_CONDITIONS) as [string, ...string[]]),
    allergens: z.array(z.enum(valueList(ALLERGENS) as [string, ...string[]])).max(20),
    packaging: z.string().trim().max(300).nullable().optional(),
    pickupAddress: z.string().trim().min(8, "Enter the pickup address (shown only to authorized users)").max(300),
    pickupLocality: z.string().trim().min(2, "Enter the pickup locality").max(120),
    district: z.string().trim().min(2, "Select the district").max(80),
    state: z.string().trim().max(80).default("Tamil Nadu"),
    contactInstructions: z.string().trim().max(300).nullable().optional(),
    images: z.array(z.string()).max(6).default([]),
    notes: z.string().trim().max(1000).nullable().optional(),
    donorConfirmed: z.boolean().refine((v) => v, { message: "You must confirm the food safety details are accurate" }),
    status: z.enum(["DRAFT", "AVAILABLE"]).default("AVAILABLE"),
  })
  .superRefine((d, ctx) => {
    const now = Date.now();
    const prepared = new Date(d.preparedAt).getTime();
    const start = new Date(d.pickupStartAt).getTime();
    const deadline = new Date(d.pickupDeadline).getTime();
    if (Number.isNaN(prepared)) ctx.addIssue({ code: "custom", path: ["preparedAt"], message: "Enter a valid preparation date/time" });
    if (Number.isNaN(start)) ctx.addIssue({ code: "custom", path: ["pickupStartAt"], message: "Enter a valid pickup start time" });
    if (Number.isNaN(deadline)) ctx.addIssue({ code: "custom", path: ["pickupDeadline"], message: "Enter a valid pickup deadline" });
    if (!Number.isNaN(prepared) && prepared > now + 60 * 60 * 1000) {
      ctx.addIssue({ code: "custom", path: ["preparedAt"], message: "Preparation time cannot be in the future" });
    }
    if (!Number.isNaN(deadline) && deadline <= now) {
      ctx.addIssue({ code: "custom", path: ["pickupDeadline"], message: "Pickup deadline must be in the future" });
    }
    if (!Number.isNaN(start) && !Number.isNaN(deadline) && deadline <= start) {
      ctx.addIssue({ code: "custom", path: ["pickupDeadline"], message: "Deadline must be after the pickup start time" });
    }
    if (!Number.isNaN(prepared) && !Number.isNaN(deadline) && deadline - prepared > 72 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupDeadline"],
        message: "Pickup window exceeds 72 hours from preparation — cooked food is rarely safe this long. Shorten the window or contact support.",
      });
    }
  });

export const claimCreateSchema = z.object({
  listingId: z.string().min(5),
  requestedQuantity: z.number().positive("Requested quantity must be greater than zero"),
  peopleToServe: z.number().int().min(0).max(1000000).nullable().optional(),
  intendedPickupAt: z.string().datetime({ offset: true }).or(z.string().min(10)).nullable().optional(),
  collectionNotes: z.string().trim().max(600).nullable().optional(),
});

export const safetyReportSchema = z.object({
  listingId: z.string().optional(),
  claimId: z.string().optional(),
  category: z.enum(["SPOILED_FOOD", "WRONG_INFO", "HYGIENE_CONCERN", "ALLERGEN_MISSING", "SUSPICIOUS", "OTHER"]),
  description: z.string().trim().min(15, "Describe the issue in at least 15 characters").max(2000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  subject: z.string().trim().min(4, "Enter a subject").max(160),
  message: z.string().trim().min(20, "Tell us a bit more (at least 20 characters)").max(3000),
});

export const verificationSubmitSchema = z.object({
  registrationNo: z.string().trim().min(4, "Enter your registration number").max(80),
  website: z.string().trim().url("Enter a valid URL").max(200).optional().or(z.literal("")),
  documentIds: z.array(z.string()).min(1, "Upload at least one verification document").max(6),
});

export const aiSearchSchema = z.object({
  query: z.string().trim().min(3, "Type what you are looking for").max(300),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type ClaimCreateInput = z.infer<typeof claimCreateSchema>;
