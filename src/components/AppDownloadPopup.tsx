import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { detectAppUser } from "@/lib/app-user";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.education.sscmentorai";
const LAST_SHOWN_KEY = "ssc:appPopupLastShown";
const FIRST_SHOWN_KEY = "ssc:appPopupFirstShown";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function AppDownloadPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // Never show inside the WebView Android app
      if (detectAppUser()) return;
      const firstShown = localStorage.getItem(FIRST_SHOWN_KEY);
      const lastShown = Number(localStorage.getItem(LAST_SHOWN_KEY) || 0);
      const now = Date.now();

      let shouldShow = false;
      if (!firstShown) {
        // First-time user — must see it once
        shouldShow = true;
      } else if (!lastShown || now - lastShown > THIRTY_DAYS_MS) {
        // Monthly reminder
        shouldShow = true;
      }

      if (shouldShow) {
        const t = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const close = () => {
    try {
      const now = Date.now().toString();
      localStorage.setItem(LAST_SHOWN_KEY, now);
      localStorage.setItem(FIRST_SHOWN_KEY, "1");
    } catch {}
    setOpen(false);
  };

  const handleDownload = () => {
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-elevated">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Smartphone className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold">Pay in the website or free use in the app</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Website use is paid. Use the Android app free forever — unlimited practice, exams, AI coach and more.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:opacity-95"
          >
            <Download className="h-4 w-4" />
            Free use in app
          </button>
          <button
            onClick={close}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
