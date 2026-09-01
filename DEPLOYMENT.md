# Deployment (Vercel)

The repo is a pnpm workspace with a single deployable app, `apps/web`. Vercel
deploys that one directory; `supabase/` is schema source-of-truth and is applied
separately with the Supabase CLI, never by Vercel.

## 1. Create the project

Import `RutvinBhanderi/test-branch-stretegy` from the Vercel dashboard
(**Add New → Project → Import Git Repository**), then set:

| Setting                                                | Value                                               |
| ------------------------------------------------------ | --------------------------------------------------- |
| **Root Directory**                                     | `apps/web`                                          |
| **Include source files outside of the Root Directory** | **On**                                              |
| Framework Preset                                       | Next.js (auto-detected from `apps/web/vercel.json`) |
| Build / Install / Output commands                      | leave on **Override: off**                          |

Root Directory is the only setting that matters here, and the checkbox under it is
the one people miss. With it off, Vercel copies only `apps/web` into the build
container - `pnpm-lock.yaml`, `pnpm-workspace.yaml` and the root `package.json` all
live one level up, so the install fails. With it on, Vercel sees the workspace root,
runs `pnpm install` there, then `pnpm build` inside `apps/web`.

### Nothing goes at the repo root

`vercel.json` lives in `apps/web`, not the git root. Vercel resolves it relative to
the **configured Root Directory** - a `vercel.json` at the repo root is ignored
silently, with no warning in the build log. Don't add one.

The root already carries everything Vercel needs from a workspace: `pnpm-workspace.yaml`,
`pnpm-lock.yaml` (`lockfileVersion: 9.0`, which is what selects pnpm 9 in the build
container) and `packageManager: pnpm@9.9.0`. The monorepo handling is the Root Directory
setting plus the checkbox above it - a dashboard setting, not a file.

A root-level `vercel.json` would only be right under the opposite layout: Root Directory
left at the git root, with explicit `buildCommand` and `outputDirectory` pointing into
`apps/web`. That earns its keep once there are several deployable apps. With one, it is
more moving parts for the same result.

Node 22 comes from `engines.node` in `apps/web/package.json`. Don't set it in the
dashboard as well - two sources that can disagree.

## 2. Environment variables

Set these under **Settings → Environment Variables**. All three are read at module
load (`lib/config/env.ts`, `lib/config/serverEnv.ts`), so a missing one fails
`next build` with `Failed to collect page data for <page>` - the real reason is in
the `[cause]` line underneath. Which environments to set them for is section 3.

| Variable                        | Where it comes from                            | Scope           |
| ------------------------------- | ---------------------------------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Settings → API → Project URL        | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` key         | client + server |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Settings → API → `service_role` key | **server only** |

The two `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so
changing either one requires a **redeploy**, not just a restart. `SUPABASE_SERVICE_ROLE_KEY`
bypasses RLS - it must never gain a `NEXT_PUBLIC_` prefix, and Preview and Production
must point at different Supabase projects so a preview branch can never write to
production data.

The optional wallet/payout keys in `.env.example` (`APPLE_*`, `GOOGLE_WALLET_*`,
`PAYOUT_PROVIDER_API_KEY`) are `.optional()` in `serverEnv.ts`. Add them to Vercel as
each integration ships, and make them required in the schema at the same time so a
misconfigured deploy fails at boot rather than mid-payout.

## 3. Branches

Vercel has three environment _types_, not one per branch. Exactly one branch binds to
Production; every other branch is Preview, and by default all of them share a single
set of Preview variables.

That default is wrong for this repo. `BRANCHING.md` makes `staging` the client UAT
branch, and it must not share a Supabase project with whatever `feature/*` work is
mid-flight. The fix is a **branch-scoped override**: when adding a variable, pick
Preview and then fill in the optional _Branch_ field. A variable scoped to a branch
wins over the general Preview value for that branch alone.

| Branch                          | Vercel environment     | Supabase project |
| ------------------------------- | ---------------------- | ---------------- |
| `main`                          | Production             | production       |
| `staging`                       | Preview, branch-scoped | UAT              |
| `develop`, `feature/*`, `fix/*` | Preview (general)      | dev              |

So each of the three variables in section 2 is entered three times: once for
Production, once for Preview scoped to `staging`, once for Preview with the Branch
field left blank.

The Production Branch needs no setup: Vercel takes the repo's default branch at import
time, which is `main` here. Confirm it under Settings → Git and move on. Note it is a
one-time snapshot - if the default branch on GitHub ever changes, Vercel keeps what it
recorded at import.

Two alternatives, if branch-scoped overrides read as too implicit. **Custom
Environments** (Pro plan) give `staging` a first-class named environment with its own
variable set - same result, clearer UI. A **second Vercel project** whose Production
Branch is `staging` gives full isolation, at the cost of maintaining the same config
in two places. Neither is worth it for one app.

Pin a stable domain to the UAT branch under Settings → Domains - add
`staging.<domain>` and assign it to the `staging` branch. That is also what the CI
E2E job's `vars.PREVIEW_URL` should point at; a per-commit preview URL changes every
push and cannot be put in a repository variable.

## 4. Database

Vercel does not run migrations. After a deploy that needs a schema change:

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm db:push
```

Push the migration **before** the code that depends on it reaches Production, or the
first request after the deploy hits a table that isn't there. Never run
`supabase db reset --linked` against a hosted project - it wipes the database.

## 5. What is already correct

- Every route is `ƒ` (server-rendered on demand), so the build never talks to
  Supabase. Placeholder env values are enough to compile - which is exactly what
  `.github/workflows/ci.yml` does for its build job.
- `middleware.ts` refreshes the Supabase session cookie and runs on the Edge runtime
  by default. Its matcher already excludes `sw.js` and `workbox-*.js`, so the PWA
  service worker is served untouched.
- `next-pwa` writes `public/sw.js` during the build; it is gitignored and regenerated
  on every deploy.

## Optional: skip builds that can't change the app

A push touching only `supabase/` or docs still triggers a full build. To skip those,
set **Settings → Git → Ignored Build Step** to:

```bash
git diff --quiet HEAD^ HEAD -- apps/web pnpm-lock.yaml package.json
```

Exit 0 (nothing relevant changed) skips the build; exit 1 proceeds. Leave it unset
until build minutes are actually a concern - it is one more thing that can wrongly
skip a deploy.
