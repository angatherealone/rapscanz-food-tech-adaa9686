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

/** Center (cx, cy) and render scale for each organ inside the 400x720 body viewBox.
 *  Locked to a reference-style anatomical map: thoracic organs stay between the
 *  shoulders/rib cage, abdominal organs stay above the pelvis, and systemic
 *  targets (skin/bones) render as full-body overlays instead of single icons. */
const ORGAN_POS: Record<string, { cx: number; cy: number; scale: number }> = {
  brain:      { cx: 200, cy: 45,  scale: 0.16 },
  eyes:       { cx: 200, cy: 52,  scale: 0.07 },
  teeth:      { cx: 200, cy: 62,  scale: 0.07 },
  throat:     { cx: 200, cy: 78,  scale: 0.08 },
  lungs:      { cx: 200, cy: 125, scale: 0.22 },
  heart:      { cx: 193, cy: 122, scale: 0.13 },
  liver:      { cx: 184, cy: 168, scale: 0.18 },
  stomach:    { cx: 212, cy: 165, scale: 0.13 },
  pancreas:   { cx: 200, cy: 184, scale: 0.12 },
  kidneys:    { cx: 200, cy: 200, scale: 0.17 },
  intestines: { cx: 200, cy: 225, scale: 0.20 },
  skin:       { cx: 200, cy: 210, scale: 1 },
  bones:      { cx: 200, cy: 210, scale: 1 },
};

/** Sleek athletic human silhouette — single path rendered inside viewBox 400x420. */
const BODY_OUTLINE =
  "M200,70 C212,70 220,62 220,50 C220,38 212,30 200,30 C188,30 180,38 180,50 C180,62 188,70 200,70 Z " +
  "M190,75 C175,77 165,85 155,98 C148,108 140,125 135,150 C132,165 136,170 140,170 C144,170 146,162 148,150 " +
  "C152,130 160,110 170,102 L170,160 C170,190 165,220 162,250 L145,340 C142,355 148,365 155,365 " +
  "C162,365 168,355 172,335 L188,255 L192,255 L192,380 C192,388 198,390 200,390 C202,390 208,388 208,380 " +
  "L208,255 L212,255 L228,335 C232,355 238,365 245,365 C252,365 258,355 255,340 L238,250 " +
  "C235,220 230,190 230,160 L230,102 C240,110 248,130 252,150 C254,162 256,170 260,170 " +
  "C264,170 268,165 265,150 C260,125 252,108 245,98 C235,85 225,77 210,75 Z";


const CHEST_CAVITY = "";
const ABDOMEN_CAVITY = "";

/** Minimal anatomical overlay for the benefit map — clean spine + collarbone +
 *  simple rib arches + pelvic line. No alien wireframe, no synapse dots. */
function renderNeuralWireframe(color: string) {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.55"
      style={{ filter: `drop-shadow(0 0 3px ${color})` }}
    >
      <line x1="200" y1="75" x2="200" y2="255" strokeWidth="1.6" opacity="0.7" />
      <path d="M200,90 Q175,100 160,115" />
      <path d="M200,90 Q225,100 240,115" />
      <path d="M200,110 Q170,122 152,142" />
      <path d="M200,110 Q230,122 248,142" />
      <path d="M200,130 Q168,145 150,175" />
      <path d="M200,130 Q232,145 250,175" />
      <path d="M200,150 Q168,170 152,210" />
      <path d="M200,150 Q232,170 248,210" />
      <path d="M200,170 Q170,195 157,245" />
      <path d="M200,170 Q230,195 243,245" />
      <path d="M200,195 Q175,225 161,270" />
      <path d="M200,195 Q225,225 239,270" />
      <path d="M196,255 L172,360" opacity="0.6" />
      <path d="M204,255 L228,360" opacity="0.6" />
    </g>
  );
}





