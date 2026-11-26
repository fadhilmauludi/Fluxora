/* Forecast — how many to order from the maklon, and when. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let selected = null;
  let line;

  FX.views.forecast = {
    render(ref) {
      const st = S.state;
      const set = st.settings;
      const all = FX.forecast.all();
      if (ref && S.product(ref)) selected = ref;
      if (!selected) selected = (all.find((f) => f.status === 'pesan') || all[0]).pid;
      const f = all.find((x) => x.pid === selected);
      const due = all.filter((x) => x.status === 'pesan');
      line = ui.forecastLine(f, { width: 560, height: 170 });
      const owner = S.role === 'owner';

      return (
        (owner ? '' : ui.readonly('Rekomendasi ini dapat dipakai untuk persiapan gudang. Keputusan PO ada pada Owner.')) +
        '<div class="callout">Perkiraan dibuat dari <b>12 minggu penjualan</b> per model. Lonjakan tanggal kembar dipisahkan dulu supaya minggu biasa tidak ikut membengkak, lalu ditambahkan kembali bila <b>' + f.nextTwinLabel + '</b> jatuh dalam jendela produksi. Waktu tunggu maklon <b>' + set.leadTimeDays + ' hari</b>, ditinjau tiap <b>' + set.reviewDays + ' hari</b>, MOQ <b>' + set.moq + ' pcs</b>.</div>' +

        '<section class="panel scroll-x"><div class="panel-h"><h2>Semua model</h2><span class="meta">' + due.length + ' perlu dipesan. Pilih baris untuk melihat hitungannya.</span></div>' +
        '<table class="t"><thead><tr><th>Model</th><th class="r">Laku / mgg</th><th>Stok + perjalanan vs titik pesan</th><th class="r">Stok cukup</th><th class="r">Rekomendasi</th><th class="r">Cara lama (+5%)</th><th>Status</th></tr></thead><tbody>' +
        all
          .map((x) => {
            const w = Math.min(100, (x.position / Math.max(1, x.target)) * 100);
            const rop = Math.min(100, (x.reorderPoint / Math.max(1, x.target)) * 100);
            return (
              '<tr class="row-link' + (x.pid === selected ? ' is-selected' : '') + '" data-sel="' + x.pid + '"' + (x.pid === selected ? ' aria-selected="true"' : '') + '><td>' + ui.prod(x.product) + '</td><td class="r num">' + x.perWeek.toFixed(1) + '</td>' +
              '<td style="min-width:180px"><div class="cover-bar" title="posisi ' + x.position + ', titik pesan ' + x.reorderPoint + ', target ' + x.target + '"><span class="' + (x.status === 'pesan' ? 'crit' : '') + '" style="width:' + w + '%"></span><i class="rop" style="left:' + rop + '%"></i></div><div class="cover-meta">' + x.onHand + (x.onOrder ? ' + ' + x.onOrder : '') + ' / pesan di ' + x.reorderPoint + '</div></td>' +
              '<td class="r num">' + (x.weeksCover > 50 ? '—' : x.weeksCover.toFixed(1) + ' mgg') + '</td>' +
              '<td class="r num"><b>' + (x.recommend || '—') + '</b></td><td class="r num muted">' + (x.oldRule || '—') + '</td>' +
              '<td>' + (x.status === 'pesan' ? ui.lvl('serious', 'pesan') : x.status === 'pantau' ? ui.lvl('warning', 'pantau') : ui.lvl('good', 'aman')) + '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></section>' +

        '<div class="grid g-3-1">' +
        '<section class="panel"><div class="panel-h"><h2>' + esc(f.product.name) + ' <span class="muted" style="font-weight:400">' + esc(f.product.color) + '</span></h2><span class="spacer"></span><div class="legend"><span><i class="ink"></i>Terjual</span><span><i class="dash"></i>Perkiraan</span></div></div>' +
        '<div class="panel-b" id="fc-chart">' + line.html + '</div>' +
        '<div class="panel-b" style="border-top:1px solid var(--color-border-subtle)"><div class="lbl" style="margin-bottom:10px">Sebaran ukuran rekomendasi (dari pola 12 minggu)</div>' +
        '<table class="t matrix"><thead><tr><th></th>' + FX.SIZES.map((s) => '<th class="c">' + s + '</th>').join('') + '</tr></thead><tbody>' +
        '<tr><td class="muted">Porsi penjualan</td>' + FX.SIZES.map((s) => '<td class="cell plain"><span class="q" style="font-size:13px">' + Math.round(f.mix[s] * 100) + '%</span></td>').join('') + '</tr>' +
        '<tr><td class="muted">Stok sekarang</td>' + FX.SIZES.map((s) => '<td class="cell ' + (f.product.stock[s] === 0 ? 'zero' : f.product.stock[s] <= set.lowStock ? 'lo' : '') + '"><span class="q" style="font-size:14px">' + f.product.stock[s] + '</span></td>').join('') + '</tr>' +
        '<tr><td class="muted">Cukup untuk</td>' + FX.SIZES.map((s) => '<td class="cell plain"><span class="q" style="font-size:12.5px">' + (f.sizeCover[s] > 50 ? '—' : f.sizeCover[s].toFixed(1) + ' mgg') + '</span></td>').join('') + '</tr>' +
        '<tr><td><b>Pesan</b></td>' + FX.SIZES.map((s) => '<td class="cell plain"><span class="q" style="font-weight:600">' + (f.split[s] || 0) + '</span></td>').join('') + '</tr>' +
        '</tbody></table></div></section>' +

        '<section class="panel"><div class="panel-h"><h2>Hitungan</h2></div><div class="panel-b">' +
        '<div class="lbl">Rekomendasi pesan</div><div class="big" style="margin:8px 0 4px">' + f.recommend + ' pcs</div>' +
        '<div class="muted" style="font-size:13px;margin-bottom:16px">' + (f.recommend ? 'Modal ' + FX.rp(f.capital) + ', tiba sekitar ' + FX.fmtDate(Date.now() + set.leadTimeDays * FX.DAY) : 'Stok dan PO terbuka masih di atas titik pesan (' + f.position + ' vs ' + f.reorderPoint + '). Tinjau kembali pada siklus berikutnya.') + '</div>' +
        '<table class="t" style="font-size:13px"><tbody>' +
        row('Laju penjualan (Holt)', f.perWeek.toFixed(1) + ' / mgg') +
        row('Kebutuhan ' + (set.leadTimeDays + set.reviewDays) + ' hari', Math.round(f.demandCover - f.twinExtra) + ' pcs') +
        (f.twinExtra ? row('Tambahan ' + f.nextTwinLabel, '+' + f.twinExtra + ' pcs') : '') +
        row('Safety stock (z ' + set.serviceZ + ', σ ' + f.sigma.toFixed(1) + ')', '+' + f.safety + ' pcs') +
        row('Stok di gudang', '−' + f.onHand + ' pcs') +
        (f.onOrder ? row('Sedang diproduksi', '−' + f.onOrder + ' pcs') : '') +
        '</tbody><tfoot><tr><td>Dibulatkan ke MOQ / kelipatan 6</td><td class="r num">' + f.recommend + '</td></tr></tfoot></table>' +
        '<div class="callout" style="margin-top:14px">Cara lama (penjualan 4 minggu terakhir + 5%) akan menyarankan <b>' + f.oldRule + ' pcs</b>' + (f.oldRule > f.recommend ? ', lebih banyak ' + (f.oldRule - f.recommend) + ' pcs (≈ ' + FX.rp((f.oldRule - f.recommend) * f.product.cost) + ' modal mengendap).' : f.oldRule < f.recommend ? ', kurang ' + (f.recommend - f.oldRule) + ' pcs, berisiko kehabisan saat ' + f.nextTwinLabel + '.' : '.') + '</div>' +
        (owner && f.recommend ? '<button class="btn primary block" style="margin-top:var(--space-4)" data-po="' + f.pid + '">Buat PO ' + f.recommend + ' pcs</button>' : '') +
        '</div></section></div>'
      );
    },
    mount(el) {
      line.bind(el.querySelector('#fc-chart'));
      el.querySelectorAll('[data-sel]').forEach((tr) => (tr.onclick = () => ((selected = tr.dataset.sel), (FX.app.ref = null), FX.app.render())));
      const po = el.querySelector('[data-po]');
      if (po) po.onclick = () => FX.views.masuk.openPO(FX.forecast.one(po.dataset.po));
      FX.app.ref = null;
    },
  };

  function row(k, v) {
    return '<tr><td class="ink2">' + k + '</td><td class="r num">' + v + '</td></tr>';
  }
})();
