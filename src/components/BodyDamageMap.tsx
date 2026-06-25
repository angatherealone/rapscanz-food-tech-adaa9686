import { useState } from "react";
import { OrganDetailDialog } from "@/components/OrganDetail";


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
    low: "#ef4444",
    medium: "#ef4444",
    high: "#ef4444",
  },
  benefit: {
    low: "#86efac",
    medium: "#4ade80",
    high: "#22c55e",
  },
};

// Soft ambient neon teal for the inactive/idle state of every organ.
const INACTIVE_NEON = "#22d3ee"; // cyan-400

const BODY_STROKE: Record<BodyMapVariant, string> = {
  damage: "#67e8f9",
  benefit: "#86efac",
};

const GLOW_SHADOW: Record<BodyMapVariant, string> = {
  damage: "drop-shadow(0 0 22px rgba(34,211,238,0.18))",
  benefit: "drop-shadow(0 0 22px rgba(34,197,94,0.28))",
};

/**
 * Anatomically-correct organ positions on a front-facing human silhouette
 * (viewer's POV — the subject's LEFT side appears on the viewer's RIGHT).
 * ViewBox: 260 x 600.
 *
 * Each organ has its own SVG path so we can highlight the exact organ when
 * it's affected (or benefited) by the scanned product.
 */
type OrganDef = {
  label: string;
  /** SVG path for the organ shape. */
  path: string;
  /** Anchor point for the callout label (inside the body). */
  anchor: { x: number; y: number };
  /** Where the label text sits (outside the body). */
  callout: { x: number; y: number };
};

