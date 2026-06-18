import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine, History, LogOut, Trophy, User, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/scan" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <ScanLine className="h-4 w-4" />
            </div>
            RAPscanz
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/scan" activeProps={{ className: "bg-muted" }} className="rounded-md px-2 py-2 font-medium hover:bg-muted">
              <ScanLine className="inline h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Scan</span>
            </Link>
            <Link to="/history" activeProps={{ className: "bg-muted" }} className="rounded-md px-2 py-2 font-medium hover:bg-muted">
              <History className="inline h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">History</span>
            </Link>
            <Link to="/weekly" activeProps={{ className: "bg-muted" }} className="rounded-md px-2 py-2 font-medium hover:bg-muted">
              <Flame className="inline h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Weekly</span>
            </Link>
            <Link to="/leaderboard" activeProps={{ className: "bg-muted" }} className="rounded-md px-2 py-2 font-medium hover:bg-muted">
              <Trophy className="inline h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Leaderboard</span>
            </Link>
            <Link to="/profile" activeProps={{ className: "bg-muted" }} className="rounded-md px-2 py-2 font-medium hover:bg-muted">
              <User className="inline h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Profile</span>
            </Link>
            <button onClick={signOut} className="rounded-md px-2 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground" title={email ?? ""}>
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
