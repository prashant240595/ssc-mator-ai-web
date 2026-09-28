import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  BookOpen,
  Timer,
  Sparkles,
  Shield,
  Moon,
  Sun,
  GraduationCap,
  LogOut,
  Lock,
  LogIn,
  User,
  FileText,
  BarChart3,
  Newspaper,
  Users,
  Inbox,
  Brain,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { useAuth, type Role } from "@/lib/auth";
import { useOnboarding } from "@/lib/onboarding";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { AppDownloadPopup } from "@/components/AppDownloadPopup";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { NativeAdSlot } from "@/components/NativeAdSlot";
import { SiteFooter } from "@/components/SiteFooter";
import { useIsAppUser, useAppUserState } from "@/lib/app-user";
import { consumeUse, featureForPath, FREE_LIMIT } from "@/lib/web-quota";
import { WebPaywall, FreeUsesBanner } from "@/components/WebPaywall";
import { useSubscription } from "@/lib/use-subscription";
import { toast } from "sonner";

type NavTo =
  | "/"
  | "/practice"
  | "/exams"
  | "/mock-tests"
  | "/ai-coach"
  | "/revision"
  | "/admin"
  | "/profile"
  | "/my-progress"
  | "/blog"
  | "/partners"
  | "/groups"
  | "/inbox"
  | "/timer";
type NavItem = {
  to: NavTo;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  adminOnly?: boolean;
  guestAllowed?: boolean;
  mobileHidden?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home, exact: true, guestAllowed: true },
  { to: "/practice", label: "Practice", icon: BookOpen },
  { to: "/exams", label: "Exams", icon: FileText },
  { to: "/mock-tests", label: "Mock Tests", icon: Timer, mobileHidden: true },
  { to: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { to: "/revision", label: "Revision", icon: Brain, mobileHidden: true },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/partners", label: "Partners", icon: Users, mobileHidden: true },
  { to: "/groups", label: "Groups", icon: Users, mobileHidden: true },
  { to: "/timer", label: "Timer", icon: Timer, mobileHidden: true },
  { to: "/my-progress", label: "My Progress", icon: BarChart3, mobileHidden: true },
  { to: "/blog", label: "Blog", icon: Newspaper, guestAllowed: true, mobileHidden: true },
  { to: "/profile", label: "Profile", icon: User, mobileHidden: true },
  { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

const PUBLIC_ROUTES = new Set([
  "/login",
  "/privacy",
  "/privacy-policy",
  "/terms-and-conditions",
  "/disclaimer",
  "/about-us",
  "/contact-us",
]);
function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;
  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) return true;
  return false;
}

function nativeAdSlotForPath(pathname: string): string | null {
  if (
    pathname === "/" ||
    pathname === "/daily-quiz" ||
    pathname === "/practice" ||
    pathname === "/bookmarks" ||
    pathname === "/inbox" ||
    pathname.startsWith("/groups/") ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname === "/sitemap.xml"
  ) {
    return null;
  }

  if (pathname === "/blog") return "page_native_ad_blog";
  if (pathname.startsWith("/blog/tag/")) return "page_native_ad_blog_tag";
  if (pathname.startsWith("/blog/")) return "page_native_ad_blog_post";
  if (pathname === "/jobs") return "page_native_ad_jobs";
  if (pathname.startsWith("/jobs/tag/")) return "page_native_ad_jobs_tag";
  if (pathname.startsWith("/jobs/")) return "page_native_ad_job_detail";

  const routeName = pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "_");
  return routeName ? `page_native_ad_${routeName.toLowerCase()}` : null;
}

