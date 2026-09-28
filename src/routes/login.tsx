import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Mail, Lock, Loader2, UserRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in to SSC Mentor AI — SSC CGL Prep Account" },
      { name: "description", content: "Sign in to SSC Mentor AI to save progress, take mock tests, and unlock personal AI coaching for SSC CGL." },
      { property: "og:title", content: "Sign in to SSC Mentor AI" },
      { property: "og:description", content: "Sign in to save SSC CGL progress and unlock AI coaching." },
      { property: "og:url", content: "https://sscmentorai.online/login" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, isGuest, signInEmail, signUpEmail, signInGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState<null | "email" | "google" | "guest">(null);

  useEffect(() => {
    if (user) {
      if (pathname === "/login") navigate({ to: "/" });
    }
  }, [user, pathname, navigate]);

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading("email");
    const fn = mode === "signin" ? signInEmail : signUpEmail;
    const { error } = await fn(email, password);
    setLoading(null);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Check your email to confirm your account.");
    } else {
      toast.success("Welcome back!");
      navigate({ to: "/" });
    }
  };

  const onGoogle = async () => {
    setLoading("google");
    const { error } = await signInGoogle();
    if (error) {
      toast.error(error);
      setLoading(null);
    }
  };

  const onGuest = () => {
    setLoading("guest");
    continueAsGuest();
    toast.message("Browsing as Guest — sign in for full access.");
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
            <GraduationCap className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">SSC Mentor AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back — let's crack SSC CGL." : "Create an account to start preparing."}
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
          {/* Mode tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm font-semibold">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  "rounded-lg py-2 transition " +
                  (mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                title="At least 6 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </label>
            <button
              type="submit"
              disabled={loading !== null}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={onGoogle}
            disabled={loading !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            Continue with Google
          </button>

          <button
            onClick={onGuest}
            disabled={loading !== null}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <UserRound className="h-4 w-4" />
            Continue as Guest
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          By continuing, you agree to our Terms of Service &{" "}
          <Link to="/privacy" className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.43-1.7 4.2-5.5 4.2-3.31 0-6-2.74-6-6.1S8.69 6.1 12 6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.94 3.6 14.7 2.6 12 2.6 6.85 2.6 2.7 6.74 2.7 11.9S6.85 21.2 12 21.2c6.92 0 9.5-4.85 9.5-7.65 0-.52-.05-.92-.13-1.35H12Z"
      />
    </svg>
  );
}
