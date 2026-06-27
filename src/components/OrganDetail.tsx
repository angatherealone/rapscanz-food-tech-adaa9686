import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BodyDamage, BodyMapVariant } from "@/components/BodyDamageMap";

/**
 * Anatomically-styled organ illustrations (stylized SVG line art).
 * Each renderer draws inside a 200x200 viewBox; the parent handles scaling
 * and the zoom-in animation.
 *
 * `color` is the severity color used for the highlight/danger wash.
 */
type OrganRenderer = (color: string) => ReactNode;

export const ORGAN_ART: Record<string, OrganRenderer> = {
  heart: (c) => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Aorta arch */}
      <path
        d="M108 30 Q110 18 124 18 Q140 20 142 36 L142 56"
        stroke={c}
        strokeWidth="6"
        opacity="0.9"
      />
      {/* Pulmonary artery */}
      <path d="M96 28 Q92 40 96 56" stroke={c} strokeWidth="5" opacity="0.7" />
      {/* Superior vena cava */}
      <path d="M150 28 Q156 42 150 58" stroke={c} strokeWidth="5" opacity="0.7" />
      {/* Heart body — pear-shaped, apex bottom-left */}
      <path
        d="M86 58 Q72 70 76 110 Q82 148 116 168 Q138 178 152 168 Q172 152 168 110 Q166 72 152 58 Q132 50 118 56 Q102 52 86 58 Z"
        fill={`${c}26`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Coronary artery (LAD) */}
      <path
        d="M120 62 Q116 90 124 130 Q132 156 140 168"
        stroke={c}
        strokeWidth="1.4"
        opacity="0.9"
      />
      {/* Branch */}
      <path d="M122 88 Q108 96 96 110" stroke={c} strokeWidth="1.2" opacity="0.8" />
      {/* Right atrium subtle */}
      <path d="M150 58 Q160 80 156 102" stroke={c} strokeWidth="1.1" opacity="0.55" />
    </g>
  ),
  liver: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Right lobe (larger) + left lobe with falciform divider */}
      <path
        d="M22 70 Q20 56 38 50 Q90 38 150 46 Q178 50 182 70 Q186 100 168 122 Q140 142 96 142 Q56 142 36 124 Q20 108 22 70 Z"
        fill={`${c}22`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Falciform ligament */}
      <path d="M118 46 Q114 90 110 138" stroke={c} strokeWidth="1.6" opacity="0.85" />
      {/* Gallbladder */}
      <path
        d="M88 132 Q86 148 96 152 Q108 152 108 138"
        fill={`${c}33`}
        stroke={c}
        strokeWidth="1.4"
      />
      {/* Hepatic vessels */}
      <path d="M70 92 Q90 96 110 92 M130 96 Q150 100 168 96" stroke={c} strokeWidth="1" opacity="0.6" />
    </g>
  ),
  pancreas: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Head (right), body, tail (left of viewer = subject's left) */}
      <path
        d="M22 110 Q40 90 70 96 Q110 104 150 92 Q174 88 182 102 Q186 116 168 122 Q132 130 96 124 Q58 120 42 130 Q24 130 22 118 Z"
        fill={`${c}22`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Duct of Wirsung */}
      <path d="M30 116 Q90 116 178 110" stroke={c} strokeWidth="1.2" opacity="0.85" />
      {/* Duodenum hugging the head */}
      <path
        d="M22 96 Q12 110 16 132 Q26 150 44 146"
        stroke={c}
        strokeWidth="1.6"
        opacity="0.75"
      />
    </g>
  ),
  kidneys: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Left kidney */}
      <path
        d="M48 40 Q26 48 28 100 Q34 152 60 156 Q82 152 84 110 Q86 70 78 50 Q66 36 48 40 Z"
        fill={`${c}22`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Right kidney */}
      <path
        d="M152 40 Q174 48 172 100 Q166 152 140 156 Q118 152 116 110 Q114 70 122 50 Q134 36 152 40 Z"
        fill={`${c}22`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Hilum + ureters */}
      <path d="M64 96 Q80 100 84 110 L96 180" stroke={c} strokeWidth="1.6" />
      <path d="M136 96 Q120 100 116 110 L104 180" stroke={c} strokeWidth="1.6" />
      <path d="M58 80 Q62 96 70 110" stroke={c} strokeWidth="1" opacity="0.6" />
      <path d="M142 80 Q138 96 130 110" stroke={c} strokeWidth="1" opacity="0.6" />
    </g>
  ),
  lungs: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Trachea */}
      <path d="M100 14 L100 70" stroke={c} strokeWidth="3" />
      {/* Cartilage rings */}
      {[22, 32, 42, 52, 62].map((y) => (
        <path key={y} d={`M92 ${y} L108 ${y}`} stroke={c} strokeWidth="1" opacity="0.6" />
      ))}
      {/* Bronchi */}
      <path d="M100 68 Q80 80 72 100 M100 68 Q120 80 128 100" stroke={c} strokeWidth="2" />
      {/* Left lung (3 lobes shown subtly) */}
      <path
        d="M70 70 Q40 84 36 130 Q38 174 70 184 Q90 184 92 162 L92 78 Q86 68 70 70 Z"
        fill={`${c}1f`}
        stroke={c}
        strokeWidth="2.2"
      />
      {/* Right lung (2 lobes) */}
      <path
        d="M130 70 Q160 84 164 130 Q162 174 130 184 Q110 184 108 162 L108 78 Q114 68 130 70 Z"
        fill={`${c}1f`}
        stroke={c}
        strokeWidth="2.2"
      />
      {/* Fissure lines */}
      <path d="M52 110 Q72 116 88 132" stroke={c} strokeWidth="1" opacity="0.55" />
      <path d="M148 110 Q128 116 112 132" stroke={c} strokeWidth="1" opacity="0.55" />
      {/* Bronchioles */}
      <path d="M72 100 Q64 120 58 140 M80 110 Q78 130 76 150" stroke={c} strokeWidth="0.9" opacity="0.5" />
      <path d="M128 100 Q136 120 142 140 M120 110 Q122 130 124 150" stroke={c} strokeWidth="0.9" opacity="0.5" />
    </g>
  ),
  brain: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Cerebrum outline */}
      <path
        d="M40 90 Q30 50 80 30 Q140 18 170 50 Q186 80 178 116 Q172 144 150 158 Q120 168 90 160 Q52 148 42 122 Q38 108 40 90 Z"
        fill={`${c}1c`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Longitudinal fissure */}
      <path d="M104 26 Q102 90 108 162" stroke={c} strokeWidth="1.4" opacity="0.7" />
      {/* Gyri / sulci */}
      <path d="M58 80 Q72 70 90 76 Q102 84 96 96 Q88 106 70 100 Q56 92 58 80 Z" stroke={c} strokeWidth="1" opacity="0.7" />
      <path d="M118 76 Q138 68 156 78 Q164 92 150 102 Q132 106 120 96 Q114 86 118 76 Z" stroke={c} strokeWidth="1" opacity="0.7" />
      <path d="M62 116 Q80 112 92 124 Q90 138 74 138 Q58 132 62 116 Z" stroke={c} strokeWidth="1" opacity="0.7" />
      <path d="M120 120 Q138 114 156 124 Q156 140 138 142 Q122 136 120 120 Z" stroke={c} strokeWidth="1" opacity="0.7" />
      {/* Cerebellum */}
      <path d="M76 158 Q104 174 132 158 Q126 178 104 182 Q82 178 76 158 Z" stroke={c} strokeWidth="1.6" opacity="0.85" />
      {/* Brainstem */}
      <path d="M100 180 L100 196" stroke={c} strokeWidth="3" />
    </g>
  ),
  stomach: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* J-shaped stomach */}
      <path
        d="M62 36 Q88 30 100 50 Q108 80 130 84 Q160 90 168 122 Q170 156 138 168 Q98 174 76 152 Q60 130 64 100 Q66 80 60 60 Z"
        fill={`${c}22`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Esophagus */}
      <path d="M62 12 L62 36" stroke={c} strokeWidth="3" />
      {/* Pylorus → duodenum */}
      <path d="M160 138 Q180 140 184 160 Q180 180 162 180" stroke={c} strokeWidth="2.4" />
      {/* Rugae (folds) */}
      <path d="M86 70 Q98 88 92 110 M104 80 Q116 100 108 124 M124 96 Q138 116 130 140" stroke={c} strokeWidth="1" opacity="0.6" />
    </g>
  ),
  intestines: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Large intestine frame */}
      <path
        d="M40 60 L40 130 Q40 152 60 154 L140 154 Q160 152 160 130 L160 60"
        stroke={c}
        strokeWidth="6"
        opacity="0.85"
      />
      {/* Transverse colon */}
      <path d="M40 60 Q100 50 160 60" stroke={c} strokeWidth="6" opacity="0.85" />
      {/* Haustra ticks */}
      {[50, 70, 90, 110, 130].map((y) => (
        <path key={y} d={`M44 ${y} L48 ${y} M152 ${y} L156 ${y}`} stroke={c} strokeWidth="1" opacity="0.6" />
      ))}
      {/* Rectum */}
      <path d="M100 154 L100 188" stroke={c} strokeWidth="5" />
      {/* Small intestine coils */}
      <path
        d="M70 90 Q90 80 100 96 Q110 112 90 118 Q72 124 80 138 Q92 148 110 138 Q130 128 120 112 Q108 96 130 92"
        stroke={c}
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M76 104 Q96 110 100 124 Q102 138 88 142"
        stroke={c}
        strokeWidth="1.6"
        opacity="0.7"
      />
    </g>
  ),
  teeth: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Upper jaw arc */}
      <path d="M28 70 Q100 30 172 70" stroke={c} strokeWidth="2.4" />
      {/* Lower jaw arc */}
      <path d="M28 130 Q100 170 172 130" stroke={c} strokeWidth="2.4" />
      {/* Upper teeth */}
      {Array.from({ length: 12 }).map((_, i) => {
        const t = i / 11;
        const x = 28 + t * 144;
        const y = 70 + Math.sin(t * Math.PI) * -22;
        return (
          <rect
            key={`u${i}`}
            x={x - 6}
            y={y + 4}
            width="12"
            height="22"
            rx="3"
            fill={`${c}22`}
            stroke={c}
            strokeWidth="1.4"
          />
        );
      })}
      {/* Lower teeth */}
      {Array.from({ length: 12 }).map((_, i) => {
        const t = i / 11;
        const x = 28 + t * 144;
        const y = 130 + Math.sin(t * Math.PI) * 22;
        return (
          <rect
            key={`l${i}`}
            x={x - 6}
            y={y - 26}
            width="12"
            height="22"
            rx="3"
            fill={`${c}22`}
            stroke={c}
            strokeWidth="1.4"
          />
        );
      })}
    </g>
  ),
  throat: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Pharynx + larynx outline */}
      <path
        d="M70 20 Q60 60 70 110 Q60 150 80 190 L120 190 Q140 150 130 110 Q140 60 130 20 Z"
        fill={`${c}1c`}
        stroke={c}
        strokeWidth="2.4"
      />
      {/* Trachea rings */}
      {[120, 134, 148, 162, 176].map((y) => (
        <path key={y} d={`M82 ${y} Q100 ${y - 4} 118 ${y}`} stroke={c} strokeWidth="1.4" />
      ))}
      {/* Thyroid */}
      <path d="M72 100 Q100 116 128 100 Q124 124 100 126 Q76 124 72 100 Z" stroke={c} strokeWidth="1.4" opacity="0.8" />
      {/* Epiglottis */}
      <path d="M88 60 Q100 50 112 60" stroke={c} strokeWidth="1.6" />
    </g>
  ),
  eyes: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Eye almond */}
      <path d="M20 100 Q100 40 180 100 Q100 160 20 100 Z" fill={`${c}14`} stroke={c} strokeWidth="2.4" />
      {/* Iris */}
      <circle cx="100" cy="100" r="34" fill={`${c}26`} stroke={c} strokeWidth="2" />
      {/* Pupil */}
      <circle cx="100" cy="100" r="14" fill={c} />
      {/* Highlight */}
      <circle cx="92" cy="92" r="4" fill="#fff" opacity="0.9" />
      {/* Iris striations */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 100 + Math.cos(a) * 16;
        const y1 = 100 + Math.sin(a) * 16;
        const x2 = 100 + Math.cos(a) * 32;
        const y2 = 100 + Math.sin(a) * 32;
        return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={c} strokeWidth="0.8" opacity="0.7" />;
      })}
    </g>
  ),
  skin: (c) => (
    <g fill="none" strokeLinejoin="round">
      {/* Cross-section layers */}
      <rect x="20" y="30" width="160" height="22" fill={`${c}33`} stroke={c} strokeWidth="1.4" />
      <rect x="20" y="52" width="160" height="34" fill={`${c}22`} stroke={c} strokeWidth="1.4" />
      <rect x="20" y="86" width="160" height="60" fill={`${c}14`} stroke={c} strokeWidth="1.4" />
      {/* Hair follicle */}
      <path d="M70 22 L70 110 Q66 128 78 130" stroke={c} strokeWidth="1.6" />
      {/* Sweat gland */}
      <path d="M130 30 L130 120 Q132 134 142 132" stroke={c} strokeWidth="1.4" />
      <circle cx="142" cy="132" r="6" fill={`${c}33`} stroke={c} strokeWidth="1.2" />
      {/* Labels */}
      <text x="20" y="170" fill={c} fontSize="9" opacity="0.8">EPIDERMIS · DERMIS · HYPODERMIS</text>
    </g>
  ),
  bones: (c) => (
    <g fill="none" stroke={c} strokeLinecap="round" strokeLinejoin="round">
      {/* Professional skeletal-system icon: skull, ribs, spine, pelvis, paired long bones. */}
      <path d="M78 38 C78 18 90 10 104 10 C118 10 130 18 130 38 C130 58 120 72 104 72 C88 72 78 58 78 38 Z" fill={`${c}12`} strokeWidth="2.2" />
      <path d="M96 42 L96 42 M112 42 L112 42 M96 58 Q104 62 112 58" strokeWidth="2" />
      <path d="M104 73 L104 164" strokeWidth="2.4" />
      {[84, 96, 108, 120, 132].map((y, i) => (
        <path
          key={y}
          d={`M104 ${y} C ${86 - i} ${y - 4} ${74 + i} ${y + 8} ${70 + i} ${y + 22} M104 ${y} C ${122 + i} ${y - 4} ${134 - i} ${y + 8} ${138 - i} ${y + 22}`}
          strokeWidth="1.5"
          opacity="0.78"
        />
      ))}
      <path d="M80 160 C94 176 114 176 128 160 M86 174 C98 184 110 184 122 174" strokeWidth="2" />
      <path d="M92 178 L82 196 M116 178 L126 196" strokeWidth="2.2" />
      <path d="M70 84 L50 128 M138 84 L158 128" strokeWidth="1.8" opacity="0.78" />
    </g>
  ),
};

