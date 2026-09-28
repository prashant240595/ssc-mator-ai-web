import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Inbox as InboxIcon, MessageCircle, Users } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — SSC Mentor AI" },
      { name: "description", content: "All your direct chats and study group conversations in one place." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InboxPage,
});

type DMRow = { id: string; sender_id: string; receiver_id: string; content: string; created_at: string };
type ProfileRow = { id: string; full_name: string | null; avatar_emoji: string | null; is_ai: boolean };
type GroupMsg = { id: string; group_id: string; user_id: string; content: string | null; created_at: string; message_type: string };
type GroupRow = { id: string; name: string; subject: string | null };

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function InboxPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myId = user?.id;

  const dmsQ = useQuery({
    queryKey: ["inbox:dms", myId],
    enabled: !!myId,
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (msgs ?? []) as DMRow[];
      // group latest per partner
      const map = new Map<string, DMRow>();
      for (const r of rows) {
        const other = r.sender_id === myId ? r.receiver_id : r.sender_id;
        if (!map.has(other)) map.set(other, r);
      }
      const partnerIds = [...map.keys()];
      let profiles: ProfileRow[] = [];
      if (partnerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_emoji, is_ai")
          .in("id", partnerIds);
        profiles = (profs ?? []) as ProfileRow[];
      }
      return partnerIds.map((pid) => ({
        partner: profiles.find((p) => p.id === pid) ?? { id: pid, full_name: "Unknown", avatar_emoji: null, is_ai: false },
        last: map.get(pid)!,
      }));
    },
  });

  const groupsQ = useQuery({
    queryKey: ["inbox:groups", myId],
    enabled: !!myId,
    queryFn: async () => {
      const { data: mems } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", myId!);
      const ids = (mems ?? []).map((m: any) => m.group_id as string);
      if (!ids.length) return [];
      const { data: groups } = await supabase
        .from("study_groups")
        .select("id, name, subject")
        .in("id", ids);
      const { data: lastMsgs } = await supabase
        .from("group_messages")
        .select("id, group_id, user_id, content, created_at, message_type")
        .in("group_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      const latest = new Map<string, GroupMsg>();
      for (const m of (lastMsgs ?? []) as GroupMsg[]) {
        if (!latest.has(m.group_id)) latest.set(m.group_id, m);
      }
      return ((groups ?? []) as GroupRow[]).map((g) => ({ group: g, last: latest.get(g.id) ?? null }));
    },
  });

  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`inbox:${myId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["inbox:dms", myId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["inbox:groups", myId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, qc]);

  const dmThreads = (dmsQ.data ?? []).sort(
    (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
  );
  const groupThreads = (groupsQ.data ?? []).sort((a, b) => {
    const ta = a.last ? new Date(a.last.created_at).getTime() : 0;
    const tb = b.last ? new Date(b.last.created_at).getTime() : 0;
    return tb - ta;
  });

  const empty = dmThreads.length === 0 && groupThreads.length === 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground sm:h-11 sm:w-11">
            <InboxIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold sm:text-xl">Inbox</h1>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              All your chats and study groups in one place.
            </p>
          </div>
        </div>
      </header>


      {empty && !dmsQ.isLoading && !groupsQ.isLoading && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accept a partner request or join a study group to start chatting.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/partners" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Find partners
            </Link>
            <Link to="/groups" className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold">
              Browse groups
            </Link>
          </div>
        </div>
      )}

      {dmThreads.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Direct messages
          </h2>
          <div className="grid gap-2">
            {dmThreads.map(({ partner, last }) => {
              const mine = last.sender_id === myId;
              const initial = (partner.full_name ?? "?").trim().charAt(0).toUpperCase();
              return (
                <Link
                  key={partner.id}
                  to="/chat/$partnerId"
                  params={{ partnerId: partner.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-muted"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary">
                    {partner.avatar_emoji ?? initial}
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {partner.full_name ?? "Study partner"}
                        {partner.is_ai && (
                          <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                            Buddy
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(last.created_at)}</span>
                    </div>
                    <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                      {mine ? "You: " : ""}
                      {last.content}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {groupThreads.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Study groups
          </h2>
          <div className="grid gap-2">
            {groupThreads.map(({ group, last }) => (
              <Link
                key={group.id}
                to="/groups/$groupId"
                params={{ groupId: group.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-muted"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{group.name}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {last ? fmtTime(last.created_at) : ""}
                    </span>
                  </div>
                  <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                    {last
                      ? last.message_type === "question"
                        ? "Shared a question"
                        : (last.content ?? "")
                      : "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
