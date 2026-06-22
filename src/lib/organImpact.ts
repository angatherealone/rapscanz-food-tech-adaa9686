// Deterministic, rule-based mapping from product nutrition + ingredients
// to organ-level impacts. Same inputs → same outputs across every user.
//
// Nutrient values are per 100g (Open Food Facts convention).

export type OrganImpact = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
  /** The specific chemical / nutrient / ingredient that caused this impact. */
  trigger: string;
};

export type Nutriments = {
  sugars_100g?: number;
  saturatedFat_100g?: number;
  fat_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
  fiber_100g?: number;
  proteins_100g?: number;
  calcium_100g?: number;
  iron_100g?: number;
  vitaminC_100g?: number;
  vitaminD_100g?: number;
  energyKcal_100g?: number;
};

const num = (v: any): number | undefined => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

export function extractNutriments(p: any): Nutriments {
  const n = p?.nutriments ?? {};
  // OFF stores salt in g; sodium in g. 1 g salt ≈ 0.4 g sodium.
  const salt = num(n.salt_100g) ?? (num(n.sodium_100g) !== undefined ? (num(n.sodium_100g)! * 2.5) : undefined);
  return {
    sugars_100g: num(n.sugars_100g),
    saturatedFat_100g: num(n["saturated-fat_100g"]),
    fat_100g: num(n.fat_100g),
    salt_100g: salt,
    sodium_100g: num(n.sodium_100g),
    fiber_100g: num(n.fiber_100g),
    proteins_100g: num(n.proteins_100g),
    calcium_100g: num(n.calcium_100g),
    iron_100g: num(n.iron_100g),
    vitaminC_100g: num(n["vitamin-c_100g"]),
    vitaminD_100g: num(n["vitamin-d_100g"]),
    energyKcal_100g: num(n["energy-kcal_100g"]) ?? num(n.energy_kcal_100g),
  };
}

const has = (text: string, ...words: string[]) =>
  words.some((w) => text.includes(w));

