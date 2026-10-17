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
   | Authorized redirect URIs | `https://ssc-mentor-ai.prashantsingh-240567.workers.dev/` |

   Note the **trailing slash** on the redirect URI. `redirect_uri_mismatch` is
   almost always this: the browser sends the slash, the registered value lacks
   it, and Google rejects the request as malformed rather than unauthorized.

   One entry is enough for the workers.dev host. Google matches the redirect URI
   Google Cloud registered against what the app sends — you do not need a
   separate entry per route.

5. Click **Create**. A popup shows two values:
   - **Client ID** — a long string ending in `.apps.googleusercontent.com`
   - **Client secret** — starts with `GOCSPX-`

Keep that popup open; you need both in the next step.

## If you later connect your own domain

Add it as a second origin and a second redirect URI rather than editing the
existing ones, so the workers.dev address keeps working:

```
Origin:      https://sscmentorai.online
Redirect:    https://sscmentorai.online/
```

## 2. Paste them into Supabase

1. Open <https://supabase.com/dashboard> → your project →
   **Authentication** → **Providers** → **Google**.
2. Enable the Google provider (toggle on).
3. Paste the **Client ID** and **Client secret**.
4. Leave the other Google settings alone. Do not fill "Skip nonce check".

## 3. Allow the redirect URLs

Still in Supabase → **Authentication** → **URL Configuration**:

**Site URL** — set to your real domain:
```
https://sscmentorai.online
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
| Authorized redirect URIs | Google Cloud console | The URL Google itself redirects to |
| Redirect URLs | Supabase → URL Configuration | Which hosts the browser may return to |

Both must permit the address you are signing in from. The Google list needs an
exact match; the Supabase list accepts wildcards.

## 4. Test it

Open `/login` on the live site, click **Continue with Google**, and confirm you
land back signed in as `prashant.singh.2405@gmail.com` — that address is the
admin, per `ADMIN_EMAIL` in `src/lib/auth.tsx`.

If Google still shows `redirect_uri_mismatch`, click **See error details** on
that page — Google prints the exact `redirect_uri` it received. Compare it
character by character against your Google Cloud entry; a trailing slash is the
usual culprit. If the URL it reports looks like a Supabase callback rather than
your own site, that is expected: the Google Cloud list only needs your domain,
because Supabase generates its own callback separately.

## A note on credentials

The client secret identifies your app to Google. It is safe in Supabase's
dashboard, which stores it encrypted. Never put it in `.env`, in `src/`, or in
any `VITE_`-prefixed variable — those ship to the browser. Supabase holds it
server-side and uses it to complete the token exchange.