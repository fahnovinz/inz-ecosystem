# claude-oss-kit

Toolkit open-source untuk **mengecek kelayakan** dan **menyiapkan aplikasi** program [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) — 6 bulan **Claude Max 20x gratis** untuk kontributor OSS.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Apa ini?

Program Anthropic memberikan 6 bulan Claude Max gratis kepada maintainer dan kontributor open-source. Toolkit ini membantu kamu:

- Mengecek apakah profil GitHub kamu memenuhi syarat
- Men-generate draft teks aplikasi sesuai format form resmi
- Menyiapkan repo OSS yang legitimate untuk dikembangkan

**Apply di:** https://claude.com/open-source-max

## Quick Start

### Cek eligibility (PowerShell, tanpa install)

```powershell
.\scripts\check-eligibility.ps1 -Username GITHUB_USERNAME_KAMU
```

### Cek + draft aplikasi (Node.js 18+)

```bash
node bin/claude-oss-kit.js check GITHUB_USERNAME_KAMU
node bin/claude-oss-kit.js draft GITHUB_USERNAME_KAMU --repo username/claude-oss-kit
```

Opsional — set `GITHUB_TOKEN` untuk rate limit lebih tinggi:

```powershell
$env:GITHUB_TOKEN = "ghp_xxxx"
.\scripts\check-eligibility.ps1 -Username GITHUB_USERNAME_KAMU
```

## Syarat Program (Ringkas)

**Wajib:**
- Akun GitHub >= 2 tahun
- Aktivitas OSS publik dalam 90 hari terakhir
- Proyek dengan lisensi OSI-approved

**Salah satu jalur:**
| Jalur | Kriteria |
|-------|----------|
| Active contributor | 100+ PR merged ke repo orang lain (12 bln) |
| Community builder | 20+ kontributor eksternal di repo kamu |
| Maintainer | 200k+ downloads/bulan atau 500+ dependent repos |
| Ecosystem impact | Jelaskan dampak proyek (max 500 kata) |

Detail lengkap: [docs/PANDUAN_APLIKASI.md](docs/PANDUAN_APLIKASI.md)

## Publish ke GitHub

1. Ganti `YOUR_USERNAME` di `package.json`
2. Push ke GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/claude-oss-kit.git
git push -u origin main
```

3. Baca [docs/TEMPLATE_APLIKASI.md](docs/TEMPLATE_APLIKASI.md)
4. Submit di https://claude.com/open-source-max

## Struktur Proyek

```
claude-oss-kit/
├── bin/claude-oss-kit.js      # CLI entry point
├── src/                        # Eligibility checker + draft generator
├── scripts/check-eligibility.ps1  # PowerShell checker (Windows)
├── docs/
│   ├── PANDUAN_APLIKASI.md    # Panduan lengkap (Bahasa Indonesia)
│   └── TEMPLATE_APLIKASI.md   # Template form aplikasi
└── .github/                    # CI + issue templates
```

## Contributing

Kontribusi sangat diterima! Lihat [CONTRIBUTING.md](CONTRIBUTING.md).

Good first issues:
- Tambah dukungan PyPI/npm download check
- Terjemahan README ke bahasa lain
- Improve eligibility heuristics

## License

MIT — see [LICENSE](LICENSE)

## Disclaimer

Toolkit ini **tidak berafiliasi dengan Anthropic**. Ini alat bantu persiapan aplikasi. Keputusan penerimaan sepenuhnya di discretion Anthropic. Jangan gunakan untuk inflate metrics — itu melanggar [Terms of Service](https://www.anthropic.com/claude-for-oss-terms).