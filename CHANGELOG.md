# Changelog

All notable changes to INZ Ecosystem are documented here.

## [Unreleased]

## [0.4.0] — 2026-09-19

### Added
- **Retries with backoff** on 5xx and network errors, plus a per-request timeout (`--timeout`, default 15s)
- **Actionable health remedies** — every failing check now carries a concrete next step, printed under "Next steps"
- **Multi-repo health**: `inz health owner/a owner/b` scores several repos and prints an average
- `GITHUB_API_URL` support for GitHub Enterprise hosts
- `--style` flag for `inz badges` (any shields.io style)
- `parseUser()` username validation and repo/user inputs that accept full GitHub URLs or `git@` remotes
- `npm run lint` — dependency-free syntax gate over every tracked JS file (`scripts/lint.js`)
- `npm run verify` — lint + coverage in one command
- CI matrix across Node 18/20/22, an npm cache, a dependency-audit job, and `.github/dependabot.yml`
- Test suites for the CLI (`test/cli.test.js`), API resilience, detection fallbacks, and report sections — 68 tests total

### Changed
- `GitHubApiError` carries `status` / `rateLimited`, and rate-limit, 401, 403 and 404 responses now explain what to do instead of echoing the raw body
- **Top repos are ranked by stars** instead of last-update time, and the collaborator signal is finally printed
- `inz` exits **2** for usage errors and **1** for runtime failures, so scripts can tell them apart
- README detection falls back to GitHub's `/readme` endpoint (any casing/extension); CONTRIBUTING is also looked up under `.github/` and `docs/`
- `bin/inz.js` is importable — it only drives the process when run as a command
- Coverage thresholds raised to 90% lines/functions/statements and 85% branches, now including `bin/`
- CI and `scripts/verify.ps1` discover files to syntax-check instead of carrying a hand-maintained list

### Fixed
- Search queries are URL-encoded, so unusual usernames no longer corrupt the request
- `daysAgo()` / `oneYearAgo()` compute in **UTC**, matching GitHub timestamps instead of the local clock
- A missing or malformed `pushed_at` no longer throws while scoring freshness
- `require`-time crash removed: `fetch` is resolved lazily with a clear "Node.js 18+" message
- Unhandled promise rejections from the CLI entry point
- `EPIPE` when piping CLI output into `head` and friends

## [0.3.2] — 2026-07-31

### Added
- Deep **fetchGitHubStats** full-flow E2E tests (events window, private/fork filter, contributor ranking, language map, PR zero-path, profile errors)
- Helper unit tests: `countMergedPrs`, `countRecentEvents`, `analyzeRepos`
- **c8** coverage (`npm run test:coverage`) with thresholds (lines/functions/statements 80%, branches 70%)
- CI runs coverage + uploads `coverage/lcov.info` artifact
- `scripts/verify.ps1` runs c8 locally

### Changed
- Version 0.3.2; export stats helpers for focused tests

## [0.3.1] — 2026-07-31

### Fixed
- **CI workflow triggers** on `push` / `pull_request` to `main` (plus manual dispatch)
- **CI health check** falls back to listing `.github/workflows/*.{yml,yaml}` when the Actions API is blocked/empty
- Product card copy: `packages/vraxtal-vault/` is explicitly a **reference card**, not source code

### Added
- Unit tests with injectable mock `fetch`: `github-api`, `github-stats`, `repo-health` (18 tests total)
- `scoreFromContext` export for pure health scoring tests
- `setFetch` / `resetFetch` on `github-api` for test isolation
- CI steps: `products --json`, syntax-check `src/products.js`
- `scripts/verify.ps1` — local mirror of the GitHub Actions job
- Docs: billing-lock annotation + unlock steps in `docs/ci-setup.md`

### Note
- If GitHub shows *account locked due to a billing issue*, runners never start — fix billing at github.com/settings/billing. Workflow file + health score still count as CI present.

## [0.3.0] — 2026-07-31

### Added
- **VRAXTAL VAULT** as flagship product of the ecosystem (product card + catalog)
- `inz products` / `inz catalog` — list tools and products (`--kind`, `--json`)
- `docs/ecosystem.md` — architecture story for portfolios and AI events
- `packages/vraxtal-vault/README.md` product card linking to the app repo
- Tests for the product catalog

### Changed
- README reframed as platform: tools **+** flagship product
- Version bump to 0.3.0; keywords include `vraxtal-vault`, privacy, self-hosted
- Packages index lists product vs tool kinds

## [0.2.0] — 2026-07-08

### Added
- `inz health` — repository health scoring (8 checks, 100-point scale)
- `inz badges` — shields.io badge markdown generator
- `--json` output flag for all commands
- PowerShell `repo-health.ps1` script
- Getting started guide (`docs/getting-started.md`)
- Lightweight test suite (`test/`)
- Per-package READMEs in `packages/`

### Changed
- Improved CLI help and output formatting
- Added language breakdown to profile stats
- Updated README with examples and CI badge

## [0.1.0] — 2026-07-08

### Added
- Initial release as INZ Ecosystem
- `inz stats` — GitHub profile analytics
- PowerShell `github-stats.ps1` script
- MIT license, CI workflow, issue templates