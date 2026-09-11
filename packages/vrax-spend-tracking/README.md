# VRAX Spend Tracking

Pencatat pengeluaran harian. Satu halaman statis, tanpa build step, tanpa server — semua angka disimpan di `localStorage` browser.

## Menjalankan

Buka `index.html` langsung di browser, atau serve foldernya:

```bash
cd packages/vrax-spend-tracking
python3 -m http.server 8080
# → http://localhost:8080
```

Deploy ke GitHub Pages / Netlify / Cloudflare Pages cukup dengan mengunggah tiga berkas di folder ini.

## Isi halaman

| Blok | Isinya |
|------|--------|
| **Budget watch** | Persen budget harian yang sudah kepakai, sisa rupiah, dan pengeluaran terbesar hari ini |
| **Hari ini gimana?** | Tandai hari sebagai *hemat* atau *boros*; tallynya jalan terus |
| **Pengeluaran terakhir** | Jarak waktu sejak catatan terakhir + total hari ini |
| **Kartu statistik** | Jumlah transaksi, rata-rata per hari aktif, dan transaksi terbesar |
| **Budget bulan ini** | Progress bar bulanan + jatah harian yang tersisa |
| **Riwayat pengeluaran** | Peta 26 minggu, satu titik per hari, diwarnai terhadap budget harian |
| **Catatan pengeluaran** | Log transaksi, bisa dihapus satu per satu |

## Level warna pada peta riwayat

Dihitung dari total satu hari terhadap budget harian:

| Level | Ambang | Warna |
|-------|--------|-------|
| nihil | tidak ada transaksi | kosong |
| hemat | ≤ 60% budget | oranye muda |
| sedang | ≤ 110% budget | oranye |
| boros | > 110% budget | oranye tua |

## Data

- Kunci penyimpanan: `vrax-spend:v1` (catatan, budget, penilaian harian) dan `vrax-spend:theme`
- Saat pertama dibuka, halaman diisi **data contoh** 26 minggu supaya peta dan statistik langsung terbaca. Tekan **mulai dari nol ✕** di kaki halaman untuk menghapusnya
- Tidak ada request keluar selain berkas font Google

## Berkas

```text
index.html   struktur halaman + dialog form
styles.css   token warna (terang & gelap), kartu, tombol, peta
app.js       penyimpanan, perhitungan, render — tanpa dependency
```
