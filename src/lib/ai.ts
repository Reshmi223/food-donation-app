// REMEAL AI service layer — server-side only.
// - Uses the approved Z AI SDK through the platform (no keys in browser code).
// - Every function has a deterministic rule-based fallback so the product works
//   without AI credentials. AI output is ALWAYS labeled as an estimate and
//   NEVER treated as food-safety certification.
// - Personal data is minimized: only listing/aggregate fields are sent.

import ZAI from "z-ai-web-dev-sdk";
import { FOOD_CATEGORIES, ALLERGENS, DIETARY_TYPES } from "@/lib/constants";

export type AISource = "ai" | "fallback";

export type AIResult<T> = {
  data: T;
  source: AISource;
  estimate: true; // always an estimate — enforced by type
  note?: string;
};

const TIMEOUT_MS = 20000;

async function callLLM(
  system: string,
  user: string,
  opts?: { json?: boolean; maxTokens?: number }
): Promise<string | null> {
  try {
    const zai = await ZAI.create();
    const completion = await Promise.race([
      zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
        ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("AI timeout")), TIMEOUT_MS)),
    ]);
    const content = (completion as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content;
    return content ?? null;
  } catch (err) {
    console.error("[ai] LLM call failed, using fallback:", err instanceof Error ? err.message : err);
    return null;
  }
}

function safeParseJSON<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ---------------- A. Smart Food Categorization ----------------

export type Categorization = {
  category: string;
  dietary: string;
  suggestedAllergens: string[];
  missingDetails: string[];
};

function ruleCategorize(title: string, description: string): Categorization {
  const text = `${title} ${description}`.toLowerCase();
  let category = "OTHER";
  if (/(rice|curry|sambar|meal|biryani|dosa|idli|chapati|roti|dal|thali|lunch|dinner|breakfast)/.test(text)) category = "PREPARED_MEALS";
  else if (/(bread|bun|cake|pastry|cookie|biscuit|bakery)/.test(text)) category = "BAKERY";
  else if (/(fruit|vegetable|salad|apple|banana|tomato|onion)/.test(text)) category = "FRUITS_VEGETABLES";
  else if (/(sealed|packet|packaged|biscuit|noodle|chip)/.test(text)) category = "PACKAGED";
  else if (/(milk|curd|yogurt|cheese|paneer|butter|dairy)/.test(text)) category = "DAIRY";
  else if (/(juice|water|beverage|tea|coffee|soda|drink)/.test(text)) category = "BEVERAGES";
  else if (/(rice bag|wheat|pulse|dal|grain|flour|atta)/.test(text)) category = "GRAINS_STAPLES";
  else if (/(sweet|dessert|jamun|jalebi|halwa|pudding|ice cream)/.test(text)) category = "DESSERTS";

  let dietary = "UNKNOWN";
  if (/\b(veg|vegetarian)\b/.test(text) && !/non[\s-]?veg/.test(text)) dietary = "VEGETARIAN";
  if (/non[\s-]?veg|chicken|mutton|fish|egg|meat/.test(text)) dietary = "NON_VEGETARIAN";
  if (/\bvegan\b/.test(text)) dietary = "VEGAN";

  const allergenRules: Array<[string, RegExp]> = [
    ["GLUTEN", /(wheat|bread|roti|chapati|atta|maida|noodle|bun|cake)/],
    ["MILK", /(milk|curd|cheese|paneer|butter|ghee|dairy)/],
    ["EGG", /\b(egg|mayonnaise)\b/],
    ["TREE_NUTS", /(almond|cashew|walnut|pistachio|nut)/],
    ["PEANUTS", /(peanut|groundnut)/],
    ["SOY", /(soy|soya)/],
    ["FISH", /\b(fish)\b/],
    ["SHELLFISH", /(prawn|shrimp|crab|shellfish)/],
    ["SESAME", /(sesame|til)/],
  ];
  const suggestedAllergens = allergenRules.filter(([, re]) => re.test(text)).map(([k]) => k);

  const missingDetails: string[] = [];
  if (text.length < 120) missingDetails.push("Add more detail about items, quantities and how they were prepared.");
  if (!/(pack|box|bag|tray|sealed|container|cover)/.test(text)) missingDetails.push("Describe the packaging (sealed boxes, trays, bags...).");
  if (!/(hour|hot|cold|fridge|refrigerat|ambient|warm)/.test(text)) missingDetails.push("State how the food has been stored since preparation.");
  if (suggestedAllergens.length === 0) missingDetails.push("Confirm whether any common allergens are present.");

  return { category, dietary, suggestedAllergens, missingDetails };
}

