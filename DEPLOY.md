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

### 1.5 Trigger a build and confirm

Push anything (or hit **Retry deployment**). When it goes green, visit
`https://ssc-mentor-ai.<your-subdomain>.workers.dev`.

### 1.6 Point your domain at Cloudflare

If you already own `sscmentorai.online`:

1. Cloudflare → **Add a site** → enter the domain → pick the Free plan.
2. Update the nameservers at your registrar to the two Cloudflare gave you.
3. Worker → **Settings** → **Domains & Routes** → **Add** → `sscmentorai.online`.
4. Add `www` too, and set up the redirect (Rules → Redirect Rules).

DNS propagation takes up to 24 hours, usually minutes.

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

| Resource | Free tier | When you need to pay |
|---|---|---|
| Workers requests | 100,000 / day | $5/mo Workers Paid at roughly 10k+ daily active users |
| Workers CPU time | 10 ms / request (30 ms on Paid) | Paid plan |
| Bandwidth | **Unlimited** | never |
| Static assets | 20,000 files, 20 MB each | never |
| Supabase | 500 MB DB, 1 GB storage, 50k MAU | $25/mo Pro |
| Google Gemini | pay-as-you-go on your own key | scales with AI usage |

> **Bundle size warning.** The Worker bundle is currently ~2.6 MB gzipped and
> Cloudflare's free-plan limit is 3 MB. There is very little headroom — a large
> new dependency will fail the deploy. The main weight is Mermaid and KaTeX
> being pulled into the server bundle even though they only run in the browser.
> If a deploy fails on size, that is almost certainly why.

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
