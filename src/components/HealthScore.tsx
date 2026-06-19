type Props = {
  score: number;
  size?: "sm" | "lg";
};

function scoreRing(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-300";
  return "text-rose-400";
}

function scoreText(score: number) {
  if (score >= 70) return "text-emerald-300";
  if (score >= 40) return "text-amber-200";
  return "text-rose-300";
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent for you";
  if (score >= 70) return "Healthy choice";
  if (score >= 40) return "Okay in moderation";
  if (score >= 20) return "Eat rarely";
  return "Better avoid";
}

export function HealthScore({ score, size = "lg" }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dim = size === "lg" ? 92 : 56;
  const stroke = size === "lg" ? 9 : 6;
  const radius = (dim - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;
  const ring = scoreRing(clamped);
  const text = scoreText(clamped);

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 rounded-full bg-slate-950 ring-2 ring-slate-950/70 shadow-lg"
        style={{ width: dim, height: dim }}
      >
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className="text-slate-700"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={ring}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-bold leading-none ${size === "lg" ? "text-2xl" : "text-base"} ${text}`}>
            {clamped}
          </span>
          {size === "lg" && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>
          )}
        </div>
      </div>
      {size === "lg" && (
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Health score</div>
          <div className="font-display text-sm font-semibold">{scoreLabel(clamped)}</div>
          <div className={`mt-0.5 font-mono text-xs font-bold ${text}`}>
            {(clamped / 10).toFixed(1)}<span className="opacity-60"> / 10</span>
          </div>
        </div>
      )}

    </div>
  );
}
