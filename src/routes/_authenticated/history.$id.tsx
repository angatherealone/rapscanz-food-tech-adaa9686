import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getScan } from "@/lib/scan.functions";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ThumbsUp, ThumbsDown, ArrowLeft } from "lucide-react";
import { HealthScore } from "@/components/HealthScore";

export const Route = createFileRoute("/_authenticated/history/$id")({
  head: () => ({ meta: [{ title: "Scan details — RAPscanz" }] }),
  component: ScanDetailPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-danger">Couldn't load this scan: {error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted-foreground">Scan not found.</p>
    </main>
  ),
});

const RATING_STYLES: Record<string, { bg: string; label: string }> = {
  good:    { bg: "bg-success text-success-foreground",   label: "Good choice" },
  okay:    { bg: "bg-accent text-accent-foreground",     label: "Okay-ish" },
  caution: { bg: "bg-warning text-warning-foreground",   label: "Caution" },
  avoid:   { bg: "bg-danger text-danger-foreground",     label: "Better avoid" },
};

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning text-warning-foreground",
  high: "bg-danger text-danger-foreground",
};

function ScanDetailPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getScan);
  const { data: scan, isLoading } = useQuery({
    queryKey: ["scan", id],
    queryFn: () => fn({ data: { id } }),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">Loading…</main>;
  }
  if (!scan) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Scan not found.</p>
        <Link to="/history" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          ← Back to history
        </Link>
      </main>
    );
  }

  const advantages = (scan.advantages as string[] | null) ?? [];
  const disadvantages = (scan.disadvantages as string[] | null) ?? [];
  const cautions = (scan.cautions as { ingredient: string; concern: string; severity: string }[] | null) ?? [];
  const rating = scan.rating ?? "okay";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/history" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to history
      </Link>

      <div className="space-y-5">
        <Card className="overflow-hidden p-0">
          <div className={`px-6 py-4 ${RATING_STYLES[rating]?.bg ?? "bg-muted"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {RATING_STYLES[rating]?.label ?? rating}
                </div>
                <div className="font-display text-2xl font-bold">{scan.product_name ?? "Untitled product"}</div>
                <div className="mt-1 text-xs opacity-80">
                  {scan.scan_type} · {new Date(scan.created_at).toLocaleString()}
                </div>
              </div>
              {typeof scan.health_score === "number" && <HealthScore score={scan.health_score} />}
            </div>
          </div>
          {scan.summary && (
            <div className="p-6">
              <p className="text-base">{scan.summary}</p>
            </div>
          )}
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <ThumbsUp className="h-5 w-5 text-success" /> Advantages
            </div>
            <ul className="space-y-2 text-sm">
              {advantages.length ? advantages.map((a, i) => (
                <li key={i} className="flex gap-2"><span className="text-success">+</span>{a}</li>
              )) : <li className="text-muted-foreground">None notable.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <ThumbsDown className="h-5 w-5 text-danger" /> Disadvantages
            </div>
            <ul className="space-y-2 text-sm">
              {disadvantages.length ? disadvantages.map((d, i) => (
                <li key={i} className="flex gap-2"><span className="text-danger">−</span>{d}</li>
              )) : <li className="text-muted-foreground">None notable.</li>}
            </ul>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" /> Chemical & ingredient cautions
          </div>
          {cautions.length ? (
            <ul className="divide-y divide-border">
              {cautions.map((c, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.ingredient}</div>
                    <div className="text-sm text-muted-foreground">{c.concern}</div>
                  </div>
                  <span className={`chip ${SEVERITY_BADGE[c.severity] ?? ""}`}>{c.severity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No flagged chemicals. 🎉</p>
          )}
        </Card>
      </div>
    </main>
  );
}
