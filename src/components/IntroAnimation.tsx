import { useEffect, useState } from "react";
import { LogoIcon } from "./Logo";

/**
 * Full-screen intro animation that plays once per browser session.
 * Logo scales/glows in, wordmark types in, then the curtain wipes away.
 */
export function IntroAnimation() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leaving" | "done">(
    "hidden",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("rapz-intro-played") === "1") {
        setPhase("done");
        return;
      }
      sessionStorage.setItem("rapz-intro-played", "1");
    } catch {
      // ignore storage errors
    }
    setPhase("show");
    const leave = setTimeout(() => setPhase("leaving"), 1900);
    const done = setTimeout(() => setPhase("done"), 2600);
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
      <div className="absolute h-[60vmin] w-[60vmin] rounded-full bg-primary/20 blur-3xl animate-pulse" />

      <div className="relative flex flex-col items-center gap-5">
        <div className="animate-[introPop_700ms_cubic-bezier(0.2,0.9,0.3,1.3)_both] drop-shadow-[0_0_40px_hsl(150_80%_55%/0.45)]">
          <LogoIcon size={120} />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-display text-3xl font-bold tracking-tight animate-[introSlide_600ms_ease-out_200ms_both] md:text-4xl">
            RAP<span className="text-primary">scanz</span>
          </h1>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground animate-[introFade_700ms_ease-out_500ms_both]">
          scan · decode · decide
        </p>
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
      `}</style>
    </div>
  );
}

export default IntroAnimation;
