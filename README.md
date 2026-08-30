# Greenback Cash

Cannabis retail rewards platform - Next.js PWA + Supabase.

## Repo layout

```
apps/
  web/            Next.js 15 app (App Router) - storefront, rewards
    app/          Routes, Route Handlers, Server Actions
    components/   React components
    lib/          Business logic, Supabase clients, domain types
supabase/
  migrations/     Versioned SQL migrations (source of truth for the DB schema)
  seed/           Local dev seed data
.github/
  workflows/      CI/CD pipeline
```

Package manager is **pnpm** via workspaces (see `pnpm-workspace.yaml`), which
currently tracks `apps/*` only.

There is deliberately **no `packages/` directory yet**. Components, domain types,
lint config and tsconfig all live inside `apps/web`, because `apps/web` is the only
thing that consumes any of them - Supabase included, which is used from the Next.js
app only. A shared layer with a single consumer is indirection, not reuse: it costs
a `package.json`, a tsconfig, a lint config, a `transpilePackages` entry, a Sonar
source root and a CI filter, and buys nothing the `@/*` path alias doesn't.

`packages/` returns when something genuinely has two consumers - a contracts
package shared by this app and a second service, say. That is the bar. Until then,
don't add a package without a second real consumer.

`supabase/` stays at the repo root on purpose - it is the system of record, not the
web app's private data layer, and the Supabase CLI discovers `config.toml` by
walking up from the repo root.

## Prerequisites

- Node 22.21.1 (`.nvmrc` - use `nvm use`)
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
| `pnpm lint` | ESLint across the web app |
| `pnpm typecheck` | TypeScript project references, no emit |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Same, with coverage report (`apps/web/coverage`) |
| `pnpm e2e` | Playwright E2E - needs the app running or `E2E_BASE_URL` set |
| `pnpm format` | Prettier write across the repo |

## Where things stand

This is a foundation scaffold, not a finished app. What's real and working:

- The app boots and is installable as a PWA.
- **Onboarding is the reference implementation** - age gate → phone → verify →
  profile → consent. Read `ARCHITECTURE.md` §9 for the guided tour, starting at
  `apps/web/app/(auth)/onboarding/page.tsx`. `lib/onboarding/rules.ts` shows how
  business logic should be structured: pure functions, no I/O, fully covered.
- `supabase/migrations` has exactly the two tables the slice uses - `accounts` and
  `consents` - with RLS enabled on both and owner-scoped select policies. Add one
  migration per domain as you build it; never edit one that has been applied.

Read **`ARCHITECTURE.md`** before writing code - sections 4-9 cover which layer
your change belongs in, which Supabase client to use, and how the layers are
tested. See `BRANCHING.md` for how to open PRs and what CI/branch protection
expects, and `CONTRIBUTING.md` for coding conventions.
