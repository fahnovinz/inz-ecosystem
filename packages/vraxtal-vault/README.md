# VRAXTAL VAULT

**Flagship product of the [INZ Ecosystem](https://github.com/fahnovinz/inz-ecosystem).**

Self-hosted encrypted personal vault for documents, photos, and videos — privacy-first, production-shaped, MIT-licensed.

| | |
|--|--|
| **Repo** | [fahnovinz/vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault) |
| **Status** | Flagship product |
| **License** | MIT |
| **Stack** | Node.js · Express · AES-256-GCM · SQLite · Cloudflare Tunnel |

## Why it belongs in INZ

INZ is not only CLI utilities. The ecosystem ships **real products** that indie developers can run, audit, and learn from.

VRAXTAL VAULT is the production product line:

- **Security-minded** — AES-256-GCM at rest, scrypt-wrapped data keys, bcrypt master password, CSRF on mutating APIs
- **Ops-complete** — systemd unit, deploy scripts, backup helpers, loopback-only bind
- **Open by design** — no secrets in git, SECURITY.md, tests, clear self-host docs

## Quick links

```bash
# Clone the product (separate repo)
git clone https://github.com/fahnovinz/vraxtal-vault.git
cd vraxtal-vault
npm ci
npm test

# List it from the ecosystem CLI
node ../../bin/inz.js products
node ../../bin/inz.js health fahnovinz/vraxtal-vault
```

## For AI events & portfolios

Use this product as a reference for:

1. **Privacy in the AI era** — personal files stay on *your* VPS, not a third-party cloud by default
2. **AI-assisted shipping** — architecture, docs, security review, and release hygiene with human verification
3. **Full-stack craft** — auth, crypto, UI, deploy, and maintenance in one open-source system

Maintainer demo (private instance, not a shared sandbox): https://vault.vraxtal.site

## Source of truth

All application code lives in **[vraxtal-vault](https://github.com/fahnovinz/vraxtal-vault)**.  
This folder documents the product *as part of* the INZ catalog — it is not a code mirror.
