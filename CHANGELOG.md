# Changelog

All notable changes to INZ Ecosystem are documented here.

## [Unreleased]

### Added
- **VRAX Spend Tracking** (`packages/vrax-spend-tracking/`) — static daily spend tracker built as a mobile app shell: app bar, three swipeable tabs (Beranda / Riwayat / Catatan) on a snap pager, floating add button, and bottom-sheet forms. Time-aware greeting with an editable name, today's budget bar, hemat/boros tally, 3-month / 6-month / 1-year spend map, monthly budget progress, and a day-grouped transaction log. Dependency-free, data kept in `localStorage`, light + dark themes, safe-area aware
- `vrax-spend-tracking` registered in the product catalog (`inz products`)
- `test/vrax-spend-tracking.test.js` guards the web app in CI: the script compiles, every id it reads exists in the markup, ids are unique, labels point at real controls, no markup is built from strings, dates are stepped by the calendar, and every CSS token used is declared on bare `:root`
- `parseUsername` in `src/utils.js`, with `parseRepo` tightened to reject extra path segments, query strings and malformed logins

### Fixed
- **Unvalidated input reached the GitHub API path.** `fetchRepoBadges`, `fetchRepoHealth` and `fetchGitHubStats` interpolated their arguments straight into request paths, so `owner/repo?per_page=1` reshaped the URL — in `fetchRepoHealth` the injected `?` swallowed every sub-path, silently hitting the wrong endpoint — and `fetchRepoBadges("justowner")` requested `/repos/justowner/undefined`. All three validate at the library boundary now, not only in the CLI
- **The CLI read flags as positional arguments.** `inz stats --json` fetched a user literally named `--json`, and `inz badges --token X owner/repo` treated `--token` as the repo. Positional lookup now skips flags and their values, a flag missing its value is an error, and `main()` catches so an unexpected rejection reports cleanly
- **The spend map broke in DST timezones.** Stepping a day as `+86400000ms` lands on the wrong date when a day runs 23 or 25 hours; the map repeated one date and skipped the next. Dates are walked by the calendar now — verified with zero duplicates in Asia/Jakarta, America/New_York and Australia/Lord_Howe
- A failed `localStorage` write was swallowed, so data could silently stop saving; the app now says so on screen
- Defensive reads in `github-stats` for events without a timestamp, anonymous contributors and repos with no star count

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