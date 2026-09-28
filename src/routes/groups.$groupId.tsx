import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Send, Users, BookPlus, LogOut, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateGroupMentorReply } from "@/lib/ai-mentor-group.functions";

const MENTOR_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1";


export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Group Chat — SSC Mentor AI" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: GroupChat,
});

type Msg = {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  question_id: string | null;
  message_type: "text" | "question";
  created_at: string;
};

type Member = {
  user_id: string;
  role: string;
  profile?: { full_name: string | null; email: string | null } | null;
};

function GroupChat() {
  return <GroupChatInner />;
}

function GroupChatInner() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const myId = user?.id;
  const [text, setText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const groupQ = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_groups")
        .select("id, name, description, subject, created_by")
        .eq("id", groupId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membersQ = useQuery({
    queryKey: ["group:members", groupId],
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role")
        .eq("group_id", groupId);
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as any[] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((m: any) => ({ ...m, profile: pmap.get(m.user_id) ?? null }));
    },
  });

  const [limit, setLimit] = useState(15);
  const msgsQ = useQuery({
    queryKey: ["group:msgs", groupId, limit],
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("group_messages")
        .select("id, group_id, user_id, content, question_id, message_type, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      const rows = (data ?? []) as Msg[];
      return rows.slice(0, limit).reverse();
    },
  });
  const hasMore = (msgsQ.data?.length ?? 0) >= limit;

  // Fetch referenced questions
  const questionIds = Array.from(
    new Set((msgsQ.data ?? []).filter((m) => m.question_id).map((m) => m.question_id!)),
  );
  const questionsQ = useQuery({
    queryKey: ["group:qs", groupId, questionIds.join(",")],
    enabled: questionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, text, subject, topic_name, options")
        .in("id", questionIds);
      if (error) throw error;
      return new Map((data ?? []).map((q: any) => [q.id, q]));
    },
  });

  useEffect(() => {
    if (!groupId) return;
    const ch = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group:msgs", groupId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group:members", groupId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgsQ.data?.length]);

  const mentorReply = useServerFn(generateGroupMentorReply);
  const [mentorTyping, setMentorTyping] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !myId) return;
    setText("");
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, user_id: myId, content, message_type: "text" });
    if (error) {
      toast.error(error.message);
      setText(content);
      return;
    }
    // Trigger SSC Mentor reply if mentioned or asked a question
    const lower = content.toLowerCase();
    const mentorMember = (membersQ.data ?? []).some((m) => m.user_id === MENTOR_ID);
    const asksMentor =
      lower.includes("mentor") ||
      lower.includes("@mentor") ||
      lower.includes("ssc mentor") ||
      lower.includes("sir") ||
      lower.includes("teacher") ||
      lower.endsWith("?") ||
      lower.includes("?");
    if (mentorMember && asksMentor) {
      const delay = 2000 + Math.floor(Math.random() * 4000);
      setTimeout(() => setMentorTyping(true), 800);
      setTimeout(async () => {
        try {
          await mentorReply({ data: { groupId } });
        } catch (err: any) {
          console.warn("[mentor] reply failed", err?.message);
        } finally {
          setMentorTyping(false);
        }
      }, delay);
    }
  };


  const leaveGroup = async () => {
    if (!myId) return;
    if (!confirm("Leave this group?")) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", myId);
    if (error) return toast.error(error.message);
    toast.success("Left group");
    navigate({ to: "/groups" });
  };

  const deleteGroup = async () => {
    if (!confirm("Delete this group for everyone? This cannot be undone.")) return;
    const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
    if (error) return toast.error(error.message);
    toast.success("Group deleted");
    navigate({ to: "/groups" });
  };

  const isOwner = groupQ.data?.created_by === myId;
  const members = membersQ.data ?? [];
  const messages = msgsQ.data ?? [];
  const qmap = questionsQ.data ?? new Map();

  const nameFor = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.profile?.full_name || m?.profile?.email || "User";
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] w-full min-w-0 max-w-full flex-col overflow-hidden md:h-[calc(100vh-3rem)]">
      <header className="flex min-w-0 items-center gap-3 rounded-t-2xl border border-border bg-card p-3">
        <button
          onClick={() => navigate({ to: "/groups" })}
          className="rounded-lg p-2 hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{groupQ.data?.name ?? "Group"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {mentorTyping
              ? "SSC Mentor is typing…"
              : `${members.length}/10 members${groupQ.data?.subject ? ` · ${groupQ.data.subject}` : ""}`}
          </p>

        </div>
        <button
          onClick={() => setShowMembers((v) => !v)}
          className="rounded-lg p-2 hover:bg-muted"
          aria-label="Members"
          title="Members"
        >
          <Users className="h-4 w-4" />
        </button>
      </header>

      {showMembers && (
        <div className="border-x border-b border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">Members ({members.length}/10)</p>
            <div className="flex gap-1">
              {isOwner && members.length < 10 && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold"
                >
                  <UserPlus className="h-3 w-3" /> Add
                </button>
              )}
              {isOwner ? (
                <button
                  onClick={deleteGroup}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive-soft px-2 py-1 text-[11px] font-semibold text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Delete group
                </button>
              ) : (
                <button
                  onClick={leaveGroup}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold"
                >
                  <LogOut className="h-3 w-3" /> Leave
                </button>
              )}
            </div>
          </div>
          <ul className="grid gap-1">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 text-xs">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary-soft text-[10px] font-bold text-primary">
                  {(m.profile?.full_name || m.profile?.email || "?").charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{m.profile?.full_name || m.profile?.email || "User"}</span>
                {m.role === "owner" && (
                  <span className="rounded bg-warning-soft px-1.5 text-[10px] font-semibold text-warning-foreground">
                    Owner
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden border-x border-border bg-background p-3">
        {msgsQ.isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Say hi or share a question.</p>
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
              const mine = m.user_id === myId;
              const q = m.question_id ? qmap.get(m.question_id) : null;
              return (
                <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm shadow-sm " +
                      (mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border border-border bg-card text-foreground")
                    }
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[10px] font-semibold opacity-70">{nameFor(m.user_id)}</p>
                    )}
                    {m.message_type === "question" && q ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase opacity-70">
                          Shared question · {q.subject}{q.topic_name ? ` / ${q.topic_name}` : ""}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {q.text?.en ?? q.text?.hi ?? "Question"}
                        </p>
                        {Array.isArray(q.options) && (
                          <ol className="ml-4 list-decimal space-y-0.5 text-xs opacity-90">
                            {q.options.map((opt: any, i: number) => (
                              <li key={i} className="break-words">{opt?.text?.en ?? opt?.text?.hi ?? ""}</li>
                            ))}
                          </ol>
                        )}
                        {m.content && <p className="mt-1 whitespace-pre-wrap break-words text-xs">{m.content}</p>}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                    <div
                      className={
                        "mt-0.5 text-[10px] " +
                        (mine ? "text-primary-foreground/70" : "text-muted-foreground")
                      }
                    >
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 rounded-b-2xl border border-border bg-card p-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
          aria-label="Share question"
          title="Share a question"
        >
          <BookPlus className="h-4 w-4" />
        </button>
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

      {shareOpen && (
        <ShareQuestionDialog
          groupId={groupId}
          userId={myId!}
          onClose={() => setShareOpen(false)}
        />
      )}
      {addOpen && (
        <AddMemberDialog
          groupId={groupId}
          userId={myId!}
          existingIds={members.map((m) => m.user_id)}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}

function ShareQuestionDialog({
  groupId,
  userId,
  onClose,
}: {
  groupId: string;
  userId: string;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const subjectsQ = useQuery({
    queryKey: ["share:subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_subjects");
      if (error) throw error;
      return (data ?? []) as { subject: string; question_count: number }[];
    },
  });
  const topicsQ = useQuery({
    queryKey: ["share:topics", subject],
    enabled: !!subject,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_topics", { p_subject: subject });
      if (error) throw error;
      return (data ?? []) as { topic: string; question_count: number }[];
    },
  });
  const questionsQ = useQuery({
    queryKey: ["share:qs", subject, topic],
    enabled: !!subject && !!topic,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, text")
        .eq("subject", subject)
        .eq("topic_name", topic)
        .is("deleted_at", null)
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const share = async (qid: string) => {
    setSending(true);
    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: userId,
      question_id: qid,
      content: note.trim() || null,
      message_type: "question",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Question shared");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold">Share a question</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-muted">
            Close
          </button>
        </div>
        <div className="grid gap-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic("");
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Subject…</option>
              {(subjectsQ.data ?? []).map((s) => (
                <option key={s.subject} value={s.subject}>
                  {s.subject}
                </option>
              ))}
            </select>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={!subject}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Topic…</option>
              {(topicsQ.data ?? []).map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic}
                </option>
              ))}
            </select>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {!subject || !topic ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                Select subject and topic to see questions
              </p>
            ) : questionsQ.isLoading ? (
              <p className="p-4 text-center text-xs text-muted-foreground">Loading…</p>
            ) : (questionsQ.data ?? []).length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">No questions found</p>
            ) : (
              <ul className="divide-y divide-border">
                {(questionsQ.data ?? []).map((q: any) => (
                  <li key={q.id} className="flex items-start gap-2 p-2">
                    <p className="line-clamp-2 flex-1 text-xs">
                      {q.text?.en ?? q.text?.hi ?? "Question"}
                    </p>
                    <button
                      onClick={() => share(q.id)}
                      disabled={sending}
                      className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Share
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMemberDialog({
  groupId,
  userId,
  existingIds,
  onClose,
}: {
  groupId: string;
  userId: string;
  existingIds: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState<string | null>(null);

  const partnersQ = useQuery({
    queryKey: ["add-member:partners", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_requests")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;
      const ids = Array.from(
        new Set(
          (data ?? []).map((r: any) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
        ),
      ).filter((id) => !existingIds.includes(id));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const add = async (uid: string) => {
    setAdding(uid);
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: uid, role: "member" });
    setAdding(null);
    if (error) return toast.error(error.message);
    toast.success("Member added");
    qc.invalidateQueries({ queryKey: ["group:members", groupId] });
  };

  const list = partnersQ.data ?? [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Add a partner</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-muted">
            Close
          </button>
        </div>
        {partnersQ.isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            No available partners. Add partners first from the Partners page.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            {list.map((p: any) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
                  {(p.full_name || p.email || "?").charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm">{p.full_name || p.email}</span>
                <button
                  onClick={() => add(p.id)}
                  disabled={adding === p.id}
                  className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {adding === p.id ? "Adding…" : "Add"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
