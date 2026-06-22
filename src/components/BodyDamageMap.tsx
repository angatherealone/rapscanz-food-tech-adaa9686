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
    low: "#fbbf24",
    medium: "#fb923c",
    high: "#ef4444",
  },
  benefit: {
    low: "#86efac",
    medium: "#4ade80",
    high: "#22c55e",
  },
};

const BODY_STROKE: Record<BodyMapVariant, string> = {
  damage: "#7dd3fc",
  benefit: "#86efac",
};

const GLOW_SHADOW: Record<BodyMapVariant, string> = {
  damage: "drop-shadow(0 0 18px rgba(239,68,68,0.25))",
  benefit: "drop-shadow(0 0 18px rgba(34,197,94,0.3))",
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
  // Heart: anatomically on the subject's LEFT → viewer's RIGHT of midline.
  heart: {
    label: "Heart",
    path: "M150 152 Q138 138 128 148 Q120 156 130 170 Q140 184 150 192 Q160 184 170 170 Q180 156 172 148 Q162 138 150 152 Z",
    anchor: { x: 150, y: 168 },
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
  const [active, setActive] = useState<number | null>(mapped.length ? 0 : null);

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

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <div className="relative mx-auto w-full max-w-[340px]">
        <svg
          viewBox="0 0 260 600"
          className="h-auto w-full"
          style={{ filter: GLOW_SHADOW[variant] }}
        >
          {/* Body silhouette — anatomically proportioned humanoid */}
          <g
            fill="rgba(125, 211, 252, 0.06)"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.85"
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

          {/* Subtle reference ribcage (always shown faintly) */}
          {affectedColors.has("bones") ? null : (
            <g
              fill="none"
              stroke={stroke}
              strokeOpacity="0.18"
              strokeWidth="0.8"
            >
              <path d="M104 158 L164 158 M104 170 L164 170 M104 182 L164 182 M104 194 L164 194" />
            </g>
          )}

          {/* All organs — faint outlines for the non-affected ones, vivid fill for affected */}
          {Object.entries(ORGANS).map(([key, organ]) => {
            const color = affectedColors.get(key);
            const isAffected = !!color;
            const isActive = activeItem?.key === key;
            return (
              <g
                key={key}
                onClick={() => {
                  const idx = mapped.findIndex((m) => m.key === key);
                  if (idx >= 0) setActive(idx);
                }}
                style={{ cursor: isAffected ? "pointer" : "default" }}
              >
                <path
                  d={organ.path}
                  fill={isAffected ? color : "transparent"}
                  fillOpacity={isAffected ? (isActive ? 0.85 : 0.55) : 0}
                  stroke={isAffected ? color : stroke}
                  strokeOpacity={isAffected ? 1 : 0.22}
                  strokeWidth={isAffected ? (isActive ? 2.2 : 1.6) : 0.9}
                  style={
                    isAffected
                      ? { filter: `drop-shadow(0 0 ${isActive ? 10 : 6}px ${color})` }
                      : undefined
                  }
                >
                  {isAffected && (
                    <animate
                      attributeName="fillOpacity"
                      values={`${isActive ? 0.85 : 0.55};${isActive ? 0.45 : 0.25};${isActive ? 0.85 : 0.55}`}
                      dur="2.2s"
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
                  {activeOrgan.label}
                </text>
                <text y="10" fill="#cbd5e1" fontSize="9" fontWeight="500">
                  {activeItem.severity.toUpperCase()} {sideLabel}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Tap an organ · {mapped.length} {variant === "benefit" ? "benefiting" : "affected"} area{mapped.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-2">
          {mapped.map((it, i) => {
            const organ = ORGANS[it.key];
            const color = palette[it.severity] ?? palette.medium;
            const isActive = active === i;
            return (
              <li
                key={i}
                onClick={() => setActive(i)}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition-all ${
                  isActive
                    ? "border-primary bg-muted ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  <span className="font-semibold">{organ.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {it.severity}
                  </span>
                </div>
                {it.trigger && (
                  <div className="mt-1.5">
                    <span
                      className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color, borderColor: color, background: `${color}14` }}
                    >
                      {variant === "benefit" ? "From " : "Caused by "}{it.trigger}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-muted-foreground">{it.reason}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
