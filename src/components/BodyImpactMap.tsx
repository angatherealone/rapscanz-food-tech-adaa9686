import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type BodyImpactItem = {
  part: string;
  severity: "low" | "medium" | "high";
  reason: string;
  trigger?: string;
};

type Variant = "damage" | "benefit";

const AthleticBodySilhouette = ({ stroke }: { stroke: string }) => (
  <path
    d="M200,68 C210,68 218,60 218,50 C218,40 210,32 200,32 C190,32 182,40 182,50 C182,60 190,68 200,68 Z M192,74 C180,76 172,83 164,94 C158,102 150,118 145,142 C142,156 145,160 149,160 C153,160 155,153 157,142 C161,124 168,106 176,98 L176,155 C176,182 172,210 169,238 L154,324 C151,338 156,346 162,346 C168,346 173,338 177,320 L191,245 L193,245 L193,365 C193,372 198,374 200,374 C202,374 207,372 207,365 L207,245 L209,245 L223,320 C227,338 232,346 238,346 C244,346 249,338 246,324 L231,238 C228,210 224,182 224,155 L224,98 C232,106 239,124 243,142 C245,153 247,160 251,160 C255,160 258,156 255,142 C250,118 242,102 236,94 C228,83 220,76 208,74 Z"
    fill="none"
    stroke={stroke}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity={0.9}
  />
);

/** Anatomical positions inside the 400×400 silhouette viewBox. */
const ORGAN_POS: Record<string, { x: number; y: number; r: number; label: string }> = {
  brain:        { x: 200, y: 50,  r: 14, label: "BRAIN" },
  eyes:         { x: 200, y: 48,  r: 10, label: "EYES" },
  mouth:        { x: 200, y: 62,  r: 9,  label: "MOUTH" },
  teeth:        { x: 200, y: 62,  r: 9,  label: "TEETH" },
  throat:       { x: 200, y: 78,  r: 9,  label: "THROAT" },
  thyroid:      { x: 200, y: 84,  r: 9,  label: "THYROID" },
  lungs:        { x: 200, y: 105, r: 18, label: "LUNGS" },
  heart:        { x: 200, y: 115, r: 16, label: "HEART" },
  liver:        { x: 187, y: 145, r: 16, label: "LIVER" },
  stomach:      { x: 210, y: 152, r: 16, label: "STOMACH" },
  pancreas:     { x: 200, y: 168, r: 12, label: "PANCREAS" },
  spleen:       { x: 222, y: 158, r: 11, label: "SPLEEN" },
  kidneys:      { x: 200, y: 188, r: 16, label: "KIDNEYS" },
  intestines:   { x: 200, y: 215, r: 20, label: "INTESTINES" },
  colon:        { x: 200, y: 225, r: 18, label: "COLON" },
  bladder:      { x: 200, y: 248, r: 11, label: "BLADDER" },
  skin:         { x: 200, y: 200, r: 24, label: "SKIN" },
  bones:        { x: 200, y: 200, r: 24, label: "BONES" },
  muscles:      { x: 200, y: 200, r: 24, label: "MUSCLES" },
  joints:       { x: 200, y: 300, r: 12, label: "JOINTS" },
  nerves:       { x: 200, y: 200, r: 22, label: "NERVES" },
};

const normalize = (p: string) => {
  const k = p.toLowerCase().trim();
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
  const [selected, setSelected] = useState<BodyImpactItem | null>(null);

  const isHarm = variant === "damage";
  const accent = isHarm ? "#ef4444" : "#10b981";
  const accentSoft = isHarm ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.18)";
  const accentSoftActive = isHarm ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)";
  const silhouetteStroke = isHarm ? "#2563eb" : "#10b981";

  const mapped = useMemo(() => {
    const seen = new Set<string>();
    return items
      .map((it) => ({ ...it, key: normalize(it.part) }))
      .filter((it) => {
        if (seen.has(it.key)) return false;
        seen.add(it.key);
        return ORGAN_POS[it.key];
      });
  }, [items]);

  const activeCount = mapped.length;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-full justify-between font-mono text-[10px] tracking-wide text-slate-500">
        <span>BIO-DIAGNOSTIC GRID // {isHarm ? "THREAT MAP" : "BENEFIT MAP"}</span>
        <span className={isHarm ? "font-bold text-red-500" : "font-bold text-emerald-400"}>
          {String(activeCount).padStart(2, "0")} / {String(totalSlots).padStart(2, "0")} ACTIVE
        </span>
      </div>

      <div className="relative flex aspect-[4/5] max-h-[380px] w-full items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
          className={`h-full w-full ${isHarm ? "drop-shadow-[0_0_12px_rgba(59,130,246,0.18)]" : "drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]"}`}
        >
          {!isHarm && (
            <g fill="none" stroke="#10b981" strokeWidth={1} opacity={0.4}>
              <line x1={200} y1={72} x2={200} y2={300} strokeWidth={1.4} />
              <path d="M200,100 Q175,112 160,135" />
              <path d="M200,100 Q225,112 240,135" />
              <path d="M200,140 Q170,155 152,190" />
              <path d="M200,140 Q230,155 248,190" />
              <path d="M200,185 Q180,210 170,260" />
              <path d="M200,185 Q220,210 230,260" />
            </g>
          )}

          <AthleticBodySilhouette stroke={silhouetteStroke} />

          {mapped.map((it) => {
            const pos = ORGAN_POS[it.key];
            const active = selected?.key === it.key;
            return (
              <g
                key={it.key}
                className="cursor-pointer"
                onClick={() => setSelected(it)}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.r}
                  fill={active ? accentSoftActive : accentSoft}
                  stroke={accent}
                  strokeWidth={active ? 2 : 1}
                  className="animate-pulse transition-all"
                />
                <circle cx={pos.x} cy={pos.y} r={4} fill={accent} />
                <text
                  x={pos.x}
                  y={pos.y + pos.r + 10}
                  textAnchor="middle"
                  fill={accent}
                  className="font-mono text-[8px] font-bold tracking-widest"
                >
                  {pos.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-slate-500">
        {mapped.length
          ? "Tap any glowing organ to open the diagnostic scope"
          : isHarm
            ? "No specific organ harm detected"
            : "No specific organ benefit detected"}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md border-slate-800 bg-[#070c16] text-slate-200">
          {selected && (
            <>
              <DialogTitle className="font-display text-lg" style={{ color: accent }}>
                {ORGAN_POS[selected.key]?.label ?? selected.part}
              </DialogTitle>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Severity</div>
                  <div className="font-semibold capitalize" style={{ color: accent }}>{selected.severity}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {isHarm ? "Damage mechanism" : "Benefit mechanism"}
                  </div>
                  <div>{selected.reason}</div>
                </div>
                {selected.trigger && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Trigger</div>
                    <div>{selected.trigger}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
