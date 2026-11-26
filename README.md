# Fluxora — Stok & Pesanan Beckycoo

Prototipe web untuk masalah di dokumen *Kelompok 5 — FLUXORA*: stok Shopee & Tokopedia yang
tidak sinkron, pesanan yang dicatat manual, buku kas yang dicocokkan tangan, dan PO ke maklon
yang masih berdasarkan perkiraan.

## Halaman
| URL | Isi |
|---|---|
| `/` | Login dan aplikasi |
| `/about` | Tentang Fluxora dan tim Kelompok 5 |
| `/docs/design-system` | Sistem desain |

## Menjalankan
Buka `index.html` langsung di browser (tanpa build, tanpa server). Halaman pertama adalah login:
pilih salah satu dari tujuh akun simulasi (kata sandi `beckycoo`).

## Data simulasi terpusat
Semua data demo berada di **satu berkas**: `data/demo-data.js`. Seluruh halaman (Ringkasan, Stok,
Pesanan, Barang masuk, Keuangan, Forecast, Aktivitas) membaca kondisi awalnya dari berkas ini.
Angka acak dalam simulasi memakai pengacak berbenih yang disimpan di data, sehingga setiap browser
memulai dengan angka yang sama dan urutan tindakan yang sama menghasilkan hasil yang sama.
Perubahan selama demo disimpan di browser; kembalikan ke kondisi awal lewat
**Pengaturan → Atur ulang data demo** (akun Owner). Untuk mengubah data demo, sunting berkas
tersebut lalu naikkan nilai `version`.

Aplikasi selalu menampilkan pemberitahuan **Mode simulasi** agar data contoh tidak dikira data toko yang sebenarnya.

## Logo, intro, dan panduan
- Logo: tiga garis fluks membentuk huruf F (berkas di `assets/logo/`). Intro animasi fluks 3D diputar sekali per sesi browser (bisa dilewati, dimatikan otomatis bila pengguna memilih kurangi gerak).
- **Pesanan contoh saat masuk**: setiap kali login, pesanan Shopee/Tokopedia yang "masuk" sejak login terakhir diputar ulang (mulai 3, bertambah 1–2 tiap login, maks. 12). Bisa dimatikan di Pengaturan.
- Menu **Panduan** (semua peran): 7 modul belajar (materi, praktik langsung di layar, dan cek pemahaman, dengan kemajuan per akun), panduan interaktif per peran, alur kerja harian, langkah per tugas, istilah, dan tanya jawab. Panduan interaktif ditawarkan otomatis saat akun pertama kali masuk.

## Sistem desain
- `css/tokens.css`: token 3 tingkat (referensi → semantik → komponen), sumber kebenaran.
- `tokens.json`: format W3C Design Tokens, dibuat dari tokens.css dengan `python3 tools/build-tokens.py`.
- `docs/design-system.html`: panduan gaya hidup (warna, tipografi, spasi, radius, gerak, breakpoint, semua state komponen).
- `docs/HANDOFF.md`: spesifikasi untuk engineer (token, varian & state, layout, responsif, gerak, edge case, aksesibilitas).

## Satu kejadian, semua bagian ikut berubah
| Kejadian | Stok | Listing Shopee + Tokopedia | Buku kas | Forecast / notifikasi |
|---|---|---|---|---|
| Pesanan masuk (webhook / tombol simulasi) | berkurang | kedua kanal diperbarui | — | laju penjualan & batas serah kurir |
| Stok 0 lalu ada checkout | — | checkout ditolak (overselling dicegah) | — | dihitung di Ringkasan |
| Serahkan ke kurir | — | resi dikirim ke kanal asal | penjualan + biaya platform | — |
| Batal | dikembalikan | kedua kanal diperbarui | — | — |
| PO ke maklon (Owner) | angka "+n dalam perjalanan" | — | — | dihitung sebagai stok dalam perjalanan |
| Barang masuk (PIC Gudang) | bertambah | kedua kanal diperbarui | biaya produksi | rekomendasi dihitung ulang |
| Opname / koreksi | disesuaikan | kedua kanal diperbarui | — | — |

**Keuangan → Rekonsiliasi otomatis** membuktikan ketiganya selalu cocok.

## Peran (akun simulasi di halaman login)
| Email | Peran |
|---|---|
| owner@beckycoo.id | Owner: semua akses, keputusan PO |
| gudang@beckycoo.id | PIC Gudang: barang masuk, opname, kemas & kirim |
| admin@beckycoo.id | PIC Admin Toko: pesanan, batal, listing |
| keuangan@beckycoo.id | PIC Keuangan: buku kas, rekonsiliasi |
| stafgudang@beckycoo.id | Staf Gudang: lihat stok dan pesanan, cek fisik, lapor selisih stok ke PIC Gudang |
| stafadmin@beckycoo.id | Staf Admin Toko: lihat pesanan dan stok, lapor kendala pesanan/listing ke PIC Admin Toko |
| stafkeuangan@beckycoo.id | Staf Keuangan: lihat buku kas dan stok, lapor selisih kas ke PIC Keuangan |

Laporan staf masuk ke daftar *Perlu perhatian* milik PIC terkait dan Owner, lalu ditandai selesai setelah ditangani.

Keluar lewat ikon di kartu pengguna (kiri bawah).

## Foto produk
Shopee tidak bisa diakses dari lingkungan pembuatan prototipe ini, jadi produk memakai siluet
berwarna sementara. Untuk memakai foto asli dari shopee.co.id/beckycoo, pilih salah satu:
1. **Pengaturan → Foto & listing produk**: tempel URL gambar
   (klik kanan foto produk di Shopee → *Copy image address*, biasanya
   `https://down-id.img.susercontent.com/file/...`), lalu **Simpan**.
2. Simpan file di `assets/products/`, mis. `assets/products/BC-TS01-BLK.jpg`, lalu tempel path itu di kolom URL foto yang sama.

Nama, warna, dan harga produk di `data/demo-data.js` adalah contoh; ganti dengan katalog asli.

## Struktur
```
index.html             login + aplikasi
about.html             tentang Fluxora dan tim
404.html               halaman tidak ditemukan
vercel.json            konfigurasi Vercel
css/tokens.css         token desain (sumber kebenaran)
css/app.css            komponen & layout (hanya membaca token)
fonts/                 Hanken Grotesk WOFF2 (OFL)
tokens.json            token format W3C (hasil generate)
tools/build-tokens.py  generator tokens.json
docs/                  design-system.html, HANDOFF.md
js/auth.js             login dan sesi
js/intro.js            logo (FX.logo) dan animasi intro
js/tour.js             panduan interaktif (per peran dan per modul)
js/modules.js          isi 7 modul belajar
js/reports.js          laporan staf ke PIC (stok, pesanan, kas)
data/demo-data.js      satu-satunya sumber data simulasi
js/arrivals.js         pesanan contoh yang masuk setiap login
assets/logo/           berkas logo SVG
js/util.js             format Rupiah/tanggal, pengacak berbenih, id berurutan
js/seed.js             menyusun kondisi awal dari data/demo-data.js
js/store.js            satu sumber data + semua aksi bisnis + rekonsiliasi + notifikasi
js/forecast.js         Holt smoothing, safety stock, titik pesan, MOQ, sebaran ukuran
js/ui.js               komponen, drawer, toast, grafik SVG
js/views/*.js          8 layar
js/app.js              navigasi, peran, simulator marketplace
```
