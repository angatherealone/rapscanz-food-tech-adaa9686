import { useState, useMemo } from "react";
export type BodyImpactItem = { part: string; severity: "low" | "medium" | "high"; reason: string; trigger?: string };
export type BodyDamage = BodyImpactItem;
export type BodyMapVariant = "damage" | "benefit";

const HumanoidShape = () => (
  <g strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
    <circle cx="200" cy="40" r="26" fill="currentColor" fillOpacity="0.12" strokeWidth="3" />
    <path d="M188,64 L188,80 L212,80 L212,64 Z" fill="currentColor" fillOpacity="0.12" strokeWidth="2.5" />
    <path
      d="M150,86 C150,86 175,78 200,78 C225,78 250,86 250,86 L242,180 C242,180 235,210 230,235 L228,260 C228,260 215,268 200,268 C185,268 172,260 172,260 L170,235 C165,210 158,180 158,180 Z"
      fill="currentColor"
      fillOpacity="0.15"
      strokeWidth="3"
    />
    <path
      d="M172,260 L168,300 C168,300 184,310 200,310 C216,310 232,300 232,300 L228,260 Z"
      fill="currentColor"
      fillOpacity="0.15"
      strokeWidth="3"
    />
    <path d="M150,90 C140,120 132,160 128,210" fill="none" strokeWidth="10" strokeOpacity="0.85" />
    <path d="M250,90 C260,120 268,160 272,210" fill="none" strokeWidth="10" strokeOpacity="0.85" />
    <path d="M128,210 C126,240 128,265 132,290" fill="none" strokeWidth="8" strokeOpacity="0.8" />
    <path d="M272,210 C274,240 272,265 268,290" fill="none" strokeWidth="8" strokeOpacity="0.8" />
    <path d="M180,308 C176,340 174,370 176,410" fill="none" strokeWidth="14" strokeOpacity="0.85" />
    <path d="M220,308 C224,340 226,370 224,410" fill="none" strokeWidth="14" strokeOpacity="0.85" />
    <path d="M176,410 C174,440 176,470 180,500" fill="none" strokeWidth="12" strokeOpacity="0.8" />
    <path d="M224,410 C226,440 224,470 220,500" fill="none" strokeWidth="12" strokeOpacity="0.8" />
  </g>
);

