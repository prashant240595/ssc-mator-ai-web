import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BookmarkCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { QuizQuestion } from "@/lib/quiz-types";
import { QuizRunner } from "@/components/QuizRunner";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({
    meta: [
      { title: "Your Bookmarked Questions — SSC Mentor AI" },
      { name: "description", content: "Review the SSC questions you saved for later revision." },
      { property: "og:title", content: "Your Bookmarked Questions" },
      { property: "og:description", content: "All the SSC questions you bookmarked, in one place." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [runMode, setRunMode] = useState(false);

  useEffect(() => {
    if (!user || isGuest) {
      setQuestions([]);
      return;
    }
    (async () => {
      const { data: bm } = await supabase
        .from("question_bookmarks")
        .select("question_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (bm ?? []).map((r: any) => r.question_id);
      if (ids.length === 0) {
        setQuestions([]);
        return;
      }
      const { data } = await supabase
        .from("question_bank")
        .select("id,subject,topic_name,category_type,exam_name,shift_details,text,options,correct,explanation,image_url,image_svg")
        .in("id", ids);
      // preserve order from bookmarks
      const byId = new Map((data ?? []).map((q: any) => [q.id, q]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as unknown as QuizQuestion[];
      setQuestions(ordered);
    })();
  }, [user, isGuest]);

  if (!user || isGuest) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm font-semibold">Sign in to view your bookmarks</p>
        <p className="mt-1 text-xs text-muted-foreground">Bookmarked questions are saved to your account.</p>
        <Link to="/login" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  if (questions === null) {
    return (
      <div className="grid place-items-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (runMode && questions.length > 0) {
    return (
      <QuizRunner
        title="Bookmarks"
        subtitle={`${questions.length} saved questions`}
        questions={questions}
        onExit={() => setRunMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-xs">Saved</p>
        <h1 className="mt-1 font-display text-xl font-bold sm:text-2xl md:text-3xl">Your Bookmarks</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {questions.length} question{questions.length === 1 ? "" : "s"} saved for revision.
        </p>
      </header>

      {questions.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <BookmarkCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No bookmarks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap the Bookmark button while practicing to save questions here.</p>
          <button
            onClick={() => navigate({ to: "/practice", search: {} })}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Start practicing
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setRunMode(true)}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated"
          >
            Revise all bookmarked questions
          </button>
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <div key={q.id} className="card-surface p-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{q.text?.en || q.text?.hi || "Question"}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {[q.subject, q.topic_name].filter(Boolean).join(" • ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate({ to: "/practice", search: {} })}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Practice
          </button>
        </>
      )}
    </div>
  );
}
