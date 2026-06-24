import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getProfile, claimTrialScan } from "@/lib/scan.functions";

type Tier = "pro" | "pro_plus" | "pro_max";

const TIER_LABEL: Record<Tier, string> = {
  pro: "Pro",
  pro_plus: "Pro+",
  pro_max: "Pro Max",
};

const TIER_UNLOCKS: Record<Tier, string[]> = {
  pro: ["Estimated % per additive", "Body-impact map"],
  pro_plus: ["Safe consumption guide (WHO/FDA limits)", "% per additive", "Body-impact map"],
  pro_max: [
    "Body-impact map (organ-by-organ)",
    "Over-consumption risk profile",
    "Veg / Non-veg / Vegan classification",
    "Safe consumption guide",
    "% + chemical formula + scientific name per additive",
  ],
};

const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  pro_max: 3,
  unlimited: 99,
};

/**
 * Trial buttons shown under a pricing card. Each card represents a paid tier;
 * if the signed-in user's plan is strictly below that tier, they see 2
 * "Free scan as <Tier>" buttons (already-claimed ones become greyed out).
 *
 * Free / unauthenticated users see all three sets. Pro users see only Pro+ and
 * Pro Max sets. Pro+ users see only Pro Max set. Pro Max / Unlimited users
 * see nothing.
 */
export function TrialButtons({ tier }: { tier: Tier }) {
  const qc = useQueryClient();
  const profileFn = useServerFn(getProfile);
  const claimFn = useServerFn(claimTrialScan);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileFn(),
    retry: false,
  });

  const claim = useMutation({
    mutationFn: (t: Tier) => claimFn({ data: { tier: t } }),
    onSuccess: (res) => {
      toast.success(`Free ${TIER_LABEL[res.tier as Tier]} scan unlocked — use it on your next scan.`);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't claim trial scan."),
  });

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading trial offers…
      </div>
    );
  }

  // Guest fallback or load failure → invite sign-in.
  if (isError || !profile || (profile as any).isGuest) {
    return (
      <Link
        to="/auth"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
      >
        <Gift className="h-3.5 w-3.5" /> Sign in to access {TIER_LABEL[tier]} (2 free)
      </Link>
    );
  }

  const userPlan = (profile as any).plan ?? "free";
  const userRank = TIER_RANK[userPlan] ?? 0;
  const tierRank = TIER_RANK[tier];

  // Tier must be strictly above user's plan.
  if (tierRank <= userRank) return null;

  const cap = (profile as any).trialCap ?? 2;
  const claimed = ((profile as any).trialClaimed ?? {})[tier] ?? 0;
  const remaining = ((profile as any).trialRemaining ?? {})[tier] ?? 0;
  const slotsLeft = Math.max(0, cap - claimed);

  const locked = slotsLeft === 0;

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        disabled={locked || claim.isPending}
        onClick={() => !locked && claim.mutate(tier)}
        className={
          locked
            ? "flex w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
            : "flex w-full items-center justify-between rounded-md border border-green-600 bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
        }
      >
        <span className="flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5" />
          {locked ? `Access ${TIER_LABEL[tier]} — upgrade to unlock` : `Access ${TIER_LABEL[tier]}`}
        </span>
        <span className={locked ? "rounded-full bg-background/60 px-1.5 py-0.5 text-[10px]" : "rounded-full bg-white/25 px-1.5 py-0.5 text-[10px]"}>
          {locked ? "0 / 2 left" : `${slotsLeft} / ${cap} left`}
        </span>
      </button>
      <div className="rounded-md border border-dashed border-green-600/40 bg-green-600/5 px-2.5 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
          {TIER_LABEL[tier]} unlocks per access
        </div>
        <ul className="mt-1 space-y-0.5">
          {TIER_UNLOCKS[tier].map((u) => (
            <li key={u} className="flex gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-green-600">✓</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
        {remaining > 0 ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Spend it on the <strong className="text-foreground">Scan</strong> page — pick "Use {TIER_LABEL[tier]} trial" above the scan button.
          </p>
        ) : null}
      </div>
    </div>
  );
}
