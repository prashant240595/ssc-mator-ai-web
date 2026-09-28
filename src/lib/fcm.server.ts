/**
 * Server-only Firebase Cloud Messaging (HTTP v1 API) sender.
 * Uses Web Crypto to sign a JWT from the service account, exchanges it for
 * an OAuth2 access token, then POSTs to fcm.googleapis.com.
 * Runs on Cloudflare Workers (no Node deps).
 */

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function b64urlEncode(input: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const sa = JSON.parse(raw) as ServiceAccount;
  // Handle escaped newlines
  if (sa.private_key.includes("\\n")) {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }
  return sa;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const sa = getServiceAccount();
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlEncode(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OAuth token error: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Send a push notification to a set of FCM tokens.
 * Bad/expired tokens are automatically removed from device_tokens.
 */
export async function sendPushToTokens(
  tokens: string[],
  message: PushMessage,
): Promise<{ sent: number; removed: number }> {
  if (tokens.length === 0) return { sent: 0, removed: 0 };
  const sa = getServiceAccount();
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const badTokens: string[] = [];
  let sent = 0;

  await Promise.all(
    tokens.map(async (token) => {
      const payload = {
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: {
            url: message.url || "/",
            title: message.title,
            body: message.body,
            ...(message.tag ? { tag: message.tag } : {}),
          },
          android: {
            priority: "HIGH" as const,
            notification: {
              channel_id: "ssc_mentor_default",
              click_action: "OPEN_APP_NOTIFICATION",
              ...(message.tag ? { tag: message.tag } : {}),
            },
            ...(message.tag ? { collapse_key: message.tag } : {}),
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: "default",
                "content-available": 1,
                ...(message.tag ? { "thread-id": message.tag } : {}),
              },
            },
          },
          webpush: {
            fcm_options: { link: message.url || "/" },
          },
        },
      };
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        sent++;
      } else {
        const errText = await r.text();
        if (
          r.status === 404 ||
          r.status === 400 ||
          errText.includes("UNREGISTERED") ||
          errText.includes("INVALID_ARGUMENT")
        ) {
          badTokens.push(token);
        }
        console.warn("[fcm] send failed", r.status, errText);
      }
    }),
  );

  // Clean up bad tokens
  if (badTokens.length) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("device_tokens").delete().in("token", badTokens);
    } catch (e) {
      console.warn("[fcm] token cleanup failed", e);
    }
  }

  return { sent, removed: badTokens.length };
}

/**
 * Fetch all device tokens for a set of user ids, then send.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  if (userIds.length === 0) return { sent: 0, removed: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("device_tokens")
    .select("token")
    .in("user_id", userIds);
  if (error) {
    console.warn("[fcm] token fetch failed", error.message);
    return { sent: 0, removed: 0 };
  }
  const tokens = (data ?? []).map((r) => r.token as string);
  return sendPushToTokens(tokens, message);
}
