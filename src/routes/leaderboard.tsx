import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";
import { Trophy, ScanLine, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — RAPscanz" },
      { name: "description", content: "Top RAPscanz users ranked by the average health score of the foods they scan." },
      { property: "og:title", content: "RAPscanz Leaderboard" },
      { property: "og:description", content: "Who's eating the healthiest? Top users ranked by average scan health score." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = LeaderboardRow;

function LeaderboardPage() {
  const fetchLeaderboard = useServerFn(getLeaderboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLeaderboard(),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <ScanLine className="h-4 w-4" />
            </div>
            RAPscanz
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top users by average health score (min. 3 scans).</p>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading rankings…</p>}
        {error && <p className="text-danger">Couldn't load the leaderboard.</p>}

        {data && data.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No qualifying users yet. Be the first — set a username and scan some food!</p>
            <Link to="/auth" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Sign in to play
            </Link>
          </div>
        )}

        {data && data.length > 0 && (
          <ol className="space-y-2">
            {data.map((row, i) => {
              const rank = i + 1;
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              return (
                <li
                  key={row.username}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="w-8 text-center font-display text-lg font-bold text-muted-foreground">
                    {medal ?? `#${rank}`}
                  </div>
                  <div className="flex-1 truncate font-medium">@{row.username}</div>
                  <div className="text-right">
                    <div className="font-display text-xl font-bold text-primary">{row.avg_score}</div>
                    <div className="text-xs text-muted-foreground">{row.scan_count} scans</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