export async function categorizeFood(input: {
  title: string;
  description: string;
  hasImage?: boolean;
}): Promise<AIResult<Categorization>> {
  const fallback: Categorization = ruleCategorize(input.title, input.description);
  const system = `You help categorize surplus food listings for a food-rescue platform in India.
Respond with STRICT JSON only: {"category": one of [${FOOD_CATEGORIES.map((c) => c.value).join(", ")}], "dietary": one of [${DIETARY_TYPES.map((d) => d.value).join(", ")}], "suggestedAllergens": subset of [${ALLERGENS.map((a) => a.value).join(", ")}], "missingDetails": string[] (max 4 short actionable gaps in the listing)}.
IMPORTANT: never claim food is safe; allergens are suggestions that require human verification.`;
  const user = `Title: ${input.title}\nDescription: ${input.description}${input.hasImage ? "\n(A photo is attached to the listing; base your answer on the text.)" : ""}`;
  const raw = await callLLM(system, user, { json: true, maxTokens: 500 });
  const parsed = safeParseJSON<Categorization>(raw);
  if (parsed && FOOD_CATEGORIES.some((c) => c.value === parsed.category)) {
    return {
      data: {
        category: parsed.category,
        dietary: DIETARY_TYPES.some((d) => d.value === parsed.dietary) ? parsed.dietary : fallback.dietary,
        suggestedAllergens: Array.isArray(parsed.suggestedAllergens)
          ? parsed.suggestedAllergens.filter((a) => ALLERGENS.some((x) => x.value === a)).slice(0, 10)
          : [],
        missingDetails: Array.isArray(parsed.missingDetails) ? parsed.missingDetails.slice(0, 4) : [],
      },
      source: "ai",
      estimate: true,
      note: "AI suggestion — please review and correct before publishing. Allergen hints are unverified.",
    };
  }
  return {
    data: fallback,
    source: "fallback",
    estimate: true,
    note: "Rule-based estimate (AI unavailable) — please review before publishing. Allergen hints are unverified.",
  };
}

// ---------------- B. Intelligent NGO Matching ----------------

export type MatchScore = {
  ngoId: string;
  ngoName: string;
  score: number; // 0-100
  explanation: string[];
};

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Transparent, deterministic matching: proximity, capacity, dietary fit,
 * verification status, preference match and pickup window are scored and
 * explained. No sensitive personal attributes are used. Recommendations never
 * override eligibility or safety requirements.
 */
export function scoreNGOMatches(input: {
  listing: { district: string; locality: string; category: string; dietary: string; remainingQuantity: number; unit: string; pickupDeadline: Date | string; lat?: number | null; lon?: number | null };
  ngos: Array<{ id: string; displayName: string; organizationName: string | null; district: string | null; locality: string | null; verificationStatus: string; preferredCategories: string | null; capacityPerPickup: number | null; lat?: number | null; lon?: number | null }>;
  maxResults?: number;
}): AIResult<MatchScore[]> {
  const results: MatchScore[] = input.ngos.map((ngo) => {
    const explanation: string[] = [];
    let score = 0;
    const verified = ngo.verificationStatus === "VERIFIED";
    if (verified) {
      score += 25;
      explanation.push("Verified organization");
    } else {
      explanation.push("Verification pending — not yet eligible to claim");
    }
    if (ngo.district && ngo.district === input.listing.district) {
      score += 30;
      explanation.push(`Same district (${input.listing.district})`);
    } else if (ngo.district) {
      score += 8;
      explanation.push(`Nearby region (${ngo.district})`);
    }
    if (ngo.lat != null && ngo.lon != null && input.listing.lat != null && input.listing.lon != null) {
      const d = distanceKm(input.listing.lat, input.listing.lon, ngo.lat, ngo.lon);
      if (d <= 15) {
        score += 20;
        explanation.push(`Approx. ${d.toFixed(1)} km away`);
      } else if (d <= 40) {
        score += 10;
        explanation.push(`Approx. ${d.toFixed(0)} km away`);
      }
    }
    const prefs: string[] = ngo.preferredCategories ? JSON.parse(ngo.preferredCategories) : [];
    if (prefs.includes(input.listing.category)) {
      score += 15;
      explanation.push("Matches the NGO's food preferences");
    }
    if (ngo.capacityPerPickup) {
      if (ngo.capacityPerPickup >= input.listing.remainingQuantity) {
        score += 10;
        explanation.push(`Capacity (${ngo.capacityPerPickup}) covers available quantity`);
      } else {
        explanation.push(`Capacity ${ngo.capacityPerPickup} — partial pickup may be needed`);
      }
    }
    const hoursLeft =
      (new Date(input.listing.pickupDeadline).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 4) {
      explanation.push(`Urgent: pickup deadline in ${Math.max(1, Math.round(hoursLeft))}h`);
    }
    return {
      ngoId: ngo.id,
      ngoName: ngo.organizationName || ngo.displayName,
      score: Math.min(100, score),
      explanation,
    };
  });
  results.sort((a, b) => b.score - a.score);
  return {
    data: results.slice(0, input.maxResults ?? 5),
    source: "fallback",
    estimate: true,
    note: "Rule-based ranking estimate — transparent scoring, never an automatic assignment.",
  };
}

