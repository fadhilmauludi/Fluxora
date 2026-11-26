/* Keuangan — a cash book that fills itself from stock and order events,
   plus the reconciliation the team used to do by hand at month end. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let cat = 'semua';
  let range = 30;

  const CATS = {
    penjualan: 'Penjualan',
    biaya_platform: 'Biaya platform',
    produksi: 'Produksi (maklon)',
    operasional: 'Operasional',
    modal: 'Modal',
    lainnya: 'Lainnya',
  };

  FX.views.keuangan = {
    render() {
      const st = S.state;
      const since = Date.now() - range * FX.DAY;
      const inRange = st.ledger.filter((j) => j.at >= since);
      const by = (c, t) => FX.sum(inRange.filter((j) => j.category === c && (!t || j.type === t)), (j) => j.amount);
      const sales = by('penjualan', 'in');
      const fees = by('biaya_platform');
      const prod = by('produksi');
      const ops = by('operasional');
      const other = FX.sum(inRange.filter((j) => j.category === 'lainnya'), (j) => (j.type === 'in' ? j.amount : -j.amount));
      const net = sales - fees - prod - ops + other;
      const auto = inRange.filter((j) => j.auto).length;
      const rec = S.reconcile();
      let rows = st.ledger.slice().reverse();
      if (cat !== 'semua') rows = rows.filter((j) => (cat === 'manual' ? !j.auto : j.category === cat));
      rows = rows.slice(0, 60);

      const pct = (v) => (sales ? Math.round((v / sales) * 100) + '%' : '—');

      return (
        (!S.can('ledger.add') ? ui.readonly('Sebagian besar entri dibuat otomatis oleh sistem. Entri manual hanya dapat dibuat oleh PIC Keuangan atau Owner. Jika menemukan selisih, kirim laporan ke PIC Keuangan.') : '') +
        '<div class="toolbar"><div class="seg">' + [[7, '7 hari'], [30, '30 hari'], [90, '90 hari']].map(([k, l]) => '<button data-r="' + k + '" class="' + (range === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><span style="flex:1"></span>' +
        FX.reports.button('kas') +
        (S.can('ledger.add') ? '<button class="btn primary" data-act="add">' + ui.icon('plus', 15) + 'Entri manual</button>' : '') + '</div>' +

        '<section class="kpis" style="grid-template-columns:repeat(4,1fr)">' +
        '<div class="kpi"><div class="lbl">Saldo kas</div><div class="v">' + FX.rp(S.cash()) + '</div><div class="d">semua periode</div></div>' +
        '<div class="kpi"><div class="lbl">Penjualan ' + range + ' hari</div><div class="v">' + FX.rpShort(sales) + '</div><div class="d">diakui saat diserahkan ke kurir</div></div>' +
        '<div class="kpi"><div class="lbl">Arus kas bersih</div><div class="v" style="color:' + (net < 0 ? 'var(--color-status-critical)' : 'inherit') + '">' + (net < 0 ? '−' : '') + FX.rpShort(Math.abs(net)) + '</div><div class="d">setelah produksi & operasional</div></div>' +
        '<div class="kpi"><div class="lbl">Entri otomatis</div><div class="v">' + auto + ' / ' + inRange.length + '</div><div class="d">tanpa diketik ulang dari spreadsheet</div></div>' +
        '</section>' +

        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Arus kas ' + range + ' hari</h2></div><table class="t"><tbody>' +
        '<tr><td>Penjualan Shopee + Tokopedia</td><td class="r num">' + FX.rp(sales) + '</td><td class="r muted num" style="width:60px">100%</td></tr>' +
        '<tr><td>Biaya layanan marketplace</td><td class="r num">−' + FX.rp(fees) + '</td><td class="r muted num">' + pct(fees) + '</td></tr>' +
        '<tr><td>Produksi ke maklon</td><td class="r num">−' + FX.rp(prod) + '</td><td class="r muted num">' + pct(prod) + '</td></tr>' +
        '<tr><td>Operasional</td><td class="r num">−' + FX.rp(ops) + '</td><td class="r muted num">' + pct(ops) + '</td></tr>' +
        (other ? '<tr><td>Lainnya</td><td class="r num">' + (other < 0 ? '−' : '') + FX.rp(Math.abs(other)) + '</td><td></td></tr>' : '') +
        '</tbody><tfoot><tr><td>Bersih</td><td class="r num">' + (net < 0 ? '−' : '') + FX.rp(Math.abs(net)) + '</td><td class="r num">' + pct(net) + '</td></tr></tfoot></table></section>' +

        '<section class="panel"><div class="panel-h"><h2>Rekonsiliasi otomatis</h2><span class="spacer"></span>' + (rec.ok ? ui.lvl('good', '0 selisih') : ui.lvl('critical', 'ada selisih')) + '</div>' +
        check(!rec.stockIssues.length, 'Stok = stok awal + semua mutasi', rec.cells + ' sel model × ukuran, ' + rec.movements + ' mutasi', rec.stockIssues) +
        check(!rec.orderIssues.length, 'Setiap pesanan terkirim punya entri penjualan & biaya', rec.shipped + ' pesanan terkirim', rec.orderIssues) +
        check(!rec.poIssues.length, 'Setiap barang masuk punya entri biaya produksi', rec.received + ' PO diterima', rec.poIssues) +
        '</section></div>' +

        '<section class="panel"><div class="panel-h"><h2>Buku kas</h2><span class="meta">60 entri terakhir</span><span class="spacer"></span>' +
        '<select class="search" style="min-width:0" id="cat">' + [['semua', 'Semua kategori'], ['manual', 'Hanya entri manual']].concat(Object.entries(CATS)).map(([k, l]) => '<option value="' + k + '"' + (cat === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
        '<div class="scroll-x"><table class="t"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Sumber</th><th class="r">Masuk</th><th class="r">Keluar</th></tr></thead><tbody>' +
        rows
          .map(
            (j) =>
              '<tr><td class="mono muted nowrap">' + FX.fmtDateTime(j.at) + '</td><td>' + esc(j.note) + '</td><td class="ink2 nowrap">' + (CATS[j.category] || j.category) + '</td>' +
              '<td class="nowrap">' + (j.ref === 'IMPORT' ? '<span class="muted">impor spreadsheet</span>' : j.auto ? '<span class="lvl info">otomatis</span>' : '<span class="muted">manual, ' + esc(j.by) + '</span>') + '</td>' +
              '<td class="r num">' + (j.type === 'in' ? FX.rp(j.amount) : '') + '</td><td class="r num">' + (j.type === 'out' ? FX.rp(j.amount) : '') + '</td></tr>',
          )
          .join('') +
        '</tbody></table></div></section>' +
        FX.reports.panel('kas', { hideEmpty: !['owner', 'pic_keuangan', 'staf_keuangan'].includes(S.role) })
      );
    },
    mount(el) {
      FX.reports.mount(el);
      el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => ((range = +b.dataset.r), FX.app.render())));
      el.querySelector('#cat').onchange = (e) => ((cat = e.target.value), FX.app.render());
      const add = el.querySelector('[data-act="add"]');
      if (add) add.onclick = openAdd;
    },
  };

  function check(ok, title, meta, issues) {
    return (
      '<div class="check-row"><span class="tick ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '!') + '</span><div><div style="font-weight:600">' + title + '</div><div class="muted" style="font-size:12.5px">' + meta + '</div>' +
      (issues.length ? '<div style="color:var(--color-status-critical);font-size:var(--font-size-caption);margin-top:4px">' + issues.slice(0, 4).map(esc).join('<br>') + '</div>' : '') +
      '</div><span class="mono" style="font-size:12px">' + (ok ? 'cocok' : issues.length + ' selisih') + '</span></div>'
    );
  }

  function openAdd() {
    ui.drawer({
      title: 'Entri kas manual',
      sub: 'Untuk transaksi di luar stok dan pesanan, seperti gaji, sewa, atau iklan.',
      body:
        '<div class="form-grid">' +
        '<label class="field"><span>Jenis</span><select id="lg-t"><option value="out">Pengeluaran</option><option value="in">Pemasukan</option></select></label>' +
        '<label class="field"><span>Kategori</span><select id="lg-c"><option value="operasional">Operasional</option><option value="lainnya">Lainnya</option><option value="modal">Modal</option></select></label>' +
        '<label class="field full"><span>Jumlah (Rp)</span><input id="lg-a" type="number" min="0" step="1000" inputmode="numeric"></label>' +
        '<label class="field full"><span>Keterangan</span><input id="lg-n" placeholder="mis. Iklan Shopee Ads minggu 47"></label>' +
        '</div><div class="callout">Penjualan, biaya platform, dan biaya produksi <b>tidak perlu</b> diinput di sini karena sudah tercatat otomatis dari pesanan dan barang masuk.</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="lg-go">Simpan</button>',
      onMount(d) {
        d.querySelector('#lg-go').onclick = () => {
          const amount = parseFloat(d.querySelector('#lg-a').value);
          const note = d.querySelector('#lg-n').value.trim();
          if (!amount || !note) return ui.toast('Silakan isi jumlah dan keterangan.', 'bad');
          S.addLedger({ type: d.querySelector('#lg-t').value, category: d.querySelector('#lg-c').value, amount, note });
          ui.closeDrawer();
          ui.toast('Entri kas berhasil disimpan.', '', 'Kas');
        };
      },
    });
  }
})();
