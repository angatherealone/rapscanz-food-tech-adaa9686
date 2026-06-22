import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_LIMIT = 30;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  pro_max: "Pro Max",
  unlimited: "Unlimited",
};

const UNLIMITED_LIMIT = 999_999;

function planLimit(plan: string | null | undefined): number {
  if (plan === "unlimited") return UNLIMITED_LIMIT;
  if (plan === "pro_max") return 240;
  if (plan === "pro_plus") return 120;
  if (plan === "pro") return 60;
  return FREE_LIMIT;
}

const ScanInput = z.object({
  scanType: z.enum(["ingredients", "barcode"]),
  text: z.string().max(10_000).optional(),
  barcode: z.string().regex(/^[A-Za-z0-9\-]{1,32}$/).optional(),
  imageDataUrl: z.string().max(7_500_000).optional(),
});

export type ScanResult = {
  productName: string;
  brand?: string;
  parentCompany?: string;
  category?: string;
  rating: "good" | "okay" | "caution" | "avoid";
  healthScore: number;
  caloriesKcal: number;
  summary: string;
  advantages: string[];
  disadvantages: string[];
  cautions: {
    ingredient: string;
    concern: string;
    severity: "low" | "medium" | "high";
    percentage?: string;
    chemicalFormula?: string;
    scientificName?: string;
  }[];
  personalAdvice?: string;
  consumptionTip?: { safeDaily: string; limit: string; source: string };
  riskProfile?: {
    illnesses: string[];
    addictions: string[];
    chronicDamage: string[];
    temporaryEffects: string[];
    organDamage: string[];
  };
  bodyDamage?: { part: string; severity: "low" | "medium" | "high"; reason: string; trigger?: string }[];
  bodyBenefit?: { part: string; severity: "low" | "medium" | "high"; reason: string; trigger?: string }[];
  dietaryType?: "veg" | "non-veg" | "vegan" | "unknown";
  dietaryReason?: string;
  aiRegistryFallback?: boolean;
};




export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("scan_count, is_subscribed, subscription_expires_at, email, weight_kg, height_cm, illnesses, allergies, gender, plan, plan_expires_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getProfile error", error);
      throw new Error("Unable to load your profile. Please try again.");
    }
    const profile = data ?? { scan_count: 0, is_subscribed: false, subscription_expires_at: null, email: null, weight_kg: null, height_cm: null, illnesses: null, allergies: null, gender: null, plan: "free", plan_expires_at: null };

    const { data: roleRows } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    const isUnlimited = roles.some((r) => r === "admin" || r === "founder" || r === "collaborator");

    let effectivePlan: string;
    if (isUnlimited) {
      effectivePlan = "unlimited";
    } else {
      effectivePlan = (profile.plan === "pro" || profile.plan === "pro_plus" || profile.plan === "pro_max") && profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()
        ? "free"
        : (profile.plan ?? "free");
    }
    const limit = planLimit(effectivePlan);
    return {
      ...profile,
      plan: effectivePlan,
      planLabel: PLAN_LABELS[effectivePlan] ?? "Free",
      scanLimit: limit,
      freeLimit: FREE_LIMIT,
      remaining: isUnlimited ? UNLIMITED_LIMIT : Math.max(0, limit - (profile.scan_count ?? 0)),
      roles,
      isUnlimited,
    };
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("scans")
      .select("id, product_name, scan_type, rating, health_score, calories_kcal, summary, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("listScans error", error);
      throw new Error("Unable to load your scan history. Please try again.");
    }
    return data ?? [];
  });

export const getScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("scans")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("getScan error", error);
      throw new Error("Unable to load this scan. Please try again.");
    }
    return row;
  });

export const logConsumption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scanId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: scan, error: sErr } = await supabase
      .from("scans")
      .select("id, product_name, calories_kcal")
      .eq("id", data.scanId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr || !scan) {
      console.error("logConsumption lookup", sErr);
      throw new Error("Scan not found.");
    }
    const { error } = await supabase.from("consumption").insert({
      user_id: userId,
      scan_id: scan.id,
      product_name: scan.product_name,
      calories_kcal: scan.calories_kcal ?? 0,
    });
    if (error) {
      console.error("logConsumption insert", error);
      throw new Error("Couldn't log this. Please try again.");
    }
    return { ok: true };
  });

export const getWeeklyConsumption = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("consumption")
      .select("id, product_name, calories_kcal, consumed_at")
      .eq("user_id", userId)
      .gte("consumed_at", since.toISOString())
      .order("consumed_at", { ascending: false });
    if (error) {
      console.error("getWeeklyConsumption", error);
      throw new Error("Unable to load your weekly log.");
    }
    return data ?? [];
  });

function isValidBarcodeChecksum(code: string): boolean {
  // Supports EAN-8, UPC-A (12), EAN-13, ITF-14
  if (!/^\d+$/.test(code)) return false;
  const len = code.length;
  if (![8, 12, 13, 14].includes(len)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  // From rightmost data digit, weights alternate 3,1,3,1...
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w;
  }
  const calc = (10 - (sum % 10)) % 10;
  return calc === check;
}

type BarcodeLookup = {
  name: string;
  brand?: string;
  parentCompany?: string;
  category?: string;
  quantity?: string;
  ingredients: string;
  source: string;
  nutriments?: any;
  labels?: string;
};

