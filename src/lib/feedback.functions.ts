import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FeedbackInput = z.object({
  scanId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  buyAgain: z.enum(["yes", "maybe", "no"]),
  comment: z.string().trim().max(1000).optional(),
});

export type ScanFeedbackRow = {
  rating: number;
  buyAgain: "yes" | "maybe" | "no";
  comment: string | null;
  updatedAt: string;
};

export const getScanFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scanId: string }) =>
    z.object({ scanId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ScanFeedbackRow | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("scan_feedback")
      .select("rating, buy_again, comment, updated_at")
      .eq("user_id", userId)
      .eq("scan_id", data.scanId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      rating: row.rating as number,
      buyAgain: row.buy_again as "yes" | "maybe" | "no",
      comment: (row.comment as string | null) ?? null,
      updatedAt: row.updated_at as string,
    };
  });

export const saveScanFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("scan_feedback")
      .upsert(
        {
          user_id: userId,
          scan_id: data.scanId,
          rating: data.rating,
          buy_again: data.buyAgain,
          comment: data.comment ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,scan_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