// ---------------- C. Demand Forecasting ----------------

export type DemandForecast = {
  sufficient: boolean;
  message?: string;
  byLocality: Array<{ district: string; claims: number; quantity: number }>;
  topCategories: Array<{ category: string; claims: number }>;
  busyPeriods: Array<{ period: string; claims: number }>;
  unmetDemand: Array<{ district: string; claimsWithoutSuccess: number }>;
  confidence: "low" | "medium" | "high";
};

export async function forecastDemand(input: {
  claims: Array<{ district: string | null; category: string; createdAt: Date; status: string; quantity: number }>;
}): Promise<AIResult<DemandForecast>> {
  const total = input.claims.length;
  if (total < 10) {
    return {
      data: {
        sufficient: false,
        message: "Not enough data yet — forecasting needs at least 10 completed claim records.",
        byLocality: [],
        topCategories: [],
        busyPeriods: [],
        unmetDemand: [],
        confidence: "low",
      },
      source: "fallback",
      estimate: true,
      note: "Insufficient historical data. No prediction fabricated.",
    };
  }
  const byDistrict = new Map<string, { claims: number; quantity: number }>();
  const byCategory = new Map<string, number>();
  const byHour = new Map<number, number>();
  let unmet = new Map<string, number>();
  for (const c of input.claims) {
    const d = c.district ?? "Unknown";
    const agg = byDistrict.get(d) ?? { claims: 0, quantity: 0 };
    agg.claims += 1;
    if (c.status === "COMPLETED") agg.quantity += c.quantity;
    byDistrict.set(d, agg);
    byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
    const hourBucket = Math.floor(c.createdAt.getHours() / 6) * 6;
    byHour.set(hourBucket, (byHour.get(hourBucket) ?? 0) + 1);
    if (!["COMPLETED", "PICKED_UP", "DELIVERED"].includes(c.status)) {
      unmet.set(d, (unmet.get(d) ?? 0) + 1);
    }
  }
  const periodNames: Record<number, string> = { 0: "00–06h", 6: "06–12h", 12: "12–18h", 18: "18–24h" };
  const data: DemandForecast = {
    sufficient: true,
    byLocality: [...byDistrict.entries()]
      .map(([district, v]) => ({ district, ...v }))
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 8),
    topCategories: [...byCategory.entries()]
      .map(([category, claims]) => ({ category, claims }))
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 5),
    busyPeriods: [...byHour.entries()]
      .map(([h, claims]) => ({ period: periodNames[h] ?? `${h}h`, claims }))
      .sort((a, b) => b.claims - a.claims),
    unmetDemand: [...unmet.entries()]
      .map(([district, claimsWithoutSuccess]) => ({ district, claimsWithoutSuccess }))
      .sort((a, b) => b.claimsWithoutSuccess - a.claimsWithoutSuccess)
      .slice(0, 5),
    confidence: total >= 40 ? "high" : total >= 20 ? "medium" : "low",
  };
  // Optional LLM narrative on top of deterministic statistics
  const summary = await callLLM(
    "You are an analytics assistant for a food rescue platform. Summarize demand patterns in 2 short sentences. Do not invent numbers; only reference what is given.",
    JSON.stringify({ byLocality: data.byLocality.slice(0, 5), topCategories: data.topCategories, busyPeriods: data.busyPeriods.slice(0, 3) }),
    { maxTokens: 120 }
  );
  return {
    data,
    source: summary ? "ai" : "fallback",
    estimate: true,
    note: summary
      ? `Estimates from historical claims (confidence: ${data.confidence}). ${summary.trim()}`
      : `Statistical estimates from historical claims (confidence: ${data.confidence}).`,
  };
}

