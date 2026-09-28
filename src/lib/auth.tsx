import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { detectAppUser } from "@/lib/app-user";


export const ADMIN_EMAIL = "prashant.singh.2405@gmail.com";
const GUEST_KEY = "ssc:guestMode";

function notifyNativeAppUserId(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const isApp =
      params.get("source") === "app" ||
      (typeof localStorage !== "undefined" && localStorage.getItem("ssc:isAppUser") === "1");
    if (!isApp) return;
    const w = window as any;
    if (w.AndroidBridge && typeof w.AndroidBridge.sendUserIdToApp === "function") {
      w.AndroidBridge.sendUserIdToApp(userId);
    }
    if (w.webkit?.messageHandlers?.iOSBridge?.postMessage) {
      w.webkit.messageHandlers.iOSBridge.postMessage({ userId });
    }
  } catch {}
}

export type Role = "admin" | "student" | "guest" | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean; // signed-in or guest
  signInEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInGoogle: () => Promise<{ error?: string }>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({} as AuthState);

function isGoogleUser(user: User): boolean {
  const provider = (user.app_metadata as any)?.provider;
  const providers = ((user.app_metadata as any)?.providers ?? []) as string[];
  const identities = (user.identities ?? []).map((i: any) => i.provider);
  return provider === "google" || providers.includes("google") || identities.includes("google");
}

function deriveRole(user: User | null, guest: boolean): Role {
  if (user) {
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL && isGoogleUser(user);
    return isAdmin ? "admin" : "student";
  }
  if (guest) return "guest";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore guest flag
    try {
      if (typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "1") {
        setGuest(true);
      }
    } catch {}

    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setGuest(false);
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {}
        try {
          notifyNativeAppUserId(s.user.id);
        } catch {}
        if (event === "SIGNED_IN") {
          try {
            supabase
              .from("user_activity_logs" as never)
              .insert({
                user_id: s.user.id,
                activity_type: "login",
                details: {
                  ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
                  source: detectAppUser() ? "app" : "web",
                },
              } as never)
              .then(() => {});
          } catch {}
        }
      }
    });


    // Then existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = () => {
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {}
    setGuest(true);
  };

  const signInEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUpEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? { error: error.message } : {};
  };

  const signInGoogle = async () => {
    if (typeof window === "undefined")
      return { error: "Google sign-in is only available in the browser." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {}
    setGuest(false);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const role = deriveRole(user, guest);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        role,
        loading,
        isGuest: guest,
        isAuthenticated: !!user || guest,
        signInEmail,
        signUpEmail,
        signInGoogle,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
