import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_LIMIT = 30;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  pro_max: "Pro Max",
};

function planLimit(plan: string | null | undefined): number {
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
  cautions: { ingredient: string; concern: string; severity: "low" | "medium" | "high" }[];
  personalAdvice?: string;
  bodyDamage?: { part: string; severity: "low" | "medium" | "high"; reason: string }[];
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
    const effectivePlan = (profile.plan === "pro" || profile.plan === "pro_plus" || profile.plan === "pro_max") && profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()
      ? "free"
      : (profile.plan ?? "free");
    const limit = planLimit(effectivePlan);
    return {
      ...profile,
      plan: effectivePlan,
      planLabel: PLAN_LABELS[effectivePlan] ?? "Free",
      scanLimit: limit,
      freeLimit: FREE_LIMIT,
      remaining: Math.max(0, limit - (profile.scan_count ?? 0)),
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

type BarcodeLookup = { name: string; brand?: string; ingredients: string; source: string };

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
    return {
      name: name || `Product ${barcode}`,
      brand: p.brands || undefined,
      ingredients,
      source: "Open Food Facts",
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
      ingredients: "", // UPCitemdb doesn't return ingredients
      source: "UPCitemdb",
    };
  } catch { return null; }
}

async function lookupBarcode(barcode: string): Promise<BarcodeLookup | null> {
  const off = await lookupOpenFoodFacts(barcode);
  if (off && off.ingredients) return off;
  const upc = await lookupUpcItemDb(barcode);
  if (upc) return { ...upc, ingredients: off?.ingredients ?? upc.ingredients };
  return off;
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
    rating: (parsed.rating ?? "okay") as ScanResult["rating"],
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore ?? 50)))),
    caloriesKcal: Math.max(0, Math.min(5000, Math.round(Number(parsed.caloriesKcal ?? 0)))),
    summary: parsed.summary ?? "",
    advantages: Array.isArray(parsed.advantages) ? parsed.advantages : [],
    disadvantages: Array.isArray(parsed.disadvantages) ? parsed.disadvantages : [],
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
    personalAdvice: typeof parsed.personalAdvice === "string" ? parsed.personalAdvice : undefined,
    bodyDamage: Array.isArray(parsed.bodyDamage) ? parsed.bodyDamage : undefined,
  };
}

const SYSTEM_PROMPT = `You are a food-safety nutrition analyst for the RAPscanz app.
Given the ingredients of a packaged food product (or a barcode lookup result), respond ONLY with valid JSON that matches this schema:
{
  "productName": string,
  "rating": "good" | "okay" | "caution" | "avoid",
  "healthScore": number (integer 0-100; penalize ultra-processing, high sugar/sodium/saturated fat, trans fats, artificial additives; reward whole ingredients, fiber, protein, healthy fats),
  "caloriesKcal": number (integer; your best estimate of CALORIES PER TYPICAL SERVING in kcal. If a serving size isn't given, assume a standard one (e.g. 30g for chips, 250ml for a drink, 1 biscuit). Use 0 only for true zero-calorie products like water.),
  "summary": string (1-2 sentences, plain English),
  "advantages": string[] (3-6 short bullets),
  "disadvantages": string[] (3-6 short bullets),
  "cautions": [ { "ingredient": string, "concern": string, "severity": "low"|"medium"|"high" } ],
  "personalAdvice": string (1-2 sentences specific to the user's health profile if one is provided — flag allergens they listed, warn if it conflicts with their conditions like diabetes/hypertension/PCOS, reference their BMI/gender if relevant. Omit or leave empty if no profile was provided.)
}
Be specific and accurate. Do NOT include medical advice beyond gentle dietary notes. Do NOT add any text outside JSON.`;

function buildHealthContext(p: { weight_kg?: number | null; height_cm?: number | null; illnesses?: string | null; allergies?: string | null; gender?: string | null }) {
  const bits: string[] = [];
  if (p.gender) bits.push(`gender: ${p.gender}`);
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
      if (!isValidBarcodeChecksum(data.barcode.trim())) {
        throw new Error("Invalid or fake barcode. Real product barcodes are 8, 12, 13, or 14 digits with a valid check digit (EAN/UPC). Please re-enter or rescan.");
      }
    } else if (!data.imageDataUrl && !(data.text && data.text.trim())) {
      throw new Error("Please provide ingredients text, an image, or a barcode.");
    }


    const { data: quota, error: quotaErr } = await supabase
      .rpc("consume_scan_quota")
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
      .select("weight_kg, height_cm, illnesses, allergies, gender")
      .eq("id", userId)
      .maybeSingle();
    const healthContext = hp ? buildHealthContext(hp) : "";

    const planInstructions =
      plan === "pro_max"
        ? `\n\nPRO MAX TIER: (1) For EACH item in "cautions", begin "concern" with the estimated percentage of that chemical/additive (e.g. "~0.3% — ..."), then describe the specific health effects. (2) ALSO return an additional field "bodyDamage": an array of objects { "part": string, "severity": "low"|"medium"|"high", "reason": string } listing human body parts/organs that can be harmed by consuming THIS product too often. Use part names from this list only: brain, eyes, teeth, throat, heart, lungs, liver, stomach, pancreas, kidneys, intestines, skin, bones. Severity reflects typical damage risk at high consumption. Reason is one short sentence specific to ingredients in this product.`
        : plan === "pro_plus"
          ? `\n\nPRO+ TIER: For EACH item in "cautions", set "concern" to start with the estimated percentage of that chemical/additive in the product (best estimate, e.g. "~0.3% — ..."), then a brief description of the specific health effects it can cause (organs/systems affected, symptoms, conditions linked to it).`
          : plan === "pro"
            ? `\n\nPRO TIER: For EACH item in "cautions", begin "concern" with an estimated percentage of that chemical/additive in the product (best estimate, e.g. "~0.3% — ..."), then the concern.`
            : "";

    let userContent: any;
    let knownProductName: string | undefined;

    if (data.scanType === "barcode") {
      const code = data.barcode!.trim();
      if (!isValidBarcodeChecksum(code)) {
        throw new Error("Invalid or fake barcode. Real product barcodes are 8, 12, 13, or 14 digits with a valid check digit (EAN/UPC). Please re-enter or rescan.");
      }
      const lookup = await lookupBarcode(code);
      if (!lookup) {
        userContent = `A user scanned barcode ${code}. No product was found in Open Food Facts or UPCitemdb. The barcode is structurally valid but unregistered in public databases — it may be a regional Indian/local product, a private label, or very new. Give a cautious general assessment, clearly state ingredient data was unavailable, and set rating to "okay".${healthContext}${planInstructions}`;
      } else if (!lookup.ingredients) {
        userContent = `Barcode ${code} matched product "${lookup.name}"${lookup.brand ? ` by ${lookup.brand}` : ""} (source: ${lookup.source}), but no ingredient list is published. Use your knowledge of this specific product to make a best-effort analysis and clearly note that the official ingredient list wasn't available.${healthContext}${planInstructions}`;
        knownProductName = lookup.name;
      } else {
        userContent = `Product: ${lookup.name}${lookup.brand ? `\nBrand: ${lookup.brand}` : ""}\nBarcode: ${code}\nSource: ${lookup.source}\nIngredients: ${lookup.ingredients}\n\nAnalyze this product.${healthContext}${planInstructions}`;
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

    return {
      result,
      scanId: inserted?.id ?? null,
      remaining: Math.max(0, scanLimit - newCount),
      scanLimit,
      plan,
      planLabel: PLAN_LABELS[plan] ?? "Free",
    };
  });
