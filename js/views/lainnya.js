/* Aktivitas (audit + sync log) and Pengaturan (parameters, photos, access). */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let seenSync = null;

  FX.views.aktivitas = {
    render() {
      const st = S.state;
      const newest = st.sync[0] && st.sync[0].id;
      const fresh = seenSync ? st.sync.slice(0, st.sync.findIndex((x) => x.id === seenSync)).map((x) => x.id) : [];
      seenSync = newest;
      return (
        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Jejak aktivitas</h2><span class="meta">siapa melakukan apa</span></div><div class="feed">' +
        st.activity
          .slice(0, 80)
          .map((a) => '<div class="feed-i ' + (a.kind === 'block' ? 'block' : '') + '"><span class="tm">' + FX.fmtTime(a.at) + '<br><span style="font-size:10.5px">' + FX.fmtDate(a.at) + '</span></span><span><b>' + esc(a.who) + '</b> — ' + esc(a.text) + '</span></div>')
          .join('') +
        '</div></section>' +
        '<section class="panel"><div class="panel-h"><h2>Log sinkronisasi</h2><span class="meta">setiap angka yang dikirim ke marketplace</span></div><div class="feed">' +
        st.sync
          .slice(0, 80)
          .map(
            (x) =>
              '<div class="feed-i ' + (x.kind === 'block' ? 'block ' : '') + (fresh.includes(x.id) ? 'new' : '') + '"><span class="tm">' + FX.fmtTime(x.at) + '</span><span>' +
              (x.channel === 'all' ? '<span class="ch all">Semua</span> ' : ui.ch(x.channel) + ' ') +
              '<span class="mono" style="font-size:12.5px">' + esc(x.text.replace(/^(Shopee|Tokopedia) /, '')) + '</span></span></div>',
          )
          .join('') +
        '</div></section></div>'
      );
    },
  };

  FX.views.pengaturan = {
    render() {
      const st = S.state;
      const set = st.settings;
      const owner = S.role === 'owner';
      const canEdit = S.can('product.edit');
      const perms = [
        ['Lihat stok & pesanan', 1, 1, 1, 1, 1],
        ['Cek fisik & lapor selisih', 1, 0, 0, 0, 1],
        ['Catat barang masuk / opname', 1, 1, 0, 0, 0],
        ['Kemas & serahkan ke kurir', 1, 1, 0, 0, 0],
        ['Batalkan pesanan', 1, 0, 1, 0, 0],
        ['Ubah listing & foto', 1, 0, 1, 0, 0],
        ['Entri kas manual', 1, 0, 0, 1, 0],
        ['Lihat keuangan', 1, 0, 0, 1, 0],
        ['Buat PO ke maklon', 1, 0, 0, 0, 0],
      ];
      return (
        '<section class="panel"><div class="panel-h"><h2>Foto & listing produk</h2><span class="meta">tempel URL gambar dari toko Shopee Beckycoo, atau path file di <span class="mono">assets/products/</span></span></div>' +
        '<div class="scroll-x"><table class="t"><thead><tr><th>Model</th><th>URL foto</th><th class="r">Harga jual</th><th class="r">HPP</th><th></th></tr></thead><tbody>' +
        st.products
          .map(
            (p) =>
              '<tr><td>' + ui.prod(p) + '</td>' +
              '<td style="min-width:280px"><input class="search" style="width:100%" data-img="' + p.id + '" placeholder="https://down-id.img.susercontent.com/file/…" value="' + esc(p.img) + '"' + (canEdit ? '' : ' disabled') + '></td>' +
              '<td class="r"><input class="search num" style="min-width:0;width:110px;text-align:right" data-price="' + p.id + '" type="number" step="1000" value="' + p.price + '"' + (canEdit ? '' : ' disabled') + '></td>' +
              '<td class="r num muted">' + FX.rp(p.cost) + '</td>' +
              '<td class="r">' + (canEdit ? '<button class="btn sm" data-save="' + p.id + '">Simpan</button>' : '') + '</td></tr>',
          )
          .join('') +
        '</tbody></table></div></section>' +

        (owner
          ? '<div class="grid g-2"><section class="panel"><div class="panel-h"><h2>Parameter forecast & stok</h2></div><div class="panel-b"><div class="form-grid">' +
            field('leadTimeDays', 'Waktu produksi maklon (hari)', set.leadTimeDays, 'Dari PO dikirim sampai barang di gudang') +
            field('reviewDays', 'Siklus tinjau PO (hari)', set.reviewDays, 'Seberapa sering Owner memutuskan PO') +
            field('serviceZ', 'Faktor layanan z', set.serviceZ, '1,28 ≈ 90%, 1,65 ≈ 95%, 2,05 ≈ 98% peluang tidak kehabisan', 0.01) +
            field('moq', 'MOQ maklon (pcs per model)', set.moq, '') +
            field('lowStock', 'Batas stok menipis', set.lowStock, 'Per ukuran') +
            '<label class="field"><span>Pesanan contoh saat masuk</span><select id="set-login"><option value="1"' + (set.loginOrders !== false ? ' selected' : '') + '>Aktif, bertambah tiap kali masuk</option><option value="0"' + (set.loginOrders === false ? ' selected' : '') + '>Mati</option></select><span class="hint">' + ((st.logins && st.logins.count) || 0) + ' kali masuk sejauh ini</span></label>' +
            field('loginOrdersMax', 'Maksimum pesanan per masuk', set.loginOrdersMax || 12, 'Mulai dari 3, naik 1–2 pesanan setiap kali masuk') +
            '<label class="field"><span>Antisipasi tanggal kembar</span><select id="set-twin"><option value="1"' + (set.twinUplift ? ' selected' : '') + '>Ya — tambahkan lonjakan 12.12</option><option value="0"' + (set.twinUplift ? '' : ' selected') + '>Tidak</option></select></label>' +
            field('feeShopee', 'Biaya layanan Shopee (%)', +(set.fees.shopee * 100).toFixed(2), '', 0.1) +
            field('feeTokopedia', 'Biaya layanan Tokopedia (%)', +(set.fees.tokopedia * 100).toFixed(2), '', 0.1) +
            '</div><div class="btns" style="margin-top:16px"><button class="btn primary" id="set-save">Simpan parameter</button></div></div></section>' +
            '<section class="panel"><div class="panel-h"><h2>Data demo</h2></div><div class="panel-b"><p class="ink2" style="margin-top:0">Semua data tersimpan di browser ini (localStorage). Reset mengembalikan kondisi awal: impor dari spreadsheet, 12 minggu riwayat, 12 pesanan terbuka, dan 1 PO dalam produksi.</p>' +
            '<p class="ink2">Integrasi asli memakai <b>Shopee Open Platform</b> dan <b>Tokopedia Open API</b>: webhook pesanan memanggil aksi yang sama dengan tombol simulasi, dan setiap perubahan stok dikirim balik lewat endpoint update stok per variasi.</p>' +
            '<button class="btn danger" id="reset">Reset data demo</button></div></section></div>'
          : '') +

        '<section class="panel"><div class="panel-h"><h2>Sistem desain</h2><span class="meta">token, komponen, dan semua state yang dipakai layar ini</span><span class="spacer"></span><a class="btn sm" href="docs/design-system.html">Buka sistem desain</a></div></section>' +
        '<section class="panel scroll-x"><div class="panel-h"><h2>Hak akses</h2><span class="meta">ganti peran di kiri bawah untuk mencoba</span></div><table class="t perm-table"><thead><tr><th>Aksi</th>' +
        Object.values(S.ROLES).map((r) => '<th>' + r.label + '</th>').join('') + '</tr></thead><tbody>' +
        perms.map((r) => '<tr><td>' + r[0] + '</td>' + r.slice(1).map((v) => '<td>' + (v ? '<span class="yes">✓</span>' : '<span class="no">—</span>') + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></section>'
      );
    },
    mount(el) {
      el.querySelectorAll('[data-save]').forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.save;
            const img = el.querySelector('[data-img="' + id + '"]').value;
            const price = parseFloat(el.querySelector('[data-price="' + id + '"]').value);
            const p = S.product(id);
            if (img.trim() !== p.img) S.setProductImage(id, img);
            if (price && price !== p.price) S.updateProduct(id, { price });
            ui.toast('Listing ' + p.sku + ' disimpan dan dikirim ke kedua kanal.', '', 'Listing');
          }),
      );
      const save = el.querySelector('#set-save');
      if (save)
        save.onclick = () => {
          const v = (k) => parseFloat(el.querySelector('[data-set="' + k + '"]').value);
          S.updateSettings({
            leadTimeDays: v('leadTimeDays'),
            reviewDays: v('reviewDays'),
            serviceZ: v('serviceZ'),
            moq: v('moq'),
            lowStock: v('lowStock'),
            twinUplift: el.querySelector('#set-twin').value === '1',
            loginOrders: el.querySelector('#set-login').value === '1',
            loginOrdersMax: Math.max(3, Math.min(40, v('loginOrdersMax') || 12)),
            fees: { shopee: v('feeShopee') / 100, tokopedia: v('feeTokopedia') / 100 },
          });
          ui.toast('Parameter disimpan. Forecast dan peringatan stok dihitung ulang.', '', 'Pengaturan');
        };
      const reset = el.querySelector('#reset');
      if (reset) reset.onclick = () => ui.confirm('Reset data demo?', 'Semua pesanan, PO, dan entri kas yang dibuat selama demo akan dihapus.', 'Reset', () => (S.reset(), ui.toast('Data demo dikembalikan ke kondisi awal.', '', 'Reset')));
    },
  };

  function field(k, label, val, hint, step) {
    return '<label class="field"><span>' + label + '</span><input type="number" data-set="' + k + '" value="' + val + '" step="' + (step || 1) + '">' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</label>';
  }
})();
