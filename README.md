# INZ Ecosystem

Modular developer toolkit for GitHub analytics, repository health checks, and indie dev workflows.

Built by [@fahnovinz](https://github.com/fahnovinz) (Fahrezi Nova Inzaghi).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/fahnovinz/inz-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/fahnovinz/inz-ecosystem/actions/workflows/ci.yml)

## Why INZ?

Most dev tools are either too heavy or too narrow. INZ Ecosystem sits in the middle — small, focused utilities you can run from terminal or script, with zero runtime dependencies.

Everything is MIT-licensed and designed to be forked, extended, or plugged into your own workflow.

## Tools

| Command | What it does |
|---------|--------------|
| `inz stats` | Profile analytics — activity, PRs, portfolio breakdown |
| `inz health` | Repo health score — README, license, CI, freshness |
| `inz badges` | Generate shields.io badge markdown for any public repo |

### Quick start

**Node.js 18+**

```bash
git clone https://github.com/fahnovinz/inz-ecosystem.git
cd inz-ecosystem

node bin/inz.js stats fahnovinz
node bin/inz.js health fahnovinz/inz-ecosystem
node bin/inz.js badges fahnovinz/inz-ecosystem
```

**Windows (PowerShell)**

```powershell
.\scripts\github-stats.ps1 -Username fahnovinz
.\scripts\repo-health.ps1 -Repo fahnovinz/inz-ecosystem
```

**JSON output** — pipe into your own tooling:

```bash
node bin/inz.js health fahnovinz/inz-ecosystem --json
```

### Example output

```
  INZ Repo Health — fahnovinz/inz-ecosystem

  Score   85/100 (Good)
  URL     https://github.com/fahnovinz/inz-ecosystem

  Checks
  ✓ Repository description
  ✓ README present
  ✓ License declared
  ...
```

### GitHub token (optional)

Unauthenticated requests work but hit rate limits faster. Set a token for heavier usage:

```bash
export GITHUB_TOKEN=ghp_xxxx   # macOS/Linux
$env:GITHUB_TOKEN = "ghp_xxxx"  # Windows
```

## Project layout

```
inz-ecosystem/
├── bin/inz.js              # CLI entry
├── src/                    # Core modules
├── scripts/                # PowerShell scripts (Windows-native)
├── packages/               # Per-tool docs & future splits
├── docs/                   # Guides
└── test/                   # Lightweight tests
```

## Roadmap

- [x] GitHub profile analytics
- [x] Repository health scoring
- [x] Badge markdown generator
- [x] JSON output mode
- [ ] npm/PyPI registry stats
- [ ] Batch health reports for orgs
- [ ] INZ dotfiles collection

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Contributing

PRs welcome — especially docs, new health checks, and platform support. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

**Good first issues:** improve health scoring, add repo comparison, write more tests.

## Author

**Fahrezi Nova Inzaghi** — indie developer building open tools for the community.

- GitHub: [@fahnovinz](https://github.com/fahnovinz)
- Project: [inz-ecosystem](https://github.com/fahnovinz/inz-ecosystem)

## License

[MIT](LICENSE)