import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeScan, getProfile, logConsumption, type ScanResult } from "@/lib/scan.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, FileText, Barcode, AlertTriangle, ThumbsUp, ThumbsDown, Sparkles, Upload, X, Flame, Utensils, Heart, PersonStanding, Store, Trash2, Lock } from "lucide-react";
import { HealthScore } from "@/components/HealthScore";
import { BodyDamageMap } from "@/components/BodyDamageMap";
import { ScanFeedback } from "@/components/ScanFeedback";
import { MiniScannerLoader } from "@/components/MiniScannerLoader";
import bodyTeaserImg from "@/assets/body-map-teaser.jpg";
import { Link } from "@tanstack/react-router";


// ---- Local / in-store barcode (GS1 Restricted Distribution Numbers) ----
// Prefixes 02, 20-29, and 04, 40-49 are reserved for in-store / private-label use
// and are NOT registered in global GS1 product databases — Open Food Facts /
// UPCitemdb will always 404 on them. Handle entirely client-side.
type LocalItem = { name: string; price?: string; weight?: string; savedAt: number };
const LOCAL_KEY = "rapscanz.localBarcodes.v1";

function isLocalBarcode(code: string): boolean {
  if (!/^\d{8,14}$/.test(code)) return false;
  // EAN-13 prefixes 20-29 (restricted distribution / in-store)
  return /^2\d/.test(code);
}
function loadLocalDb(): Record<string, LocalItem> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function saveLocalDb(db: Record<string, LocalItem>) {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); } catch {}
}

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a product — RAPscanz" },
      { name: "description", content: "Paste ingredients, upload a label photo, or scan a barcode to get an instant breakdown of advantages, disadvantages, and chemical cautions." },
      { property: "og:title", content: "Scan a product — RAPscanz" },
      { property: "og:description", content: "Get an instant health score, advantages, disadvantages, and chemical cautions for any packaged food." },
      { name: "twitter:title", content: "Scan a product — RAPscanz" },
      { name: "twitter:description", content: "Get an instant health score, advantages, disadvantages, and chemical cautions for any packaged food." },
    ],
  }),
  component: ScanPage,
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

