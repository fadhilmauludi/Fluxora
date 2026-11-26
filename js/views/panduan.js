/* Panduan — learning modules, the interactive guide, the daily flow, step-by-step
   tasks per role, glossary and FAQ. Written for Beckycoo's team, not developers. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let roleTab = null;
  let lastRole = null;

  // The day in Fluxora, in the order it actually happens.
  const FLOW = [
    { who: 'Otomatis', title: 'Pesanan masuk', body: 'Pesanan dari Shopee atau Tokopedia langsung mengurangi stok, dan angka terbaru dikirim ke marketplace lainnya. Jika stok sudah 0, checkout otomatis ditolak.', go: 'pesanan' },
    { who: 'Staf Gudang', title: 'Ambil barang dan cek fisik', body: 'Cocokkan barang di rak dengan pesanan, lalu tekan Cek fisik.', go: 'pesanan' },
    { who: 'PIC Gudang', title: 'Kemas dan serahkan ke kurir', body: 'Kerjakan dari atas, karena antrean diurutkan dari batas serah kurir terdekat. Serahkan kurir mengirim resi dan mencatat penjualan.', go: 'pesanan' },
    { who: 'Otomatis', title: 'Kas tercatat', body: 'Penjualan dan biaya layanan marketplace masuk ke buku kas tanpa diketik ulang. Rekonsiliasi berjalan setiap kali ada transaksi.', go: 'keuangan' },
    { who: 'Owner', title: 'Putuskan produksi', body: 'Forecast menandai model yang sudah mencapai titik pesan. Buat PO ke maklon langsung dari rekomendasinya.', go: 'forecast' },
    { who: 'PIC Gudang', title: 'Terima barang dari maklon', body: 'Hitung fisik per ukuran, lalu simpan. Stok bertambah di kedua marketplace dan biaya produksi tercatat.', go: 'masuk' },
  ];

  // Step-by-step tasks. `roles` = who can do it.
  const TASKS = [
    { id: 'kirim', title: 'Menyerahkan pesanan ke kurir', roles: ['owner', 'pic_gudang'], go: 'pesanan', steps: ['Buka Pesanan, tab Perlu dikemas.', 'Mulai dari baris paling atas (batas serah paling dekat). Warna merah berarti batasnya sudah lewat.', 'Tekan Kemas saat mulai mengemas, lalu Serahkan kurir saat paket diambil.', 'Resi terkirim ke marketplace dan penjualan masuk ke Keuangan. Tidak perlu dicatat ulang.'] },
    { id: 'cek', title: 'Menandai pesanan sudah dicek fisik', roles: ['staf'], go: 'pesanan', steps: ['Buka Pesanan, tab Perlu dikemas.', 'Ambil barang dari rak sesuai model dan ukuran.', 'Tekan Cek fisik pada pesanan tersebut. Tanda "Sudah dicek" akan terlihat oleh PIC Gudang.'] },
    { id: 'lapor', title: 'Melaporkan selisih stok', roles: ['staf'], go: 'stok', steps: ['Buka Stok, lalu tekan Laporkan selisih stok.', 'Pilih model dan ukuran, isi hasil hitung fisik, dan tambahkan keterangan.', 'Kirim laporan. PIC Gudang dan Owner melihatnya di daftar Perlu perhatian.'] },
    { id: 'jawab', title: 'Menjawab pertanyaan pembeli', roles: ['staf_admin'], go: 'pesanan', steps: ['Buka Pesanan dan cari pesanan pembeli tersebut (gunakan filter kanal bila perlu).', 'Klik pesanannya untuk melihat status, kurir, batas serah, dan nomor resi.', 'Untuk pertanyaan ketersediaan ukuran, buka Stok. Angkanya sama dengan yang tampil di marketplace.'] },
    { id: 'kendala', title: 'Melaporkan kendala pesanan atau listing', roles: ['staf_admin'], go: 'pesanan', steps: ['Buka Pesanan, lalu tekan Laporkan kendala pesanan.', 'Pilih pesanan terkait (jika ada) dan jenis kendalanya.', 'Tuliskan keterangan singkat, lalu kirim. PIC Admin Toko akan menindaklanjuti dan menandainya selesai.'] },
    { id: 'periksa-kas', title: 'Memeriksa buku kas harian', roles: ['staf_keuangan', 'pic_keuangan'], go: 'keuangan', steps: ['Buka Keuangan dan pilih rentang 7 hari.', 'Cocokkan entri penjualan dan biaya platform dengan laporan pencairan dari marketplace.', 'Pastikan ketiga pemeriksaan rekonsiliasi bertanda hijau.'] },
    { id: 'lapor-kas', title: 'Melaporkan selisih kas', roles: ['staf_keuangan'], go: 'keuangan', steps: ['Buka Keuangan, lalu tekan Laporkan selisih kas.', 'Pilih jenis selisih dan isi perkiraan nominalnya.', 'Tambahkan keterangan, lalu kirim. PIC Keuangan akan memeriksa dan menindaklanjutinya.'] },
    { id: 'masuk', title: 'Mencatat barang masuk dari maklon', roles: ['owner', 'pic_gudang'], go: 'masuk', steps: ['Buka Barang masuk. PO yang sedang diproduksi tampil di bagian atas.', 'Tekan Terima pada PO yang datang (atau Barang masuk tanpa PO jika tidak ada PO-nya).', 'Isi jumlah hasil hitung fisik per ukuran. Ubah jika berbeda dari jumlah pesanan.', 'Periksa ringkasan "Yang akan terjadi", lalu tekan Simpan barang masuk.'] },
    { id: 'opname', title: 'Mengoreksi stok setelah opname', roles: ['owner', 'pic_gudang'], go: 'stok', steps: ['Buka Stok dan klik baris model yang dihitung.', 'Di panel detail, ganti angka Gudang per ukuran dengan hasil hitung fisik.', 'Tuliskan alasan koreksi (misalnya "1 pcs cacat"), lalu tekan Simpan hasil opname.', 'Selisihnya tercatat di Aktivitas dan listing di kedua marketplace ikut berubah.'] },
    { id: 'tindak', title: 'Menindaklanjuti laporan staf', roles: ['owner', 'pic_gudang', 'pic_admin', 'pic_keuangan'], go: 'stok', steps: ['Buka daftar Perlu perhatian (ikon lonceng) atau halaman tempat laporan masuk.', 'Periksa kondisi yang dilaporkan, lalu lakukan koreksi bila diperlukan.', 'Tekan Tandai selesai. Kejadian ini tercatat di Aktivitas.'] },
    { id: 'po', title: 'Membuat PO ke maklon', roles: ['owner'], go: 'forecast', steps: ['Buka Forecast. Model berlabel "pesan" sudah mencapai titik pesan.', 'Pilih model untuk melihat perhitungan dan sebaran ukurannya.', 'Tekan Buat PO. Jumlah per ukuran sudah terisi; sesuaikan bila perlu.', 'Pilih maklon, periksa dampaknya ke kas, lalu tekan Kirim PO. Forecast langsung menghitungnya sebagai stok dalam perjalanan.'] },
    { id: 'batal', title: 'Membatalkan pesanan', roles: ['owner', 'pic_admin'], go: 'pesanan', steps: ['Buka Pesanan dan klik pesanan yang dimaksud.', 'Pilih alasan pembatalan di bagian bawah panel detail.', 'Tekan Batalkan pesanan. Stok kembali ke kedua marketplace secara otomatis.'] },
    { id: 'listing', title: 'Mengganti foto atau harga produk', roles: ['owner', 'pic_admin'], go: 'pengaturan', steps: ['Buka Pengaturan, bagian Foto dan listing produk.', 'Di Shopee, klik kanan foto produk, lalu pilih Salin alamat gambar. Tempel pada kolom URL foto.', 'Ubah harga bila perlu, lalu tekan Simpan. Listing di kedua marketplace diperbarui.'] },
    { id: 'kas', title: 'Mencatat pengeluaran di luar stok', roles: ['owner', 'pic_keuangan'], go: 'keuangan', steps: ['Buka Keuangan, lalu tekan Entri manual.', 'Pilih jenis dan kategori, lalu isi jumlah dan keterangan.', 'Simpan. Penjualan, biaya platform, dan biaya produksi tidak perlu diinput karena sudah tercatat otomatis.'] },
    { id: 'rekon', title: 'Memeriksa rekonsiliasi', roles: ['owner', 'pic_keuangan'], go: 'keuangan', steps: ['Buka Keuangan, panel Rekonsiliasi otomatis.', 'Centang hijau pada ketiga baris berarti stok, pesanan, dan kas sudah cocok.', 'Jika ada tanda merah, baris yang bermasalah ditampilkan di bawah judulnya. Laporkan kepada Owner.'] },
  ];

  const GLOSSARY = [
    ['Maklon', 'Vendor pihak ketiga yang menjahit dan memproduksi pakaian berdasarkan desain Beckycoo.'],
    ['PO (purchase order)', 'Pesanan produksi ke maklon: model, jumlah per ukuran, HPP, dan perkiraan tanggal tiba.'],
    ['Opname', 'Penghitungan fisik stok di gudang untuk dicocokkan dengan angka di sistem.'],
    ['Batas serah kurir', 'Waktu terakhir paket harus diserahkan ke kurir. Jika terlewat, marketplace dapat membatalkan pesanan.'],
    ['Overselling', 'Barang terjual melebihi stok yang ada. Fluxora mencegahnya dengan memakai satu angka stok untuk semua marketplace.'],
    ['Titik pesan', 'Batas stok (ditambah barang dalam perjalanan) yang menandakan saatnya membuat PO agar tidak kehabisan selama waktu produksi.'],
    ['Safety stock', 'Stok cadangan untuk mengantisipasi naik turunnya penjualan.'],
    ['HPP', 'Harga pokok produksi per pcs yang dibayarkan ke maklon.'],
    ['MOQ', 'Jumlah minimum per model yang bersedia diproduksi maklon.'],
    ['Tanggal kembar', 'Promo seperti 11.11 dan 12.12 yang membuat penjualan melonjak. Forecast memperhitungkannya.'],
    ['Mode lihat', 'Tampilan untuk Staf: data dapat dilihat dan divalidasi, tetapi perubahan dilakukan oleh PIC.'],
    ['Data simulasi', 'Data contoh dari satu berkas terpusat yang dipakai selama uji coba, bukan data toko yang sebenarnya.'],
  ];

  const FAQ = [
    ['Mengapa ada checkout yang ditolak otomatis?', 'Stok ukuran tersebut sudah 0 di gudang, sehingga listing di kedua marketplace juga 0. Pembeli tidak dapat membeli barang yang tidak tersedia, jadi tidak ada pesanan yang harus dibatalkan sepihak.'],
    ['Mengapa listing Shopee dan Tokopedia selalu sama?', 'Keduanya membaca satu angka stok gudang. Setiap pesanan, pembatalan, barang masuk, atau koreksi langsung dikirim ke kedua marketplace.'],
    ['Saya tidak melihat menu tertentu.', 'Menu mengikuti peran akun. Misalnya, Staf Admin Toko hanya melihat Pesanan, Stok, dan Panduan. Hubungi Owner jika memerlukan akses lain.'],
    ['Apakah data ini data toko Beckycoo yang sebenarnya?', 'Belum. Selama uji coba, Fluxora memakai data simulasi dari satu berkas terpusat. Setiap browser memulai dengan angka yang sama, dan perubahan selama demo dapat dikembalikan ke kondisi awal.'],
    ['Apakah data tetap tersimpan jika browser ditutup?', 'Ya, perubahan selama demo tersimpan di browser yang Anda gunakan. Versi produksi akan menyimpannya di server bersama sehingga dapat diakses dari perangkat mana pun.'],
    ['Mengapa ada pesanan baru setiap kali saya masuk?', 'Untuk keperluan simulasi, setiap kali masuk Fluxora memutar pesanan Shopee dan Tokopedia yang masuk sejak Anda terakhir membuka aplikasi. Jumlahnya bertambah 1 sampai 2 setiap kali masuk, dimulai dari 3. Owner dapat mematikan fitur ini atau mengatur batasnya di Pengaturan.'],
    ['Lupa kata sandi?', 'Pada versi simulasi, semua akun memakai kata sandi beckycoo.'],
  ];

  // ----------------------------------------------------------- progress
  function progressKey() {
    const acc = FX.auth.account();
    return 'fluxora.modules.' + (acc ? acc.email : 'tamu');
  }
  let memProgress = {};
  function progress() {
    try {
      return JSON.parse(localStorage.getItem(progressKey()) || '{}');
    } catch (e) {
      return memProgress;
    }
  }
  function saveProgress(p) {
    memProgress = p;
    try {
      localStorage.setItem(progressKey(), JSON.stringify(p));
    } catch (e) {}
  }

  function forMe(m) {
    return m.roles.includes(S.role);
  }
  function usable(m) {
    return !m.screens || m.screens.every((x) => S.SCREENS[S.role].includes(x));
  }
  function roleLabel(r) {
    return S.ROLES[r].label;
  }

  FX.views.panduan = {
    render() {
      const me = S.role;
      if (!roleTab || lastRole !== me) roleTab = me;
      lastRole = me;
      const mine = (t) => S.can('*') || t.roles.includes(me);
      const prog = progress();
      const myMods = FX.MODULES.filter(forMe);
      const doneMine = myMods.filter((m) => prog[m.id] && prog[m.id].done).length;
      const pct = myMods.length ? Math.round((doneMine / myMods.length) * 100) : 0;
      const ordered = FX.MODULES.filter(forMe).concat(FX.MODULES.filter((m) => !forMe(m)));

      return (
        '<section class="panel guide-hero"><div class="guide-hero-b">' +
        '<div class="guide-hero-mark">' + FX.logo(72) + '</div>' +
        '<div style="flex:1;min-width:260px"><h2 class="guide-h">Panduan Fluxora</h2>' +
        '<p class="ink2" style="margin:var(--space-2) 0 0;max-width:62ch">Pelajari Fluxora melalui modul singkat yang disusun untuk peran Anda sebagai <b>' + esc(roleLabel(me)) + '</b>. Setiap modul berisi penjelasan, praktik langsung di layar, dan satu pertanyaan untuk memastikan pemahaman.</p>' +
        '<div class="mod-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + myMods.length + '" aria-valuenow="' + doneMine + '" aria-label="Kemajuan modul"><span style="width:' + pct + '%"></span></div>' +
        '<div class="mod-progress-t">' + doneMine + ' dari ' + myMods.length + ' modul untuk peran Anda telah selesai</div></div>' +
        '<div class="btns"><button class="btn" id="replay-intro">Putar intro</button><button class="btn primary" id="start-guide">' + ui.icon('play', 15) + 'Mulai panduan interaktif</button></div>' +
        '</div></section>' +

        '<section class="panel"><div class="panel-h"><h2>Modul belajar</h2><span class="meta">disarankan untuk peran Anda ditampilkan lebih dulu</span></div>' +
        '<div class="mods">' +
        ordered
          .map((m, i) => {
            const p = prog[m.id] || {};
            const status = p.done ? '<span class="lvl good">' + ui.icon('check', 13) + 'Selesai</span>' : !forMe(m) ? '<span class="lvl neutral">Peran lain</span>' : p.opened ? '<span class="lvl info">Sedang dipelajari</span>' : '<span class="lvl neutral">Belum dimulai</span>';
            const no = FX.MODULES.indexOf(m) + 1;
            return (
              '<button type="button" class="mod' + (forMe(m) ? '' : ' other') + (p.done ? ' done' : '') + '" data-mod="' + m.id + '">' +
              '<span class="mod-top"><span class="mod-no">Modul ' + no + '</span><span class="mod-min">' + m.minutes + ' menit</span></span>' +
              '<span class="mod-t">' + esc(m.title) + '</span>' +
              '<span class="mod-s">' + esc(m.summary) + '</span>' +
              '<span class="mod-foot">' + status + '<span class="mod-open">Buka modul ' + ui.icon('chev', 14) + '</span></span>' +
              '</button>'
            );
          })
          .join('') +
        '</div></section>' +

        '<section class="panel"><div class="panel-h"><h2>Alur satu hari di Fluxora</h2><span class="meta">urutan kerja dari pesanan masuk sampai barang baru datang</span></div>' +
        '<ol class="flow">' +
        FLOW.map((f, i) =>
          '<li class="flow-i"><span class="flow-n">' + (i + 1) + '</span><div><div class="flow-who">' + esc(f.who) + '</div><div class="ttl">' + esc(f.title) + '</div><div class="body">' + esc(f.body) + '</div>' +
          (S.SCREENS[me].includes(f.go) ? '<a class="flow-go" href="#' + f.go + '" data-go="' + f.go + '">Buka ' + esc(goLabel(f.go)) + '</a>' : '') + '</div></li>').join('') +
        '</ol></section>' +

        '<section class="panel"><div class="panel-h"><h2>Langkah per tugas</h2><span class="spacer"></span>' +
        '<label class="role-pick"><span>Tampilkan untuk</span><select id="task-role">' + Object.keys(S.ROLES).map((r) => '<option value="' + r + '"' + (roleTab === r ? ' selected' : '') + '>' + esc(roleLabel(r)) + (r === me ? ' (Anda)' : '') + '</option>').join('') + '</select></label></div>' +
        '<div class="tasks">' +
        (TASKS.filter((t) => t.roles.includes(roleTab))
          .map((t, idx) =>
            '<details class="task"' + (idx === 0 ? ' open' : '') + '><summary><span class="task-t">' + esc(t.title) + '</span>' + (mine(t) ? '' : '<span class="lvl neutral">' + ui.icon('eye', 13) + 'peran lain</span>') + '<span class="task-chev">' + ui.icon('chev', 16) + '</span></summary>' +
            '<ol class="task-steps">' + t.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
            (mine(t) && S.SCREENS[me].includes(t.go) ? '<div class="task-foot"><a class="btn sm" href="#' + t.go + '" data-go="' + t.go + '">Buka ' + esc(goLabel(t.go)) + '</a></div>' : '') +
            '</details>')
          .join('') || '<div class="empty">Belum ada langkah tertulis untuk peran ini.</div>') +
        '</div></section>' +

        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Istilah</h2></div><dl class="gloss">' + GLOSSARY.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl></section>' +
        '<section class="panel"><div class="panel-h"><h2>Tanya jawab</h2></div><div class="tasks">' + FAQ.map(([q, a]) => '<details class="task"><summary><span class="task-t">' + esc(q) + '</span><span class="task-chev">' + ui.icon('chev', 16) + '</span></summary><p class="faq-a">' + esc(a) + '</p></details>').join('') + '</div></section>' +
        '</div>'
      );
    },
    mount(el) {
      el.querySelector('#start-guide').onclick = () => FX.tour.start();
      el.querySelector('#replay-intro').onclick = () => FX.intro.play();
      el.querySelector('#task-role').onchange = (e) => ((roleTab = e.target.value), FX.app.render());
      el.querySelectorAll('[data-mod]').forEach((b) => (b.onclick = () => openModule(b.dataset.mod)));
    },
  };

  function openModule(id) {
    const m = FX.MODULES.find((x) => x.id === id);
    const no = FX.MODULES.indexOf(m) + 1;
    const prog = progress();
    prog[m.id] = Object.assign({}, prog[m.id], { opened: Date.now() });
    saveProgress(prog);
    const p = prog[m.id];
    const can = usable(m);
    const body =
      (!forMe(m) ? '<div class="callout">Modul ini ditujukan untuk ' + esc(m.roles.map(roleLabel).join(', ')) + '. Anda tetap dapat membacanya sebagai pengetahuan umum.</div>' : '') +
      '<p class="ink2" style="margin:0">' + esc(m.summary) + '</p>' +
      '<div><div class="lbl" style="margin-bottom:var(--space-2)">Setelah modul ini, Anda dapat</div><ul class="mod-goals">' + m.goals.map((g) => '<li>' + ui.icon('check', 14) + '<span>' + esc(g) + '</span></li>').join('') + '</ul></div>' +
      '<div><div class="lbl" style="margin-bottom:var(--space-2)">Materi</div><ol class="mod-lessons">' + m.lessons.map(([t, b]) => '<li><div class="ttl">' + esc(t) + '</div><div class="body">' + esc(b) + '</div></li>').join('') + '</ol></div>' +
      '<div class="mod-practice"><div><div class="ttl">Praktik langsung</div><div class="body">' + (can ? 'Panduan interaktif akan menyorot bagian layar yang dibahas di modul ini, satu per satu.' : 'Praktik modul ini memakai halaman yang tidak tersedia untuk peran Anda.') + (p.practiced ? ' <b>Sudah dipraktikkan.</b>' : '') + '</div></div>' +
      (can ? '<button class="btn" id="mod-practice">' + ui.icon('play', 15) + 'Mulai praktik</button>' : '') + '</div>' +
      '<fieldset class="mod-quiz"><legend>Cek pemahaman</legend><div class="ttl">' + esc(m.quiz.q) + '</div>' +
      m.quiz.options.map((o, i) => '<label class="quiz-opt"><input type="radio" name="quiz" value="' + i + '"' + (p.quiz && i === m.quiz.answer ? ' checked' : '') + '><span>' + esc(o) + '</span></label>').join('') +
      '<div class="quiz-msg" id="quiz-msg" aria-live="polite">' + (p.quiz ? '<span class="good">Benar. ' + esc(m.quiz.why) + '</span>' : '') + '</div></fieldset>';
    const d = ui.drawer({
      title: 'Modul ' + no + ': ' + esc(m.title),
      sub: m.minutes + ' menit · ' + m.lessons.length + ' materi · ' + (p.done ? 'selesai' : 'belum selesai'),
      wide: true,
      body,
      foot: '<button class="btn" data-close>Tutup</button><span style="flex:1"></span><button class="btn" id="quiz-check">Periksa jawaban</button><button class="btn primary" id="mod-done"' + (p.quiz ? '' : ' disabled') + '>' + (p.done ? 'Modul sudah selesai' : 'Tandai modul selesai') + '</button>',
    });
    const done = d.querySelector('#mod-done');
    d.querySelector('#quiz-check').onclick = () => {
      const pick = d.querySelector('input[name="quiz"]:checked');
      const msg = d.querySelector('#quiz-msg');
      if (!pick) return (msg.innerHTML = '<span class="bad">Pilih salah satu jawaban terlebih dahulu.</span>');
      if (+pick.value === m.quiz.answer) {
        msg.innerHTML = '<span class="good">Benar. ' + esc(m.quiz.why) + '</span>';
        const pr = progress();
        pr[m.id] = Object.assign({}, pr[m.id], { quiz: true });
        saveProgress(pr);
        done.disabled = false;
      } else {
        msg.innerHTML = '<span class="bad">Belum tepat. Baca kembali materinya, lalu coba lagi.</span>';
      }
    };
    done.onclick = () => {
      const pr = progress();
      pr[m.id] = Object.assign({}, pr[m.id], { done: Date.now() });
      saveProgress(pr);
      ui.closeDrawer();
      ui.toast('Modul ' + no + ' selesai. Terima kasih telah menyelesaikannya.', '', 'Panduan');
      FX.app.render();
    };
    const pb = d.querySelector('#mod-practice');
    if (pb)
      pb.onclick = () =>
        FX.tour.start(m.practice, {
          label: 'Praktik modul ' + no,
          doneText: 'Praktik selesai. Kembali ke Panduan untuk menjawab pertanyaan dan menyelesaikan modul.',
          onFinish() {
            const pr = progress();
            pr[m.id] = Object.assign({}, pr[m.id], { practiced: Date.now() });
            saveProgress(pr);
            FX.app.go('panduan');
            setTimeout(() => openModule(m.id), 120);
          },
        });
  }

  function goLabel(k) {
    return { pesanan: 'Pesanan', keuangan: 'Keuangan', forecast: 'Forecast', masuk: 'Barang masuk', stok: 'Stok', pengaturan: 'Pengaturan' }[k] || k;
  }
})();
