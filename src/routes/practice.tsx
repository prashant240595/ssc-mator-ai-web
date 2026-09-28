import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Layers,
  FolderOpen,
  Lock,
  Download,
  X,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { QuizQuestion } from "@/lib/quiz-types";
import { QuizRunner } from "@/components/QuizRunner";
import { logActivity } from "@/lib/activity-log";
import { useAppUserState } from "@/lib/app-user";
import { useSubscription } from "@/lib/use-subscription";
import { PLAY_STORE_URL } from "@/components/WebPaywall";

type Search = { subject?: string; topic?: string; folder?: string };

function TopicLockDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-elevated">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Lock className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold">Pay in the website or free use in the app</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only the first topic of each subject is free on the website. Pay in the website or free
          use in the app.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            to="/pricing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
          >
            Pay in the website — from ₹30 (UPI)
          </Link>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Free use in the app
          </a>
          <button
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Smartphone className="h-4 w-4" />
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/practice")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s.subject === "string" ? s.subject : undefined,
    topic: typeof s.topic === "string" ? s.topic : undefined,
    folder: typeof s.folder === "string" ? s.folder : undefined,
  }),
  head: () => ({
    meta: [
      { title: "SSC CGL Subject & Topic Practice — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Practice SSC CGL questions by subject and topic with instant feedback and detailed solutions.",
      },
      { property: "og:title", content: "SSC CGL Subject & Topic Practice" },
      {
        property: "og:description",
        content: "Subject- and topic-wise SSC CGL practice questions with instant feedback.",
      },
      { property: "og:url", content: "https://sscmentorai.online/practice" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/practice" }],
  }),
  component: PracticePage,
});

function PracticePage() {
  const { subject, topic, folder } = Route.useSearch();
  if (!subject) return <SubjectPicker />;
  if (!topic) return <TopicPicker subject={subject} folder={folder} />;
  return <PracticeRunner subject={subject} topic={topic} />;
}

