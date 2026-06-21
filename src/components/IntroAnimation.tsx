import { useEffect, useState } from "react";
import { LogoIcon } from "./Logo";

/**
 * Full-screen intro animation that plays once per browser session.
 * Sci-fi HUD scanning chamber: rotating reticle rings, sweeping radar line,
 * crosshair locking onto the logo, with a "TARGET LOCKED" finale.
 */
export function IntroAnimation() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leaving" | "done">(
    "hidden",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ---- Detect whether this page-load is a "reload/refresh" ----
    // Modern API (preferred): performance.getEntriesByType("navigation").
    // Legacy fallback: performance.navigation.type === 1.
    // On a reload we ALWAYS reset and replay the intro from the very beginning.
    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries.length && navEntries[0].type === "reload") {
        isReload = true;
      } else {
        const legacyNav = (performance as unknown as { navigation?: { type: number } }).navigation;
        if (legacyNav && legacyNav.type === 1) {
          isReload = true;
        }
      }
    } catch {
      // ignore — fall back to non-reload behaviour
    }

    // On reload, wipe the "already-played" flag so the animation restarts.
    if (isReload) {
      try {
        sessionStorage.removeItem("rapz-intro-played");
      } catch {
        /* ignore storage errors */
      }
    }

    // For in-app navigations (SPA route changes) we still want to play once
    // per browser session and skip if already shown.
    try {
      if (!isReload && sessionStorage.getItem("rapz-intro-played") === "1") {
        setPhase("done");
        return;
      }
      sessionStorage.setItem("rapz-intro-played", "1");
    } catch {
      // ignore storage errors
    }

    // ---- Trigger the animation lifecycle (insert CSS class toggles here) ----
    setPhase("show");
    const leave = setTimeout(() => setPhase("leaving"), 3600);
    const done = setTimeout(() => setPhase("done"), 4300);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  if (phase === "done" || phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-all duration-700 ${
        phase === "leaving" ? "pointer-events-none opacity-0 scale-110" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* animated grid backdrop */}
      <div className="absolute inset-0 ink-grid opacity-30" />
      {/* radial pulse */}
      <div className="absolute h-[60vmin] w-[60vmin] rounded-full bg-primary/15 blur-3xl animate-pulse" />

      {/* HUD scanning target */}
      <div className="relative grid place-items-center">
        <svg
          viewBox="0 0 400 400"
          className="h-[78vmin] w-[78vmin] max-h-[560px] max-w-[560px]"
        >
          <defs>
            <linearGradient id="hud-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(150 80% 55%)" stopOpacity="0" />
              <stop offset="60%" stopColor="hsl(150 80% 55%)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="hsl(150 80% 75%)" stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="hud-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(150 80% 55%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(150 80% 55%)" stopOpacity="0" />
            </radialGradient>
            <filter id="hud-blur"><feGaussianBlur stdDeviation="1.2" /></filter>
          </defs>

          <circle cx="200" cy="200" r="190" fill="url(#hud-glow)" />

          {/* outer ring with dashed tick marks, rotating */}
          <g className="hud-spin-slow" style={{ transformOrigin: "200px 200px" }}>
            <circle cx="200" cy="200" r="186" fill="none" stroke="hsl(150 80% 55% / 0.55)" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="200" cy="200" r="172" fill="none" stroke="hsl(180 70% 55% / 0.35)" strokeWidth="1" strokeDasharray="14 8" />
          </g>

          {/* middle ring rotating opposite */}
          <g className="hud-spin-rev" style={{ transformOrigin: "200px 200px" }}>
            <circle cx="200" cy="200" r="150" fill="none" stroke="hsl(150 80% 55% / 0.7)" strokeWidth="1.2" />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const x1 = 200 + Math.cos(a) * 150;
              const y1 = 200 + Math.sin(a) * 150;
              const x2 = 200 + Math.cos(a) * 138;
              const y2 = 200 + Math.sin(a) * 138;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(150 80% 55%)" strokeWidth="1.5" />;
            })}
          </g>

          {/* inner ring */}
          <circle cx="200" cy="200" r="118" fill="none" stroke="hsl(150 80% 55% / 0.5)" strokeWidth="0.8" strokeDasharray="4 4" />

          {/* sweeping radar wedge */}
          <g className="hud-sweep" style={{ transformOrigin: "200px 200px" }}>
            <path d="M200 200 L200 14 A186 186 0 0 1 386 200 Z" fill="url(#hud-sweep)" opacity="0.55" />
            <line x1="200" y1="200" x2="200" y2="14" stroke="hsl(150 90% 75%)" strokeWidth="1.5" filter="url(#hud-blur)" />
          </g>

          {/* crosshair */}
          <g stroke="hsl(150 80% 60%)" strokeWidth="1.2" opacity="0.85">
            <line x1="200" y1="0" x2="200" y2="40" />
            <line x1="200" y1="360" x2="200" y2="400" />
            <line x1="0" y1="200" x2="40" y2="200" />
            <line x1="360" y1="200" x2="400" y2="200" />
          </g>

          {/* corner brackets locking in */}
          <g className="hud-lock" stroke="hsl(150 90% 65%)" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M110 90 V70 H130" />
            <path d="M290 90 V70 H270" />
            <path d="M110 310 V330 H130" />
            <path d="M290 310 V330 H270" />
          </g>

          {/* HUD readouts */}
          <g fontFamily="ui-monospace, Menlo, monospace" fontSize="9" fill="hsl(150 70% 70%)" className="hud-text">
            <text x="20" y="22">› RAPSCANZ HUD v1.0</text>
            <text x="20" y="36">› SYS: ONLINE</text>
            <text x="280" y="22">LAT 28.61° N</text>
            <text x="280" y="36">LON 77.21° E</text>
            <text x="20" y="386">› SCANNING…</text>
            <text x="280" y="386">SIG ███▌ 92%</text>
          </g>

          {/* TARGET LOCKED badge */}
          <g className="hud-lockbadge" transform="translate(200 360)">
            <rect x="-58" y="-12" width="116" height="22" rx="4" fill="hsl(150 80% 45%)" stroke="hsl(150 80% 75%)" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" fontWeight="700" fill="hsl(150 30% 10%)">TARGET LOCKED</text>
          </g>
        </svg>

        {/* logo + wordmark centered inside reticle */}
        <div className="absolute flex flex-col items-center gap-3">
          <div className="animate-[introPop_700ms_cubic-bezier(0.2,0.9,0.3,1.3)_both] drop-shadow-[0_0_40px_hsl(150_80%_55%/0.55)]">
            <LogoIcon size={108} />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-display text-3xl font-bold tracking-tight animate-[introSlide_600ms_ease-out_200ms_both] md:text-4xl">
              RAP<span className="text-primary">scanz</span>
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-[introFade_700ms_ease-out_500ms_both]">
            scan · decode · decide
          </p>
        </div>
      </div>

      <style>{`
        @keyframes introPop {
          0% { opacity: 0; transform: scale(0.5) rotate(-8deg); }
          60% { opacity: 1; transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes introSlide {
          from { opacity: 0; transform: translateY(110%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes introFade {
          from { opacity: 0; letter-spacing: 0.2em; }
          to { opacity: 1; letter-spacing: 0.4em; }
        }
        @keyframes hudSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hudSpinRev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes hudSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hudLockIn {
          0% { opacity: 0; transform: scale(1.6); }
          60% { opacity: 1; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes hudBadge {
          0%, 60% { opacity: 0; transform: translate(200px, 380px); }
          75% { opacity: 1; transform: translate(200px, 360px); }
          100% { opacity: 1; transform: translate(200px, 360px); }
        }
        @keyframes hudFlicker {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.45; }
        }
        .hud-spin-slow { animation: hudSpin 9s linear infinite; }
        .hud-spin-rev { animation: hudSpinRev 14s linear infinite; }
        .hud-sweep { animation: hudSweep 2.2s linear infinite; }
        .hud-lock { animation: hudLockIn 900ms cubic-bezier(0.2,0.9,0.3,1.3) 200ms both; transform-origin: 200px 200px; }
        .hud-lockbadge { animation: hudBadge 3.2s ease-out both; }
        .hud-text { animation: hudFlicker 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default IntroAnimation;
