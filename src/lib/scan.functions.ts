import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_LIMIT = 30;

const ScanInput = z.object({
  scanType: z.enum(["ingredients", "barcode"]),
  text: z.string().max(10_000).optional(),
  barcode: z.string().regex(/^[A-Za-z0-9\-]{1,32}$/).optional(),
  imageDataUrl: z.string().max(7_500_000).optional(),
});

export type ScanResult = {
  productName: string;
  rating: "good" | "okay" | "caution" | "avoid";
  healthScore: number; // 0-100, higher = healthier
  summary: string;
  advantages: string[];
  disadvantages: string[];
  cautions: { ingredient: string; concern: string; severity: "low" | "medium" | "high" }[];
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("scan_count, is_subscribed, subscription_expires_at, email")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getProfile error", error);
      throw new Error("Unable to load your profile. Please try again.");
    }
    const profile = data ?? { scan_count: 0, is_subscribed: false, subscription_expires_at: null, email: null };
    return {
      ...profile,
      freeLimit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - (profile.scan_count ?? 0)),
    };
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("scans")
      .select("id, product_name, scan_type, rating, health_score, summary, created_at")
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

async function lookupBarcode(barcode: string): Promise<{ name: string; ingredients: string } | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
    if (!res.ok) return null;
    const json = await res.json() as any;
    const p = json?.product;
    if (!p) return null;
    return {
      name: p.product_name || p.generic_name || `Product ${barcode}`,
      ingredients: p.ingredients_text || p.ingredients_text_en || "",
    };
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
    rating: (parsed.rating ?? "okay") as ScanResult["rating"],
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore ?? 50)))),
    summary: parsed.summary ?? "",
    advantages: Array.isArray(parsed.advantages) ? parsed.advantages : [],
    disadvantages: Array.isArray(parsed.disadvantages) ? parsed.disadvantages : [],
    cautions: Array.isArray(parsed.cautions) ? parsed.cautions : [],
  };
}

const SYSTEM_PROMPT = `You are a food-safety nutrition analyst for the RAPscanz app.
Given the ingredients of a packaged food product (or a barcode lookup result), respond ONLY with valid JSON that matches this schema:
{
  "productName": string,
  "rating": "good" | "okay" | "caution" | "avoid",
  "healthScore": number (integer 0-100, where 100 = excellent for regular consumption, 70-89 = generally healthy, 40-69 = okay in moderation, 20-39 = unhealthy / occasional only, 0-19 = avoid. Penalize ultra-processing, high sugar/sodium/saturated fat, trans fats, artificial additives, controversial E-numbers. Reward whole ingredients, fiber, protein, healthy fats, minimal additives.),
  "summary": string (1-2 sentences, plain English, mention what happens if eaten regularly),
  "advantages": string[] (3-6 short bullets, focus on real nutritional positives),
  "disadvantages": string[] (3-6 short bullets, focus on negatives like sugar, sodium, saturated fat, ultra-processing),
  "cautions": [ { "ingredient": string, "concern": string, "severity": "low"|"medium"|"high" } ]
    (flag preservatives, colorings, artificial sweeteners, trans fats, palm oil, MSG, nitrates, BHA/BHT, controversial E-numbers, allergens, etc.)
}
Be specific and accurate. Do NOT include medical advice. Do NOT add any text outside JSON.`;

export const analyzeScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScanInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Check quota
    const { data: profile } = await supabase
      .from("profiles")
      .select("scan_count, is_subscribed, subscription_expires_at")
      .eq("id", userId)
      .maybeSingle();

    const count = profile?.scan_count ?? 0;
    const subscribed = profile?.is_subscribed
      && (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

    if (!subscribed && count >= FREE_LIMIT) {
      throw new Error(`You've used all ${FREE_LIMIT} free scans. Subscribe for ₹300/year to keep scanning.`);
    }

    // Build messages
    let userContent: any;
    let knownProductName: string | undefined;

    if (data.scanType === "barcode") {
      if (!data.barcode) throw new Error("Barcode is required.");
      const lookup = await lookupBarcode(data.barcode);
      if (!lookup || !lookup.ingredients) {
        // Still let AI try with just the barcode
        userContent = `A user scanned barcode ${data.barcode}. ${lookup ? `Product name: ${lookup.name}. ` : ""}No ingredient list is available from the open database. Make a best-effort general assessment based on the product name if known, and clearly note in the summary that ingredient data was unavailable. Set rating to "okay" if unknown.`;
        knownProductName = lookup?.name;
      } else {
        userContent = `Product: ${lookup.name}\nBarcode: ${data.barcode}\nIngredients: ${lookup.ingredients}\n\nAnalyze this product.`;
        knownProductName = lookup.name;
      }
    } else if (data.imageDataUrl) {
      userContent = [
        { type: "text", text: "Read the ingredient list from this food label image and analyze the product." },
        { type: "image_url", image_url: { url: data.imageDataUrl } },
      ];
    } else if (data.text && data.text.trim()) {
      userContent = `Ingredients: ${data.text.trim()}\n\nAnalyze this product.`;
    } else {
      throw new Error("Please provide ingredients text, an image, or a barcode.");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];

    const result = await callGemini(messages);
    if (knownProductName && (!result.productName || result.productName === "Unknown product")) {
      result.productName = knownProductName;
    }

    // Persist scan + increment count
    await supabase.from("scans").insert({
      user_id: userId,
      product_name: result.productName,
      scan_type: data.scanType,
      input_text: data.scanType === "barcode" ? data.barcode : (data.text ?? null),
      rating: result.rating,
      health_score: result.healthScore,
      summary: result.summary,
      advantages: result.advantages,
      disadvantages: result.disadvantages,
      cautions: result.cautions,
      result: result as any,
    });

    await supabase
      .from("profiles")
      .update({ scan_count: count + 1 })
      .eq("id", userId);

    return {
      result,
      remaining: subscribed ? null : Math.max(0, FREE_LIMIT - (count + 1)),
      subscribed: !!subscribed,
    };
  });
