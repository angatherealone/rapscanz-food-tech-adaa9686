import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ShieldAlert, Sparkles, Barcode, FileText, Check } from "lucide-react";

const HOME_URL = "https://healthy-food-scan.lovable.app/";
const HOME_TITLE = "RAPscanz — Know what's really in your food";
const HOME_DESC =
  "Scan ingredients or barcodes. Get instant advantages, disadvantages, and chemical cautions. 30 free scans, then ₹300/year.";

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
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="h-4 w-4" />
            </div>
            RAPscanz
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Sign in</Link>
            <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Start scanning
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 ink-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="chip"><Sparkles className="h-3 w-3" /> 30 free scans · then ₹300/year</span>
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
      <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 ink-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="chip"><Sparkles className="h-3 w-3" /> 30 free scans · then ₹300/year</span>
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
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Honest pricing.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Try RAPscanz with <strong className="text-foreground">30 free scans</strong>. No card needed.
              Hooked? Keep scanning for <strong className="text-foreground">₹300/year</strong> — that's less than ₹1 a day.
            </p>
          </div>
          <div className="rounded-3xl border-2 border-primary bg-card p-8 shadow-[8px_8px_0_0_var(--primary)]">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pro</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">₹300</span>
              <span className="text-muted-foreground">/year</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {["Unlimited scans", "Ingredient & barcode analysis", "Chemical caution alerts", "Scan history"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90">
              Start with 30 free scans
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RAPscanz. For information only — not medical advice.
      </footer>
    </div>
  );
}
