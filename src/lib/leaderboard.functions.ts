import { createServerFn } from "@tanstack/react-start";

export type LeaderboardRow = {
  username: string;
  avg_score: number;
  scan_count: number;
};

export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_leaderboard");
    if (error) {
      console.error("get_leaderboard error", error);
      return [];
    }
    return (data ?? []) as LeaderboardRow[];
  },
);
