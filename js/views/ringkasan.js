/* Owner dashboard — stock, money and forecast on one screen. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let chart;

  function last30() {
    const today = FX.startOfDay(Date.now());
    const out = [];
    for (let back = 29; back >= 0; back--) {
      const t = today - back * FX.DAY + 12 * FX.HOUR;
      const d = S.state.salesDaily[FX.dayKey(t)];
      const dt = new Date(t);
      out.push({
        t,
        label: FX.fmtDate(t),
        shopee: d ? d.rev.shopee : 0,
        tokopedia: d ? d.rev.tokopedia : 0,
        units: d ? d.units.shopee + d.units.tokopedia : 0,
        twin: dt.getDate() === dt.getMonth() + 1 ? dt.getDate() + '.' + (dt.getMonth() + 1) : '',
      });
    }
    return out;
  }

  FX.views.ringkasan = {
    render() {
      const st = S.state;
      const days = last30();
      const rev30 = FX.sum(days, (d) => d.shopee + d.tokopedia);
      const prevDays = (() => {
        const today = FX.startOfDay(Date.now());
        let s = 0;
        for (let back = 59; back >= 30; back--) {
          const d = st.salesDaily[FX.dayKey(today - back * FX.DAY + 12 * FX.HOUR)];
          if (d) s += d.rev.shopee + d.rev.tokopedia;
        }
        return s;
      })();
      const delta = prevDays ? (rev30 - prevDays) / prevDays : 0;
      const shopShare = rev30 ? FX.sum(days, (d) => d.shopee) / rev30 : 0;
      const open = S.openOrders();
      const late = open.filter((o) => o.shipBy < Date.now());
      const soon = open.filter((o) => o.shipBy >= Date.now() && o.shipBy - Date.now() < 3 * FX.HOUR);
      const cash = S.cash();
      const stockVal = S.stockValue();
      const units = FX.sum(st.products, (p) => FX.sizeTotal(p.stock));
      const empty = [];
      st.products.forEach((p) => FX.SIZES.forEach((s) => p.stock[s] === 0 && empty.push(p.name + ' ' + s)));
      const fcs = FX.forecast.all();
      const due = fcs.filter((f) => f.status === 'pesan');
      const capital = FX.sum(due, (f) => f.capital);
      const rec = S.reconcile();

      chart = ui.stackedBars(days, {
        height: 230,
        labelEvery: 5,
        aria: 'Omzet harian 30 hari per marketplace',
        fmtAxis: (v) => (v >= 1e6 ? v / 1e6 + ' jt' : v ? Math.round(v / 1e3) + 'rb' : '0'),
        tip: (d) =>
          d.shopee + d.tokopedia === 0
            ? '<b>' + d.label + '</b><div>Belum ada penjualan' + (d.t >= FX.startOfDay(Date.now()) ? ' hari ini.' : '.') + '</div>'
            :
          '<b>' + d.label + (d.twin ? ', tanggal kembar' : '') + '</b>' +
          '<div class="row"><span><i class="sw" style="background:var(--color-channel-shopee)"></i>Shopee</span><span class="num">' + FX.rp(d.shopee) + '</span></div>' +
          '<div class="row"><span><i class="sw" style="background:var(--color-channel-tokopedia)"></i>Tokopedia</span><span class="num">' + FX.rp(d.tokopedia) + '</span></div>' +
          '<div class="row"><span>Terjual</span><span class="num">' + d.units + ' pcs</span></div>',
      });

      const top = fcs.slice().sort((a, b) => b.perWeek - a.perWeek);

      return (
        '<section class="kpis">' +
        '<div class="kpi"><div class="lbl">Kas tercatat</div><div class="v">' + FX.rpShort(cash) + '</div><div class="d">dari ' + st.ledger.length + ' entri buku kas</div></div>' +
        '<div class="kpi"><div class="lbl">Omzet 30 hari</div><div class="v">' + FX.rpShort(rev30) + '</div><div class="d"><b>' + (delta >= 0 ? '+' : '−') + Math.abs(delta * 100).toFixed(0) + '%</b> vs 30 hari sebelumnya</div></div>' +
        '<div class="kpi"><div class="lbl">Nilai stok (HPP)</div><div class="v">' + FX.rpShort(stockVal) + '</div><div class="d">' + FX.num(units) + ' pcs, ' + empty.length + ' ukuran kosong</div></div>' +
        '<div class="kpi ' + (late.length ? 'alert' : '') + '"><div class="lbl">Perlu dikirim</div><div class="v">' + open.length + ' pesanan</div><div class="d">' + (late.length ? '<b style="color:var(--color-status-critical);font-weight:var(--font-weight-semibold)">' + late.length + ' lewat batas</b> · ' : '') + soon.length + ' kurang dari 3 jam</div></div>' +
        '<div class="kpi"><div class="lbl">Overselling dicegah</div><div class="v">' + st.blocked + '×</div><div class="d">checkout ditahan sebelum jadi pembatalan</div></div>' +
        '</section>' +

        '<div class="grid g-3-1">' +
        '<section class="panel"><div class="panel-h"><h2>Omzet harian</h2><span class="meta">30 hari terakhir</span><span class="spacer"></span>' +
        '<div class="legend"><span><i class="shopee"></i>Shopee ' + Math.round(shopShare * 100) + '%</span><span><i class="tokopedia"></i>Tokopedia ' + Math.round((1 - shopShare) * 100) + '%</span></div></div>' +
        '<div class="panel-b" id="rev-chart">' + chart.html + '</div></section>' +

        '<section class="panel"><div class="panel-h"><h2>Kesehatan data</h2><span class="spacer"></span>' + (rec.ok ? ui.lvl('good', 'cocok') : ui.lvl('critical', 'selisih')) + '</div>' +
        '<div class="panel-b"><div class="big">' + (rec.stockIssues.length + rec.orderIssues.length + rec.poIssues.length) + ' selisih</div>' +
        '<p class="ink2" style="margin:8px 0 14px">Stok, pesanan, dan kas dicocokkan otomatis setiap ada kejadian. Tidak perlu pencocokan manual di akhir periode.</p>' +
        '<dl class="dl"><dt>Sel stok dicek</dt><dd class="num">' + rec.cells + '</dd><dt>Mutasi stok</dt><dd class="num">' + rec.movements + '</dd><dt>Pesanan terkirim ↔ kas</dt><dd class="num">' + rec.shipped + '</dd><dt>Barang masuk ↔ kas</dt><dd class="num">' + rec.received + '</dd></dl>' +
        '<div style="margin-top:16px"><a class="btn sm" href="#keuangan" data-go="keuangan">Lihat rekonsiliasi</a></div></div></section>' +
        '</div>' +

        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Keputusan produksi</h2><span class="meta">dari forecast</span><span class="spacer"></span><a class="btn sm ghost" href="#forecast" data-go="forecast">Buka forecast</a></div>' +
        (due.length
          ? '<div class="panel-b" style="padding-bottom:6px"><div class="callout"><b>' + due.length + ' model</b> sudah di bawah titik pesan. Total rekomendasi <b>' + FX.sum(due, (f) => f.recommend) + ' pcs</b>, butuh modal <b>' + FX.rp(capital) + '</b> — kas saat ini ' + FX.rp(cash) + '.</div></div>'
          : '') +
        '<table class="t"><thead><tr><th>Model</th><th class="r">Laku / mgg</th><th class="r">Cukup untuk</th><th>Status</th></tr></thead><tbody>' +
        top
          .map(
            (f) =>
              '<tr class="row-link" data-go="forecast" data-ref="' + f.pid + '"><td>' + ui.prod(f.product) + '</td><td class="r num">' + f.perWeek.toFixed(1) + '</td><td class="r num">' + (f.weeksCover > 50 ? '—' : f.weeksCover.toFixed(1) + ' mgg') + '</td><td>' +
              (f.status === 'pesan' ? ui.lvl('serious', 'pesan ' + f.recommend) : f.status === 'pantau' ? ui.lvl('warning', 'pantau') : ui.lvl('good', 'aman')) +
              '</td></tr>',
          )
          .join('') +
        '</tbody></table></section>' +

        '<section class="panel"><div class="panel-h"><h2>Perlu perhatian</h2><span class="meta">' + S.notifications().length + ' item</span></div><div class="list">' +
        (S.notifications()
          .slice(0, 7)
          .map((n) => '<div class="li click" data-go="' + n.go + '" data-ref="' + esc(n.ref) + '">' + ui.lvl(n.level, ui.kindLabel(n.kind)) + '<div><div class="ttl">' + esc(n.title) + '</div><div class="body">' + esc(n.body) + '</div></div><span class="chev">' + ui.icon('chev', 16) + '</span></div>')
          .join('') || '<div class="empty">Semua beres.</div>') +
        '</div></section>' +
        '</div>'
      );
    },
    mount(el) {
      chart.bind(el.querySelector('#rev-chart'));
    },
  };
})();
