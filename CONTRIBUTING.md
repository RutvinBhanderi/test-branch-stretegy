# Contributing

## Commit messages

Conventional Commits, enforced by a commit-msg hook (commitlint):

```
feat(onboarding): add age gate step
fix(auth): handle expired OTP codes
chore(ci): bump playwright version
```

Types in use: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `ci`.

## Before opening a PR

1. `pnpm lint && pnpm typecheck && pnpm test:coverage` - all green locally before
   pushing saves a CI round trip.
2. Fill in the PR template - the checklist isn't decorative, CI checks most of it too.
3. Keep PRs scoped to one thing.

## Where new code goes

**`ARCHITECTURE.md` §5-§10 is the full answer** - which layer, which Supabase
client, how it's validated and tested. The short version:

- **Business logic that decides "what happens"** (eligibility, step transitions,
  pricing) → a **pure function** in `apps/web/lib/<domain>/`, no I/O. This
  is what the 90% coverage bar applies to - write the test alongside the logic, not
  after.
- **Fetching the data that logic runs on** → `lib/<domain>/queries.ts`, which does
  touch Supabase and is *not* pure. That is by design: I/O is confined to
  `queries.ts` and `service.ts` so the deciding stays testable. Keep those files
  thin - if one grows an `if` about business meaning, that `if` belongs in a pure
  function. See `ARCHITECTURE.md` §5.
- **Writes** → Server Actions by default, Route Handlers for external callers. Both
  must use `lib/supabase/admin.ts`; the schema has no customer-facing INSERT/UPDATE
  policies, so writes through the anon client are rejected by RLS. The admin client
  bypasses RLS, so scope every query by account in code - see `ARCHITECTURE.md` §6.
- **Reads on behalf of a user** → `lib/supabase/server.ts`, where RLS scopes the
  result for you.
- **Domain types** → `lib/<domain>/types.ts`, owned by the domain they describe.
  Generated Supabase types are different: they go in
  `lib/supabase/database.types.ts` and never leave `queries.ts`.
- **React components** → `apps/web/components/`. Props in, no fetching.
- There is no `packages/` directory yet, and this is deliberate - see the repo
  layout note in `README.md`. Don't pre-abstract.

## Testing expectations

- New business logic needs unit tests in the same PR, not a follow-up.
- E2E (Playwright) is reserved for the handful of critical journeys - auth and
  the onboarding flow end to end. Do not add E2E coverage for
  things a unit test already covers faster and more reliably.
- If coverage drops below the thresholds in `apps/web/vitest.config.ts`,
  the CI checks will fail the build -
  this is intentional, not a bug to work around.

## Database changes

- Every schema change is a new file in `supabase/migrations/`, never an edit to an
  existing migration that's already been applied anywhere.
- Any table holding customer data needs RLS enabled and a policy in the same
  migration - don't ship a table without one, even if it "will just use the service
  role for now."