function ScanPage() {
  const qc = useQueryClient();
  const profileFn = useServerFn(getProfile);
  const analyzeFn = useServerFn(analyzeScan);
  const logFn = useServerFn(logConsumption);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const [tab, setTab] = useState<"ingredients" | "image" | "barcode">("ingredients");
  const [text, setText] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanPlan, setScanPlan] = useState<string>("free");
  const [logged, setLogged] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Local/in-store barcode state
  const [, setLocalDb] = useState<Record<string, LocalItem>>({});
  const [localItem, setLocalItem] = useState<{ code: string; item: LocalItem } | null>(null);
  const [localPrompt, setLocalPrompt] = useState<string | null>(null); // barcode awaiting naming
  const [localForm, setLocalForm] = useState<{ name: string; price: string; weight: string }>({ name: "", price: "", weight: "" });

  useEffect(() => { setLocalDb(loadLocalDb()); }, []);

  function handleLocalBarcode(code: string) {
    const db = loadLocalDb();
    setLocalDb(db);
    if (db[code]) {
      setLocalItem({ code, item: db[code] });
      setResult(null);
      setScanId(null);
      toast.success("Recognized your saved local item");
      return;
    }
    setLocalForm({ name: "", price: "", weight: "" });
    setLocalPrompt(code);
  }

  function saveLocalItem() {
    if (!localPrompt) return;
    const name = localForm.name.trim();
    if (!name) { toast.error("Give this item a name."); return; }
    const item: LocalItem = {
      name,
      price: localForm.price.trim() || undefined,
      weight: localForm.weight.trim() || undefined,
      savedAt: Date.now(),
    };
    const db = { ...loadLocalDb(), [localPrompt]: item };
    saveLocalDb(db);
    setLocalDb(db);
    setLocalItem({ code: localPrompt, item });
    setLocalPrompt(null);
    setResult(null);
    setScanId(null);
    toast.success("Saved to your local inventory");
  }

  function deleteLocalItem(code: string) {
    const db = { ...loadLocalDb() };
    delete db[code];
    saveLocalDb(db);
    setLocalDb(db);
    setLocalItem(null);
    toast.success("Removed from local inventory");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setLogged(false);
      if (tab === "ingredients") {
        if (!text.trim()) throw new Error("Paste the ingredient list first.");
        return analyzeFn({ data: { scanType: "ingredients", text } });
      }
      if (tab === "image") {
        if (!imageDataUrl) throw new Error("Upload a photo of the label first.");
        return analyzeFn({ data: { scanType: "ingredients", imageDataUrl } });
      }
      const code = barcode.trim();
      if (!code) throw new Error("Enter a barcode number.");
      if (isLocalBarcode(code)) {
        // Bypass global API entirely — handled client-side.
        handleLocalBarcode(code);
        return null as any;
      }
      return analyzeFn({ data: { scanType: "barcode", barcode: code } });
    },
    onSuccess: (data) => {
      if (!data) return; // local barcode (direct-tab) path
      // Photo OCR detected a barcode that's a GS1 local/in-store code → hand off to local inventory UI.
      if ((data as any).localBarcode) {
        const code: string = (data as any).localBarcode;
        toast.success(`Barcode ${code} read from photo — looks like a local/in-store item`);
        handleLocalBarcode(code);
        qc.invalidateQueries({ queryKey: ["profile"] });
        return;
      }
      setLocalItem(null);
      setResult(data.result);
      setScanId(data.scanId);
      setScanPlan((data as any).plan ?? "free");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["scans"] });

      toast.success(
        (data.result as any)?.productName && tab === "image"
          ? "Photo scanned — barcode detected & analyzed"
          : "Scan complete"
      );
    },
    onError: (err: any) => toast.error(err?.message ?? "Scan failed"),
  });

  const logMut = useMutation({
    mutationFn: async () => {
      if (!scanId) throw new Error("No scan to log.");
      return logFn({ data: { scanId } });
    },
    onSuccess: () => {
      setLogged(true);
      qc.invalidateQueries({ queryKey: ["weekly"] });
      toast.success("Added to this week's log");
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't log this."),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  const scanLimit = (profile as any)?.scanLimit ?? 30;
  const remaining = profile?.remaining ?? scanLimit;
  const planLabel = (profile as any)?.planLabel ?? "Free";
  const isUnlimited = (profile as any)?.isUnlimited === true || planLabel === "Unlimited";
  const outOfScans = !isUnlimited && remaining <= 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Scan a product</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find out what's actually in that packet.
          </p>
        </div>
        <div className={`chip ${planLabel !== "Free" ? "bg-success text-success-foreground" : ""}`}>
          <Sparkles className="h-3 w-3" />
          {isUnlimited ? `${planLabel} · Unlimited scans` : `${planLabel} · ${remaining} of ${scanLimit} scans left`}
        </div>
      </div>


      {outOfScans && (
        <Card className="mb-6 border-2 border-warning bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-warning-foreground" />
            <div>
              <div className="font-display text-lg font-semibold">You've used all your scans</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade to <strong className="text-foreground">Pro (₹200/mo · 60)</strong>,{" "}
                <strong className="text-foreground">Pro+ (₹500/mo · 120)</strong> or{" "}
                <strong className="text-foreground">Pro Max (₹1200/mo · 240 + 3D body-damage map)</strong> to keep scanning.
                Payments will be enabled soon — we'll let you know.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div
          onKeyDown={(e) => {
            // Press Enter to scan & analyze on any tab (Shift+Enter still adds a newline in the textarea).
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            const target = e.target as HTMLElement;
            const isTextarea = target.tagName === "TEXTAREA";
            if (isTextarea) e.preventDefault();
            if (mutation.isPending || outOfScans) return;
            mutation.mutate();
          }}
        >
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ingredients"><FileText className="mr-2 h-4 w-4" /> Text</TabsTrigger>
            <TabsTrigger value="image"><Camera className="mr-2 h-4 w-4" /> Photo</TabsTrigger>
            <TabsTrigger value="barcode"><Barcode className="mr-2 h-4 w-4" /> Barcode</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="mt-4">
            <Textarea
              placeholder="Paste the ingredient list from the back of the packet…  (Enter to scan, Shift+Enter for newline)"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="image" className="mt-4" tabIndex={0}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPickFile} />
            {imageDataUrl ? (
              <div className="relative">
                <img src={imageDataUrl} alt="Label preview" className="max-h-64 w-full rounded-lg border border-border object-contain bg-muted" />
                <button
                  onClick={() => setImageDataUrl(null)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 hover:bg-background"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="mt-2 text-xs text-muted-foreground">Press Enter to scan & analyze. If a barcode is visible on the pack or receipt, we'll OCR it and look it up like a direct barcode scan.</p>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 p-10 text-sm text-muted-foreground hover:bg-muted"
              >
                <Upload className="h-6 w-6" />
                Tap to take a photo or upload the food label
              </button>
            )}
          </TabsContent>

          <TabsContent value="barcode" className="mt-4">
            <Input
              placeholder="e.g. 8901058851234  (Enter to scan)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\s+/g, "").replace(/\D/g, ""))}
              inputMode="numeric"
            />
            {isLocalBarcode(barcode) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                <div>
                  <div className="font-semibold text-foreground">Local / in-store barcode detected</div>
                  <div className="text-muted-foreground">
                    GS1 prefix 20–29 is reserved for supermarket/loose-item labels and isn't in any global product database. We'll look it up in your local inventory instead — no scan credit used.
                  </div>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              EAN-8, UPC-A, EAN-13 or ITF-14. We strip spaces, auto-retry 12-digit UPCs as 13-digit EANs, then look it up across Open Food Facts and UPCitemdb — including Indian, Egyptian & international brands. If the databases come up empty, our AI Registry Lookup uses the full GS1 country + manufacturer prefix to pin the exact parent company and sister brand.
            </p>

          </TabsContent>

        </Tabs>

        <Button
          className="mt-5 w-full"
          size="lg"
          disabled={mutation.isPending || (outOfScans && !(tab === "barcode" && isLocalBarcode(barcode)))}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? (tab === "barcode" ? "Looking up barcode & consulting AI registry…" : "Analyzing…")
            : (tab === "barcode" && isLocalBarcode(barcode) ? "Look up local item" : "Scan & analyze")}
        </Button>

        </div>
      </Card>

      {mutation.isPending && (
        <Card className="mt-6 p-5">
          <MiniScannerLoader
            label={tab === "barcode" ? "Looking up barcode & consulting AI registry…" : "Analyzing your scan…"}
          />
        </Card>
      )}


      {localItem && (
        <Card className="mt-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning-foreground">
                <Store className="h-3 w-3" /> Local inventory item
              </div>
              <div className="font-display text-2xl font-bold">{localItem.item.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Barcode <span className="font-mono">{localItem.code}</span>
                {localItem.item.price && <span> · {localItem.item.price}</span>}
                {localItem.item.weight && <span> · {localItem.item.weight}</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Saved on this device. Re-scanning <span className="font-mono">{localItem.code}</span> will recognize it instantly — no scan credit used.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteLocalItem(localItem.code)} className="gap-1 text-danger hover:text-danger">
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={!!localPrompt} onOpenChange={(o) => { if (!o) setLocalPrompt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-warning-foreground" /> Local / in-store barcode detected</DialogTitle>
            <DialogDescription>
              Barcode <span className="font-mono">{localPrompt}</span> looks like a supermarket or loose-item label (GS1 restricted prefix 20–29). It isn't in any global product database. Name it once and we'll recognize it instantly next time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="li-name">Item name</Label>
              <Input id="li-name" placeholder="e.g. Loose bananas, Deli sandwich" value={localForm.name} onChange={(e) => setLocalForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-price">Price (optional)</Label>
                <Input id="li-price" placeholder="₹120" value={localForm.price} onChange={(e) => setLocalForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-weight">Weight / size (optional)</Label>
                <Input id="li-weight" placeholder="500 g" value={localForm.weight} onChange={(e) => setLocalForm((f) => ({ ...f, weight: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalPrompt(null)}>Cancel</Button>
            <Button onClick={saveLocalItem}>Save to local inventory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result && (

        <div className="mt-8 space-y-5">
          <Card className="overflow-hidden p-0">
            <div className={`px-6 py-4 ${RATING_STYLES[result.rating]?.bg ?? "bg-muted"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    {RATING_STYLES[result.rating]?.label ?? result.rating}
                  </div>
                  <div className="font-display text-2xl font-bold">{result.productName}</div>
                  {(result.brand || result.parentCompany || result.category) && (
                    <div className="mt-1 text-xs opacity-90">
                      {result.brand && <span className="font-semibold">{result.brand}</span>}
                      {result.brand && result.parentCompany && <span> · </span>}
                      {result.parentCompany && <span>by {result.parentCompany}</span>}
                      {result.category && <span className="ml-2 opacity-75">· {result.category}</span>}
                    </div>
                  )}
                  {result.dietaryType && result.dietaryType !== "unknown" && (scanPlan === "pro_max" || scanPlan === "unlimited") && (() => {
                    const dt = result.dietaryType;
                    const styles =
                      dt === "vegan"   ? { dot: "bg-emerald-500", ring: "ring-emerald-500/60", label: "VEGAN" } :
                      dt === "veg"     ? { dot: "bg-green-500",   ring: "ring-green-500/60",   label: "VEG" } :
                                         { dot: "bg-red-600",     ring: "ring-red-600/60",     label: "NON-VEG" };
                    return (
                      <div className={`mt-2 inline-flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground ring-2 ${styles.ring}`}>
                        <span className={`inline-block h-2.5 w-2.5 rounded-sm ${styles.dot}`} aria-hidden />
                        {styles.label}
                      </div>
                    );
                  })()}
                  {result.aiRegistryFallback && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-background/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-background/40">
                      <Sparkles className="h-3 w-3" />
                      Identified via AI Registry Lookup
                    </div>
                  )}

                </div>
                <HealthScore score={result.healthScore} />
              </div>
            </div>
            <div className="p-6">
              <p className="text-base">{result.summary}</p>
              {result.personalAdvice && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div><span className="font-semibold">For you: </span>{result.personalAdvice}</div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-foreground">
                  <Flame className="h-4 w-4 text-warning-foreground" />
                  ~{result.caloriesKcal} kcal <span className="font-normal text-muted-foreground">per serving</span>
                </div>
                <Button
                  onClick={() => logMut.mutate()}
                  disabled={!scanId || logged || logMut.isPending}
                  variant={logged ? "outline" : "default"}
                  size="sm"
                  className="gap-2"
                >
                  <Utensils className="h-4 w-4" />
                  {logged ? "Added to this week" : logMut.isPending ? "Adding…" : "I ate this"}
                </Button>
              </div>
            </div>
          </Card>

          {result.dietaryType && (() => {
            const dt = result.dietaryType;
            const cfg =
              dt === "vegan"   ? { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/40", label: "Vegan",     blurb: "Entirely plant-based — no dairy, no honey, no egg, no animal-derived additives." } :
              dt === "veg"     ? { dot: "bg-green-500",   text: "text-green-600 dark:text-green-400",     border: "border-green-500/40",   label: "Vegetarian", blurb: "Plant-based with permitted dairy ingredients. Contains no meat, fish, egg, or animal-derived additives." } :
              dt === "non-veg" ? { dot: "bg-red-600",     text: "text-red-600 dark:text-red-400",         border: "border-red-600/40",     label: "Non-Vegetarian", blurb: "Contains animal-derived ingredients (meat, fish, egg, gelatin, or similar)." } :
                                 { dot: "bg-muted-foreground", text: "text-muted-foreground", border: "border-border", label: "Unknown", blurb: "Couldn't determine the dietary classification with confidence." };
            return (
              <Card className={`overflow-hidden border-2 ${cfg.border} p-0`}>
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-2 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Dietary classification
                  <span className="chip ml-auto bg-primary/15 text-primary">Pro Max</span>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg border-2 ${cfg.border} bg-background`}>
                    <span className={`h-6 w-6 rounded-sm ${cfg.dot}`} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-display text-2xl font-bold ${cfg.text}`}>{cfg.label}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.dietaryReason || cfg.blurb}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })()}

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <ThumbsUp className="h-5 w-5 text-success" /> Advantages
              </div>
              <ul className="space-y-2 text-sm">
                {result.advantages.length ? result.advantages.map((a, i) => (
                  <li key={i} className="flex gap-2"><span className="text-success">+</span>{a}</li>
                )) : <li className="text-muted-foreground">None notable.</li>}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <ThumbsDown className="h-5 w-5 text-danger" /> Disadvantages
              </div>
              <ul className="space-y-2 text-sm">
                {result.disadvantages.length ? result.disadvantages.map((d, i) => (
                  <li key={i} className="flex gap-2"><span className="text-danger">−</span>{d}</li>
                )) : <li className="text-muted-foreground">None notable.</li>}
              </ul>
            </Card>
          </div>

          {result.consumptionTip && (result.consumptionTip.safeDaily || result.consumptionTip.limit) && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <Heart className="h-5 w-5 text-primary" /> Safe consumption guide
                <span className="chip ml-auto bg-primary/15 text-primary">Pro+</span>
              </div>
              <div className="space-y-2 text-sm">
                {result.consumptionTip.safeDaily && (
                  <div className="flex gap-2"><span className="font-semibold text-success">Safe / day:</span><span>{result.consumptionTip.safeDaily}</span></div>
                )}
                {result.consumptionTip.limit && (
                  <div className="flex gap-2"><span className="font-semibold text-danger">Upper limit:</span><span>{result.consumptionTip.limit}</span></div>
                )}
                {result.consumptionTip.source && (
                  <div className="text-xs text-muted-foreground">Source: {result.consumptionTip.source}</div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-warning" /> Chemical & ingredient cautions
            </div>
            {result.cautions.length ? (
              <ul className="divide-y divide-border">
                {result.cautions.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold">{c.ingredient}</span>
                        {c.percentage && (
                          <span className="rounded bg-warning/15 px-1.5 py-0.5 font-mono text-xs font-bold text-warning-foreground">
                            {c.percentage}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{c.concern}</div>
                      {(c.chemicalFormula || c.scientificName) && (
                        <div className="mt-1 space-y-0.5 text-xs">
                          {c.chemicalFormula && (
                            <div className="font-mono text-primary">⚗ {c.chemicalFormula}</div>
                          )}
                          {c.scientificName && (
                            <div className="italic text-muted-foreground">{c.scientificName}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`chip ${SEVERITY_BADGE[c.severity] ?? ""}`}>{c.severity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No flagged chemicals. 🎉</p>
            )}
          </Card>

          {result.riskProfile &&
            (result.riskProfile.illnesses.length +
              result.riskProfile.addictions.length +
              result.riskProfile.chronicDamage.length +
              result.riskProfile.temporaryEffects.length +
              result.riskProfile.organDamage.length) > 0 && (
            <Card className="p-5">
              <div className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
                <AlertTriangle className="h-5 w-5 text-danger" /> What over-consumption can cause
                <span className="chip ml-auto bg-primary/15 text-primary">Pro Max</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Honest, science-based picture of what happens when this product is eaten well above the safe daily amount, regularly.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Illnesses & conditions", items: result.riskProfile.illnesses, color: "text-danger", dot: "bg-danger" },
                  { title: "Addiction patterns", items: result.riskProfile.addictions, color: "text-warning-foreground", dot: "bg-warning" },
                  { title: "Chronic (long-term) damage", items: result.riskProfile.chronicDamage, color: "text-danger", dot: "bg-danger" },
                  { title: "Temporary effects", items: result.riskProfile.temporaryEffects, color: "text-accent-foreground", dot: "bg-accent" },
                  { title: "Organ-specific damage", items: result.riskProfile.organDamage, color: "text-danger", dot: "bg-danger" },
                ].filter((b) => b.items.length > 0).map((b, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className={`mb-2 text-xs font-bold uppercase tracking-wider ${b.color}`}>{b.title}</div>
                    <ul className="space-y-1.5 text-sm">
                      {b.items.map((it, j) => (
                        <li key={j} className="flex gap-2">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`} />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(() => {
            const isProMax = scanPlan === "pro_max" || scanPlan === "unlimited";
            const damageItems = result.bodyDamage ?? [];
            const benefitItems = result.bodyBenefit ?? [];
            const hasDamage = damageItems.length > 0;
            const hasBenefit = benefitItems.length > 0;
            // Body-impact map is shown on EVERY scan — even when neither array
            // has organs flagged we still render the silhouettes so the user
            // gets the same visual feedback for every product they scan.

            // Locked teaser for non-Pro Max users — always present on every scan.
            if (!isProMax) {
              return (
                <Card className="overflow-hidden p-5">
                  <div className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
                    <PersonStanding className="h-5 w-5 text-primary" /> Body-impact map
                    <span className="chip ml-auto bg-primary/15 text-primary">Pro Max</span>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    See exactly which organs are harmed and which ones benefit from this product, with severity per organ.
                  </p>
                  <div className="relative overflow-hidden rounded-xl border border-border bg-black/40">
                    <img
                      src={bodyTeaserImg}
                      alt="Locked body-impact map preview"
                      loading="lazy"
                      width={768}
                      height={1024}
                      className="h-auto w-full opacity-70"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/30 via-background/60 to-background/85 p-6 text-center">
                      <Lock className="h-10 w-10 text-primary" />
                      <div className="font-display text-lg font-semibold">Pro Max feature</div>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Unlock the interactive organ-by-organ breakdown for every product you scan.
                      </p>
                      <Link to="/profile">
                        <Button size="sm" className="mt-1">Upgrade to Pro Max</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            }

            // Pro Max: ALWAYS render both figures side-by-side, on every scan.
            return (
              <Card className="p-5">
                <div className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
                  <PersonStanding className="h-5 w-5 text-primary" /> Body-impact map
                  <span className="chip ml-auto bg-primary/15 text-primary">Pro Max</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Exact anatomical view of which organs this product affects. Tap any glowing organ for details.
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
                      <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                      Harms — organs at risk
                    </div>
                    {hasDamage ? (
                      <BodyDamageMap items={damageItems} variant="damage" />
                    ) : (
                      <div>
                        <BodyDamageMap items={[]} variant="damage" />
                        <p className="mt-3 text-center text-sm text-muted-foreground">
                          No specific organ harm detected for this product.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
                      <span className="inline-block h-2 w-2 rounded-full bg-success" />
                      Benefits — organs that gain
                    </div>
                    {hasBenefit ? (
                      <BodyDamageMap items={benefitItems} variant="benefit" />
                    ) : (
                      <div>
                        <BodyDamageMap items={[]} variant="benefit" />
                        <p className="mt-3 text-center text-sm text-muted-foreground">
                          No specific organ benefit detected for this product.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}



          {scanId && (
            <ScanFeedback
              scanId={scanId}
              onAfterSubmit={() => {
                setResult(null);
                setScanId(null);
                setLogged(false);
                setLocalItem(null);
                setText("");
                setImageDataUrl(null);
                setBarcode("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

        </div>
      )}
    </main>
  );
}
