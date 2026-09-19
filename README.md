# INZ Ecosystem

**Open-source indie platform** by [@fahnovinz](https://github.com/fahnovinz) — lightweight developer tools **and** a privacy-first flagship product.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-green.svg)](CHANGELOG.md)
[![CI](https://github.com/fahnovinz/inz-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/fahnovinz/inz-ecosystem/actions/workflows/ci.yml)
[![Flagship](https://img.shields.io/badge/flagship-VRAXTAL_VAULT-0ea5e9.svg)](https://github.com/fahnovinz/vraxtal-vault)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

```text
  INZ Ecosystem
  ├── Tools      inz stats · health · badges · products
  └── Product ★  VRAXTAL VAULT — self-hosted encrypted personal vault
```

> **Story in one line:** build better open-source habits with CLI tools, and ship real privacy software people can run — [docs/ecosystem.md](docs/ecosystem.md).

---

## Flagship product — VRAXTAL VAULT

| | |
|--|--|
| **What** | Self-hosted personal vault for **documents, photos, video** |
| **Why** | Your files, your VPS — encrypted at rest, not locked into a big-cloud silo |
| **How** | AES-256-GCM · scrypt key wrap · localhost-only app · Cloudflare Tunnel ready |
| **Repo** | **[fahnovinz/vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault)** |
| **License** | MIT |

```bash
git clone https://github.com/fahnovinz/vraxtal-vault.git
cd vraxtal-vault && npm ci && npm test
# production-minded: deploy scripts, SECURITY.md, systemd helpers
```

**Highlights**

- Master-password auth, session cookies, CSRF on mutating APIs  
- Password-wrapped **AES-256-GCM** file encryption  
- Drag-and-drop uploads, thumbnails, video preview, tags & pin  
- Binds to **`127.0.0.1` only** — put TLS/tunnel in front  
- Ubuntu VPS deploy + backup tooling  

Product card: [packages/vraxtal-vault](packages/vraxtal-vault/) · Demo (maintainer-private): [vault.vraxtal.site](https://vault.vraxtal.site)

---

## Developer tools

Zero runtime dependencies. Clone and run.

| Command | What it does |
|---------|--------------|
| `inz products` | Catalog of ecosystem products & tools (JSON-ready) |
| `inz stats` | Profile analytics — activity, PRs, portfolio breakdown |
| `inz health` | Repo health score — README, license, CI, freshness |
| `inz badges` | Generate shields.io badge markdown for any public repo |

### Quick start

**Node.js 18+**

```bash
git clone https://github.com/fahnovinz/inz-ecosystem.git
cd inz-ecosystem

node bin/inz.js products
node bin/inz.js stats fahnovinz
node bin/inz.js health fahnovinz/vraxtal-vault
node bin/inz.js badges fahnovinz/inz-ecosystem
```

**Windows (PowerShell)**

```powershell
.\scripts\github-stats.ps1 -Username fahnovinz
.\scripts\repo-health.ps1 -Repo fahnovinz/vraxtal-vault
```

**Score several repos at once** — handy for an org sweep:

```bash
node bin/inz.js health fahnovinz/vraxtal-vault fahnovinz/inz-ecosystem
# prints each report plus an average score
```

Failing checks come with a fix, not just a number:

```text
  Next steps
  → Add 3–8 topics in repo settings to make the project discoverable. (+10)
  → Add CONTRIBUTING.md describing how to run tests and open a PR. (+10)
```

**JSON** — pipe into your own tooling:

```bash
node bin/inz.js products --json
node bin/inz.js health fahnovinz/vraxtal-vault --json
```

### Options

| Flag | What |
|------|------|
| `--json` | Machine-readable output for every command |
| `--kind product\|tool` | Filter `inz products` |
| `--style <style>` | shields.io style for `inz badges` (default `flat-square`) |
| `--token <token>` | GitHub token — or set `GITHUB_TOKEN` |
| `--timeout <ms>` | Per-request timeout (default `15000`) |

Repo and user arguments accept `owner/repo`, `github.com/owner/repo`, a full URL, or a `git@` remote.
Set `GITHUB_API_URL` to point the CLI at a GitHub Enterprise host.

**Exit codes:** `0` success · `1` runtime error · `2` usage error — so `inz health "$repo" || handle $?` works in scripts.

### Tests & coverage

```bash
npm run lint             # dependency-free syntax gate over bin/ src/ test/ scripts/
npm test                 # node:test suite (mocked network, no live API)
npm run test:coverage    # c8 → text + lcov + html in coverage/
npm run verify           # lint + coverage, the same gate CI runs
.\scripts\verify.ps1     # Windows: the whole local CI mirror
```

Coverage thresholds (see `.c8rc.json`): **≥90%** lines / functions / statements, **≥85%** branches across `src/` **and** `bin/`.
CI runs the suite on Node **18, 20 and 22**, plus a dependency-audit job.

### Example — product catalog

```text
  INZ Ecosystem — Product Catalog

  ★ VRAXTAL VAULT  [flagship]
    Self-hosted encrypted personal vault for documents, photos, and video
    https://github.com/fahnovinz/vraxtal-vault

  • INZ Stats / Health / Badges
    GitHub analytics and README polish utilities
```

### GitHub token (optional)

```bash
export GITHUB_TOKEN=ghp_xxxx   # macOS/Linux
$env:GITHUB_TOKEN = "ghp_xxxx"  # Windows
```

---

## Why INZ? (portfolio / AI-event angle)

Most portfolios stop at toy demos. INZ is built to show **coherent shipping**:

| Pillar | What you see in the repos |
|--------|---------------------------|
| **Product vision** | Privacy-first self-hosting (Vault) + maintainer tooling |
| **Security craft** | Crypto, sessions, CSRF, SECURITY.md, secret hygiene |
| **Ops reality** | systemd, backups, tunnel edge, health checks |
| **AI-ready workflow** | Public code + docs shaped for agentic coding *with* human verification |

Deep dive: **[docs/ecosystem.md](docs/ecosystem.md)** — 30-second pitch, architecture diagram, talking points.

---

## Project layout

```text
inz-ecosystem/
├── bin/inz.js                 # CLI entry
├── src/                       # Core modules (stats, health, badges, products)
├── scripts/                   # lint.js + PowerShell (Windows-native)
├── packages/                  # Per-tool & product cards
│   ├── vraxtal-vault/         # Reference card only (code → vraxtal-vault repo)
│   ├── github-stats/
│   ├── repo-health/
│   └── badges/
├── docs/
│   ├── ecosystem.md           # Story for portfolios & AI events
│   └── getting-started.md
└── test/
```

## Roadmap

- [x] GitHub profile analytics  
- [x] Repository health scoring  
- [x] Badge markdown generator  
- [x] JSON output mode  
- [x] Product catalog (`inz products`) + VRAXTAL VAULT as flagship  
- [x] Batch health reports (`inz health a/b c/d`)  
- [ ] npm/PyPI registry stats  
- [ ] More VRAXTAL product surface (when ready)

See [CHANGELOG.md](CHANGELOG.md).

## Contributing

PRs welcome — docs, health checks, and platform support. Read [CONTRIBUTING.md](CONTRIBUTING.md).

**Good first issues:** improve health scoring, extend the product catalog, write more tests.

## Author

**Fahrezi Nova Inzaghi** ([@fahnovinz](https://github.com/fahnovinz)) — indie developer, Indonesia.

| | |
|--|--|
| Ecosystem | [inz-ecosystem](https://github.com/fahnovinz/inz-ecosystem) |
| Flagship | [vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault) |

## License

[MIT](LICENSE) — tools and product cards here; Vault code is MIT in its own repository.
