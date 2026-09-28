import { Flame, Snowflake, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserStreakInfo } from "@/lib/daily-quiz.functions";
import { useAuth } from "@/lib/auth";

export function StreakCard() {
  const { user } = useAuth();
  const streakFn = useServerFn(getUserStreakInfo);
  const { data } = useQuery({
    queryKey: ["daily-quiz-streak", user?.id],
    queryFn: () => streakFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const current = data?.current_streak ?? 0;
  const longest = data?.longest_streak ?? 0;
  const freeze = data?.freeze_available ?? 0;

  let milestone = "";
  if (current >= 100) milestone = "🏆 Century!";
  else if (current >= 30) milestone = "💎 30-day Legend";
  else if (current >= 7) milestone = "⭐ Week Warrior";
  else if (current >= 3) milestone = "🚀 Building momentum";

  return (
    <div className="card-surface relative overflow-hidden p-4">
      <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-warning/15 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-warning-soft text-warning-foreground">
          <Flame className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
        </span>
        {freeze > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary"
            title="Streak freeze: 1 din miss karne par bhi streak safe"
          >
            <Snowflake className="h-3 w-3" /> {freeze}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold">
        {current} <span className="text-base">🔥</span>
      </p>
      <p className="text-xs text-muted-foreground">Day streak</p>
      {longest > current && (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <Trophy className="h-3 w-3" /> Best: {longest} days
        </p>
      )}
      {milestone && (
        <p className="mt-1 text-[10px] font-semibold text-primary">{milestone}</p>
      )}
    </div>
  );
}
