import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listScans } from "@/lib/scan.functions";
import { Card } from "@/components/ui/card";
import { ScanLine } from "lucide-react";
import { HealthScore } from "@/components/HealthScore";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Scan history — RAPscanz" }] }),
  component: HistoryPage,
});

const RATING_DOT: Record<string, string> = {
  good: "bg-success",
  okay: "bg-accent",
  caution: "bg-warning",
  avoid: "bg-danger",
};

function HistoryPage() {
  const fn = useServerFn(listScans);
  const { data, isLoading } = useQuery({ queryKey: ["scans"], queryFn: () => fn() });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Scan history</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you've scanned with RAPscanz.</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <ScanLine className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No scans yet.</p>
            <Link to="/scan" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Run your first scan
            </Link>
          </Card>
        )}
        {data?.map((s) => (
          <Link
            key={s.id}
            to="/history/$id"
            params={{ id: s.id }}
            className="block"
          >
            <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50">
              <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RATING_DOT[s.rating ?? "okay"] ?? "bg-muted"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-base font-semibold">{s.product_name ?? "Untitled product"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {s.scan_type} · {s.rating}
                </div>
                {s.summary && <p className="mt-1 line-clamp-2 text-sm">{s.summary}</p>}
              </div>
              {typeof s.health_score === "number" && (
                <HealthScore score={s.health_score} size="sm" />
              )}
            </Card>
          </Link>
        ))}

      </div>
    </main>
  );
}
