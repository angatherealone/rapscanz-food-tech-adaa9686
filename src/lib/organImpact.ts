// organImpact.ts
// Enhanced version compatible with future BodyImpactMap + BodyDamageMap

export type OrganImpact = {
part: string;
severity: "low" | "medium" | "high";
trigger: string;
reason: string;

// NEW FIELDS
riskLevel?: string;
explanation?: string;
recommendation?: string;
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

const has = (text: string, ...words: string[]) =>
words.some((w) => text.includes(w));

export function extractNutriments(p: any): Nutriments {
const n = p?.nutriments ?? {};

const salt =
num(n.salt_100g) ??
(num(n.sodium_100g) !== undefined
? num(n.sodium_100g)! * 2.5
: undefined);

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
energyKcal_100g:
num(n["energy-kcal_100g"]) ??
num(n.energy_kcal_100g),
};
}

export function computeOrganImpact(
nutri: Nutriments,
ingredientsText: string = ""
): {
bodyDamage: OrganImpact[];
bodyBenefit: OrganImpact[];
} {
const damage: OrganImpact[] = [];
const benefit: OrganImpact[] = [];

const ing = (ingredientsText || "").toLowerCase();

// ======================
// DAMAGE SECTION
// ======================

if ((nutri.sugars_100g ?? 0) >= 22.5) {
damage.push({
part: "pancreas",
severity: "high",
trigger: `Sugar (${nutri.sugars_100g}g/100g)`,
reason: "Very high sugar causes repeated insulin spikes.",
riskLevel: "Critical",
explanation:
"Frequent blood sugar spikes may contribute to insulin resistance.",
recommendation:
"Reduce added sugars and increase fiber intake.",
});

```
damage.push({
  part: "teeth",
  severity: "high",
  trigger: `Sugar (${nutri.sugars_100g}g/100g)`,
  reason: "Feeds harmful oral bacteria.",
  riskLevel: "High",
  explanation:
    "Acid-producing bacteria weaken enamel and increase cavity risk.",
  recommendation:
    "Limit sugary snacks and rinse mouth after consumption.",
});

damage.push({
  part: "liver",
  severity: "medium",
  trigger: `Sugar (${nutri.sugars_100g}g/100g)`,
  reason: "Excess fructose can accumulate in the liver.",
  riskLevel: "Moderate",
  explanation:
    "May contribute to fatty liver development over time.",
  recommendation:
    "Reduce sugary drinks and processed foods.",
});
```

}

if ((nutri.saturatedFat_100g ?? 0) >= 5) {
damage.push({
part: "heart",
severity: "high",
trigger: `Saturated Fat (${nutri.saturatedFat_100g}g/100g)`,
reason: "Raises LDL cholesterol levels.",
riskLevel: "High",
explanation:
"Can increase cardiovascular disease risk when consumed frequently.",
recommendation:
"Replace with unsaturated fats from nuts, seeds, and olive oil.",
});
}

if ((nutri.salt_100g ?? 0) >= 1.5) {
damage.push({
part: "kidneys",
severity: "high",
trigger: `Salt (${nutri.salt_100g}g/100g)`,
reason: "Increases filtration workload.",
riskLevel: "High",
explanation:
"Long-term excessive sodium intake may impair kidney function.",
recommendation:
"Reduce processed foods and stay hydrated.",
});

```
damage.push({
  part: "heart",
  severity: "high",
  trigger: `Salt (${nutri.salt_100g}g/100g)`,
  reason: "Can elevate blood pressure.",
  riskLevel: "High",
  explanation:
    "Hypertension significantly increases cardiovascular risk.",
  recommendation:
    "Limit sodium intake and monitor blood pressure.",
});
```

}

if (
has(
ing,
"hydrogenated",
"trans fat",
"partially hydrogenated",
"vanaspati"
)
) {
damage.push({
part: "heart",
severity: "high",
trigger: "Trans Fat",
reason: "Raises LDL and lowers HDL cholesterol.",
riskLevel: "Critical",
explanation:
"One of the strongest dietary risk factors for cardiovascular disease.",
recommendation:
"Avoid products containing hydrogenated oils.",
});
}

// ======================
// BENEFIT SECTION
// ======================

if ((nutri.fiber_100g ?? 0) >= 6) {
benefit.push({
part: "intestines",
severity: "high",
trigger: `Fiber (${nutri.fiber_100g}g/100g)`,
reason: "Supports digestive regularity.",
riskLevel: "Excellent",
explanation:
"Feeds beneficial gut bacteria and improves digestion.",
recommendation:
"Maintain a high-fiber diet with fruits and whole grains.",
});

```
benefit.push({
  part: "heart",
  severity: "medium",
  trigger: `Fiber (${nutri.fiber_100g}g/100g)`,
  reason: "Helps reduce LDL cholesterol.",
  riskLevel: "Positive",
  explanation:
    "Improves long-term cardiovascular health.",
  recommendation:
    "Continue consuming fiber-rich foods.",
});
```

}

if ((nutri.calcium_100g ?? 0) >= 0.12) {
benefit.push({
part: "bones",
severity: "high",
trigger: "Calcium",
reason: "Supports bone density.",
riskLevel: "Excellent",
explanation:
"Essential for skeletal strength and maintenance.",
recommendation:
"Combine with Vitamin D for optimal absorption.",
});

```
benefit.push({
  part: "teeth",
  severity: "medium",
  trigger: "Calcium",
  reason: "Supports enamel strength.",
  riskLevel: "Positive",
  explanation:
    "Helps protect teeth from demineralization.",
  recommendation:
    "Maintain consistent calcium intake.",
});
```

}

if (
has(
ing,
"omega-3",
"dha",
"epa",
"flaxseed",
"chia",
"salmon"
)
) {
benefit.push({
part: "brain",
severity: "high",
trigger: "Omega-3",
reason: "Supports neural function.",
riskLevel: "Excellent",
explanation:
"Important for cognition and brain-cell membrane health.",
recommendation:
"Continue consuming omega-3-rich foods regularly.",
});

```
benefit.push({
  part: "heart",
  severity: "medium",
  trigger: "Omega-3",
  reason: "Supports healthy triglyceride levels.",
  riskLevel: "Positive",
  explanation:
    "Associated with improved cardiovascular health.",
  recommendation:
    "Include oily fish or plant-based omega-3 sources.",
});
```

}

const sevRank = {
low: 1,
medium: 2,
high: 3,
} as const;

const dedupe = (arr: OrganImpact[]) => {
const map = new Map<string, OrganImpact>();

```
for (const item of arr) {
  const existing = map.get(item.part);

  if (
    !existing ||
    sevRank[item.severity] >
      sevRank[existing.severity]
  ) {
    map.set(item.part, item);
  }
}

return Array.from(map.values());
```

};

return {
bodyDamage: dedupe(damage),
bodyBenefit: dedupe(benefit),
};
}
