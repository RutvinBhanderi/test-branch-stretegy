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
- pnpm 9.9.0 (`corepack enable` picks up the version pinned in `package.json`)
- **Docker, running.** The Supabase CLI starts Postgres, Auth, Storage and the
  rest as containers.

The Supabase CLI itself is a devDependency, so `pnpm install` brings it - there is
nothing to install globally.

## First-time setup

```bash
corepack enable
pnpm install

pnpm db:start     # first run pulls several GB of images
```

`db:start` prints an API URL, an anon key and a service_role key. Copy those three
into `apps/web/.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| `.env.local` | value from `pnpm db:start` |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | API URL (`http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role key` |

`pnpm db:status` reprints them at any time. Then apply the schema and run it:

```bash
pnpm db:reset     # applies supabase/migrations, then supabase/seed/seed.sql
pnpm dev
```

### Signing in locally

Onboarding is phone-OTP based, and no SMS is sent locally. `supabase/config.toml`
defines a fixed test number and code under `[auth.sms.test_otp]`:

| Phone - type it with the `+` | Code |
|---|---|
| `+14155550123` | `123456` |

Add more pairs there if you need several accounts. Without this you cannot get
past step 2 of onboarding, since every later step needs a session.

### Using a hosted Supabase project instead

A free project on supabase.com works too, and gives you the exact values Vercel
will need later. Create it, then from **Settings -> API** copy the Project URL,
`anon` key and `service_role` key into `apps/web/.env.local`, and apply the
schema:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
pnpm db:push          # applies supabase/migrations to the remote database
```

Two warnings.

**`db:push` is not `db:reset`.** `pnpm db:reset` only ever touches the local
stack. The remote equivalent, `supabase db reset --linked`, **wipes the hosted
database** - never run it against anything you care about.

**Phone OTP needs an SMS provider on a hosted project.** The `[auth.sms.test_otp]`
block in `config.toml` is honoured by the local stack; whether a hosted project
picks it up depends on `supabase config push` being accepted for that setting. If
it is not, you need Twilio credentials in the Supabase dashboard, or you keep the
local stack for anything that involves signing in.

The pragmatic split: local stack for day-to-day work (free, instant, test OTP
works), hosted project as the target for Vercel preview deployments.

## Day-to-day commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the Next.js app locally (http://localhost:3000) |
| `pnpm lint` | ESLint across the web app |
| `pnpm typecheck` | TypeScript project references, no emit |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Same, with coverage report (`apps/web/coverage`) |
| `pnpm e2e` | Playwright E2E - needs the app running or `E2E_BASE_URL` set |
| `pnpm db:start` / `db:stop` | Start / stop the local Supabase stack |
| `pnpm db:reset` | Re-apply all migrations and seed - wipes local data |
| `pnpm db:status` | Print the local URLs and keys |
| `pnpm db:push` | Apply migrations to the linked remote database |
| `pnpm format` | Prettier write across the repo |

## Deployment

Hosted on Vercel, Root Directory `apps/web`, production branch `main`. Full setup -
project settings, the three required environment variables, branch-to-environment
mapping and how migrations are applied - is in **`DEPLOYMENT.md`**.

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
