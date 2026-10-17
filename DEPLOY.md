# Deploying SSC Mentor AI

Hosting: **Cloudflare Workers** (free tier). Coding: **VS Code locally** (free).
Lovable is no longer used at runtime and can be cancelled.

Cloudflare's **Workers Builds** feature pulls the repo from GitHub, runs the
build, and publishes. You never run a deploy command by hand after the initial
setup — you edit code locally, push, and the site updates.

---

## 1. One-time setup

### 1.1 Create the GitHub repo

The local repo is already initialised and committed. Now:

1. Go to <https://github.com/new> → name it `ssc-mentor-ai` → **private** repo.
2. Back in this folder:

```
git remote add origin https://github.com/<your-username>/ssc-mentor-ai.git
git push -u origin main
```

> GitHub will ask for a username and a **Personal Access Token**, not your
> account password. If the push fails with `403` or `Authentication failed`,
> create one at <https://github.com/settings/tokens> with the `repo` scope and
> use it as the password.

### 1.2 Create the Cloudflare Worker and connect the repo

1. Sign up at <https://dash.cloudflare.com> (free, no card required).
2. **Workers & Pages** → **Create** → **Import a repository** (Workers Builds).
3. Authorise GitHub and pick `ssc-mentor-ai`.
4. Fill the build settings:

   | Setting | Value |
   |---|---|
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy --config wrangler.jsonc` |
   | Root directory | *(leave blank)* |
   | Node version | `22` |

5. Save, and let the first build run. It will fail at the very end — that is
   expected, because the secrets are not set yet. Continue.

### 1.3 Add build variables (public values)

Worker → **Settings** → **Environment variables** → **Add**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Take the values from your local `.env`. These are embedded into the browser
bundle at build time, which is why they are build variables and not secrets.

### 1.4 Add secrets (server-only values)

Same page, but mark each one **Secret** (or use the CLI below):

```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
FIREBASE_SERVICE_ACCOUNT
```

The CLI equivalent, run once from this folder:

```
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

> `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. Anyone holding it has
> full database access. It lives only in Cloudflare's encrypted store — never in
> the repo and never in a `VITE_`-prefixed variable.

### 1.5 Register the workers.dev subdomain

New Cloudflare accounts have no `workers.dev` subdomain yet, and `wrangler deploy`
will refuse to publish until one exists. This one-time step needs a browser:

<https://dash.cloudflare.com/ee4895a5387a1bcc0aae05ff4a9f6f52/workers/onboarding>

Pick any available subdomain (for example `prashantsingh`). Once registered, the
Worker is reachable at `https://ssc-mentor-ai.<subdomain>.workers.dev` and
`npm run deploy` works from then on.

### 1.6 Trigger a build and confirm

Push anything, or run `npm run deploy`. When it goes green, visit
`https://ssc-mentor-ai.<your-subdomain>.workers.dev`.

### 1.6 Point your domain at Cloudflare

The app already hardcodes `https://sscmentorai.online` in 53 places (canonical
tags, OG images, sitemap, `robots.txt`, the Razorpay callback base). You do not
need to change any code — just connect the domain to the Worker.

1. Cloudflare → **Add a site** → enter `sscmentorai.online` → pick the **Free**
   plan. Cloudflare will import any existing DNS records it finds.
2. Go to your **domain registrar** (GoDaddy / Namecheap / Hostinger / BigRock —
   wherever you bought it) and replace the nameservers with the two Cloudflare
   printed. This is a one-time change.
3. Back in Cloudflare: **Workers & Pages** → your Worker → **Settings** →
   **Domains & Routes** → **Add custom domain** → `sscmentorai.online`.
4. Repeat for `www.sscmentorai.online`, then set up the redirect so `www`
   forwards to the apex: **Rules** → **Redirect Rules** →
   *When* `http.host eq "www.sscmentorai.online"` → *Then* static redirect,
   status 301, target `https://sscmentorai.online`.
5. Confirm: **SSL/TLS** → **Overview** → set mode to **Full (strict)**.

DNS changes take up to 24 hours to propagate, but in practice it is a few
minutes. Until the nameservers switch, the Worker keeps serving on its
`*.workers.dev` address.

> If you would rather not move DNS yet, you can stop at step 3 and use the
> `*.workers.dev` URL. Everything works; only the branding differs. Moving DNS
> later is fine and does not require a redeploy.

### 1.7 Allow the domain in Supabase

Supabase → **Authentication** → **URL Configuration** → **Redirect URLs**, and
add:

```
https://sscmentorai.online/
https://www.sscmentorai.online/
```

Without this, Google sign-in redirects back to the login page in a loop.

---

## 2. Daily workflow

Open the folder in VS Code. That is the whole setup.

| I want to... | Do this |
|---|---|
| See my changes | `npm run dev`, open the printed localhost URL |
| Check for type errors | `npm run typecheck` |
| Go live | `git add -A` → `git commit` → `git push` |
| Live logs / debug a crash | `npm run cf:tail` |

`git push` triggers the Cloudflare build. It takes about 3–5 minutes, then the
site is updated. You can watch it under the Worker's **Deployments** tab.

From VS Code you can also run these without the terminal: press
<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> and pick *Dev (Vite)*, *Typecheck*,
*Build*, or *Deploy to Cloudflare*.

### Deploying by hand

Occasionally you may want to publish without waiting for CI:

```
npm run deploy
```

