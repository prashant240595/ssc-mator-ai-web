import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Clock, Flag, Languages, LayoutGrid, X, ChevronRight, Maximize2, Pause, Play } from "lucide-react";
import { cleanSvg, type QuizQuestion } from "@/lib/quiz-types";
import { useLanguage } from "@/lib/i18n";
import { MathText } from "@/components/MathText";
import { ResultDashboard } from "@/components/ResultDashboard";
import type { ExamConfig } from "@/components/ExamPlayer";

export type MockTestConfig = Omit<ExamConfig, "shift"> & {
  examId?: string | null;
  examName: string;
  examType: "mock_test" | "pyq";
  positiveMark?: number;
  negativeMarking: number;
  /** Minutes per section (default 15) */
  sectionMinutes?: number;
  /** Show pause/resume button and allow the section timer to be paused. */
  allowPause?: boolean;
  /** localStorage key for progress persistence; if set, in-progress state auto-saves and can be resumed. */
  storageKey?: string;
  /** Optional shift label passed through to the result screen (PYQ uses this). */
  shiftLabel?: string;
};

// Guard the whole mock test flow so a render error can't bubble to the
// TanStack root ErrorComponent ("This page didn't load"). Users still see
// their submission got through and can exit cleanly.
class MockErrorBoundary extends Component<
  { children: ReactNode; onExit: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[MockTestPlayer] render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-5">
          <div className="card-surface max-w-md p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-3 text-lg font-bold">Something went wrong</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your test progress was saved locally. Please exit and try again.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-2 text-left text-[10px] text-muted-foreground">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={this.props.onExit}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Exit
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MOCK_SECTIONS = ["Reasoning", "GA", "Quant", "English"] as const;
export type MockSection = (typeof MOCK_SECTIONS)[number];

/** Normalise a CSV `section` value (or stored `shift_details`) → canonical name */
export function canonicaliseSection(raw: string | null | undefined): MockSection | null {
  const s = (raw || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s) return null;
  if (["reasoning", "generalintelligence", "gi", "gir", "intelligence", "1"].includes(s)) return "Reasoning";
  if (["ga", "generalawareness", "awareness", "gk", "generalknowledge", "2"].includes(s)) return "GA";
  if (
    ["quant", "quantitative", "quantitativeaptitude", "qa", "maths", "math", "mathematics", "3"].includes(s)
  )
    return "Quant";
  if (["english", "englishcomprehension", "eng", "4"].includes(s)) return "English";
  return null;
}

const SECTION_LABEL: Record<MockSection, string> = {
  Reasoning: "General Intelligence & Reasoning",
  GA: "General Awareness",
  Quant: "Quantitative Aptitude",
  English: "English Comprehension",
};

type QStatus = "not_visited" | "not_answered" | "answered" | "review";

export function MockTestPlayer(props: {
  config: MockTestConfig;
  questions: QuizQuestion[];
  onExit: () => void;
}) {
  return (
    <MockErrorBoundary onExit={props.onExit}>
      <MockTestPlayerInner {...props} />
    </MockErrorBoundary>
  );
}

function MockTestPlayerInner({
  config,
  questions,
  onExit,
}: {
  config: MockTestConfig;
  questions: QuizQuestion[];
  onExit: () => void;
}) {
  const positive = config.positiveMark ?? 2;
  const sectionMinutes = config.sectionMinutes ?? 15;
  const { lang, toggle } = useLanguage();

  // Group questions by their subject value, preserving first-seen order.
  // Subject string is taken verbatim from CSV (admin can rename it later).
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, QuizQuestion[]> = {};
    for (const q of questions) {
      const key = (q.subject || q.shift_details || "Section").trim() || "Section";
      if (!(key in map)) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(q);
    }
    return order.map((s) => ({ section: s, qs: map[s] }));
  }, [questions]);

  const [sectionIdx, setSectionIdx] = useState(0);
  const [current, setCurrent] = useState(0);
  // answers keyed by `${sectionIdx}:${qIdx}` → option index
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<number, QStatus[]>>(() => {
    const o: Record<number, QStatus[]> = {};
    grouped.forEach((g, i) => {
      o[i] = g.qs.map((_, j) => (j === 0 ? "not_answered" : "not_visited"));
    });
    return o;
  });
  /** Sections that are already submitted/locked (cannot return). */
  const [lockedSections, setLockedSections] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState(sectionMinutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<null | {
    sectionIdx: number;
    current: number;
    remaining: number;
    answersCount: number;
  }>(null);
  const [hydrated, setHydrated] = useState(false);
  const submittingRef = useRef(false);
  const timingsRef = useRef<Record<string, number>>({});
  const startRef = useRef(Date.now());

  // Per-question time tracking (skip while paused/submitted/resume-prompt)
  useEffect(() => {
    if (submitted || paused || resumePrompt || !hydrated) return;
    const key = `${sectionIdx}:${current}`;
    const start = Date.now();
    startRef.current = start;
    return () => {
      const dt = Math.round((Date.now() - start) / 1000);
      if (dt > 0) timingsRef.current[key] = (timingsRef.current[key] ?? 0) + dt;
    };
  }, [sectionIdx, current, paused, submitted, resumePrompt, hydrated]);


  // On mount, check localStorage for saved progress and ask the user.
  useEffect(() => {
    if (!config.storageKey) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(config.storageKey);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object" && Array.isArray(saved.grouped) && saved.grouped.length === grouped.length) {
        setResumePrompt({
          sectionIdx: saved.sectionIdx ?? 0,
          current: saved.current ?? 0,
          remaining: saved.remaining ?? sectionMinutes * 60,
          answersCount: Object.keys(saved.answers ?? {}).length,
        });
      } else {
        localStorage.removeItem(config.storageKey);
        setHydrated(true);
      }
    } catch {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyResume = () => {
    if (!config.storageKey) return;
    try {
      const raw = localStorage.getItem(config.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setSectionIdx(saved.sectionIdx ?? 0);
      setCurrent(saved.current ?? 0);
      setAnswers(saved.answers ?? {});
      setStatuses(saved.statuses ?? {});
      setLockedSections(new Set<number>(saved.lockedSections ?? []));
      setRemaining(saved.remaining ?? sectionMinutes * 60);
      setPaused(true); // start paused so user isn't surprised
    } catch {
      /* ignore */
    }
    setResumePrompt(null);
    setHydrated(true);
  };

  const discardSaved = () => {
    if (config.storageKey) {
      try { localStorage.removeItem(config.storageKey); } catch { /* ignore */ }
    }
    setResumePrompt(null);
    setHydrated(true);
  };

  // Persist progress on any change (only after we've hydrated + before submit)
  useEffect(() => {
    if (!config.storageKey || !hydrated || submitted) return;
    try {
      const payload = {
        grouped: grouped.map((g) => g.section),
        sectionIdx,
        current,
        answers,
        statuses,
        lockedSections: Array.from(lockedSections),
        remaining,
        updatedAt: Date.now(),
      };
      localStorage.setItem(config.storageKey, JSON.stringify(payload));
    } catch { /* ignore quota */ }
  }, [config.storageKey, hydrated, submitted, grouped, sectionIdx, current, answers, statuses, lockedSections, remaining]);

  // Fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Reset timer + position when section changes (skip during hydration/resume)
  const lastSectionRef = useRef(sectionIdx);
  useEffect(() => {
    if (lastSectionRef.current === sectionIdx) return;
    lastSectionRef.current = sectionIdx;
    setRemaining(sectionMinutes * 60);
    setCurrent(0);
  }, [sectionIdx, sectionMinutes]);

  const finishExam = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const key = `${sectionIdx}:${current}`;
    const dt = Math.round((Date.now() - startRef.current) / 1000);
    if (dt > 0) timingsRef.current[key] = (timingsRef.current[key] ?? 0) + dt;
    startRef.current = Date.now();
    if (config.storageKey) {
      try { localStorage.removeItem(config.storageKey); } catch { /* ignore */ }
    }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setSubmitted(true);
  };


  const advanceSection = () => {
    setLockedSections((prev) => new Set(prev).add(sectionIdx));
    if (sectionIdx >= grouped.length - 1) {
      finishExam();
    } else {
      setSectionIdx((i) => i + 1);
    }
  };

  // Sectional countdown
  useEffect(() => {
    if (submitted || paused || resumePrompt || !hydrated) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          // Auto-submit current section, move to next
          advanceSection();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdx, submitted, paused, resumePrompt, hydrated]);

  if (grouped.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-md card-surface p-6 text-center">
        <p className="text-sm font-semibold">No questions found for this mock test.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Each row needs a <code>section</code> column with one of: Reasoning, GA, Quant, English.
        </p>
        <button
          onClick={onExit}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back
        </button>
      </div>
    );
  }

  if (submitted) {
    // Flatten all questions + answers into a single result for the dashboard
    const flatQs: QuizQuestion[] = [];
    const flatAns: Record<number, number> = {};
    const flatTimings: Record<number, number> = {};
    grouped.forEach((g, si) => {
      g.qs.forEach((q, qi) => {
        const key = `${si}:${qi}`;
        const ans = answers[key];
        const idx = flatQs.length;
        flatQs.push(q);
        if (ans != null) flatAns[idx] = ans;
        const t = timingsRef.current[key];
        if (t) flatTimings[idx] = t;
      });
    });
    const resultConfig: ExamConfig = {
      examId: config.examId ?? null,
      examName: config.examName,
      shift: config.shiftLabel ?? "Full Test",
      examType: config.examType,
      totalTimeMinutes: sectionMinutes * grouped.length,
      negativeMarking: config.negativeMarking,
      positiveMark: positive,
    };
    return (
      <ResultDashboard
        config={resultConfig}
        questions={flatQs}
        answers={flatAns}
        positive={positive}
        timings={flatTimings}
        onExit={onExit}
      />
    );

  }

  const sec = grouped[sectionIdx];
  const q = sec.qs[current];
  const secStatuses = statuses[sectionIdx] ?? [];
  const ansKey = `${sectionIdx}:${current}`;
  const selected = answers[ansKey];

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining < 120;

  const goTo = (i: number) => {
    if (i < 0 || i >= sec.qs.length) return;
    setCurrent(i);
    setStatuses((prev) => {
      const arr = [...(prev[sectionIdx] ?? [])];
      if (arr[i] === "not_visited") {
        arr[i] = answers[`${sectionIdx}:${i}`] != null ? "answered" : "not_answered";
      }
      return { ...prev, [sectionIdx]: arr };
    });
  };

  const selectOption = (optIdx: number) => {
    setAnswers((a) => ({ ...a, [ansKey]: optIdx }));
  };

  const setStatus = (status: QStatus) => {
    setStatuses((prev) => {
      const arr = [...(prev[sectionIdx] ?? [])];
      arr[current] = status;
      return { ...prev, [sectionIdx]: arr };
    });
  };

  const saveAndNext = () => {
    setStatus(selected != null ? "answered" : "not_answered");
    if (current < sec.qs.length - 1) goTo(current + 1);
  };

  const markReviewAndNext = () => {
    setStatus("review");
    if (current < sec.qs.length - 1) goTo(current + 1);
  };

  const clearResponse = () => {
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[ansKey];
      return copy;
    });
    setStatus("not_answered");
  };

  // NOTE: plain computation (not useMemo) — this runs after early returns
  // above, so a hook here would violate rules-of-hooks and throw React #300.
  const counts = (() => {
    let answered = 0, notAnswered = 0, review = 0, notVisited = 0;
    secStatuses.forEach((s, i) => {
      const isAns = answers[`${sectionIdx}:${i}`] != null;
      if (s === "review") review++;
      else if (isAns) answered++;
      else if (s === "not_visited") notVisited++;
      else notAnswered++;
    });
    return { answered, notAnswered, review, notVisited };
  })();

  const isLastSection = sectionIdx >= grouped.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="relative z-[60] flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-border bg-card px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="min-w-0 max-w-full flex-1 basis-full sm:basis-auto">
          <p className="truncate text-sm font-bold">{config.examName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Section {sectionIdx + 1} of {grouped.length} · {sec.section}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div
            className={
              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold tabular-nums " +
              (lowTime
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground")
            }
          >
            <Clock className="h-3.5 w-3.5" />
            {mm}:{ss}
          </div>
          {config.allowPause && (
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
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {current + 1}/{sec.qs.length}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="relative z-[61] inline-flex items-center gap-1 rounded-lg bg-destructive px-2 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
          >
            {isLastSection ? <><X className="h-3.5 w-3.5" /> Submit</> : <><ChevronRight className="h-3.5 w-3.5" /> End Section</>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question pane */}
        <main className="flex flex-1 flex-col overflow-y-auto p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {current + 1} of {sec.qs.length}
          </p>
          <div className="mt-2">
            {q.image_url && (
              <img src={q.image_url} alt="" className="mb-3 max-h-64 rounded-lg border border-border object-contain" />
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

          {/* 4 options as radio-style buttons */}
          <div className="mt-5 space-y-2.5" role="radiogroup">
            {(q.options ?? []).map((opt, i) => {
              const isSel = selected === i;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => selectOption(i)}
                  className={
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition " +
                    (isSel ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/50")
                  }
                >
                  <span
                    className={
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 " +
                      (isSel ? "border-primary" : "border-muted-foreground/40")
                    }
                  >
                    {isSel && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {opt.image_url && (
                      <img src={opt.image_url} alt="" className="mb-2 max-h-32 w-auto object-contain" />
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
              onClick={markReviewAndNext}
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-200"
            >
              <Flag className="mr-1 inline h-3.5 w-3.5" /> Mark for Review &amp; Next
            </button>
            <button
              onClick={saveAndNext}
              className="ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elevated hover:opacity-95"
            >
              Save &amp; Next
            </button>
          </div>
        </main>

        {/* Palette */}
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
              <Legend swatch="bg-green-500" label={`${counts.answered} Answered`} />
              <Legend swatch="bg-red-500" label={`${counts.notAnswered} Not Ans.`} />
              <Legend swatch="bg-purple-500" label={`${counts.review} Review`} />
              <Legend swatch="bg-muted border border-border" label={`${counts.notVisited} Not Visited`} />
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
              {sec.section}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {sec.qs.map((_, i) => {
                const isCurrent = i === current;
                const st = secStatuses[i];
                const isAns = answers[`${sectionIdx}:${i}`] != null;
                let cls = "bg-muted text-foreground border border-border";
                if (st === "review") cls = "bg-purple-500 text-white";
                else if (isAns) cls = "bg-green-500 text-white";
                else if (st === "not_answered") cls = "bg-red-500 text-white";
                if (isCurrent) cls += " ring-2 ring-primary ring-offset-1 ring-offset-card";
                return (
                  <button
                    key={i}
                    onClick={() => {
                      goTo(i);
                      setPaletteOpen(false);
                    }}
                    className={`h-9 w-9 rounded-md text-xs font-bold transition ${cls}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Section progress strip */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sections
              </p>
              <div className="space-y-1.5">
                {grouped.map((g, i) => {
                  const isCur = i === sectionIdx;
                  const isLocked = lockedSections.has(i) || i < sectionIdx;
                  return (
                    <div
                      key={g.section}
                      className={
                        "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs " +
                        (isCur
                          ? "border-primary bg-primary-soft font-bold"
                          : isLocked
                            ? "border-border bg-muted text-muted-foreground line-through"
                            : "border-dashed border-border text-muted-foreground")
                      }
                    >
                      <span className="truncate">{i + 1}. {g.section}</span>
                      <span className="ml-2 shrink-0">{g.qs.length}Q</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90"
            >
              {isLastSection ? <><Flag className="h-4 w-4" /> Submit Exam</> : <><ChevronRight className="h-4 w-4" /> End Section &amp; Continue</>}
            </button>
          </div>
        </aside>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-card-foreground shadow-elevated">
            <p className="text-base font-bold">
              {isLastSection ? "Submit final section?" : `End ${sec.section}?`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLastSection
                ? "Your full mock test will be submitted and results will open."
                : "You will not be able to return to this section. Remaining time is forfeited."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  advanceSection();
                }}
                className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                {isLastSection ? "Submit" : "End Section"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resumePrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-elevated">
            <p className="text-base font-bold">Resume previous attempt?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You paused this exam earlier. Section {resumePrompt.sectionIdx + 1}, question {resumePrompt.current + 1},
              {" "}with {Math.floor(resumePrompt.remaining / 60)}:{String(resumePrompt.remaining % 60).padStart(2, "0")} left
              {" "}and {resumePrompt.answersCount} answers saved.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={discardSaved}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={applyResume}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {paused && !resumePrompt && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-center shadow-elevated">
            <Pause className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-base font-bold">Exam Paused</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Timer is paused. You can safely leave and come back — your progress is saved.
            </p>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Play className="h-4 w-4" /> Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`grid h-4 w-4 place-items-center rounded ${swatch}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}
