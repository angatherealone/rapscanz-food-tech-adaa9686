type Props = {
  score: number;
  size?: "sm" | "lg";
};

function scoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning-foreground";
  return "text-danger";
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
  const color = scoreColor(clamped);

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className="text-background/40"
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
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-bold leading-none ${size === "lg" ? "text-2xl" : "text-base"} ${color}`}>
            {clamped}
          </span>
          {size === "lg" && (
            <span className="text-[10px] uppercase tracking-wider opacity-70">/ 100</span>
          )}
        </div>
      </div>
      {size === "lg" && (
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Health score</div>
          <div className="font-display text-sm font-semibold">{scoreLabel(clamped)}</div>
        </div>
      )}
    </div>
  );
}
