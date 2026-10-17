# Project memory — SSC Mentor AI

## Hosting
Migrated off Lovable (paid) to **Cloudflare Workers** on 2026-10-17.
- `wrangler.jsonc` is the deploy config; Nitro builds to `.output/{public,server}`
- `npm run build` uses `scripts/build.mjs` (re-execs Node with an 8 GB heap; the
  Nitro bundling step OOMs on Node's default ~2 GB heap)
- GitHub push → Cloudflare Workers Builds auto-deploys
- Build was NOT verified against real `workerd` — local `wrangler dev` crashes on
  this machine with a Windows access violation (outdated VC++ redistributable)

## Supabase
Project ref is **`djvywlfkwtakkbagksgh`** (Postgres 17, region ap-northeast-2).
Linked locally via `npx supabase link`. All 51 migrations in
`supabase/migrations/` were pushed on 2026-10-17, giving 27 tables and 17
functions. Every table is empty — the user will re-upload questions.

The old ref `fjpmohfovknezctoqdew` that Lovable had written into `.env` no longer
exists — that project was deleted, so its 8,368 questions and 124 blog posts are
unrecoverable.

Keys live in `.env` (gitignored): `SUPABASE_PUBLISHABLE_KEY` for the browser,
`SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` for the server. Never commit
them. `supabase/.temp/` is gitignored — it holds machine-specific CLI state.

To inspect the schema later:
```
npx supabase migration list
node scripts/schema-state.mjs djvywlfkwtakkbagksgh <service_role_jwt>
```

## Auth
Google sign-in was rewired from `@lovable.dev/cloud-auth-js` (a Lovable-hosted
OAuth proxy) to `supabase.auth.signInWithOAuth` in `src/lib/auth.tsx`. The
`src/integrations/lovable/` directory and the `cloud-auth-js` dependency were
deleted. The Supabase Google provider must be enabled with the new domain added
to the redirect URL list, or sign-in loops.

## Corrections made to my own earlier claims
- I said the Worker bundle would fail to deploy over a 3 MB gzip limit. Wrong:
  Cloudflare removed the compressed limit in Sept 2026; the limit is 64 MiB
  uncompressed on all plans. The 12.9 MB bundle is fine.
- I gave a 3 MB/10 MB gzip limit table in DEPLOY.md before verifying it. Fixed.

## Known rough edges (pre-existing, not introduced here)
- `npm run lint` reports ~2,300 errors, almost entirely prettier formatting plus
  `no-explicit-any`. The repo has never been formatted. Do not run `--fix` across
  the whole repo casually — it will produce a huge diff.
- Admin is hardcoded by email (`prashant.singh.2405@gmail.com`) in `src/lib/auth.tsx`
  and in RLS policies. Any Google-authenticated user with that address is admin.
- Mermaid, KaTeX, Cytoscape, Recharts and pdf-lib all land in the *server* bundle
  though they only run in the browser. Optional trim, ~12.9 MB → ~4-5 MB.