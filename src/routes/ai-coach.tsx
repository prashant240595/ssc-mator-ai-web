import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { analyzeStudentProfile } from "@/lib/ai-mentor.functions";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/ai-coach")({
  head: () => ({
    meta: [
      { title: "AI SSC Mentor — Personal Coaching for SSC CGL" },
      { name: "description", content: "Your personal SSC AI mentor analyses your attempt history and gives a step-by-step action plan." },
      { property: "og:title", content: "AI SSC Mentor — Personal SSC CGL Coaching" },
      { property: "og:description", content: "Personalised SSC CGL coaching plan from an AI mentor." },
      { property: "og:url", content: "https://sscmentorai.online/ai-coach" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/ai-coach" }],
  }),
  component: AiCoach,
});

type Summary = {
  attempts: number;
  totalScore: number;
  correct: number;
  incorrect: number;
  unattempted: number;
};

type MentorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; analysis: string; summary: Summary; cached?: boolean }
  | { status: "error"; message: string; summary?: Summary };

type CacheEntry = { hash: string; analysis: string; summary: Summary; checkedAt: number };

const STALE_MS = 10 * 60 * 1000; // 10 minutes — within this window, skip server entirely
const cacheKey = (userId: string, lang: string) => `ai_mentor_cache::${userId}::${lang}`;
const refreshKey = (userId: string) => `ai_mentor_refresh::${userId}`;

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function hasRefreshedToday(userId: string): boolean {
  try {
    return localStorage.getItem(refreshKey(userId)) === istToday();
  } catch {
    return false;
  }
}

function markRefreshedToday(userId: string) {
  try {
    localStorage.setItem(refreshKey(userId), istToday());
  } catch {}
}

function readCache(userId: string, lang: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId, lang));
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, lang: string, entry: CacheEntry) {
  try {
    localStorage.setItem(cacheKey(userId, lang), JSON.stringify(entry));
  } catch {}
}

function AiCoach() {
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const analyze = useServerFn(analyzeStudentProfile);
  const [state, setState] = useState<MentorState>({ status: "idle" });
  const inflight = useRef(false);

  const [refreshedToday, setRefreshedToday] = useState(false);

  useEffect(() => {
    if (user) setRefreshedToday(hasRefreshedToday(user.id));
  }, [user]);

  const run = async (opts: { force?: boolean; userInitiated?: boolean } = {}) => {
    if (!user || inflight.current) return;
    if (opts.force && opts.userInitiated && hasRefreshedToday(user.id)) {
      toast.error(lang === "hi" ? "आज का रिफ़्रेश हो चुका है। कल दोबारा कोशिश करें।" : "Already refreshed today. Try again tomorrow.");
      return;
    }


    const cached = readCache(user.id, lang);

    // Client-side throttle: if we have a fresh cached response and not forced, show it without hitting the server at all.
    if (!opts.force && cached && Date.now() - cached.checkedAt < STALE_MS) {
      setState({ status: "ready", analysis: cached.analysis, summary: cached.summary, cached: true });
      return;
    }

    // Optimistically show cached content (if any) while we revalidate in background
    if (cached && !opts.force) {
      setState({ status: "ready", analysis: cached.analysis, summary: cached.summary, cached: true });
    } else {
      setState({ status: "loading" });
    }

    inflight.current = true;
    void logActivity("opened_mentor", {});
    try {
      const res = await analyze({
        data: {
          language: lang,
          previousHash: opts.force ? "" : (cached?.hash ?? ""),
        },
      });
      if (res.ok) {
        if (opts.force && opts.userInitiated) {
          markRefreshedToday(user.id);
          setRefreshedToday(true);
        }
        const summary = res.data.summary as Summary;
        if ("unchanged" in res && res.unchanged && cached) {
          const updated = { ...cached, summary, checkedAt: Date.now() };
          writeCache(user.id, lang, updated);
          setState({ status: "ready", analysis: cached.analysis, summary, cached: true });
        } else if (res.analysis) {
          writeCache(user.id, lang, {
            hash: res.hash,
            analysis: res.analysis,
            summary,
            checkedAt: Date.now(),
          });
          setState({ status: "ready", analysis: res.analysis, summary, cached: false });
        } else if (cached) {
          setState({ status: "ready", analysis: cached.analysis, summary, cached: true });
        } else {
          if (opts.userInitiated) toast.error(lang === "hi" ? "विश्लेषण उपलब्ध नहीं" : "No analysis available");
          setState({ status: "error", message: "No analysis available", summary });
        }
      } else {
        // Only surface errors as toast when user explicitly asked; otherwise keep cached UI silent
        if (opts.userInitiated) {
          toast.error(lang === "hi" ? "मेंटर अभी उपलब्ध नहीं" : "Mentor unavailable right now");
        }
        if (cached) {
          setState({ status: "ready", analysis: cached.analysis, summary: cached.summary, cached: true });
        } else {
          setState({
            status: "error",
            message: lang === "hi" ? "मेंटर अभी उपलब्ध नहीं। थोड़ी देर बाद कोशिश करें।" : "Mentor unavailable right now. Please try again later.",
            summary: res.data?.summary as Summary | undefined,
          });
        }
      }
    } catch (err) {
      if (opts.userInitiated) {
        toast.error(lang === "hi" ? "नेटवर्क समस्या" : "Network problem");
      }
      if (cached) {
        setState({ status: "ready", analysis: cached.analysis, summary: cached.summary, cached: true });
      } else {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Mentor request failed",
        });
      }
    } finally {
      inflight.current = false;
    }
  };

  useEffect(() => {
    if (user) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, lang]);

  if (loading) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md card-surface p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-lg font-bold">Sign in to meet your AI Mentor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The mentor uses your exam history and study activity to give a personalised plan.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold md:text-3xl">AI Mentor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A personalised, Hinglish action plan based on your real performance.
          </p>
        </div>
        <button
          onClick={() => run({ force: true, userInitiated: true })}
          disabled={state.status === "loading" || refreshedToday}
          title={refreshedToday ? (lang === "hi" ? "आज का रिफ़्रेश हो चुका है" : "Already refreshed today") : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={"h-3.5 w-3.5 " + (state.status === "loading" ? "animate-spin" : "")} />
          {refreshedToday ? (lang === "hi" ? "कल फिर" : "Tomorrow") : "Refresh"}
        </button>

      </header>

      {(state.status === "ready" || state.status === "error") && state.summary && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Exams attempted" value={state.summary.attempts} />
          <Stat label="Total score" value={Math.round(state.summary.totalScore)} />
          <Stat label="Correct" value={state.summary.correct} tone="success" />
          <Stat label="Incorrect" value={state.summary.incorrect} tone="danger" />
        </section>
      )}

      <section className="card-surface p-5 min-h-[280px]">
        {state.status === "loading" && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>{lang === "hi" ? "आपका डेटा analyse हो रहा है…" : "Analysing your history…"}</p>
          </div>
        )}
        {state.status === "error" && (
          <div className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{lang === "hi" ? "अभी प्लान नहीं बना" : "Couldn't generate plan"}</p>
              <p className="opacity-80">{state.message}</p>
            </div>
          </div>
        )}
        {state.status === "ready" && (
          <article className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {state.analysis}
          </article>
        )}
        {state.status === "idle" && (
          <button
            onClick={() => run({ userInitiated: true })}
            className="mx-auto block rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Generate my plan
          </button>
        )}
      </section>
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
  tone?: "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="card-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={"mt-1 text-xl font-bold tabular-nums " + cls}>{value}</p>
    </div>
  );
}