export const ORGAN_FALLBACK: OrganRenderer = (c) => (
  <g fill="none">
    <circle cx="100" cy="100" r="70" fill={`${c}22`} stroke={c} strokeWidth="2.4" />
    <text x="100" y="106" textAnchor="middle" fill={c} fontSize="14" fontWeight="700">
      ORGAN
    </text>
  </g>
);
const FALLBACK = ORGAN_FALLBACK;

export function OrganDetailDialog({
  open,
  onOpenChange,
  organKey,
  organLabel,
  item,
  variant,
  color,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organKey: string;
  organLabel: string;
  item: BodyDamage | null;
  variant: BodyMapVariant;
  color: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    if (open) {
      setZoomed(false);
      const t = setTimeout(() => setZoomed(true), 50);
      return () => clearTimeout(t);
    }
  }, [open, organKey]);

  const render = ORGAN_ART[organKey] ?? FALLBACK;
  const isBenefit = variant === "benefit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-border/60 bg-background/95 p-0">
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(125,211,252,0.10), rgba(2,6,23,0.95) 70%)",
          }}
        >
          {/* Pulsing radial halo */}
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{
              background: `radial-gradient(circle at center, ${color}33 0%, transparent 55%)`,
            }}
          />
          {/* Scanline grid */}
          <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
            <defs>
              <pattern id="grid-organ" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-organ)" />
          </svg>

          {/* Organ illustration with zoom-in animation */}
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 h-full w-full transition-all duration-[1100ms] ease-out"
            style={{
              transform: zoomed ? "scale(1)" : "scale(0.35)",
              opacity: zoomed ? 1 : 0,
              filter: `drop-shadow(0 0 24px ${color}66)`,
            }}
          >
            {render(color)}
          </svg>

          {/* Crosshair / target rings while zooming */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 200 200"
            aria-hidden
          >
            {[60, 80, 100].map((r, i) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="0.4"
                strokeDasharray="2 4"
                opacity={zoomed ? 0 : 0.5 - i * 0.1}
                style={{ transition: "opacity 900ms ease-out" }}
              />
            ))}
          </svg>

          {/* Header badge */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 10px ${color}` }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
              {isBenefit ? "Anatomical Benefit" : "Anatomical Impact"}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold">{organLabel}</DialogTitle>
            {item && (
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color, borderColor: color, background: `${color}14` }}
              >
                {item.severity}
              </span>
            )}
          </div>
          {item?.trigger && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isBenefit ? "Beneficial compound" : "Causing chemical / nutrient"}
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color }}>
                {item.trigger}
              </p>
            </div>
          )}
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            {item?.reason ?? "Tap any glowing organ to learn how this product interacts with it."}
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}