function renderSystemOverlay({
  system,
  color,
  onClick,
}: {
  system: "skin" | "bones";
  color: string;
  onClick: () => void;
}) {
  if (system === "skin") {
    return (
      <g
        role="button"
        aria-label="Open Skin diagnostic"
        onClick={onClick}
        className="cursor-pointer outline-none"
        style={{ filter: `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 26px ${color}aa)` }}
      >
        <path
          d={BODY_OUTLINE}
          fill={`${color}10`}
          stroke={color}
          strokeWidth="5"
          opacity="0.9"
          style={{ animation: "bdm-pulse 1.55s ease-in-out infinite" }}
        />
        <path d={BODY_OUTLINE} fill="none" stroke={color} strokeWidth="1.3" opacity="1" />
      </g>
    );
  }

  return (
    <g
      role="button"
      aria-label="Open Bones diagnostic"
      onClick={onClick}
      className="cursor-pointer outline-none"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 26px ${color}aa)` }}
    >
      <path d={BODY_OUTLINE} strokeWidth="2.4" opacity="0.32" style={{ animation: "bdm-pulse 1.55s ease-in-out infinite" }} />
      {/* Skull, spine, rib cage, pelvis, arms, and legs — full skeletal map, not a single bone. */}
      <path d="M173 72 C173 48 186 38 200 38 C214 38 227 48 227 72 C227 99 216 116 200 116 C184 116 173 99 173 72 Z" strokeWidth="2.2" fill={`${color}0d`} />
      <path d="M185 146 C193 152 207 152 215 146 M200 116 L200 486" strokeWidth="2.3" />
      {[174, 192, 210, 228, 246, 264, 282].map((y, i) => (
        <path
          key={y}
          d={`M200 ${y} C ${174 - i * 1.6} ${y - 6} ${154 + i} ${y + 13} ${146 + i} ${y + 35} M200 ${y} C ${226 + i * 1.6} ${y - 6} ${246 - i} ${y + 13} ${254 - i} ${y + 35}`}
          strokeWidth="1.35"
          opacity="0.76"
        />
      ))}
      <path d="M152 156 L118 242 L99 352 L78 502 M248 156 L282 242 L301 352 L322 502" strokeWidth="2" opacity="0.88" />
      <path d="M158 466 C177 490 223 490 242 466 M169 486 C184 501 216 501 231 486" strokeWidth="2" />
      <path d="M184 494 L173 592 L168 694 M216 494 L227 592 L232 694" strokeWidth="2.2" />
      <path d="M173 592 L153 694 M227 592 L247 694" strokeWidth="1.45" opacity="0.7" />
    </g>
  );
}

function renderSystemScope(system: "skin" | "bones", color: string) {
  const transform = "translate(52 13) scale(0.24)";

  if (system === "skin") {
    return (
      <g transform={transform}>
        <path d={BODY_OUTLINE} fill={`${color}18`} stroke={color} strokeWidth="7" opacity="0.92" />
        <path d={BODY_OUTLINE} fill="none" stroke={color} strokeWidth="2" opacity="1" />
      </g>
    );
  }

  return (
    <g transform={transform} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path d={BODY_OUTLINE} strokeWidth="3" opacity="0.28" />
      <ellipse cx="200" cy="72" rx="31" ry="42" strokeWidth="3" fill={`${color}0d`} />
      <path d="M200 116 L200 470" strokeWidth="3" />
      {[168, 184, 200, 216, 232, 248, 264].map((y, i) => (
        <path
          key={y}
          d={`M200 ${y} C ${174 - i * 2} ${y - 2} ${157 - i} ${y + 13} ${148 + i} ${y + 32} M200 ${y} C ${226 + i * 2} ${y - 2} ${243 + i} ${y + 13} ${252 - i} ${y + 32}`}
          strokeWidth="2"
          opacity="0.82"
        />
      ))}
      <path d="M152 150 L104 246 L82 360 L48 504" strokeWidth="2.6" />
      <path d="M248 150 L296 246 L318 360 L352 504" strokeWidth="2.6" />
      <path d="M162 462 C178 485 222 485 238 462 M167 482 C184 498 216 498 233 482" strokeWidth="2.6" />
      <path d="M184 490 L166 694 M216 490 L234 694" strokeWidth="3" />
      <path d="M174 590 L153 694 M226 590 L247 694" strokeWidth="2" opacity="0.72" />
    </g>
  );
}



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
  const render = organKey === "skin" || organKey === "bones"
    ? (c: string) => renderSystemScope(organKey, c)
    : ORGAN_ART[organKey] ?? ORGAN_FALLBACK;
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
              className="relative h-full w-full max-h-[420px] p-8"
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

      {/* Central humanoid silhouette — strict aspect ratio to prevent stretching */}
      <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[400px]">
        <svg
          viewBox="0 0 400 420"
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          aria-label="Bio-scanner body silhouette"
        >
          <defs>
            <pattern id={`bdm-body-grid-${variant}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke={variant === "benefit" ? "#22c55e" : "#00f2fe"} strokeOpacity="0.14" strokeWidth="0.3" />
            </pattern>
            <filter id={`bdm-body-aura-${variant}`} x="-10%" y="-5%" width="120%" height="110%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id={`bdm-body-inner-${variant}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Soft aura behind the figure */}
          <rect
            x="80" y="20" width="240" height="390" rx="120"
            fill={variant === "benefit" ? "#22c55e" : "#60a5fa"}
            opacity="0.08"
            filter={`url(#bdm-body-aura-${variant})`}
          />

          {/* Athletic translucent silhouette */}
          <g>
            <path
              d={BODY_OUTLINE}
              fill="none"
              stroke={variant === "benefit" ? "#22c55e" : "#60a5fa"}
              strokeWidth="5"
              strokeLinejoin="round"
              opacity="0.22"
              filter={`url(#bdm-body-inner-${variant})`}
            />
            <path
              d={BODY_OUTLINE}
              fill={variant === "benefit" ? "rgba(34,197,94,0.06)" : "rgba(96,165,250,0.08)"}
              stroke={variant === "benefit" ? "#22c55e" : "#60a5fa"}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>

          {/* Neural / muscular wireframe — benefit map only */}
          {variant === "benefit" && renderNeuralWireframe("#22c55e")}

          {/* Diagnostic grid wash */}
          <rect x="0" y="0" width="400" height="420" fill={`url(#bdm-body-grid-${variant})`} opacity="0.25" />

          {/* Centerline scan accent */}
          <line
            x1="200" y1="20" x2="200" y2="400"
            stroke={variant === "benefit" ? "#22c55e" : "#22d3ee"}
            strokeOpacity="0.15" strokeWidth="0.5" strokeDasharray="3 5"
          />




          {/* Full-body overlays for systemic targets. */}
          {(["skin", "bones"] as const).map((key) => {
            const it = itemByKey.get(key);
            if (!it) return null;
            const color = palette[it.severity] ?? palette.medium;
            return <g key={key}>{renderSystemOverlay({ system: key, color, onClick: () => setFocusKey(key) })}</g>;
          })}

          {/* Affected organs — glowing, clickable */}
          {ORGAN_ORDER.map((key) => {
            const it = itemByKey.get(key);
            if (!it) return null;
            if (key === "skin" || key === "bones") return null;
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
                {/* Subtle organ-shaped wash (no round blob) */}
                <g transform={`translate(${tx} ${ty}) scale(${s})`} opacity="0.55">
                  {render(color)}
                </g>
                {/* Crisp organ illustration on top */}
                <g transform={`translate(${tx} ${ty}) scale(${s})`}>
                  {render(color)}
                </g>
                {/* Thin pulse outline echoing the organ shape */}
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={42 * s}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.7"
                  strokeDasharray="2 3"
                  opacity="0.5"
                  style={{ animation: "bdm-pulse 1.8s ease-in-out infinite" }}
                />

                {/* Label */}
                <text
                  x={pos.cx}
                  y={pos.cy + 54 * s}
                  textAnchor="middle"
                  fontSize="8.5"
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
