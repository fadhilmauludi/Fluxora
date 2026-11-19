/* Guided tour: spotlights real elements of the interface, one step at a time,
   with steps written per role. Offered once per account on first sign-in and
   always available from Panduan. Keyboard: → / Enter next, ← back, Esc close. */
(function () {
  const FX = window.FX;
  const esc = FX.esc;

  const COMMON_START = [
    { route: null, sel: '.nav', title: 'Menu sesuai peran', body: 'Menu kiri hanya menampilkan layar yang boleh Anda pakai. Angka merah berarti ada yang perlu segera ditangani.' },
    { route: null, sel: '.sim', title: 'Simulasi pesanan', body: 'Di prototipe ini pesanan Shopee dan Tokopedia dibuat dengan tombol ini. Coba “Pesanan Shopee” lalu lihat stok dan listing kedua kanal berubah bersamaan.' },
    { route: null, sel: '.bell', title: 'Perlu perhatian', body: 'Batas serah kurir, stok menipis, rekomendasi PO, dan laporan staf terkumpul di sini. Klik salah satu untuk langsung menuju layarnya.' },
  ];
  const COMMON_END = [
    { route: null, sel: '.user-card', title: 'Akun Anda', body: 'Nama Anda tercatat di setiap perubahan. Keluar lewat ikon di kanan. Panduan dan tur ini selalu ada di menu Panduan.' },
  ];

  const ROLE_STEPS = {
    owner: [
      { route: 'ringkasan', sel: '.kpis', title: 'Kondisi bisnis hari ini', body: 'Kas, omzet 30 hari, nilai stok, pesanan yang harus dikirim, dan berapa kali overselling dicegah. Semua dihitung dari kejadian nyata, bukan input ulang.' },
      { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Stok per ukuran', body: 'Satu angka per model dan ukuran, dipakai Shopee dan Tokopedia sekaligus. Kotak kuning berarti menipis, merah berarti habis dan listing otomatis 0.' },
      { route: 'forecast', sel: '[data-po]', fallback: '.panel', title: 'Keputusan produksi', body: 'Forecast menghitung berapa yang perlu dipesan ke maklon, dengan sebaran ukuran. Tombol ini mengisi PO otomatis. Anda tetap bisa mengubah angkanya.' },
      { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi otomatis', body: 'Stok, pesanan, dan kas dicocokkan setiap ada kejadian. Selama tanda centang hijau, tidak ada selisih yang perlu dicari di akhir bulan.' },
    ],
    pic_gudang: [
      { route: 'stok', sel: '.matrix tbody tr:first-child', title: 'Stok per ukuran', body: 'Klik baris untuk membuka detail. Setelah opname, ubah angka di sana; Shopee dan Tokopedia langsung mengikuti.' },
      { route: 'masuk', sel: '[data-recv]', fallback: '[data-act="free"]', title: 'Terima barang dari maklon', body: 'Saat barang datang, tekan Terima, hitung fisik per ukuran, lalu simpan. Stok bertambah dan biaya produksi masuk buku kas otomatis.' },
      { route: 'pesanan', sel: '.tabs', title: 'Antrean pesanan', body: 'Pesanan dari dua marketplace ada di satu antrean, diurutkan dari batas serah kurir paling dekat.' },
      { route: 'pesanan', sel: '[data-a="ship"]', fallback: '.tabs', title: 'Serahkan ke kurir', body: 'Setelah dikemas, tekan Serahkan kurir. Resi dikirim ke marketplace dan penjualan tercatat di kas.' },
    ],
    pic_admin: [
      { route: 'pesanan', sel: '.tabs', title: 'Antrean pesanan', body: 'Tab memisahkan pesanan per status. Merah di kolom Batas serah berarti sudah lewat batas.' },
      { route: 'pesanan', sel: '[data-a="pack"]', fallback: '.tabs', title: 'Kemas', body: 'Tandai pesanan yang sedang dikemas. Untuk membatalkan, buka pesanannya; stok otomatis kembali ke kedua kanal.' },
      { route: 'pengaturan', sel: '[data-img]', title: 'Foto dan harga listing', body: 'Tempel URL foto produk dari Shopee dan ubah harga di sini. Perubahan dikirim ke kedua marketplace.' },
    ],
    pic_keuangan: [
      { route: 'keuangan', sel: '.kpis', title: 'Buku kas yang terisi sendiri', body: 'Penjualan dan biaya platform tercatat saat pesanan diserahkan ke kurir; biaya produksi saat barang masuk.' },
      { route: 'keuangan', sel: '.check-row', title: 'Rekonsiliasi', body: 'Tiga pemeriksaan berjalan otomatis. Jika ada selisih, baris yang bermasalah ditulis di sini.' },
      { route: 'keuangan', sel: '[data-act="add"]', title: 'Entri manual', body: 'Hanya untuk transaksi di luar stok dan pesanan, seperti gaji atau iklan.' },
    ],
    staf: [
      { route: 'pesanan', sel: '[data-a="check"]', fallback: '.tabs', title: 'Cek fisik', body: 'Setelah barang diambil dari rak dan dicocokkan, tekan Cek fisik. PIC akan melihat pesanan mana yang siap dikirim.' },
      { route: 'stok', sel: '[data-act="report"]', title: 'Laporkan selisih', body: 'Jika jumlah di rak berbeda dengan sistem, kirim laporan. PIC Gudang dan Owner langsung melihatnya di daftar perhatian.' },
    ],
  };

  const tour = (FX.tour = { active: false });

  tour.steps = function (role) {
    return COMMON_START.concat(ROLE_STEPS[role] || [], COMMON_END);
  };

  tour.start = function () {
    if (tour.active) tour.stop();
    FX.ui.closeDrawer();
    const steps = tour.steps(FX.store.role);
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
          '<div class="tour-step">Langkah ' + (i + 1) + ' dari ' + steps.length + '</div>' +
          '<h3 id="tour-title">' + esc(step.title) + '</h3><p>' + esc(step.body) + '</p>' +
          '<div class="tour-progress" aria-hidden="true"><span style="transform:scaleX(' + ((i + 1) / steps.length).toFixed(3) + ')"></span></div>' +
          '<div class="tour-actions"><button class="btn ghost sm" data-t="stop">Tutup tur</button><span style="flex:1"></span>' +
          (i > 0 ? '<button class="btn sm" data-t="back">Kembali</button>' : '') +
          '<button class="btn primary sm" data-t="next">' + (i === steps.length - 1 ? 'Selesai' : 'Lanjut') + '</button></div>';
        card.querySelector('[data-t="stop"]').onclick = stop;
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
      if (finished) FX.ui.toast('Tur selesai. Buka menu Panduan kapan saja untuk langkah-langkah lengkap.', '', 'Panduan');
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
      sub: 'Baru pertama kali di Fluxora?',
      body:
        '<div style="display:flex;gap:var(--space-4);align-items:center">' + FX.logo(56) + '<p class="ink2" style="margin:0">Tur singkat (kurang dari satu menit) menunjukkan bagian yang Anda pakai sebagai <b>' + esc(FX.store.ROLES[acc.role].label) + '</b>. Anda bisa menutupnya kapan saja.</p></div>' +
        '<div class="callout">Langkah lengkap, istilah, dan tanya-jawab ada di menu <b>Panduan</b>.</div>' +
        (arrivals ? '<div><div class="lbl" style="margin-bottom:var(--space-3)">Sementara itu, pesanan sudah masuk</div>' + FX.arrivals.summaryHtml(arrivals) + '</div>' : ''),
      foot: '<button class="btn" data-close>Nanti saja</button><button class="btn primary" id="tour-go">Mulai tur</button>',
    });
    d.querySelector('#tour-go').onclick = () => {
      FX.ui.closeDrawer();
      tour.start();
    };
    return true;
  };
})();
