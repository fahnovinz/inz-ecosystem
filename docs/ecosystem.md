# INZ Ecosystem — Architecture & Story

A short narrative you can reuse for portfolios, AI events, and applications.

## One sentence

**INZ Ecosystem** is an indie open-source platform: lightweight developer tools plus a privacy-first flagship product — [VRAXTAL VAULT](https://github.com/fahnovinz/vraxtal-vault).

## Two layers

```
┌─────────────────────────────────────────────────────────┐
│  INZ Ecosystem (fahnovinz/inz-ecosystem)                │
│  CLI · analytics · health · badges · product catalog    │
├─────────────────────────────────────────────────────────┤
│  Flagship product (fahnovinz/vraxtal-vault)             │
│  Self-hosted encrypted vault — shippable, MIT, production│
└─────────────────────────────────────────────────────────┘
```

| Layer | What it is | Proof |
|-------|------------|--------|
| **Tools** | Zero-dependency Node CLI + PowerShell scripts | `inz stats` / `health` / `badges` / `products` |
| **Product** | Real app users can self-host | AES-256-GCM vault, deploy scripts, SECURITY.md |

## Design principles

1. **Small modules, clear boundaries** — tools stay forkable; product stays its own repo
2. **Ship, don't only demo** — encryption, sessions, backups, and ops matter
3. **Privacy by default** — app binds to localhost; you control the tunnel/TLS edge
4. **Open-source hygiene** — MIT, no secrets in git, documented threat model
5. **AI as co-pilot, human as owner** — use models for speed; verify before production

## Why this matters for AI events

Judges and programs often look for more than “I used ChatGPT.” This ecosystem shows:

- A **coherent product vision** (privacy + self-host + indie tooling)
- **End-to-end engineering** (crypto, web UI, systemd, Cloudflare Tunnel)
- **Responsible AI workflow** — assist coding/docs, never paste production secrets, always test
- **Teachable artifacts** — public README, SECURITY, deploy guides (ID/EN friendly)

## Talking points (30 seconds)

> I build the INZ Ecosystem: CLI tools for GitHub portfolio health, and a flagship product — VRAXTAL VAULT — a self-hosted encrypted personal vault. Everything is MIT, production-shaped, and designed so indie developers and students can audit, run, and learn privacy-first systems — including how to use AI coding tools without leaking secrets.

## Links

| Resource | URL |
|----------|-----|
| Ecosystem | https://github.com/fahnovinz/inz-ecosystem |
| Vault product | https://github.com/fahnovinz/vraxtal-vault |
| Maintainer | https://github.com/fahnovinz |
| Live instance (private) | https://vault.vraxtal.site |

## CLI catalog

```bash
node bin/inz.js products          # list tools + flagship product
node bin/inz.js products --json
node bin/inz.js health fahnovinz/vraxtal-vault
```
