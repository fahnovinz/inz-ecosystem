# CI Setup

CI is defined in `.github/workflows/ci.yml` and runs on:

- `push` to `main`
- `pull_request` targeting `main`
- `workflow_dispatch` (manual)

Jobs: `node --test`, CLI smoke (`help` / `version` / `products --json`), and `node --check` on entrypoints.

## If Actions fails with no runner

A job that dies in a few seconds with **no runner assigned** is usually account config, not the test suite:

1. **Spending limit is $0** — set a small Actions limit at https://github.com/settings/billing (public repos still use free quota)
2. **Email not verified** — https://github.com/settings/emails
3. **First-time workflow approval** — open the Actions tab and approve

## Health check: “CI workflow detected”

`inz health` counts a repo as having CI if either:

1. GitHub Actions API reports `total_count > 0`, or  
2. Fallback: `.github/workflows/*.{yml,yaml}` exists in the tree  

So a valid workflow file still scores even when Actions is billing-limited or disabled for runs.

## Run tests locally

```bash
node --test test/*.test.js
node bin/inz.js help
node bin/inz.js products --json
```

Network modules (`github-api`, `github-stats`, `repo-health`) are unit-tested with an injectable mock `fetch` — no live GitHub calls in CI.
