# Contributing to INZ Ecosystem

Thanks for helping grow the ecosystem!

## Quick start

```bash
git clone https://github.com/fahnovinz/inz-ecosystem.git
cd inz-ecosystem
npm ci                  # only dev dependencies — the CLI itself has none

node bin/inz.js stats YOUR_USERNAME
node bin/inz.js health fahnovinz/inz-ecosystem
npm run verify          # lint + tests + coverage, the same gate CI runs
```

Tests never touch the network: `setFetch()` from `src/github-api.js` injects a mock,
and `test/helpers/mock-fetch.js` routes responses by path. Always reset it in
`afterEach()` so suites stay isolated.

## What to work on

- **New health checks** — add to `src/repo-health.js` with tests
- **Badge types** — extend `src/badges.js`
- **CLI improvements** — better output, new flags, error messages
- **Docs** — fix typos, add examples, translate guides
- **Platform support** — bash scripts, fish completions, etc.

## Pull request guidelines

1. One feature or fix per PR
2. Run `npm run verify` — it must pass, including the coverage thresholds in `.c8rc.json`
3. Add tests for the behaviour you changed; mock the network, never call the live API
4. Update CHANGELOG.md under `[Unreleased]` or the current version
5. Keep zero runtime dependencies — dev dependencies only
6. CI runs on Node 18, 20 and 22, so avoid APIs newer than Node 18

## Code style

- Small, focused modules in `src/`; `bin/inz.js` only parses arguments and dispatches
- Route every HTTP call through `githubFetch` so timeouts, retries and error
  messages stay consistent
- Validate user input with `parseRepo` / `parseUser` before it reaches a URL
- Comment the *why*, not the *what* — the code already says what it does
- Prefer readable code over clever abstractions

## Community

Be respectful. We follow the [Contributor Covenant](CODE_OF_CONDUCT.md).