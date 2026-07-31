# Changelog

All notable changes to INZ Ecosystem are documented here.

## [Unreleased]

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

### Note
- CI remains `workflow_dispatch` only until Actions billing is enabled on the account

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