# INZ Ecosystem Packages

Each tool in the ecosystem lives here as a documented module. The root CLI (`bin/inz.js`) orchestrates them today; standalone npm packages may split out later.

| Package | Command | Status |
|---------|---------|--------|
| [github-stats](github-stats/) | `inz stats` | Stable |
| [repo-health](repo-health/) | `inz health` | Stable |
| [badges](badges/) | `inz badges` | Stable |

## Adding a new package

1. Create `packages/your-tool/README.md`
2. Add module in `src/your-tool.js`
3. Wire command in `bin/inz.js`
4. Add tests in `test/`
5. Update root README and CHANGELOG