const ORGANS: Record<string, OrganDef> = {
  brain: {
    label: "Brain",
    path: "M112 28 Q108 16 122 14 Q140 12 150 22 Q160 30 156 42 Q152 52 140 52 Q124 54 116 46 Q108 40 112 28 Z",
    anchor: { x: 134, y: 32 },
    callout: { x: 232, y: 30 },
  },
  eyes: {
    label: "Eyes",
    path: "M120 64 a4 2.5 0 1 0 8 0 a4 2.5 0 1 0 -8 0 M140 64 a4 2.5 0 1 0 8 0 a4 2.5 0 1 0 -8 0",
    anchor: { x: 134, y: 64 },
    callout: { x: 24, y: 60 },
  },
  teeth: {
    label: "Teeth / Mouth",
    path: "M122 84 L150 84 L150 90 L122 90 Z M126 84 L126 90 M132 84 L132 90 M138 84 L138 90 M144 84 L144 90",
    anchor: { x: 136, y: 87 },
    callout: { x: 232, y: 86 },
  },
  throat: {
    label: "Throat",
    path: "M128 100 L144 100 L142 124 L130 124 Z",
    anchor: { x: 136, y: 112 },
    callout: { x: 24, y: 112 },
  },
  // Heart: anatomically — broader at top (atria + great vessels), apex angled to
  // subject's LEFT (viewer's right). NOT a symmetric cartoon heart.
  heart: {
    label: "Heart",
    // Anatomically correct: aortic arch on top, superior vena cava + pulmonary
    // trunk as great vessels, left atrium on subject's left (viewer's right),
    // right atrium bulge on subject's right, ventricles forming pear-shape with
    // apex angled down-left (toward subject's left = viewer's right side of org).
    path: [
      // Aortic arch
      "M138 128 Q140 118 150 116 Q162 116 164 128 L164 146",
      // Superior vena cava
      "M128 128 Q126 138 130 148",
      // Pulmonary trunk
      "M148 128 Q150 138 146 148",
      // Heart body — pear-shaped, apex angled subject-left (viewer right)
      "M118 146 Q108 156 110 178 Q116 200 138 212 Q160 218 172 208 Q184 192 180 168 Q176 150 162 144 Q148 140 138 146 Q128 142 118 146 Z",
      // Coronary artery (LAD) descending toward apex
      "M142 150 Q140 170 148 192 Q154 204 158 210",
      // Circumflex branch
      "M144 154 Q130 162 122 178",
      // Right coronary
      "M152 148 Q166 156 170 178",
    ].join(" "),
    anchor: { x: 146, y: 178 },
    callout: { x: 232, y: 160 },
  },

  lungs: {
    label: "Lungs",
    // Two lobes flanking the heart, larger on the right lobe (subject's right = viewer's left).
    path: "M110 146 Q88 154 86 196 Q86 220 102 224 Q120 224 122 200 L122 152 Q118 144 110 146 Z M158 152 L158 200 Q160 224 178 224 Q194 220 194 196 Q192 154 170 146 Q162 144 158 152 Z",
    anchor: { x: 104, y: 188 },
    callout: { x: 24, y: 188 },
  },
  // Liver: subject's RIGHT upper abdomen → viewer's LEFT.
  liver: {
    label: "Liver",
    path: "M98 230 Q92 244 102 258 Q128 270 152 262 Q160 258 158 248 Q156 238 148 232 Q126 226 110 226 Q102 226 98 230 Z",
    anchor: { x: 124, y: 246 },
    callout: { x: 24, y: 240 },
  },
  // Stomach: subject's LEFT upper abdomen → viewer's RIGHT.
  stomach: {
    label: "Stomach",
    path: "M152 244 Q166 244 174 256 Q180 272 168 282 Q156 288 148 278 Q140 268 144 256 Q148 246 152 244 Z",
    anchor: { x: 162, y: 266 },
    callout: { x: 232, y: 260 },
  },
  pancreas: {
    label: "Pancreas",
    path: "M108 274 Q140 268 174 280 Q170 286 138 284 Q116 284 108 280 Z",
    anchor: { x: 140, y: 278 },
    callout: { x: 232, y: 290 },
  },
  // Kidneys: two beans flanking the spine, behind organs.
  kidneys: {
    label: "Kidneys",
    path: "M104 296 Q94 300 96 320 Q100 336 114 332 Q120 326 118 312 Q116 298 104 296 Z M168 296 Q180 298 180 312 Q178 326 172 332 Q160 336 156 320 Q158 300 168 296 Z",
    anchor: { x: 136, y: 314 },
    callout: { x: 24, y: 312 },
  },
  intestines: {
    label: "Intestines",
    path: "M104 344 Q100 360 116 360 Q132 360 132 348 Q132 360 148 360 Q164 360 164 348 Q166 364 152 368 Q132 372 116 368 Q102 364 104 354 M100 372 Q100 392 124 394 Q150 394 168 388 Q176 384 174 372",
    anchor: { x: 134, y: 372 },
    callout: { x: 232, y: 372 },
  },
  skin: {
    label: "Skin",
    // Full-body subtle outline used as the "skin" highlight.
    path: "M134 110 Q92 116 88 156 L92 250 Q94 296 100 336 Q108 372 116 400 L152 400 Q160 372 168 336 Q174 296 176 250 L180 156 Q176 116 134 110 Z",
    anchor: { x: 134, y: 250 },
    callout: { x: 24, y: 430 },
  },
  bones: {
    label: "Bones",
    // Ribcage + pelvis lines, used as the "bones" highlight.
    path: "M104 130 Q134 124 164 130 L168 152 L100 152 Z M104 158 L164 158 M104 170 L164 170 M104 182 L164 182 M104 194 L164 194 M100 408 Q134 416 168 408 L172 426 Q150 436 118 436 Q100 432 100 420 Z",
    anchor: { x: 134, y: 200 },
    callout: { x: 232, y: 432 },
  },
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

export function BodyDamageMap({
  items,
  variant = "damage",
}: {
  items: BodyDamage[];
  variant?: BodyMapVariant;
}) {
  const mapped = items
    .map((it) => ({ ...it, key: normalizePart(it.part) }))
    .filter((it) => ORGANS[it.key]);
  const [active, setActive] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const palette = SEVERITY_COLOR[variant];
  const stroke = BODY_STROKE[variant];
  const activeItem = active !== null ? mapped[active] : null;
  const activeOrgan = activeItem ? ORGANS[activeItem.key] : null;
  const sideLabel = variant === "benefit" ? "BENEFIT" : "RISK";

  // Build a map of organKey → severity color for affected organs.
  const affectedColors = new Map<string, string>();
  mapped.forEach((it) => {
    affectedColors.set(it.key, palette[it.severity] ?? palette.medium);
  });

  const openDetail = (idx: number) => {
    setActive(idx);
    setDetailOpen(true);
  };

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_1fr]">
      <div
        className="relative mx-auto w-full max-w-[520px] rounded-2xl border border-cyan-500/10 bg-gradient-to-b from-slate-950/60 via-slate-950/30 to-transparent p-2"
        style={{
          boxShadow:
            "inset 0 0 60px rgba(34,211,238,0.06), 0 0 40px rgba(2,6,23,0.4)",
        }}
      >
        <svg
          viewBox="-10 4 290 600"
          className="h-auto w-full"
          style={{ filter: GLOW_SHADOW[variant] }}
        >
          <defs>
            {/* 3D-style humanoid gradient: bright rim → translucent core */}
            <linearGradient id="bdm-body-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.22)" />
              <stop offset="45%" stopColor="rgba(34,211,238,0.06)" />
              <stop offset="100%" stopColor="rgba(8,145,178,0.18)" />
            </linearGradient>
            <radialGradient id="bdm-body-core" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(125,211,252,0.18)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
            <filter id="bdm-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="bdm-strong-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Soft ambient halo behind the body */}
          <ellipse
            cx="134"
            cy="300"
            rx="160"
            ry="280"
            fill="url(#bdm-body-core)"
            opacity="0.7"
          />

          {/* Body silhouette — semi-transparent 3D-style humanoid */}
          <g
            fill="url(#bdm-body-grad)"
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.95"
            style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.35))" }}
          >
            {/* Head */}
            <ellipse cx="134" cy="50" rx="30" ry="38" />
            {/* Neck */}
            <path d="M122 86 L122 108 Q134 114 146 108 L146 86" />
            {/* Shoulders + torso */}
            <path d="M88 116 Q72 124 70 144 L78 220 Q82 290 92 360 Q98 400 108 432 L160 432 Q170 400 176 360 Q186 290 190 220 L198 144 Q196 124 180 116 Q158 108 134 108 Q110 108 88 116 Z" />
            {/* Left arm (viewer's left = subject's right) */}
            <path d="M72 128 Q52 160 46 210 Q42 260 50 312 Q56 332 64 332 Q72 332 72 318 Q72 268 74 232 Q78 184 86 144" />
            <ellipse cx="62" cy="342" rx="10" ry="14" />
            {/* Right arm */}
            <path d="M196 128 Q216 160 222 210 Q226 260 218 312 Q212 332 204 332 Q196 332 196 318 Q196 268 194 232 Q190 184 182 144" />
            <ellipse cx="206" cy="342" rx="10" ry="14" />
            {/* Left leg */}
            <path d="M108 432 Q102 488 108 540 Q112 568 120 580 L138 580 Q138 540 136 488 Q136 460 134 432" />
            <path d="M118 580 Q112 588 120 594 L142 594 Q146 588 138 580" />
            {/* Right leg */}
            <path d="M134 432 Q134 460 134 488 Q136 540 136 580 L152 580 Q160 568 162 540 Q166 488 160 432" />
            <path d="M150 580 Q146 588 148 594 L168 594 Q170 588 162 580" />
          </g>

          {/* Inner highlight rim — fakes 3D volume on the body */}
          <g
            fill="none"
            stroke="rgba(186,230,253,0.45)"
            strokeWidth="0.6"
            strokeLinejoin="round"
            style={{ mixBlendMode: "screen" as const }}
          >
            <path d="M104 122 Q88 132 84 152 L90 220 Q94 300 104 372" />
            <ellipse cx="120" cy="40" rx="18" ry="22" />
          </g>

          {/* Subtle reference ribcage (always shown faintly) */}
          {affectedColors.has("bones") ? null : (
            <g
              fill="none"
              stroke={stroke}
              strokeOpacity="0.22"
              strokeWidth="0.8"
            >
              <path d="M104 158 L164 158 M104 170 L164 170 M104 182 L164 182 M104 194 L164 194" />
            </g>
          )}

          {/* All organs — ambient neon glow for inactive, vivid pulse for affected */}
          {Object.entries(ORGANS).map(([key, organ]) => {
            const color = affectedColors.get(key);
            const isAffected = !!color;
            const isActive = activeItem?.key === key;
            const isHovered = hoveredKey === key;
            const baseColor = isAffected ? color! : INACTIVE_NEON;
            const idx = mapped.findIndex((m) => m.key === key);
            const clickable = idx >= 0;

            return (
              <g
                key={key}
                onClick={() => {
                  if (idx >= 0) openDetail(idx);
                }}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
                style={{
                  cursor: clickable ? "pointer" : "default",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                  transition: "transform 220ms cubic-bezier(.2,.7,.3,1.2)",
                }}
              >
                <path
                  d={organ.path}
                  fill={isAffected ? color : "transparent"}
                  fillOpacity={
                    isAffected ? (isActive ? 0.85 : isHovered ? 0.7 : 0.55) : 0
                  }
                  stroke={baseColor}
                  strokeOpacity={
                    isAffected ? 1 : isHovered ? 0.95 : 0.55
                  }
                  strokeWidth={
                    isAffected
                      ? isActive
                        ? 2.2
                        : isHovered
                        ? 2
                        : 1.6
                      : isHovered
                      ? 1.4
                      : 1
                  }
                  style={{
                    filter: isAffected
                      ? `drop-shadow(0 0 ${
                          isActive ? 14 : isHovered ? 12 : 7
                        }px ${color})`
                      : `drop-shadow(0 0 ${
                          isHovered ? 8 : 3.5
                        }px ${INACTIVE_NEON})`,
                    transition: "stroke-width 200ms ease, filter 200ms ease",
                  }}
                >
                  {isAffected && (
                    <animate
                      attributeName="fillOpacity"
                      values={`${isActive ? 0.85 : 0.55};${
                        isActive ? 0.4 : 0.2
                      };${isActive ? 0.85 : 0.55}`}
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  )}
                  {isAffected && (
                    <animate
                      attributeName="strokeWidth"
                      values={`${isActive ? 2.2 : 1.6};${
                        isActive ? 3.2 : 2.4
                      };${isActive ? 2.2 : 1.6}`}
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
              </g>
            );
          })}

          {/* Active callout */}
          {activeItem && activeOrgan && (
            <g>
              <line
                x1={activeOrgan.callout.x}
                y1={activeOrgan.callout.y}
                x2={activeOrgan.anchor.x}
                y2={activeOrgan.anchor.y}
                stroke={palette[activeItem.severity]}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.9"
              />
              <circle
                cx={activeOrgan.callout.x}
                cy={activeOrgan.callout.y}
                r="3"
                fill={palette[activeItem.severity]}
              />
              <g
                transform={`translate(${activeOrgan.callout.x < 130 ? activeOrgan.callout.x - 4 : activeOrgan.callout.x + 4}, ${activeOrgan.callout.y})`}
                textAnchor={activeOrgan.callout.x < 130 ? "end" : "start"}
              >
                <text
                  y="-3"
                  fill={palette[activeItem.severity]}
                  fontSize="12"
                  fontWeight="700"
                  style={{ filter: `drop-shadow(0 0 4px ${palette[activeItem.severity]})` }}
                >
                  {activeOrgan.label.includes(" / ") ? (
                    <>
                      <tspan x="0" dy="0">{activeOrgan.label.split(" / ")[0]}</tspan>
                      <tspan x="0" dy="12">/ {activeOrgan.label.split(" / ")[1]}</tspan>
                    </>
                  ) : (
                    activeOrgan.label
                  )}
                </text>
                <text
                  y={activeOrgan.label.includes(" / ") ? 22 : 10}
                  fill="#cbd5e1"
                  fontSize="9"
                  fontWeight="500"
                >
                  {activeItem.severity.toUpperCase()} {sideLabel}
                </text>
              </g>

            </g>
          )}
        </svg>
      </div>


      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/30 p-4"
        style={{ boxShadow: "inset 0 0 50px rgba(34,211,238,0.05), 0 0 30px rgba(2,6,23,0.5)" }}
      >
        {/* HUD header */}
        <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/80">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            BIO-SCAN · TELEMETRY
          </span>
          <span className="text-cyan-300/50">
            {mapped.length.toString().padStart(2, "0")} {variant === "benefit" ? "BNFT" : "RISK"}
          </span>
        </div>

        {!activeItem || !activeOrgan ? (
          /* Empty state — sonar pulse */
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 py-10">
            <div className="relative h-32 w-32">
              <span className="absolute inset-0 rounded-full border border-cyan-400/40" />
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400/60" style={{ animationDuration: "2.4s" }} />
              <span className="absolute inset-3 animate-ping rounded-full border border-cyan-300/40" style={{ animationDuration: "3s", animationDelay: "0.4s" }} />
              <span className="absolute inset-7 animate-ping rounded-full border border-cyan-200/30" style={{ animationDuration: "3.6s", animationDelay: "0.8s" }} />
              <span className="absolute inset-[42%] rounded-full bg-cyan-400 shadow-[0_0_18px_#22d3ee]" />
            </div>
            <div className="text-center font-mono">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/90">
                Awaiting System Focus
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cyan-500/50">
                Data Input · Select Organ Node
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Isolated organ micro-viewport with crosshair grid */}
            {(() => {
              const cx = activeOrgan.anchor.x;
              const cy = activeOrgan.anchor.y;
              const half = 46;
              const color = palette[activeItem.severity] ?? palette.medium;
              return (
                <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950/80 p-3"
                  style={{ boxShadow: `inset 0 0 30px ${color}22` }}
                >
                  <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300/70">
                    <span>NODE · {activeOrgan.label.replace(" / ", "·")}</span>
                    <span style={{ color }}>{activeItem.severity.toUpperCase()}</span>
                  </div>
                  <svg viewBox={`${cx - half} ${cy - half} ${half * 2} ${half * 2}`} className="h-44 w-full">
                    <defs>
                      <pattern id="bdm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="0.3" />
                      </pattern>
                    </defs>
                    <rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} fill="url(#bdm-grid)" />
                    {/* Crosshair */}
                    <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} stroke="rgba(34,211,238,0.45)" strokeDasharray="2 3" strokeWidth="0.4" />
                    <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} stroke="rgba(34,211,238,0.45)" strokeDasharray="2 3" strokeWidth="0.4" />
                    <circle cx={cx} cy={cy} r={28} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth="0.4" />
                    <circle cx={cx} cy={cy} r={16} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="0.4" />
                    {/* Organ */}
                    <path
                      d={activeOrgan.path}
                      fill={color}
                      fillOpacity="0.55"
                      stroke={color}
                      strokeWidth="1.4"
                      style={{ filter: `drop-shadow(0 0 10px ${color})` }}
                    >
                      <animate attributeName="fillOpacity" values="0.55;0.85;0.55" dur="1.8s" repeatCount="indefinite" />
                    </path>
                    {/* Corner brackets */}
                    {[
                      [cx - half + 2, cy - half + 2, 1, 1],
                      [cx + half - 2, cy - half + 2, -1, 1],
                      [cx - half + 2, cy + half - 2, 1, -1],
                      [cx + half - 2, cy + half - 2, -1, -1],
                    ].map(([x, y, dx, dy], i) => (
                      <g key={i} stroke={color} strokeWidth="0.8" fill="none">
                        <line x1={x} y1={y} x2={x + 8 * dx} y2={y} />
                        <line x1={x} y1={y} x2={x} y2={y + 8 * dy} />
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}

            {/* Track A — Cellular Pathway Disruption */}
            <div>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span className="text-cyan-400">▸</span> Track A · Cellular Pathway Disruption
              </div>
              <div
                className="rounded-md border-l-2 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-200"
                style={{ borderLeftColor: palette[activeItem.severity] ?? palette.medium }}
              >
                {activeItem.reason}
              </div>
            </div>

            {/* Track B — Tissue Layer Compromise */}
            <div>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span className="text-cyan-400">▸</span> Track B · Tissue Layer Compromise
              </div>
              <ul className="space-y-1 rounded-md border border-cyan-500/10 bg-slate-950/50 p-3">
                {(TISSUE_LAYERS[activeItem.key] ?? ["Surface Epithelium", "Connective Tissue"]).map((layer) => (
                  <li key={layer} className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                    <span className="inline-block h-1 w-3 bg-cyan-400/70 shadow-[0_0_4px_#22d3ee]" />
                    {layer}
                  </li>
                ))}
              </ul>
            </div>

            {/* Track C — Molecular Trigger Compounds */}
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                <span className="flex items-center gap-2"><span className="text-cyan-400">▸</span> Track C · Molecular Trigger Compounds</span>
                <span
                  className="rounded-sm border px-1.5 py-0.5 font-bold tracking-[0.3em]"
                  style={{
                    color: palette[activeItem.severity] ?? palette.medium,
                    borderColor: palette[activeItem.severity] ?? palette.medium,
                    background: `${palette[activeItem.severity] ?? palette.medium}1a`,
                  }}
                >
                  {activeItem.severity.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-cyan-500/10 bg-slate-950/50 p-3">
                {(splitTriggers(activeItem.trigger).length
                  ? splitTriggers(activeItem.trigger)
                  : ["Unidentified compound"]
                ).map((t) => {
                  const c = palette[activeItem.severity] ?? palette.medium;
                  return (
                    <span
                      key={t}
                      className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
                      style={{ color: c, borderColor: `${c}88`, background: `${c}14`, boxShadow: `0 0 8px ${c}33` }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Quick switcher */}
            {mapped.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mapped.map((it, i) => {
                  const c = palette[it.severity] ?? palette.medium;
                  const isActive = active === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-all ${
                        isActive ? "scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        color: c,
                        borderColor: isActive ? c : `${c}55`,
                        background: isActive ? `${c}22` : "transparent",
                        boxShadow: isActive ? `0 0 10px ${c}55` : "none",
                      }}
                    >
                      {ORGANS[it.key].label.split(" / ")[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {activeItem && activeOrgan && (
        <OrganDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          organKey={activeItem.key}
          organLabel={activeOrgan.label}
          item={activeItem}
          variant={variant}
          color={palette[activeItem.severity] ?? palette.medium}
        />
      )}
    </div>
  );
}

