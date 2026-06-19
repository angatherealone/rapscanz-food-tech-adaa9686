import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ShieldAlert, Sparkles, Barcode, FileText, Check } from "lucide-react";
import { LogoIcon } from "@/components/Logo";
import { ScanChamber } from "@/components/ScanChamber";

const HOME_URL = "https://healthy-food-scan.lovable.app/";
const HOME_TITLE = "RAPscanz — Know what's really in your food";
const HOME_DESC =
  "Scan ingredients or barcodes. Get instant advantages, disadvantages, and chemical cautions. 30 free scans, then Pro ₹200/mo or Pro+ ₹500/mo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: HOME_URL },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESC },
    ],
    links: [{ rel: "canonical", href: HOME_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "RAPscanz",
            url: HOME_URL,
            description:
              "RAPscanz analyses packaged food from its ingredient list or barcode and returns a health score, advantages, disadvantages, and chemical cautions.",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "RAPscanz",
            url: HOME_URL,
            description: HOME_DESC,
          },
        ]),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <LogoIcon size={32} />
            RAP<span className="text-primary">scanz</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/leaderboard" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Leaderboard</Link>
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Sign in</Link>
            <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Start scanning
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 ink-grid opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div className="max-w-2xl">
                <span className="chip"><Sparkles className="h-3 w-3" /> 30 free scans · Pro from ₹200/mo</span>
                <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                  Know what's <span className="bg-accent px-2 py-0.5">actually</span> in your food.
                </h1>
                <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                  Snap a label, paste ingredients, or scan a barcode. RAPscanz breaks down the good, the bad,
                  and the chemicals worth a second look — in plain English.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90">
                    Start scanning free <ScanLine className="h-4 w-4" />
                  </Link>
                  <a href="#how" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-base font-semibold hover:bg-muted">
                    How it works
                  </a>
                </div>
              </div>
              <div className="relative">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-20px_hsl(180_90%_30%/0.35)]">
                  <ScanChamber />
                </div>
                <p className="mt-3 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  6-second live scan preview
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {[
              { icon: <FileText className="h-5 w-5" />, t: "Paste or photograph", d: "Drop in the ingredient list from any food packet or snap a photo of the label." },
              { icon: <Barcode className="h-5 w-5" />, t: "Or scan the barcode", d: "Type the barcode and we'll pull the product from the open food database." },
              { icon: <ShieldAlert className="h-5 w-5" />, t: "Get the verdict", d: "Advantages, disadvantages, and clear cautions on chemicals — instantly." },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  {s.icon}
                </div>
                <h2 className="font-display text-xl font-semibold">{s.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Honest pricing.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with <strong className="text-foreground">30 free scans</strong>. Upgrade when you need more.
            </p>
            <p className="mt-3 text-sm">
              <Link to="/guides/healthy-snacks" className="font-medium text-primary hover:underline">
                Read the guide: how to spot a genuinely healthy snack →
              </Link>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹0</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {["30 scans total", "Ingredient & barcode analysis", "Chemical caution alerts", "Scan history"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> {f}</li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 font-semibold hover:bg-muted">
                Start free
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-primary">Pro</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹200</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {["60 scans per month", "Estimated % of each chemical", "Everything in Free"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> {f}</li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 font-semibold hover:bg-muted">
                Go Pro
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-accent-foreground">Pro+</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹500</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {["120 scans per month", "% of each chemical", "What each chemical can cause", "Everything in Pro"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> {f}</li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 font-semibold hover:bg-muted">
                Go Pro+
              </Link>
            </div>

            <div className="relative rounded-3xl border-2 border-primary bg-card p-6 shadow-[8px_8px_0_0_var(--primary)]">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Most powerful
              </span>
              <div className="text-sm font-semibold uppercase tracking-wider text-primary">Pro Max</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">₹1200</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "240 scans per month",
                  "3D body-damage visualisation",
                  "See which organs the product harms",
                  "Everything in Pro+",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {f}</li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90">
                Go Pro Max
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RAPscanz. For information only — not medical advice.
      </footer>
    </div>
  );
}
