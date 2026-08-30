# Branching & Release Strategy

Full rationale is in the TDD, section 3.2. This doc is the operational how-to.

## Branches

| Branch | Purpose | Lifetime | Cut from |
|---|---|---|---|
| `main` | Production. Always deployable. | Permanent | - |
| `staging` | Pre-prod / client UAT. | Permanent | - |
| `develop` | Integration branch for in-flight work. | Permanent | - |
| `feature/*` | New work. | Short-lived | `develop` |
| `fix/*` | Ordinary bug fix, ships with the next release. | Short-lived | `develop` |
| `release/x.y.z` | A frozen candidate promoted to staging then production. | Per release | `develop` |
| `hotfix/x.y.z` | Production emergency only. | Per incident | `main` |

```
                        ┌── feature/* ──┐
                        │               ↓
  develop ──────────────┴──────────────────────────────────────────
     │                                    ↑ back-merge
     └── release/1.1.0 ──┬──→ staging     │   (UAT fixes)
                         │                │
                         └──→ main  ──────┘
                              │
                              └── tag v1.1.0
```

`staging` and `main` are **both fed from the release branch**. `staging` is never
merged into `main` - it is a disposable environment branch that accumulates demo
merges and debug tweaks over time, and none of that belongs in production. Promoting
the release branch to `main` ships exactly the ref that passed UAT.

## Merge methods

One rule, and it matters:

| Moving from | Into | Method |
|---|---|---|
| `feature/*`, `fix/*` | `develop` | **Squash** |
| `fix/*` | `release/x.y.z` | **Squash** |
| `release/*`, `hotfix/*` | `staging`, `main`, `develop` | **Merge commit** |

Squashing a long-lived branch into another long-lived branch creates a commit that
shares no ancestry with the source. Git's merge base for the *next* promotion is then
still the point where the two branches last diverged, so every subsequent promotion PR
tries to re-apply the whole previous release on top of content that already has it -
conflicts on every file, on every release, forever. Merge commits keep the ancestry
intact and the problem never arises.

This is why `Require linear history` is **off** on `main`, `staging` and `develop`, and
why `Merge commit` is an allowed merge method on all three.

## Repository rulesets (one-time, repo admin)

Configured under **Settings → Rules → Rulesets**. Three rulesets cover everything.
Rulesets stack: if a branch matches two, it gets the union and the stricter value wins.

- `release-branches` - targets `main` and `staging`
- `integration-branch` - targets `develop`
- `version-tags` - targets tag pattern `v*`

| Rule | `main` + `staging` | `develop` |
|---|---|---|
| Restrict creations | off | off |
| Restrict updates | **off** | **off** |
| Restrict deletions | on | on |
| Require linear history | off | off |
| Require deployments to succeed | off | off |
| Require signed commits | on | on |
| Require a pull request before merging | on | on |
| → Required approvals | 1 | 1 |
| → Dismiss stale approvals | on | on |
| → Require review from specific teams | off | off |
| → Require review from Code Owners | off *(see below)* | off |
| → Approval of most recent reviewable push | on | off |
| → Require conversation resolution | on | on |
| → Copilot unattributed approval | off | off |
| → Allowed merge methods | Squash + Merge commit | Squash + Merge commit |
| Require status checks to pass | on | on |
| → `web / lint, typecheck, test` | required | required |
| → `Build` | required | required |
| → Require branches to be up to date | on | off |
| Block force pushes | on | on |
| Require code scanning results | off | off |
| Require code quality results | off | off |
| Restrict code coverage | off | off |

`version-tags` needs only three: **Restrict creations off** (you have to be able to cut
a tag), **Restrict updates on**, **Restrict deletions on**. A published tag can then
never be moved or deleted, which is what makes `v1.1.0` mean something.

### Notes on specific rules

**`Restrict updates` must stay off on branches.** Merging a PR is an update to the
target ref, so enabling it blocks every merge for anyone not on the bypass list. It is
a tag rule, not a branch rule.

**`Require approval of the most recent reviewable push`** is stricter than
dismiss-stale. Dismiss-stale forces re-approval after any new push; this rule
additionally requires the approval come from someone other than whoever pushed last. It
stops a reviewer pushing a fix into someone else's PR and then approving their own
code. On `develop` the friction outweighs the benefit.

