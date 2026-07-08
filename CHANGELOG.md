# Changelog

All notable changes to INZ Ecosystem are documented here.

## [Unreleased]

### Changed
- CI now runs on `workflow_dispatch` only (stops failure emails on accounts without Actions billing)

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