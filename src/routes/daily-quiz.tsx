import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { CheckCircle2, XCircle, Sparkles, ArrowLeft, Flame, Newspaper, BookOpen, Languages } from "lucide-react";
import {
  getTodayDailyQuiz,
  submitDailyQuizAttempt,
  getUserStreakInfo,
} from "@/lib/daily-quiz.functions";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { hideNativeAdSlot, NativeAdSlot } from "@/components/NativeAdSlot";
import { detectAppUser } from "@/lib/app-user";

const searchSchema = z.object({
  type: z.enum(["mixed", "current_affairs"]).optional(),
});

export const Route = createFileRoute("/daily-quiz")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Daily SSC Quiz (English & Hindi) — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Fresh bilingual (English + Hindi) SSC practice + current-affairs questions every day. Keep your streak alive.",
      },
      { property: "og:title", content: "Daily SSC Quiz — English & Hindi" },
      { property: "og:description", content: "10 new SSC CGL and current-affairs questions every day, in English and Hindi." },
      { property: "og:url", content: "https://sscmentorai.online/daily-quiz" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/daily-quiz" }],
  }),
  component: DailyQuizPage,
});

type BText = { en?: string; hi?: string } | string;
type Option = { text: BText; isCorrect?: boolean };

function readEn(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    const o = t as { en?: string; hi?: string };
    return o.en ?? o.hi ?? "";
  }
  return "";
}
function readHi(t: unknown): string {
  if (t && typeof t === "object") {
    const o = t as { en?: string; hi?: string };
    return o.hi ?? "";
  }
  return "";
}

function Bi({ value, className = "" }: { value: unknown; className?: string }) {
  const { lang } = useLanguage();
  const en = readEn(value);
  const hi = readHi(value);
  const primary = lang === "hi" ? hi || en : en || hi;
  return <span className={className}>{primary}</span>;
}

function DailyQuizPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const quizType = search.type ?? "mixed";
  const getQuiz = useServerFn(getTodayDailyQuiz);
  const submitFn = useServerFn(submitDailyQuizAttempt);
  const streakFn = useServerFn(getUserStreakInfo);

  const { data, isLoading } = useQuery({
    queryKey: ["today-daily-quiz", quizType],
    queryFn: () => getQuiz({ data: { type: quizType } }),
    staleTime: 5 * 60_000,
  });

  const { data: streakInfo, refetch: refetchStreak } = useQuery({
    queryKey: ["daily-quiz-streak", user?.id],
    queryFn: () => streakFn(),
    enabled: !!user,
  });

  const questions = data?.questions ?? [];
  const quiz = data?.quiz;
  const total = questions.length;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<{ correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNativeAdBreak, setShowNativeAdBreak] = useState(false);
  const [adFree, setAdFree] = useState(false);

  useEffect(() => {
    const updateEntitlement = (event?: Event) => {
      const detail = (event as CustomEvent<{ adFree?: boolean }> | undefined)?.detail;
      setAdFree(
        detail?.adFree ?? Boolean((window as unknown as { sscAdFree?: boolean }).sscAdFree),
      );
    };
    updateEntitlement();
    document.addEventListener("ssc:entitlement", updateEntitlement);
    return () => document.removeEventListener("ssc:entitlement", updateEntitlement);
  }, []);

  // Reset local state when switching tabs
  useMemo(() => {
    setCurrent(0);
    setAnswers(Array(total).fill(-1));
    setSubmitted(null);
    setShowNativeAdBreak(false);
    hideNativeAdSlot("daily_quiz_native_ad");
  }, [quizType, total]);

  // Same-day attempt (only for mixed quiz counts toward streak card)
  const attemptForThisQuiz =
    streakInfo?.today_attempt && quiz && streakInfo.today_attempt.quiz_id === quiz.id
      ? streakInfo.today_attempt
      : null;
  const alreadyDone = attemptForThisQuiz;

  const { lang, toggle } = useLanguage();

  const Tabs = (
    <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
      <div className="inline-flex rounded-xl border border-border bg-card p-1 text-xs font-semibold">
        <Link
          to="/daily-quiz"
          search={{ type: "mixed" }}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${
            quizType === "mixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Mixed
        </Link>
        <Link
          to="/daily-quiz"
          search={{ type: "current_affairs" }}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${
            quizType === "current_affairs"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" /> Current Affairs
        </Link>
      </div>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold"
        aria-label="Toggle language"
      >
        <Languages className="h-3.5 w-3.5" />
        {lang === "en" ? "हिंदी" : "English"}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        {Tabs}
        <p className="text-sm text-muted-foreground">Loading today's quiz…</p>
      </div>
    );
  }

  if (!quiz || total === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        {Tabs}
        <div className="card-surface p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-3 text-sm font-semibold">
            {quizType === "current_affairs"
              ? "Today's Current Affairs quiz will be ready soon"
              : "Today's daily quiz will be ready soon"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A new quiz is published every morning (IST). Please check back in a little while.
          </p>
        </div>
      </div>
    );
  }

  const isGuest = !user;


  const reviewMode = !!alreadyDone && !submitted;
  const showResults = !!submitted || reviewMode;
  const userAnswers = reviewMode
    ? Array.isArray((alreadyDone as { answers?: number[] }).answers)
      ? (alreadyDone as { answers?: number[] }).answers!
      : Array(total).fill(-1)
    : answers;

  async function handleSubmit() {
    if (!quiz) return;
    if (answers.some((a) => a === -1)) {
      const firstUnanswered = answers.findIndex((a) => a === -1);
      setCurrent(firstUnanswered);
      return;
    }
    if (isGuest) {
      const correct = questions.reduce(
        (acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0),
        0,
      );
      setSubmitted({ correct, total });
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitFn({ data: { quiz_id: quiz.id, answers } });
      setSubmitted({ correct: res.correct_count, total: res.total_count });
      refetchStreak();
    } catch (e) {
      alert("Submit failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  if (showResults) {
    const correctCount = submitted?.correct ?? alreadyDone?.correct_count ?? 0;
    const totalCount = submitted?.total ?? alreadyDone?.total_count ?? total;
    return (
      <div className="mx-auto max-w-2xl p-4 pb-24 sm:p-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </button>
        {Tabs}

        <div className="card-surface p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning-soft text-3xl">
            🎉
          </div>
          <p className="mt-3 font-display text-2xl font-bold">
            {correctCount}/{totalCount} correct
          </p>
          <p className="text-xs text-muted-foreground">
            {correctCount >= Math.ceil(totalCount * 0.8)
              ? "Awesome! Streak safe."
              : correctCount >= Math.ceil(totalCount * 0.5)
                ? "Good effort — keep going."
                : "Do better tomorrow!"}
          </p>
          {streakInfo && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning-foreground">
              <Flame className="h-3.5 w-3.5" /> {streakInfo.current_streak}-day streak
            </p>
          )}
        </div>

        <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Review</h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const opts = (q.options as Option[] | null) ?? [];
            const userAns = userAnswers[i] ?? -1;
            const isCorrect = userAns === q.correct;
            return (
              <div key={q.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Q{i + 1} · {q.subject}
                  </p>
                  {userAns === -1 ? (
                    <span className="text-[10px] font-bold text-muted-foreground">SKIPPED</span>
                  ) : isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <Bi value={q.text} className="mt-1 text-sm font-medium block" />
                <ol className="mt-2 space-y-1 text-sm">
                  {opts.map((opt, oi) => {
                    const isRight = oi === q.correct;
                    const isPicked = oi === userAns;
                    return (
                      <li
                        key={oi}
                        className={`rounded-lg border px-3 py-1.5 ${
                          isRight
                            ? "border-success bg-success-soft text-success"
                            : isPicked
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-border"
                        }`}
                      >
                        <span className="font-bold mr-1">{String.fromCharCode(65 + oi)}.</span>
                        <Bi value={opt.text} />
                      </li>
                    );
                  })}
                </ol>
                {q.explanation && (
                  <div className="mt-2 text-xs">
                    <b>Explanation:</b> <Bi value={q.explanation} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = questions[current];
  const opts = (q.options as Option[] | null) ?? [];
  const answered = answers.filter((a) => a !== -1).length;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 sm:p-6">
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Exit
      </button>
      {Tabs}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">
          Question {current + 1} of {total}
        </p>
        <p className="text-xs font-semibold text-primary">
          {answered}/{total} answered
        </p>
      </div>

      <div className="mb-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              hideNativeAdSlot("daily_quiz_native_ad");
              setShowNativeAdBreak(false);
              setCurrent(i);
            }}
            className={`h-1.5 rounded-full ${
              i === current ? "bg-primary" : answers[i] !== -1 ? "bg-success" : "bg-border"
            }`}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>

      {showNativeAdBreak ? (
        <NativeAdSlot slotId="daily_quiz_native_ad" />
      ) : (
      <div className="card-surface p-4">
        <p className="text-xs font-semibold text-muted-foreground">{q.subject}</p>
        <Bi value={q.text} className="mt-1 text-base font-medium block" />
        <div className="mt-4 space-y-2">
          {opts.map((opt, oi) => (
            <button
              key={oi}
              onClick={() =>
                setAnswers((prev) => {
                  const next = prev.slice();
                  next[current] = oi;
                  return next;
                })
              }
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                answers[current] === oi
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="font-bold mr-1">{String.fromCharCode(65 + oi)}.</span>
              <Bi value={opt.text} />
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            hideNativeAdSlot("daily_quiz_native_ad");
            setShowNativeAdBreak(false);
            setCurrent((c) => Math.max(0, c - 1));
          }}
          disabled={current === 0}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          Previous
        </button>
        {current < total - 1 ? (
          <button
            onClick={() => {
              if (showNativeAdBreak) {
                hideNativeAdSlot("daily_quiz_native_ad");
                setShowNativeAdBreak(false);
                setCurrent((c) => Math.min(total - 1, c + 1));
                return;
              }
              if ((current + 1) % 7 === 0 && detectAppUser() && !adFree) {
                setShowNativeAdBreak(true);
                return;
              }
              setCurrent((c) => Math.min(total - 1, c + 1));
            }}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-success px-5 py-2 text-xs font-semibold text-success-foreground disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}
