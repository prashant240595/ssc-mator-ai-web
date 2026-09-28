/**
 * Free-use quota for website / mobile-browser users.
 *
 * The Android app (crypto-verified via app_token) is always free and unlimited.
 * Browser users get FREE_LIMIT uses of every paid feature, after which they are
 * asked to install the app or buy a pass. Daily Quiz stays free for everyone.
 */

export const FREE_LIMIT = 0;

export type FeatureKey =
  | "practice"
  | "exams"
  | "mock-tests"
  | "ai-coach"
  | "daily-quiz"
  | "revision"
  | "partners"
  | "groups"
  | "timer"
  | "my-progress"
  | "bookmarks"
  | "inbox"
  | "chat";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  practice: "Practice",
  exams: "Exams",
  "mock-tests": "Mock Tests",
  "ai-coach": "AI Coach",
  "daily-quiz": "Daily Quiz",
  revision: "Smart Revision",
  partners: "Study Partners",
  groups: "Study Groups",
  timer: "Study Timer",
  "my-progress": "My Progress",
  bookmarks: "Bookmarks",
  inbox: "Inbox",
  chat: "Chat",
};

const PATH_MAP: { prefix: string; key: FeatureKey }[] = [
  { prefix: "/exams", key: "exams" },
  { prefix: "/mock-tests", key: "mock-tests" },
  { prefix: "/ai-coach", key: "ai-coach" },
  { prefix: "/revision", key: "revision" },
  { prefix: "/partners", key: "partners" },
  { prefix: "/groups", key: "groups" },
  { prefix: "/timer", key: "timer" },
  { prefix: "/my-progress", key: "my-progress" },
  { prefix: "/bookmarks", key: "bookmarks" },
  { prefix: "/inbox", key: "inbox" },
  { prefix: "/chat", key: "chat" },
];

export function featureForPath(pathname: string): FeatureKey | null {
  const hit = PATH_MAP.find(
    (m) => pathname === m.prefix || pathname.startsWith(m.prefix + "/"),
  );
  return hit ? hit.key : null;
}

const usedKey = (f: FeatureKey) => `ssc:free:${f}`;
const sessionKey = (f: FeatureKey) => `ssc:free-session:${f}`;

export function getUsedCount(feature: FeatureKey): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(localStorage.getItem(usedKey(feature)) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function remainingUses(feature: FeatureKey): number {
  return Math.max(0, FREE_LIMIT - getUsedCount(feature));
}

/**
 * Counts one use of a feature — at most once per browser session, so simple
 * navigation inside the same feature doesn't burn the free quota.
 */
export function consumeUse(feature: FeatureKey): number {
  if (typeof window === "undefined") return 0;
  try {
    if (sessionStorage.getItem(sessionKey(feature)) === "1") return getUsedCount(feature);
    sessionStorage.setItem(sessionKey(feature), "1");
    const next = getUsedCount(feature) + 1;
    localStorage.setItem(usedKey(feature), String(next));
    return next;
  } catch {
    return getUsedCount(feature);
  }
}
