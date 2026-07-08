# Contributing to INZ Ecosystem

Thanks for helping grow the ecosystem!

## Quick start

```bash
git clone https://github.com/fahnovinz/inz-ecosystem.git
cd inz-ecosystem

node bin/inz.js stats YOUR_USERNAME
node bin/inz.js health fahnovinz/inz-ecosystem
node --test test/*.test.js
```

## What to work on

- **New health checks** — add to `src/repo-health.js` with tests
- **Badge types** — extend `src/badges.js`
- **CLI improvements** — better output, new flags, error messages
- **Docs** — fix typos, add examples, translate guides
- **Platform support** — bash scripts, fish completions, etc.

## Pull request guidelines

1. One feature or fix per PR
2. Run tests: `node --test test/*.test.js`
3. Update CHANGELOG.md under `[Unreleased]` or the current version
4. Keep zero runtime dependencies

## Code style

- Small, focused modules in `src/`
- Use existing patterns (`github-api.js`, `utils.js`)
- Prefer readable code over clever abstractions

## Community

Be respectful. We follow the [Contributor Covenant](CODE_OF_CONDUCT.md).