const ORGAN_POS: Record<string, { x: number; y: number; r: number; label: string }> = {
  brain: { x: 200, y: 26, r: 14, label: "BRAIN" },
  eyes: { x: 200, y: 24, r: 10, label: "EYES" },
  mouth: { x: 200, y: 38, r: 9, label: "MOUTH" },
  teeth: { x: 200, y: 38, r: 9, label: "TEETH" },
  throat: { x: 200, y: 58, r: 9, label: "THROAT" },
  thyroid: { x: 200, y: 68, r: 9, label: "THYROID" },
  lungs: { x: 200, y: 105, r: 22, label: "LUNGS" },
  heart: { x: 200, y: 115, r: 16, label: "HEART" },
  liver: { x: 184, y: 158, r: 16, label: "LIVER" },
  stomach: { x: 212, y: 165, r: 18, label: "STOMACH" },
  pancreas: { x: 200, y: 185, r: 12, label: "PANCREAS" },
  spleen: { x: 224, y: 172, r: 11, label: "SPLEEN" },
  kidneys: { x: 200, y: 205, r: 16, label: "KIDNEYS" },
  intestines: { x: 200, y: 230, r: 22, label: "INTESTINES" },
  colon: { x: 200, y: 240, r: 20, label: "COLON" },
  bladder: { x: 200, y: 265, r: 11, label: "BLADDER" },
  skin: { x: 200, y: 200, r: 26, label: "SKIN" },
  bones: { x: 200, y: 200, r: 26, label: "BONES" },
  muscles: { x: 200, y: 200, r: 26, label: "MUSCLES" },
  joints: { x: 200, y: 340, r: 12, label: "JOINTS" },
  nerves: { x: 200, y: 200, r: 24, label: "NERVES" },
};
const normalize = (p: string) => {
  const k = (p || "").toLowerCase().trim();
  if (k.includes("brain")) return "brain";
  if (k.includes("eye")) return "eyes";
  if (k.includes("tooth") || k.includes("teeth")) return "teeth";
  if (k.includes("mouth") || k.includes("oral")) return "mouth";
  if (k.includes("throat") || k.includes("larynx")) return "throat";
  if (k.includes("thyroid")) return "thyroid";
  if (k.includes("lung")) return "lungs";
  if (k.includes("heart") || k.includes("cardio") || k.includes("artery") || k.includes("blood")) return "heart";
  if (k.includes("liver") || k.includes("hepat")) return "liver";
  if (k.includes("stomach") || k.includes("gastric")) return "stomach";
  if (k.includes("pancreas")) return "pancreas";
  if (k.includes("spleen")) return "spleen";
  if (k.includes("kidney") || k.includes("renal")) return "kidneys";
  if (k.includes("intestine") || k.includes("bowel") || k.includes("gut")) return "intestines";
  if (k.includes("colon")) return "colon";
  if (k.includes("bladder")) return "bladder";
  if (k.includes("skin") || k.includes("derm")) return "skin";
  if (k.includes("bone") || k.includes("skelet")) return "bones";
  if (k.includes("muscle")) return "muscles";
  if (k.includes("joint")) return "joints";
  if (k.includes("nerve") || k.includes("neuro")) return "nerves";
  return k;
};
export function BodyImpactMap({
  items,
  variant,
  totalSlots = 13,
}: {
  items: BodyImpactItem[];
  variant: "damage" | "benefit";
  totalSlots?: number;
}) {
  const [active, setActive] = useState<BodyImpactItem | null>(null);
  const isHarm = variant === "damage";
  const accent = isHarm ? "#ef4444" : "#10b981";
  const accentSoft = isHarm ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.18)";
  const accentSoftActive = isHarm ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)";
  const outlineStroke = isHarm ? "#2563eb" : "#10b981";
  const headerLabel = isHarm ? "THREAT SCANNERS" : "CLINICAL MAP";
  const headerCount = isHarm ? "text-red-500" : "text-emerald-400";
  const containerBorder = isHarm ? "border-red-950/40 bg-[#0b1220]" : "border-emerald-950/40 bg-[#071612]";
  const innerBg = isHarm ? "bg-[#060a12]" : "bg-[#040b09]";
  const dotShadow = isHarm ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-emerald-400 shadow-[0_0_6px_#10b981]";
  const titleColor = isHarm ? "text-red-400" : "text-emerald-400";
  const title = isHarm ? "Harms — organs at risk" : "Benefits — organs that gain";
  const footer = isHarm ? "TAP ANY GLOWING ORGAN FOR ANALYSIS REPORT" : "BIO-LOGGING STABLE // SYSTEM ONLINE";
  const mapped = useMemo(() => {
    const seen = new Set<string>();
    return items
      .map((it) => ({ ...it, key: normalize(it.part) }))
      .filter((it) => {
        if (seen.has(it.key)) return false;
        seen.add(it.key);
        return !!ORGAN_POS[it.key];
      });
  }, [items]);
  return (
    <div
      className={`border ${containerBorder} rounded-xl p-4 shadow-2xl flex flex-col justify-between overflow-hidden`}
    >
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2 h-2 rounded-full ${dotShadow}`} />
          <h2 className={`${titleColor} text-xs font-bold uppercase tracking-wider`}>{title}</h2>
        </div>
        <div className={`border border-slate-800/40 ${innerBg} rounded-lg p-3 flex flex-col items-center`}>
          <div className="w-full flex justify-between text-[9px] font-mono text-slate-500 mb-2">
            <span>BIO-DIAGNOSTIC GRID // {headerLabel}</span>
            <span className={`${headerCount} font-bold`}>
              {String(mapped.length).padStart(2, "0")} / {String(totalSlots).padStart(2, "0")} ACTIVE
            </span>
          </div>
          <div className="w-full max-w-[380px] aspect-[4/5] flex justify-center items-center">
            <svg
              viewBox="0 0 400 460"
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full ${isHarm ? "drop-shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]"}`}
            >
              {!isHarm && (
                <g fill="none" stroke="#10b981" strokeWidth={1} opacity={0.4}>
                  <line x1={200} y1={45} x2={200} y2={280} strokeWidth={1.5} />
                  <path d="M200,75 Q176,84 162,100 M200,75 Q224,84 238,100 M200,105 Q170,116 154,136 M200,105 Q230,116 246,136 M200,135 Q168,150 152,185 M200,135 Q232,150 248,185 M200,170 Q168,190 154,235 M200,170 Q232,190 246,235" />
                  <line x1={188} y1={270} x2={174} y2={370} />
                  <line x1={212} y1={270} x2={226} y2={370} />
                </g>
              )}
              <g fill="none" stroke={outlineStroke} opacity={0.85}>
                <HumanoidShape />
              </g>
              {!isHarm && (
                <circle
                  cx={200}
                  cy={26}
                  r={22}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={0.75}
                  strokeDasharray="4,3"
                  className="animate-spin"
                  style={{ animationDuration: "18s" }}
                />
              )}
              {mapped.map((it) => {
                const pos = ORGAN_POS[it.key];
                const isActive = active && normalize(active.part) === it.key;
                return (
                  <g key={it.key} className="cursor-pointer" onClick={() => setActive(it)}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={pos.r}
                      fill={isActive ? accentSoftActive : accentSoft}
                      stroke={accent}
                      strokeWidth={isActive ? 2 : 1}
                      className={it.severity === "high" && isHarm ? "animate-pulse" : ""}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 3}
                      textAnchor="middle"
                      fill={accent}
                      className="text-[7px] font-mono font-bold tracking-widest"
                    >
                      {pos.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-3 text-center uppercase tracking-widest">{footer}</div>
    </div>
  );
}
