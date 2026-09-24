# Changelog

All notable changes to INZ Ecosystem are documented here.

## [Unreleased]

### Added
- **VRAX World** (`packages/vrax-world`): a miniature 3D city sandbox. People, traffic, weather, the river and light share one simulation; commands in English or Bahasa Indonesia are parsed locally by a rule-based interpreter
- Bridges, river level and flooding, fires with fire trucks, a bank robbery and police chase, festivals with fireworks, blackouts, rush hour, parking-to-park, seasons and a day cycle
- Whole-world undo from state snapshots, a guided showcase, landmark labels, an inspector for people, vehicles and buildings, and an EN/ID interface
- `inz world` command and `npm run world` (zero-dependency static server bound to 127.0.0.1, `src/world-server.js`)
- VRAX World in the product catalog; `inz products` now lists non-flagship products under “Products”
- Tests: interpreter (EN/ID), headless simulation scenarios, static server
- Residents drawn as articulated low-poly figures (walking arms and legs, hair, hijab, peci, kids) in one instanced draw call
- Drivers stop for pedestrians on zebra crossings; the inspector says why a vehicle is waiting

### Fixed
- Gridlock in VRAX World traffic: cars at right angles or side by side no longer wait on each other forever, and long-stuck drivers edge through junction knots

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