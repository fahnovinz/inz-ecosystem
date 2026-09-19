# Getting Started

## Requirements

- **Node.js 18+** for the cross-platform CLI
- **PowerShell 5+** for Windows-native scripts (optional)
- **GitHub token** (optional, recommended for frequent use)

## Install

No build step. Clone and run:

```bash
git clone https://github.com/fahnovinz/inz-ecosystem.git
cd inz-ecosystem
```

Or add the CLI to your PATH:

```bash
# macOS/Linux — add to ~/.bashrc or ~/.zshrc
export PATH="$PATH:/path/to/inz-ecosystem/bin"
```

## Commands

### `inz products`

Lists the ecosystem catalog: **flagship product** (VRAXTAL VAULT) and CLI tools.

```bash
node bin/inz.js products
node bin/inz.js products --kind product
node bin/inz.js products --json
```

See also [ecosystem.md](ecosystem.md) for the portfolio / AI-event narrative.

### `inz stats <username>`

Pulls public data from the GitHub API:

- Account age, followers, bio
- Events in the last 90 days
- Merged PRs to third-party repos (12 months)
- Repository portfolio with language breakdown

```bash
node bin/inz.js stats octocat
node bin/inz.js stats fahnovinz --json > stats.json
```

### `inz health <owner/repo>`

Scores a repository out of 100 based on maintainer best practices:

| Check | Weight |
|-------|--------|
| Description set | 10 |
| README present | 15 |
| License declared | 15 |
| Topics configured | 10 |
| CI workflow | 15 |
| CONTRIBUTING guide | 10 |
| Issues enabled | 10 |
| Updated within 90 days | 15 |

```bash
node bin/inz.js health fahnovinz/inz-ecosystem

# several at once — each report, then an average
node bin/inz.js health fahnovinz/inz-ecosystem fahnovinz/vraxtal-vault
```

Failing checks print a concrete next step and the points it is worth:

```text
  Next steps
  → Add 3–8 topics in repo settings to make the project discoverable. (+10)
```

README detection also accepts lowercase or non-Markdown readmes, and a CONTRIBUTING
guide is found under `.github/` or `docs/` as well as the repo root.

### `inz badges <owner/repo>`

Outputs shields.io markdown you can paste into any README:

```bash
node bin/inz.js badges fahnovinz/inz-ecosystem
node bin/inz.js badges fahnovinz/inz-ecosystem --style for-the-badge
```

## Input formats

Every repo or user argument is normalised, so all of these work:

```bash
node bin/inz.js health fahnovinz/inz-ecosystem
node bin/inz.js health github.com/fahnovinz/inz-ecosystem
node bin/inz.js health https://github.com/fahnovinz/inz-ecosystem.git
node bin/inz.js stats @fahnovinz
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Runtime error (network, API, rate limit) |
| `2` | Usage error (unknown command or option, missing argument) |

```bash
node bin/inz.js health "$repo" --json > report.json || echo "failed with $?"
```

## Timeouts and retries

Requests time out after 15 seconds and retry transient failures (5xx, dropped
connections) twice with backoff. 4xx responses fail immediately — retrying a
404 never helps.

```bash
node bin/inz.js stats fahnovinz --timeout 30000
```

## GitHub Enterprise

Point the CLI at a self-hosted GitHub by setting the API base:

```bash
export GITHUB_API_URL="https://ghe.example.com/api/v3"
node bin/inz.js health myorg/internal-tool --token "$GHE_TOKEN"
```

## PowerShell scripts

Windows users can run tools without Node:

```powershell
.\scripts\github-stats.ps1 -Username fahnovinz
.\scripts\repo-health.ps1 -Repo fahnovinz/inz-ecosystem
```

## Rate limits

Without a token, GitHub allows 60 requests/hour per IP. With `GITHUB_TOKEN`, that jumps to 5,000/hour.
When the limit runs out, `inz` says so and tells you when it resets instead of printing a raw API error.

```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

Create a token at https://github.com/settings/tokens — `public_repo` scope is enough.

## Flagship product

VRAXTAL VAULT lives in a **separate repo** (keeps secrets/deploy boundaries clean):

```bash
git clone https://github.com/fahnovinz/vraxtal-vault.git
node bin/inz.js health fahnovinz/vraxtal-vault
```

## Contributing changes

```bash
npm run verify   # lint + tests + coverage thresholds — the same gate CI runs
```

## Next steps

- Read [ecosystem.md](ecosystem.md) for the product story
- Check `packages/` for per-module and product cards
- Open an issue if you want a new tool in the ecosystem
- Read [CONTRIBUTING.md](../CONTRIBUTING.md) to add a health check or CLI command