This builds and pushes straight to the Worker using the credentials from
`npx wrangler login`. Note this bypasses the GitHub history, so prefer
`git push` for anything you want to be able to roll back.

---

## 3. Local development

```
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm run dev
```

For local testing against the real Cloudflare runtime (closer to production than
`npm run dev`):

```
npm run build
npm run cf:dev
```

`wrangler dev` reads secrets from `.dev.vars`, not `.env`. Copy
`.dev.vars.example` to `.dev.vars` and fill it in. `.dev.vars` is gitignored.

---

## 3. Helper scripts

Diagnostics used while setting this up. All read-only unless noted; none are
part of the build.

```
node scripts/smoke.mjs              fetch every route, report status + latency
node scripts/page-inspect.mjs /     what a page actually rendered (SSR check)
node scripts/db-check.mjs           row counts per table via the publishable key
node scripts/db-sample.mjs          sample subjects, exams, latest blog posts
node scripts/bundle-size.mjs        largest files in the built Worker bundle
node scripts/find-domains.mjs       every hardcoded domain, for domain changes
node scripts/output-summary.mjs     static vs worker bundle split
```

`db-check.mjs` and `db-sample.mjs` need `SUPABASE_PUBLISHABLE_KEY` in `.env`.
Tables protected by RLS (`profiles`, `student_results`, `payment_orders`,
`subscriptions`) will report `0` unless `SUPABASE_SERVICE_ROLE_KEY` is set too.

---

## 4. Cancelling Lovable

Only after the Cloudflare deployment is confirmed working:

1. Confirm the site loads and Google sign-in works on the new domain.
2. Update the Razorpay / PhonePe webhook URLs in those dashboards to the new
   domain — payments will break otherwise.
3. Update the redirect URI in Supabase (Authentication → URL Configuration) and
   add the new domain.
4. Repoint your DNS registrar away from Lovable, if they were managing it.
5. Cancel the Lovable subscription.

---

## 5. Costs and limits

### Where the request quota actually goes

Measured on the current build:

| | Size | Billed? |
|---|---|---|
| Static assets (`.output/public`) | 232 files, 7.4 MB | **No** — served from Cloudflare's edge, free and unlimited |
| Worker bundle (`.output/server`) | 340 files, 12.9 MB | Runs only for HTML documents and API calls |

This split matters. The 100k requests/day quota is charged per **Worker
invocation**, not per byte. An image, a JS chunk or a font is served straight
from the edge and never wakes the Worker up, so heavy pages with many assets are
effectively cheaper than they look.

A single page view costs roughly:

```
1  Worker invocation   the HTML document
+ ~3–8 subrequests     the server functions and Supabase queries behind it
```

So the 100,000/day free allowance works out to roughly **12,000–30,000 page
views per day** — not 1,000. Realistically expect a few thousand daily active
users before you touch the limit, because not every visit is a fresh document
fetch (client-side navigation reuses the Worker already running).

Check your real usage at Cloudflare → your Worker → **Metrics**. When the graph
approaches the daily line, upgrade.

### Cost table

| Resource | Free tier | When you pay |
|---|---|---|
| Worker requests | 100,000 / day | $5/mo Workers Paid ≈ 10M requests/month included |
| Worker CPU time | 10 ms / invocation | 30 s on Paid |
| Bandwidth | **Unlimited** | never |
| Static assets | 20,000 files, 25 MB each | never |
| Supabase | 500 MB DB, 1 GB storage, 50k MAU | $25/mo Pro |
| Google Gemini | pay-as-you-go on your own key | scales with AI usage |

### When to upgrade to the $5/mo plan

Not on bundle size — Cloudflare removed the old 3 MB gzip limit in September
2026, and the limit is now 64 MiB uncompressed on every plan. The current
12.9 MB bundle is comfortable.

Upgrade when **either** of these becomes true:

- Cloudflare Metrics shows you approaching 100k requests on a single day
- CPU-heavy work (PDF parsing, bulk Gemini calls) starts hitting the 10 ms
  per-invocation limit, which surfaces as `1101` errors in the logs

Watch for those with `npm run cf:tail`.

### The one real scaling risk: CPU time

The free plan allows **10 ms of CPU per invocation**. A page that renders a full
question set server-side, or a request that calls Gemini synchronously, can
exceed that. The app already degrades gracefully — `src/lib/ai-status.ts` shows
an "AI offline" state when the Gemini quota is exhausted — but the CPU limit is
a hard cut-off, not a soft one.

If you start seeing `CPU time exceeded` errors, the fix is to move that work off
the request path: the Supabase Edge Functions (`supabase/functions/`) and
`pg_cron` already exist for exactly this, and `src/routes/api/public/hooks/` is
the pattern to copy.

---

## 6. Troubleshooting

**Build fails with `Reached heap limit`** — locally, `npm run build` already
re-execs Node with an 8 GB heap via `scripts/build.mjs`. If you invoke Vite
directly (`npx vite build`) you bypass that, so set the flag yourself.

**Google sign-in redirects back to the login page** — the redirect URL is not
allow-listed. Supabase → Authentication → URL Configuration → Redirect URLs,
add `https://your-domain/`.

**Site loads but every query fails** — the Supabase secrets are missing or the
`VITE_` values point at a different project than the secrets. Both halves must
refer to the same Supabase project.

**`AI offline` banner in the app** — the `GEMINI_API_KEY` quota is exhausted.
The app clears this automatically after 6 hours.
