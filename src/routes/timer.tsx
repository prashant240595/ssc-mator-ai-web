import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Play, Pause, Square, Timer as TimerIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Study Timer — SSC Mentor AI" },
      { name: "description", content: "Personal study timer with session history." },
    ],
  }),
  component: TimerPage,
});

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [targetMin, setTargetMin] = useState(25);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startAtRef = useRef<Date | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      tickRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (running && targetMin > 0 && elapsed >= targetMin * 60) {
      // auto-stop at target
      stop(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const start = () => {
    if (!startAtRef.current) startAtRef.current = new Date();
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const stop = async (auto = false) => {
    setRunning(false);
    const seconds = elapsed;
    const started = startAtRef.current;
    setElapsed(0);
    startAtRef.current = null;
    if (!seconds || !user?.id || !started) return;
    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      subject: subject || null,
      topic: topic || null,
      duration_seconds: seconds,
      started_at: started.toISOString(),
    });
    if (error) toast.error(error.message);
    else toast.success(auto ? "Target reached! Session saved." : "Session saved");
    qc.invalidateQueries({ queryKey: ["timer:sessions"] });
  };

  const sessionsQ = useQuery({
    queryKey: ["timer:sessions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("study_sessions")
        .select("id, subject, topic, duration_seconds, started_at")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTotal = (sessionsQ.data ?? [])
    .filter((s: any) => new Date(s.started_at) >= today)
    .reduce((sum: number, s: any) => sum + (s.duration_seconds ?? 0), 0);
  const weekTotal = (sessionsQ.data ?? []).reduce(
    (sum: number, s: any) => sum + (s.duration_seconds ?? 0),
    0,
  );

  const progress = targetMin > 0 ? Math.min(100, (elapsed / (targetMin * 60)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Study Timer</h1>
        <p className="text-sm text-muted-foreground">Focus session with target and history.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={running}
              placeholder="Subject (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={running}
              placeholder="Topic (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Target (min):</label>
            {[25, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => setTargetMin(m)}
                disabled={running}
                className={
                  "rounded-md px-2 py-1 text-xs font-semibold " +
                  (targetMin === m
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground")
                }
              >
                {m}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={240}
              value={targetMin}
              onChange={(e) => setTargetMin(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
              disabled={running}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </div>

          <div className="mt-6 grid place-items-center">
            <div className="relative grid h-40 w-40 place-items-center rounded-full border-4 border-border">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${progress}%, transparent 0)`,
                  mask: "radial-gradient(closest-side, transparent 75%, black 76%)",
                  WebkitMask: "radial-gradient(closest-side, transparent 75%, black 76%)",
                }}
              />
              <div className="z-10 text-center">
                <p className="font-mono text-3xl font-bold">{fmt(elapsed)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  target {targetMin}m
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {!running ? (
              <button
                onClick={start}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Play className="h-4 w-4" /> {elapsed > 0 ? "Resume" : "Start"}
              </button>
            ) : (
              <button
                onClick={pause}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold"
              >
                <Pause className="h-4 w-4" /> Pause
              </button>
            )}
            <button
              onClick={() => stop(false)}
              disabled={elapsed === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Square className="h-4 w-4" /> Stop & Save
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Today</p>
              <p className="mt-1 text-2xl font-bold">{fmt(todayTotal)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Last 7 days</p>
              <p className="mt-1 text-2xl font-bold">{fmt(weekTotal)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <TimerIcon className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Recent sessions</p>
            </div>
            {sessionsQ.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (sessionsQ.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No sessions yet. Start your first!</p>
            ) : (
              <ul className="divide-y divide-border">
                {(sessionsQ.data ?? []).slice(0, 15).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {s.subject || "General"}
                        {s.topic ? ` · ${s.topic}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.started_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono font-semibold">{fmt(s.duration_seconds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
