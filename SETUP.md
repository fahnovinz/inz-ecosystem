# Setup Cepat — claude-oss-kit

Ikuti langkah ini untuk publish proyek dan apply ke Claude for OSS.

## Langkah 1: Install Git (jika belum ada)

Download: https://git-scm.com/download/win

Opsional — Node.js 18+ untuk CLI lengkap: https://nodejs.org/

## Langkah 2: Personalisasi

Edit `package.json`, ganti:
```json
"url": "https://github.com/YOUR_USERNAME/claude-oss-kit.git"
```
dengan username GitHub kamu.

## Langkah 3: Cek Eligibility

```powershell
cd C:\Users\fahno\claude-oss-kit
.\scripts\check-eligibility.ps1 -Username GITHUB_USERNAME_KAMU
```

## Langkah 4: Publish ke GitHub

1. Buat repo baru di https://github.com/new
   - Name: `claude-oss-kit`
   - Public
   - Jangan centang "Add README" (sudah ada)

2. Push:
```powershell
cd C:\Users\fahno\claude-oss-kit
git init
git add .
git commit -m "Initial commit: Claude OSS eligibility toolkit"
git branch -M main
git remote add origin https://github.com/USERNAME_KAMU/claude-oss-kit.git
git push -u origin main
```

## Langkah 5: Siapkan Aplikasi

1. Baca `docs/TEMPLATE_APLIKASI.md`
2. Edit template dengan data proyek kamu
3. Pastikan <= 500 kata untuk "Why you qualify"

Jika Node terinstall:
```powershell
node bin/claude-oss-kit.js draft USERNAME_KAMU --repo USERNAME_KAMU/claude-oss-kit
```

## Langkah 6: Submit

1. Buka https://claude.com/open-source-max
2. Sign in with GitHub
3. Isi email
4. Paste "How you plan to use"
5. Paste "Why you qualify" (max 500 kata)
6. Submit **sekali saja**

## Langkah 7: Aktivitas OSS (Penting!)

Sebelum/sesudah apply, pastikan ada aktivitas di 90 hari terakhir:
- Commit ke repo ini
- Buat issue + fix
- Terima kontribusi dari orang lain (untuk jalur Community Builder)

---

**Timeline perkiraan:**
- Akun < 2 tahun → tunggu dulu
- Ecosystem Impact Track → bisa apply sekarang jika syarat umum terpenuhi
- Community Builder (20 kontributor) → butuh beberapa bulan membangun komunitas
- Active Contributor (100 PR) → butuh kontribusi rutin ke proyek lain