import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  Plus,
  Trash2,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { SUBJECTS } from "@/lib/mockData";
import {
  addRevisionTopic,
  deleteRevisionTopic,
  listRevisionTopics,
  restartRevisionTopic,
  reviewRevisionTopic,
} from "@/lib/revision.functions";
import {
  REVISION_INTERVALS,
  daysBetween,
  masteryPercent,
  stageLabel,
} from "@/lib/revision-schedule";

export const Route = createFileRoute("/revision")({
  head: () => ({
    meta: [
      { title: "Smart Revision Planner - SSC Mentor AI" },
      {
        name: "description",
        content:
          "Never forget what you study. Add a topic and our spaced repetition planner reminds you to revise it on day 1, 3, 7, 21, 30 and 60.",
      },
      { property: "og:title", content: "Smart Revision Planner - SSC Mentor AI" },
      {
        property: "og:description",
        content:
          "Spaced repetition revision planner with automatic reminders for SSC aspirants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/revision" }],
  }),
  component: RevisionPage,
});

type Topic = {
  id: string;
  title: string;
  subject: string | null;
  notes: string | null;
  stage: number;
  next_review_date: string;
  review_count: number;
  last_difficulty: string | null;
  status: string;
};

function RevisionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listRevisionTopics);
  const addFn = useServerFn(addRevisionTopic);
  const reviewFn = useServerFn(reviewRevisionTopic);
  const deleteFn = useServerFn(deleteRevisionTopic);
  const restartFn = useServerFn(restartRevisionTopic);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["revision-topics", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["revision-topics"] });
    qc.invalidateQueries({ queryKey: ["revision-due"] });
  };

  const add = useMutation({
    mutationFn: (v: { title: string; subject: string | null; notes: string | null }) =>
      addFn({ data: v }),
    onSuccess: () => {
      setTitle("");
      setNotes("");
      toast.success("Topic added — first revision scheduled for tomorrow");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not add topic"),
  });

  const review = useMutation({
    mutationFn: (v: { id: string; difficulty: "easy" | "medium" | "hard" }) =>
      reviewFn({ data: v }),
    onSuccess: (row: any) => {
      if (row?.status === "completed") toast.success("Topic mastered! 🎉 Locked in long-term memory");
      else
        toast.success(
          `Nice! Next revision on ${new Date(row.next_review_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => invalidate(),
  });

  const restart = useMutation({
    mutationFn: (id: string) => restartFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Revision cycle restarted");
      invalidate();
    },
  });

  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const topics = (data?.topics ?? []) as Topic[];

  const { due, upcoming, mastered } = useMemo(() => {
    const active = topics.filter((t) => t.status === "active");
    return {
      due: active.filter((t) => t.next_review_date <= today),
      upcoming: active.filter((t) => t.next_review_date > today),
      mastered: topics.filter((t) => t.status === "completed"),
    };
  }, [topics, today]);

  if (!user) {
    return (
      <div className="card-surface mx-auto mt-10 max-w-md p-6 text-center">
        <Brain className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-display text-xl font-bold">Smart Revision Planner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to build your personal spaced-repetition revision schedule.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card-surface relative overflow-hidden p-5">
        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Brain style={{ width: 22, height: 22 }} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold">Smart Revision Planner</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Beat the forgetting curve. Add what you studied today and we will remind you to
              revise it on day {REVISION_INTERVALS.join(", ")} — automatically.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Due today" value={due.length} tone="warning" />
          <Stat label="Scheduled" value={upcoming.length} tone="primary" />
          <Stat label="Mastered" value={mastered.length} tone="success" />
        </div>
      </section>

      {/* Add topic */}
      <section className="card-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4 text-primary" /> Add today&apos;s topic
        </h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 2) return toast.error("Enter a topic name");
            add.mutate({ title: title.trim(), subject: subject || null, notes: notes || null });
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Percentage — successive change"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Subject (optional)</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.name.en}>
                {s.name.en}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={add.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Quick notes / formula to recall (optional)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary md:col-span-3"
          />
        </form>
      </section>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading your revision schedule…</p>
      )}

      {/* Due today */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-warning" /> Revise today ({due.length})
        </h2>
        {due.length === 0 ? (
          <div className="card-surface p-4 text-sm text-muted-foreground">
            Nothing due today. Add a topic you studied and we&apos;ll schedule it for you.
          </div>
        ) : (
          <div className="grid gap-3">
            {due.map((t) => (
              <TopicRow
                key={t.id}
                topic={t}
                today={today}
                showReview
                onReview={(d) => review.mutate({ id: t.id, difficulty: d })}
                onDelete={() => remove.mutate(t.id)}
                busy={review.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-primary" /> Upcoming ({upcoming.length})
          </h2>
          <div className="grid gap-3">
            {upcoming.map((t) => (
              <TopicRow
                key={t.id}
                topic={t}
                today={today}
                onDelete={() => remove.mutate(t.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Mastered */}
      {mastered.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" /> Mastered ({mastered.length})
          </h2>
          <div className="grid gap-3">
            {mastered.map((t) => (
              <TopicRow
                key={t.id}
                topic={t}
                today={today}
                onDelete={() => remove.mutate(t.id)}
                onRestart={() => restart.mutate(t.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <div className={`rounded-xl px-3 py-2 ${cls}`}>
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
    </div>
  );
}

function TopicRow({
  topic,
  today,
  showReview,
  onReview,
  onDelete,
  onRestart,
  busy,
}: {
  topic: Topic;
  today: string;
  showReview?: boolean;
  onReview?: (d: "easy" | "medium" | "hard") => void;
  onDelete: () => void;
  onRestart?: () => void;
  busy?: boolean;
}) {
  const inDays = daysBetween(today, topic.next_review_date);
  const pct = masteryPercent(topic.stage, topic.status);
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{topic.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {topic.subject ? `${topic.subject} · ` : ""}
            {stageLabel(topic.stage)} · revised {topic.review_count}×
          </p>
          {topic.notes && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{topic.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {topic.status === "active" && (
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                (inDays <= 0
                  ? "bg-warning-soft text-warning-foreground"
                  : "bg-muted text-muted-foreground")
              }
            >
              {inDays <= 0 ? "Due now" : `in ${inDays}d`}
            </span>
          )}
          {onRestart && (
            <button
              onClick={onRestart}
              title="Restart cycle"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {showReview && onReview && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">How was it?</span>
          <button
            disabled={busy}
            onClick={() => onReview("hard")}
            className="rounded-lg bg-destructive-soft px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-60"
          >
            Hard
          </button>
          <button
            disabled={busy}
            onClick={() => onReview("medium")}
            className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            Medium
          </button>
          <button
            disabled={busy}
            onClick={() => onReview("easy")}
            className="rounded-lg bg-success-soft px-3 py-1.5 text-xs font-semibold text-success disabled:opacity-60"
          >
            Easy
          </button>
        </div>
      )}
    </div>
  );
}
