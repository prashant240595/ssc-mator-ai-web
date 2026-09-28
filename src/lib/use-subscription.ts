import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/lib/payments.functions";
import { useAuth } from "@/lib/auth";

/** Active web pass for the signed-in user. */
export function useSubscription() {
  const { isAuthenticated, isGuest, user } = useAuth();
  const enabled = Boolean(isAuthenticated && !isGuest && user?.id);
  const q = useQuery({
    queryKey: ["subscription", user?.id ?? "anon"],
    enabled,
    staleTime: 60_000,
    queryFn: () => getMySubscription(),
  });
  return {
    ready: !enabled || !q.isLoading,
    active: Boolean(q.data?.active),
    expiresAt: q.data?.expiresAt ?? null,
    refetch: q.refetch,
  };
}
