import { useState } from "react";

export type BodyDamage = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
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

const OUTLINE_GRADIENT: Record<BodyMapVariant, { id: string; stops: [string, string, string] }> = {
  damage: { id: "neonStrokeDamage", stops: ["#67e8f9", "#38bdf8", "#22d3ee"] },
  benefit: { id: "neonStrokeBenefit", stops: ["#bbf7d0", "#4ade80", "#10b981"] },
};

const GLOW_SHADOW: Record<BodyMapVariant, string> = {
  damage: "drop-shadow(0 0 18px rgba(56,189,250,0.35))",
  benefit: "drop-shadow(0 0 18px rgba(34,197,94,0.35))",
};

// Viewbox 240x540. Anatomical organ centers on a more humanoid silhouette.
const PART_POS: Record<
  string,
  { x: number; y: number; label: string; callout: { x: number; y: number } }
> = {
  brain:      { x: 120, y: 38,  label: "Brain",      callout: { x: 215, y: 28 } },
  eyes:       { x: 120, y: 60,  label: "Eyes",       callout: { x: 25,  y: 58 } },
  teeth:      { x: 120, y: 82,  label: "Teeth",      callout: { x: 215, y: 80 } },
  throat:     { x: 120, y: 104, label: "Throat",     callout: { x: 25,  y: 105 } },
  heart:      { x: 108, y: 162, label: "Heart",      callout: { x: 25,  y: 150 } },
  lungs:      { x: 120, y: 158, label: "Lungs",      callout: { x: 215, y: 145 } },
  liver:      { x: 138, y: 198, label: "Liver",      callout: { x: 215, y: 195 } },
  stomach:    { x: 110, y: 215, label: "Stomach",    callout: { x: 25,  y: 205 } },
  pancreas:   { x: 120, y: 232, label: "Pancreas",   callout: { x: 215, y: 230 } },
  kidneys:    { x: 120, y: 246, label: "Kidneys",    callout: { x: 25,  y: 250 } },
  intestines: { x: 120, y: 282, label: "Intestines", callout: { x: 215, y: 285 } },
  skin:       { x: 120, y: 390, label: "Skin",       callout: { x: 25,  y: 390 } },
  bones:      { x: 120, y: 460, label: "Bones",      callout: { x: 215, y: 460 } },
};

