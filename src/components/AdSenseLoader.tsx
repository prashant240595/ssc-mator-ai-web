import { useEffect } from "react";
import { detectAppUser } from "@/lib/app-user";

const ADSENSE_CLIENT = "ca-pub-6517714326018658";
const SCRIPT_ID = "adsense-loader";

/**
 * Loads Google AdSense on the web only.
 * For WebView app users (?source=app), the script is NOT injected,
 * so no web ads appear inside the app — AdMob handles ads there.
 */
export function AdSenseLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (detectAppUser()) return;
    // Paid (ad-free) users see no ads on the website either.
    if ((window as unknown as { sscAdFree?: boolean }).sscAdFree) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  }, []);

  return null;
}
