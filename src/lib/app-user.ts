import { useEffect, useState } from "react";

const PASS_KEY = "ssc:appPass";
const LEGACY_KEY = "ssc:isAppUser";

/**
 * App detection is cryptographic, not URL-based.
 *
 * The official app opens the site with `?app_token=<ts>.<nonce>.<hmac>` (or calls
 * `window.sscAppAttest(token)` from its WebView bridge). The server verifies the
 * HMAC with APP_ATTEST_SECRET and returns a signed, expiring device pass which is
 * stored locally and re-validated on every load. Adding `?source=app` by hand no
 * longer grants app status.
 */

const HINT_KEY = "ssc:appHint";

/**
 * UI-only hint for older app builds that don't send `app_token` yet.
 * Only a real Android WebView counts — `?source=app` in a normal browser does not.
 * This never grants paid access (that stays crypto-verified).
 */
function readHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hasNativeBridge = Boolean(
      (window as unknown as {
        AndroidAds?: unknown;
        AndroidBilling?: unknown;
        Android?: unknown;
      }).AndroidAds ||
        (window as unknown as { AndroidBilling?: unknown }).AndroidBilling ||
        (window as unknown as { Android?: unknown }).Android,
    );
    // Android WebView user agents contain "; wv)"
    const isWebView = /;\s*wv\)/i.test(navigator.userAgent);
    if (!isWebView && !hasNativeBridge) {
      // Clean up any hint previously granted via ?source=app
      localStorage.removeItem(HINT_KEY);
      localStorage.removeItem(LEGACY_KEY);
      return false;
    }
    localStorage.setItem(HINT_KEY, "1");
    return true;
  } catch {}
  return false;
}


/**
 * Grab `app_token` synchronously at module load: client-side redirects (e.g. to
 * /login) can replace the URL before the async handshake gets a chance to read it.
 */
let pendingToken: string | null = null;
if (typeof window !== "undefined") {
  try {
    const p = new URLSearchParams(window.location.search);
    pendingToken = p.get("app_token");
    if (pendingToken) {
      p.delete("app_token");
      p.delete("source");
      const qs = p.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
      );
    }
  } catch {}
}

function readPass(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PASS_KEY);
    if (!raw) return null;
    const exp = Number(raw.split(".")[0]);
    if (!Number.isFinite(exp) || Date.now() > exp) {
      localStorage.removeItem(PASS_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/** Synchronous, best-effort check (UI only). Server must re-verify for paid gating. */
export function detectAppUser(): boolean {
  return readPass() !== null || readHint();
}

/** Strict check: only a server-signed pass counts (use this for paid gating). */
export function isVerifiedAppUser(): boolean {
  return readPass() !== null;
}

let verifying: Promise<boolean> | null = null;

/** Runs the handshake / pass re-validation once per page load. */
export function ensureAppVerification(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (verifying) return verifying;

  verifying = (async () => {
    // Remember older app builds so their experience stays app-like.
    const hint = readHint();
    if (hint) {
      try {
        localStorage.setItem(LEGACY_KEY, "1");
      } catch {}
    }

    const { exchangeAppToken, validateAppPass } = await import("@/lib/app-attest.functions");

    const applyToken = async (token: string): Promise<boolean> => {
      try {
        const res = await exchangeAppToken({ data: { token } });
        if (res.ok && res.pass) {
          localStorage.setItem(PASS_KEY, res.pass);
          window.dispatchEvent(new Event("ssc:app-status"));
          return true;
        }
      } catch {}
      return false;
    };

    // Bridge for the native WebView: window.sscAppAttest(token)
    (window as unknown as { sscAppAttest?: (t: string) => Promise<boolean> }).sscAppAttest =
      applyToken;

    try {
      // Token captured synchronously at module load (URL already cleaned).
      const token = pendingToken ?? new URLSearchParams(window.location.search).get("app_token");
      pendingToken = null;
      if (token) {
        const ok = await applyToken(token);
        if (ok) return true;
      }


      const pass = readPass();
      if (!pass) return hint;
      const res = await validateAppPass({ data: { pass } });
      if (!res.ok) {
        localStorage.removeItem(PASS_KEY);
        window.dispatchEvent(new Event("ssc:app-status"));
        return hint;
      }
      return true;
    } catch {
      return readPass() !== null || hint;
    }
  })();

  return verifying;
}

export function useIsAppUser(): boolean {
  const [isApp, setIsApp] = useState(false);
  useEffect(() => {
    let alive = true;
    setIsApp(detectAppUser());
    ensureAppVerification().then((ok) => alive && setIsApp(ok));
    const onChange = () => alive && setIsApp(detectAppUser());
    window.addEventListener("ssc:app-status", onChange);
    return () => {
      alive = false;
      window.removeEventListener("ssc:app-status", onChange);
    };
  }, []);
  return isApp;
}

/** Same as useIsAppUser but tells you when detection has run (post-hydration). */
export function useAppUserState(): { ready: boolean; isApp: boolean } {
  const [state, setState] = useState({ ready: false, isApp: false });
  useEffect(() => {
    let alive = true;
    ensureAppVerification().then((isApp) => alive && setState({ ready: true, isApp }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