export function computeOrganImpact(
  nutri: Nutriments,
  ingredientsText: string = ""
): { bodyDamage: OrganImpact[]; bodyBenefit: OrganImpact[] } {
  const damage: OrganImpact[] = [];
  const benefit: OrganImpact[] = [];
  const ing = (ingredientsText || "").toLowerCase();

  // ── DAMAGE RULES (per 100g thresholds aligned with FSA / WHO traffic-light) ──
  if (nutri.sugars_100g !== undefined) {
    const s = nutri.sugars_100g;
    if (s >= 22.5) {
      damage.push({ part: "pancreas", severity: "high", reason: `Very high sugar (${s.toFixed(1)} g/100g) — repeated insulin spikes stress beta-cells.` });
      damage.push({ part: "teeth", severity: "high", reason: `High sugar feeds oral bacteria → enamel erosion & cavities.` });
      damage.push({ part: "liver", severity: "medium", reason: `Excess fructose is converted to liver fat (NAFLD risk).` });
    } else if (s >= 11.25) {
      damage.push({ part: "pancreas", severity: "medium", reason: `Elevated sugar (${s.toFixed(1)} g/100g) drives insulin response.` });
      damage.push({ part: "teeth", severity: "medium", reason: `Moderate sugar — limit frequency to protect enamel.` });
    } else if (s >= 5) {
      damage.push({ part: "teeth", severity: "low", reason: `Some sugar present — rinse after eating.` });
    }
  }

  if (nutri.saturatedFat_100g !== undefined) {
    const sf = nutri.saturatedFat_100g;
    if (sf >= 5) {
      damage.push({ part: "heart", severity: "high", reason: `High saturated fat (${sf.toFixed(1)} g/100g) raises LDL cholesterol & cardiovascular risk.` });
      damage.push({ part: "liver", severity: "medium", reason: `Saturated fat overload contributes to fatty-liver disease.` });
    } else if (sf >= 1.5) {
      damage.push({ part: "heart", severity: "medium", reason: `Moderate saturated fat (${sf.toFixed(1)} g/100g) — keep within daily limit.` });
    }
  }

  if (nutri.salt_100g !== undefined) {
    const salt = nutri.salt_100g;
    if (salt >= 1.5) {
      damage.push({ part: "heart", severity: "high", reason: `High salt (${salt.toFixed(2)} g/100g) raises blood pressure.` });
      damage.push({ part: "kidneys", severity: "high", reason: `Excess sodium increases kidney filtration load.` });
    } else if (salt >= 0.3) {
      damage.push({ part: "kidneys", severity: "medium", reason: `Moderate sodium (${salt.toFixed(2)} g/100g) — watch daily intake.` });
    }
  }

  if (has(ing, "trans fat", "hydrogenated", "vanaspati", "partially hydrogenated")) {
    damage.push({ part: "heart", severity: "high", reason: `Trans-fats / hydrogenated oils sharply raise LDL and cardiovascular risk.` });
    damage.push({ part: "liver", severity: "medium", reason: `Trans-fats promote hepatic inflammation.` });
  }

  if (has(ing, "msg", "monosodium glutamate", "e621", "flavour enhancer (635)", "disodium inosinate", "disodium guanylate")) {
    damage.push({ part: "brain", severity: "low", reason: `MSG/flavour enhancers can trigger headaches & cravings in sensitive people.` });
  }

  if (has(ing, "aspartame", "acesulfame", "sucralose", "saccharin", "e951", "e950", "e955")) {
    damage.push({ part: "intestines", severity: "medium", reason: `Artificial sweeteners can disrupt gut microbiome balance.` });
  }

  if (has(ing, "caffeine", "coffee extract", "guarana", "energy drink")) {
    damage.push({ part: "heart", severity: "low", reason: `Caffeine can raise heart rate & blood pressure; avoid excess.` });
  }

  if (has(ing, "alcohol", "ethanol")) {
    damage.push({ part: "liver", severity: "high", reason: `Alcohol is metabolised by the liver — chronic use causes hepatotoxicity.` });
    damage.push({ part: "brain", severity: "medium", reason: `Alcohol impairs cognition and neural development.` });
  }

  if (has(ing, "tartrazine", "e102", "sunset yellow", "e110", "carmoisine", "e122", "ponceau")) {
    damage.push({ part: "brain", severity: "low", reason: `Synthetic azo colours linked to hyperactivity in sensitive children.` });
  }

  if (has(ing, "sodium nitrite", "e250", "sodium nitrate", "e251", "processed meat", "bacon", "sausage", "ham", "salami")) {
    damage.push({ part: "intestines", severity: "high", reason: `Processed-meat nitrites classified Group 1 carcinogen for colorectal cancer (IARC).` });
  }

  if (nutri.energyKcal_100g !== undefined && nutri.energyKcal_100g >= 450) {
    damage.push({ part: "stomach", severity: "low", reason: `Very calorie-dense (${nutri.energyKcal_100g.toFixed(0)} kcal/100g) — easy to overeat.` });
  }

  // ── BENEFIT RULES ──
  if (nutri.fiber_100g !== undefined) {
    const f = nutri.fiber_100g;
    if (f >= 6) {
      benefit.push({ part: "intestines", severity: "high", reason: `Very high fibre (${f.toFixed(1)} g/100g) — feeds beneficial gut microbes & regular bowel movement.` });
      benefit.push({ part: "heart", severity: "medium", reason: `High fibre lowers LDL cholesterol over time.` });
    } else if (f >= 3) {
      benefit.push({ part: "intestines", severity: "medium", reason: `Good fibre content (${f.toFixed(1)} g/100g) supports gut health.` });
    }
  }

  if (nutri.proteins_100g !== undefined) {
    const p = nutri.proteins_100g;
    if (p >= 12) {
      benefit.push({ part: "bones", severity: "medium", reason: `High protein (${p.toFixed(1)} g/100g) supports muscle & bone maintenance.` });
    } else if (p >= 6) {
      benefit.push({ part: "bones", severity: "low", reason: `Useful protein content (${p.toFixed(1)} g/100g) for tissue repair.` });
    }
  }

  if (nutri.calcium_100g !== undefined && nutri.calcium_100g >= 0.12) {
    benefit.push({ part: "bones", severity: "high", reason: `Rich calcium source — supports bone density & teeth.` });
    benefit.push({ part: "teeth", severity: "medium", reason: `Calcium remineralises tooth enamel.` });
  }

  if (nutri.iron_100g !== undefined && nutri.iron_100g >= 0.0024) {
    benefit.push({ part: "heart", severity: "low", reason: `Iron supports haemoglobin → better oxygen delivery.` });
  }

  if (nutri.vitaminC_100g !== undefined && nutri.vitaminC_100g >= 0.012) {
    benefit.push({ part: "skin", severity: "medium", reason: `Vitamin C supports collagen synthesis for skin elasticity.` });
  }

  if (nutri.vitaminD_100g !== undefined && nutri.vitaminD_100g > 0) {
    benefit.push({ part: "bones", severity: "medium", reason: `Vitamin D aids calcium absorption for stronger bones.` });
  }

  if (has(ing, "omega-3", "dha", "epa", "flax seed", "flaxseed", "chia", "walnut", "salmon", "sardine", "mackerel")) {
    benefit.push({ part: "brain", severity: "high", reason: `Omega-3 (DHA/EPA) supports cognition & neural membranes.` });
    benefit.push({ part: "heart", severity: "medium", reason: `Omega-3 fatty acids lower triglycerides.` });
  }

  if (has(ing, "probiotic", "live culture", "lactobacillus", "bifidobacterium", "curd", "yogurt", "yoghurt", "kefir")) {
    benefit.push({ part: "intestines", severity: "high", reason: `Live cultures support a balanced gut microbiome.` });
  }

  if (has(ing, "turmeric", "curcumin", "ginger", "green tea", "polyphenol")) {
    benefit.push({ part: "liver", severity: "low", reason: `Polyphenols (turmeric/ginger/green tea) provide antioxidant support.` });
  }

  if (has(ing, "almond", "walnut", "cashew", "pistachio", "hazelnut", "peanut")) {
    benefit.push({ part: "heart", severity: "medium", reason: `Nuts provide unsaturated fats & magnesium — heart-protective.` });
  }

  if (has(ing, "oat", "whole wheat", "whole grain", "ragi", "millet", "jowar", "bajra", "quinoa", "brown rice", "barley")) {
    benefit.push({ part: "heart", severity: "medium", reason: `Whole grains improve cholesterol & cardiovascular health.` });
    benefit.push({ part: "intestines", severity: "medium", reason: `Whole grains add insoluble fibre for digestive regularity.` });
  }

  // Dedupe (keep highest severity per organ per side).
  const sevRank = { low: 1, medium: 2, high: 3 } as const;
  const dedupe = (arr: OrganImpact[]): OrganImpact[] => {
    const map = new Map<string, OrganImpact>();
    for (const it of arr) {
      const existing = map.get(it.part);
      if (!existing || sevRank[it.severity] > sevRank[existing.severity]) {
        map.set(it.part, it);
      }
    }
    return Array.from(map.values());
  };

  return { bodyDamage: dedupe(damage), bodyBenefit: dedupe(benefit) };
}
