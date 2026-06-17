import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeScan, getProfile, type ScanResult } from "@/lib/scan.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, FileText, Barcode, AlertTriangle, ThumbsUp, ThumbsDown, Sparkles, Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan a product — RAPscanz" }] }),
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

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const [tab, setTab] = useState<"ingredients" | "image" | "barcode">("ingredients");
  const [text, setText] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (tab === "ingredients") {
        if (!text.trim()) throw new Error("Paste the ingredient list first.");
        return analyzeFn({ data: { scanType: "ingredients", text } });
      }
      if (tab === "image") {
        if (!imageDataUrl) throw new Error("Upload a photo of the label first.");
        return analyzeFn({ data: { scanType: "ingredients", imageDataUrl } });
      }
      if (!barcode.trim()) throw new Error("Enter a barcode number.");
      return analyzeFn({ data: { scanType: "barcode", barcode: barcode.trim() } });
    },
    onSuccess: (data) => {
      setResult(data.result);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["scans"] });
      toast.success("Scan complete");
    },
    onError: (err: any) => toast.error(err?.message ?? "Scan failed"),
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

  const remaining = profile?.remaining ?? 30;
  const subscribed = profile?.is_subscribed;
  const outOfScans = !subscribed && remaining <= 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Scan a product</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find out what's actually in that packet.
          </p>
        </div>
        <div className={`chip ${subscribed ? "bg-success text-success-foreground" : ""}`}>
          <Sparkles className="h-3 w-3" />
          {subscribed ? "Pro · unlimited" : `${remaining} of 30 free scans left`}
        </div>
      </div>

      {outOfScans && (
        <Card className="mb-6 border-2 border-warning bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-warning-foreground" />
            <div>
              <div className="font-display text-lg font-semibold">You've used all 30 free scans</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Subscribe for <strong className="text-foreground">₹300/year</strong> to keep scanning.
                Payments will be enabled soon — we'll let you know.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ingredients"><FileText className="mr-2 h-4 w-4" /> Text</TabsTrigger>
            <TabsTrigger value="image"><Camera className="mr-2 h-4 w-4" /> Photo</TabsTrigger>
            <TabsTrigger value="barcode"><Barcode className="mr-2 h-4 w-4" /> Barcode</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="mt-4">
            <Textarea
              placeholder="Paste the ingredient list from the back of the packet…"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="image" className="mt-4">
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
              placeholder="e.g. 8901058851234"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              We'll look this up in the Open Food Facts database.
            </p>
          </TabsContent>
        </Tabs>

        <Button
          className="mt-5 w-full"
          size="lg"
          disabled={mutation.isPending || outOfScans}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Analyzing…" : "Scan & analyze"}
        </Button>
      </Card>

      {result && (
        <div className="mt-8 space-y-5">
          <Card className="overflow-hidden p-0">
            <div className={`px-6 py-4 ${RATING_STYLES[result.rating]?.bg ?? "bg-muted"}`}>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {RATING_STYLES[result.rating]?.label ?? result.rating}
              </div>
              <div className="font-display text-2xl font-bold">{result.productName}</div>
            </div>
            <div className="p-6">
              <p className="text-base">{result.summary}</p>
            </div>
          </Card>

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

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-warning" /> Chemical & ingredient cautions
            </div>
            {result.cautions.length ? (
              <ul className="divide-y divide-border">
                {result.cautions.map((c, i) => (
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
      )}
    </main>
  );
}
