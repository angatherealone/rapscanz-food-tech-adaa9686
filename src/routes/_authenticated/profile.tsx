import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RAPscanz" },
      { name: "description", content: "Set your username and health info so RAPscanz can tailor advice to you." },
    ],
  }),
  component: ProfilePage,
});

type Form = {
  username: string;
  gender: string;
  weight_kg: string;
  height_cm: string;
  illnesses: string;
  allergies: string;
};

const empty: Form = { username: "", gender: "", weight_kg: "", height_cm: "", illnesses: "", allergies: "" };

function bmi(w: string, h: string) {
  const wn = Number(w), hn = Number(h);
  if (!wn || !hn) return null;
  const m = hn / 100;
  return wn / (m * m);
}

function ProfilePage() {
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, weight_kg, height_cm, illnesses, allergies, gender")
        .eq("id", u.user.id)
        .maybeSingle();
      const d = (data ?? {}) as any;
      setForm({
        username: d.username ?? "",
        gender: d.gender ?? "",
        weight_kg: d.weight_kg?.toString() ?? "",
        height_cm: d.height_cm?.toString() ?? "",
        illnesses: d.illnesses ?? "",
        allergies: d.allergies ?? "",
      });
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof Form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.username && !/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      toast.error("Username must be 3–20 chars (letters, numbers, underscore).");
      return;
    }
    const w = form.weight_kg ? Number(form.weight_kg) : null;
    const h = form.height_cm ? Number(form.height_cm) : null;
    if (w !== null && (isNaN(w) || w <= 0 || w >= 500)) return toast.error("Enter a valid weight in kg.");
    if (h !== null && (isNaN(h) || h <= 0 || h >= 300)) return toast.error("Enter a valid height in cm.");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      username: form.username || null,
      gender: form.gender || null,
      weight_kg: w,
      height_cm: h,
      illnesses: form.illnesses.slice(0, 500) || null,
      allergies: form.allergies.slice(0, 500) || null,
    } as any).eq("id", u.user.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("That username is taken.");
      else toast.error("Couldn't save profile.");
      return;
    }
    toast.success("Profile saved!");
  }

  const userBmi = bmi(form.weight_kg, form.height_cm);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Your profile</h1>
          <p className="text-sm text-muted-foreground">Used for the leaderboard and personalised scan advice.</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Display name</h2>
          <label htmlFor="username" className="text-sm font-medium">Username</label>
          <div className="mt-2 flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="pl-3 text-muted-foreground">@</span>
            <input
              id="username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              disabled={loading}
              placeholder="your_name"
              maxLength={20}
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">3–20 chars. Shown on the public leaderboard.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-danger" />
            <h2 className="font-display text-lg font-semibold">Health info</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Optional but recommended — we use this to personalise the advice on each scan.
            Stored privately; never shown on the leaderboard.
          </p>

          <div className="mb-4">
            <label htmlFor="gender" className="text-sm font-medium">Gender</label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              disabled={loading}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="weight_kg" className="text-sm font-medium">Weight (kg)</label>
              <input
                id="weight_kg" type="number" step="0.1" min="0" max="500"
                value={form.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="height_cm" className="text-sm font-medium">Height (cm)</label>
              <input
                id="height_cm" type="number" step="0.1" min="0" max="300"
                value={form.height_cm}
                onChange={(e) => set("height_cm", e.target.value)}
                disabled={loading}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {userBmi && (
            <p className="mt-3 text-xs text-muted-foreground">
              BMI: <span className="font-semibold text-foreground">{userBmi.toFixed(1)}</span>
            </p>
          )}

          <div className="mt-4">
            <label htmlFor="illnesses" className="text-sm font-medium">Conditions / illnesses</label>
            <textarea
              id="illnesses" rows={2} maxLength={500}
              value={form.illnesses}
              onChange={(e) => set("illnesses", e.target.value)}
              disabled={loading}
              placeholder="e.g. diabetes, hypertension, PCOS, lactose intolerance"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="allergies" className="text-sm font-medium">Allergies</label>
            <textarea
              id="allergies" rows={2} maxLength={500}
              value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              disabled={loading}
              placeholder="e.g. peanuts, gluten, soy"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