// ---------------- E. AI Listing Assistant ----------------

export async function listingAssistant(input: {
  title: string;
  description: string;
}): Promise<AIResult<{ improvedTitle?: string; improvedDescription?: string; tips: string[] }>> {
  const tips: string[] = [];
  const d = input.description;
  if (d.length < 60) tips.push("Description is short — mention what the food is, how it was prepared and packed.");
  if (!/(pack|box|bag|tray|sealed|container)/i.test(d)) tips.push("Describe the packaging so NGOs can plan transport.");
  if (!/(hour|morning|evening|today|yesterday|am|pm|fresh)/i.test(d)) tips.push("Mention when the food was prepared and how it has been stored.");
  if (!/(serve|people|portion|piece|serves)/i.test(d)) tips.push("Estimate how many people or portions this could serve.");
  if (!/(allerg|nut|dairy|gluten|egg)/i.test(d)) tips.push("Note any known allergens — NGOs rely on this for safe distribution.");

  const system = `You improve surplus-food listing text for a food rescue platform. Do NOT invent preparation times, ingredients, allergen facts or safety claims. Respond with STRICT JSON: {"improvedTitle": string|null, "improvedDescription": string|null, "tips": string[] (max 4)}. Only use facts present in the original text; suggest adding missing info via tips.`;
  const user = `Title: ${input.title}\nDescription: ${d}`;
  const raw = await callLLM(system, user, { json: true, maxTokens: 600 });
  const parsed = safeParseJSON<{ improvedTitle?: string; improvedDescription?: string; tips?: string[] }>(raw);
  if (parsed && (parsed.improvedDescription || (parsed.tips && parsed.tips.length))) {
    return {
      data: {
        improvedTitle: parsed.improvedTitle || undefined,
        improvedDescription: parsed.improvedDescription || undefined,
        tips: (parsed.tips ?? []).slice(0, 4),
      },
      source: "ai",
      estimate: true,
      note: "AI-assisted draft — verify every fact before publishing. The assistant never adds safety claims.",
    };
  }
  return {
    data: { tips: tips.length ? tips : ["Listing looks reasonably complete — double-check pickup times and contact instructions."] },
    source: "fallback",
    estimate: true,
    note: "Rule-based suggestions (AI unavailable).",
  };
}

// ---------------- F. Natural-language search → validated filters ----------------

export type NLSearchFilters = {
  categories?: string[];
  dietary?: string[];
  districts?: string[];
  maxHoursToDeadline?: number;
  keywords?: string[];
  minQuantity?: number;
};

function ruleParseQuery(query: string): NLSearchFilters {
  const q = query.toLowerCase();
  const filters: NLSearchFilters = { keywords: [] };
  const cats = FOOD_CATEGORIES.filter((c) =>
    q.includes(c.label.toLowerCase().split(" ")[0]) ||
    (c.value === "PREPARED_MEALS" && /(meal|lunch|dinner|food|rice|curry)/.test(q)) ||
    (c.value === "FRUITS_VEGETABLES" && /(fruit|vegetable)/.test(q)) ||
    (c.value === "BAKERY" && /(bread|bakery|bun|cake)/.test(q))
  ).map((c) => c.value);
  if (cats.length) filters.categories = [...new Set(cats)];
  if (/vegetarian|veg\b/.test(q) && !/non[\s-]?veg/.test(q)) filters.dietary = ["VEGETARIAN", "VEGAN"];
  if (/non[\s-]?veg/.test(q)) filters.dietary = ["NON_VEGETARIAN"];
  if (/vegan/.test(q)) filters.dietary = ["VEGAN"];
  const districtHit = q.match(/near ([a-z\s]+?)(?:\.|$|,)/);
  if (districtHit) filters.keywords?.push(districtHit[1].trim());
  if (/today/.test(q)) filters.maxHoursToDeadline = 24;
  if (/(breakfast|morning)/.test(q)) filters.maxHoursToDeadline = 8;
  return filters;
}

