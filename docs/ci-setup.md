# CI Setup

Workflow: `.github/workflows/ci.yml`

| Trigger | Status |
|---------|--------|
| `push` → `main` | Enabled |
| `pull_request` → `main` | Enabled |
| `workflow_dispatch` | Enabled |

Jobs (when a runner starts): `node --test`, CLI smoke (`help` / `version` / `products --json`), `node --check` on entrypoints.

## Current account blocker (2026-07)

If the Actions tab shows a red X in ~3–5 seconds with **empty steps**, open the job annotations. You may see:

> **The job was not started because your account is locked due to a billing issue.**

That is **not a test failure**. GitHub never assigned a runner (`runner_id: 0`).

### Unlock Actions

1. https://github.com/settings/billing — clear any failed payment / locked state  
2. Set a **GitHub Actions spending limit** (even $1 is enough for public free quota)  
3. Verify email: https://github.com/settings/emails  
4. Re-run: Actions → CI → **Re-run failed jobs**, or push a tiny commit  

Until unlocked, the workflow file still exists and `inz health` still scores **CI workflow detected** (Actions API + filesystem fallback).

## Health check: “CI workflow detected”

`inz health` counts CI if either:

1. Actions API `total_count > 0`, or  
2. Fallback: any `.github/workflows/*.{yml,yaml}` in the tree  

So a valid workflow still scores when runs are blocked by billing.

## Run the same checks locally

```bash
npm ci
npm test
npm run test:coverage   # c8: text + coverage/lcov.info + coverage/index.html
node bin/inz.js help
node bin/inz.js version
node bin/inz.js products --json
```

PowerShell helper:

```powershell
.\scripts\verify.ps1
```

Network modules use injectable mock `fetch` in unit tests — no live GitHub calls required in CI.

Open HTML report: `coverage/index.html` after `npm run test:coverage`.
