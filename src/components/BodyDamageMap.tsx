import { useState, useMemo } from "react";
export type BodyImpactItem = {
  part: string;
  severity: "low" | "medium" | "high";

  damageScore?: number;

  reason: string;

  trigger?: string;

  causes?: string[];

  effects?: string[];

  recommendations?: string[];
};
export function BodyDamageMap({ items, variant, totalSlots = 13 }: { items: BodyImpactItem[]; variant: "damage" | "benefit"; totalSlots?: number }) {
const HumanoidShape = () => (
  <g fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
    <circle cx="200" cy="55" r="16" />
    <line x1="200" y1="71" x2="200" y2="82" strokeWidth="4" />
    <path
      d="M165,92 C165,92 180,82 200,82 C220,82 235,92 235,92 L225,160 C225,160 212,170 200,170 C188,170 175,160 175,160 Z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path
      d="M175,160 L180,210 C180,210 190,216 200,216 C210,216 220,210 220,210 L225,160"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path
      d="M165,92 L145,150 L140,200 M235,92 L255,150 L260,200 M182,214 L180,300 L182,410 M218,214 L220,300 L222,410"
      strokeWidth="5"
    />
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