export async function nlSearchFilters(query: string): Promise<AIResult<NLSearchFilters>> {
  const fallback = ruleParseQuery(query);
  const system = `Convert a natural-language food search into STRICT JSON database filters for a food rescue platform. NEVER output SQL. Schema: {"categories": subset of [${FOOD_CATEGORIES.map((c) => c.value).join(", ")}], "dietary": subset of [${DIETARY_TYPES.map((d) => d.value).join(", ")}], "districts": string[] (Tamil Nadu district names only), "maxHoursToDeadline": number|null, "keywords": string[], "minQuantity": number|null}. Omit unknown fields instead of guessing.`;
  const raw = await callLLM(system, `Search query: "${query}"`, { json: true, maxTokens: 400 });
  const parsed = safeParseJSON<NLSearchFilters>(raw);
  if (parsed) {
    const filters: NLSearchFilters = {};
    if (Array.isArray(parsed.categories)) filters.categories = parsed.categories.filter((c) => FOOD_CATEGORIES.some((f) => f.value === c));
    if (Array.isArray(parsed.dietary)) filters.dietary = parsed.dietary.filter((d) => DIETARY_TYPES.some((f) => f.value === d));
    if (Array.isArray(parsed.districts)) filters.districts = parsed.districts.slice(0, 5).map((d) => String(d).slice(0, 60));
    if (typeof parsed.maxHoursToDeadline === "number" && parsed.maxHoursToDeadline > 0 && parsed.maxHoursToDeadline <= 168) {
      filters.maxHoursToDeadline = parsed.maxHoursToDeadline;
    }
    if (typeof parsed.minQuantity === "number" && parsed.minQuantity > 0) filters.minQuantity = Math.min(parsed.minQuantity, 100000);
    if (Array.isArray(parsed.keywords)) filters.keywords = parsed.keywords.slice(0, 5).map((k) => String(k).slice(0, 60));
    return { data: filters, source: "ai", estimate: true, note: "AI-interpreted filters — shown below so you can verify." };
  }
  return { data: fallback, source: "fallback", estimate: true, note: "Keyword-interpreted filters (AI unavailable)." };
}

// ---------------- D. Surplus quantity recommendations ----------------

export async function recommendSurplusQuantity(input: {
  history: Array<{ category: string; quantity: number; unit: string; status: string; month: string }>;
}): Promise<AIResult<{ suggestions: Array<{ category: string; unit: string; suggestedQuantity: number; rationale: string }>; note: string }>> {
  if (input.history.length < 3) {
    return {
      data: { suggestions: [], note: "Not enough donation history yet — publish a few listings to unlock planning suggestions." },
      source: "fallback",
      estimate: true,
    };
  }
  const byCat = new Map<string, { total: number; completed: number; unit: string; count: number }>();
  for (const h of input.history) {
    const agg = byCat.get(h.category) ?? { total: 0, completed: 0, unit: h.unit, count: 0 };
    agg.total += h.quantity;
    if (h.status === "COMPLETED") agg.completed += h.quantity;
    agg.count += 1;
    byCat.set(h.category, agg);
  }
  const suggestions = [...byCat.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([category, v]) => {
      const avg = Math.round((v.total / v.count) * 10) / 10;
      const rescued = v.completed > 0;
      return {
        category,
        unit: v.unit,
        suggestedQuantity: Math.max(1, Math.round(avg * (rescued ? 1.1 : 0.8))),
        rationale: rescued
          ? `Average listing ${avg} ${v.unit} with strong pickup success — a similar or slightly larger amount is likely to be claimed (estimate).`
          : `Average listing ${avg} ${v.unit}; some past listings went unclaimed, so a slightly smaller amount may rescue more reliably (estimate).`,
      };
    })
    .slice(0, 4);
  return {
    data: { suggestions, note: "Planning estimates based on your past listings — not guaranteed demand." },
    source: "fallback",
    estimate: true,
  };
}
