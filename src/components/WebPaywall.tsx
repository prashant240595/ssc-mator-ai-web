import { Download, Smartphone, Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FEATURE_LABELS, FREE_LIMIT, type FeatureKey } from "@/lib/web-quota";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.education.sscmentorai";

function openStore() {
  window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
}

/** Small banner shown while free uses are still left. */
export function FreeUsesBanner({
  feature,
  remaining,
}: {
  feature: FeatureKey;
  remaining: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning text-warning-foreground">
        <Sparkles className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
        Free preview: {remaining} of {FREE_LIMIT} free {FEATURE_LABELS[feature]} uses left on the
        website.{" "}
        <span className="text-muted-foreground">
          Pay in the website or free use in the app.
        </span>
      </p>
      <button
        onClick={openStore}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
      >
        <Download className="h-3.5 w-3.5" />
        Free use in app
      </button>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:bg-muted"
      >
        Pay in website
      </Link>
    </div>
  );
}

/** Full-page lock shown once the browser free quota is used up. */
export function WebPaywall({ feature }: { feature: FeatureKey }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-2 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-elevated">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">
          Pay in the website or free use in the app
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You have used your {FREE_LIMIT} free website tries for this feature. Pay in the website or free use in the app.
        </p>
        <div className="mt-5 rounded-2xl border border-border bg-background p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-primary" />
            Free use in the app
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• Unlimited practice, exams, mock tests and AI coach</li>
            <li>• Daily quiz, smart revision and progress tracking</li>
            <li>• Study partners, groups and chat — all free</li>
          </ul>
        </div>
        <Link
          to="/pricing"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
        >
          Pay in the website — from ₹30 (UPI)
        </Link>
        <button
          onClick={openStore}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Free use in the app
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Already installed? Open SSC Mentor AI from your phone — everything unlocks automatically.
        </p>
      </div>
    </div>
  );
}
