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
   | Authorized redirect URIs | `https://ssc-mentor-ai.prashantsingh-240567.workers.dev` |

5. Click **Create**. A popup shows two values:
   - **Client ID** — a long string ending in `.apps.googleusercontent.com`
   - **Client secret** — starts with `GOCSPX-`

Keep that popup open; you need both in the next step.

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
https://localhost:8080/**
```

The `/**` suffix lets any path under each host come back through the callback.
While testing locally that is what makes `npm run dev` work too.

## 4. Test it

Open `/login` on the live site, click **Continue with Google**, and confirm you
land back signed in as `prashant.singh.2405@gmail.com` — that address is the
admin, per `ADMIN_EMAIL` in `src/lib/auth.tsx`.

If Google shows `redirect_uri_mismatch`, the exact URL you typed in step 1 does
not match what the browser sent. Copy the URL from the error message and add it
to both lists above.

## A note on credentials

The client secret identifies your app to Google. It is safe in Supabase's
dashboard, which stores it encrypted. Never put it in `.env`, in `src/`, or in
any `VITE_`-prefixed variable — those ship to the browser. Supabase holds it
server-side and uses it to complete the token exchange.