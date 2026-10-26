import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Target,
  CheckCircle2,
  Percent,
  Flame,
  TrendingUp,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info,
  Newspaper,
  Smartphone,
  Download,
  Briefcase,

  Users,
  Inbox as InboxIcon,
  UserPlus,
  User as UserIcon,
  BarChart3,

} from "lucide-react";
import { SUBJECTS } from "@/lib/mockData";
import { useLanguage, t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedPosts } from "@/lib/blog.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useIsAppUser } from "@/lib/app-user";
import { FREE_ACCESS_FOR_ALL } from "@/lib/access";
import { DailyQuizCard } from "@/components/DailyQuizCard";
import { StreakCard } from "@/components/StreakCard";
import { RevisionCard } from "@/components/RevisionCard";
import { NativeAdSlot } from "@/components/NativeAdSlot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSC Mentor AI - SSC CGL Exam Preparation App" },
      { name: "description", content: "Practice SSC CGL previous year papers with solutions, take mock tests, quizzes, and get AI-powered exam coaching — all in one app." },
      { property: "og:title", content: "SSC Mentor AI - SSC CGL Exam Preparation" },
      { property: "og:description", content: "Practice SSC CGL previous year papers, mock tests, quizzes, and AI coaching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://sscmentorai.online/" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/" }],
  }),
  component: Dashboard,
});

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Target;
  tone?: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary-soft text-primary";
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between">
        <span aria-label={label} className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-4.5 w-4.5" aria-hidden="true" style={{ width: 18, height: 18 }} />
        </span>
        {hint && <span className="text-[10px] font-medium text-muted-foreground">{hint}</span>}
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

type ResultRow = {
  id: string;
  exam_id: string;
  total_score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  created_at: string;
};

const DAILY_GOAL = 50;

/** AI-style adaptive daily goal: history + accuracy + streak ke hisab se */
function suggestDailyGoal(stats: UserStats | undefined) {
  if (!stats || stats.activeDays === 0) return { goal: 20, reason: "Starter plan — 20 questions se shuru karo" };
  const avgPerDay = Math.round(stats.attempted / Math.max(1, stats.activeDays));
  let goal = Math.max(20, Math.round((avgPerDay * 1.2) / 5) * 5);
  if (stats.accuracy && stats.accuracy < 55) goal = Math.max(20, Math.round(goal * 0.8 / 5) * 5);
  if (stats.streak >= 7) goal += 10;
  goal = Math.min(120, goal);
  const reason =
    stats.accuracy < 55
      ? `Accuracy ${stats.accuracy}% — quality first, ${goal} questions aaj`
      : stats.streak >= 7
        ? `${stats.streak}-day streak 🔥 — aaj ${goal} questions`
        : `Tumhara average ${avgPerDay}/day — aaj ${goal} target`;
  return { goal, reason };
}

type UserStats = {
  attempted: number;
  correct: number;
  accuracy: number;
  streak: number;
  dailyDone: number;
  subjectAcc: Record<string, number>;
  resultsCount: number;
  activeDays: number;
};

