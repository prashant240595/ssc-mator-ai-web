import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AI_OUTAGE_FLAG = "ai_credits_exhausted_at";

/** Outage is considered active for 6 hours after the last credit failure. */
const OUTAGE_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Whether AI buddies / mentor can currently reply. When the AI gateway runs out
 * of credits we flag it in `app_flags` and show every AI profile as offline.
 */
export function useAiAvailable(): boolean {
  const q = useQuery({
    queryKey: ["ai:available"],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_flags")
        .select("value, updated_at")
        .eq("key", AI_OUTAGE_FLAG)
        .maybeSingle();
      if (!data) return true;
      const at = new Date(data.updated_at as string).getTime();
      return Date.now() - at > OUTAGE_WINDOW_MS;
    },
  });
  return q.data ?? true;
}
