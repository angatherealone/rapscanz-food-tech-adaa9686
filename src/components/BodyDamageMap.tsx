import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ORGAN_ART, ORGAN_FALLBACK } from "@/components/OrganDetail";

export type BodyDamage = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
  /** The specific chemical / nutrient / ingredient that triggered this impact. */
  trigger?: string;
};

export type BodyMapVariant = "damage" | "benefit";

const SEVERITY_COLOR: Record<BodyMapVariant, Record<string, string>> = {
  damage: {
    low: "#f87171",   // red-400
    medium: "#ef4444", // red-500 — vibrant crimson
    high: "#ef4444",  // red-500 — vibrant crimson pulse
  },
  benefit: {
    low: "#86efac",
    medium: "#4ade80",
    high: "#22c55e",
  },
};

const NOMINAL_COLOR = "#34d399"; // emerald — healthy
const IDLE_COLOR = "#22d3ee"; // soft cyan — unused organ container

/** Organ display order in the grid (anatomical / head-to-toe). */
const ORGAN_ORDER = [
  "brain",
  "eyes",
  "teeth",
  "throat",
  "lungs",
  "heart",
  "liver",
  "stomach",
  "pancreas",
  "kidneys",
  "intestines",
  "skin",
  "bones",
] as const;

const ORGAN_LABEL: Record<string, string> = {
  brain: "Brain",
  eyes: "Eyes",
  teeth: "Teeth / Mouth",
  throat: "Throat",
  lungs: "Lungs",
  heart: "Heart",
  liver: "Liver",
  stomach: "Stomach",
  pancreas: "Pancreas",
  kidneys: "Kidneys",
  intestines: "Intestines",
  skin: "Skin",
  bones: "Bones",
};

const TISSUE_LAYERS: Record<string, string[]> = {
  brain: ["Blood-Brain Barrier", "Cortical Gray Matter", "Myelin Sheath", "Synaptic Cleft"],
  eyes: ["Corneal Epithelium", "Retinal Pigment Layer", "Vitreous Humor", "Optic Nerve Fibers"],
  teeth: ["Enamel Prism Layer", "Dentin Tubules", "Gingival Mucosa", "Pulp Chamber"],
  throat: ["Pharyngeal Mucosa", "Esophageal Lining", "Vocal Fold Epithelium"],
  heart: ["Endothelial Intima", "Myocardial Muscle Fibers", "Coronary Artery Walls", "Pericardial Sac"],
  lungs: ["Alveolar Membrane", "Bronchial Cilia", "Pulmonary Capillary Bed", "Pleural Lining"],
  liver: ["Hepatic Sinusoids", "Kupffer Cell Layer", "Bile Canaliculi", "Hepatocyte Membrane"],
  stomach: ["Gastric Mucosa", "Parietal Cell Layer", "Pyloric Sphincter Tissue"],
  pancreas: ["Islet of Langerhans", "Acinar Cell Tissue", "Pancreatic Ductal Lining"],
  kidneys: ["Glomerular Filtration Membrane", "Proximal Tubule Epithelium", "Renal Cortex", "Nephron Loop"],
  intestines: ["Intestinal Villi", "Mucosal Brush Border", "Gut Microbiome Layer", "Submucosal Plexus"],
  skin: ["Stratum Corneum", "Dermal Collagen Matrix", "Subcutaneous Fat Layer", "Sebaceous Glands"],
  bones: ["Cortical Bone Matrix", "Trabecular Lattice", "Periosteum", "Bone Marrow Stroma"],
};