**`Require branches to be up to date`** is off on `develop` because every merge would
invalidate every other open PR and re-run the full `web-checks → quality-gate → build`
chain. On `main` and `staging`, where merges are rare and deliberate, it is free.

**`Require signed commits`** mostly catches direct pushes, which the PR rule already
blocks - squash and merge commits created in the GitHub UI are signed by GitHub's own
key. Keep it on anyway; it is also why `Rebase merge` is not an allowed method, since a
rebase replays your original commits and unsigned ones would be rejected.

**Code Owners is off for now.** `.github/CODEOWNERS` currently names a single owner for
`*`, which would deadlock that person's own PRs - GitHub does not let an author satisfy
their own code-owner review - and auto-requests them on every change. Trim it to the
security-sensitive paths with at least two owners each before turning the rule on.

**Status check names must exactly match the job `name:` fields in
`.github/workflows/ci.yml`.** If a job name changes, update the ruleset too, or the
required check shows as "Expected" forever and blocks every PR. The ruleset picker also
only lists checks GitHub has actually seen run, so open one PR into `develop` before
creating the ruleset and let CI report once.

**Bypass lists are empty.** See [Break-glass](#break-glass) below.

## Daily flow: feature → develop

```bash
git checkout develop && git pull
git checkout -b feature/receipt-capture
# ... work ...
git commit -m "feat(receipts): add capture screen"
git push -u origin feature/receipt-capture
gh pr create --base develop --fill
```

`feature/*` and `fix/*` have no ruleset - force-push, rebase and amend freely while the
branch is yours. On the PR: three checks, a Vercel preview, one approval, all
conversations resolved. Then **Squash and merge** and delete the branch.

GitHub uses the **PR title** as the squash commit message. The husky `commit-msg` hook
lints local commits via commitlint, but nothing lints PR titles - keep them
conventional (`feat(scope): ...`) or `develop` ends up with non-conforming history.

Merging to `develop` triggers CI again, and this run includes the Playwright E2E job
(TDD section 4.1 - E2E runs on merges into `develop`/`staging`, not on every PR).

## Release flow

### 1. Cut the release

```bash
git checkout develop && git pull
git checkout -b release/1.1.0
git push -u origin release/1.1.0
```

`develop` is now free to carry on with 1.2.0 work. The release branch is frozen except
for UAT fixes.

### 2. Promote to staging for UAT

```bash
gh pr create --base staging --head release/1.1.0 --title "chore: promote 1.1.0 to staging"
```

Merge commit. The push to `staging` runs E2E and deploys to the staging Vercel
environment for client sign-off.

### 3. UAT bugs

Fixes go on the **release branch** - never on `staging`, never on `develop`.

```bash
git checkout release/1.1.0 && git pull
git checkout -b fix/1.1.0-payout-rounding
# ... fix ...
git push -u origin fix/1.1.0-payout-rounding
gh pr create --base release/1.1.0 --fill
```

Then re-promote to `staging` and re-test. Repeat until UAT is clean.

Why not fix on `staging`: `main` is fed from the release branch, so a fix committed to
`staging` would never reach production - you would ship the bug with a green UAT
sign-off behind it.

Why not fix on `develop`: by now `develop` contains 1.2.0 work, and merging it into the
release would drag unfinished features into a build the client already signed off on.

The version stays **1.1.0**. UAT bugs are caught pre-release, so nothing is patched -
1.1.0 simply never reached production until it was correct.

### 4. Ship and tag

```bash
gh pr create --base main --head release/1.1.0 --title "chore: release 1.1.0"
# after merge:
git checkout main && git pull
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin v1.1.0
```

### 5. Back-merge, then delete the release branch

Required whenever UAT fixes were made:

```bash
gh pr create --base develop --head release/1.1.0 --title "chore: back-merge 1.1.0 fixes"
```

Merge commit. Skip this and the next release silently reintroduces every bug you just
fixed.

This does **not** overwrite the 1.2.0 work already on `develop`. Git merges the changes
each side made since the common ancestor, not whole snapshots - files the release
branch never touched contribute nothing. To see exactly what a back-merge would change
before opening the PR:

```bash
git checkout develop && git pull
git merge --no-commit --no-ff release/1.1.0
git diff --cached --stat
git merge --abort
```

A conflict only arises if both sides changed the same lines, in which case a human
decides whether the fix still applies to the refactored code.

## Hotfix flow

For a bug **already in production** that cannot wait for the next release: money moving
wrong, data leaking, a security hole, or the app down. Everything else is a `fix/*`
branch off `develop` that ships with the next release.

Cut from `main`, because `develop` contains unshipped work.

```bash
git checkout main && git pull
git checkout -b hotfix/1.1.1-double-charge
# ... fix ...
git push -u origin hotfix/1.1.1-double-charge

gh pr create --base staging --head hotfix/1.1.1-double-charge --fill   # verify
gh pr create --base main   --head hotfix/1.1.1-double-charge --fill    # ship
```

Same two-target pattern as a release: both fed from the hotfix branch, never
`staging → main`.

Route through `staging` first when you can afford the ten minutes. E2E only runs on
pushes to `develop` and `staging`, so a hotfix that goes straight to `main` ships on
unit tests, Sonar and a build with no browser coverage at all. If production is actively
bleeding, go direct and accept that.

Then tag and fan out to **every** live line:

```bash
git checkout main && git pull
git tag -a v1.1.1 -m "Hotfix 1.1.1" && git push origin v1.1.1

gh pr create --base develop --head hotfix/1.1.1-double-charge --fill
gh pr create --base staging --head hotfix/1.1.1-double-charge --fill   # if skipped earlier
```

If a `release/*` branch is open in UAT at the time, **merge the hotfix into it too**.
Merging that release into `main` later will not silently revert the fix - git keeps
main's side of the change - but until you do, the client is signing off on a build that
does not contain it.

## Versioning

| Situation | Version |
|---|---|
| New features from `develop` | minor bump - `1.1.0` → `1.2.0` |
| Bug found during UAT, before release | no bump - still `1.1.0` |
| Bug found in production | patch bump - `1.1.0` → `1.1.1` |

Tags are created on `main` only, after the merge, and are immutable under the
`version-tags` ruleset.

## Break-glass

Bypass lists are empty on all rulesets. During a production incident that means a
hotfix to `main` still needs three green checks plus an approval from someone other
than the pusher.

With three people that is usually fine. If an incident ever stalls on it, the fix is to
add the repo admin as a bypass actor on `release-branches` - but note that bypass is
per-ruleset and all-or-nothing: it lifts *every* rule for that actor, not just
approvals. Every use is logged under **Settings → Rules → Rule insights**, so the
discipline is to bypass, ship, then open a retro PR for the review that did not happen.

## Team responsibilities

| Who | Works in | Merges to |
|---|---|---|
| Junior | `feature/*`, `fix/*` | `develop` only |
| Lead / architect | all | `develop`, `release/*`, `staging`, `main`, tags |

Release cuts, promotion PRs, tags and hotfixes stay with the lead and architect. The
approval rules enforce this in practice: nobody can approve their own PR, and on
`main`/`staging` nobody can approve a PR they were the last to push to.

## Required repo secrets/vars

Set at the repo or environment level (Settings → Secrets and variables → Actions):

| Name | Scope | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Repo | `ci.yml` build job |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Repo | `ci.yml` build job |
| `PREVIEW_URL` (var, not secret) | Repo | `ci.yml` E2E job |
| `SONAR_TOKEN` | Repo | not yet - see Known gaps |

`SUPABASE_SERVICE_ROLE_KEY` is deliberately **not** a CI secret. The build needs
the variable to exist - `next build` evaluates page modules, and
`lib/config/serverEnv.ts` validates at module load - but it never connects, so
`ci.yml` passes a literal placeholder. The real key belongs in the runtime
environment (Vercel), not in every workflow run.

A missing secret is worth catching early. If the build job's Supabase variables are
absent, `Build` fails and the required check blocks every PR with no obvious cause.

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

## Known gaps

- **SonarCloud is not wired up.** The `quality-gate` job has been removed from
  `ci.yml` until a SonarCloud organization exists; `Build` currently runs straight off
  `web-checks`. The restore checklist is in the comment above the `build` job, and
  `sonar-project.properties` is kept in the repo ready for it. Until then there are two
  required status checks, not three.
- **PR titles are unlinted.** The husky hook covers local commits; squash merges take
  the PR title instead. A commitlint step on `pull_request` titles would close this.
- **CODEOWNERS is a single-owner catch-all.** Trim to security-sensitive paths with two
  owners each, then enable `Require review from Code Owners` on `release-branches`.
