import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, FileText, Timer, Clock, MinusCircle, ListChecks, Play, Lock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { QuizQuestion } from "@/lib/quiz-types";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

import { MockTestPlayer, type MockTestConfig } from "@/components/MockTestPlayer";


type Search = { type?: "pyq" | "mock_test"; exam?: string; year?: string; shift?: string };

export const Route = createFileRoute("/exams")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    type: s.type === "pyq" || s.type === "mock_test" ? s.type : undefined,
    exam: typeof s.exam === "string" ? s.exam : undefined,
    year: typeof s.year === "string" ? s.year : undefined,
    shift: typeof s.shift === "string" ? s.shift : undefined,
  }),
  head: () => ({
    meta: [
      { title: "SSC CGL Exam Series & Previous Year Papers — SSC Mentor AI" },
      { name: "description", content: "Browse SSC CGL previous year question papers and full-length mock test series, organised by year and shift." },
      { property: "og:title", content: "SSC CGL Exam Series & Previous Year Papers" },
      { property: "og:description", content: "Previous year papers and mock test series for SSC CGL, by year and shift." },
      { property: "og:url", content: "https://sscmentorai.online/exams" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/exams" }],
  }),
  component: ExamsPage,
});

// Parse "Name (2024)" → { base: "Name", year: "2024" }
function parseExamName(name: string): { base: string; year: string | null } {
  const m = name.match(/^(.*)\s*\((\d{4})\)\s*$/);
  if (m) return { base: m[1].trim(), year: m[2] };
  return { base: name, year: null };
}

function composeExamName(base: string, year: string | null): string {
  return year ? `${base} (${year})` : base;
}

