import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Sparkles,
  RefreshCcw,
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  Newspaper,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getTodayDailyQuiz,
  adminGenerateDailyQuiz,
  adminGenerateCurrentAffairs,
  adminCreateManualDailyQuiz,
} from "@/lib/daily-quiz.functions";

export const Route = createFileRoute("/admin/daily-quiz")({
  head: () => ({ meta: [{ title: "Admin · Daily Quiz" }] }),
  component: AdminDailyQuizPage,
});



type ManualQ = {
  text_en: string;
  text_hi: string;
  options_en: [string, string, string, string];
  options_hi: [string, string, string, string];
  correct: number;
  explanation_en: string;
  explanation_hi: string;
  subject: string;
};

const EMPTY_Q: ManualQ = {
  text_en: "",
  text_hi: "",
  options_en: ["", "", "", ""],
  options_hi: ["", "", "", ""],
  correct: 0,
  explanation_en: "",
  explanation_hi: "",
  subject: "General Awareness",
};

function readText(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    const o = t as { en?: string; hi?: string };
    return o.en ?? o.hi ?? "";
  }
  return "";
}
function readHi(t: unknown): string {
  if (t && typeof t === "object") {
    const o = t as { en?: string; hi?: string };
    return o.hi ?? "";
  }
  return "";
}

function AdminDailyQuizPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const getQuiz = useServerFn(getTodayDailyQuiz);
  const genFn = useServerFn(adminGenerateDailyQuiz);
  const caFn = useServerFn(adminGenerateCurrentAffairs);
  const manualFn = useServerFn(adminCreateManualDailyQuiz);

  const [tab, setTab] = useState<"mixed" | "current_affairs">("mixed");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin-today-daily-quiz", tab],
    queryFn: () => getQuiz({ data: { type: tab } }),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualQ[]>(() =>
    Array.from({ length: 10 }, () => ({
      ...EMPTY_Q,
      options_en: ["", "", "", ""],
      options_hi: ["", "", "", ""],
    })),
  );

  if (!user) return <div className="p-6 text-sm">Sign in required</div>;
  if (role !== "admin")
    return <div className="p-6 text-sm text-destructive">Admin only — sign in with Google</div>;

  const quiz = data?.quiz;
  const questions = data?.questions ?? [];

  async function handleAIGenerate(replace: boolean) {
    setBusy(replace ? "regen" : "gen");
    try {
      const res = tab === "current_affairs"
        ? await caFn({ data: { replace } })
        : await genFn({ data: { replace } });
      alert(res.created ? "New quiz generated!" : "Quiz already existed for today.");
      await refetch();
      qc.invalidateQueries({ queryKey: ["today-daily-quiz"] });
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setBusy(null);
    }
  }

  async function handleManualSubmit() {
    for (let i = 0; i < 10; i++) {
      const q = manual[i];
      if (
        !q.text_en.trim() ||
        !q.text_hi.trim() ||
        q.options_en.some((o) => !o.trim()) ||
        q.options_hi.some((o) => !o.trim())
      ) {
        alert(`Question ${i + 1}: fill all EN + HI fields`);
        return;
      }
    }
    setBusy("manual");
    try {
      await manualFn({ data: { questions: manual } });
      alert("Manual quiz saved!");
      setShowManual(false);
      await refetch();
      qc.invalidateQueries({ queryKey: ["today-daily-quiz"] });
    } catch (e) {
      alert("Failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24 sm:p-6">
      <Link
        to="/admin"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
      </Link>
      <h1 className="font-display text-2xl font-bold">Daily Quiz Control</h1>
      <p className="text-xs text-muted-foreground">
        AI auto-generates bilingual quizzes daily at 6 AM IST (Mixed) and 6:15 AM IST (Current
        Affairs). Override or create manually here.
      </p>

      <div className="mt-4 inline-flex rounded-xl border border-border bg-card p-1 text-xs font-semibold">
        <button
          onClick={() => setTab("mixed")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${
            tab === "mixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Mixed
        </button>
        <button
          onClick={() => setTab("current_affairs")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${
            tab === "current_affairs"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" /> Current Affairs
        </button>
      </div>

      <div className="mt-4 card-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Today's {tab === "current_affairs" ? "Current Affairs" : "Mixed"} quiz
            </p>
            {isLoading ? (
              <p className="mt-1 text-sm">Loading…</p>
            ) : quiz ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Published · {questions.length} questions ·{" "}
                {quiz.created_by_type === "ai" ? "AI-generated" : "Admin-created"}
              </p>
            ) : (
              <p className="mt-1 text-sm text-warning-foreground">Not created yet</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleAIGenerate(false)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {busy === "gen" ? "Generating…" : "Generate with AI"}
          </button>
          {quiz && (
            <button
              onClick={() => handleAIGenerate(true)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {busy === "regen" ? "Regenerating…" : "Regenerate"}
            </button>
          )}
          {tab === "mixed" && (
            <button
              onClick={() => setShowManual((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {showManual ? "Cancel manual" : "Create manually"}
            </button>
          )}
        </div>
      </div>

      {showManual && tab === "mixed" && (
        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold">Manual Quiz — 10 bilingual questions</h2>
          {manual.map((q, i) => (
            <div key={i} className="card-surface p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Q{i + 1}</p>
              <textarea
                value={q.text_en}
                onChange={(e) =>
                  setManual((prev) => {
                    const next = prev.slice();
                    next[i] = { ...next[i], text_en: e.target.value };
                    return next;
                  })
                }
                placeholder="Question (English)"
                className="w-full rounded-lg border border-border p-2 text-sm"
                rows={2}
              />
              <textarea
                value={q.text_hi}
                onChange={(e) =>
                  setManual((prev) => {
                    const next = prev.slice();
                    next[i] = { ...next[i], text_hi: e.target.value };
                    return next;
                  })
                }
                placeholder="प्रश्न (हिंदी)"
                className="mt-2 w-full rounded-lg border border-border p-2 text-sm"
                rows={2}
              />
              <select
                value={q.subject}
                onChange={(e) =>
                  setManual((prev) => {
                    const next = prev.slice();
                    next[i] = { ...next[i], subject: e.target.value };
                    return next;
                  })
                }
                className="mt-2 w-full rounded-lg border border-border p-2 text-sm"
              >
                <option>General Awareness</option>
                <option>Quantitative Aptitude</option>
                <option>General Intelligence and Reasoning</option>
                <option>English Language</option>
              </select>
              <div className="mt-2 space-y-2">
                {q.options_en.map((opt, oi) => (
                  <div key={oi} className="rounded-lg border border-border p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correct === oi}
                        onChange={() =>
                          setManual((prev) => {
                            const next = prev.slice();
                            next[i] = { ...next[i], correct: oi };
                            return next;
                          })
                        }
                      />
                      <input
                        value={opt}
                        onChange={(e) =>
                          setManual((prev) => {
                            const next = prev.slice();
                            const opts = next[i].options_en.slice() as [
                              string,
                              string,
                              string,
                              string,
                            ];
                            opts[oi] = e.target.value;
                            next[i] = { ...next[i], options_en: opts };
                            return next;
                          })
                        }
                        placeholder={`Option ${String.fromCharCode(65 + oi)} (English)`}
                        className="flex-1 rounded-lg border border-border p-1.5 text-sm"
                      />
                    </div>
                    <input
                      value={q.options_hi[oi]}
                      onChange={(e) =>
                        setManual((prev) => {
                          const next = prev.slice();
                          const opts = next[i].options_hi.slice() as [
                            string,
                            string,
                            string,
                            string,
                          ];
                          opts[oi] = e.target.value;
                          next[i] = { ...next[i], options_hi: opts };
                          return next;
                        })
                      }
                      placeholder={`विकल्प ${String.fromCharCode(65 + oi)} (हिंदी)`}
                      className="mt-1 w-full rounded-lg border border-border p-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <textarea
                value={q.explanation_en}
                onChange={(e) =>
                  setManual((prev) => {
                    const next = prev.slice();
                    next[i] = { ...next[i], explanation_en: e.target.value };
                    return next;
                  })
                }
                placeholder="Explanation (English, optional)"
                className="mt-2 w-full rounded-lg border border-border p-2 text-sm"
                rows={1}
              />
              <textarea
                value={q.explanation_hi}
                onChange={(e) =>
                  setManual((prev) => {
                    const next = prev.slice();
                    next[i] = { ...next[i], explanation_hi: e.target.value };
                    return next;
                  })
                }
                placeholder="व्याख्या (हिंदी, वैकल्पिक)"
                className="mt-2 w-full rounded-lg border border-border p-2 text-sm"
                rows={1}
              />
            </div>
          ))}
          <button
            onClick={handleManualSubmit}
            disabled={busy !== null}
            className="w-full rounded-lg bg-success px-4 py-3 text-sm font-semibold text-success-foreground disabled:opacity-50"
          >
            {busy === "manual" ? "Saving…" : "Save Manual Quiz for Today"}
          </button>
        </div>
      )}

      {!showManual && quiz && questions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Preview</h2>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const opts = (q.options as Array<{ text: unknown }> | null) ?? [];
              return (
                <div key={q.id} className="card-surface p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Q{i + 1} · {q.subject}
                  </p>
                  <p className="mt-1 text-sm break-words">{readText(q.text)}</p>
                  {readHi(q.text) && (
                    <p className="text-xs text-muted-foreground break-words">{readHi(q.text)}</p>
                  )}
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {opts.map((opt, oi) => (
                      <li
                        key={oi}
                        className={
                          oi === q.correct ? "font-bold text-success" : "text-muted-foreground"
                        }
                      >
                        {String.fromCharCode(65 + oi)}. {readText(opt.text)}
                        {readHi(opt.text) && (
                          <span className="ml-1 opacity-70">/ {readHi(opt.text)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
