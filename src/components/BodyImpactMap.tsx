import { useState, useMemo } from "react";

export type BodyImpactItem = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
  trigger?: string;
};

type Variant = "damage" | "benefit";

const HumanoidShape = () => (
  <path d="M200,42 C209,42 216,35 216,26 C216,17 209,10 200,10 C191,10 184,17 184,26 C184,35 191,42 200,42 Z M188,48 C166,51 154,62 142,80 C134,92 122,118 116,155 C112,175 116,180 122,180 C128,180 131,170 134,155 C140,128 152,100 164,88 L164,175 C164,215 158,255 154,295 L132,380 C128,396 136,405 145,405 C154,405 162,392 168,365 L186,280 L190,280 L190,440 C190,448 196,450 200,450 C204,450 210,448 210,440 L210,280 L214,280 L232,365 C238,392 246,405 255,405 C264,405 272,396 268,380 L246,295 C242,255 236,215 236,175 L236,88 C248,100 260,128 266,155 C269,170 272,180 278,180 C284,180 288,175 284,155 C278,118 266,92 258,80 C246,62 234,51 212,48 Z" />
);

const ORGAN_POS: Record<string, { x: number; y: number; r: number; label: string }> = {
  brain:      { x: 200, y: 26,  r: 14, label: "BRAIN" },
  eyes:       { x: 200, y: 24,  r: 10, label: "EYES" },
  mouth:      { x: 200, y: 38,  r: 9,  label: "MOUTH" },
  teeth:      { x: 200, y: 38,  r: 9,  label: "TEETH" },
  throat:     { x: 200, y: 58,  r: 9,  label: "THROAT" },
  thyroid:    { x: 200, y: 68,  r: 9,  label: "THYROID" },
  lungs:      { x: 200, y: 105, r: 22, label: "LUNGS" },
  heart:      { x: 200, y: 115, r: 16, label: "HEART" },
  liver:      { x: 184, y: 158, r: 16, label: "LIVER" },
  stomach:    { x: 212, y: 165, r: 18, label: "STOMACH" },
  pancreas:   { x: 200, y: 185, r: 12, label: "PANCREAS" },
  spleen:     { x: 224, y: 172, r: 11, label: "SPLEEN" },
  kidneys:    { x: 200, y: 205, r: 16, label: "KIDNEYS" },
  intestines: { x: 200, y: 230, r: 22, label: "INTESTINES" },
  colon:      { x: 200, y: 240, r: 20, label: "COLON" },
  bladder:    { x: 200, y: 265, r: 11, label: "BLADDER" },
  skin:       { x: 200, y: 200, r: 26, label: "SKIN" },
  bones:      { x: 200, y: 200, r: 26, label: "BONES" },
  muscles:    { x: 200, y: 200, r: 26, label: "MUSCLES" },
  joints:     { x: 200, y: 340, r: 12, label: "JOINTS" },
  nerves:     { x: 200, y: 200, r: 24, label: "NERVES" },
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
  variant: Variant;
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
    <div className={`border ${containerBorder} rounded-xl p-4 shadow-2xl flex flex-col justify-between overflow-hidden`}>
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

          <div className="w-full max-w-[320px] aspect-[4/5] flex justify-center items-center">
            <svg
              viewBox="0 0 400 400"
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full ${isHarm ? "drop-shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]"}`}
            >
              {!isHarm && (
                <g fill="none" stroke="#10b981" strokeWidth={1} opacity={0.35}>
                  <line x1={200} y1={70} x2={200} y2={235} strokeWidth={1.5} />
                  <path d="M200,95 Q182,102 172,115" />
                  <path d="M200,95 Q218,102 228,115" />
                  <path d="M200,115 Q178,125 166,142" />
                  <path d="M200,115 Q222,125 234,142" />
                  <path d="M200,135 Q178,148 165,175" />
                  <path d="M200,135 Q222,148 235,175" />
                  <path d="M200,155 Q178,170 166,205" />
                  <path d="M200,155 Q222,170 234,205" />
                  <line x1={192} y1={210} x2={184} y2={335} />
                  <line x1={208} y1={210} x2={216} y2={335} />
                </g>
              )}

              <g fill="none" stroke={outlineStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.6}>
                <HumanoidShape />
              </g>

              {!isHarm && (
                <circle
                  cx={200}
                  cy={52}
                  r={22}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={0.75}
                  strokeDasharray="3,3"
                  className="animate-spin"
                  style={{ animationDuration: "20s" }}
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
                      className="animate-pulse"
                    />
                    <circle cx={pos.x} cy={pos.y} r={3.5} fill={accent} />
                    <text
                      x={pos.x}
                      y={pos.y + pos.r + 10}
                      textAnchor="middle"
                      fill={accent}
                      className="font-mono text-[8px] font-bold tracking-wider"
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

      <div className="text-[9px] font-mono text-slate-500 mt-3 text-center uppercase tracking-widest">
        {mapped.length ? footer : isHarm ? "No specific organ harm detected" : "No specific organ benefit detected"}
      </div>

      {active && (
        <div
          className={`mt-4 border ${isHarm ? "border-red-900/50" : "border-emerald-900/50"} bg-[#090f1c]/95 backdrop-blur-md rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3`}
        >
          <div className={`flex justify-between items-start border-b ${isHarm ? "border-red-950" : "border-emerald-950"} pb-2 mb-3`}>
            <div>
              <span
                className={`text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border ${
                  isHarm
                    ? "text-red-500 bg-red-950/80 border-red-900/40"
                    : "text-emerald-400 bg-emerald-950/80 border-emerald-900/40"
                }`}
              >
                {isHarm ? "CRITICAL IMPACT VECTOR REPORT" : "POSITIVE BENEFIT VECTOR REPORT"}
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {ORGAN_POS[normalize(active.part)]?.label ?? active.part}
              </h3>
            </div>
            <button
              onClick={() => setActive(null)}
              className="text-slate-500 hover:text-white text-xs font-mono"
            >
              ✕ CLOSE
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Severity</div>
              <div className="font-semibold capitalize" style={{ color: accent }}>{active.severity}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {isHarm ? "Damage mechanism" : "Benefit mechanism"}
              </div>
              <div className="text-slate-200">{active.reason}</div>
            </div>
            {active.trigger && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Trigger</div>
                <div className="text-slate-300">{active.trigger}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
