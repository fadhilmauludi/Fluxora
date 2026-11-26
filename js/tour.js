/* Panduan interaktif: spotlights real elements of the interface, one step at a
   time. The default guide is written per role; every learning module in the
   Panduan screen also has its own practice guide (FX.tour.start(steps, opts)).
   Offered once per account on first sign-in. Keyboard: → next, ← back, Esc close. */
(function () {
  const FX = window.FX;
  const esc = FX.esc;

  const COMMON_START = [
    { route: null, sel: '.nav', title: 'Menu sesuai peran', body: 'Menu di sebelah kiri hanya menampilkan halaman yang menjadi tanggung jawab Anda. Angka berwarna menandakan pekerjaan yang perlu segera ditangani.' },
    { route: null, sel: '#sim-note', fallback: '#sim-chip', title: 'Mode simulasi', body: 'Pemberitahuan ini mengingatkan bahwa semua data di aplikasi adalah data contoh. Klik Selengkapnya untuk penjelasan sumber datanya.' },
    { route: null, sel: '.sim', title: 'Simulasi pesanan', body: 'Selama masa uji coba, pesanan Shopee dan Tokopedia dibuat lewat tombol ini. Coba Pesanan Shopee, lalu perhatikan stok dan listing kedua marketplace berubah bersamaan.' },
    { route: null, sel: '.bell', title: 'Perlu perhatian', body: 'Batas serah kurir, stok menipis, rekomendasi PO, dan laporan staf terkumpul di sini. Klik salah satu untuk langsung membuka halamannya.' },
  ];
  const COMMON_END = [
    { route: null, sel: '.user-card', title: 'Akun Anda', body: 'Nama Anda tercatat pada setiap perubahan data. Untuk keluar, gunakan ikon di sebelah kanan. Modul belajar dan panduan ini selalu tersedia di menu Panduan.' },
  ];

  const ROLE_STEPS = {
    owner: [
      { route: 'ringkasan', sel: '.kpis', title: 'Kondisi bisnis hari ini', body: 'Saldo kas, omzet 30 hari, nilai stok, pesanan yang harus dikirim, dan jumlah overselling yang berhasil dicegah. Semua angka dihitung langsung dari transaksi, tanpa input ulang.' },
      { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Stok per ukuran', body: 'Satu angka per model dan ukuran, dipakai Shopee dan Tokopedia sekaligus. Kuning berarti menipis, merah berarti habis dan listing otomatis menjadi 0.' },
      { route: 'forecast', sel: '[data-po]', fallback: '.panel', title: 'Keputusan produksi', body: 'Forecast menghitung jumlah yang perlu dipesan ke maklon beserta sebaran ukurannya. Tombol ini mengisi PO secara otomatis, dan angkanya tetap bisa Anda sesuaikan.' },
      { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi otomatis', body: 'Stok, pesanan, dan kas dicocokkan setiap kali ada transaksi. Selama tanda centang hijau, tidak ada selisih yang perlu dicari di akhir bulan.' },
    ],
    pic_gudang: [
      { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Stok per ukuran', body: 'Klik baris untuk membuka detail. Setelah opname, ubah angkanya di sana; Shopee dan Tokopedia langsung mengikuti.' },
      { route: 'masuk', sel: '[data-recv]', fallback: '[data-act="free"]', title: 'Terima barang dari maklon', body: 'Saat barang datang, tekan Terima, hitung fisik per ukuran, lalu simpan. Stok bertambah dan biaya produksi tercatat di buku kas secara otomatis.' },
      { route: 'pesanan', sel: '.tabs', title: 'Antrean pesanan', body: 'Pesanan dari dua marketplace berada dalam satu antrean, diurutkan dari batas serah kurir yang paling dekat.' },
      { route: 'pesanan', sel: '[data-a="ship"]', fallback: '.tabs', title: 'Serahkan ke kurir', body: 'Setelah dikemas, tekan Serahkan kurir. Resi dikirim ke marketplace dan penjualan tercatat di buku kas.' },
    ],
    pic_admin: [
      { route: 'pesanan', sel: '.tabs', title: 'Antrean pesanan', body: 'Tab memisahkan pesanan berdasarkan status. Warna merah pada kolom Batas serah berarti pesanan sudah melewati batas waktu.' },
      { route: 'pesanan', sel: '[data-a="pack"]', fallback: '.tabs', title: 'Kemas', body: 'Tandai pesanan yang sedang dikemas. Untuk membatalkan, buka detail pesanannya; stok otomatis kembali ke kedua marketplace.' },
      { route: 'pengaturan', sel: '[data-img]', title: 'Foto dan harga listing', body: 'Tempel alamat foto produk dan ubah harga di sini. Perubahan dikirim ke kedua marketplace.' },
    ],
    pic_keuangan: [
      { route: 'keuangan', sel: '.kpis', title: 'Buku kas yang terisi otomatis', body: 'Penjualan dan biaya platform tercatat saat pesanan diserahkan ke kurir, sedangkan biaya produksi tercatat saat barang masuk.' },
      { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi', body: 'Tiga pemeriksaan berjalan otomatis. Jika ada selisih, baris yang bermasalah ditampilkan di sini.' },
      { route: 'keuangan', sel: '[data-act="add"]', title: 'Entri manual', body: 'Gunakan hanya untuk transaksi di luar stok dan pesanan, seperti gaji atau biaya iklan.' },
    ],
    staf: [
      { route: 'pesanan', sel: '[data-a="check"]', fallback: '.tabs', title: 'Cek fisik', body: 'Setelah barang diambil dari rak dan dicocokkan, tekan Cek fisik. PIC Gudang akan melihat pesanan mana yang siap dikirim.' },
      { route: 'stok', sel: '[data-report="stok"]', title: 'Laporkan selisih stok', body: 'Jika jumlah di rak berbeda dengan sistem, kirim laporan. PIC Gudang dan Owner langsung melihatnya di daftar Perlu perhatian.' },
    ],
    staf_admin: [
      { route: 'pesanan', sel: '.tabs', title: 'Antrean pesanan', body: 'Gunakan antrean ini untuk menjawab pertanyaan pembeli: status, kurir, dan resi sama persis dengan yang tampil di marketplace.' },
      { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Stok yang sama dengan listing', body: 'Angka stok di sini adalah angka yang tampil di Shopee dan Tokopedia. Anda dapat memastikan ketersediaan ukuran sebelum menjawab pembeli.' },
      { route: 'pesanan', sel: '[data-report="pesanan"]', title: 'Laporkan kendala', body: 'Jika pembeli meminta perubahan, atau listing perlu diperbaiki, kirim laporan ke PIC Admin Toko. Anda tidak perlu mengubah data sendiri.' },
    ],
    staf_keuangan: [
      { route: 'keuangan', sel: '.kpis', title: 'Buku kas', body: 'Anda dapat melihat saldo, arus kas, dan seluruh entri. Penjualan dan biaya tercatat otomatis dari pesanan dan barang masuk.' },
      { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi', body: 'Pastikan ketiga pemeriksaan bertanda hijau. Jika ada tanda merah, catat baris yang bermasalah.' },
      { route: 'keuangan', sel: '[data-report="kas"]', title: 'Laporkan selisih kas', body: 'Jika saldo atau entri berbeda dengan rekening, kirim laporan ke PIC Keuangan beserta perkiraan nominalnya.' },
    ],
  };

  const tour = (FX.tour = { active: false });

  tour.steps = function (role) {
    return COMMON_START.concat(ROLE_STEPS[role] || [], COMMON_END);
  };

  /** Start a guide. Without arguments: the role guide. With steps: a module practice guide. */
  tour.start = function (customSteps, opts) {
    opts = opts || {};
    if (tour.active) tour.stop();
    FX.ui.closeDrawer();
    const allowed = FX.store.SCREENS[FX.store.role];
    const steps = (customSteps || tour.steps(FX.store.role)).filter((st) => !st.route || allowed.includes(st.route));
    if (!steps.length) return FX.ui.toast('Praktik modul ini memakai halaman yang tidak tersedia untuk peran Anda.', 'bad', 'Panduan');
    tour.active = true;
    let i = 0;
    const spot = document.createElement('div');
    spot.className = 'tour-spot';
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'tour-title');
    const block = document.createElement('div');
    block.className = 'tour-block';
    document.body.append(block, spot, card);
    let target = null;
    let timer = null;

    function find(step) {
      return document.querySelector(step.sel) || (step.fallback && document.querySelector(step.fallback));
    }
    function place() {
      if (!target || !document.body.contains(target)) target = find(steps[i]);
      if (!target) return;
      const r = target.getBoundingClientRect();
      const pad = 6;
      spot.style.transform = 'translate(' + (r.left - pad) + 'px,' + (r.top - pad) + 'px)';
      spot.style.width = r.width + pad * 2 + 'px';
      spot.style.height = r.height + pad * 2 + 'px';
      const cw = card.offsetWidth, ch = card.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 14;
      let top = r.bottom + gap;
      if (top + ch > vh - 12) top = r.top - gap - ch;          // above if no room below
      if (top < 12) top = Math.min(vh - ch - 12, Math.max(12, r.top + 12)); // overlap as last resort
      let left = r.left;
      if (r.width < cw) left = r.left + r.width / 2 - cw / 2;
      left = Math.max(12, Math.min(left, vw - cw - 12));
      card.style.transform = 'translate(' + left + 'px,' + top + 'px)';
    }
    function show(n) {
      i = n;
      const step = steps[i];
      if (step.route && FX.app.screen !== step.route) FX.app.go(step.route);
      setTimeout(() => {
        target = find(step);
        if (!target) {
          // the element is not on screen for this role/state: skip forward
          if (i < steps.length - 1) return show(i + 1);
          return stop();
        }
        target.scrollIntoView({ block: 'center', behavior: 'instant' in window ? 'instant' : 'auto' });
        card.innerHTML =
          '<div class="tour-step">' + esc(opts.label || 'Panduan') + ' · langkah ' + (i + 1) + ' dari ' + steps.length + '</div>' +
          '<h3 id="tour-title">' + esc(step.title) + '</h3><p>' + esc(step.body) + '</p>' +
          '<div class="tour-progress" aria-hidden="true"><span style="transform:scaleX(' + ((i + 1) / steps.length).toFixed(3) + ')"></span></div>' +
          '<div class="tour-actions"><button class="btn ghost sm" data-t="stop">Tutup panduan</button><span style="flex:1"></span>' +
          (i > 0 ? '<button class="btn sm" data-t="back">Kembali</button>' : '') +
          '<button class="btn primary sm" data-t="next">' + (i === steps.length - 1 ? 'Selesai' : 'Lanjut') + '</button></div>';
        card.querySelector('[data-t="stop"]').onclick = () => stop();
        const back = card.querySelector('[data-t="back"]');
        if (back) back.onclick = () => show(i - 1);
        card.querySelector('[data-t="next"]').onclick = () => (i === steps.length - 1 ? stop(true) : show(i + 1));
        place();
        card.querySelector('[data-t="next"]').focus({ preventScroll: true });
      }, step.route ? 80 : 0);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); stop(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); i === steps.length - 1 ? stop(true) : show(i + 1); }
      if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); show(i - 1); }
    }
    function stop(finished) {
      if (!tour.active) return;
      tour.active = false;
      clearInterval(timer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      [spot, card, block].forEach((n) => n.remove());
      if (finished) {
        if (opts.onFinish) opts.onFinish();
        FX.ui.toast(opts.doneText || 'Panduan selesai. Modul belajar lengkap tersedia di menu Panduan.', '', 'Panduan');
      }
    }
    tour.stop = stop;
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    timer = setInterval(place, 400); // background re-renders can move the target
    show(0);
  };

  /** First sign-in on this browser for this account: offer the tour once. */
  tour.maybeWelcome = function (arrivals) {
    const acc = FX.auth.account();
    if (!acc) return false;
    const k = 'fluxora.welcomed.' + acc.email;
    try {
      if (localStorage.getItem(k)) return false;
      localStorage.setItem(k, '1');
    } catch (e) {
      if (tour._welcomed) return false;
    }
    tour._welcomed = true;
    const d = FX.ui.drawer({
      title: 'Selamat datang, ' + esc(acc.name),
      sub: 'Baru pertama kali menggunakan Fluxora?',
      body:
        '<div style="display:flex;gap:var(--space-4);align-items:center">' + FX.logo(56) + '<p class="ink2" style="margin:0">Panduan interaktif (kurang dari satu menit) akan menunjukkan bagian aplikasi yang Anda gunakan sebagai <b>' + esc(FX.store.ROLES[acc.role].label) + '</b>. Anda dapat menutupnya kapan saja.</p></div>' +
        '<div class="callout">Modul belajar, langkah per tugas, daftar istilah, dan tanya jawab tersedia di menu <b>Panduan</b>.</div>' +
        (arrivals ? '<div><div class="lbl" style="margin-bottom:var(--space-3)">Sementara itu, pesanan baru sudah masuk</div>' + FX.arrivals.summaryHtml(arrivals) + '</div>' : ''),
      foot: '<button class="btn" data-close>Nanti saja</button><button class="btn primary" id="tour-go">Mulai panduan</button>',
    });
    d.querySelector('#tour-go').onclick = () => {
      FX.ui.closeDrawer();
      tour.start();
    };
    return true;
  };
})();
