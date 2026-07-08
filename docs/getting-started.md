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
```

### `inz badges <owner/repo>`

Outputs shields.io markdown you can paste into any README:

```bash
node bin/inz.js badges fahnovinz/inz-ecosystem
```

## PowerShell scripts

Windows users can run tools without Node:

```powershell
.\scripts\github-stats.ps1 -Username fahnovinz
.\scripts\repo-health.ps1 -Repo fahnovinz/inz-ecosystem
```

## Rate limits

Without a token, GitHub allows 60 requests/hour per IP. With `GITHUB_TOKEN`, that jumps to 5,000/hour.

```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

Create a token at https://github.com/settings/tokens — `public_repo` scope is enough.

## Next steps

- Open an issue if you want a new tool in the ecosystem
- Check `packages/` for per-module documentation
- Read [CONTRIBUTING.md](../CONTRIBUTING.md) to add a health check or CLI command