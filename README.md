# Greenback Cash

Cannabis retail rewards platform - Next.js PWA + Supabase.

## Repo layout

```
apps/
  web/            Next.js 15 app (App Router) - storefront, rewards, ops console
packages/
  ui/             Shared React components
  types/          Shared TypeScript types (incl. Supabase-generated types once applied)
  config/         Shared ESLint + tsconfig base
supabase/
  migrations/     Versioned SQL migrations (source of truth for the DB schema)
  seed/           Local dev seed data
.github/
  workflows/      CI/CD pipeline
```

Package manager is **pnpm** via workspaces (see `pnpm-workspace.yaml`). The
`packages/*` split exists so shared UI/types are ready if a second app (e.g. a
standalone ops console, or a future service) joins the monorepo later - it costs
almost nothing today and saves an extraction later.

## Prerequisites

- Node 20.17.0 (`.nvmrc` - use `nvm use`)
- pnpm 9.9.0 (`corepack enable` will pick up the version pinned in `package.json`)
- Docker (for running Supabase locally - the Supabase CLI uses it under the hood)
- Supabase CLI (`brew install supabase/tap/supabase` or see supabase.com/docs/guides/cli)

## First-time setup

```bash
corepack enable
pnpm install

cp apps/web/.env.example apps/web/.env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY once local Supabase is up

# Local Supabase (applies supabase/migrations, then supabase/seed/seed.sql)
supabase start
supabase db reset
```

## Day-to-day commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the Next.js app locally (http://localhost:3000) |
| `pnpm lint` | ESLint across web + shared packages |
| `pnpm typecheck` | TypeScript project references, no emit |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Same, with coverage report (`apps/web/coverage`) |
| `pnpm e2e` | Playwright E2E - needs the app running or `E2E_BASE_URL` set |
| `pnpm format` | Prettier write across the repo |

## Where things stand

This is a foundation scaffold, not a finished app. What's real and working:

- The app boots, is installable as a PWA, and has a working example of the
  shared-package wiring (`packages/ui` -> `apps/web`).
- `lib/matching/matchLineItems.ts` is a real, unit-tested example of how business
  logic should be structured going forward: pure functions, no I/O, fully covered.
- `supabase/migrations` has a working initial schema with RLS enabled and an
  append-only ledger enforced at the DB level - **reconcile this against the
  finalized DDL from the architecture sessions before it ships to staging**, it was
  scaffolded to unblock local dev.

See `BRANCHING.md` for how to open PRs and what CI/branch protection expects, and
`CONTRIBUTING.md` for coding conventions.
