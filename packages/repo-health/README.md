# repo-health

Score any public repository against maintainer best practices.

## Scoring

100-point scale across 8 checks — description, README, license, topics, CI, contributing guide, issues, and recency.

## CLI

```bash
node ../../bin/inz.js health <owner/repo>
node ../../bin/inz.js health <owner/repo> --json
```

## PowerShell

```powershell
../../scripts/repo-health.ps1 -Repo <owner/repo>
```