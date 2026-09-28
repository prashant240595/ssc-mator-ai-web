import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listRevisionTopics } from "@/lib/revision.functions";

export function RevisionCard() {
  const { user } = useAuth();
  const listFn = useServerFn(listRevisionTopics);
  const { data } = useQuery({
    queryKey: ["revision-due", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const due = data?.dueCount ?? 0;
  const active = data?.activeCount ?? 0;

  return (
    <Link
      to="/revision"
      className="group relative block overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-elevated transition duration-300 hover:scale-[1.01] hover:shadow-2xl"
    >
      {/* Animated glow blobs */}
      <span className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/20 blur-3xl animate-pulse" />
      <span className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-primary-foreground/10 blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
            <Brain className="h-7 w-7 text-primary-foreground animate-bounce [animation-duration:2.5s]" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Revision
            </p>
            <h3 className="mt-1 font-display text-xl font-bold sm:text-2xl">
              {due > 0
                ? `${due} topic${due > 1 ? "s" : ""} to revise today`
                : active > 0
                  ? "All caught up — no revision due today"
                  : "Add a topic, never forget it again"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-primary-foreground/80">
              Spaced repetition: day 1 · 3 · 7 · 21 · 30 · 60 reminders.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:justify-end">
          {due > 0 && (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-foreground text-primary shadow-lg">
              <span className="font-display text-xl font-bold">{due}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary-foreground px-4 py-2.5 text-sm font-bold text-primary shadow-lg transition group-hover:translate-x-1">
            {due > 0 ? "Revise now" : "Open planner"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
