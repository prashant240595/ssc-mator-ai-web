/* Firebase Cloud Messaging service worker.
 * Handles background push notifications for the web app.
 */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB46eX_ZB_chpdmEh5UPidlkthbicVHf_o",
  authDomain: "ssc-mentor-ai-f5658.firebaseapp.com",
  projectId: "ssc-mentor-ai-f5658",
  storageBucket: "ssc-mentor-ai-f5658.firebasestorage.app",
  messagingSenderId: "703448550642",
  appId: "1:703448550642:web:a1b1e450b3d7b5392d946b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "SSC Mentor AI";
  const body = payload?.notification?.body || payload?.data?.body || "";
  const url = payload?.data?.url || "/";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url },
    tag: payload?.data?.tag || undefined,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(raw, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        try {
          const wUrl = new URL(w.url);
          if (wUrl.origin === self.location.origin) {
            await w.navigate(target).catch(() => {});
            return w.focus();
          }
        } catch {}
      }
      if (clients.openWindow) return clients.openWindow(target);
    })(),
  );
});
