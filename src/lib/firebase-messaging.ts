import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const firebaseConfig = {
  apiKey: "AIzaSyB46eX_ZB_chpdmEh5UPidlkthbicVHf_o",
  authDomain: "ssc-mentor-ai-f5658.firebaseapp.com",
  projectId: "ssc-mentor-ai-f5658",
  storageBucket: "ssc-mentor-ai-f5658.firebasestorage.app",
  messagingSenderId: "703448550642",
  appId: "1:703448550642:web:a1b1e450b3d7b5392d946b",
  measurementId: "G-DFT6QQCGVX",
};

const VAPID_KEY =
  "BIVXOs2x4yjG9hKrYEZBBQYXxC_6TrfH160lIvoiPjYXmdmw4QdM1ydXzVG-JFzasOq-jMvdj5Vm8rt94I2F49U";

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

async function saveToken(userId: string, token: string, platform: string) {
  await supabase
    .from("device_tokens")
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
}

const PENDING_KEY = "ssc:pendingFcmToken";
const SAVED_KEY = "ssc:savedFcmToken";

/**
 * Global bridge for the native Android/iOS app to hand off its FCM token.
 * The app calls `window.saveFcmToken(fcmToken)` after the WebView loads.
 * If the user isn't signed in yet, the token is stored in localStorage and
 * persisted as soon as an auth session appears (also across reloads).
 */
export function installNativeFcmBridge() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__sscFcmBridgeInstalled) return;
  w.__sscFcmBridgeInstalled = true;

  const readPending = (): string | null => {
    try {
      return localStorage.getItem(PENDING_KEY);
    } catch {
      return null;
    }
  };

  const persist = async (token: string) => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        try {
          localStorage.setItem(PENDING_KEY, token);
        } catch {}
        return false;
      }
      // Token pushed by the native bridge => treat as app device unless the
      // page is clearly a normal desktop/mobile browser tab.
      let platform = "android";
      try {
        const ua = navigator.userAgent || "";
        const looksNative =
          /;\s*wv\)/i.test(ua) ||
          /Android.*Version\/[\d.]+.*Chrome/i.test(ua) ||
          localStorage.getItem("ssc:isAppUser") === "1" ||
          !!localStorage.getItem("ssc:appPass");
        if (!looksNative && !/Android/i.test(ua)) platform = "web";
      } catch {}

      await saveToken(uid, token, platform);
      try {
        localStorage.removeItem(PENDING_KEY);
        localStorage.setItem(SAVED_KEY, `${uid}:${token}`);
      } catch {}
      return true;
    } catch (e) {
      console.warn("[fcm] saveFcmToken failed", e);
      try {
        localStorage.setItem(PENDING_KEY, token);
      } catch {}
      return false;
    }
  };

  w.saveFcmToken = async (fcmToken: string) => {
    if (!fcmToken || typeof fcmToken !== "string") return false;
    return persist(fcmToken);
  };

  // Flush anything queued from an earlier load (app handed a token pre-login).
  const pending = readPending();
  if (pending) void persist(pending);

  // Pull-based fallback: older/newer app builds that expose a native getter
  // instead of pushing the token into the page.
  try {
    const bridges = [w.AndroidApp, w.Android, w.AndroidFCM, w.NativeApp].filter(Boolean);
    for (const b of bridges) {
      const t = typeof b?.getFcmToken === "function" ? b.getFcmToken() : null;
      if (typeof t === "string" && t.length > 20) {
        void persist(t);
        break;
      }
    }
  } catch {}

  supabase.auth.onAuthStateChange((_e, session) => {
    if (!session?.user) return;
    const tok = readPending();
    if (tok) void persist(tok);
  });

}

/** Re-save the app's token for the signed-in user (keeps rows fresh / re-links after re-login). */
export async function refreshNativeFcmToken(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const pending = localStorage.getItem(PENDING_KEY);
    const saved = localStorage.getItem(SAVED_KEY);
    const token = pending || (saved ? saved.split(":").slice(1).join(":") : null);
    if (!token) return;
    let platform = "android";
    if (localStorage.getItem("ssc:isAppUser") !== "1") platform = "web";
    await saveToken(userId, token, platform);
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(SAVED_KEY, `${userId}:${token}`);
  } catch (e) {
    console.warn("[fcm] refresh failed", e);
  }
}


/**
 * Initialize push notifications for the currently signed-in user.
 * Silently no-ops when unsupported (SSR, iOS Safari <16.4, insecure origin).
 */
export async function initPushNotifications(userId: string) {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (!(await isSupported())) return;

    // Register the messaging SW at root scope
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    // Ask permission (browser shows prompt only once)
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) return;

    // Detect app WebView (Android app appends ?source=app on first load)
    let platform = "web";
    try {
      if (localStorage.getItem("ssc:isAppUser") === "1") platform = "android";
    } catch {}

    await saveToken(userId, token, platform);

    // Foreground messages — show a clickable toast that navigates to data.url
    onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || (payload?.data as any)?.title;
      const body = payload?.notification?.body || (payload?.data as any)?.body;
      const url = (payload?.data as any)?.url as string | undefined;
      if (title || body) {
        toast.message(title || "Notification", {
          description: body,
          action: url
            ? {
                label: "Open",
                onClick: () => {
                  try {
                    window.location.href = url;
                  } catch {}
                },
              }
            : undefined,
        });
      }
    });
  } catch (e) {
    // Silently swallow — push is best-effort
    console.warn("[push] init failed", e);
  }
}
