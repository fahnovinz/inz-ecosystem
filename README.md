# INZ Ecosystem

Open-source developer toolkit by [@fahnovinz](https://github.com/fahnovinz). A growing collection of lightweight utilities for GitHub analytics, repo insights, and indie dev workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Vision

INZ Ecosystem is a modular toolkit for developers who ship fast and maintain clean open-source projects. Each tool is standalone, zero-dependency where possible, and built for real daily use.

## Tools

### `inz stats` — GitHub Profile Analytics

Inspect public GitHub activity: account overview, recent events, merged PRs, repo portfolio, and contributor metrics.

```powershell
# Windows
.\scripts\github-stats.ps1 -Username fahnovinz
```

```bash
# Node.js 18+
node bin/inz.js stats fahnovinz
```

Optional — higher API rate limits:

```powershell
$env:GITHUB_TOKEN = "ghp_xxxx"
.\scripts\github-stats.ps1 -Username fahnovinz
```

## Project Structure

```
inz-ecosystem/
├── bin/inz.js                 # CLI entry point
├── src/                       # Core modules
├── scripts/github-stats.ps1   # Windows-native analytics
├── packages/                  # Future standalone tools
└── .github/                   # CI + templates
```

## Roadmap

- [x] GitHub profile & repo analytics
- [ ] npm/PyPI package stats integration
- [ ] Repo health dashboard (CI, license, stale issues)
- [ ] INZ dotfiles & dev environment configs
- [ ] Plugin system for community extensions

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built and maintained by **Fahrezi Nova Inzaghi** ([@fahnovinz](https://github.com/fahnovinz)).

## License

MIT — see [LICENSE](LICENSE)