function normalizePart(p: string): string {
  const k = p.toLowerCase().trim();
  if (k.includes("brain") || k.includes("neuro") || k.includes("cogniti") || k.includes("memory")) return "brain";
  if (k.includes("eye") || k.includes("vision") || k.includes("sight")) return "eyes";
  if (k.includes("teeth") || k.includes("dental") || k.includes("tooth") || k.includes("enamel")) return "teeth";
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
    .filter((it) => PART_POS[it.key]);
  const [active, setActive] = useState<number | null>(mapped.length ? 0 : null);

  const palette = SEVERITY_COLOR[variant];
  const gradient = OUTLINE_GRADIENT[variant];
  const activeItem = active !== null ? mapped[active] : null;
  const activePos = activeItem ? PART_POS[activeItem.key] : null;
  const sideLabel = variant === "benefit" ? "BENEFIT" : "RISK";

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <div className="relative mx-auto w-full max-w-[340px]">
        <svg
          viewBox="0 0 240 540"
          className="h-auto w-full"
          style={{ filter: GLOW_SHADOW[variant] }}
        >
          <defs>
            <linearGradient id={gradient.id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={gradient.stops[0]} />
              <stop offset="50%" stopColor={gradient.stops[1]} />
              <stop offset="100%" stopColor={gradient.stops[2]} />
            </linearGradient>
            <filter id={`neonGlow-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Neon humanoid silhouette */}
          <g
            fill="none"
            stroke={`url(#${gradient.id})`}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#neonGlow-${variant})`}
          >
            {/* Head */}
            <ellipse cx="120" cy="42" rx="26" ry="32" />
            {/* Jawline detail */}
            <path d="M104 64 Q120 76 136 64" />
            {/* Neck */}
            <path d="M110 73 L110 92 Q120 96 130 92 L130 73" />
            {/* Collar / clavicle */}
            <path d="M82 100 Q120 92 158 100" />
            {/* Torso with shoulders, waist, hips */}
            <path d="M82 100 Q72 108 70 124 L74 168 Q76 210 80 248 Q82 280 88 310 L152 310 Q158 280 160 248 Q164 210 166 168 L170 124 Q168 108 158 100" />
            {/* Pelvis line */}
            <path d="M86 290 Q120 296 154 290" opacity="0.6" />
            {/* Left arm */}
            <path d="M72 110 Q52 132 46 168 Q42 208 46 248 Q50 268 56 274 Q64 274 64 264 Q64 224 68 196 Q72 158 78 134" />
            {/* Left hand */}
            <ellipse cx="55" cy="282" rx="8" ry="11" />
            {/* Right arm */}
            <path d="M168 110 Q188 132 194 168 Q198 208 194 248 Q190 268 184 274 Q176 274 176 264 Q176 224 172 196 Q168 158 162 134" />
            {/* Right hand */}
            <ellipse cx="185" cy="282" rx="8" ry="11" />
            {/* Left leg */}
            <path d="M90 310 Q86 360 92 420 Q94 462 100 500 L116 500 Q118 462 118 420 Q118 360 116 310" />
            {/* Left foot */}
            <path d="M96 500 Q92 512 100 516 L122 516 Q124 510 118 500" />
            {/* Right leg */}
            <path d="M124 310 Q124 360 124 420 Q124 462 124 500 L140 500 Q146 462 150 420 Q154 360 150 310" />
            {/* Right foot */}
            <path d="M122 500 Q118 510 120 516 L142 516 Q148 512 144 500" />
            {/* Centerline (subtle, for symmetry) */}
            <line x1="120" y1="100" x2="120" y2="300" opacity="0.18" strokeDasharray="2 4" />
          </g>

          {/* Markers */}
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
            const color = palette[it.severity] ?? palette.medium;
            const isActive = active === i;
            return (
              <g
                key={i}
                onClick={() => setActive(i)}
                className="cursor-pointer"
              >
                <circle cx={pos.x} cy={pos.y} r="11" fill={color} opacity="0.18">
                  <animate attributeName="r" values="11;16;11" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isActive ? 7 : 5.5}
                  fill={color}
                  stroke="#fff"
                  strokeOpacity={isActive ? 0.95 : 0.55}
                  strokeWidth="1.5"
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
              </g>
            );
          })}

          {/* Active callout arrow + label */}
          {activeItem && activePos && (
            <g>
              <line
                x1={activePos.callout.x}
                y1={activePos.callout.y}
                x2={activePos.x}
                y2={activePos.y}
                stroke={palette[activeItem.severity]}
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              <circle
                cx={activePos.callout.x}
                cy={activePos.callout.y}
                r="3"
                fill={palette[activeItem.severity]}
              />
              <g
                transform={`translate(${activePos.callout.x < 120 ? activePos.callout.x - 4 : activePos.callout.x + 4}, ${activePos.callout.y})`}
                textAnchor={activePos.callout.x < 120 ? "end" : "start"}
              >
                <text
                  y="-3"
                  fill={palette[activeItem.severity]}
                  fontSize="11"
                  fontWeight="700"
                  style={{ filter: `drop-shadow(0 0 4px ${palette[activeItem.severity]})` }}
                >
                  {PART_POS[activeItem.key].label}
                </text>
                <text y="9" fill="#cbd5e1" fontSize="8" fontWeight="500">
                  {activeItem.severity.toUpperCase()} {sideLabel}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Tap a marker · {mapped.length} {variant === "benefit" ? "benefiting" : "affected"} area{mapped.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-2">
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
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
                  <span className="font-semibold">{pos.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {it.severity}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{it.reason}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