function useUserStats(userId: string | undefined) {
  return useQuery<UserStats>({
    queryKey: ["dashboard-user-stats", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: results } = await supabase
        .from("student_results")
        .select("id,exam_id,total_score,correct_count,incorrect_count,unattempted_count,created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      const rows = (results ?? []) as ResultRow[];

      const attempted = rows.reduce(
        (sum, r) => sum + r.correct_count + r.incorrect_count + r.unattempted_count,
        0,
      );
      const correct = rows.reduce((sum, r) => sum + r.correct_count, 0);
      const answered = rows.reduce((sum, r) => sum + r.correct_count + r.incorrect_count, 0);
      const accuracy = answered ? Math.round((correct / answered) * 1000) / 10 : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let dailyDone = rows
        .filter((r) => new Date(r.created_at) >= today)
        .reduce((sum, r) => sum + r.correct_count + r.incorrect_count + r.unattempted_count, 0);

      // aaj ke daily quiz attempts bhi count karo
      const { data: quizToday } = await supabase
        .from("daily_quiz_attempts")
        .select("total_count,created_at")
        .eq("user_id", userId!)
        .gte("created_at", today.toISOString());
      dailyDone += (quizToday ?? []).reduce(
        (sum: number, q: { total_count: number }) => sum + (q.total_count ?? 0),
        0,
      );

      const days = new Set(
        rows.map((r) => {
          const d = new Date(r.created_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      );
      let streak = 0;
      const cur = new Date();
      cur.setHours(0, 0, 0, 0);
      if (!days.has(cur.getTime())) cur.setDate(cur.getDate() - 1);
      while (days.has(cur.getTime())) {
        streak += 1;
        cur.setDate(cur.getDate() - 1);
      }

      const examIds = Array.from(new Set(rows.map((r) => r.exam_id)));
      const subjectAcc: Record<string, number> = {};
      if (examIds.length) {
        const { data: metas } = await supabase
          .from("exam_metadata")
          .select("id,exam_name")
          .in("id", examIds);
        const examNameById: Record<string, string> = {};
        (metas ?? []).forEach((m: { id: string; exam_name: string }) => {
          examNameById[m.id] = m.exam_name;
        });
        const examNames = Array.from(new Set(Object.values(examNameById)));
        if (examNames.length) {
          const { data: qrows } = await supabase
            .from("question_bank")
            .select("exam_name,subject")
            .in("exam_name", examNames)
            .limit(5000);
          const examSubj = new Map<string, Map<string, number>>();
          (qrows ?? []).forEach((q: { exam_name: string | null; subject: string | null }) => {
            if (!q.exam_name || !q.subject) return;
            if (!examSubj.has(q.exam_name)) examSubj.set(q.exam_name, new Map());
            const m = examSubj.get(q.exam_name)!;
            m.set(q.subject, (m.get(q.subject) ?? 0) + 1);
          });
          const agg = new Map<string, { correct: number; total: number }>();
          rows.forEach((r) => {
            const en = examNameById[r.exam_id];
            const dist = en ? examSubj.get(en) : undefined;
            if (!dist) return;
            const acc =
              r.correct_count + r.incorrect_count > 0
                ? r.correct_count / (r.correct_count + r.incorrect_count)
                : 0;
            dist.forEach((cnt, subj) => {
              const prev = agg.get(subj) ?? { correct: 0, total: 0 };
              prev.correct += acc * cnt;
              prev.total += cnt;
              agg.set(subj, prev);
            });
          });
          agg.forEach((v, k) => {
            subjectAcc[k.toLowerCase()] = v.total ? Math.round((v.correct / v.total) * 100) : 0;
          });
        }
      }

      return {
        attempted,
        correct,
        accuracy,
        streak,
        dailyDone,
        subjectAcc,
        resultsCount: rows.length,
        activeDays: days.size,
      };
    },
  });
}

import { RemoveAdsCard } from "@/components/RemoveAdsCard";

function useProfileName(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-profile-name", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId!)
        .maybeSingle();
      return (data?.full_name as string | null) ?? null;
    },
  });
}

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const SUBJECT_DB_KEYS: Record<string, string[]> = {
  quant: ["quantitative aptitude"],
  reasoning: ["reasoning", "general intelligence and reasoning"],
  ga: ["general awareness"],
  english: ["english comprehension", "english"],
};

function subjectAccFor(id: string, map: Record<string, number>) {
  const keys = SUBJECT_DB_KEYS[id] ?? [id];
  for (const k of keys) {
    if (map[k] != null) return map[k];
  }
  return 0;
}



function buildInsights(stats: UserStats | undefined) {
  if (!stats || stats.resultsCount === 0) {
    return [
      {
        tone: "info" as const,
        title: "Take your first exam",
        body: "Attempt an exam or practice set to unlock personalized AI insights and score trends.",
      },
      {
        tone: "info" as const,
        title: "Set a daily rhythm",
        body: `Aim for ${DAILY_GOAL} questions a day — small, consistent sessions beat long marathons.`,
      },
      {
        tone: "info" as const,
        title: "Cover all four subjects",
        body: "Quant, Reasoning, English and GA — a balanced week lifts your overall score fastest.",
      },
    ];
  }
  const tips: { tone: "info" | "success" | "warning"; title: string; body: string }[] = [];
  const subjects = Object.entries(stats.subjectAcc);
  if (subjects.length) {
    const sorted = [...subjects].sort((a, b) => a[1] - b[1]);
    const weak = sorted[0];
    const strong = sorted[sorted.length - 1];
    if (weak && weak[1] < 60) {
      tips.push({
        tone: "warning",
        title: `${weak[0]} needs attention`,
        body: `Your ${weak[0]} accuracy is ${weak[1]}%. Practice 30 questions today to push past 65%.`,
      });
    }
    if (strong && strong[1] >= 75) {
      tips.push({
        tone: "success",
        title: `${strong[0]} is your strength`,
        body: `${strong[1]}% accuracy in ${strong[0]}. Keep the edge with a timed sectional.`,
      });
    }
  }
  if (stats.accuracy) {
    tips.push({
      tone: "info",
      title: "Overall accuracy",
      body: `You're averaging ${stats.accuracy}% across ${stats.resultsCount} attempts. Aim to lift this by 2–3% this week.`,
    });
  }
  if (stats.streak >= 3) {
    tips.push({
      tone: "success",
      title: `${stats.streak}-day streak 🔥`,
      body: "Consistency compounds — one more session today keeps it alive.",
    });
  }
  return tips.slice(0, 3);
}

function useSocialCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-social", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const [reqs, mems] = await Promise.all([
        supabase
          .from("partner_requests")
          .select("id", { count: "exact", head: true })
          .eq("addressee_id", userId!)
          .eq("status", "pending"),
        supabase
          .from("group_members")
          .select("group_id", { count: "exact", head: true })
          .eq("user_id", userId!),
      ]);
      return {
        pendingRequests: reqs.count ?? 0,
        groupCount: mems.count ?? 0,
      };
    },
  });
}

function Dashboard() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAppUser = useIsAppUser();
  const { data: stats } = useUserStats(user?.id);
  const { data: fullName } = useProfileName(user?.id);
  const { data: social } = useSocialCounts(user?.id);
  const { data: dbSubjects } = useQuery({
    queryKey: ["dashboard-db-subjects"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_subjects");
      return ((data ?? []) as Array<{ subject: string; question_count: number }>)
        .filter((r) => Number(r.question_count) > 0);
    },
    staleTime: 60_000,
  });
  const s = {
    attempted: stats?.attempted ?? 0,
    correct: stats?.correct ?? 0,
    accuracy: stats?.accuracy ?? 0,
    streak: stats?.streak ?? 0,
    dailyDone: stats?.dailyDone ?? 0,
    dailyGoal: suggestDailyGoal(stats).goal,
  };
  const goalReason = suggestDailyGoal(stats).reason;
  const subjectAcc = stats?.subjectAcc ?? {};
  const goalPct = Math.min(100, Math.round((s.dailyDone / s.dailyGoal) * 100));
  const fetchPosts = useServerFn(listPublishedPosts);
  const { data: latestPosts } = useQuery({
    queryKey: ["dashboard-latest-posts"],
    queryFn: () => fetchPosts(),
    staleTime: 60_000,
  });
  const { data: latestJobs } = useQuery({
    queryKey: ["dashboard-latest-jobs"],
    queryFn: () => fetchPosts({ data: { type: "job" } }),
    staleTime: 60_000,
  });
  const topPosts = (latestPosts ?? []).slice(0, 2);
  const topJobs = (latestJobs ?? []).slice(0, 4);

  const insights = useMemo(() => buildInsights(stats), [stats]);
  const displayName =
    fullName?.split(" ")[0] || (user?.email ? user.email.split("@")[0] : "Aspirant");


  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-elevated md:p-7">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{greetingPrefix()}, {displayName}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Let's crack SSC CGL — one focused hour today.</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/practice"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
          >
            Start Practice <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/exams"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Take Exam Series
          </Link>
        </div>

        <div className="mt-5 rounded-xl bg-white/15 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Daily goal · AI suggested</span>
            <span>
              {s.dailyDone}/{s.dailyGoal} questions
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-2 text-[11px] opacity-90">{goalReason}</p>
        </div>
      </section>

      {/* Two main study modes */}
      <section className="grid gap-3 md:grid-cols-2">
        <Link
          to="/practice"
          className="card-surface group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Mode 1</p>
          <p className="mt-1 text-lg font-bold">Practice by Subject</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drill a topic at a time — Maths, Reasoning, English, GA.
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Browse subjects <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
        <Link
          to="/exams"
          className="card-surface group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-warning/10 blur-2xl" />
          <p className="text-xs font-bold uppercase tracking-wider text-warning-foreground">Mode 2</p>
          <p className="mt-1 text-lg font-bold">Take Exam Series</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Full-length PYQs and mock tests, shift by shift.
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Browse exams <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </section>

      {isAppUser && <NativeAdSlot slotId="dashboard_native_1" />}

      {/* App download banner — hidden for in-app users */}
      {!isAppUser && (
        <section>
          <a
            href="https://play.google.com/store/apps/details?id=com.education.sscmentorai"
            target="_blank"
            rel="noopener noreferrer"
            className="card-surface group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
              <Smartphone className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Android App</p>
              <p className="mt-0.5 text-sm font-bold sm:text-base">
                {FREE_ACCESS_FOR_ALL
                  ? "Free on the website and in the app"
                  : "Pay in the website or free use in the app"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {FREE_ACCESS_FOR_ALL
                  ? "Every feature is unlocked right now — practice, mock tests and AI Coach on the web or on your phone."
                  : "Website use is paid — the Android app stays free with every feature unlocked."}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-elevated">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Get app</span>
            </span>
          </a>
        </section>
      )}



      {/* Daily Quiz — retention hero */}
      <section>
        <DailyQuizCard />
      </section>

      {/* Smart Revision Planner — spaced repetition */}
      {user && (
        <section>
          <RevisionCard />
        </section>
      )}

      {/* Metrics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your progress</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Attempted" value={s.attempted.toString()} icon={Target} hint="All time" />
          <Metric label="Correct" value={s.correct.toString()} icon={CheckCircle2} tone="success" />
          <Metric label="Accuracy" value={`${s.accuracy}%`} icon={Percent} tone="success" />
          {user ? <StreakCard /> : <Metric label="Streak" value={`0 🔥`} icon={Flame} tone="warning" hint="days" />}
        </div>
      </section>

      {isAppUser && <NativeAdSlot slotId="dashboard_native_2" />}

      <RemoveAdsCard compact />

      {/* Account shortcuts — important on mobile where the sidebar is hidden */}
      {user && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your account</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/my-progress"
              className="card-surface flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                <BarChart3 style={{ width: 18, height: 18 }} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">My Progress</p>
                <p className="truncate text-xs text-muted-foreground">Scores & analysis</p>
              </div>
            </Link>
            <Link
              to="/profile"
              className="card-surface flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <UserIcon style={{ width: 18, height: 18 }} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Profile</p>
                <p className="truncate text-xs text-muted-foreground">Settings & feedback</p>
              </div>
            </Link>
          </div>
        </section>
      )}




      {/* Social */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Connect & discuss</h2>
          <Link to="/inbox" className="text-xs font-semibold text-primary hover:underline">
            Open inbox
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            to="/partners"
            className="card-surface group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <UserPlus className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </span>
              {(social?.pendingRequests ?? 0) > 0 && (
                <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
                  {social!.pendingRequests} new
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-semibold">Friend requests</p>
            <p className="text-xs text-muted-foreground">Accept incoming study partner requests.</p>
          </Link>

          <Link
            to="/partners"
            className="card-surface group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-success-soft text-success">
              <Users className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </span>
            <p className="mt-3 text-sm font-semibold">Find friends</p>
            <p className="text-xs text-muted-foreground">Discover top aspirants and search by name/email.</p>
          </Link>

          <Link
            to="/groups"
            className="card-surface group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
                <Users className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </span>
              {(social?.groupCount ?? 0) > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {social!.groupCount} joined
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-semibold">Study groups</p>
            <p className="text-xs text-muted-foreground">Discuss questions with up to 10 members.</p>
          </Link>
        </div>
        <Link
          to="/inbox"
          className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-muted"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <InboxIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">All messages</p>
            <p className="text-xs text-muted-foreground">Every chat and group thread in one place.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>


      {/* AI Coach */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">AI Coach insights</h2>
          <Link to="/ai-coach" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {insights.map((ins) => {
            const Icon = ins.tone === "warning" ? AlertTriangle : ins.tone === "success" ? TrendingUp : Info;
            const tone =
              ins.tone === "warning"
                ? "bg-warning-soft text-warning-foreground"
                : ins.tone === "success"
                  ? "bg-success-soft text-success"
                  : "bg-primary-soft text-primary";
            return (
              <div key={ins.title} className="card-surface p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{ins.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Latest Job Posts */}
      {topJobs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Latest Govt Job Updates</h2>
            <Link to="/jobs" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {topJobs.map((job) => (
              <Link
                key={job.slug}
                to="/jobs/$slug"
                params={{ slug: job.slug }}
                className="card-surface group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                    {job.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {job.job_stage ? job.job_stage.replace(/[-_]/g, " ") : job.excerpt ?? ""}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest from Blog */}

      {topPosts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Latest from Blog</h2>
            <Link to="/blog" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {topPosts.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="card-surface group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Newspaper className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                    {post.title}
                  </p>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{post.excerpt}</p>
                  )}
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}


      {/* Subjects — only ones that actually have questions in the bank */}
      {(dbSubjects?.length ?? 0) > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Jump into a subject</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(dbSubjects ?? []).map((row) => {
              const name = row.subject;
              const meta = SUBJECTS.find(
                (s) =>
                  s.id === name ||
                  t(s.name, "en").toLowerCase() === name.toLowerCase() ||
                  t(s.short, "en").toLowerCase() === name.toLowerCase(),
              );
              const color = meta?.color ?? "primary";
              const acc = meta ? subjectAccFor(meta.id, subjectAcc) : 0;
              const label = meta ? t(meta.short, lang) : name;
              const displayName = meta ? t(meta.name, lang) : name;

              return (
                <Link
                  key={name}
                  to="/practice"
                  search={{ subject: name }}
                  className="card-surface group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: `var(--${color})` }}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: `var(--${color})` }}
                    >
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{acc}%</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{displayName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.question_count} questions
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${acc}%`, backgroundColor: `var(--${color})` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
