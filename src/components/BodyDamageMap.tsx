import { useState } from "react";

export type BodyDamage = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "#fbbf24",
  medium: "#fb923c",
  high: "#ef4444",
};

// Viewbox 240x520. Anatomical-ish organ centers on a front-facing silhouette.
const PART_POS: Record<
  string,
  { x: number; y: number; label: string; callout: { x: number; y: number } }
> = {
  brain:      { x: 120, y: 36,  label: "Brain",      callout: { x: 215, y: 28 } },
  eyes:       { x: 120, y: 58,  label: "Eyes",       callout: { x: 25,  y: 58 } },
  teeth:      { x: 120, y: 82,  label: "Teeth",      callout: { x: 215, y: 80 } },
  throat:     { x: 120, y: 102, label: "Throat",     callout: { x: 25,  y: 105 } },
  heart:      { x: 108, y: 160, label: "Heart",      callout: { x: 25,  y: 150 } },
  lungs:      { x: 120, y: 155, label: "Lungs",      callout: { x: 215, y: 145 } },
  liver:      { x: 138, y: 195, label: "Liver",      callout: { x: 215, y: 195 } },
  stomach:    { x: 110, y: 210, label: "Stomach",    callout: { x: 25,  y: 200 } },
  pancreas:   { x: 120, y: 228, label: "Pancreas",   callout: { x: 215, y: 230 } },
  kidneys:    { x: 120, y: 240, label: "Kidneys",    callout: { x: 25,  y: 245 } },
  intestines: { x: 120, y: 275, label: "Intestines", callout: { x: 215, y: 280 } },
  skin:       { x: 120, y: 380, label: "Skin",       callout: { x: 25,  y: 380 } },
  bones:      { x: 120, y: 440, label: "Bones",      callout: { x: 215, y: 440 } },
};

function normalizePart(p: string): string {
  const k = p.toLowerCase().trim();
  if (k.includes("brain") || k.includes("neuro")) return "brain";
  if (k.includes("eye") || k.includes("vision")) return "eyes";
  if (k.includes("teeth") || k.includes("dental") || k.includes("tooth")) return "teeth";
  if (k.includes("throat") || k.includes("esoph")) return "throat";
  if (k.includes("heart") || k.includes("cardio")) return "heart";
  if (k.includes("lung") || k.includes("respir")) return "lungs";
  if (k.includes("liver") || k.includes("hepat")) return "liver";
  if (k.includes("stomach") || k.includes("gastr")) return "stomach";
  if (k.includes("pancre") || k.includes("insulin") || k.includes("diabet")) return "pancreas";
  if (k.includes("kidney") || k.includes("renal")) return "kidneys";
  if (k.includes("intest") || k.includes("gut") || k.includes("bowel") || k.includes("colon")) return "intestines";
  if (k.includes("skin") || k.includes("derm")) return "skin";
  if (k.includes("bone") || k.includes("joint") || k.includes("calcium")) return "bones";
  return k;
}

export function BodyDamageMap({ items }: { items: BodyDamage[] }) {
  const mapped = items
    .map((it) => ({ ...it, key: normalizePart(it.part) }))
    .filter((it) => PART_POS[it.key]);
  const [active, setActive] = useState<number | null>(mapped.length ? 0 : null);

  const activeItem = active !== null ? mapped[active] : null;
  const activePos = activeItem ? PART_POS[activeItem.key] : null;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <div className="relative mx-auto w-full max-w-[340px]">
        <svg
          viewBox="0 0 240 520"
          className="h-auto w-full"
          style={{ filter: "drop-shadow(0 0 18px rgba(56,189,250,0.35))" }}
        >
          <defs>
            <linearGradient id="neonStroke" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Neon outline anatomical silhouette */}
          <g
            fill="none"
            stroke="url(#neonStroke)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          >
            {/* Head */}
            <ellipse cx="120" cy="40" rx="28" ry="34" />
            {/* Neck */}
            <path d="M108 72 Q120 78 132 72 L134 92 Q120 96 106 92 Z" />
            {/* Torso */}
            <path d="M78 96 Q120 86 162 96 L172 150 Q174 200 168 250 Q164 285 156 305 L84 305 Q76 285 72 250 Q66 200 68 150 Z" />
            {/* Left arm */}
            <path d="M78 100 Q56 120 48 160 Q42 200 44 240 Q46 260 52 268 Q60 268 62 258 Q64 220 68 190 Q72 150 80 130 Z" />
            {/* Right arm */}
            <path d="M162 100 Q184 120 192 160 Q198 200 196 240 Q194 260 188 268 Q180 268 178 258 Q176 220 172 190 Q168 150 160 130 Z" />
            {/* Left leg */}
            <path d="M88 305 Q86 360 92 420 Q94 460 100 500 L114 500 Q116 460 116 420 Q116 360 114 305 Z" />
            {/* Right leg */}
            <path d="M126 305 Q124 360 124 420 Q124 460 126 500 L140 500 Q146 460 148 420 Q154 360 152 305 Z" />
          </g>

          {/* Damage markers */}
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
            const color = SEVERITY_COLOR[it.severity] ?? SEVERITY_COLOR.medium;
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
                stroke={SEVERITY_COLOR[activeItem.severity]}
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              <circle
                cx={activePos.callout.x}
                cy={activePos.callout.y}
                r="3"
                fill={SEVERITY_COLOR[activeItem.severity]}
              />
              <g
                transform={`translate(${activePos.callout.x < 120 ? activePos.callout.x - 4 : activePos.callout.x + 4}, ${activePos.callout.y})`}
                textAnchor={activePos.callout.x < 120 ? "end" : "start"}
              >
                <text
                  y="-3"
                  fill={SEVERITY_COLOR[activeItem.severity]}
                  fontSize="11"
                  fontWeight="700"
                  style={{ filter: `drop-shadow(0 0 4px ${SEVERITY_COLOR[activeItem.severity]})` }}
                >
                  {PART_POS[activeItem.key].label}
                </text>
                <text y="9" fill="#cbd5e1" fontSize="8" fontWeight="500">
                  {activeItem.severity.toUpperCase()} RISK
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Tap a marker · {mapped.length} affected area{mapped.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-2">
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
            const color = SEVERITY_COLOR[it.severity] ?? SEVERITY_COLOR.medium;
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
