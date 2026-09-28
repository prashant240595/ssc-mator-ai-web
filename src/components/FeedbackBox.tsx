import { useEffect, useState } from "react";
import { Bug, Lightbulb, MessageSquare, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useIsAppUser } from "@/lib/app-user";

const CATEGORIES = [
  { key: "bug", label: "Bug", icon: Bug },
  { key: "problem", label: "Problem", icon: MessageSquare },
  { key: "feature", label: "New feature", icon: Lightbulb },
] as const;

export function RateAppCard() {
  const isApp = useIsAppUser();
  if (!isApp) return null;
  return (
    <section className="rounded-2xl border border-warning/40 bg-warning-soft/40 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
          <Star className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Enjoying the app?</p>
          <p className="text-xs text-muted-foreground">
            Support us by rating the app on the Play Store. The rating link will appear here soon.
          </p>
        </div>
        <button
          disabled
          className="shrink-0 cursor-not-allowed rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          Coming soon
        </button>
      </div>
    </section>
  );
}

export function FeedbackBox() {
  const { user, isGuest } = useAuth();
  const [category, setCategory] = useState<string>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_feedback" as never)
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data as unknown as { created_at: string }[] | null)?.[0];
      setLastAt(row?.created_at ?? null);
      setLoaded(true);
    })();
  }, [user]);

  if (!user || isGuest) return null;

  const nextAllowed = lastAt ? new Date(new Date(lastAt).getTime() + 7 * 864e5) : null;
  const locked = !!nextAllowed && nextAllowed.getTime() > Date.now();

  const submit = async () => {
    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("user_feedback" as never).insert({
      user_id: user.id,
      user_email: user.email ?? null,
      category,
      message: message.trim(),
    } as never);
    setSending(false);
    if (error) {
      toast.error(error.message.includes("one message per week")
        ? "You can send only 1 message per week."
        : error.message);
      return;
    }
    toast.success("Thanks! Your message has reached the admin.");
    setMessage("");
    setLastAt(new Date().toISOString());
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold">Report a bug / Suggest a feature</h2>
      <p className="text-xs text-muted-foreground">
        Goes directly to the developer. You can send 1 message per week.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition " +
              (category === c.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted")
            }
          >
            <c.icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      {locked ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
          We received your message. You can send the next one after{" "}
          <span className="font-semibold text-foreground">
            {nextAllowed!.toLocaleDateString()}
          </span>
          .
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
            rows={4}
            placeholder="What is the problem, or which feature would you like? Please describe in detail..."
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            disabled={sending || !loaded}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{message.length}/2000</span>
            <button
              onClick={submit}
              disabled={sending || !loaded || message.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send to developer"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
