import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Flag, X, Maximize2, Languages, LayoutGrid } from "lucide-react";
import { cleanSvg, type QuizQuestion } from "@/lib/quiz-types";
import { useLanguage } from "@/lib/i18n";
import { ResultDashboard } from "@/components/ResultDashboard";
import { MathText } from "@/components/MathText";

export type ExamConfig = {
  examId?: string | null;
  examName: string;
  shift: string;
  examType: "pyq" | "mock_test";
  totalTimeMinutes: number;
  negativeMarking: number;
  positiveMark?: number;
};

type Status = "not_visited" | "not_answered" | "answered";

export function ExamPlayer({
  config,
  questions,
  onExit,
}: {
  config: ExamConfig;
  questions: QuizQuestion[];
  onExit: () => void;
}) {
  const positive = config.positiveMark ?? 2;
  const { lang, toggle } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [statuses, setStatuses] = useState<Status[]>(
    () => questions.map((_, i) => (i === 0 ? "not_answered" : "not_visited")),
  );
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(config.totalTimeMinutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const submittedRef = useRef(false);
  const timingsRef = useRef<Record<number, number>>({});
  const startRef = useRef(Date.now());

  // Fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Per-question time tracking (skip while paused/submitted)
  useEffect(() => {
    if (submitted || paused) return;
    const idx = current;
    const start = Date.now();
    startRef.current = start;
    return () => {
      const dt = Math.round((Date.now() - start) / 1000);
      if (dt > 0) timingsRef.current[idx] = (timingsRef.current[idx] ?? 0) + dt;
    };
  }, [current, paused, submitted]);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const dt = Math.round((Date.now() - startRef.current) / 1000);
    if (dt > 0) timingsRef.current[current] = (timingsRef.current[current] ?? 0) + dt;
    startRef.current = Date.now();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setSubmitted(true);
  };


  const requestSubmitConfirmation = () => {
    setPaletteOpen(false);
    setConfirmSubmitOpen(true);
  };

  // Timer
  useEffect(() => {
    if (submitted || paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          submit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, submitted]);

  const goTo = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setCurrent(i);
    setStatuses((prev) => {
      if (prev[i] === "not_visited") {
        const next = [...prev];
        next[i] = answers[i] != null ? "answered" : "not_answered";
        return next;
      }
      return prev;
    });
  };

  const selectOption = (optIdx: number) => {
    setAnswers((a) => ({ ...a, [current]: optIdx }));
  };

  const saveAndNext = () => {
    setStatuses((prev) => {
      const next = [...prev];
      next[current] = answers[current] != null ? "answered" : "not_answered";
      return next;
    });
    goTo(current + 1);
  };

  const clearResponse = () => {
    setAnswers((a) => {
      const { [current]: _, ...rest } = a;
      return rest;
    });
    setStatuses((prev) => {
      const next = [...prev];
      next[current] = "not_answered";
      return next;
    });
  };

  const counts = useMemo(() => {
    const answered = Object.keys(answers).length;
    const visited = statuses.filter((s) => s !== "not_visited").length;
    return {
      answered,
      notAnswered: visited - answered,
      notVisited: questions.length - visited,
    };
  }, [answers, statuses, questions.length]);

  if (submitted) {
    return (
      <ResultDashboard
        config={config}
        questions={questions}
        answers={answers}
        positive={positive}
        timings={timingsRef.current}
        onExit={onExit}
      />
    );
  }


  const q = questions[current];
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining < 300;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="relative z-[60] flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-border bg-card px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="min-w-0 max-w-full flex-1 basis-full sm:basis-auto">
          <p className="truncate text-sm font-bold">{config.examName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{config.shift}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div
            className={
              "rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums " +
              (lowTime ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")
            }
          >
            {mm}:{ss}
          </div>
          {config.examType === "pyq" && (
            <button
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span>
            </button>
          )}
          <button
            onClick={toggle}
            title="Toggle language"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "en" ? "EN" : "हिं"}
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Full
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="md:hidden inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold hover:bg-muted"
            aria-label="Open question palette"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {current + 1}/{questions.length}
          </button>
          <button
            type="button"
            onClick={requestSubmitConfirmation}
            className="relative z-[61] inline-flex items-center gap-1 rounded-lg bg-destructive px-2 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 active:scale-[0.98]"
          >
            <X className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </header>

      {paused && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit rounded-b-xl bg-warning px-4 py-1.5 text-xs font-semibold text-warning-foreground shadow-elevated">
          Paused
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Question pane */}
        <main className="flex flex-1 flex-col overflow-y-auto p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {current + 1} of {questions.length}
          </p>
          <div className="mt-2">
            {q.image_url && (
              <img
                src={q.image_url}
                alt=""
                className="mb-3 max-h-64 rounded-lg border border-border object-contain"
              />
            )}
            {cleanSvg(q.image_svg) && (
              <div
                className="mb-3 max-h-64 overflow-auto rounded-lg border border-border bg-white p-2"
                dangerouslySetInnerHTML={{ __html: cleanSvg(q.image_svg)! }}
              />
            )}
            <MathText className="block text-base font-semibold leading-relaxed md:text-lg">
              {q.text?.[lang] || q.text?.en || "—"}
            </MathText>
          </div>

          <div className="mt-5 space-y-2.5">
            {(q.options ?? []).map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  className={
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition " +
                    (selected
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card hover:border-primary/50")
                  }
                >
                  <span
                    className={
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold " +
                      (selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border")
                    }
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {opt.image_url && (
                      <img
                        src={opt.image_url}
                        alt=""
                        className="mb-2 max-h-32 w-auto object-contain"
                      />
                    )}
                    <MathText className="block whitespace-pre-wrap">{opt.text?.[lang] || opt.text?.en}</MathText>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <button
              onClick={clearResponse}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Clear Response
            </button>
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={saveAndNext}
              className="ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elevated hover:opacity-95"
            >
              Save &amp; Next
            </button>
          </div>
        </main>

        {/* Palette - mobile overlay */}
        {paletteOpen && (
          <button
            type="button"
            aria-label="Close palette"
            onClick={() => setPaletteOpen(false)}
            className="md:hidden fixed inset-0 z-[65] bg-black/50"
          />
        )}
        <aside
          className={
            "flex w-[300px] shrink-0 flex-col border-l border-border bg-card md:bg-muted/30 " +
            "fixed inset-y-0 right-0 z-[70] transition-transform md:static md:translate-x-0 md:flex " +
            (paletteOpen ? "translate-x-0" : "translate-x-full md:translate-x-0")
          }
        >
          <div className="flex items-center justify-between border-b border-border p-3 text-xs">
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Legend swatch="bg-success text-white" label={`${counts.answered} Answered`} />
              <Legend swatch="bg-destructive text-white" label={`${counts.notAnswered} Not Answered`} />
              <Legend swatch="bg-muted text-foreground border border-border" label={`${counts.notVisited} Not Visited`} />
              <Legend swatch="bg-primary text-white" label={`Q ${current + 1} Current`} />
            </div>
            <button
              onClick={() => setPaletteOpen(false)}
              className="md:hidden ml-2 rounded-md p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Question Palette
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const s = statuses[i];
                const isCurrent = i === current;
                const base =
                  "h-9 w-9 rounded-md text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-primary";
                const cls = isCurrent
                  ? "bg-primary text-primary-foreground ring-2 ring-primary"
                  : s === "answered"
                    ? "bg-success text-white"
                    : s === "not_answered"
                      ? "bg-destructive text-white"
                      : "bg-card text-foreground border border-border";
                return (
                  <button
                    key={i}
                    onClick={() => {
                      goTo(i);
                      setPaletteOpen(false);
                    }}
                    className={`${base} ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={requestSubmitConfirmation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 active:scale-[0.98]"
            >
              <Flag className="h-4 w-4" /> Submit Exam
            </button>
          </div>
        </aside>
      </div>

      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-card-foreground shadow-elevated">
            <p className="text-base font-bold">Submit exam?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your answers will be submitted and the result will open.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmSubmitOpen(false);
                  submit();
                }}
                className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 active:scale-[0.98]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`grid h-5 w-5 place-items-center rounded ${swatch} text-[10px] font-bold`}>
        ●
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

