import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWeeklyConsumption } from "@/lib/scan.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame, Trash2, ScanLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/weekly")({
  head: () => ({
    meta: [
      { title: "Weekly intake — RAPscanz" },
      { name: "description", content: "See the calories of foods you ate this week, tracked from your RAPscanz scans." },
    ],
  }),
  component: WeeklyPage,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function WeeklyPage() {
  const qc = useQueryClient();
  const fn = useServerFn(getWeeklyConsumption);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly"],
    queryFn: () => fn(),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consumption").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly"] });
      toast.success("Removed");
    },
    onError: () => toast.error("Couldn't remove that entry."),
  });

  // Group by day for the last 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: Date; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    days.push({
      date: d,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      total: 0,
    });
  }
  const entries = data ?? [];
  for (const e of entries) {
    const ts = new Date(e.consumed_at).setHours(0, 0, 0, 0);
    const day = days.find((d) => d.date.getTime() === ts);
    if (day) day.total += e.calories_kcal ?? 0;
  }
  const weekTotal = days.reduce((s, d) => s + d.total, 0);
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-warning text-warning-foreground">
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">This week</h1>
          <p className="text-sm text-muted-foreground">Calories from the foods you marked as eaten.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">7-day total</div>
            <div className="font-display text-4xl font-bold">{weekTotal.toLocaleString()} <span className="text-base text-muted-foreground">kcal</span></div>
          </div>
          <div className="text-xs text-muted-foreground">avg {Math.round(weekTotal / 7).toLocaleString()} kcal/day</div>
        </div>

        <div className="mt-6 grid grid-cols-7 items-end gap-2 h-40">
          {days.map((d, i) => {
            const h = (d.total / maxDay) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="text-[10px] tabular-nums text-muted-foreground">{d.total || ""}</div>
                <div
                  className="w-full rounded-t-md bg-primary transition-all"
                  style={{ height: `${Math.max(2, h)}%`, minHeight: 2 }}
                  title={`${d.total} kcal`}
                />
                <div className="text-[10px] font-medium text-muted-foreground">{d.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Entries</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && entries.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing logged yet this week.</p>
            <Link to="/scan" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <ScanLine className="h-4 w-4" /> Scan something
            </Link>
          </div>
        )}
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{e.product_name ?? "Unnamed scan"}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.consumed_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold tabular-nums">{e.calories_kcal}</div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
              </div>
              <button
                onClick={() => removeMut.mutate(e.id)}
                disabled={removeMut.isPending}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
