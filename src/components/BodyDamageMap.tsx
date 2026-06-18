import { useState } from "react";

export type BodyDamage = {
  part: string; // brain, eyes, teeth, throat, heart, lungs, liver, stomach, pancreas, kidneys, intestines, skin, bones
  severity: "low" | "medium" | "high";
  reason: string;
};

const SEVERITY_FILL: Record<string, string> = {
  low: "#fbbf24",     // amber
  medium: "#fb923c",  // orange
  high: "#ef4444",    // red
};

// Approximate organ centers on a ~200x420 viewbox front-facing silhouette
const PART_POS: Record<string, { x: number; y: number; r: number; label: string }> = {
  brain:      { x: 100, y: 40,  r: 22, label: "Brain" },
  eyes:       { x: 100, y: 55,  r: 14, label: "Eyes" },
  teeth:      { x: 100, y: 78,  r: 12, label: "Teeth" },
  throat:     { x: 100, y: 95,  r: 10, label: "Throat" },
  heart:      { x: 88,  y: 145, r: 16, label: "Heart" },
  lungs:      { x: 100, y: 140, r: 26, label: "Lungs" },
  liver:      { x: 115, y: 180, r: 16, label: "Liver" },
  stomach:    { x: 92,  y: 195, r: 16, label: "Stomach" },
  pancreas:   { x: 100, y: 210, r: 10, label: "Pancreas" },
  kidneys:    { x: 100, y: 220, r: 14, label: "Kidneys" },
  intestines: { x: 100, y: 245, r: 20, label: "Intestines" },
  skin:       { x: 100, y: 320, r: 0,  label: "Skin (whole body)" },
  bones:      { x: 100, y: 360, r: 14, label: "Bones" },
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
  const [active, setActive] = useState<number | null>(null);
  const mapped = items
    .map((it) => ({ ...it, key: normalizePart(it.part) }))
    .filter((it) => PART_POS[it.key]);

  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="relative mx-auto w-full max-w-[220px]">
        <svg viewBox="0 0 200 420" className="h-auto w-full drop-shadow-[0_8px_24px_rgba(56,189,248,0.18)]">
          <defs>
            <radialGradient id="bodyFill" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0b1220" />
            </radialGradient>
            <linearGradient id="bodyEdge" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Stylised humanoid silhouette */}
          <g fill="url(#bodyFill)" stroke="url(#bodyEdge)" strokeWidth="1.5">
            <circle cx="100" cy="40" r="26" />
            <path d="M70 75 Q100 70 130 75 L142 110 L150 170 L140 250 L130 260 L130 320 L120 410 L108 410 L100 330 L92 410 L80 410 L70 320 L70 260 L60 250 L50 170 L58 110 Z" />
            {/* arms */}
            <path d="M55 115 L35 170 L25 240 L32 245 L48 180 L60 130 Z" />
            <path d="M145 115 L165 170 L175 240 L168 245 L152 180 L140 130 Z" />
          </g>

          {/* Damage markers */}
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
            const fill = SEVERITY_FILL[it.severity] ?? SEVERITY_FILL.medium;
            const isActive = active === i;
            if (it.key === "skin") {
              return (
                <rect
                  key={i}
                  x="40" y="70" width="120" height="345" rx="60"
                  fill={fill}
                  opacity={isActive ? 0.35 : 0.18}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  className="cursor-pointer transition-opacity"
                />
              );
            }
            return (
              <g
                key={i}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(isActive ? null : i)}
                className="cursor-pointer"
              >
                <circle cx={pos.x} cy={pos.y} r={pos.r + 6} fill={fill} opacity="0.25">
                  <animate attributeName="r" values={`${pos.r + 6};${pos.r + 12};${pos.r + 6}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={pos.x} cy={pos.y} r={pos.r}
                  fill={fill}
                  opacity={isActive ? 0.95 : 0.75}
                  stroke="#fff"
                  strokeOpacity={isActive ? 0.9 : 0.4}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Hover or tap a marker · {mapped.length} affected area{mapped.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-2">
          {mapped.map((it, i) => {
            const pos = PART_POS[it.key];
            const fill = SEVERITY_FILL[it.severity] ?? SEVERITY_FILL.medium;
            return (
              <li
                key={i}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={`rounded-lg border p-3 text-sm transition-colors ${active === i ? "border-primary bg-muted" : "border-border bg-card"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: fill }} />
                  <span className="font-semibold">{pos.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{it.severity}</span>
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
