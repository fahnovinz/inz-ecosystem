# Panduan Aplikasi Claude for Open Source (6 Bulan Claude Max Gratis)

Program resmi Anthropic untuk kontributor open-source. Benefit: **6 bulan Claude Max 20x gratis**.

- Halaman program: https://claude.com/contact-sales/claude-for-oss
- Form aplikasi: https://claude.com/open-source-max
- Terms: https://www.anthropic.com/claude-for-oss-terms

---

## Format Form Aplikasi (Wajib Diisi)

Form di `claude.com/open-source-max` meminta:

| Field | Isi |
|-------|-----|
| **Sign in with GitHub** | Login OAuth dengan akun GitHub kamu |
| **Email** | Email terhubung ke GitHub (untuk link aktivasi) |
| **How you plan to use your subscription** | Deskripsi singkat rencana penggunaan Claude Max |
| **Why you qualify** | Penjelasan kenapa kamu eligible (**maks 500 kata**) |

Anthropic akan verifikasi otomatis dari profil GitHub kamu.

---

## Syarat Umum (SEMUA Wajib)

- [ ] Warga negara/residen negara yang Claude.ai tersedia
- [ ] Usia minimal 18 tahun
- [ ] Akun GitHub **minimal 2 tahun**
- [ ] Aktivitas OSS publik dalam **90 hari terakhir** (commit, PR, review, release)
- [ ] Maintain/kontribusi ke proyek dengan **lisensi OSI-approved** (MIT, Apache 2.0, BSD, GPL, dll.)
- [ ] Bukan karyawan/kontraktor Anthropic atau keluarga dekat
- [ ] Hanya **1 aplikasi per orang** (duplikat diabaikan)

---

## Jalur Kelayakan (Pilih Salah Satu)

### Maintainer Track

1. **Maintainer/Library author**: 500+ dependent repos ATAU 100+ dependent packages ATAU 200.000+ download/bulan
2. **Core contributor**: Committer/maintainer proyek foundation (CPython, Rust, Node.js TSC, Kubernetes, dll.)
3. **Active contributor**: 100+ PR merged ke repo orang lain dalam 12 bulan terakhir
4. **Community builder**: Repo kamu punya 20+ kontributor eksternal unik dengan merged PR dalam 12 bulan
5. **Critical infrastructure**: OpenSSF criticality score >= 0.4

### Ecosystem Impact Track (Discretionary)

Tidak memenuhi angka di atas? **Tetap bisa apply!** Jelaskan dalam 500 kata:
- Proyek apa yang kamu maintain
- Kenapa ecosystem bergantung padanya
- Peran kamu sebagai maintainer/contributor

---

## Cara Pakai Toolkit Ini

### 1. Cek eligibility

**PowerShell (tanpa install apapun):**
```powershell
cd C:\Users\fahno\claude-oss-kit
.\scripts\check-eligibility.ps1 -Username GITHUB_USERNAME_KAMU
```

**Node.js CLI (setelah install Node 18+):**
```bash
node bin/claude-oss-kit.js check GITHUB_USERNAME_KAMU
node bin/claude-oss-kit.js draft GITHUB_USERNAME_KAMU --repo username/repo-name
```

### 2. Publish repo ini ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Claude OSS eligibility toolkit"
git branch -M main
git remote add origin https://github.com/USERNAME_KAMU/claude-oss-kit.git
git push -u origin main
```

Ganti `YOUR_USERNAME` di `package.json` dengan username GitHub kamu.

### 3. Personalisasi draft aplikasi

Buka `docs/TEMPLATE_APLIKASI.md`, edit dengan data nyata proyek kamu.

### 4. Submit aplikasi

1. Buka https://claude.com/open-source-max
2. Login GitHub
3. Paste teks yang sudah disiapkan
4. Submit **sekali saja**

---

## Strategi Agar Diterima (Legitimate)

### Jika akun GitHub masih baru (< 2 tahun)
Tunggu sampai akun berusia 2 tahun. Tidak ada jalan pintas untuk ini.

### Jika belum ada aktivitas 90 hari terakhir
- Commit ke repo OSS kamu (issue fix, docs, tests)
- Buat PR ke proyek open-source lain
- Review PR orang lain

### Jika belum memenuhi angka Maintainer Track

**Opsi A — Active Contributor (100 PR):**
Kontribusi rutin ke proyek OSS yang kamu pakai. Satu PR per hari = ~3 bulan.

**Opsi B — Community Builder (20 kontributor eksternal):**
1. Publish `claude-oss-kit` dengan README jelas
2. Tambahkan `good first issue` labels
3. Promosikan di Reddit r/opensource, Dev.to, Hacker News Show HN
4. Review dan merge PR dari kontributor lain dengan tulus

**Opsi C — Ecosystem Impact Track:**
Tulis narasi kuat tentang proyek kamu. Fokus pada:
- Masalah nyata yang diselesaikan
- Siapa yang memakai/mengandalkan proyekmu
- Peran kamu sebagai maintainer

---

## Template "How You Plan to Use"

```
I plan to use Claude Max to accelerate my open-source work:

1. Faster PR review and issue triage for my maintained repositories
2. Writing and improving documentation and contributor guides
3. Implementing community-requested features and bug fixes
4. Maintaining CI/CD pipelines and test coverage

This directly benefits contributors who depend on my projects for their own work.
```

---

## Hal yang DILARANG (Bisa Didiskualifikasi)

- Bot accounts / fake contributions
- Inflate metrics (downloads, dependents, PR count palsu)
- Multiple applications dengan email berbeda
- Copy-paste aplikasi tanpa kontribusi nyata

---

## Setelah Diterima

1. Cek email dari GitHub → klik link aktivasi (kadaluarsa 90 hari)
2. Claude Max 20x aktif selama 6 bulan
3. Setelah 6 bulan, kembali ke plan sebelumnya (kecuali kamu cancel)

---

## Butuh Bantuan?

- Issues di repo ini untuk bug/feature toolkit
- Baca Terms lengkap: https://www.anthropic.com/claude-for-oss-terms