import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RAPscanz" },
      { name: "description", content: "Set your public username for the RAPscanz leaderboard." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", u.user.id)
        .maybeSingle();
      setUsername(data?.username ?? "");
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      toast.error("Username must be 3–20 characters, letters/numbers/underscore only.");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("That username is taken.");
      else toast.error("Couldn't save username.");
      return;
    }
    toast.success("Username saved!");
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Your public name on the leaderboard.</p>
        </div>
      </div>

      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6">
        <label htmlFor="username" className="text-sm font-medium">Username</label>
        <div className="mt-2 flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground">@</span>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="your_name"
            maxLength={20}
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">3–20 characters. Letters, numbers, and underscores.</p>
        <button
          type="submit"
          disabled={saving || loading}
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}
