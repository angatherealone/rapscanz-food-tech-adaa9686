## What's wrong today

The trial buttons on the pricing cards already give you 2 "free Pro / Pro+ / Pro Max scan" credits, but those credits only get used **after** your normal Free scans run out (when you hit 10/10). So a free user with scans still remaining can't actually try the higher tier — and when they do try, the upgrade pop-ups (Safe consumption guide PRO+, Body-impact map Pro Max) still show as locked.

I'll make trial credits usable on demand and show people what each trial actually unlocks.

## Changes

**1. Backend — opt-in trial consumption**
- Extend `consume_scan_quota` so the scan endpoint can request a specific trial tier ("use my Pro Max trial on this scan"). When a valid trial credit exists, it's consumed first; otherwise we fall back to normal quota.
- `analyzeScan` accepts an optional `useTrialTier` and passes it through.

**2. Scan page — "Use trial on this scan" chooser**
- Above the **Scan & analyze** button, when the user has any trial credits, show a row of pill buttons:
  - `Use Pro trial (1 left)` — unlocks % cautions
  - `Use Pro+ trial (1 left)` — unlocks Safe consumption guide
  - `Use Pro Max trial (2 left)` — unlocks risk profile, body-impact map, dietary classification
- Picking one previews the unlocked features in a small "You'll see on this scan:" panel, then runs the scan at that tier. The result then shows all higher-tier sections unlocked instead of the upgrade prompts.

**3. Pricing-page trial buttons — show what unlocks**
- Each tier's trial section gets a tiny bullet list of what the user gets to see when they use it (e.g. for Pro Max: "Body-impact map · Risk profile · Veg/Non-veg classification"), so the buttons explain themselves before being clicked.

## Files

- `supabase/migrations/<new>.sql` — replace `consume_scan_quota` with the `_prefer_tier` variant.
- `src/lib/scan.functions.ts` — pass `useTrialTier` to the RPC; widen `ScanInput`.
- `src/routes/_authenticated/scan.tsx` — trial chooser UI + feature preview.
- `src/components/TrialButtons.tsx` — short "what you unlock" list under each tier's buttons.

Scan limits (Free 10 / Pro 20 / Pro+ 30 / Pro Max 40) and the 2-per-tier trial cap stay the same.
