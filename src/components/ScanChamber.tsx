/**
 * Hero scanning-chamber animation — pure SVG/CSS, ~6s loop.
 * Shows a food packet descending into a glass chamber, a laser sweeping over it,
 * and a verdict ("HEALTHY") popping out the bottom. No external libs.
 */
export function ScanChamber({ className }: { className?: string }) {
  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <svg
        viewBox="0 0 480 360"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
        role="img"
        aria-label="Animated scanning chamber demo"
      >
        <defs>
          <linearGradient id="sc-chamber" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(220 40% 12%)" />
            <stop offset="100%" stopColor="hsl(220 40% 6%)" />
          </linearGradient>
          <linearGradient id="sc-laser" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(180 90% 60%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(180 90% 60%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sc-pack" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(40 95% 60%)" />
            <stop offset="100%" stopColor="hsl(20 90% 50%)" />
          </linearGradient>
          <radialGradient id="sc-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(150 80% 55%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(150 80% 55%)" stopOpacity="0" />
          </radialGradient>
          <filter id="sc-blur"><feGaussianBlur stdDeviation="1.4" /></filter>
        </defs>

        {/* backdrop grid */}
        <rect x="0" y="0" width="480" height="360" fill="hsl(220 30% 5%)" />
        <g stroke="hsl(180 30% 30%)" strokeWidth="0.4" opacity="0.35">
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 24} y1="0" x2={i * 24} y2="360" />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 24} x2="480" y2={i * 24} />
          ))}
        </g>

        {/* chamber frame */}
        <rect x="120" y="60" width="240" height="220" rx="14" fill="url(#sc-chamber)" stroke="hsl(180 70% 45%)" strokeWidth="2" />
        {/* corner brackets */}
        <g stroke="hsl(150 80% 55%)" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M130 80 V72 H140" />
          <path d="M350 80 V72 H340" />
          <path d="M130 260 V268 H140" />
          <path d="M350 260 V268 H340" />
        </g>

        {/* conveyor */}
        <rect x="60" y="276" width="360" height="14" rx="3" fill="hsl(220 20% 18%)" stroke="hsl(180 40% 35%)" strokeWidth="1" />
        <g stroke="hsl(180 70% 45%)" strokeWidth="1.2">
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={i} x1={64 + i * 20} y1="278" x2={70 + i * 20} y2="288">
              <animate attributeName="x1" values={`${64 + i * 20};${44 + i * 20}`} dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="x2" values={`${70 + i * 20};${50 + i * 20}`} dur="0.8s" repeatCount="indefinite" />
            </line>
          ))}
        </g>

        {/* ambient glow */}
        <circle cx="240" cy="170" r="120" fill="url(#sc-glow)" />

        {/* food packet — slides in, gets scanned, slides out */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-120,0; 0,0; 0,0; 0,0; 0,0; 360,0; 360,0"
            keyTimes="0;0.18;0.3;0.7;0.82;0.95;1"
            dur="6s"
            repeatCount="indefinite"
          />
          <rect x="200" y="170" width="80" height="90" rx="6" fill="url(#sc-pack)" stroke="hsl(20 90% 35%)" strokeWidth="1.5" />
          <rect x="208" y="184" width="64" height="10" rx="2" fill="hsl(0 0% 100%)" opacity="0.85" />
          <rect x="208" y="200" width="44" height="6" rx="2" fill="hsl(0 0% 100%)" opacity="0.6" />
          <rect x="208" y="210" width="54" height="6" rx="2" fill="hsl(0 0% 100%)" opacity="0.6" />
          <g stroke="hsl(0 0% 10%)" strokeWidth="1.4">
            <line x1="212" y1="230" x2="212" y2="252" />
            <line x1="218" y1="230" x2="218" y2="252" />
            <line x1="224" y1="230" x2="224" y2="252" />
            <line x1="232" y1="230" x2="232" y2="252" />
            <line x1="240" y1="230" x2="240" y2="252" />
            <line x1="248" y1="230" x2="248" y2="252" />
            <line x1="256" y1="230" x2="256" y2="252" />
            <line x1="264" y1="230" x2="264" y2="252" />
            <line x1="270" y1="230" x2="270" y2="252" />
          </g>
        </g>

        {/* laser sweep — appears only during scanning window */}
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.25;0.3;0.7;0.75;1" dur="6s" repeatCount="indefinite" />
          <rect x="125" y="80" width="230" height="3" rx="1.5" fill="url(#sc-laser)" filter="url(#sc-blur)">
            <animate attributeName="y" values="80;258;80" keyTimes="0;0.5;1" dur="1.6s" repeatCount="indefinite" />
          </rect>
          <rect x="125" y="80" width="230" height="1" fill="hsl(180 90% 75%)">
            <animate attributeName="y" values="80;258;80" keyTimes="0;0.5;1" dur="1.6s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* analyzing chips */}
        <g fontFamily="ui-monospace, Menlo, monospace" fontSize="9" fill="hsl(180 90% 70%)" opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.3;0.35;0.7;0.75;1" dur="6s" repeatCount="indefinite" />
          <text x="132" y="100">› scanning ingredients</text>
          <text x="132" y="114">› checking additives</text>
          <text x="132" y="128">› matching DB…</text>
        </g>

        {/* verdict badge — pops in at the end */}
        <g opacity="0" transform="translate(370,150)">
          <animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.7;0.78;0.82;0.95;1" dur="6s" repeatCount="indefinite" />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="370,150;370,150;370,150;370,140;370,140;370,140"
            keyTimes="0;0.7;0.78;0.82;0.95;1"
            dur="6s"
            repeatCount="indefinite"
          />
          <rect x="0" y="0" width="92" height="44" rx="10" fill="hsl(150 80% 45%)" stroke="hsl(150 80% 75%)" strokeWidth="1.5" />
          <text x="46" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(150 30% 12%)" fontFamily="ui-sans-serif">HEALTHY</text>
          <text x="46" y="34" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(150 30% 12%)" fontFamily="ui-sans-serif">8.4 / 10</text>
        </g>

        {/* label */}
        <text x="240" y="46" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="4" fill="hsl(180 60% 70%)" fontFamily="ui-sans-serif">
          RAPSCANZ · LIVE SCAN
        </text>
      </svg>
    </div>
  );
}

export default ScanChamber;
