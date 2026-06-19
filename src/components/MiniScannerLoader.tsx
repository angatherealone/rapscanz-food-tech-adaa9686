/**
 * Compact "mini scanner" loader shown while a scan is being analyzed.
 * Pure SVG/CSS — animated laser sweep over a tiny food packet.
 */
export function MiniScannerLoader({ label = "Analyzing your scan…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <div className="relative">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="ms-laser" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
              <stop offset="50%" stopColor="hsl(180 90% 60%)" />
              <stop offset="100%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ms-pack" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(40 95% 60%)" />
              <stop offset="100%" stopColor="hsl(20 90% 50%)" />
            </linearGradient>
            <radialGradient id="ms-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(150 80% 55%)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="hsl(150 80% 55%)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* glow ring */}
          <circle cx="80" cy="80" r="74" fill="url(#ms-glow)">
            <animate attributeName="r" values="60;78;60" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* chamber */}
          <rect x="20" y="20" width="120" height="120" rx="16" fill="hsl(220 40% 10%)" stroke="hsl(180 70% 45%)" strokeWidth="1.5" />

          {/* corner reticle */}
          <g stroke="hsl(150 80% 55%)" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M30 40 V32 H38" />
            <path d="M130 40 V32 H122" />
            <path d="M30 120 V128 H38" />
            <path d="M130 120 V128 H122" />
          </g>

          {/* mini food packet (centered, gently bobbing) */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-2;0,2;0,-2"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <rect x="60" y="58" width="40" height="50" rx="4" fill="url(#ms-pack)" stroke="hsl(20 90% 35%)" strokeWidth="1" />
            <rect x="64" y="64" width="32" height="6" rx="1.5" fill="hsl(0 0% 100%)" opacity="0.9" />
            <rect x="64" y="74" width="22" height="3" rx="1" fill="hsl(0 0% 100%)" opacity="0.6" />
            <rect x="64" y="80" width="26" height="3" rx="1" fill="hsl(0 0% 100%)" opacity="0.6" />
            <g stroke="hsl(0 0% 10%)" strokeWidth="0.9">
              <line x1="66" y1="90" x2="66" y2="104" />
              <line x1="70" y1="90" x2="70" y2="104" />
              <line x1="75" y1="90" x2="75" y2="104" />
              <line x1="80" y1="90" x2="80" y2="104" />
              <line x1="86" y1="90" x2="86" y2="104" />
              <line x1="92" y1="90" x2="92" y2="104" />
            </g>
          </g>

          {/* laser sweep */}
          <rect x="22" y="30" width="116" height="2" rx="1" fill="url(#ms-laser)">
            <animate attributeName="y" values="30;128;30" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.6s" repeatCount="indefinite" />
          </rect>
        </svg>
      </div>
      <div className="text-center">
        <div className="font-display text-sm font-semibold">{label}</div>
        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

export default MiniScannerLoader;
