/**
 * Server-only HMAC helpers used to prove that a request really comes from the
 * official Android/iOS app (and not from someone adding ?source=app by hand).
 */

const enc = new TextEncoder();

function secret(): string {
  const s = process.env["APP_ATTEST_SECRET"];
  if (!s) throw new Error("APP_ATTEST_SECRET is not configured");
  return s;
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Handshake token minted by the app: `<timestampMs>.<nonce>.<hmacHex>` */
export async function verifyHandshake(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ts, nonce, sig] = parts;
  const t = Number(ts);
  if (!Number.isFinite(t)) return false;
  // Token must be fresh (10 minutes) so a leaked URL cannot be reused forever.
  if (Math.abs(Date.now() - t) > 10 * 60 * 1000) return false;
  if (!nonce || nonce.length < 8 || nonce.length > 128) return false;
  return safeEqual(sig ?? "", await hmacHex(`app:${ts}.${nonce}`));
}

/** Only real mobile app WebViews may hold a pass — desktop browsers never qualify. */
export function isAppCapableUa(ua: string): boolean {
  if (!ua) return false;
  if (/Android|iPhone|iPad|iPod/i.test(ua) === false) return false;
  // Desktop-mode spoofing aside, a laptop browser UA never matches the above.
  return true;
}

/** Short, non-reversible tag binding a pass to the device/browser that got it. */
async function deviceTag(ua: string): Promise<string> {
  return (await hmacHex(`dev:${ua}`)).slice(0, 16);
}

/** Server-issued pass stored on the device: `<expiryMs>.<deviceTag>.<hmacHex>` */
export async function issuePass(ua: string, ttlMs = 30 * 24 * 60 * 60 * 1000): Promise<string> {
  const exp = Date.now() + ttlMs;
  const tag = await deviceTag(ua);
  return `${exp}.${tag}.${await hmacHex(`pass:${exp}:${tag}`)}`;
}

export async function verifyPass(pass: string, ua: string): Promise<boolean> {
  const parts = pass.split(".");
  // Legacy 2-part passes (not device-bound) are no longer accepted.
  if (parts.length !== 3) return false;
  const [exp, tag, sig] = parts;
  const e = Number(exp);
  if (!Number.isFinite(e) || Date.now() > e) return false;
  if (!isAppCapableUa(ua)) return false;
  if (!safeEqual(tag ?? "", await deviceTag(ua))) return false;
  return safeEqual(sig ?? "", await hmacHex(`pass:${exp}:${tag}`));
}