async function applyRuleBasedBodyImpact(result: ScanResult, lookup: BarcodeLookup) {
  const { extractNutriments, computeOrganImpact } = await import("@/lib/organImpact");
  const nutri = extractNutriments({ nutriments: lookup.nutriments ?? {} });
  const { bodyDamage, bodyBenefit } = computeOrganImpact(nutri, lookup.ingredients || "");
  result.bodyDamage = bodyDamage;
  result.bodyBenefit = bodyBenefit;
}


// GS1 country prefix → country (official GS1 prefix list, complete coverage)
// Used to identify the country of issue for any EAN-13 / UPC-A / ITF-14 barcode,
// which helps the AI infer the parent company / sister brand when public DBs miss.
function gs1Country(barcode: string): string | undefined {
  if (!/^\d{8,14}$/.test(barcode)) return undefined;
  // For EAN-13 / UPC-A / ITF-14 the country prefix is the first 3 digits.
  // UPC-A (12) is treated as EAN-13 with a leading "0" (USA/Canada range).
  const code = barcode.length === 12 ? "0" + barcode : barcode;
  const n = Number(code.slice(0, 3));
  // 000-019, 030-039, 060-139: United States & Canada
  if (n <= 19) return "USA / Canada";
  if (n >= 20 && n <= 29) return "In-store / restricted circulation";
  if (n >= 30 && n <= 39) return "USA (drugs / National Drug Code)";
  if (n >= 40 && n <= 49) return "In-store / private label";
  if (n >= 50 && n <= 59) return "Coupons";
  if (n >= 60 && n <= 139) return "USA / Canada";
  if (n >= 200 && n <= 299) return "In-store / restricted circulation";
  if (n >= 300 && n <= 379) return "France / Monaco";
  if (n === 380) return "Bulgaria";
  if (n === 383) return "Slovenia";
  if (n === 385) return "Croatia";
  if (n === 387) return "Bosnia & Herzegovina";
  if (n === 389) return "Montenegro";
  if (n === 390) return "Kosovo";
  if (n >= 400 && n <= 440) return "Germany";
  if (n >= 450 && n <= 459) return "Japan";
  if (n >= 460 && n <= 469) return "Russia";
  if (n === 470) return "Kyrgyzstan";
  if (n === 471) return "Taiwan";
  if (n === 474) return "Estonia";
  if (n === 475) return "Latvia";
  if (n === 476) return "Azerbaijan";
  if (n === 477) return "Lithuania";
  if (n === 478) return "Uzbekistan";
  if (n === 479) return "Sri Lanka";
  if (n === 480) return "Philippines";
  if (n === 481) return "Belarus";
  if (n === 482) return "Ukraine";
  if (n === 483) return "Turkmenistan";
  if (n === 484) return "Moldova";
  if (n === 485) return "Armenia";
  if (n === 486) return "Georgia";
  if (n === 487) return "Kazakhstan";
  if (n === 488) return "Tajikistan";
  if (n === 489) return "Hong Kong";
  if (n >= 490 && n <= 499) return "Japan";
  if (n >= 500 && n <= 509) return "United Kingdom";
  if (n >= 520 && n <= 521) return "Greece";
  if (n === 528) return "Lebanon";
  if (n === 529) return "Cyprus";
  if (n === 530) return "Albania";
  if (n === 531) return "North Macedonia";
  if (n === 535) return "Malta";
  if (n === 539) return "Ireland";
  if (n >= 540 && n <= 549) return "Belgium / Luxembourg";
  if (n === 560) return "Portugal";
  if (n === 569) return "Iceland";
  if (n >= 570 && n <= 579) return "Denmark / Faroe Islands / Greenland";
  if (n === 590) return "Poland";
  if (n === 594) return "Romania";
  if (n === 599) return "Hungary";
  if (n >= 600 && n <= 601) return "South Africa";
  if (n === 603) return "Ghana";
  if (n === 604) return "Senegal";
  if (n === 608) return "Bahrain";
  if (n === 609) return "Mauritius";
  if (n === 611) return "Morocco";
  if (n === 613) return "Algeria";
  if (n === 615) return "Nigeria";
  if (n === 616) return "Kenya";
  if (n === 617) return "Cameroon";
  if (n === 618) return "Côte d'Ivoire";
  if (n === 619) return "Tunisia";
  if (n === 620) return "Tanzania";
  if (n === 621) return "Syria";
  if (n === 622) return "Egypt";
  if (n === 623) return "Brunei";
  if (n === 624) return "Libya";
  if (n === 625) return "Jordan";
  if (n === 626) return "Iran";
  if (n === 627) return "Kuwait";
  if (n === 628) return "Saudi Arabia";
  if (n === 629) return "United Arab Emirates";
  if (n === 630) return "Qatar";
  if (n === 631) return "Namibia";
  if (n === 632) return "Rwanda";
  if (n >= 640 && n <= 649) return "Finland";
  if (n >= 690 && n <= 699) return "China";
  if (n >= 700 && n <= 709) return "Norway";
  if (n === 729) return "Israel";
  if (n >= 730 && n <= 739) return "Sweden";
  if (n === 740) return "Guatemala";
  if (n === 741) return "El Salvador";
  if (n === 742) return "Honduras";
  if (n === 743) return "Nicaragua";
  if (n === 744) return "Costa Rica";
  if (n === 745) return "Panama";
  if (n === 746) return "Dominican Republic";
  if (n === 750) return "Mexico";
  if (n >= 754 && n <= 755) return "Canada";
  if (n === 759) return "Venezuela";
  if (n >= 760 && n <= 769) return "Switzerland / Liechtenstein";
  if (n >= 770 && n <= 771) return "Colombia";
  if (n === 773) return "Uruguay";
  if (n === 775) return "Peru";
  if (n === 777) return "Bolivia";
  if (n === 778 || n === 779) return "Argentina";
  if (n === 780) return "Chile";
  if (n === 784) return "Paraguay";
  if (n === 786) return "Ecuador";
  if (n >= 789 && n <= 790) return "Brazil";
  if (n >= 800 && n <= 839) return "Italy / San Marino / Vatican City";
  if (n >= 840 && n <= 849) return "Spain / Andorra";
  if (n === 850) return "Cuba";
  if (n === 858) return "Slovakia";
  if (n === 859) return "Czechia";
  if (n === 860) return "Serbia";
  if (n === 865) return "Mongolia";
  if (n === 867) return "North Korea";
  if (n >= 868 && n <= 869) return "Turkey";
  if (n >= 870 && n <= 879) return "Netherlands";
  if (n === 880) return "South Korea";
  if (n === 881) return "Myanmar";
  if (n === 883) return "Macau";
  if (n === 884) return "Cambodia";
  if (n === 885) return "Thailand";
  if (n === 888) return "Singapore";
  if (n === 890) return "India";
  if (n === 893) return "Vietnam";
  if (n === 894) return "Bangladesh";
  if (n === 896) return "Pakistan";
  if (n === 899) return "Indonesia";
  if (n >= 900 && n <= 919) return "Austria";
  if (n >= 930 && n <= 939) return "Australia";
  if (n >= 940 && n <= 949) return "New Zealand";
  if (n === 950) return "GS1 Global Office (gift cards)";
  if (n === 951) return "GS1 Global Office (EPC)";
  if (n === 955) return "Malaysia";
  if (n === 958) return "Macau";
  if (n >= 960 && n <= 969) return "GS1 Global Office (GTIN-8)";
  if (n >= 977 && n <= 977) return "ISSN (periodicals)";
  if (n >= 978 && n <= 979) return "ISBN (books)";
  if (n === 980) return "Refund receipts";
  if (n >= 981 && n <= 984) return "Common currency coupons";
  if (n >= 990 && n <= 999) return "Coupons";
  return undefined;
}


