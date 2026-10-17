# Setting up Google Sign-In

The app calls `supabase.auth.signInWithOAuth` in `src/lib/auth.tsx`, which sends
the browser to Google and back through Supabase. Google must trust three URLs.
None of this needs a paid service.

## Current live URL

```
https://ssc-mentor-ai.prashantsingh-240567.workers.dev
```

Once you connect the domain, also allow `https://sscmentorai.online`.

---

## 1. Create the OAuth client

1. Open <https://console.cloud.google.com/apis/credentials>
2. If asked, create or pick a project. Any name works, e.g. `SSC Mentor AI`.
3. At the top of the page set the project, then click **Create credentials** →
   **OAuth client ID**.
4. Fill the form:

   | Field | Value |
   |---|---|
   | Application type | **Web application** |
   | Name | `SSC Mentor AI` |
   | Authorized JavaScript origins | `https://ssc-mentor-ai.prashantsingh-240567.workers.dev` |
   | Authorized redirect URIs | `https://djvywlfkwtakkbagksgh.supabase.co/auth/v1/callback` |

   **The redirect URI is Supabase's callback, not your site's URL.** This is the
   single most common mistake. Supabase owns the token exchange with Google: the
   browser goes to Google, Google sends the code back to Supabase's endpoint, and
   only then does Supabase forward the session to your site. So Google never
   sees your domain in `redirect_uri` — it sees Supabase's.

   Trace it yourself with:
   ```
   node scripts/oauth-trace.mjs
   ```
   The `redirect_uri=` value it prints is exactly what belongs in the form.

   The trailing slash matters: register the callback with a trailing slash to
   match the URL the browser sends.

   Your own domain belongs in **Authorized JavaScript origins**, not in the
   redirect list.

5. Click **Create**. A popup shows two values:
   - **Client ID** — a long string ending in `.apps.googleusercontent.com`
   - **Client secret** — starts with `GOCSPX-`

Keep that popup open; you need both in the next step.

## If you later connect your own domain

Add it as a second **JavaScript origin** — not a second redirect URI. The
redirect URI stays Supabase's callback regardless of which domain the user signs
in from.

```
Origins:  https://ssc-mentor-ai.prashantsingh-240567.workers.dev
          https://sscmentorai.online
```

## 2. Paste them into Supabase

1. Open <https://supabase.com/dashboard> → your project →
   **Authentication** → **Providers** → **Google**.
2. Enable the Google provider (toggle on).
3. Paste the **Client ID** and **Client secret**.
4. Leave the other Google settings alone. Do not fill "Skip nonce check".

## 3. Allow the redirect URLs

Still in Supabase → **Authentication** → **URL Configuration**:

**Site URL** — set to the address you are actually signing in from. Until the
domain is connected, that is the workers.dev URL:
```
https://ssc-mentor-ai.prashantsingh-240567.workers.dev
```

**Redirect URLs** — add each of these:
```
https://ssc-mentor-ai.prashantsingh-240567.workers.dev/**
https://sscmentorai.online/**
http://localhost:8080/**
```

This is the Supabase-side allow-list, and it is separate from the Google Cloud
list. Supabase sends the browser to Google with its own callback URL, and
accepts the browser's return trip only for hosts on this list. The `/**`
wildcard allows any path beneath each host.

## Which list needs what

This trips people up, so to be explicit:

| List | Where | What it validates |
|---|---|---|
| Authorized redirect URIs | Google Cloud console | Supabase's callback — `https://<project-ref>.supabase.co/auth/v1/callback` |
| Authorized JavaScript origins | Google Cloud console | Your own domain, where the app lives |
| Redirect URLs | Supabase → URL Configuration | Which hosts the browser may return to |

The Google redirect list does **not** contain your site. The Supabase list does.

## 4. Test it

Open `/login` on the live site, click **Continue with Google**, and confirm you
land back signed in as `prashant.singh.2405@gmail.com` — that address is the
admin, per `ADMIN_EMAIL` in `src/lib/auth.tsx`.

If Google still shows `redirect_uri_mismatch`, run:
```
node scripts/oauth-trace.mjs
```
It prints the exact `redirect_uri` your project sends. Register that string in
Google Cloud verbatim — trailing slash included.

## A note on credentials

The client secret identifies your app to Google. It is safe in Supabase's
dashboard, which stores it encrypted. Never put it in `.env`, in `src/`, or in
any `VITE_`-prefixed variable — those ship to the browser. Supabase holds it
server-side and uses it to complete the token exchange.