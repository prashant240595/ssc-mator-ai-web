import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Loader2,
  Sparkles,
  TrendingUp,
  Target,
  Flame,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/my-progress")({
  head: () => ({
    meta: [
      { title: "My Progress & Score Trend — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Track your SSC CGL score trend, subject strengths, weak topics and AI coaching insights.",
      },
      { property: "og:title", content: "My Progress & Score Trend" },
      {
        property: "og:description",
        content: "Your SSC CGL score trend, subject strengths and AI coaching insights.",
      },
      { property: "og:url", content: "https://sscmentorai.online/my-progress" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/my-progress" }],
  }),
  component: MyProgressPage,
});

type ResultRow = {
  id: string;
  exam_id: string;
  total_score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  created_at: string;
};

type SubjectStat = {
  subject: string;
  accuracy: number;
  correct: number;
  attempted: number;
};

type TopicStat = SubjectStat & { topic: string };

const CHART_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--accent)",
];

function pct(correct: number, attempted: number) {
  return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
}

function MyProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [examIndex, setExamIndex] = useState<Record<string, string>>({});
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [resultsRes, quizRes, streakRes] = await Promise.all([
        supabase
          .from("student_results")
          .select(
            "id,exam_id,total_score,correct_count,incorrect_count,unattempted_count,created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("daily_quiz_attempts")
          .select("id,quiz_id,answers,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("user_streaks")
          .select("current_streak,longest_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const rows = (resultsRes.data ?? []) as ResultRow[];
      setResults(rows);
      if (streakRes.data) {
        setStreak({
          current: streakRes.data.current_streak ?? 0,
          longest: streakRes.data.longest_streak ?? 0,
        });
      }

      // exam names for the trend tooltip
      const examIds = Array.from(new Set(rows.map((r) => r.exam_id))).filter(Boolean);
      if (examIds.length) {
        const { data: metas } = await supabase
          .from("exam_metadata")
          .select("id,exam_name")
          .in("id", examIds);
        if (!cancelled) {
          const map: Record<string, string> = {};
          (metas ?? []).forEach((m: any) => (map[m.id] = m.exam_name));
          setExamIndex(map);
        }
      }

      // Real subject/topic accuracy from daily quiz attempts (per-question answers stored)
      const attempts = (quizRes.data ?? []) as {
        quiz_id: string;
        answers: number[] | null;
      }[];
      setQuizCount(attempts.length);

      if (attempts.length) {
        const quizIds = Array.from(new Set(attempts.map((a) => a.quiz_id)));
        const { data: quizzes } = await supabase
          .from("daily_quizzes")
          .select("id,question_ids")
          .in("id", quizIds);
        const quizQs: Record<string, string[]> = {};
        (quizzes ?? []).forEach((q: any) => (quizQs[q.id] = q.question_ids ?? []));

        const allQIds = Array.from(new Set(Object.values(quizQs).flat()));
        if (allQIds.length) {
          const { data: qbank } = await supabase
            .from("question_bank")
            .select("id,subject,topic_name,correct")
            .in("id", allQIds.slice(0, 900));
          if (cancelled) return;
          const qMap = new Map<string, { subject: string; topic: string; correct: number }>();
          (qbank ?? []).forEach((q: any) =>
            qMap.set(q.id, {
              subject: (q.subject || "General").trim(),
              topic: (q.topic_name || "General").trim(),
              correct: q.correct,
            }),
          );

          const subjAgg = new Map<string, { correct: number; attempted: number }>();
          const topicAgg = new Map<string, { subject: string; topic: string; correct: number; attempted: number }>();

          attempts.forEach((a) => {
            const ids = quizQs[a.quiz_id] ?? [];
            const ans = Array.isArray(a.answers) ? a.answers : [];
            ids.forEach((qid, i) => {
              const q = qMap.get(qid);
              if (!q) return;
              const picked = ans[i];
              if (picked == null || picked < 0) return;
              const isCorrect = picked === q.correct;

              const s = subjAgg.get(q.subject) ?? { correct: 0, attempted: 0 };
              s.attempted += 1;
              if (isCorrect) s.correct += 1;
              subjAgg.set(q.subject, s);

              const key = `${q.subject}::${q.topic}`;
              const t =
                topicAgg.get(key) ?? { subject: q.subject, topic: q.topic, correct: 0, attempted: 0 };
              t.attempted += 1;
              if (isCorrect) t.correct += 1;
              topicAgg.set(key, t);
            });
          });

          setSubjectStats(
            Array.from(subjAgg.entries())
              .map(([subject, v]) => ({
                subject,
                correct: v.correct,
                attempted: v.attempted,
                accuracy: pct(v.correct, v.attempted),
              }))
              .sort((a, b) => b.attempted - a.attempted),
          );
          setTopicStats(
            Array.from(topicAgg.values())
              .filter((t) => t.attempted >= 2)
              .map((t) => ({ ...t, accuracy: pct(t.correct, t.attempted) }))
              .sort((a, b) => a.accuracy - b.accuracy),
          );
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const totals = useMemo(() => {
    const correct = results.reduce((s, r) => s + r.correct_count, 0);
    const incorrect = results.reduce((s, r) => s + r.incorrect_count, 0);
    const unattempted = results.reduce((s, r) => s + r.unattempted_count, 0);
    const best = results.reduce((m, r) => Math.max(m, Number(r.total_score)), 0);
    const attempted = correct + incorrect;
    return { correct, incorrect, unattempted, best, accuracy: pct(correct, attempted) };
  }, [results]);

  const pieData = useMemo(
    () => [
      { name: "Correct", value: totals.correct },
      { name: "Incorrect", value: totals.incorrect },
      { name: "Unattempted", value: totals.unattempted },
    ],
    [totals],
  );
  const pieColors = ["var(--success)", "var(--destructive)", "var(--muted-foreground)"];

  const lineData = useMemo(
    () =>
      results.slice(-10).map((r, i) => ({
        label: `#${i + 1}`,
        Score: Number(r.total_score),
        exam: examIndex[r.exam_id] ?? "Exam",
      })),
    [results, examIndex],
  );

  const insights = useMemo(
    () => generateInsights(results, subjectStats, topicStats, totals),
    [results, subjectStats, topicStats, totals],
  );

  const hasAnyData = results.length > 0 || subjectStats.length > 0;

  if (!user) {
    return <p className="text-sm text-muted-foreground">Sign in to view your progress.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Analytics</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">My Progress</h1>
        <p className="text-sm text-muted-foreground">
          Score trends, accuracy split, subject strengths and what to fix next.
        </p>
      </header>

      {loading ? (
        <div className="grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !hasAnyData ? (
        <div className="card-surface p-8 text-center">
          <p className="text-sm font-semibold">No activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Take a mock test or today's daily quiz to start tracking your progress.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label="Tests taken"
              value={String(results.length)}
              hint={`${quizCount} daily quizzes`}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Accuracy"
              value={`${totals.accuracy}%`}
              hint={`${totals.correct} correct`}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Best score"
              value={totals.best ? totals.best.toFixed(1) : "—"}
              hint="Highest test score"
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              label="Streak"
              value={`${streak?.current ?? 0} d`}
              hint={`Best ${streak?.longest ?? 0} days`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card-surface p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Score trend (last 10 tests)</p>
              </div>
              <div className="mt-3 h-72">
                {lineData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} />
                      <RTooltip />
                      <Line
                        type="monotone"
                        dataKey="Score"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="Attempt a mock test or PYQ to see your score trend." />
                )}
              </div>
            </div>

            <div className="card-surface p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-success" />
                <p className="text-sm font-bold">Answer split (all tests)</p>
              </div>
              <div className="mt-3 h-72">
                {totals.correct + totals.incorrect + totals.unattempted > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={pieColors[i]} />
                        ))}
                      </Pie>
                      <RTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="Take a test to see how your answers split up." />
                )}
              </div>
            </div>
          </section>

          <section className="card-surface p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Subject-wise accuracy (daily quizzes)</p>
            </div>
            {subjectStats.length ? (
              <>
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectStats} layout="vertical" margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} fontSize={12} />
                      <YAxis type="category" dataKey="subject" width={130} fontSize={11} />
                      <RTooltip formatter={(v: any) => `${v}%`} />
                      <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                        {subjectStats.map((s, i) => (
                          <Cell
                            key={i}
                            fill={
                              s.accuracy >= 70
                                ? "var(--success)"
                                : s.accuracy >= 45
                                  ? "var(--warning)"
                                  : "var(--destructive)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {subjectStats.map((s) => (
                    <p key={s.subject}>
                      <span className="font-semibold text-foreground">{s.subject}</span> —{" "}
                      {s.correct}/{s.attempted} correct ({s.accuracy}%)
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Attempt a few daily quizzes to unlock subject-wise accuracy.
              </p>
            )}
          </section>

          {topicStats.length > 0 && (
            <section className="card-surface p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                <p className="text-sm font-bold">Topics to fix first</p>
              </div>
              <ul className="mt-3 space-y-2">
                {topicStats.slice(0, 6).map((t) => (
                  <li
                    key={`${t.subject}-${t.topic}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{t.topic}</span>
                      <span className="text-xs text-muted-foreground">{t.subject}</span>
                    </span>
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-1 text-xs font-bold " +
                        (t.accuracy >= 70
                          ? "bg-success-soft text-success"
                          : t.accuracy >= 45
                            ? "bg-warning-soft text-warning-foreground"
                            : "bg-destructive/10 text-destructive")
                      }
                    >
                      {t.accuracy}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card-surface p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-warning-foreground" />
              <p className="text-sm font-bold">AI Coach Insights</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {insights.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function generateInsights(
  results: ResultRow[],
  subjects: SubjectStat[],
  topics: TopicStat[],
  totals: { correct: number; incorrect: number; unattempted: number; accuracy: number },
): string[] {
  const tips: string[] = [];

  if (results.length === 0 && subjects.length === 0) {
    return ["Take your first test or daily quiz to unlock personalized insights."];
  }

  if (results.length >= 2) {
    const first = Number(results[results.length - 2].total_score);
    const last = Number(results[results.length - 1].total_score);
    if (last > first) {
      tips.push(`Your last score improved by ${(last - first).toFixed(1)} points. Keep the momentum.`);
    } else if (last < first) {
      tips.push(
        `Your latest score dipped by ${(first - last).toFixed(1)} points. Revisit your weak topics below.`,
      );
    }
  }

  const totalQs = totals.correct + totals.incorrect + totals.unattempted;
  if (totalQs > 0 && totals.unattempted / totalQs > 0.2) {
    tips.push(
      "You leave more than 20% of questions unattempted. Practice timed sets to improve speed.",
    );
  }
  if (totals.correct + totals.incorrect > 0 && totals.accuracy < 55) {
    tips.push(
      `Your overall accuracy is ${totals.accuracy}%. Slow down on tricky questions instead of guessing — negative marking hurts.`,
    );
  }

  if (subjects.length) {
    const sorted = [...subjects].sort((a, b) => a.accuracy - b.accuracy);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    if (weakest && weakest.accuracy < 60) {
      tips.push(
        `${weakest.subject} is your weakest subject (${weakest.accuracy}% accuracy). Spend extra practice time here.`,
      );
    }
    if (strongest && strongest.accuracy >= 75 && strongest !== weakest) {
      tips.push(`${strongest.subject} is your strongest subject (${strongest.accuracy}%). Maintain that edge.`);
    }
  }

  if (topics.length) {
    const weak = topics.filter((t) => t.accuracy < 50).slice(0, 3);
    if (weak.length) {
      tips.push(`Revise these topics first: ${weak.map((t) => t.topic).join(", ")}.`);
    }
  }

  if (tips.length === 0) {
    tips.push("Your performance is steady. Attempt a full-length mock test this week to push further.");
  }
  return tips;
}
