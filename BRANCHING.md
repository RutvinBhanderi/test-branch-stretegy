# Branching & Release Strategy

Full rationale is in the TDD, section 3.2. This doc is the operational how-to.

## Branches

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Production. Always deployable. | PR only, 1+ approval, all checks green, no force-push |
| `staging` | Pre-prod / client UAT. | PR only, all checks green |
| `develop` | Integration branch for in-flight work. | PR only, checks green |
| `feature/*`, `fix/*` | Day-to-day work. | None - branch from `develop`, short-lived |
| `release/x.y.z` | Cut from `develop` for a staging/prod promotion. | PR only |

Promotion flow: `feature/*` → `develop` → `release/x.y.z` → `staging` → `main`.

## Setting up branch protection (one-time, repo admin)

Branch protection can't be committed as a file - it's a GitHub repo setting. Once the
repo exists on GitHub, run these with the [GitHub CLI](https://cli.github.com/)
(`gh auth login` first, needs admin on the repo):

```bash
REPO="your-org/greenback-cash"

for BRANCH in main staging; do
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/$REPO/branches/$BRANCH/protection" \
    -f "required_status_checks[strict]=true" \
    -f "required_status_checks[contexts][]=web / lint, typecheck, test" \
    -f "required_status_checks[contexts][]=SonarCloud quality gate" \
    -f "required_status_checks[contexts][]=Build" \
    -f "enforce_admins=true" \
    -f "required_pull_request_reviews[required_approving_review_count]=1" \
    -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
    -f "restrictions=null" \
    -f "allow_force_pushes=false" \
    -f "allow_deletions=false"
done

# develop: same idea, lighter review bar (0 required approvals is acceptable here)
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/develop/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=web / lint, typecheck, test" \
  -f "required_status_checks[contexts][]=SonarCloud quality gate" \
  -f "enforce_admins=false" \
  -f "restrictions=null" \
  -f "allow_force_pushes=false" \
  -f "allow_deletions=false"
```

The status check names above must exactly match the job `name:` fields in
`.github/workflows/ci.yml` - if a job name changes, update this list too, or the
required check will show as "expected" forever and block every PR.

## Required repo secrets/vars

Set at the repo or environment level (Settings → Secrets and variables → Actions):

| Name | Scope | Used by |
|---|---|---|
| `SONAR_TOKEN` | Repo | `ci.yml` quality-gate job |
| `NEXT_PUBLIC_SUPABASE_URL` | Repo | `ci.yml` build job |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Repo | `ci.yml` build job |
| `PREVIEW_URL` (var, not secret) | Repo | `ci.yml` E2E job |

Production-only secrets (service role key, wallet certs, payout keys) should go in a
GitHub **Environment** named `production` scoped to `main`, not repo-level, so a PR
from a fork can never read them - see TDD section 6.3.

## Vercel

`apps/web` deploys via Vercel's native GitHub integration (not a GitHub Actions
step) - connect the repo in the Vercel dashboard, set the root directory to
`apps/web`, and Vercel will auto-preview every PR and promote on merge to
`staging`/`main`. Vercel's own build still respects the required-status-checks gate
on the branch, so a failed quality gate blocks the merge that would trigger the
Vercel deploy in the first place.
