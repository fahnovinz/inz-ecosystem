# VRAX Spend Tracking

Pencatat pengeluaran harian, dirancang sebagai **mobile app shell**: app bar melekat di atas, tab bar di bawah, tombol catat melayang, dan form muncul sebagai bottom sheet. Statis — tanpa build step, tanpa server — semua angka disimpan di `localStorage` browser.

Lebar konten dikunci di 480px dan ikut `safe-area-inset`, jadi tampilannya sama entah dibuka di browser HP, dipasang sebagai PWA, atau dibungkus WebView.

## Menjalankan

Buka `index.html` langsung di browser, atau serve foldernya:

```bash
cd packages/vrax-spend-tracking
python3 -m http.server 8080
# → http://localhost:8080
```

Deploy ke GitHub Pages / Netlify / Cloudflare Pages cukup dengan mengunggah tiga berkas di folder ini.

## Tiga layar

| Tab | Isinya |
|-----|--------|
| **Beranda** | Sapaan (menyesuaikan jam) + tanggal · total keluar hari ini + bar budget harian · tombol *hemat / boros* beserta tallynya · tiga catatan terakhir |
| **Riwayat** | Peta harian 3 bulan / 6 bulan / 1 tahun, digeser ke samping · kartu transaksi / rata-rata / terbesar · progress budget bulanan |
| **Catatan** | Log transaksi dikelompokkan per hari, tiap baris bisa dihapus, dimuat 10 hari sekali |

Pindah tab bisa dengan **geser kiri/kanan** di badan layar, ditekan di tab bar, atau panah kiri/kanan saat tab bar difokuskan — ketiganya menggerakkan pager yang sama. Tombol **+** melayang di atas tab bar membuka bottom sheet *Catat pengeluaran*. Ikon slider di app bar membuka pengaturan — **nama sapaan** dan tombol hapus semua data — sedangkan ikon bulan mengganti tema.

## Level warna pada peta riwayat

Dihitung dari total satu hari terhadap budget harian:

| Level | Ambang | Warna |
|-------|--------|-------|
| nihil | tidak ada transaksi | kosong |
| hemat | ≤ 60% budget | oranye muda |
| sedang | ≤ 110% budget | oranye |
| boros | > 110% budget | oranye tua |

## Data

- Kunci penyimpanan: `vrax-spend:v1` (catatan, budget, penilaian harian, nama sapaan) dan `vrax-spend:theme`
- Saat pertama dibuka, aplikasi diisi **data contoh** satu tahun supaya peta dan statistik langsung terbaca. Hapus lewat **Pengaturan → Hapus semua** (nama sapaan tetap tersimpan)
- Tidak ada request keluar selain berkas font Google

## Berkas

```text
index.html   app bar, pager tiga layar, tab bar, bottom sheet
styles.css   token warna (terang & gelap), kartu, tombol, peta, dock
app.js       penyimpanan, perhitungan, pager + navigasi tab, render — tanpa dependency
```
