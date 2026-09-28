import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, CheckCircle2, Newspaper } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserStreakInfo } from "@/lib/daily-quiz.functions";
import { useAuth } from "@/lib/auth";

export function DailyQuizCard() {
  const { user } = useAuth();
  const streakFn = useServerFn(getUserStreakInfo);
  const { data } = useQuery({
    queryKey: ["daily-quiz-streak", user?.id],
    queryFn: () => streakFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const done = !!data?.today_attempt;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        to="/daily-quiz"
        search={{ type: "mixed" }}
        className="card-surface group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-warning/15 blur-2xl" />
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-warning text-warning-foreground shadow-elevated">
          {done ? <CheckCircle2 className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning-foreground">
            Daily Quiz · Mixed
          </p>
          <p className="mt-0.5 text-sm font-bold sm:text-base">
            {done
              ? `Done — ${data!.today_attempt!.correct_count}/${data!.today_attempt!.total_count} correct`
              : "🎯 10 questions · EN + हिंदी"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done ? "Kal 6 AM IST par naya" : "GA + Quant + Reasoning + English"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
          {done ? "Review" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <Link
        to="/daily-quiz"
        search={{ type: "current_affairs" }}
        className="card-surface group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Newspaper className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Current Affairs · Daily
          </p>
          <p className="mt-0.5 text-sm font-bold sm:text-base">📰 Aaj ke important CA MCQs</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last 6 months · EN + हिंदी
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
          Start <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
