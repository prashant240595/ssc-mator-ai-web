import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  User as UserIcon,
  Award,
  Target,
  Trophy,
  Sparkles,
  Pencil,
  Mail,
  Shield,
  Trash2,
  ShieldAlert,
  Bookmark,

} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { deriveLevel, useOnboarding } from "@/lib/onboarding";
import { requestAccountDeletion, getMyDeletionRequest } from "@/lib/account.functions";
import { DELETION_REASONS } from "@/lib/admin-constants";
import { toast } from "sonner";
import { FeedbackBox, RateAppCard } from "@/components/FeedbackBox";
import { RemoveAdsCard } from "@/components/RemoveAdsCard";



export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — SSC Mentor AI" },
      { name: "description", content: "Manage your SSC Mentor AI profile, target exam, attempt history and learning preferences." },
      { property: "og:title", content: "Your Profile — SSC Mentor AI" },
      { property: "og:description", content: "Manage your SSC Mentor AI profile and exam preferences." },
      { property: "og:url", content: "https://sscmentorai.online/profile" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/profile" }],
  }),
  component: ProfilePage,
});

const ATTEMPTS_LABEL: Record<string, string> = {
  first: "First attempt",
  "1": "1 attempt",
  "2": "2 attempts",
  "3+": "3+ attempts",
};

const STAGE_LABEL: Record<string, string> = {
  tier1: "Tier 1 / Prelims",
  tier2: "Tier 2 / Mains",
  dv: "Document Verification",
};

function ProfilePage() {
  const { user, role, isGuest } = useAuth();
  const { profile, reset } = useOnboarding();
  const submitRequest = useServerFn(requestAccountDeletion);
  const fetchRequest = useServerFn(getMyDeletionRequest);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ status: string; reason: string; created_at: string } | null>(null);

  useEffect(() => {
    if (isGuest || !user) return;
    fetchRequest({})
      .then((r: any) => setPending(r?.request ?? null))
      .catch(() => {});
  }, [isGuest, user, fetchRequest]);

  const handleRequest = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await submitRequest({ data: { reason, details } });
      toast.success("Deletion request sent to the admin. You'll be notified once it's processed.");
      setPending({ status: "pending", reason, created_at: new Date().toISOString() });
      setConfirmOpen(false);
      setDetails("");
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request.");
    }
    setSubmitting(false);
  };


  const level = deriveLevel(profile);
  const incomplete = !profile || profile.skipped || !profile.completed;

  const toneClass =
    level?.tone === "success"
      ? "bg-success-soft text-success-foreground"
      : level?.tone === "warning"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-primary-soft text-primary";

  const initial = (user?.email?.[0] ?? (isGuest ? "G" : "U")).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/70 px-6 py-8 text-primary-foreground">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-foreground/15 text-2xl font-bold backdrop-blur">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold leading-tight">
                {user?.email ? user.email.split("@")[0] : "Guest user"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 font-medium backdrop-blur">
                  <Mail className="h-3 w-3" />
                  {user?.email ?? "No email"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 font-medium uppercase tracking-wider backdrop-blur">
                  <Shield className="h-3 w-3" />
                  {role}
                </span>
              </div>
            </div>
            {level && (
              <div className="sm:text-right">
                <span
                  className={
                    "inline-flex items-center gap-1.5 rounded-full bg-primary-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary"
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {level.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/bookmarks"
          className="card-surface flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
            <Bookmark className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Bookmarked questions</p>
            <p className="text-xs text-muted-foreground">Revise everything you saved</p>
          </div>
        </Link>
      </section>

      <RemoveAdsCard />
      <RateAppCard />
      <FeedbackBox />




      {/* Incomplete CTA */}
      {incomplete && (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Complete your Academic Profile
              </h3>
              <p className="text-xs text-muted-foreground">
                Add your attempt history and scores so AI Coach can tailor a plan for you.
              </p>
            </div>
          </div>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
          >
            <Pencil className="h-4 w-4" />
            Complete now
          </button>
        </section>
      )}

      {/* Academic snapshot */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Academic profile</h2>
          {!incomplete && (
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile
            icon={<Target className="h-4 w-4" />}
            label="Attempts"
            value={profile?.attempts ? ATTEMPTS_LABEL[profile.attempts] : "—"}
          />
          <InfoTile
            icon={<Trophy className="h-4 w-4" />}
            label="Highest stage"
            value={profile?.highestStage ? STAGE_LABEL[profile.highestStage] : "—"}
          />
          <InfoTile
            icon={<Award className="h-4 w-4" />}
            label="Level"
            value={level?.label ?? "—"}
            highlight={toneClass}
          />
        </div>
      </section>

      {/* Scores */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Previous scores</h2>
        <p className="text-xs text-muted-foreground">
          Latest reported scores from your last attempt.
        </p>
        {profile?.scores && Object.values(profile.scores).some((v) => v && v !== "") ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ScoreTile label="Total" value={profile.scores.total} accent />
            <ScoreTile label="Quant" value={profile.scores.quant} />
            <ScoreTile label="Reasoning" value={profile.scores.reasoning} />
            <ScoreTile label="English" value={profile.scores.english} />
            <ScoreTile label="GA" value={profile.scores.ga} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No scores added yet.
          </div>
        )}
      </section>

      {/* Danger zone — Delete account (signed-in users only) */}
      {!isGuest && user && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-lg font-bold text-destructive">Delete account</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell us why you want to leave. Your request goes to the admin for review, and the
                account is permanently deleted once it is approved.
              </p>

              {pending?.status === "pending" ? (
                <div className="mt-3 rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs text-warning-foreground">
                  <p className="font-semibold">Deletion request pending admin review</p>
                  <p className="mt-1">Reason: {pending.reason}</p>
                  <p className="mt-1 opacity-80">
                    Sent on {new Date(pending.created_at).toLocaleDateString()}
                  </p>
                </div>
              ) : !confirmOpen ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-destructive bg-background px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Request account deletion
                </button>
              ) : (
                <div className="mt-3 space-y-3 rounded-xl border border-destructive/40 bg-background p-3">
                  <p className="text-xs font-semibold text-foreground">
                    Why do you want to delete your account?
                  </p>
                  <div className="space-y-1.5">
                    {DELETION_REASONS.map((r) => (
                      <label
                        key={r}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground has-[:checked]:border-destructive has-[:checked]:bg-destructive/5"
                      >
                        <input
                          type="radio"
                          name="delete-reason"
                          value={r}
                          checked={reason === r}
                          onChange={() => setReason(r)}
                          disabled={submitting}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Anything else you'd like the admin to know (optional)"
                    rows={3}
                    maxLength={1000}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none"
                    disabled={submitting}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleRequest}
                      disabled={!reason || submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {submitting ? "Sending..." : "Send deletion request"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmOpen(false);
                        setReason("");
                        setDetails("");
                      }}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          to="/"
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Back to Dashboard
        </Link>
        <Link
          to="/privacy"
          className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-foreground">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-foreground">
        {highlight && value !== "—" ? (
          <span className={"inline-block rounded-md px-2 py-0.5 " + highlight}>{value}</span>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  accent,
}: {
  label: string;
  value?: string;
  accent?: boolean;
}) {
  const v = value && value !== "" ? value : "—";
  return (
    <div
      className={
        "rounded-xl border p-3 text-center " +
        (accent
          ? "border-primary/40 bg-primary-soft text-primary"
          : "border-border bg-background text-foreground")
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-lg font-bold">{v}</p>
    </div>
  );
}