function PageNativeAdSlot({ slotId }: { slotId: string }) {
  const [hasDedicatedSlot, setHasDedicatedSlot] = useState(true);

  useEffect(() => {
    const checkForDedicatedSlot = () => {
      const hasOtherSlot = Array.from(document.querySelectorAll("[data-native-ad-slot]")).some(
        (element) => element.id !== slotId,
      );
      setHasDedicatedSlot(hasOtherSlot);
    };

    checkForDedicatedSlot();
    const observer = new MutationObserver(checkForDedicatedSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [slotId]);

  return hasDedicatedSlot ? null : <NativeAdSlot slotId={slotId} />;
}

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

function visibleNav(role: Role): NavItem[] {
  return NAV.filter((item) => {
    if (item.adminOnly) return role === "admin";
    return true;
  });
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to Hindi" : "Switch to English"}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
        {lang === "en" ? "A" : "अ"}
      </span>
      {!compact && <span>{lang === "en" ? "EN" : "हिं"}</span>}
    </button>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isAuthenticated, role, loading, signOut, user, isGuest } = useAuth();
  const { needsOnboarding } = useOnboarding();
  const [lockedModal, setLockedModal] = useState<{ open: boolean; target?: NavTo }>({ open: false });
  const isAppUser = useIsAppUser();
  const pageNativeAdSlot = nativeAdSlotForPath(pathname);
  const { ready: appCheckReady, isApp: isVerifiedApp } = useAppUserState();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Free-use quota for website / mobile-browser users (app users are unlimited).
  const gatedFeature = featureForPath(pathname);
  const { active: hasWebPass, ready: subReady } = useSubscription();
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  useEffect(() => {
    if (
      !appCheckReady ||
      isVerifiedApp ||
      !gatedFeature ||
      !subReady ||
      hasWebPass
    ) {
      setQuotaLeft(null);
      return;
    }
    const used = consumeUse(gatedFeature);
    setQuotaLeft(FREE_LIMIT - used);
  }, [appCheckReady, isVerifiedApp, gatedFeature, subReady, hasWebPass, role]);


  // Auth gate: everyone starts at /login. Guests can opt in from there and
  // browse practice / exams / mock tests without any data being saved.
  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    if (isPublicRoute(pathname)) return;
    navigate({ to: "/login" });
  }, [loading, isAuthenticated, pathname, navigate]);

  // Admin-only route protection
  useEffect(() => {
    if (loading) return;
    if (pathname.startsWith("/admin") && role !== "admin") {
      toast.error("Unauthorized Access");
      navigate({ to: "/" });
    }
  }, [loading, role, pathname, navigate]);

  // Track page views for authenticated (non-guest) users
  useEffect(() => {
    if (loading || !user?.id) return;
    (async () => {
      const { logActivity } = await import("@/lib/activity-log");
      const ref = typeof document !== "undefined" ? document.referrer : "";
      const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const utm = qs?.get("utm_source") ?? "";
      const src = /android-app:\/\/com\.android\.vending|play\.google\.com/i.test(ref) || utm === "playstore"
        ? "play_store"
        : /google\./i.test(ref)
          ? "google_search"
          : ref
            ? "referral"
            : "direct";
      logActivity("page_view", {
        path: pathname,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        referrer: ref,
        utm_source: utm,
        traffic_source: src,
      });
    })();
  }, [pathname, user?.id, loading]);


  // Install native FCM bridge once (window.saveFcmToken for Android/iOS)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { installNativeFcmBridge } = await import("@/lib/firebase-messaging");
      if (!cancelled) installNativeFcmBridge();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize push notifications after sign-in (once per session)
  useEffect(() => {
    if (loading || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { initPushNotifications, refreshNativeFcmToken } = await import(
        "@/lib/firebase-messaging"
      );
      if (cancelled) return;
      // Re-link / refresh the native app token for this user
      await refreshNativeFcmToken(user.id);
      if (!cancelled) await initPushNotifications(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);


  // Guest-restricted route protection (force-nav via URL → open modal + bounce to dashboard)
  useEffect(() => {
    if (loading) return;
    if (role !== "guest") return;
    const extraBlocked = ["/daily-quiz", "/bookmarks", "/chat", "/revision"].some((p) =>
      pathname === p || pathname.startsWith(p + "/"),
    );
    const blocked = NAV.find(
      (n) => !n.guestAllowed && !n.adminOnly && isActive(pathname, n.to, n.exact),
    );
    if (blocked || extraBlocked) {
      setLockedModal({ open: true, target: blocked?.to ?? "/" });
      navigate({ to: "/" });
    }
  }, [loading, role, pathname, navigate]);

  // Render login/legal pages with minimal shell (no sidebar) + footer
  if (isPublicRoute(pathname)) {
    if (pathname === "/login") {
      return (
        <>
          <AdSenseLoader />
          {children}
          {isAppUser && pageNativeAdSlot && <PageNativeAdSlot slotId={pageNativeAdSlot} />}
        </>
      );
    }
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 md:px-6">
          {children}
          {isAppUser && pageNativeAdSlot && <PageNativeAdSlot slotId={pageNativeAdSlot} />}
        </main>
        {!isAppUser && <SiteFooter />}
        <AdSenseLoader />
      </div>
    );
  }

  // Loading splash while resolving session.
  // Skipped during SSR / before hydration so crawlers (Googlebot, AdSense, Gemini)
  // receive the real page markup instead of a "Loading…" placeholder.
  if (hydrated && (loading || !isAuthenticated)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <p className="text-xs">Loading…</p>
        </div>
      </div>
    );
  }

  const items = visibleNav(role);
  const mobileItems = items.filter((i) => !i.mobileHidden);

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    if (role === "guest" && !item.guestAllowed && !item.adminOnly) {
      e.preventDefault();
      setLockedModal({ open: true, target: item.to });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-elevated">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold">SSC Mentor AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle compact />
          <ThemeToggle compact />
          <button
            onClick={handleSignOut}
            aria-label={isGuest ? "Exit guest" : "Sign out"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground transition hover:bg-destructive-soft hover:text-destructive"
          >
            {isGuest ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            <span>{isGuest ? "Sign in" : "Log out"}</span>
          </button>
        </div>
      </header>


      <div className="mx-auto flex w-full max-w-7xl md:gap-6 md:px-6 md:py-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-card md:flex">
          <Link to="/" className="mb-4 flex items-center gap-3 px-2 py-1">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold">SSC Mentor AI</p>
              <p className="truncate text-xs text-muted-foreground">CGL Preparation</p>
            </div>
          </Link>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {items.map((item) => {
              const active = isActive(pathname, item.to, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(e) => handleNavClick(e, item)}
                  className={
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                    (active
                      ? "bg-primary text-primary-foreground shadow-elevated"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {role === "guest" && !item.guestAllowed && !item.adminOnly && (
                    <Lock className="ml-auto h-3.5 w-3.5 opacity-70" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-2 pt-4">
            {/* Profile chip */}
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:bg-muted"
            >
              <span
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold " +
                  (role === "admin"
                    ? "bg-warning-soft text-warning-foreground"
                    : role === "guest"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary-soft text-primary")
                }
              >
                {(user?.email?.[0] ?? "G").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {user?.email ?? "Guest user"}
                </p>
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  View profile · {role}
                </p>
              </div>
            </Link>
            <LanguageToggle />
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-destructive-soft hover:text-destructive"
            >
              {isGuest ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              {isGuest ? "Sign in" : "Log out"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 pb-28 pt-4 md:px-0 md:pb-6 md:pt-0">
          {gatedFeature && quotaLeft !== null && quotaLeft < 0 ? (
            <WebPaywall feature={gatedFeature} />
          ) : (
            <>
              {gatedFeature && quotaLeft !== null && quotaLeft >= 0 && (
                <FreeUsesBanner feature={gatedFeature} remaining={quotaLeft} />
              )}
              {children}
              {isAppUser && pageNativeAdSlot && <PageNativeAdSlot slotId={pageNativeAdSlot} />}
            </>
          )}
          {!isAppUser && <SiteFooter />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <ul
          className="mx-auto grid max-w-md"
          style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        >
          {mobileItems.map((item) => {
            const active = isActive(pathname, item.to, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={(e) => handleNavClick(e, item)}
                  className={
                    "flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium transition " +
                    (active ? "text-primary" : "text-muted-foreground")
                  }
                >
                  <span
                    className={
                      "relative grid h-9 w-9 place-items-center rounded-xl transition " +
                      (active ? "bg-primary text-primary-foreground shadow-elevated" : "")
                    }
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                    {role === "guest" && !item.guestAllowed && !item.adminOnly && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-muted text-foreground ring-1 ring-border">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Locked feature modal for guests */}
      {lockedModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-elevated">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
              <Lock className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold">Please login to access this feature</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in or create a free account to unlock practice, mock tests and AI coaching.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={async () => {
                  setLockedModal({ open: false });
                  await signOut();
                  navigate({ to: "/login" });
                }}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
              >
                Go to Login
              </button>
              <button
                onClick={() => setLockedModal({ open: false })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      )}
      {/* First-time onboarding wizard */}
      {needsOnboarding && !isPublicRoute(pathname) && <OnboardingWizard />}
      {!isPublicRoute(pathname) && <AppDownloadPopup />}
      <AdSenseLoader />
    </div>
  );
}
