/* Modul belajar Fluxora. Each module: who it is for, what the learner will be
   able to do, short lessons, a hands-on practice guide that spotlights the real
   screen (FX.tour), and a short check of understanding. Progress is kept per
   account in this browser. Written for Beckycoo's team, in plain language. */
(function () {
  const FX = window.FX;

  const ALL = ['owner', 'pic_gudang', 'pic_admin', 'pic_keuangan', 'staf', 'staf_admin', 'staf_keuangan'];

  FX.MODULES = [
    {
      id: 'dasar',
      title: 'Mengenal Fluxora',
      minutes: 4,
      roles: ALL,
      summary: 'Tujuan Fluxora, cara masuk sesuai peran, membaca menu, dan memahami mode simulasi.',
      goals: ['Menjelaskan masalah yang diselesaikan Fluxora', 'Masuk dengan akun sesuai peran', 'Menemukan pekerjaan yang perlu segera ditangani', 'Membedakan data simulasi dengan data toko yang sebenarnya'],
      lessons: [
        ['Satu sumber data untuk seluruh tim', 'Sebelumnya stok, pesanan, dan kas dicatat terpisah di spreadsheet, sehingga sering terjadi selisih. Di Fluxora, setiap kejadian (pesanan, barang masuk, pembatalan, opname) cukup dicatat satu kali, lalu stok, kedua marketplace, dan buku kas ikut diperbarui sekaligus.'],
        ['Masuk sesuai peran', 'Ada tujuh akun: Owner, tiga PIC (Gudang, Admin Toko, Keuangan), dan tiga Staf (Gudang, Admin Toko, Keuangan). Menu dan tombol yang tampil menyesuaikan tanggung jawab masing-masing peran.'],
        ['Membaca menu dan tanda angka', 'Menu di sebelah kiri hanya berisi halaman yang boleh Anda buka. Angka di samping menu menunjukkan jumlah pekerjaan yang menunggu, misalnya pesanan yang belum dikirim.'],
        ['Daftar Perlu perhatian', 'Ikon lonceng di kanan atas mengumpulkan hal mendesak: batas serah kurir, stok menipis, rekomendasi PO, dan laporan staf. Klik salah satu untuk langsung menuju halamannya.'],
        ['Mode simulasi', 'Pita kuning di atas layar menandakan bahwa seluruh data adalah data contoh dari satu berkas data simulasi terpusat. Setiap browser memulai dengan angka yang sama, dan belum ada koneksi ke Shopee maupun Tokopedia.'],
      ],
      practice: [
        { sel: '.nav', title: 'Menu sesuai peran', body: 'Perhatikan menu yang tersedia untuk peran Anda. Angka berwarna berarti ada pekerjaan yang menunggu.' },
        { sel: '#sim-note', fallback: '#sim-chip', title: 'Mode simulasi', body: 'Pemberitahuan ini selalu tampil agar tidak ada yang mengira data contoh sebagai data toko yang sebenarnya.' },
        { sel: '.bell', title: 'Perlu perhatian', body: 'Semua hal mendesak dikumpulkan di sini, diurutkan dari yang paling kritis.' },
        { sel: '.user-card', title: 'Akun Anda', body: 'Nama Anda tercatat pada setiap perubahan, sehingga riwayat pekerjaan selalu dapat ditelusuri.' },
      ],
      quiz: {
        q: 'Mengapa angka stok di Shopee dan Tokopedia selalu sama di Fluxora?',
        options: ['Admin menyalin angkanya secara manual setiap pagi', 'Kedua marketplace membaca satu angka stok gudang yang sama', 'Shopee dan Tokopedia saling bertukar data secara langsung'],
        answer: 1,
        why: 'Fluxora menyimpan satu angka stok per model dan ukuran. Setiap perubahan langsung dikirim ke kedua marketplace.',
      },
    },
    {
      id: 'stok',
      title: 'Stok satu angka untuk dua toko',
      minutes: 5,
      roles: ALL,
      screens: ['stok'],
      summary: 'Membaca stok per model dan ukuran, mengenali stok menipis atau habis, dan menangani selisih.',
      goals: ['Membaca tabel stok per ukuran', 'Mengenali status menipis dan habis', 'Mengoreksi stok setelah opname (PIC Gudang)', 'Melaporkan selisih stok (Staf)'],
      lessons: [
        ['Membaca tabel stok', 'Setiap baris adalah satu model, dan setiap kolom adalah ukuran S sampai XL. Angka di kolom Listing menunjukkan stok yang tampil di Shopee dan Tokopedia, dan nilainya selalu sama dengan stok gudang.'],
        ['Arti warna', 'Kotak kuning berarti stok menipis (sama dengan atau di bawah batas di Pengaturan). Kotak merah berarti habis; listing di kedua marketplace otomatis menjadi 0 sehingga pembeli tidak dapat checkout.'],
        ['Barang dalam perjalanan', 'Angka kecil bertanda + di bawah sel adalah jumlah yang sedang diproduksi maklon. Angka ini sudah diperhitungkan dalam forecast.'],
        ['Koreksi setelah opname', 'PIC Gudang membuka baris model, mengganti angka gudang sesuai hasil hitung fisik, menuliskan alasannya, lalu menyimpan. Selisihnya tercatat di Aktivitas.'],
        ['Melaporkan selisih', 'Staf tidak mengubah angka sendiri. Gunakan tombol Laporkan selisih stok; laporan langsung masuk ke daftar Perlu perhatian milik PIC Gudang dan Owner.'],
      ],
      practice: [
        { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Satu baris, satu model', body: 'Setiap sel adalah stok satu ukuran. Klik baris untuk melihat detail dan riwayat mutasinya.' },
        { route: 'stok', sel: '.toolbar .seg', title: 'Saring stok', body: 'Gunakan Menipis atau Habis untuk melihat ukuran yang perlu segera diisi ulang.' },
        { route: 'stok', sel: '[data-report="stok"]', fallback: '.toolbar', title: 'Selisih di rak', body: 'Jika hitungan fisik berbeda dengan sistem, kirim laporan dari sini (untuk Staf) atau koreksi langsung lewat detail model (untuk PIC Gudang).' },
      ],
      quiz: {
        q: 'Kotak stok berwarna merah berarti...',
        options: ['Stok habis dan listing di kedua marketplace otomatis 0', 'Stok sedang dalam perjalanan dari maklon', 'Harga produk perlu diperbarui'],
        answer: 0,
        why: 'Merah berarti stok 0. Fluxora langsung menurunkan listing ke 0 sehingga tidak ada pesanan yang harus dibatalkan.',
      },
    },
    {
      id: 'pesanan',
      title: 'Mengelola pesanan harian',
      minutes: 6,
      roles: ['owner', 'pic_gudang', 'pic_admin', 'staf', 'staf_admin'],
      screens: ['pesanan'],
      summary: 'Bekerja dari satu antrean pesanan Shopee dan Tokopedia sampai paket diserahkan ke kurir.',
      goals: ['Mengurutkan pekerjaan berdasarkan batas serah kurir', 'Menjalankan cek fisik, kemas, dan serahkan kurir', 'Membatalkan pesanan dengan benar', 'Melaporkan kendala pesanan atau listing'],
      lessons: [
        ['Satu antrean untuk dua marketplace', 'Pesanan dari Shopee dan Tokopedia masuk ke antrean yang sama, diurutkan dari batas serah kurir yang paling dekat. Kerjakan selalu dari baris paling atas.'],
        ['Batas serah kurir', 'Merah berarti batas sudah lewat. Marketplace dapat membatalkan pesanan dengan alasan "penjual tidak mengatur pengiriman tepat waktu", yang menurunkan performa toko.'],
        ['Cek fisik, kemas, serahkan', 'Staf Gudang mengambil barang dan menekan Cek fisik. PIC Gudang menekan Kemas, lalu Serahkan kurir. Resi terkirim ke marketplace dan penjualan tercatat di buku kas.'],
        ['Pembatalan', 'PIC Admin Toko membuka detail pesanan, memilih alasan, lalu menekan Batalkan pesanan. Stok otomatis kembali ke kedua marketplace.'],
        ['Menjawab pembeli dan melaporkan kendala', 'Staf Admin Toko memakai antrean ini untuk menjawab pertanyaan pembeli. Permintaan perubahan atau masalah listing dilaporkan ke PIC Admin Toko lewat tombol Laporkan kendala pesanan.'],
        ['Mencoba simulasi', 'Tombol Simulasi pesanan di bagian atas membuat pesanan contoh. Uji stok terakhir memperlihatkan dua pembeli yang membeli unit terakhir bersamaan: hanya satu yang berhasil, dan tidak terjadi overselling.'],
      ],
      practice: [
        { route: 'pesanan', sel: '.tabs', title: 'Status pesanan', body: 'Tab memisahkan pesanan per status: perlu dikemas, siap kirim, di kurir, selesai, dan dibatalkan.' },
        { route: 'pesanan', sel: '.deadline', fallback: '.tabs', title: 'Batas serah kurir', body: 'Kolom ini menghitung mundur waktu yang tersisa. Kerjakan yang paling dekat terlebih dahulu.' },
        { route: 'pesanan', sel: '[data-a]', fallback: '.tabs', title: 'Tombol aksi', body: 'Tombol yang tampil menyesuaikan peran Anda: Cek fisik, Kemas, atau Serahkan kurir.' },
        { route: 'pesanan', sel: '.sim', title: 'Coba sendiri', body: 'Tekan Pesanan Shopee atau Uji stok terakhir, lalu perhatikan antrean dan stok berubah.' },
      ],
      quiz: {
        q: 'Pesanan mana yang sebaiknya dikerjakan lebih dulu?',
        options: ['Pesanan yang paling baru masuk', 'Pesanan dengan nilai belanja terbesar', 'Pesanan dengan batas serah kurir paling dekat'],
        answer: 2,
        why: 'Antrean sudah diurutkan dari batas serah kurir terdekat agar tidak ada pesanan yang dibatalkan otomatis oleh marketplace.',
      },
    },
    {
      id: 'masuk',
      title: 'Barang masuk dari maklon',
      minutes: 4,
      roles: ['owner', 'pic_gudang', 'pic_keuangan'],
      screens: ['masuk'],
      summary: 'Mencatat hasil produksi maklon sehingga stok dan biaya produksi tercatat sekaligus.',
      goals: ['Memahami PO yang sedang diproduksi', 'Menerima barang berdasarkan hitung fisik per ukuran', 'Memahami dampaknya ke stok dan buku kas'],
      lessons: [
        ['PO dalam produksi', 'Bagian atas halaman menampilkan PO yang masih dikerjakan maklon beserta perkiraan tanggal tiba. Jumlahnya sudah dihitung sebagai stok dalam perjalanan.'],
        ['Menerima barang', 'Saat barang datang, tekan Terima. Isi jumlah hasil hitung fisik per ukuran; ubah jika berbeda dari jumlah yang dipesan.'],
        ['Yang terjadi setelah disimpan', 'Stok bertambah, listing di kedua marketplace ikut naik, dan biaya produksi tercatat di buku kas. Tidak ada yang perlu diketik ulang.'],
        ['Barang masuk tanpa PO', 'Untuk retur atau kiriman di luar PO, gunakan tombol Barang masuk tanpa PO agar stok tetap tercatat dengan alasan yang jelas.'],
      ],
      practice: [
        { route: 'masuk', sel: '[data-recv]', fallback: '.panel', title: 'Terima barang', body: 'Tombol ini membuka formulir hitung fisik per ukuran untuk PO tersebut.' },
        { route: 'masuk', sel: '[data-act="free"]', fallback: '.toolbar', title: 'Barang masuk tanpa PO', body: 'Untuk retur atau kiriman di luar PO.' },
      ],
      quiz: {
        q: 'Setelah barang masuk disimpan, apa yang terjadi pada buku kas?',
        options: ['Tidak ada; PIC Keuangan harus menginput sendiri', 'Biaya produksi tercatat otomatis', 'Penjualan bertambah'],
        answer: 1,
        why: 'Barang masuk dari PO langsung mencatat biaya produksi sesuai jumlah yang diterima.',
      },
    },
    {
      id: 'keuangan',
      title: 'Keuangan dan rekonsiliasi',
      minutes: 5,
      roles: ['owner', 'pic_keuangan', 'staf_keuangan'],
      screens: ['keuangan'],
      summary: 'Membaca buku kas yang terisi otomatis, memeriksa rekonsiliasi, dan menangani selisih.',
      goals: ['Membedakan entri otomatis dan entri manual', 'Membaca tiga pemeriksaan rekonsiliasi', 'Mencatat transaksi di luar stok (PIC Keuangan)', 'Melaporkan selisih kas (Staf Keuangan)'],
      lessons: [
        ['Entri otomatis', 'Penjualan dan biaya layanan marketplace tercatat saat pesanan diserahkan ke kurir. Biaya produksi tercatat saat barang dari maklon diterima.'],
        ['Entri manual', 'Hanya untuk transaksi di luar stok dan pesanan, seperti gaji, sewa, atau iklan. Hanya PIC Keuangan dan Owner yang dapat membuatnya.'],
        ['Rekonsiliasi otomatis', 'Tiga pemeriksaan berjalan setiap ada transaksi: stok sesuai mutasi, setiap pesanan terkirim memiliki entri penjualan dan biaya, dan setiap barang masuk memiliki biaya produksi. Centang hijau berarti cocok.'],
        ['Melaporkan selisih kas', 'Staf Keuangan yang menemukan perbedaan dengan rekening atau pencairan marketplace mengirim laporan ke PIC Keuangan lewat tombol Laporkan selisih kas.'],
      ],
      practice: [
        { route: 'keuangan', sel: '.kpis', title: 'Ringkasan kas', body: 'Saldo, penjualan, arus kas bersih, dan jumlah entri yang tercatat otomatis.' },
        { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi', body: 'Selama ketiga baris bertanda hijau, stok, pesanan, dan kas saling cocok.' },
        { route: 'keuangan', sel: '[data-act="add"]', fallback: '[data-report="kas"]', title: 'Entri manual atau laporan', body: 'PIC Keuangan mencatat transaksi di luar stok di sini; Staf Keuangan mengirim laporan selisih.' },
      ],
      quiz: {
        q: 'Transaksi mana yang perlu dicatat lewat Entri manual?',
        options: ['Penjualan pesanan Shopee', 'Biaya produksi barang dari maklon', 'Pembayaran gaji staf gudang'],
        answer: 2,
        why: 'Penjualan dan biaya produksi sudah tercatat otomatis. Entri manual hanya untuk transaksi di luar stok dan pesanan.',
      },
    },
    {
      id: 'forecast',
      title: 'Forecast dan PO ke maklon',
      minutes: 5,
      roles: ['owner', 'pic_gudang', 'staf'],
      screens: ['forecast'],
      summary: 'Memahami rekomendasi jumlah produksi dan kapan sebaiknya memesan ke maklon.',
      goals: ['Membaca rekomendasi per model', 'Memahami titik pesan dan safety stock', 'Membuat PO dari rekomendasi (Owner)'],
      lessons: [
        ['Dari mana angkanya', 'Forecast membaca penjualan mingguan 12 minggu terakhir, menghitung tren, lalu memisahkan lonjakan tanggal kembar agar minggu biasa tidak ikut membengkak.'],
        ['Titik pesan', 'Jika stok ditambah barang dalam perjalanan turun ke titik ini, saatnya memesan agar tidak kehabisan selama waktu produksi maklon.'],
        ['Safety stock', 'Cadangan untuk naik turunnya penjualan. Semakin tidak menentu penjualan suatu model, semakin besar cadangannya.'],
        ['Membuat PO', 'Owner menekan Buat PO pada model berlabel pesan. Jumlah per ukuran sudah terisi sesuai pola penjualan dan dibulatkan ke MOQ maklon; angkanya tetap dapat disesuaikan.'],
      ],
      practice: [
        { route: 'forecast', sel: '[data-sel]', fallback: '.panel', title: 'Pilih model', body: 'Klik model untuk melihat perhitungan dan sebaran ukurannya.' },
        { route: 'forecast', sel: '[data-po]', fallback: '.panel', title: 'Buat PO', body: 'Owner membuat PO dari sini; peran lain memakai angka ini untuk persiapan gudang.' },
      ],
      quiz: {
        q: 'Kapan sebuah model perlu dipesan ke maklon?',
        options: ['Saat stok dan barang dalam perjalanan turun ke titik pesan', 'Setiap awal bulan, apa pun kondisinya', 'Hanya ketika stok sudah 0'],
        answer: 0,
        why: 'Memesan di titik pesan memberi waktu bagi maklon untuk berproduksi sebelum stok habis.',
      },
    },
    {
      id: 'akses',
      title: 'Peran, hak akses, dan laporan staf',
      minutes: 4,
      roles: ['owner', 'pic_gudang', 'pic_admin', 'pic_keuangan'],
      summary: 'Siapa boleh melakukan apa, bagaimana laporan staf ditindaklanjuti, dan cara mengatur ulang demo.',
      goals: ['Memahami pembagian peran Owner, PIC, dan Staf', 'Menindaklanjuti laporan staf', 'Mengatur parameter dan data demo (Owner)'],
      lessons: [
        ['Tiga kelompok pengguna', 'Owner memiliki seluruh akses dan memutuskan PO. PIC mengedit data sesuai bagiannya. Staf bekerja dalam mode lihat, memvalidasi, lalu melaporkan kepada PIC.'],
        ['Alur laporan staf', 'Laporan dari Staf Gudang masuk ke PIC Gudang, dari Staf Admin Toko ke PIC Admin Toko, dan dari Staf Keuangan ke PIC Keuangan. Owner melihat semuanya. Setelah ditangani, PIC menekan Tandai selesai dan kejadian itu tercatat di Aktivitas.'],
        ['Jejak aktivitas', 'Setiap perubahan mencatat siapa yang melakukan dan kapan. Halaman Aktivitas juga menampilkan setiap angka yang dikirim ke marketplace.'],
        ['Pengaturan dan data demo', 'Owner dapat mengubah waktu produksi, MOQ, batas stok menipis, dan biaya marketplace. Tombol Atur ulang data demo memuat kembali kondisi awal dari berkas data simulasi.'],
      ],
      practice: [
        { route: 'pengaturan', sel: '.perm-table', title: 'Tabel hak akses', body: 'Ringkasan siapa boleh melakukan apa untuk ketujuh peran.' },
        { route: 'aktivitas', sel: '.feed', title: 'Jejak aktivitas', body: 'Setiap perubahan tercatat lengkap dengan nama dan waktunya.' },
        { route: 'stok', sel: '[data-resolve]', fallback: '.matrix', title: 'Tindak lanjut laporan', body: 'Laporan staf yang ditujukan kepada Anda dapat ditandai selesai setelah ditangani.' },
      ],
      quiz: {
        q: 'Staf Keuangan menemukan selisih saldo. Apa yang sebaiknya dilakukan?',
        options: ['Mengubah entri kas sendiri', 'Mengirim laporan selisih kas ke PIC Keuangan', 'Mengatur ulang data demo'],
        answer: 1,
        why: 'Staf bekerja dalam mode lihat. Perubahan data dilakukan oleh PIC setelah laporan diperiksa.',
      },
    },
  ];
})();
