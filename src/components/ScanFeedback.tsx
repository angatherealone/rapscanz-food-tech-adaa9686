import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, MessageSquare, CheckCircle2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { getScanFeedback, saveScanFeedback } from "@/lib/feedback.functions";

type BuyAgain = "yes" | "maybe" | "no";

const POLL_OPTIONS: { value: BuyAgain; label: string; emoji: string }[] = [
  { value: "yes", label: "Yes", emoji: "👍" },
  { value: "maybe", label: "Maybe", emoji: "🤔" },
  { value: "no", label: "No", emoji: "👎" },
];

export function ScanFeedback({
  scanId,
  onAfterSubmit,
}: {
  scanId: string;
  onAfterSubmit?: () => void;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getScanFeedback);
  const saveFn = useServerFn(saveScanFeedback);

  const { data: existing } = useQuery({
    queryKey: ["scan-feedback", scanId],
    queryFn: () => getFn({ data: { scanId } }),
  });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [buyAgain, setBuyAgain] = useState<BuyAgain | null>(null);
  const [comment, setComment] = useState("");
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setRating(existing.rating);
    setBuyAgain(existing.buyAgain);
    setComment(existing.comment ?? "");
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error("Please tap a star rating.");
      if (!buyAgain) throw new Error("Pick a poll option.");
      return saveFn({
        data: {
          scanId,
          rating,
          buyAgain,
          comment: comment.trim() ? comment.trim() : undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scan-feedback", scanId] });
      setShowThanks(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save feedback"),
  });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
        <MessageSquare className="h-5 w-5 text-primary" /> Rate this product
        {existing && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Your honest take helps you remember what worked and powers smarter suggestions.
      </p>

      {/* Stars */}
      <div className="mb-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your rating
        </div>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="rounded-md p-1 transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-7 w-7 ${active ? "fill-warning text-warning" : "text-muted-foreground"}`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm font-semibold">{rating}/5</span>
          )}
        </div>
      </div>

      {/* Poll */}
      <div className="mb-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Would you buy this again?
        </div>
        <div className="grid grid-cols-3 gap-2">
          {POLL_OPTIONS.map((opt) => {
            const active = buyAgain === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBuyAgain(opt.value)}
                className={`rounded-lg border p-3 text-sm font-semibold transition ${
                  active
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_2px_var(--primary)]"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                <div className="text-xl">{opt.emoji}</div>
                <div className="mt-1">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick comment <span className="font-normal normal-case text-muted-foreground">(optional)</span>
        </div>
        <Textarea
          placeholder="Tasted great, but too sweet for daily…"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="mt-1 text-right text-[10px] text-muted-foreground">
          {comment.length}/1000
        </div>
      </div>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="w-full"
        size="lg"
      >
        {save.isPending ? "Saving…" : existing ? "Update feedback" : "Submit feedback"}
      </Button>
    </Card>
  );
}

export default ScanFeedback;
