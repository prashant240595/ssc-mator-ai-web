import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useOnboarding } from "@/lib/onboarding";
import { Users, Search, UserPlus, Check, X, MessageCircle, Sparkles, Clock, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useOnlineUsers, isUserOnline } from "@/lib/presence";
import { useAiAvailable } from "@/lib/ai-status";


export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Study Partners — SSC Mentor AI" },
      { name: "description", content: "Find and connect with SSC aspirants. Send partner requests and chat 1-to-1." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: PartnersPage,
});

type ProfileRow = { id: string; full_name: string | null; email: string | null; onboarding: any; is_ai?: boolean; avatar_emoji?: string | null; bio?: string | null };
type ReqRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

function PartnersPage() {
  const { user } = useAuth();
  const { profile: myOnboarding } = useOnboarding();
  const qc = useQueryClient();
  const onlineUsers = useOnlineUsers();
  const aiAvailable = useAiAvailable();
  const [tab, setTab] = useState<"find" | "requests" | "partners">("find");

  const [q, setQ] = useState("");

  const myId = user?.id;

  // All profiles (excluding me)
  const profilesQ = useQuery({
    queryKey: ["partners:profiles"],
    enabled: !!myId,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, onboarding, is_ai, avatar_emoji, bio")
        .neq("id", myId!)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  // Top mock-test scorers (highest average total_score)
  const topScorersQ = useQuery({
    queryKey: ["partners:topScorers"],
    enabled: !!myId,
    queryFn: async (): Promise<{ user_id: string; avg: number; attempts: number }[]> => {
      const { data, error } = await supabase
        .from("student_results")
        .select("user_id, total_score")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const agg = new Map<string, { sum: number; n: number }>();
      for (const r of (data ?? []) as { user_id: string; total_score: number }[]) {
        const cur = agg.get(r.user_id) ?? { sum: 0, n: 0 };
        cur.sum += Number(r.total_score) || 0;
        cur.n += 1;
        agg.set(r.user_id, cur);
      }
      return [...agg.entries()]
        .filter(([uid]) => uid !== myId)
        .map(([user_id, v]) => ({ user_id, avg: v.sum / v.n, attempts: v.n }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 10);
    },
  });

  // All my requests (sent + received)
  const requestsQ = useQuery({
    queryKey: ["partners:requests", myId],
    enabled: !!myId,
    queryFn: async (): Promise<ReqRow[]> => {
      const { data, error } = await supabase
        .from("partner_requests")
        .select("id, requester_id, addressee_id, status, created_at")
        .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReqRow[];
    },
  });

  // Realtime updates for requests
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`partner_reqs:${myId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_requests" },
        () => {
          qc.invalidateQueries({ queryKey: ["partners:requests", myId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, qc]);

  const requests = requestsQ.data ?? [];
  const profiles = profilesQ.data ?? [];

  const byUser = useMemo(() => {
    const map = new Map<string, ReqRow>();
    for (const r of requests) {
      const other = r.requester_id === myId ? r.addressee_id : r.requester_id;
      const existing = map.get(other);
      if (!existing || new Date(r.created_at) > new Date(existing.created_at)) map.set(other, r);
    }
    return map;
  }, [requests, myId]);

  const acceptedIds = useMemo(
    () => new Set([...byUser.entries()].filter(([, r]) => r.status === "accepted").map(([id]) => id)),
    [byUser],
  );
  const incoming = requests.filter((r) => r.addressee_id === myId && r.status === "pending");
  const outgoing = requests.filter((r) => r.requester_id === myId && r.status === "pending");
  const partners = profiles.filter((p) => acceptedIds.has(p.id));

  // Suggested: same highestStage
  const myStage = myOnboarding?.highestStage;
  const suggested = useMemo(() => {
    if (!myStage) return [];
    return profiles.filter((p) => {
      const s = (p.onboarding as any)?.highestStage;
      return s && s === myStage && !acceptedIds.has(p.id);
    });
  }, [profiles, myStage, acceptedIds]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      // No search: 10 random aspirants (excluding accepted partners), AI buddies first
      const pool = profiles.filter((p) => !acceptedIds.has(p.id));
      const bots = pool.filter((p) => p.is_ai);
      const humans = pool.filter((p) => !p.is_ai);
      const shuffled = [...humans].sort(() => Math.random() - 0.5);
      return [...bots, ...shuffled].slice(0, 10);
    }
    // Search: allow email + name lookup, cap at 10
    return profiles
      .filter(
        (p) =>
          (p.full_name ?? "").toLowerCase().includes(needle) ||
          (p.email ?? "").toLowerCase().includes(needle),
      )
      .slice(0, 10);
  }, [profiles, q, acceptedIds]);

  const topScorers = useMemo(() => {
    const ranked = topScorersQ.data ?? [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return ranked
      .map((r) => byId.get(r.user_id))
      .filter((p): p is ProfileRow => !!p && !p.is_ai && !acceptedIds.has(p.id))
      .slice(0, 6);
  }, [topScorersQ.data, profiles, acceptedIds]);

  const sendRequest = async (targetId: string) => {
    if (!myId) return;
    const { error } = await supabase
      .from("partner_requests")
      .insert({ requester_id: myId, addressee_id: targetId });
    if (error) return toast.error(error.message);
    toast.success("Request sent");
    qc.invalidateQueries({ queryKey: ["partners:requests", myId] });
  };

  const respond = async (reqId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("partner_requests").update({ status }).eq("id", reqId);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Partner added" : "Request rejected");
    qc.invalidateQueries({ queryKey: ["partners:requests", myId] });
  };

  const cancel = async (reqId: string) => {
    const { error } = await supabase.from("partner_requests").delete().eq("id", reqId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["partners:requests", myId] });
  };

  const unfriend = async (otherId: string, name: string) => {
    if (!myId) return;
    if (!confirm(`Remove ${name} from your partners?`)) return;
    const { error } = await supabase
      .from("partner_requests")
      .delete()
      .or(
        `and(requester_id.eq.${myId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myId})`,
      );
    if (error) return toast.error(error.message);
    toast.success("Removed from partners");
    qc.invalidateQueries({ queryKey: ["partners:requests", myId] });
  };

  const renderUserCard = (p: ProfileRow) => {
    const req = byUser.get(p.id);
    const initial = (p.full_name ?? "?").trim().charAt(0).toUpperCase();
    const subtitle = p.bio
      ? p.bio
      : (p.onboarding as any)?.highestStage
        ? `Stage: ${(p.onboarding as any).highestStage}`
        : "SSC aspirant";
    const online = isUserOnline(onlineUsers, p.id, p.is_ai, aiAvailable);
    return (
      <div key={p.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary">
          {p.avatar_emoji ?? initial}
          <span
            title={online ? "Online" : "Offline"}
            aria-label={online ? "Online" : "Offline"}
            className={
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card " +
              (online ? "bg-success" : "bg-muted-foreground/50")
            }
          />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold">
            {p.full_name ?? "Anonymous"}
            {p.is_ai && (
              <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Buddy
              </span>
            )}
          </p>
          <p className="line-clamp-2 break-words text-xs text-muted-foreground">
            <span className={online ? "font-semibold text-success" : "text-muted-foreground"}>
              {online ? "Online" : "Offline"}
            </span>
            {" · "}
            {subtitle}
          </p>
        </div>

        {req?.status === "accepted" ? (
          <div className="flex shrink-0 gap-1">
            <Link
              to="/chat/$partnerId"
              params={{ partnerId: p.id }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" /> Chat
            </Link>
            <button
              onClick={() => unfriend(p.id, p.full_name ?? "this user")}
              title="Unfriend"
              aria-label="Unfriend"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <UserMinus className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        ) : req?.status === "pending" && req.requester_id === myId ? (
          <button
            onClick={() => cancel(req.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            <Clock className="h-3.5 w-3.5 shrink-0" /> Cancel
          </button>
        ) : req?.status === "pending" && req.addressee_id === myId ? (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => respond(req.id, "accepted")}
              title="Accept"
              aria-label="Accept"
              className="inline-flex items-center gap-1 rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-success-foreground"
            >
              <Check className="h-3.5 w-3.5 shrink-0" /> Accept
            </button>
            <button
              onClick={() => respond(req.id, "rejected")}
              title="Reject"
              aria-label="Reject"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5 shrink-0" /> Reject
            </button>
          </div>
        ) : (
          <button
            onClick={() => sendRequest(p.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" /> Add
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-4 overflow-x-hidden">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">Study Partners</h1>
            <p className="text-xs text-muted-foreground">
              Find aspirants, send requests and chat 1-to-1.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["find", "Find"],
            ["requests", `Requests${incoming.length ? ` (${incoming.length})` : ""}`],
            ["partners", `My Partners${partners.length ? ` (${partners.length})` : ""}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "flex-1 min-w-0 truncate rounded-lg px-3 py-1.5 text-xs font-semibold " +
              (tab === k
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "find" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          {topScorers.length > 0 && !q && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Top mock-test scorers
              </h2>
              <div className="grid gap-2">{topScorers.map(renderUserCard)}</div>
            </section>
          )}

          {suggested.length > 0 && !q && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Suggested for you
              </h2>
              <div className="grid gap-2">{suggested.slice(0, 6).map(renderUserCard)}</div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {q ? "Search results" : "10 random aspirants"}
            </h2>
            {profilesQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No user found.</p>
            ) : (
              <div className="grid gap-2">{filtered.map(renderUserCard)}</div>
            )}
          </section>
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Incoming ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new requests.</p>
            ) : (
              <div className="grid gap-2">
                {incoming.map((r) => {
                  const p = profiles.find((x) => x.id === r.requester_id);
                  return p ? renderUserCard(p) : null;
                })}
              </div>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sent ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't sent any requests.</p>
            ) : (
              <div className="grid gap-2">
                {outgoing.map((r) => {
                  const p = profiles.find((x) => x.id === r.addressee_id);
                  return p ? renderUserCard(p) : null;
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "partners" && (
        <section className="space-y-2">
          {partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No study partners yet. Use the Find tab to add some.
            </p>
          ) : (
            <div className="grid gap-2">{partners.map(renderUserCard)}</div>
          )}
        </section>
      )}
    </div>
  );
}