function splitTriggers(s?: string): string[] {
  if (!s) return [];
  return s
    .split(/,| \+ |\band\b|&|\/|;/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizePart(p: string): string {
  const k = p.toLowerCase().trim();
  if (k.includes("brain") || k.includes("neuro") || k.includes("cogniti") || k.includes("memory")) return "brain";
  if (k.includes("eye") || k.includes("vision") || k.includes("sight")) return "eyes";
  if (k.includes("teeth") || k.includes("dental") || k.includes("tooth") || k.includes("enamel") || k.includes("mouth")) return "teeth";
  if (k.includes("throat") || k.includes("esoph")) return "throat";
  if (k.includes("heart") || k.includes("cardio") || k.includes("arter")) return "heart";
  if (k.includes("lung") || k.includes("respir")) return "lungs";
  if (k.includes("liver") || k.includes("hepat")) return "liver";
  if (k.includes("stomach") || k.includes("gastr")) return "stomach";
  if (k.includes("pancre") || k.includes("insulin") || k.includes("diabet")) return "pancreas";
  if (k.includes("kidney") || k.includes("renal")) return "kidneys";
  if (k.includes("intest") || k.includes("gut") || k.includes("bowel") || k.includes("colon") || k.includes("microbi")) return "intestines";
  if (k.includes("skin") || k.includes("derm") || k.includes("collagen")) return "skin";
  if (k.includes("bone") || k.includes("joint") || k.includes("calcium") || k.includes("muscle")) return "bones";
  return k;
}

/* ----------------------------------------------------------------- */
/*  Humanoid silhouette positioning                                   */
/* ----------------------------------------------------------------- */

/** Center (cx, cy) and render scale for each organ inside the 400x720 body viewBox. */
const ORGAN_POS: Record<string, { cx: number; cy: number; scale: number }> = {
  brain:      { cx: 200, cy: 70,  scale: 0.42 },
  eyes:       { cx: 200, cy: 108, scale: 0.30 },
  teeth:      { cx: 200, cy: 140, scale: 0.30 },
  throat:     { cx: 200, cy: 180, scale: 0.30 },
  lungs:      { cx: 200, cy: 250, scale: 0.62 },
  heart:      { cx: 217, cy: 255, scale: 0.38 },
  liver:      { cx: 170, cy: 320, scale: 0.46 },
  stomach:    { cx: 225, cy: 320, scale: 0.40 },
  pancreas:   { cx: 200, cy: 350, scale: 0.36 },
  kidneys:    { cx: 200, cy: 380, scale: 0.50 },
  intestines: { cx: 200, cy: 445, scale: 0.58 },
  skin:       { cx: 305, cy: 400, scale: 0.34 },
  bones:      { cx: 200, cy: 605, scale: 0.55 },
};

/** Anatomical humanoid silhouette outline path (head + torso + arms + legs). */
const BODY_OUTLINE =
  "M200 18 C 226 18 246 38 246 66 C 246 86 236 102 222 110 L 232 132 L 268 142 C 296 150 320 168 332 196 L 348 256 C 354 280 350 304 338 322 L 326 432 L 314 568 C 312 600 304 632 290 660 L 280 700 L 246 700 L 240 632 L 224 528 L 216 432 L 200 432 L 184 432 L 176 528 L 160 632 L 154 700 L 120 700 L 110 660 C 96 632 88 600 86 568 L 74 432 L 62 322 C 50 304 46 280 52 256 L 68 196 C 80 168 104 150 132 142 L 168 132 L 178 110 C 164 102 154 86 154 66 C 154 38 174 18 200 18 Z";



/* ----------------------------------------------------------------- */
/*  Focus Modal — left scope + right diagnostic tracks               */
/* ----------------------------------------------------------------- */

function FocusModal({
  open,
  onOpenChange,
  organKey,
  organLabel,
  item,
  variant,
  affected,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organKey: string;
  organLabel: string;
  item: BodyDamage | null;
  variant: BodyMapVariant;
  affected: boolean;
}) {
  const palette = SEVERITY_COLOR[variant];
  const color = item ? palette[item.severity] ?? palette.medium : NOMINAL_COLOR;
  const accent = affected ? color : NOMINAL_COLOR;
  const render = ORGAN_ART[organKey] ?? ORGAN_FALLBACK;
  const layers = TISSUE_LAYERS[organKey] ?? ["Surface Epithelium", "Connective Tissue"];
  const triggers = splitTriggers(item?.trigger);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl overflow-hidden border-cyan-500/20 bg-slate-950/95 p-0 backdrop-blur-xl"
        style={{
          boxShadow: `0 0 80px ${accent}33, inset 0 0 60px rgba(2,6,23,0.8)`,
        }}
      >
        <div className="grid gap-0 md:grid-cols-2">
          {/* LEFT — Scope crosshair + magnified organ */}
          <div
            className="relative flex aspect-square items-center justify-center overflow-hidden md:aspect-auto"
            style={{
              background: `radial-gradient(ellipse at center, ${accent}1f 0%, rgba(2,6,23,0.98) 70%)`,
            }}
          >
            {/* Scanline grid */}
            <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
              <defs>
                <pattern id="bdm-modal-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M 22 0 L 0 0 0 22" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#bdm-modal-grid)" />
            </svg>

            {/* Pulse halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 animate-pulse"
              style={{
                background: `radial-gradient(circle at center, ${accent}33 0%, transparent 55%)`,
              }}
            />

            {/* Crosshair rings */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
              {[55, 75, 95].map((r, i) => (
                <circle
                  key={r}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke={accent}
                  strokeOpacity={0.35 - i * 0.08}
                  strokeWidth="0.5"
                  strokeDasharray="3 5"
                />
              ))}
              <line x1="0" y1="100" x2="200" y2="100" stroke={accent} strokeOpacity="0.25" strokeWidth="0.4" strokeDasharray="2 4" />
              <line x1="100" y1="0" x2="100" y2="200" stroke={accent} strokeOpacity="0.25" strokeWidth="0.4" strokeDasharray="2 4" />
            </svg>

            {/* Corner brackets */}
            {[
              ["left-3 top-3", "border-t-2 border-l-2"],
              ["right-3 top-3", "border-t-2 border-r-2"],
              ["left-3 bottom-3", "border-b-2 border-l-2"],
              ["right-3 bottom-3", "border-b-2 border-r-2"],
            ].map(([pos, brd], i) => (
              <span
                key={i}
                aria-hidden
                className={`pointer-events-none absolute ${pos} h-5 w-5 ${brd}`}
                style={{ borderColor: accent, boxShadow: `0 0 8px ${accent}` }}
              />
            ))}

            {/* Magnified organ */}
            <svg
              viewBox="0 0 200 200"
              className="relative h-full w-full max-h-[420px] p-6"
              style={{ filter: `drop-shadow(0 0 28px ${accent}aa)` }}
            >
              {render(accent)}
            </svg>

            {/* HUD label */}
            <div className="absolute left-3 top-3 -translate-y-7 font-mono text-[9px] uppercase tracking-[0.28em] text-cyan-300/80">
              SCOPE · {organLabel.replace(" / ", "·")}
            </div>
            <div
              className="absolute right-3 bottom-3 translate-y-7 rounded-sm border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.28em]"
              style={{
                color: accent,
                borderColor: accent,
                background: `${accent}1a`,
                boxShadow: `0 0 8px ${accent}66`,
              }}
            >
              {affected && item ? `${item.severity} ${variant === "benefit" ? "BENEFIT" : "THREAT"}` : "NOMINAL"}
            </div>
          </div>

          {/* RIGHT — Tracking rows */}
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl font-bold text-slate-50">{organLabel}</DialogTitle>
              <span
                className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: accent, borderColor: accent, background: `${accent}14` }}
              >
                {affected && item ? item.severity : "nominal"}
              </span>
            </div>

            {/* Track 1 — Pathological damage */}
            <div>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span style={{ color: accent }}>▸</span> Track 01 · {variant === "benefit" ? "Beneficial Pathway" : "Pathological Damage"}
              </div>
              <div
                className="rounded-md border-l-2 bg-slate-950/70 p-3 text-sm leading-relaxed text-slate-200"
                style={{ borderLeftColor: accent }}
              >
                {affected && item
                  ? item.reason
                  : "No abnormal activity detected for this organ in the current product scan."}
              </div>
            </div>

            {/* Track 2 — Compromised structural layers */}
            <div>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span style={{ color: accent }}>▸</span> Track 02 · {variant === "benefit" ? "Reinforced Structural Layers" : "Compromised Structural Layers"}
              </div>
              <ul className="grid grid-cols-1 gap-1 rounded-md border border-cyan-500/10 bg-slate-950/50 p-3 sm:grid-cols-2">
                {layers.map((layer) => (
                  <li key={layer} className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                    <span
                      className="inline-block h-1 w-3"
                      style={{
                        background: accent,
                        boxShadow: `0 0 6px ${accent}`,
                        opacity: affected ? 1 : 0.55,
                      }}
                    />
                    {layer}
                  </li>
                ))}
              </ul>
            </div>

            {/* Track 3 — Molecular trigger compounds */}
            <div>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span style={{ color: accent }}>▸</span> Track 03 · {variant === "benefit" ? "Beneficial Compounds" : "Molecular Trigger Compounds"}
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-cyan-500/10 bg-slate-950/50 p-3">
                {(affected && triggers.length ? triggers : ["—"]).map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
                    style={{
                      color: accent,
                      borderColor: `${accent}88`,
                      background: `${accent}14`,
                      boxShadow: `0 0 8px ${accent}33`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- */
/*  Public component                                                  */
/* ----------------------------------------------------------------- */

export function BodyDamageMap({
  items,
  variant = "damage",
}: {
  items: BodyDamage[];
  variant?: BodyMapVariant;
}) {
  const palette = SEVERITY_COLOR[variant];

  // Build a fast lookup from organ key → BodyDamage (first match wins).
  const itemByKey = new Map<string, BodyDamage>();
  items.forEach((it) => {
    const k = normalizePart(it.part);
    if (!itemByKey.has(k)) itemByKey.set(k, it);
  });

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const focusItem = focusKey ? itemByKey.get(focusKey) ?? null : null;
  const focusAffected = !!focusItem;
  const focusColor = focusItem
    ? palette[focusItem.severity] ?? palette.medium
    : NOMINAL_COLOR;

  return (
    <div
      className="relative rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/30 p-4"
      style={{
        boxShadow: "inset 0 0 60px rgba(34,211,238,0.05), 0 0 30px rgba(2,6,23,0.5)",
      }}
    >
      {/* HUD header */}
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          Bio-Diagnostic Grid · {variant === "benefit" ? "Benefit Map" : "Threat Map"}
        </span>
        <span className="text-cyan-300/60">
          {itemByKey.size.toString().padStart(2, "0")} / {ORGAN_ORDER.length} ACTIVE
        </span>
      </div>

      {/* Central humanoid silhouette */}
      <div className="relative mx-auto w-full max-w-[460px]">
        <svg
          viewBox="0 0 400 720"
          className="h-auto w-full"
          aria-label="Bio-scanner body silhouette"
        >
          <defs>
            <radialGradient id="bdm-body-glass" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#0e7490" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#0c4a6e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
            </radialGradient>
            <linearGradient id="bdm-body-rim" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.35" />
            </linearGradient>
            <pattern id="bdm-body-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#22d3ee" strokeOpacity="0.18" strokeWidth="0.3" />
            </pattern>
          </defs>

          {/* Glass body fill */}
          <path d={BODY_OUTLINE} fill="url(#bdm-body-glass)" />
          {/* Grid wash inside body (clipped) */}
          <clipPath id="bdm-body-clip"><path d={BODY_OUTLINE} /></clipPath>
          <rect x="0" y="0" width="400" height="720" fill="url(#bdm-body-grid)" clipPath="url(#bdm-body-clip)" opacity="0.6" />
          {/* Inner rim highlight */}
          <path d={BODY_OUTLINE} fill="none" stroke="url(#bdm-body-rim)" strokeWidth="1.4" opacity="0.85" />
          <path d={BODY_OUTLINE} fill="none" stroke="#22d3ee" strokeWidth="0.4" opacity="0.4" />

          {/* Centerline scan accent */}
          <line x1="200" y1="20" x2="200" y2="700" stroke="#22d3ee" strokeOpacity="0.12" strokeWidth="0.5" strokeDasharray="3 5" />

          {/* Affected organs — glowing, clickable */}
          {ORGAN_ORDER.map((key) => {
            const it = itemByKey.get(key);
            if (!it) return null;
            const pos = ORGAN_POS[key];
            if (!pos) return null;
            const color = palette[it.severity] ?? palette.medium;
            const render = ORGAN_ART[key] ?? ORGAN_FALLBACK;
            // Each organ asset draws in a 200x200 frame, centered.
            const s = pos.scale;
            const tx = pos.cx - 100 * s;
            const ty = pos.cy - 100 * s;
            return (
              <g
                key={key}
                role="button"
                aria-label={`Open ${ORGAN_LABEL[key]} diagnostic`}
                onClick={() => setFocusKey(key)}
                className="cursor-pointer outline-none"
                style={{ filter: `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 22px ${color}aa)` }}
              >
                {/* Glow halo */}
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={60 * s}
                  fill={color}
                  opacity="0.22"
                  style={{ animation: "bdm-pulse 1.8s ease-in-out infinite" }}
                />
                {/* Organ illustration */}
                <g transform={`translate(${tx} ${ty}) scale(${s})`}>
                  {render(color)}
                </g>
                {/* Pulse ring */}
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={48 * s}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  opacity="0.7"
                  style={{ animation: "bdm-pulse 1.8s ease-in-out infinite" }}
                />
                {/* Label */}
                <text
                  x={pos.cx}
                  y={pos.cy + 62 * s}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill={color}
                  style={{ textShadow: `0 0 6px ${color}` }}
                  className="uppercase tracking-widest"
                >
                  {ORGAN_LABEL[key]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer hint */}
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400/50">
        {itemByKey.size === 0
          ? "No affected systems detected"
          : "Tap any glowing organ to open the diagnostic scope"}
      </p>


      {/* Focus modal */}
      {focusKey && (
        <FocusModal
          open={!!focusKey}
          onOpenChange={(o) => !o && setFocusKey(null)}
          organKey={focusKey}
          organLabel={ORGAN_LABEL[focusKey] ?? focusKey}
          item={focusItem}
          variant={variant}
          affected={focusAffected}
        />
      )}

      {/* Keyframes for neon pulse — scoped via styled-jsx-less inline tag */}
      <style>{`
        @keyframes bdm-pulse {
          0%,100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
