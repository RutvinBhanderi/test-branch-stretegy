# Contributing

## Commit messages

Conventional Commits, enforced by a commit-msg hook (commitlint):

```
feat(web): add receipt upload flow
fix(ocr-service): handle empty line-item arrays
chore(ci): bump playwright version
```

Types in use: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `ci`.

## Before opening a PR

1. `pnpm lint && pnpm typecheck && pnpm test:coverage` - all green locally before
   pushing saves a CI round trip.
2. Fill in the PR template - the checklist isn't decorative, CI checks most of it too.
3. Keep PRs scoped to one thing.

## Where new code goes

- **Business logic that decides "what happens"** (matching, points calculation,
  ledger operations) → `apps/web/lib/`, pure functions with no I/O where possible.
  This is what the 90% coverage bar applies to - write the test alongside the logic,
  not after.
- **Anything that touches the DB directly** → Route Handlers or Server Actions in
  `apps/web/app/`, using `lib/supabase/server.ts`. Never call Supabase with the
  service role from client components.
- **Shared types** → `packages/types/src`. If Supabase codegen would produce it,
  don't hand-write it long-term - see the note in `packages/types/src/index.ts`.
- **Shared UI** → `packages/ui/src`, only once a component is actually used in two+
  places. Don't pre-abstract.

## Testing expectations

- New business logic needs unit tests in the same PR, not a follow-up.
- E2E (Playwright) is reserved for the handful of critical journeys (auth, receipt
  upload → points credited, wallet pass issuance) - don't add E2E coverage for
  things a unit test already covers faster and more reliably.
- If coverage drops below the thresholds in `apps/web/vitest.config.ts` or
  `apps/ocr-service/pyproject.toml`, the CI quality-gate job will fail the build -
  this is intentional, not a bug to work around.

## Database changes

- Every schema change is a new file in `supabase/migrations/`, never an edit to an
  existing migration that's already been applied anywhere.
- Any table holding customer data needs RLS enabled and a policy in the same
  migration - don't ship a table without one, even if it "will just use the service
  role for now."
