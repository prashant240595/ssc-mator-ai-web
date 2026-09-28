import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateAiPartnerReply } from "@/lib/ai-partner.functions";
import { useOnlineUsers, isUserOnline } from "@/lib/presence";
import { useAiAvailable } from "@/lib/ai-status";


export const Route = createFileRoute("/chat/$partnerId")({
  head: () => ({
    meta: [
      { title: "Chat — SSC Mentor AI" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChatPage,
});

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

function ChatPage() {
  return <ChatPageInner />;
}

function ChatPageInner() {
  const { partnerId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const myId = user?.id;
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const partnerQ = useQuery({
    queryKey: ["chat:partner", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_ai, avatar_emoji, bio")
        .eq("id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [limit, setLimit] = useState(15);
  const msgsQ = useQuery({
    queryKey: ["chat:msgs", myId, partnerId, limit],
    enabled: !!myId && !!partnerId,
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`,
        )
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      const rows = (data ?? []) as Msg[];
      return rows.slice(0, limit).reverse();
    },
  });
  const hasMore = (msgsQ.data?.length ?? 0) >= limit;

  useEffect(() => {
    if (!myId || !partnerId) return;
    const ch = supabase
      .channel(`dm:${myId}:${partnerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const row = payload.new as Msg;
          const involves =
            (row.sender_id === myId && row.receiver_id === partnerId) ||
            (row.sender_id === partnerId && row.receiver_id === myId);
          if (involves) qc.invalidateQueries({ queryKey: ["chat:msgs", myId, partnerId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, partnerId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgsQ.data?.length]);

  const aiReply = useServerFn(generateAiPartnerReply);
  const [aiTyping, setAiTyping] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !myId) return;
    setText("");
    const { error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: myId, receiver_id: partnerId, content });
    if (error) {
      toast.error(error.message);
      setText(content);
      return;
    }
    qc.invalidateQueries({ queryKey: ["chat:msgs", myId, partnerId] });
    if (partnerQ.data?.is_ai && aiAvailable) {
      // Simulate a human-like reading + typing delay (6–18s, longer for longer msgs)
      const readMs = Math.min(6000, 800 + content.length * 40);
      const typeMs = 4000 + Math.floor(Math.random() * 8000);
      const totalDelay = readMs + typeMs;
      setTimeout(() => setAiTyping(true), readMs);
      setTimeout(async () => {
        try {
          await aiReply({ data: { botId: partnerId } });
          qc.invalidateQueries({ queryKey: ["chat:msgs", myId, partnerId] });
        } catch (err: any) {
          // AI outage (no credits) is handled server-side and shown as offline —
          // never surface a raw gateway error to the student.
          console.warn("[ai] reply failed", err?.message);
        } finally {
          setAiTyping(false);
        }
      }, totalDelay);
    }
  };

  const partner = partnerQ.data;
  const onlineUsers = useOnlineUsers();
  const aiAvailable = useAiAvailable();
  const partnerOnline = isUserOnline(onlineUsers, partnerId, partner?.is_ai, aiAvailable);

  const messages = msgsQ.data ?? [];

  return (
    <div className="flex h-[calc(100dvh-13rem)] w-full min-w-0 max-w-full flex-col overflow-hidden md:h-[calc(100vh-3rem)]">
      <header className="flex min-w-0 items-center gap-3 rounded-t-2xl border border-border bg-card p-3">
        <button
          onClick={() => navigate({ to: "/partners" })}
          className="shrink-0 rounded-lg p-2 hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary">
          {partner?.avatar_emoji ?? (partner?.full_name ?? "?").charAt(0).toUpperCase()}
          <span
            title={partnerOnline ? "Online" : "Offline"}
            aria-label={partnerOnline ? "Online" : "Offline"}
            className={
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card " +
              (partnerOnline ? "bg-success" : "bg-muted-foreground/50")
            }
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{partner?.full_name ?? "Study Partner"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {aiTyping ? (
              "typing…"
            ) : (
              <>
                <span className={partnerOnline ? "font-semibold text-success" : ""}>
                  {partnerOnline ? "Online" : "Offline"}
                </span>
                {" · "}
                {partner?.bio ?? "Study partner"}
              </>
            )}
          </p>
        </div>

      </header>

      <div className="min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden border-x border-border bg-background p-3">
        {msgsQ.isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-semibold">Say hi 👋</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start a discussion with your study partner.
              </p>
              <Link
                to="/partners"
                className="mt-3 inline-block text-xs font-semibold text-primary underline"
              >
                Back to partners
              </Link>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + 15)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  Load previous messages
                </button>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm " +
                      (mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card border border-border text-foreground")
                    }
                  >
                    {m.content}
                    <div
                      className={
                        "mt-0.5 text-[10px] " +
                        (mine ? "text-primary-foreground/70" : "text-muted-foreground")
                      }
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 rounded-b-2xl border border-border bg-card p-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as any);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type a message…"
          className="min-h-[40px] max-h-32 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