function SubjectPicker() {
  const [subjects, setSubjects] = useState<{ subject: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("list_subjects");
      if (error) {
        setLoading(false);
        return;
      }
      setSubjects(
        (data ?? []).map((r: any) => ({ subject: r.subject, count: Number(r.question_count) })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
          Practice
        </p>
        <h1 className="mt-1 font-display text-xl font-bold sm:text-2xl md:text-3xl">
          Pick a subject
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Choose a subject to browse topics.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Topic-wise SSC CGL practice across Quantitative Aptitude, Reasoning, English Language and
          General Awareness. Each set gives instant right/wrong feedback, a step-by-step solution in
          English and Hindi, a question grid to jump between questions, and bookmarks so you can
          revise tough questions later.
        </p>
      </header>

      {loading ? (
        <Loading />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No subject-specific questions yet"
          body="Ask your admin to upload subject-tagged questions via CSV."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
          {subjects.map((s) => (
            <Link
              key={s.subject}
              to="/practice"
              search={{ subject: s.subject }}
              onClick={() => void logActivity("viewed_subject", { subject: s.subject })}
              className="card-surface group flex items-center gap-3 p-3 transition active:scale-[0.98] sm:gap-4 sm:p-4 sm:hover:-translate-y-0.5 sm:hover:shadow-elevated"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground sm:h-12 sm:w-12">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{s.count} questions</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TopicPicker({ subject, folder }: { subject: string; folder?: string }) {
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const { isApp: isAppRaw } = useAppUserState();
  const { active: hasWebPass } = useSubscription();
  const isApp = isAppRaw || hasWebPass;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("list_topics", { p_subject: subject });
      if (error) {
        setLoading(false);
        return;
      }
      setTopics(
        (data ?? []).map((r: any) => ({ topic: r.topic, count: Number(r.question_count) })),
      );
      setLoading(false);
    })();
  }, [subject]);

  const SEP = " > ";
  // Folders always stay open so users can browse the whole catalogue.
  // Only actual question topics are gated (the first one stays free).
  const freeTopic = useMemo(() => firstFreeTopic(topics), [topics]);

  // Build the level to show: either folders + flat topics (root), or the
  // sub-topics inside the selected folder.
  const entries = useMemo(() => {
    if (folder) {
      const prefix = folder + SEP;
      return topics
        .filter((t) => t.topic.startsWith(prefix))
        .map((t) => ({
          label: t.topic.slice(prefix.length) || "Mixed",
          count: t.count,
          isFolder: false as const,
          value: t.topic,
        }));
    }
    const folders = new Map<string, number>();
    const flat: { label: string; count: number; isFolder: false; value: string }[] = [];
    for (const t of topics) {
      const i = t.topic.indexOf(SEP);
      if (i > 0) {
        const name = t.topic.slice(0, i);
        folders.set(name, (folders.get(name) ?? 0) + t.count);
      } else {
        flat.push({ label: t.topic, count: t.count, isFolder: false, value: t.topic });
      }
    }
    const folderList = [...folders.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([name, count]) => ({ label: name, count, isFolder: true as const, value: name }));
    return [...folderList, ...flat];
  }, [topics, folder]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
            {folder ? `${subject} › ${folder}` : subject}
          </p>
          <h1 className="mt-1 truncate font-display text-lg font-bold sm:text-2xl md:text-3xl">
            Choose a topic
          </h1>
        </div>
        <Link
          to="/practice"
          search={folder ? { subject } : {}}
          className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </header>

      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState title={`No topics found in ${subject}`} body="No questions tagged yet." />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
          {entries.map((e, i) => {
            const isLocked = !isApp && !e.isFolder && e.value !== freeTopic;
            const inner = (
              <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary sm:h-12 sm:w-12">
                  {isLocked ? (
                    <Lock className="h-5 w-5" />
                  ) : e.isFolder ? (
                    <FolderOpen className="h-5 w-5" />
                  ) : (
                    <Layers className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{e.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isLocked ? "Pay in website · free in app" : `${e.count} questions`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </>
            );
            const cls =
              "card-surface group flex items-center gap-3 p-3 transition active:scale-[0.98] sm:gap-4 sm:p-4 sm:hover:-translate-y-0.5 sm:hover:shadow-elevated";
            const key = (e.isFolder ? "f:" : "t:") + e.value;
            return isLocked ? (
              <button key={key} type="button" onClick={() => setLocked(true)} className={cls}>
                {inner}
              </button>
            ) : (
              <Link
                key={key}
                to="/practice"
                search={e.isFolder ? { subject, folder: e.value } : { subject, topic: e.value }}
                className={cls}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}
      {locked && <TopicLockDialog onClose={() => setLocked(false)} />}
    </div>
  );
}

/** The single topic that stays free on the website (first entry, drilling into folders). */
function firstFreeTopic(topics: { topic: string }[]): string | null {
  const SEP = " > ";
  const folders: string[] = [];
  const flat: string[] = [];
  for (const t of topics) {
    const i = t.topic.indexOf(SEP);
    if (i > 0) {
      const name = t.topic.slice(0, i);
      if (!folders.includes(name)) folders.push(name);
    } else flat.push(t.topic);
  }
  const folderList = [...folders].sort((a, b) => b.localeCompare(a));
  if (folderList.length > 0) {
    const prefix = folderList[0] + SEP;
    const inside = topics.find((t) => t.topic.startsWith(prefix));
    return inside ? inside.topic : null;
  }
  return flat[0] ?? null;
}

function PracticeRunner({ subject, topic }: { subject: string; topic: string }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const { ready, isApp: isAppRaw } = useAppUserState();
  const { active: hasWebPass, ready: subReady } = useSubscription();
  const isApp = isAppRaw || hasWebPass;

  useEffect(() => {
    if (!ready || !subReady || isApp) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("list_topics", { p_subject: subject });
      const free = firstFreeTopic((data ?? []) as { topic: string }[]);
      if (alive && free && free !== topic) setBlocked(true);
    })();
    return () => {
      alive = false;
    };
  }, [ready, isApp, subject, topic]);

  useEffect(() => {
    (async () => {
      const all: QuizQuestion[] = [];
      const pageSize = 1000;
      for (let page = 0; page < 20; page++) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("question_bank")
          .select(
            "id,subject,topic_name,category_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg",
          )
          .eq("subject", subject)
          .eq("topic_name", topic)
          .range(from, to);
        if (error) break;
        const rows = (data ?? []) as unknown as QuizQuestion[];
        all.push(...rows);
        if (rows.length < pageSize) break;
      }
      setQuestions(all);
    })();
  }, [subject, topic]);

  const ordered = useMemo(() => questions ?? [], [questions]);

  if (blocked)
    return <TopicLockDialog onClose={() => navigate({ to: "/practice", search: { subject } })} />;
  if (!questions) return <Loading />;

  return (
    <QuizRunner
      title={subject}
      subtitle={topic}
      questions={ordered}
      onExit={() => navigate({ to: "/practice", search: { subject } })}
      nativeAdEvery={7}
    />
  );
}

function Loading() {
  return (
    <div className="grid place-items-center p-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