async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookup | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: { "User-Agent": "RAPscanz/1.0 (https://rapscanz-food-tech.lovable.app)" },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const p = json?.product;
    if (!p || json?.status === 0) return null;
    const name = p.product_name || p.product_name_en || p.generic_name || "";
    const ingredients = p.ingredients_text || p.ingredients_text_en || p.ingredients_text_hi || "";
    if (!name && !ingredients) return null;
    const brand = (p.brands || "").split(",")[0]?.trim() || undefined;
    const parentCompany = p.brand_owner || p.owner || undefined;
    const category = (p.categories || "").split(",").pop()?.trim() || undefined;
    return {
      name: name || `Product ${barcode}`,
      brand,
      parentCompany,
      category,
      quantity: p.quantity || undefined,
      ingredients,
      source: "Open Food Facts",
      nutriments: p.nutriments ?? null,
      labels: p.labels || "",
    };
  } catch { return null; }
}


async function lookupUpcItemDb(barcode: string): Promise<BarcodeLookup | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`, {
      headers: { "User-Agent": "RAPscanz/1.0" },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const item = json?.items?.[0];
    if (!item) return null;
    const name: string = item.title || "";
    if (!name) return null;
    return {
      name,
      brand: item.brand || undefined,
      category: item.category || undefined,
      ingredients: "",
      source: "UPCitemdb",
    };
  } catch { return null; }
}

async function lookupBarcode(barcode: string): Promise<BarcodeLookup | null> {
  const tryOne = async (code: string): Promise<BarcodeLookup | null> => {
    const off = await lookupOpenFoodFacts(code);
    if (off && off.ingredients) return off;
    const upc = await lookupUpcItemDb(code);
    if (upc) return {
      ...upc,
      ingredients: off?.ingredients ?? upc.ingredients,
      parentCompany: off?.parentCompany ?? upc.parentCompany,
      category: upc.category ?? off?.category,
    };
    return off;
  };
  let result = await tryOne(barcode);
  // UPC-A (12 digits) is equivalent to EAN-13 with a leading "0".
  // Retry the padded form if the first lookup came back empty / not found.
  if (!result && /^\d{12}$/.test(barcode)) {
    result = await tryOne("0" + barcode);
  }
  return result;
}



// ------------------------------------------------------------
// OCR: extract candidate EAN-13 / UPC-A barcodes from a photo.
// Uses Gemini vision to read printed numeric sequences off a
// package or receipt, then filters them with the GS1 check-digit
// algorithm so we only ever forward mathematically-valid barcodes.
// ------------------------------------------------------------
async function extractBarcodeFromImage(imageDataUrl: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are an OCR engine for product packaging photos. Read ALL printed numeric sequences from the image — especially the digits printed under / next to the barcode lines on the package, on a price-tag sticker, or on a printed receipt. Return ONLY this JSON: { "numbers": string[] }. Each item must be digits-only (strip spaces, dashes, "EAN", "UPC", "No."). Include ANY numeric run you can read of length 8 to 14. DO NOT include dates (DD/MM/YYYY, MFG, EXP, USE BY), prices (with currency symbols or decimal points), batch codes shorter than 8 digits, phone numbers, or weight/volume figures (g, ml, kg). Return [] if nothing is readable.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract candidate barcode numbers from this image." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const raw: string[] = Array.isArray(parsed?.numbers) ? parsed.numbers : [];
    // Normalise, then also try every 12/13-digit window inside longer runs.
    const candidates = new Set<string>();
    for (const r of raw) {
      const digits = String(r).replace(/\D/g, "");
      if (!digits) continue;
      if (digits.length >= 8 && digits.length <= 14) candidates.add(digits);
      // sliding windows for 12 and 13 digit barcodes embedded in longer strings
      for (const w of [12, 13]) {
        if (digits.length > w) {
          for (let i = 0; i + w <= digits.length; i++) candidates.add(digits.slice(i, i + w));
        }
      }
    }
    // Prefer EAN-13, then UPC-A (12, also retry padded), then EAN-8/ITF-14.
    const ranked = [...candidates].sort((a, b) => {
      const rank = (s: string) => (s.length === 13 ? 0 : s.length === 12 ? 1 : s.length === 14 ? 2 : 3);
      return rank(a) - rank(b);
    });
    for (const c of ranked) {
      if (isValidBarcodeChecksum(c)) return c;
      // UPC-A padded to EAN-13
      if (c.length === 12 && isValidBarcodeChecksum("0" + c)) return "0" + c;
    }
    return null;
  } catch {
    return null;
  }
}

async function callGemini(messages: any[]): Promise<ScanResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service is not configured.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Too many scans right now. Please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please contact the app owner.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, t.slice(0, 500));
    throw new Error("The analysis service is temporarily unavailable. Please try again.");
  }
  const data = await res.json() as any;
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try { parsed = JSON.parse(content); } catch {
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  return {
    productName: parsed.productName ?? "Unknown product",
    brand: typeof parsed.brand === "string" && parsed.brand.trim() ? parsed.brand.trim() : undefined,
    parentCompany: typeof parsed.parentCompany === "string" && parsed.parentCompany.trim() ? parsed.parentCompany.trim() : undefined,
    category: typeof parsed.category === "string" && parsed.category.trim() ? parsed.category.trim() : undefined,
    rating: (parsed.rating ?? "okay") as ScanResult["rating"],
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore ?? 50)))),
    caloriesKcal: Math.max(0, Math.min(5000, Math.round(Number(parsed.caloriesKcal ?? 0)))),
    summary: parsed.summary ?? "",
    advantages: Array.isArray(parsed.advantages) ? parsed.advantages : [],
    disadvantages: Array.isArray(parsed.disadvantages) ? parsed.disadvantages : [],
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    personalAdvice: typeof parsed.personalAdvice === "string" ? parsed.personalAdvice : undefined,
    consumptionTip:
      parsed.consumptionTip && typeof parsed.consumptionTip === "object"
        ? {
            safeDaily: String(parsed.consumptionTip.safeDaily ?? ""),
            limit: String(parsed.consumptionTip.limit ?? ""),
            source: String(parsed.consumptionTip.source ?? ""),
          }
        : undefined,
    riskProfile:
      parsed.riskProfile && typeof parsed.riskProfile === "object"
        ? {
            illnesses: Array.isArray(parsed.riskProfile.illnesses) ? parsed.riskProfile.illnesses.map(String) : [],
            addictions: Array.isArray(parsed.riskProfile.addictions) ? parsed.riskProfile.addictions.map(String) : [],
            chronicDamage: Array.isArray(parsed.riskProfile.chronicDamage) ? parsed.riskProfile.chronicDamage.map(String) : [],
            temporaryEffects: Array.isArray(parsed.riskProfile.temporaryEffects) ? parsed.riskProfile.temporaryEffects.map(String) : [],
            organDamage: Array.isArray(parsed.riskProfile.organDamage) ? parsed.riskProfile.organDamage.map(String) : [],
          }
        : undefined,
    bodyDamage: Array.isArray(parsed.bodyDamage) ? parsed.bodyDamage : undefined,
    bodyBenefit: Array.isArray(parsed.bodyBenefit) ? parsed.bodyBenefit : undefined,
    dietaryType: ["veg", "non-veg", "vegan", "unknown"].includes(parsed.dietaryType) ? parsed.dietaryType : undefined,
    dietaryReason: typeof parsed.dietaryReason === "string" ? parsed.dietaryReason : undefined,
  };
}

const SYSTEM_PROMPT = `You are a food-safety nutrition analyst for the RAPscanz app.
You identify packaged foods — chocolates, biscuits, chips, dairy, beverages, instant foods, condiments — from BOTH Indian (Amul, Britannia, Parle, Haldiram's, Mother Dairy, MTR, Tata, ITC, Patanjali, Nestlé India, etc.) and international brands.
Respond ONLY with valid JSON matching this schema:
{
  "productName": string (the specific product / sub-brand the consumer recognises, e.g. "Dairy Milk Silk", "Maggi 2-Minute Noodles", "Amul Gold Milk"),
  "brand": string (the sub-brand or product line if there is one, e.g. "Dairy Milk", "Maggi", "Lay's"),
  "parentCompany": string (the parent / owner company, e.g. "Mondelez (formerly Cadbury)", "Nestlé", "PepsiCo", "Hindustan Unilever", "ITC Limited", "Amul / GCMMF"),
  "category": string (short, SPECIFIC food category, e.g. "Milk chocolate bar", "Cream-filled biscuit", "Salted potato chips", "Energy/protein bar", "Extruded corn snack (chiki/kurkure-style)", "Peanut-jaggery chikki", "Toned milk"),
  "rating": "good" | "okay" | "caution" | "avoid",
  "healthScore": number (integer 0-100; penalize ultra-processing, high sugar/sodium/saturated fat, trans fats, artificial additives; reward whole ingredients, fiber, protein, healthy fats),
  "caloriesKcal": number (integer; best estimate of CALORIES PER TYPICAL SERVING in kcal. Use standard serving sizes if not given (e.g. 30g chips, 250ml drink, 1 biscuit, 1 chocolate piece ~12g). Use 0 only for true zero-calorie products like water.),
  "summary": string (1-2 sentences, plain English),
  "advantages": string[] (3-6 short bullets),
  "disadvantages": string[] (3-6 short bullets),
  "cautions": [ { "ingredient": string, "concern": string, "severity": "low"|"medium"|"high" } ],
  "personalAdvice": string (1-2 sentences specific to the user's health profile if provided — flag listed allergens, warn on conflicts with diabetes/hypertension/PCOS, reference BMI/gender if relevant. Omit/empty if no profile.),
  "dietaryType": "veg" | "non-veg" | "vegan" | "unknown" (REQUIRED — see rules below),
  "dietaryReason": string (one short clause explaining the classification, e.g. "Contains milk solids and butter (lacto-vegetarian)", "Contains gelatin (animal-derived)", "Plant-based ingredients only")
}
CATEGORY ACCURACY RULES (CRITICAL — do NOT mix up product types):
- Be PRECISE. An energy/protein bar (oats, whey, dates, nuts) is NOT a chocolate bar and NOT a biscuit. A chikki (peanut + jaggery brittle) is NOT kurkure and NOT a biscuit. A cream biscuit (Oreo, Bourbon) is NOT a wafer and NOT a chocolate. An extruded corn snack (Kurkure, Cheetos) is NOT a chip and NOT a biscuit.
- Distinguish: chocolate bar vs energy/protein bar vs cereal/granola bar vs nut-brittle (chikki) vs biscuit (hard/soft/cream/cracker) vs wafer vs extruded snack vs fried chip vs baked chip.
- If the image / ingredient list / barcode lookup is ambiguous and you cannot confidently identify the category, set productName to "Unidentified product", category to "Unknown", and explain in summary that the image/barcode was not clear enough. DO NOT guess a different product just to give an answer.
- The healthScore, caloriesKcal, advantages, disadvantages, and dietaryType MUST match the category you returned. A chikki's calories/nutrition is NOT the same as a kurkure's — do not copy values across categories.
DIETARY CLASSIFICATION RULES (required for every scan):
- "non-veg" = contains meat, poultry, fish, seafood, gelatin, lard/tallow, animal rennet, carmine/cochineal (E120), shellac (E904), or egg (in India egg is non-veg; if region unknown treat egg as non-veg by Indian convention but mention egg explicitly in dietaryReason).
- "veg" (lacto-vegetarian) = plant-based PLUS one or more of: milk, butter, ghee, cheese, whey, casein, honey — and no non-veg ingredients.
- "vegan" = entirely plant-based, no dairy, no honey, no egg, no animal-derived additives.
- "unknown" = only when the ingredient list is truly unreadable AND there is no brand/category to infer from. Avoid this when possible.
- Common additives to watch: gelatin (non-veg), L-cysteine from hair/feathers (non-veg unless labelled microbial), rennet (non-veg unless labelled microbial/vegetable), vitamin D3 from lanolin (still vegetarian; D3 from lichen is vegan), mono- and diglycerides (source ambiguous — assume veg unless clearly animal).
Brand identification rules:
- ALWAYS fill "brand" with the sub-brand/product line the consumer sees on the wrapper, and "parentCompany" with the actual owning corporation — even when they differ. Example: product "Dairy Milk Silk" → brand "Dairy Milk", parentCompany "Mondelez (formerly Cadbury)". Product "Kurkure" → brand "Kurkure", parentCompany "PepsiCo (Frito-Lay)". Product "Bournvita" → brand "Bournvita", parentCompany "Mondelez". Product "Amul Butter" → brand "Amul", parentCompany "GCMMF (Amul cooperative)". Product "Real Juice" → brand "Real", parentCompany "Dabur".
- If unsure, give your best guess and reflect uncertainty in "summary".
Be specific and accurate. Do NOT include medical advice beyond gentle dietary notes. Do NOT add text outside JSON.`;


function buildHealthContext(p: { weight_kg?: number | null; height_cm?: number | null; illnesses?: string | null; allergies?: string | null; gender?: string | null; age?: number | null }) {
  const bits: string[] = [];
  if (p.gender) bits.push(`gender: ${p.gender}`);
  if (p.age) bits.push(`age: ${p.age}`);
  if (p.weight_kg) bits.push(`weight: ${p.weight_kg} kg`);
  if (p.height_cm) bits.push(`height: ${p.height_cm} cm`);
  if (p.weight_kg && p.height_cm) {
    const m = Number(p.height_cm) / 100;
    const bmi = Number(p.weight_kg) / (m * m);
    bits.push(`BMI: ${bmi.toFixed(1)}`);
  }
  if (p.illnesses?.trim()) bits.push(`conditions: ${p.illnesses.trim()}`);
  if (p.allergies?.trim()) bits.push(`allergies: ${p.allergies.trim()}`);
  if (!bits.length) return "";
  return `\n\nUSER HEALTH PROFILE (use for personalAdvice): ${bits.join("; ")}`;
}

export const analyzeScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScanInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    if (data.scanType === "barcode") {
      if (!data.barcode) throw new Error("Barcode is required.");
      // Strip whitespace defensively (also handled client-side).
      const sanitized = data.barcode.replace(/\s+/g, "");
      data.barcode = sanitized;
      if (!isValidBarcodeChecksum(sanitized)) {
        throw new Error("Invalid or fake barcode. Real product barcodes are 8, 12, 13, or 14 digits with a valid check digit (EAN/UPC). Please re-enter or rescan.");
      }
    } else if (!data.imageDataUrl && !(data.text && data.text.trim())) {
      throw new Error("Please provide ingredients text, an image, or a barcode.");
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quota, error: quotaErr } = await supabaseAdmin
      .rpc("consume_scan_quota", { _uid: context.userId })
      .single();

    if (quotaErr) {
      if ((quotaErr.message || "").includes("quota_exceeded")) {
        throw new Error(`You've used all your scans for this cycle. Upgrade to Pro (₹200/mo · 60), Pro+ (₹500/mo · 120) or Pro Max (₹1200/mo · 240 + 3D body-damage map) to keep scanning.`);
      }
      console.error("consume_scan_quota error", quotaErr);
      throw new Error("Unable to start scan. Please try again.");
    }

    const newCount = quota?.new_count ?? 0;
    const scanLimit = quota?.scan_limit ?? FREE_LIMIT;
    const plan = (quota?.plan ?? "free") as "free" | "pro" | "pro_plus" | "pro_max";

    const { data: hp } = await supabase
      .from("profiles")
      .select("weight_kg, height_cm, illnesses, allergies, gender, age")
      .eq("id", userId)
      .maybeSingle();
    const healthContext = hp ? buildHealthContext(hp) : "";

    const proPlusCautionRule = `For EACH item in "cautions", ALSO populate these structured fields (in ADDITION to keeping "concern" as a plain-English health-effect description): "percentage" = best-estimate weight-% of that additive in the finished product as a string (e.g. "0.3%", "~12%", "<0.01%"); "chemicalFormula" = the molecular formula in standard notation (e.g. "C6H8O7" for citric acid, "NaHCO3" for baking soda, "C12H22O11" for sucrose) — empty string if it is a mixture/natural extract with no single formula; "scientificName" = the IUPAC / biochemical / botanical scientific name (e.g. "2-hydroxypropane-1,2,3-tricarboxylic acid", "Theobroma cacao", "monosodium L-glutamate"). Use "" only when truly unknown.`;
    const consumptionTipRule = `ALSO return a top-level "consumptionTip" object: { "safeDaily": "<short sentence with a NUMBER — typical safe per-day amount for an average adult, e.g. '1 small bar (~25g) per day' or 'up to 250 ml/day'>", "limit": "<short sentence with the UPPER LIMIT and what happens beyond it, e.g. 'More than 50g/day raises risk of weight gain & cavities'>", "source": "<the genuine guideline source, e.g. 'WHO sugar guideline', 'FDA daily value', 'EFSA ADI', 'ICMR-NIN dietary guideline'>" }. Base the numbers on real published guidelines (WHO, FDA, EFSA, ICMR-NIN, AHA). Do NOT invent.`;

    const riskProfileRule = `ALSO return a top-level "riskProfile" object describing what genuinely happens to a person who over-consumes THIS specific product (above the safe daily limit, regularly, for weeks/months). Only populate when the product is rated "okay", "caution", or "avoid" (i.e. healthScore < 75); for clearly healthy products return an empty riskProfile with all arrays empty. Shape: { "illnesses": string[] (specific diseases/conditions linked to over-consumption — e.g. "Type 2 diabetes (excess refined sugar)", "Hypertension (high sodium load)", "NAFLD — non-alcoholic fatty liver disease"), "addictions": string[] (dependence patterns this product can drive — e.g. "Sugar/dopamine cravings", "Caffeine dependence", "MSG-driven snacking compulsion"), "chronicDamage": string[] (long-term irreversible harm — e.g. "Insulin resistance over years", "Permanent arterial plaque buildup", "Enamel erosion"), "temporaryEffects": string[] (short-term reversible reactions within hours/days — e.g. "Energy crash 1-2h after", "Bloating and gas", "Headache from artificial sweeteners"), "organDamage": string[] (named-organ damage with mechanism — e.g. "Liver: fat accumulation from fructose", "Kidneys: extra filtration load from sodium", "Pancreas: beta-cell stress from sugar spikes") }. Each array: 2-5 concise items, each item one short clause. Be specific to the actual ingredients in THIS product — do not write generic junk-food warnings. Base on real nutrition science (WHO, AHA, NIH, ICMR). Do NOT invent diseases.`;
    const bodyBenefitRule = `ALSO return a top-level "bodyBenefit": an array of objects { "part": string, "severity": "low"|"medium"|"high", "reason": string } listing human body parts/organs that genuinely BENEFIT from consuming THIS product in normal amounts. Use the SAME allowed part-name list as bodyDamage (brain, eyes, teeth, throat, heart, lungs, liver, stomach, pancreas, kidneys, intestines, skin, bones). Severity here means MAGNITUDE of benefit (low = mild, high = strong, well-evidenced). Reason is one short sentence tied to a specific ingredient/nutrient in this product (e.g. "Bones: calcium + vitamin D support bone density", "Brain: omega-3 DHA supports cognition"). ONLY include organs that actually change for the better — if there is no genuine benefit for an organ, OMIT it; do NOT pad. Return an empty array [] if the product offers no real organ-level benefit. For products rated "good" / healthScore >= 75, prefer a fuller bodyBenefit list and an empty or near-empty bodyDamage.`;
    // ALL TIERS now receive bodyDamage + bodyBenefit (rule-based on backend
    // when nutriments are available; AI-derived otherwise). The UI gates
    // visibility behind Pro Max — free users see a static teaser.
    const bodyMapRule = `ALSO return a top-level "bodyDamage": an array of objects { "part": string, "severity": "low"|"medium"|"high", "reason": string } listing human body parts/organs that can be harmed by consuming THIS product too often. Use part names from this list only: brain, eyes, teeth, throat, heart, lungs, liver, stomach, pancreas, kidneys, intestines, skin, bones. Severity reflects typical damage risk at high consumption. Reason is one short sentence specific to ingredients in this product. For clearly healthy products (rating "good" / healthScore >= 75) return an empty bodyDamage array []. ALSO return "bodyBenefit" using the same shape and part list for organs that genuinely benefit.`;
    const planInstructions =
      plan === "pro_max"
        ? `\n\nPRO MAX TIER: (1) ${proPlusCautionRule} (2) ${consumptionTipRule} (3) ${riskProfileRule} (4) ${bodyMapRule} (5) ${bodyBenefitRule}`
        : plan === "pro_plus"
          ? `\n\nPRO+ TIER: (1) ${proPlusCautionRule} (2) ${consumptionTipRule}\n\nALSO: ${bodyMapRule}`
          : plan === "pro"
            ? `\n\nPRO TIER: For EACH item in "cautions", begin "concern" with an estimated percentage of that chemical/additive in the product (best estimate, e.g. "~0.3% — ..."), then the concern.\n\nALSO: ${bodyMapRule}`
            : `\n\nFREE TIER: ${bodyMapRule}`;



    let userContent: any;
    let knownProductName: string | undefined;
    

    // PHOTO → BARCODE: if the user uploaded an image, first try to OCR a
    // mathematically-valid EAN/UPC off the package. If we find one, treat
    // the request exactly like a direct barcode scan (incl. 20-29 local
    // prefix bypass) so accuracy matches the barcode tab.
    let ocrBarcode: string | null = null;
    if (data.scanType === "ingredients" && data.imageDataUrl) {
      ocrBarcode = await extractBarcodeFromImage(data.imageDataUrl);
      if (ocrBarcode) {
        // Local / in-store GS1 restricted range — bubble up for client-side
        // local-inventory handling instead of calling the global API.
        if (/^2\d/.test(ocrBarcode) && /^\d{12,13}$/.test(ocrBarcode)) {
          return {
            result: null as any,
            scanId: null,
            remaining: Math.max(0, scanLimit - newCount),
            scanLimit,
            plan,
            planLabel: PLAN_LABELS[plan] ?? "Free",
            localBarcode: ocrBarcode,
          };
        }
        // Promote to barcode path for the rest of the handler.
        data = { ...data, scanType: "barcode", barcode: ocrBarcode, imageDataUrl: undefined } as any;
      }
    }


    // SHARED RESULTS: every user must see the SAME analysis for the SAME barcode.
    // Check the cache before spending an AI call.
    if (data.scanType === "barcode" && data.barcode) {
      const { data: cached } = await supabaseAdmin
        .from("barcode_cache" as any)
        .select("result")
        .eq("barcode", data.barcode)
        .maybeSingle();
      if (cached && (cached as any).result) {
        const cachedResult = (cached as any).result as ScanResult;
        const lookup = await lookupBarcode(data.barcode);
        if (lookup) {
          await applyRuleBasedBodyImpact(cachedResult, lookup);
        }
        const { data: inserted } = await supabase.from("scans").insert({
          user_id: userId,
          product_name: cachedResult.productName,
          scan_type: "barcode",
          input_text: data.barcode,
          rating: cachedResult.rating,
          health_score: cachedResult.healthScore,
          calories_kcal: cachedResult.caloriesKcal,
          summary: cachedResult.summary,
          advantages: cachedResult.advantages,
          disadvantages: cachedResult.disadvantages,
          cautions: cachedResult.cautions,
          result: cachedResult as any,
        }).select("id").single();
        return {
          result: cachedResult,
          scanId: inserted?.id ?? null,
          remaining: Math.max(0, scanLimit - newCount),
          scanLimit,
          plan,
          planLabel: PLAN_LABELS[plan] ?? "Free",
        };
      }
    }


    if (data.scanType === "barcode") {
      const code = data.barcode!.trim();
      if (!isValidBarcodeChecksum(code)) {
        throw new Error("Invalid or fake barcode. Real product barcodes are 8, 12, 13, or 14 digits with a valid check digit (EAN/UPC). Please re-enter or rescan.");
      }
      const country = gs1Country(code);
      const lookup = await lookupBarcode(code);
      const countryHint = country ? `\nGS1 prefix country of issue: ${country}` : "";

      // DETERMINISTIC: barcode lookups MUST come from the public GS1/OFF registry.
      // No AI guessing of brand/product identity is allowed.
      if (!lookup) {
        throw new Error(`Product not found in the Open Food Facts / GS1 registry for barcode ${code}. We don't guess product identity from barcode prefixes — please scan the label photo or paste the ingredients instead.`);
      }

      if (!lookup.ingredients) {
        userContent = `Product: ${lookup.name}${lookup.brand ? `\nBrand: ${lookup.brand}` : ""}${lookup.parentCompany ? `\nParent company: ${lookup.parentCompany}` : ""}${lookup.category ? `\nCategory: ${lookup.category}` : ""}${lookup.quantity ? `\nPack size: ${lookup.quantity}` : ""}\nBarcode: ${code}${countryHint}\nSource: ${lookup.source} (verified registry)\n\nThe registry has no ingredient list for this product. Compute the NUTRITION analysis (rating, healthScore, calories, advantages, disadvantages, cautions) for this category. DO NOT change productName, brand, parentCompany, or category — keep them exactly as given above (they come from the GS1/Open Food Facts registry and must not be rewritten).${healthContext}${planInstructions}`;
        knownProductName = lookup.name;
      } else {
        userContent = `Product: ${lookup.name}${lookup.brand ? `\nBrand: ${lookup.brand}` : ""}${lookup.parentCompany ? `\nParent company: ${lookup.parentCompany}` : ""}${lookup.category ? `\nCategory: ${lookup.category}` : ""}${lookup.quantity ? `\nPack size: ${lookup.quantity}` : ""}\nBarcode: ${code}${countryHint}\nSource: ${lookup.source} (verified registry)\nIngredients: ${lookup.ingredients}\n\nCompute the NUTRITION analysis for this product. DO NOT change productName, brand, parentCompany, or category — keep them exactly as given above (they come from the GS1/Open Food Facts registry and must not be rewritten).${healthContext}${planInstructions}`;
        knownProductName = lookup.name;
      }

    } else if (data.imageDataUrl) {

      userContent = [
        { type: "text", text: `Read the ingredient list from this food label image and analyze the product.${healthContext}${planInstructions}` },
        { type: "image_url", image_url: { url: data.imageDataUrl } },
      ];
    } else {
      userContent = `Ingredients: ${data.text!.trim()}\n\nAnalyze this product.${healthContext}${planInstructions}`;
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];

    const result = await callGemini(messages);

    // DETERMINISTIC OVERRIDE: when the barcode resolves in the registry,
    // the registry's name/brand/category/parentCompany are authoritative.
    // The AI is only allowed to compute the nutrition analysis.
    if (data.scanType === "barcode") {
      const lookupCode = data.barcode!.trim();
      const lookup = await lookupBarcode(lookupCode);
      if (lookup) {
        result.productName = lookup.name;
        if (lookup.brand) result.brand = lookup.brand;
        if (lookup.parentCompany) result.parentCompany = lookup.parentCompany;
        if (lookup.category) result.category = lookup.category;

        // Rule-based organ impact from registry ingredients + OFF nutriments.
        await applyRuleBasedBodyImpact(result, lookup);
      }
    }

    if (knownProductName && (!result.productName || result.productName === "Unknown product")) {
      result.productName = knownProductName;
    }


    const { data: inserted, error: insertErr } = await supabase.from("scans").insert({
      user_id: userId,
      product_name: result.productName,
      scan_type: data.scanType,
      input_text: data.scanType === "barcode" ? data.barcode : (data.text ?? null),
      rating: result.rating,
      health_score: result.healthScore,
      calories_kcal: result.caloriesKcal,
      summary: result.summary,
      advantages: result.advantages,
      disadvantages: result.disadvantages,
      cautions: result.cautions,
      result: result as any,
    }).select("id").single();
    if (insertErr) {
      console.error("scans insert error", insertErr);
    }

    // Persist shared cache so every other user scanning this barcode gets the same data.
    const cacheBarcode = data.scanType === "barcode" ? data.barcode : ocrBarcode;
    if (cacheBarcode) {
      const { error: cacheErr } = await supabaseAdmin
        .from("barcode_cache" as any)
        .upsert({
          barcode: cacheBarcode,
          product_name: result.productName,
          rating: result.rating,
          health_score: result.healthScore,
          calories_kcal: result.caloriesKcal,
          summary: result.summary,
          result: result as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: "barcode", ignoreDuplicates: false });
      if (cacheErr) console.error("barcode_cache upsert error", cacheErr);
    }

    return {
      result,
      scanId: inserted?.id ?? null,
      remaining: Math.max(0, scanLimit - newCount),
      scanLimit,
      plan,
      planLabel: PLAN_LABELS[plan] ?? "Free",
    };
  });
