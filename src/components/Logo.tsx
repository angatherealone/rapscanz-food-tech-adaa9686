type LogoProps = {
  className?: string;
  size?: number;
  withWordmark?: boolean;
};

/**
 * RAPscanz logo — a stylized leaf inside a scanner reticle with a
 * horizontal laser sweep. Pure SVG, inherits currentColor.
 */
export function LogoIcon({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="rapz-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(150 80% 55%)" />
          <stop offset="100%" stopColor="hsl(180 90% 50%)" />
        </linearGradient>
        <linearGradient id="rapz-laser" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(180 90% 60%)" />
          <stop offset="100%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* rounded square frame */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#rapz-grad)" />

      {/* scanner reticle corners */}
      <g stroke="hsl(0 0% 100%)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.95">
        <path d="M14 22 V16 H20" />
        <path d="M50 22 V16 H44" />
        <path d="M14 42 V48 H20" />
        <path d="M50 42 V48 H44" />
      </g>

      {/* leaf */}
      <path
        d="M32 18c8 2 13 7 13 15 0 7-5 13-13 13-8 0-13-6-13-13 0-3 1-5 2-7 4 0 8-2 11-8z"
        fill="hsl(0 0% 100%)"
        opacity="0.95"
      />
      <path
        d="M22 39c3-6 7-10 13-12"
        stroke="hsl(150 80% 35%)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* laser sweep */}
      <rect x="10" y="31" width="44" height="2" rx="1" fill="url(#rapz-laser)">
        <animate attributeName="y" values="18;46;18" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2.4s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

export function Logo({ className, size = 36, withWordmark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon size={size} />
      {withWordmark && (
        <span className="font-display text-xl font-bold tracking-tight">
          RAP<span className="text-primary">scanz</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
