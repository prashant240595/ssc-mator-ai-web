import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export type AttemptCount = "first" | "1" | "2" | "3+";
export type HighestStage = "tier1" | "tier2" | "dv";
export type Gender = "male" | "female" | "other";

export interface PreviousScores {
  total?: string;
  quant?: string;
  reasoning?: string;
  english?: string;
  ga?: string;
}

export interface OnboardingProfile {
  completed: boolean;
  skipped: boolean;
  attempts?: AttemptCount;
  highestStage?: HighestStage;
  scores?: PreviousScores;
  gender?: Gender;
  updatedAt: string;
}

interface OnboardingCtx {
  profile: OnboardingProfile | null;
  needsOnboarding: boolean;
  save: (p: Partial<OnboardingProfile>) => void;
  skip: () => void;
  reset: () => void;
  storageKey: string | null;
}

const Ctx = createContext<OnboardingCtx>({} as OnboardingCtx);

function keyFor(userId: string | null, isGuest: boolean): string | null {
  if (userId) return `ssc:onboarding:${userId}`;
  if (isGuest) return `ssc:onboarding:guest`;
  return null;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isAuthenticated } = useAuth();
  const storageKey = keyFor(user?.id ?? null, isGuest);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    setProfile(null);
    if (!storageKey) {
      setHydrated(true);
      return;
    }

    // Optimistic read from localStorage cache to avoid wizard flash
    let cached: OnboardingProfile | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) cached = JSON.parse(raw) as OnboardingProfile;
    } catch {}
    if (cached) setProfile(cached);

    // Authoritative read from DB for signed-in users
    if (user?.id) {
      let cancelled = false;
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding, gender")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        let remote = (data?.onboarding as OnboardingProfile | null) ?? null;
        // Backfill: if user previously answered (gender saved on profile) but
        // onboarding JSON is missing (older accounts / partial save), treat as
        // completed so reinstall does not re-prompt.
        if (!remote && data?.gender) {
          remote = {
            completed: true,
            skipped: false,
            gender: data.gender as Gender,
            updatedAt: new Date().toISOString(),
          };
          void supabase.from("profiles").update({ onboarding: remote as any }).eq("id", user.id);
        }
        if (remote) {
          setProfile(remote);
          try {
            localStorage.setItem(storageKey, JSON.stringify(remote));
          } catch {}
        }
        setHydrated(true);
      })();
      return () => {
        cancelled = true;
      };
    } else {
      setHydrated(true);
    }
  }, [storageKey, user?.id]);


  const persist = (next: OnboardingProfile) => {
    setProfile(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
    if (user?.id) {
      const update: Record<string, unknown> = { onboarding: next as any };
      if (next.gender) update.gender = next.gender;
      // Await so a fast navigation right after the wizard doesn't cancel the write
      void (async () => {
        try {
          await supabase.from("profiles").update(update as any).eq("id", user.id);
        } catch {}
      })();
    }

  };

  const save = (p: Partial<OnboardingProfile>) => {
    const next: OnboardingProfile = {
      completed: true,
      skipped: false,
      ...(profile ?? {}),
      ...p,
      updatedAt: new Date().toISOString(),
    };
    persist(next);
  };

  const skip = () => {
    persist({
      completed: false,
      skipped: true,
      ...(profile ?? {}),
      updatedAt: new Date().toISOString(),
    });
  };

  const reset = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
    setProfile(null);
    if (user?.id) {
      void supabase.from("profiles").update({ onboarding: null }).eq("id", user.id);
    }
  };

  // Only prompt onboarding after we've checked the DB, and only when no record exists
  // Onboarding popup disabled — users can fill this from their profile page.
  void isAuthenticated;
  void hydrated;
  const needsOnboarding = false;

  return (
    <Ctx.Provider value={{ profile, needsOnboarding, save, skip, reset, storageKey }}>
      {children}
    </Ctx.Provider>
  );
}

export const useOnboarding = () => useContext(Ctx);

export function deriveLevel(p: OnboardingProfile | null):
  | { label: "Beginner" | "Intermediate" | "Advanced"; tone: "primary" | "warning" | "success" }
  | null {
  if (!p || !p.attempts) return null;
  if (p.attempts === "first") return { label: "Beginner", tone: "primary" };
  if (p.attempts === "1" || p.attempts === "2") return { label: "Intermediate", tone: "warning" };
  return { label: "Advanced", tone: "success" };
}
