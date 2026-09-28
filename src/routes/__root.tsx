import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme";
import { LanguageProvider } from "../lib/i18n";
import { AuthProvider } from "../lib/auth";
import { OnboardingProvider } from "../lib/onboarding";
import { AppLayout } from "../components/AppLayout";
import { Toaster } from "../components/ui/sonner";
import { EntitlementBridge } from "../lib/entitlement-bridge";

function isAppUser() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("source") === "app";
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "SSC Mentor AI" },
      { name: "google-site-verification", content: "Az-JDugxIiilmz-KewJgT6I78NJcvA03zOUYLq4Uthc" },
      { name: "google-adsense-account", content: "ca-pub-6517714326018658" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SSC Mentor AI" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "SSC Mentor AI",
              url: "https://sscmentorai.online",
            },
            {
              "@type": "WebSite",
              name: "SSC Mentor AI",
              url: "https://sscmentorai.online",
              description:
                "SSC Mentor AI provides SSC CGL previous year question papers with solutions, mock tests, quizzes, and AI-powered exam preparation.",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      posthog.init("phc_ywZuD9kGRdBjiUeqAjWVKsensuWfhHALfBQpPiraNWzR", {
        api_host: "https://us.posthog.com/",
        capture_pageview: true,
        capture_pageleave: true,
      });

      // Disable pinch/zoom inside the mobile app WebView only
      if (isAppUser()) {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          meta.setAttribute(
            "content",
            "width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no"
          );
        }
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <OnboardingProvider>
              <AppLayout>
                <Outlet />
              </AppLayout>
              <EntitlementBridge />
              <Toaster richColors position="top-center" />
            </OnboardingProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
