/* Panduan — how to use Fluxora: tour, daily flow, step-by-step tasks per role,
   glossary and FAQ. Content is written for Beckycoo's team, not for developers. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let roleTab = null;
  let lastRole = null;

  // The day in Fluxora, in the order it actually happens.
  const FLOW = [
    { who: 'Otomatis', title: 'Pesanan masuk', body: 'Pesanan dari Shopee atau Tokopedia langsung mengurangi stok, dan angka baru dikirim ke kanal lainnya. Jika stok sudah 0, checkout ditahan.', go: 'pesanan' },
    { who: 'Staf Gudang', title: 'Ambil barang dan cek fisik', body: 'Cocokkan barang di rak dengan pesanan, lalu tekan Cek fisik.', go: 'pesanan' },
    { who: 'PIC Gudang', title: 'Kemas dan serahkan ke kurir', body: 'Kerjakan dari atas: antrean diurutkan dari batas serah kurir paling dekat. Serahkan kurir mengirim resi dan mencatat penjualan.', go: 'pesanan' },
    { who: 'Otomatis', title: 'Kas tercatat', body: 'Penjualan dan biaya layanan marketplace masuk buku kas tanpa diketik ulang. Rekonsiliasi berjalan setiap kali.', go: 'keuangan' },
    { who: 'Owner', title: 'Putuskan produksi', body: 'Forecast menandai model yang sudah di bawah titik pesan. Buat PO ke maklon dari rekomendasinya.', go: 'forecast' },
    { who: 'PIC Gudang', title: 'Terima barang dari maklon', body: 'Hitung fisik per ukuran dan simpan. Stok bertambah di kedua kanal dan biaya produksi tercatat.', go: 'masuk' },
  ];

  // Step-by-step tasks. `roles` = who can do it.
  const TASKS = [
    { id: 'kirim', title: 'Menyerahkan pesanan ke kurir', roles: ['owner', 'pic_gudang'], go: 'pesanan', steps: ['Buka Pesanan, tab Perlu dikemas.', 'Mulai dari baris paling atas (batas serah paling dekat). Merah berarti sudah telat.', 'Tekan Kemas saat mulai mengemas, lalu Serahkan kurir saat paket diambil.', 'Resi terkirim ke marketplace dan penjualan masuk Keuangan. Tidak perlu dicatat lagi.'] },
    { id: 'cek', title: 'Menandai pesanan sudah dicek fisik', roles: ['staf'], go: 'pesanan', steps: ['Buka Pesanan, tab Perlu dikemas.', 'Ambil barang dari rak sesuai model dan ukuran.', 'Tekan Cek fisik pada pesanan itu. Tanda “Sudah dicek” terlihat oleh PIC.'] },
    { id: 'masuk', title: 'Mencatat barang masuk dari maklon', roles: ['owner', 'pic_gudang'], go: 'masuk', steps: ['Buka Barang masuk. PO yang sedang diproduksi ada di bagian atas.', 'Tekan Terima pada PO yang datang (atau Barang masuk tanpa PO bila tidak ada PO-nya).', 'Isi jumlah hasil hitung fisik per ukuran. Ubah bila berbeda dari pesanan.', 'Periksa ringkasan “Yang akan terjadi”, lalu Simpan barang masuk.'] },
    { id: 'opname', title: 'Mengoreksi stok setelah opname', roles: ['owner', 'pic_gudang'], go: 'stok', steps: ['Buka Stok dan klik baris model yang dihitung.', 'Di drawer, ganti angka Gudang per ukuran dengan hasil hitung fisik.', 'Tulis alasan koreksi (misalnya “1 pcs cacat”), lalu Simpan hasil opname.', 'Selisihnya tercatat di Aktivitas dan listing kedua kanal ikut berubah.'] },
    { id: 'lapor', title: 'Melaporkan selisih stok', roles: ['staf'], go: 'stok', steps: ['Buka Stok dan tekan Laporkan selisih ke PIC.', 'Pilih model dan ukuran, isi hitungan fisik dan catatan.', 'Kirim laporan. PIC Gudang dan Owner melihatnya di Perlu perhatian.'] },
    { id: 'po', title: 'Membuat PO ke maklon', roles: ['owner'], go: 'forecast', steps: ['Buka Forecast. Model berlabel “pesan” sudah di bawah titik pesan.', 'Pilih modelnya untuk melihat hitungan dan sebaran ukuran.', 'Tekan Buat PO. Jumlah per ukuran sudah terisi; sesuaikan bila perlu.', 'Pilih maklon, periksa dampak ke kas, lalu Kirim PO. Forecast langsung menghitungnya sebagai stok dalam perjalanan.'] },
    { id: 'batal', title: 'Membatalkan pesanan', roles: ['owner', 'pic_admin'], go: 'pesanan', steps: ['Buka Pesanan dan klik pesanan yang dimaksud.', 'Pilih alasan pembatalan di bagian bawah drawer.', 'Tekan Batalkan pesanan. Stok kembali ke kedua kanal secara otomatis.'] },
    { id: 'listing', title: 'Mengganti foto atau harga produk', roles: ['owner', 'pic_admin'], go: 'pengaturan', steps: ['Buka Pengaturan, bagian Foto & listing produk.', 'Di Shopee, klik kanan foto produk lalu Salin alamat gambar. Tempel di kolom URL foto.', 'Ubah harga bila perlu, lalu Simpan. Listing di kedua kanal diperbarui.'] },
    { id: 'kas', title: 'Mencatat pengeluaran di luar stok', roles: ['owner', 'pic_keuangan'], go: 'keuangan', steps: ['Buka Keuangan dan tekan Entri manual.', 'Pilih jenis dan kategori, isi jumlah dan keterangan.', 'Simpan. Penjualan, biaya platform, dan biaya produksi tidak perlu diinput: sudah otomatis.'] },
    { id: 'rekon', title: 'Memeriksa rekonsiliasi', roles: ['owner', 'pic_keuangan'], go: 'keuangan', steps: ['Buka Keuangan, panel Rekonsiliasi otomatis.', 'Centang hijau di ketiga baris berarti stok, pesanan, dan kas cocok.', 'Jika ada tanda merah, baris yang bermasalah ditulis di bawah judulnya. Laporkan ke Owner.'] },
  ];

  const GLOSSARY = [
    ['Maklon', 'Vendor pihak ketiga yang menjahit dan memproduksi pakaian berdasarkan desain Beckycoo.'],
    ['PO (purchase order)', 'Pesanan produksi ke maklon: model, jumlah per ukuran, HPP, dan perkiraan tiba.'],
    ['Opname', 'Penghitungan fisik stok di gudang untuk dicocokkan dengan angka di sistem.'],
    ['Batas serah kurir', 'Waktu terakhir paket harus diserahkan. Lewat dari ini, marketplace bisa membatalkan pesanan.'],
    ['Overselling', 'Barang terjual melebihi stok. Fluxora mencegahnya dengan memakai satu angka stok untuk semua kanal.'],
    ['Titik pesan', 'Jika stok + barang dalam perjalanan turun ke angka ini, saatnya membuat PO agar tidak kehabisan selama waktu produksi.'],
    ['Safety stock', 'Cadangan untuk naik-turunnya penjualan, dihitung dari seberapa tidak menentunya penjualan model itu.'],
    ['HPP', 'Harga pokok produksi per pcs yang dibayar ke maklon.'],
    ['MOQ', 'Jumlah minimum per model yang mau diproduksi maklon.'],
    ['Tanggal kembar', 'Promo seperti 11.11 dan 12.12 yang membuat penjualan melonjak. Forecast memperhitungkannya.'],
  ];

  const FAQ = [
    ['Kenapa ada checkout yang “ditahan”?', 'Stok ukuran itu sudah 0 di gudang, jadi listing di kedua kanal juga 0. Pembeli tidak bisa membeli barang yang tidak ada, sehingga tidak ada pesanan yang harus dibatalkan sepihak.'],
    ['Kenapa angka listing Shopee dan Tokopedia selalu sama?', 'Keduanya membaca satu angka stok gudang. Setiap pesanan, pembatalan, barang masuk, atau koreksi langsung dikirim ke kedua kanal.'],
    ['Saya tidak melihat menu tertentu.', 'Menu mengikuti peran akun. Misalnya, Staf Gudang hanya melihat Stok, Pesanan, Forecast, dan Panduan. Hubungi Owner bila perlu akses lain.'],
    ['Apakah data saya aman jika browser ditutup?', 'Di prototipe ini data disimpan di browser yang Anda pakai. Versi produksi menyimpannya di server bersama.'],
    ['Kenapa ada pesanan baru setiap kali saya masuk?', 'Untuk simulasi, setiap kali masuk Fluxora memutar ulang pesanan Shopee dan Tokopedia yang “masuk” sejak Anda terakhir membuka aplikasi. Jumlahnya bertambah 1–2 setiap kali masuk (mulai dari 3). Stok berkurang dan kedua kanal tersinkron seperti pesanan sungguhan. Owner bisa mematikannya atau mengatur batasnya di Pengaturan.'],
    ['Lupa kata sandi?', 'Di prototipe, semua akun demo memakai kata sandi beckycoo.'],
  ];

  function roleLabel(r) {
    return S.ROLES[r].label;
  }

  FX.views.panduan = {
    render() {
      const me = S.role;
      if (!roleTab || lastRole !== me) roleTab = me;
      lastRole = me;
      const mine = (t) => S.can('*') || t.roles.includes(me);

      return (
        '<section class="panel guide-hero"><div class="guide-hero-b">' +
        '<div class="guide-hero-mark">' + FX.logo(72) + '</div>' +
        '<div style="flex:1;min-width:240px"><h2 class="guide-h">Mulai dari tur singkat</h2><p class="ink2" style="margin:var(--space-2) 0 0;max-width:60ch">Tur menyorot bagian layar yang Anda pakai sebagai <b>' + esc(roleLabel(me)) + '</b>, satu per satu. Kurang dari satu menit, dan bisa ditutup kapan saja.</p></div>' +
        '<div class="btns"><button class="btn" id="replay-intro">Putar intro</button><button class="btn primary" id="start-tour">Mulai tur</button></div>' +
        '</div></section>' +

        '<section class="panel"><div class="panel-h"><h2>Alur satu hari di Fluxora</h2><span class="meta">urutan kerja dari pesanan masuk sampai barang baru datang</span></div>' +
        '<ol class="flow">' +
        FLOW.map((f, i) =>
          '<li class="flow-i"><span class="flow-n">' + (i + 1) + '</span><div><div class="flow-who">' + esc(f.who) + '</div><div class="ttl">' + esc(f.title) + '</div><div class="body">' + esc(f.body) + '</div>' +
          (S.SCREENS[me].includes(f.go) ? '<a class="flow-go" href="#' + f.go + '" data-go="' + f.go + '">Buka ' + esc(goLabel(f.go)) + '</a>' : '') + '</div></li>').join('') +
        '</ol></section>' +

        '<section class="panel"><div class="panel-h"><h2>Langkah per tugas</h2><span class="spacer"></span>' +
        '<div class="seg" role="tablist" aria-label="Pilih peran">' + Object.keys(S.ROLES).map((r) => '<button role="tab" aria-selected="' + (roleTab === r) + '" data-role="' + r + '" class="' + (roleTab === r ? 'on' : '') + '">' + esc(roleLabel(r)) + (r === me ? ' (Anda)' : '') + '</button>').join('') + '</div></div>' +
        '<div class="tasks">' +
        TASKS.filter((t) => t.roles.includes(roleTab))
          .map((t, idx) =>
            '<details class="task"' + (idx === 0 ? ' open' : '') + '><summary><span class="task-t">' + esc(t.title) + '</span>' + (mine(t) ? '' : '<span class="lvl neutral">' + ui.icon('eye', 13) + 'peran lain</span>') + '<span class="task-chev">' + ui.icon('chev', 16) + '</span></summary>' +
            '<ol class="task-steps">' + t.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
            (mine(t) && S.SCREENS[me].includes(t.go) ? '<div class="task-foot"><a class="btn sm" href="#' + t.go + '" data-go="' + t.go + '">Coba di ' + esc(goLabel(t.go)) + '</a></div>' : '') +
            '</details>')
          .join('') +
        '</div></section>' +

        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Istilah</h2></div><dl class="gloss">' + GLOSSARY.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl></section>' +
        '<section class="panel"><div class="panel-h"><h2>Pertanyaan umum</h2></div><div class="tasks">' + FAQ.map(([q, a]) => '<details class="task"><summary><span class="task-t">' + esc(q) + '</span><span class="task-chev">' + ui.icon('chev', 16) + '</span></summary><p class="faq-a">' + esc(a) + '</p></details>').join('') + '</div></section>' +
        '</div>'
      );
    },
    mount(el) {
      el.querySelector('#start-tour').onclick = () => FX.tour.start();
      el.querySelector('#replay-intro').onclick = () => FX.intro.play();
      el.querySelectorAll('[data-role]').forEach((b) => (b.onclick = () => ((roleTab = b.dataset.role), FX.app.render())));
    },
  };

  function goLabel(k) {
    return { pesanan: 'Pesanan', keuangan: 'Keuangan', forecast: 'Forecast', masuk: 'Barang masuk', stok: 'Stok', pengaturan: 'Pengaturan' }[k] || k;
  }
})();