function ExamsPage() {
  const { type, exam, year, shift } = Route.useSearch();
  const { isAuthenticated, loading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Before hydration (SSR / crawlers) render the static overview so bots see real content.
  if (!hydrated) return <TypePicker />;
  if (loading) return <Loading />;
  if (!isAuthenticated) return <SignInGate />;
  if (!type) return <TypePicker />;
  if (!exam) return <ExamPicker type={type} />;
  if (type === "pyq" && !year) return <YearPicker exam={exam} />;
  // Mock tests skip the shift picker — the test itself is the unit, sections are inside.
  if (type === "mock_test") return <ExamRunner type={type} exam={exam} shift="__mock__" />;
  if (!shift) return <ShiftPicker type={type} exam={exam} year={year} />;
  return <ExamRunner type={type} exam={exam} year={year} shift={shift} />;
}

function TypePicker() {
  const opts = [
    {
      id: "pyq" as const,
      label: "Previous Year Papers",
      desc: "Authentic SSC papers from previous shifts.",
      icon: FileText,
    },
    {
      id: "mock_test" as const,
      label: "Mock Tests",
      desc: "Full-length curated mocks under exam timing.",
      icon: Timer,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Exam Series</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">What do you want to attempt?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Attempt authentic SSC CGL previous year question papers (Tier 1 and Tier 2) shift by
          shift, or take full-length mock tests under real exam timing with negative marking.
          Every paper includes detailed solutions, a question palette, time spent per question,
          and a subject-wise plus topic-wise accuracy report after you submit.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {opts.map((o) => (
          <Link
            key={o.id}
            to="/exams"
            search={{ type: o.id }}
            className="card-surface group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <o.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExamPicker({ type }: { type: "pyq" | "mock_test" }) {
  // For PYQ we group by the base exam name (without year suffix).
  const [items, setItems] = useState<{ exam: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("list_exam_series", { p_type: type });
      const arr = (data ?? []).map((r: any) => ({ exam: r.exam as string, count: Number(r.question_count) }));
      setItems(arr);
      setLoading(false);
    })();
  }, [type]);


  return (
    <div className="flex flex-col gap-6">
      <Header
        eyebrow={type === "pyq" ? "Previous Year Papers" : "Mock Tests"}
        title="Choose an exam"
        backTo={{ to: "/exams", search: {} }}
      />
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty title="No exams uploaded yet" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((e) => (
            <Link
              key={e.exam}
              to="/exams"
              search={{ type, exam: e.exam }}
              className="card-surface group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.exam}</p>
                <p className="truncate text-xs text-muted-foreground">{e.count} questions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function YearPicker({ exam }: { exam: string }) {
  const [years, setYears] = useState<{ year: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("list_exam_years", { p_exam: exam });
      const arr = (data ?? []).map((r: any) => ({ year: r.year as string, count: Number(r.question_count) }));
      setYears(arr);
      setLoading(false);
    })();
  }, [exam]);


  return (
    <div className="flex flex-col gap-6">
      <Header eyebrow={exam} title="Choose a year" backTo={{ to: "/exams", search: { type: "pyq" } }} />
      {loading ? (
        <Loading />
      ) : years.length === 0 ? (
        <Empty title="No years found" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {years.map((y) => (
            <Link
              key={y.year}
              to="/exams"
              search={{ type: "pyq", exam, year: y.year }}
              className="card-surface group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Calendar className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{y.year}</p>
                <p className="truncate text-xs text-muted-foreground">{y.count} questions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function resolveExamName(type: "pyq" | "mock_test", exam: string, year?: string): string {
  if (type !== "pyq") return exam;
  if (!year || year === "Unknown") return exam;
  return composeExamName(exam, year);
}

function ShiftPicker({ type, exam, year }: { type: "pyq" | "mock_test"; exam: string; year?: string }) {
  const [shifts, setShifts] = useState<{ shift: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const effectiveExam = resolveExamName(type, exam, year);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("list_exam_shifts", { p_type: type, p_exam: effectiveExam });
      const arr = (data ?? []).map((r: any) => ({ shift: r.shift as string, count: Number(r.question_count) }));
      setShifts(arr);
      setLoading(false);
    })();
  }, [type, effectiveExam]);


  const backSearch: Search = type === "pyq" ? { type, exam } : { type };

  return (
    <div className="flex flex-col gap-6">
      <Header
        eyebrow={type === "pyq" && year ? `${exam} · ${year}` : exam}
        title="Pick a shift"
        backTo={{ to: "/exams", search: backSearch }}
      />
      {loading ? (
        <Loading />
      ) : shifts.length === 0 ? (
        <Empty title="No shifts found" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shifts.map((s) => (
            <Link
              key={s.shift}
              to="/exams"
              search={{ type, exam, year, shift: s.shift }}
              className="card-surface group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
                <Timer className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.shift}</p>
                <p className="truncate text-xs text-muted-foreground">{s.count} questions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type ExamMeta = {
  id?: string | null;
  total_time_minutes: number;
  negative_marking: number;
  correct_marks: number;
  exam_summary: string | null;
};

function ExamRunner({
  type,
  exam,
  year,
  shift,
}: {
  type: "pyq" | "mock_test";
  exam: string;
  year?: string;
  shift: string;
}) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [started, setStarted] = useState(false);
  const effectiveExam = resolveExamName(type, exam, year);

  const isMock = type === "mock_test";

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("question_bank")
        .select("id,subject,topic_name,category_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg")
        .eq("category_type", "exam_series")
        .eq("exam_type", type)
        .eq("exam_name", effectiveExam)
        .is("deleted_at", null);
      if (!isMock) {
        q = shift === "Full Paper" ? q.is("shift_details", null) : q.eq("shift_details", shift);
      }
      const { data } = await q.limit(1000);
      setQuestions((data ?? []) as unknown as QuizQuestion[]);

      const { data: metaData } = await supabase
        .from("exam_metadata")
        .select("id,total_time_minutes,negative_marking,correct_marks,exam_summary")
        .eq("exam_name", effectiveExam)
        .maybeSingle();
      setMeta(
        metaData
          ? {
              id: metaData.id,
              total_time_minutes: metaData.total_time_minutes,
              negative_marking: Number(metaData.negative_marking),
              correct_marks: Number(metaData.correct_marks ?? 2),
              exam_summary: metaData.exam_summary,
            }
          : {
              id: null,
              total_time_minutes: isMock ? 60 : 60,
              negative_marking: 0.5,
              correct_marks: 2,
              exam_summary: null,
            },
      );
    })();
  }, [type, effectiveExam, shift, isMock]);

  const ordered = useMemo(() => questions ?? [], [questions]);
  if (!questions || !meta) return <Loading />;

  const exitToShifts = () =>
    navigate({ to: "/exams", search: isMock ? { type } : type === "pyq" ? { type, exam, year } : { type, exam } });

  if (!started) {
    return (
      <PreExamScreen
        exam={effectiveExam}
        shift={isMock ? "4 sections · 15 min each" : shift}
        type={type}
        meta={isMock ? { ...meta, total_time_minutes: 60 } : meta}
        questionCount={ordered.length}
        onStart={() => {
          void logActivity("started_exam", { exam_id: meta.id, exam_name: effectiveExam, shift: isMock ? "Full Test" : shift, exam_type: type });
          setStarted(true);
        }}
        onBack={exitToShifts}
      />
    );
  }

  if (isMock) {
    const mockConfig: MockTestConfig = {
      examId: meta.id ?? null,
      examName: effectiveExam,
      examType: "mock_test",
      totalTimeMinutes: 60,
      negativeMarking: Number(meta.negative_marking),
      positiveMark: Number(meta.correct_marks),
      sectionMinutes: 15,
    };
    return <MockTestPlayer config={mockConfig} questions={ordered} onExit={exitToShifts} />;
  }

  // PYQ: run subject-wise, 15 min per section, pause/resume allowed, progress persisted.
  const pyqConfig: MockTestConfig = {
    examId: meta.id ?? null,
    examName: effectiveExam,
    examType: "pyq",
    totalTimeMinutes: meta.total_time_minutes,
    negativeMarking: Number(meta.negative_marking),
    positiveMark: Number(meta.correct_marks),
    sectionMinutes: 15,
    allowPause: true,
    shiftLabel: shift,
    storageKey: `pyq-progress:${effectiveExam}:${shift}`,
  };
  return <MockTestPlayer config={pyqConfig} questions={ordered} onExit={exitToShifts} />;
}


function SignInGate() {
  return (
    <div className="mx-auto max-w-md card-surface p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-bold">Sign in to take this exam</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We track your progress so the AI Mentor can guide your prep. Please sign in to continue.
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

function PreExamScreen({
  exam,
  shift,
  type,
  meta,
  questionCount,
  onStart,
  onBack,
}: {
  exam: string;
  shift: string;
  type: "pyq" | "mock_test";
  meta: ExamMeta;
  questionCount: number;
  onStart: () => void;
  onBack: () => void;
}) {
  const totalMarks = questionCount * Number(meta.correct_marks ?? 2);
  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {type === "pyq" ? "Previous Year Paper" : "Mock Test"}
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{exam}</h1>
          <p className="text-sm text-muted-foreground">{shift}</p>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={ListChecks} label="Questions" value={questionCount} />
        <InfoCard icon={Clock} label="Duration" value={`${meta.total_time_minutes} min`} />
        <InfoCard icon={MinusCircle} label="Negative" value={`-${meta.negative_marking}`} />
        <InfoCard icon={FileText} label="Max Marks" value={totalMarks} />
      </div>

      <div className="card-surface mt-5 p-5">
        <p className="text-sm font-bold">Instructions</p>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          {meta.exam_summary ? (
            <p className="whitespace-pre-wrap">{meta.exam_summary}</p>
          ) : (
            <p>Read each question carefully before answering.</p>
          )}
          <ul className="ml-5 list-disc space-y-1">
            <li>Each correct answer awards <strong>+{meta.correct_marks ?? 2} marks</strong>.</li>
            <li>Each wrong answer deducts <strong>{meta.negative_marking}</strong> marks.</li>
            <li>Unanswered questions carry no penalty.</li>
            {type === "pyq" ? (
              <li>Pause is allowed during practice (PYQ mode).</li>
            ) : (
              <li><strong>Strict mode:</strong> the timer cannot be paused.</li>
            )}
            <li>The exam will run in fullscreen. Auto-submits when time runs out.</li>
          </ul>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={questionCount === 0}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:opacity-50"
      >
        <Play className="h-4 w-4" /> Start Exam
      </button>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card-surface p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}


function Header({
  eyebrow,
  title,
  backTo,
}: {
  eyebrow: string;
  title: string;
  backTo: { to: "/exams"; search: Search };
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">{title}</h1>
      </div>
      <Link
        to={backTo.to}
        search={backTo.search}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
    </header>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center p-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Check back later or ask admin to upload.</p>
    </div>
  );
}
