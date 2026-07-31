# INZ Ecosystem Packages

Documented modules and product cards. The root CLI (`bin/inz.js`) orchestrates tools; **products** may live in separate repositories and are catalogued here.

| Package | Kind | Command / link | Status |
|---------|------|----------------|--------|
| [vraxtal-vault](vraxtal-vault/) | **Product card** (README only — code lives in [vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault)) | [github.com/fahnovinz/vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault) | Flagship |
| [github-stats](github-stats/) | Tool | `inz stats` | Stable |
| [repo-health](repo-health/) | Tool | `inz health` | Stable |
| [badges](badges/) | Tool | `inz badges` | Stable |

Catalog from CLI:

```bash
node ../bin/inz.js products
node ../bin/inz.js products --kind product --json
```

## Adding a new package

1. Create `packages/your-tool/README.md`
2. Add module in `src/your-tool.js` (or a product card if the code lives elsewhere)
3. Register in `src/products.js` when it is part of the public catalog
4. Wire command in `bin/inz.js` if needed
5. Add tests in `test/`
6. Update root README, `docs/ecosystem.md`, and CHANGELOG