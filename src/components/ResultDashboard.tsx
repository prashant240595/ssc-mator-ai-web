import { Component, Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Trophy, Loader2, Flag, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { MathText } from "@/components/MathText";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/quiz-types";
import type { ExamConfig } from "@/components/ExamPlayer";
import { generateDummyLeaders } from "@/lib/dummy-leaderboard";
import { ExamNotes } from "@/components/ExamNotes";
import { NativeAdSlot } from "@/components/NativeAdSlot";
import { useIsAppUser } from "@/lib/app-user";

// Local error boundary so any unexpected runtime error inside the result page
// doesn't escape to the root TanStack ErrorComponent ("This page didn't load").
class ResultErrorBoundary extends Component<
  { children: ReactNode; onExit: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[ResultDashboard] render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-5">
          <div className="card-surface max-w-md p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-3 text-lg font-bold">Result couldn't render</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your answers were submitted, but the result UI hit an error.
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

type LeaderRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  total_score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  __dummy?: boolean;
};

type ResultProps = {
  config: ExamConfig;
  questions: QuizQuestion[];
  answers: Record<number, number>;
  positive: number;
  timings?: Record<number, number>;
  onExit: () => void;
};

export function ResultDashboard(props: ResultProps) {
  return (
    <ResultErrorBoundary onExit={props.onExit}>
      <ResultDashboardInner {...props} />
    </ResultErrorBoundary>
  );
}

function ResultDashboardInner({
  config,
  questions,
  answers,
  positive,
  timings,
  onExit,
}: ResultProps) {

  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAppUser = useIsAppUser();
  const [reviewMode, setReviewMode] = useState(false);
  const [leaders, setLeaders] = useState<LeaderRow[] | null>(null);
  const [myRank, setMyRank] = useState<{ rank: number; total: number } | null>(null);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [topScore, setTopScore] = useState<number>(0);
  const [saved, setSaved] = useState(false);

  const stats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;
    questions.forEach((q, i) => {
      const a = answers[i];
      if (a == null) return;
      attempted += 1;
      if (a === q.correct) correct += 1;
      else incorrect += 1;
    });
    const positiveMarks = +(correct * positive).toFixed(2);
    const negativeMarks = +(incorrect * config.negativeMarking).toFixed(2);
    return {
      total: questions.length,
      attempted,
      unattempted: questions.length - attempted,
      correct,
      incorrect,
      positiveMarks,
      negativeMarks,
      score: +(positiveMarks - negativeMarks).toFixed(2),
    };
  }, [questions, answers, positive, config.negativeMarking]);

  // Subject-wise breakdown — uses `subject` field (falls back to `shift_details`).
  // Shown only when there are 2+ distinct subjects (e.g. mock test sections).
  const subjectStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; attempted: number; correct: number; incorrect: number; unattempted: number; score: number }
    >();
    questions.forEach((q, i) => {
      const key = (q.subject || q.shift_details || "General").toString().trim() || "General";
      const row = map.get(key) ?? {
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        score: 0,
      };
      row.total += 1;
      const a = answers[i];
      if (a == null) row.unattempted += 1;
      else {
        row.attempted += 1;
        if (a === q.correct) row.correct += 1;
        else row.incorrect += 1;
      }
      map.set(key, row);
    });
    const arr = Array.from(map.entries()).map(([subject, r]) => ({
      subject,
      ...r,
      score: +(r.correct * positive - r.incorrect * config.negativeMarking).toFixed(2),
      accuracy: r.attempted ? Math.round((r.correct / r.attempted) * 100) : 0,
    }));
    return arr;
  }, [questions, answers, positive, config.negativeMarking]);

  // Topic-wise breakdown — grouped by (subject → topic_name). Shows strong/weak topics.
  const topicStats = useMemo(() => {
    const map = new Map<
      string,
      { subject: string; topic: string; total: number; correct: number; incorrect: number; unattempted: number }
    >();
    questions.forEach((q, i) => {
      const topic = (q.topic_name || "").toString().trim();
      if (!topic) return;
      const subject = (q.subject || "General").toString().trim() || "General";
      const key = `${subject}::${topic}`;
      const row = map.get(key) ?? { subject, topic, total: 0, correct: 0, incorrect: 0, unattempted: 0 };
      row.total += 1;
      const a = answers[i];
      if (a == null) row.unattempted += 1;
      else if (a === q.correct) row.correct += 1;
      else row.incorrect += 1;
      map.set(key, row);
    });
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        attempted: r.correct + r.incorrect,
        accuracy: r.correct + r.incorrect > 0 ? Math.round((r.correct / (r.correct + r.incorrect)) * 100) : 0,
      }))
      .sort((a, b) => (b.correct - b.incorrect) - (a.correct - a.incorrect));
  }, [questions, answers]);


  // Save result + load leaderboard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Stable leaderboard key — works even when the test has no exam_id row.
        const boardKey = config.examId || `${config.examType}:${config.examName}`;
        const shiftKey = config.shift || "Full Test";

        let realRows: LeaderRow[] = [];

        if (config.examId && user?.id) {
          if (!saved) {
            const displayName =
              (user.user_metadata as any)?.full_name ||
              (user.user_metadata as any)?.name ||
              user.email?.split("@")[0] ||
              "Student";
            try {
              const { error: insErr } = await supabase.from("student_results").insert({
                user_id: user.id,
                exam_id: config.examId,
                total_score: stats.score,
                correct_count: stats.correct,
                incorrect_count: stats.incorrect,
                unattempted_count: stats.unattempted,
                display_name: displayName,
                shift: config.shift,
              } as any);
              if (insErr) console.warn("[ResultDashboard] save failed:", insErr.message);
            } catch (saveErr: any) {
              console.warn("[ResultDashboard] save threw:", saveErr?.message ?? saveErr);
            }
            if (cancelled) return;
            setSaved(true);
          }

          const { data, error: selErr } = await supabase
            .from("student_results")
            .select(
              "id,user_id,display_name,total_score,correct_count,incorrect_count,unattempted_count,shift",
            )
            .eq("exam_id", config.examId)
            .eq("shift", config.shift)
            .order("total_score", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(500);
          if (selErr) console.warn("[ResultDashboard] leaderboard fetch failed:", selErr.message);
          realRows = (data ?? []) as LeaderRow[];
        }

        // Seed dummy rankers (60-80%) so EVERY test has a populated leaderboard,
        // including guest attempts and tests without a saved exam record.
        const dummies = generateDummyLeaders(
          boardKey,
          shiftKey,
          questions.length,
          positive,
          config.negativeMarking,
        );

        // Make sure the current attempt is always on the board.
        const meId = user?.id ?? "me";
        const hasMe = realRows.some((r) => r.user_id === meId);
        const myRow: LeaderRow[] = hasMe
          ? []
          : [
              {
                id: "me-local",
                user_id: meId,
                display_name:
                  (user?.user_metadata as any)?.full_name ||
                  user?.email?.split("@")[0] ||
                  "You",
                total_score: stats.score,
                correct_count: stats.correct,
                incorrect_count: stats.incorrect,
                unattempted_count: stats.unattempted,
              } as LeaderRow,
            ];

        const merged: LeaderRow[] = [...realRows, ...myRow, ...dummies].sort(
          (a, b) => Number(b.total_score) - Number(a.total_score),
        );

        if (cancelled) return;
        setLeaders(merged);
        if (merged.length) {
          const rankIdx = merged.findIndex((r) => r.user_id === meId);
          setMyRank({ rank: rankIdx >= 0 ? rankIdx + 1 : merged.length, total: merged.length });
          const sum = merged.reduce((s, r) => s + Number(r.total_score || 0), 0);
          setAvgScore(+(sum / merged.length).toFixed(2));
          setTopScore(Number(merged[0].total_score || 0));
        }
      } catch (e: any) {
        console.error("[ResultDashboard] effect crashed:", e);
        if (!cancelled) setLeaders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.examId, config.examName, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (reviewMode) {
    return (
      <ReviewView
        questions={questions}
        answers={answers}
        title={`Review · ${config.examName}`}
        onBack={() => setReviewMode(false)}
        onExit={onExit}
        lang={lang}
        timings={timings}
        isAppUser={isAppUser}
      />

    );
  }

  const pieData = [
    { name: "Correct", value: stats.correct, fill: "#22c55e" },
    { name: "Incorrect", value: stats.incorrect, fill: "#ef4444" },
    { name: "Unattempted", value: stats.unattempted, fill: "#94a3b8" },
  ];
  const barData = [
    { label: "You", Score: stats.score, fill: "#3b82f6" },
    { label: "Average", Score: avgScore, fill: "#f59e0b" },
    { label: "Topper", Score: topScore, fill: "#a855f7" },
  ];


  const top10 = (leaders ?? []).slice(0, 10);
  const meInTop = top10.some((r) => r.user_id === (user?.id ?? "me"));

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-5 md:p-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Exam Submitted</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{config.examName}</h1>
          <p className="text-xs text-muted-foreground">{config.shift}</p>
        </header>

        {/* SECTION A — Personal */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="card-surface p-6 text-center md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final Score</p>
            <p className="mt-2 font-display text-5xl font-bold text-primary">{stats.score}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              +{stats.positiveMarks} − {stats.negativeMarks}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              +{positive}/correct · −{config.negativeMarking}/wrong
            </p>
          </div>
          <div className="card-surface grid grid-cols-2 gap-3 p-4 md:col-span-2 md:grid-cols-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Attempted" value={stats.attempted} />
            <StatCard label="Unattempted" value={stats.unattempted} tone="muted" />
            <StatCard label="Correct" value={stats.correct} tone="success" />
            <StatCard label="Incorrect" value={stats.incorrect} tone="danger" />
            <StatCard
              label="Accuracy"
              value={stats.attempted ? `${Math.round((stats.correct / stats.attempted) * 100)}%` : "—"}
            />
          </div>
        </section>

        {isAppUser && <NativeAdSlot slotId="result_analysis_native_ad" />}

        {/* Subject-wise breakdown (mock tests / multi-subject papers) */}
        {subjectStats.length >= 2 && (
          <section className="card-surface p-4">
            <p className="text-sm font-bold">Subject-wise Performance</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Score per section · +{positive}/correct · −{config.negativeMarking}/wrong
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Attempted</th>
                    <th className="px-3 py-2 text-right text-success">Correct</th>
                    <th className="px-3 py-2 text-right text-destructive">Wrong</th>
                    <th className="px-3 py-2 text-right text-muted-foreground">Skipped</th>
                    <th className="px-3 py-2 text-right">Accuracy</th>
                    <th className="px-3 py-2 text-right font-bold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStats.map((s) => (
                    <tr key={s.subject} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{s.subject}</td>
                      <td className="px-3 py-2 text-right">{s.total}</td>
                      <td className="px-3 py-2 text-right">{s.attempted}</td>
                      <td className="px-3 py-2 text-right text-success">{s.correct}</td>
                      <td className="px-3 py-2 text-right text-destructive">{s.incorrect}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{s.unattempted}</td>
                      <td className="px-3 py-2 text-right">{s.accuracy}%</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{s.score}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{stats.total}</td>
                    <td className="px-3 py-2 text-right">{stats.attempted}</td>
                    <td className="px-3 py-2 text-right text-success">{stats.correct}</td>
                    <td className="px-3 py-2 text-right text-destructive">{stats.incorrect}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{stats.unattempted}</td>
                    <td className="px-3 py-2 text-right">
                      {stats.attempted ? `${Math.round((stats.correct / stats.attempted) * 100)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-primary">{stats.score}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Topic-wise strengths & weaknesses */}
        {topicStats.length >= 2 && (
          <section className="card-surface p-4">
            <p className="text-sm font-bold">Topic-wise Analysis</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Which topics you got right vs wrong — sorted from strongest to weakest.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Topic</th>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right text-success">Correct</th>
                    <th className="px-3 py-2 text-right text-destructive">Wrong</th>
                    <th className="px-3 py-2 text-right text-muted-foreground">Skipped</th>
                    <th className="px-3 py-2 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {topicStats.map((t) => (
                    <tr key={`${t.subject}::${t.topic}`} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{t.topic}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.subject}</td>
                      <td className="px-3 py-2 text-right">{t.total}</td>
                      <td className="px-3 py-2 text-right text-success">{t.correct}</td>
                      <td className="px-3 py-2 text-right text-destructive">{t.incorrect}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{t.unattempted}</td>
                      <td className="px-3 py-2 text-right font-bold">
                        <span
                          className={
                            t.attempted === 0
                              ? "text-muted-foreground"
                              : t.accuracy >= 75
                                ? "text-success"
                                : t.accuracy >= 50
                                  ? "text-warning-foreground"
                                  : "text-destructive"
                          }
                        >
                          {t.attempted ? `${t.accuracy}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SECTION C — Charts */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card-surface p-4">
            <p className="text-sm font-bold">Answer Distribution</p>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-surface p-4">
            <p className="text-sm font-bold">You vs Average vs Topper</p>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RTooltip cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                  <Bar dataKey="Score" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

            </div>
          </div>
        </section>

        {/* SECTION B — Leaderboard */}
        <section className="card-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning-foreground" />
              <p className="text-sm font-bold">Top Rankers</p>
            </div>
            {myRank && (
              <p className="text-xs font-semibold text-muted-foreground">
                Your Rank · <span className="text-primary">{myRank.rank}</span> / {myRank.total}
              </p>
            )}
          </div>
          {leaders === null ? (
            <div className="grid place-items-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : leaders.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No leaderboard data available yet.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">Correct</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">Wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((r, i) => {
                    const isMe = r.user_id === (user?.id ?? "me");
                    return (
                      <tr
                        key={r.id}
                        className={"border-t border-border " + (isMe ? "bg-primary-soft font-semibold" : "")}
                      >
                        <td className="px-3 py-2">{i + 1}</td>
                        <td className="px-3 py-2">
                          {r.display_name ?? "Anonymous"} {isMe && <span className="ml-1 text-[10px] uppercase text-primary">You</span>}
                        </td>
                        <td className="px-3 py-2 text-right">{Number(r.total_score).toFixed(2)}</td>
                        <td className="hidden px-3 py-2 text-right sm:table-cell">{r.correct_count}</td>
                        <td className="hidden px-3 py-2 text-right sm:table-cell">{r.incorrect_count}</td>
                      </tr>
                    );
                  })}
                  {!meInTop && myRank && (
                    <tr className="border-t border-border bg-primary-soft font-semibold">
                      <td className="px-3 py-2">{myRank.rank}</td>
                      <td className="px-3 py-2">
                        You <span className="ml-1 text-[10px] uppercase text-primary">Your Rank</span>
                      </td>
                      <td className="px-3 py-2 text-right">{stats.score.toFixed(2)}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{stats.correct}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{stats.incorrect}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isAppUser && <NativeAdSlot slotId="result_analysis_native_ad_2" />}

        {/* SECTION C — Personal Notes */}
        <ExamNotes
          storageKey={`${config.examType}:${config.examName}:${config.shift}:${user?.id ?? "anon"}`}
        />



        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setReviewMode(true)}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-elevated hover:opacity-95"
          >
            View Solutions
          </button>
          <button
            onClick={onExit}
            className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold hover:bg-muted"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  tone?: "primary" | "success" | "danger" | "muted";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function ReviewView({
  questions,
  answers,
  title,
  onBack,
  onExit,
  lang,
  timings,
  isAppUser,
}: {
  questions: QuizQuestion[];
  answers: Record<number, number>;
  title: string;
  onBack: () => void;
  onExit: () => void;
  lang: "en" | "hi";
  timings?: Record<number, number>;
  isAppUser: boolean;
}) {

  const { user } = useAuth();
  const [reportQ, setReportQ] = useState<QuizQuestion | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const ids = questions.map((q) => q.id).filter(Boolean);
      if (!ids.length) return;
      const { data } = await supabase
        .from("question_reports")
        .select("question_id")
        .eq("user_id", user.id)
        .in("question_id", ids);
      if (cancelled) return;
      setReportedIds(new Set((data ?? []).map((r: any) => r.question_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, questions]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <p className="truncate text-sm font-bold">{title}</p>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Back to Result
          </button>
          <button
            onClick={onExit}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
          >
            Exit
          </button>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-5">
        {isAppUser && <NativeAdSlot slotId="result_answer_key_native_ad" />}
        {questions.map((q, i) => {
          const a = answers[i];
          const isCorrect = a === q.correct;
          const alreadyReported = reportedIds.has(q.id);
          return (
            <Fragment key={`${q.id}-${i}`}>
            <div className="card-surface p-4">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Q{i + 1}</span>
                {a == null ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">Skipped</span>
                ) : isCorrect ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                    <CheckCircle2 className="h-3 w-3" /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                    <XCircle className="h-3 w-3" /> Wrong
                  </span>
                )}
                {timings && timings[i] != null && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground"
                    title="Time spent on this question"
                  >
                    <Clock className="h-3 w-3" /> {formatTime(timings[i])}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => !alreadyReported && setReportQ(q)}
                  disabled={alreadyReported}
                  className={
                    "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase " +
                    (alreadyReported
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                      : "border-warning bg-warning-soft text-warning hover:opacity-90")
                  }
                  title={alreadyReported ? "You already reported this question" : "Report this question"}
                >
                  <Flag className="h-3 w-3" /> {alreadyReported ? "Reported" : "Report"}
                </button>
              </div>

              {q.image_url && (
                <img src={q.image_url} alt="" className="mt-2 max-h-48 rounded-lg border border-border" />
              )}
              <MathText className="mt-2 block text-sm font-semibold">{q.text?.[lang] || q.text?.en}</MathText>
              <div className="mt-2 space-y-1.5">
                {(q.options ?? []).map((opt, oi) => {
                  const isAns = a === oi;
                  const isRight = oi === q.correct;
                  return (
                    <div
                      key={oi}
                      className={
                        "rounded-lg border p-2 text-sm flex items-start gap-2 " +
                        (isRight
                          ? "border-success bg-success-soft"
                          : isAns
                            ? "border-destructive bg-destructive/10"
                            : "border-border")
                      }
                    >
                      <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                      <div className="flex-1">
                        {opt.image_url && (
                          <img src={opt.image_url} alt="" className="mb-1 max-h-28 w-auto object-contain" />
                        )}
                        <MathText className="block">{opt.text?.[lang] || opt.text?.en}</MathText>
                        {opt.text?.hi && opt.text?.en && lang === "en" && (
                          <MathText className="mt-0.5 block text-xs text-muted-foreground">{opt.text.hi}</MathText>
                        )}
                      </div>
                      {isRight && (
                        <span className="ml-auto shrink-0 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase text-success-foreground">Correct</span>
                      )}
                      {isAns && !isRight && (
                        <span className="ml-auto shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">Your answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-semibold text-success">
                Correct answer: {String.fromCharCode(65 + q.correct)}.{" "}
                <MathText className="inline">{q.options?.[q.correct]?.text?.[lang] || q.options?.[q.correct]?.text?.en}</MathText>
              </p>
              {(q.explanation?.en || q.explanation?.hi) && (
                <div className="mt-3 rounded-lg bg-primary-soft p-3 text-xs space-y-2">
                  <p className="font-bold text-primary">Solution / समाधान</p>
                  {q.explanation?.en && (
                    <div>
                      <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">English</p>
                      <MathText className="mt-0.5 block">{q.explanation.en}</MathText>
                    </div>
                  )}
                  {q.explanation?.hi && (
                    <div>
                      <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">हिन्दी</p>
                      <MathText className="mt-0.5 block">{q.explanation.hi}</MathText>
                    </div>
                  )}
                </div>
              )}
            </div>
            {isAppUser && (i + 1) % 25 === 0 && (
              <NativeAdSlot slotId={`result_solution_native_ad_${i + 1}`} />
            )}
            </Fragment>
          );
        })}
      </div>
      <ReportQuestionDialog
        question={reportQ}
        userId={user?.id ?? null}
        onClose={() => setReportQ(null)}
        onReported={(qid) => {
          setReportedIds((prev) => {
            const next = new Set(prev);
            next.add(qid);
            return next;
          });
        }}
      />
    </div>
  );
}

const REPORT_REASONS = [
  { value: "wrong_answer", label: "Correct answer is wrong / गलत सही उत्तर" },
  { value: "typo", label: "Spelling / typing mistake / वर्तनी की गलती" },
  { value: "unclear", label: "Question is unclear / प्रश्न स्पष्ट नहीं है" },
  { value: "wrong_explanation", label: "Explanation is wrong / गलत व्याख्या" },
  { value: "image_issue", label: "Image / diagram missing or broken / चित्र की समस्या" },
  { value: "other", label: "Other / अन्य" },
];

function ReportQuestionDialog({
  question,
  userId,
  onClose,
  onReported,
}: {
  question: QuizQuestion | null;
  userId: string | null;
  onClose: () => void;
  onReported: (qid: string) => void;
}) {
  const [reason, setReason] = useState<string>("wrong_answer");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (question) {
      setReason("wrong_answer");
      setDetails("");
    }
  }, [question]);

  const submit = async () => {
    if (!question) return;
    if (!userId) {
      toast.error("Please sign in to report.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("question_reports").insert({
      question_id: question.id,
      user_id: userId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.message("You already reported this question.");
        onReported(question.id);
        onClose();
        return;
      }
      toast.error("Could not submit report.");
      return;
    }
    toast.success("Report submitted. Thank you!");
    onReported(question.id);
    onClose();
  };

  return (
    <Dialog open={!!question} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
          <DialogDescription>
            What's wrong with this question? / प्रश्न में क्या गलत है?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="mt-1"
              />
              <span>{r.label}</span>
            </label>
          ))}
          <Textarea
            placeholder="Add more details (optional) / अधिक जानकारी दें"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
