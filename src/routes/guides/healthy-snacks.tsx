import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Check, AlertTriangle } from "lucide-react";

const URL = "https://healthy-food-scan.lovable.app/guides/healthy-snacks";
const TITLE = "The Perfect Healthy Snack: What to Look for on the Label";
const DESCRIPTION =
  "A no-nonsense guide to picking a genuinely healthy snack — what to check for fiber, protein, sugar, sodium, and additives, with quick label-reading rules.";

export const Route = createFileRoute("/guides/healthy-snacks")({
  head: () => ({
    meta: [
      { title: `${TITLE} — RAPscanz` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "RAPscanz" },
          publisher: { "@type": "Organization", name: "RAPscanz" },
        }),
      },
    ],
  }),
  component: HealthySnacksGuide,
});

function HealthySnacksGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="h-4 w-4" />
            </div>
            RAPscanz
          </Link>
          <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Scan a snack
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <article className="prose-like space-y-6">
          <span className="chip">Guide · 4 min read</span>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{TITLE}</h1>
          <p className="text-lg text-muted-foreground">
            Most snacks marketed as "healthy" aren't. The label tells the truth — if you know
            which four things to read first. Here's the short version, plus the long version.
          </p>

          <h2 className="font-display text-2xl font-bold tracking-tight">The 4-line rule</h2>
          <p>Before anything else, glance at the nutrition panel and the ingredient list and check:</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-success" /><span><strong>Fiber ≥ 3 g per serving.</strong> Real fiber keeps you full and slows the sugar hit.</span></li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-success" /><span><strong>Protein ≥ 5 g per serving.</strong> Without it, a "snack" is just dessert.</span></li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-success" /><span><strong>Added sugar &lt; 5 g per serving.</strong> Watch for sneaky names below.</span></li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-success" /><span><strong>Sodium &lt; 200 mg per serving.</strong> Reasonable for one sitting.</span></li>
          </ul>

          <h2 className="font-display text-2xl font-bold tracking-tight">Read the ingredient list like a detective</h2>
          <p>
            Ingredients are listed by weight, so the first three matter most. If sugar, a refined oil,
            or "flour" (without "whole") is in the top three, it's a dessert in disguise.
          </p>
          <p>Sugar wears at least <strong>50+ disguises</strong>. The common ones to flag:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Glucose / fructose / dextrose / maltose / sucrose</li>
            <li>Corn syrup, high-fructose corn syrup, invert sugar</li>
            <li>Cane juice, fruit juice concentrate, malt extract</li>
            <li>Honey, agave, jaggery — still sugar, nutritionally</li>
          </ul>

          <h2 className="font-display text-2xl font-bold tracking-tight">Additives worth a second look</h2>
          <p className="flex items-start gap-2 rounded-lg border border-warning bg-warning/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>These aren't all "dangerous" — but they tend to show up in ultra-processed snacks. The more your label has, the further it is from real food.</span>
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Hydrogenated / partially-hydrogenated oils</strong> — trans fats.</li>
            <li><strong>Artificial colors</strong> (E102, E110, E124, E129) — flagged in several countries.</li>
            <li><strong>Sweeteners</strong> like aspartame (E951), sucralose (E955), acesulfame-K (E950).</li>
            <li><strong>Preservatives</strong> BHA / BHT (E320, E321), sodium nitrite (E250).</li>
            <li><strong>Emulsifiers</strong> polysorbate 80 (E433), carrageenan (E407).</li>
          </ul>

          <h2 className="font-display text-2xl font-bold tracking-tight">What a genuinely good snack looks like</h2>
          <p>A snack that passes the bar is usually:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Short ingredient list (≤ 5 items), all recognisable.</li>
            <li>A real food first — nuts, seeds, oats, chickpeas, fruit, yogurt.</li>
            <li>Either no added sugar or sweetened very lightly.</li>
            <li>No artificial colors or BHA/BHT preservatives.</li>
          </ul>

          <h2 className="font-display text-2xl font-bold tracking-tight">Let RAPscanz do the reading</h2>
          <p>
            Doing all this in the supermarket aisle is annoying. Snap the label or scan the barcode with
            RAPscanz and you'll get a 0–100 health score, the real advantages and disadvantages, and
            every cautioned additive flagged with a severity — in seconds.
          </p>
          <div>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
              Try it free <ScanLine className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RAPscanz. For information only — not medical advice.
      </footer>
    </div>
  );
}
