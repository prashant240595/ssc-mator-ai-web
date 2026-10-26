import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/lib/payments.functions";
import { useAuth } from "@/lib/auth";
import { FREE_ACCESS_FOR_ALL } from "@/lib/access";

/**
 * Active web pass for the signed-in user.
 *
 * While `FREE_ACCESS_FOR_ALL` is on, everyone counts as active and the query is
 * skipped — no point asking the server about a pass nobody needs.
 */
export function useSubscription() {
  const { isAuthenticated, isGuest, user } = useAuth();
  const enabled = Boolean(isAuthenticated && !isGuest && user?.id);
  const q = useQuery({
    queryKey: ["subscription", user?.id ?? "anon"],
    enabled: enabled && !FREE_ACCESS_FOR_ALL,
    staleTime: 60_000,
    queryFn: () => getMySubscription(),
  });
  return {
    ready: FREE_ACCESS_FOR_ALL || !enabled || !q.isLoading,
    active: FREE_ACCESS_FOR_ALL || Boolean(q.data?.active),
    expiresAt: q.data?.expiresAt ?? null,
    refetch: q.refetch,
  };
}
