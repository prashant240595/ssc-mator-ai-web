import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
  LayoutGrid,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/quiz-types";
import { cleanSvg } from "@/lib/quiz-types";
import { Badge } from "@/components/ui/badge";
import { MathText } from "@/components/MathText";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { hideNativeAdSlot, NativeAdSlot } from "@/components/NativeAdSlot";
import { detectAppUser } from "@/lib/app-user";

export function QuizRunner({
  title,
  subtitle,
  questions,
  onExit,
  nativeAdEvery,
}: {
  title: string;
  subtitle?: string;
  questions: QuizQuestion[];
  onExit: () => void;
  nativeAdEvery?: number;
}) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [seconds, setSeconds] = useState(0);
  const [gridOpen, setGridOpen] = useState(false);
  const [attempts, setAttempts] = useState<Record<number, { selected: number; correct: number }>>(
    {},
  );
  const [showNativeAdBreak, setShowNativeAdBreak] = useState(false);
  const [adFree, setAdFree] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const q = questions[idx];

  useEffect(() => {
    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Load user's existing bookmarks for these questions
  useEffect(() => {
    if (!user || questions.length === 0) return;
    const ids = questions.map((x) => x.id);
    (async () => {
      const { data } = await supabase
        .from("question_bookmarks")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", ids);
      if (data) setBookmarked(new Set(data.map((r: any) => r.question_id)));
    })();
  }, [user, questions]);

  useEffect(() => {
    setShowNativeAdBreak(false);
    const prev = attempts[idx];
    if (prev) {
      setSelected(prev.selected);
      setSubmitted(true);
    } else {
      setSelected(null);
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const svg = useMemo(() => cleanSvg(q?.image_svg), [q]);

  if (!q) {
    return (
      <div className="card-surface p-6 text-center text-sm text-muted-foreground">
        No questions available yet.
        <div className="mt-3">
          <button
            onClick={onExit}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const text = q.text?.[lang] || q.text?.en || "";
  const explanation = q.explanation?.[lang] || q.explanation?.en || "";

  return (
    <div className="flex flex-col gap-4 pb-32">
      <header className="card-surface flex items-center justify-between gap-3 p-3">
        <button
          onClick={onExit}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground transition hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {subtitle && <p className="truncate text-sm font-semibold">{subtitle}</p>}
        </div>
        <button
          onClick={() => setGridOpen((o) => !o)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold hover:bg-muted"
          aria-label="Question grid"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> {idx + 1}/{questions.length}
        </button>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-bold text-primary">
          <Clock className="h-3.5 w-3.5" /> {fmt(seconds)}
        </div>
      </header>

      {gridOpen && (
        <div className="card-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Jump to question
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                Correct
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
                Wrong
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />
                Unseen
              </span>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
            {questions.map((_, i) => {
              const a = attempts[i];
              const isCurrent = i === idx;
              const cls = isCurrent
                ? "bg-primary text-primary-foreground ring-2 ring-primary"
                : a
                  ? a.selected === a.correct
                    ? "bg-success text-white"
                    : "bg-destructive text-white"
                  : "bg-card text-foreground border border-border";
              return (
                <button
                  key={i}
                  onClick={() => {
                    setShowNativeAdBreak(false);
                    setIdx(i);
                    setGridOpen(false);
                  }}
                  className={`h-8 rounded-md text-xs font-bold transition ${cls}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Q{idx + 1}</span>
        <span>of {questions.length}</span>
        <div className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {showNativeAdBreak ? (
        <NativeAdSlot slotId="practice_native_ad" />
      ) : (
        <div className="card-surface p-5">
          {(q.exam_name || q.shift_details) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {q.exam_name && <Badge variant="secondary">{q.exam_name}</Badge>}
              {q.shift_details && <Badge variant="outline">{q.shift_details}</Badge>}
            </div>
          )}
          {q.image_url && (
            <img
              src={q.image_url}
              alt=""
              className="mb-4 max-h-72 w-auto rounded-lg border border-border bg-muted/30 object-contain"
            />
          )}
          {svg && (
            <div
              className="mb-4 overflow-x-auto rounded-lg border border-border bg-card p-3"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
          <MathText className="text-base font-medium leading-relaxed block">{text}</MathText>

          <div className="mt-5 flex flex-col gap-2.5">
            {(q.options ?? []).map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = submitted && i === q.correct;
              const isWrong = submitted && isSelected && i !== q.correct;
              const state = isCorrect
                ? "border-success bg-success-soft text-success"
                : isWrong
                  ? "border-destructive bg-destructive-soft text-destructive"
                  : isSelected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted";
              return (
                <button
                  key={i}
                  disabled={submitted}
                  onClick={() => setSelected(i)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${state}`}
                >
                  <span
                    className={
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold " +
                      (isCorrect
                        ? "bg-success text-success-foreground"
                        : isWrong
                          ? "bg-destructive text-destructive-foreground"
                          : isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground")
                    }
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">
                    {opt.image_url && (
                      <img
                        src={opt.image_url}
                        alt=""
                        className="mb-2 max-h-32 w-auto object-contain"
                      />
                    )}
                    <MathText className="block">{opt.text?.[lang] || opt.text?.en}</MathText>
                  </span>
                  {isCorrect && <CheckCircle2 className="mt-1 h-4 w-4" />}
                  {isWrong && <XCircle className="mt-1 h-4 w-4" />}
                </button>
              );
            })}
          </div>

          {!submitted && (
            <button
              onClick={() => {
                if (selected === null) return;
                const nextSubmitCount = submitCount + 1;
                setSubmitCount(nextSubmitCount);
                setSubmitted(true);
                setAttempts((prev) => ({ ...prev, [idx]: { selected, correct: q.correct } }));
                if (
                  nativeAdEvery &&
                  detectAppUser() &&
                  !adFree &&
                  nextSubmitCount % nativeAdEvery === 0 &&
                  idx < questions.length - 1
                ) {
                  setShowNativeAdBreak(true);
                }
              }}
              disabled={selected === null}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Answer
            </button>
          )}
        </div>
      )}

      {!showNativeAdBreak && submitted && explanation && (
        <div className="card-surface animate-in slide-in-from-bottom-4 fade-in duration-300 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Lightbulb className="h-4 w-4" /> Explanation
          </div>
          <MathText className="mt-2 text-sm leading-relaxed text-muted-foreground block">
            {explanation}
          </MathText>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <button
            disabled={idx === 0}
            onClick={() => {
              setShowNativeAdBreak(false);
              setIdx((i) => Math.max(0, i - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Prev
          </button>
          {!showNativeAdBreak && (
            <button
              onClick={async () => {
                if (!user) {
                  toast.error("Sign in to bookmark questions");
                  return;
                }
                const isSaved = bookmarked.has(q.id);
                // optimistic
                setBookmarked((prev) => {
                  const next = new Set(prev);
                  if (isSaved) next.delete(q.id);
                  else next.add(q.id);
                  return next;
                });
                if (isSaved) {
                  const { error } = await supabase
                    .from("question_bookmarks")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("question_id", q.id);
                  if (error) toast.error("Could not remove bookmark");
                  else toast.success("Bookmark removed");
                } else {
                  const { error } = await supabase
                    .from("question_bookmarks")
                    .insert({ user_id: user.id, question_id: q.id });
                  if (error) toast.error("Could not save bookmark");
                  else toast.success("Bookmarked");
                }
              }}
              className={
                "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition " +
                (bookmarked.has(q.id)
                  ? "border-warning bg-warning-soft text-warning-foreground"
                  : "border-border bg-card hover:bg-muted")
              }
            >
              {bookmarked.has(q.id) ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Bookmark</span>
            </button>
          )}

          <button
            disabled={idx === questions.length - 1}
            onClick={() => {
              hideNativeAdSlot("practice_native_ad");
              setShowNativeAdBreak(false);
              setIdx((i) => Math.min(questions.length - 1, i + 1));
            }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-40 sm:flex-initial"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
