/* Stock — the size matrix. One number per model per size, mirrored to both
   marketplaces. PIC Gudang can receive goods and correct after opname. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let q = '';
  let filter = 'semua';
  let lastSeen = {};

  function cellClass(n) {
    return n === 0 ? 'zero' : n <= S.state.settings.lowStock ? 'lo' : '';
  }

  FX.views.stok = {
    render() {
      const st = S.state;
      const canAdjust = S.can('stock.adjust');
      const canReceive = S.can('stock.receive');
      let rows = st.products.filter((p) => (p.name + ' ' + p.color + ' ' + p.sku).toLowerCase().includes(q.toLowerCase()));
      if (filter === 'menipis') rows = rows.filter((p) => FX.SIZES.some((s) => p.stock[s] <= st.settings.lowStock));
      if (filter === 'habis') rows = rows.filter((p) => FX.SIZES.some((s) => p.stock[s] === 0));
      const totals = { S: 0, M: 0, L: 0, XL: 0 };
      st.products.forEach((p) => FX.SIZES.forEach((s) => (totals[s] += p.stock[s])));
      const zero = [];
      const low = [];
      st.products.forEach((p) => FX.SIZES.forEach((s) => (p.stock[s] === 0 ? zero : p.stock[s] <= st.settings.lowStock ? low : []).push(1)));
      const reports = st.reports.filter((r) => r.status === 'open');

      const body = rows
        .map((p) => {
          const oo = S.onOrder(p.id);
          const cells = FX.SIZES.map((s) => {
            const n = p.stock[s];
            const key = p.id + s;
            const changed = lastSeen[key] != null && lastSeen[key] !== n;
            lastSeen[key] = n;
            return '<td class="cell ' + cellClass(n) + (changed ? ' flash' : '') + '" title="' + esc(p.name + ' ' + s) + ' — stok ' + n + (oo[s] ? ', ' + oo[s] + ' dalam perjalanan' : '') + '"><span class="q">' + n + '</span>' + (oo[s] ? '<span class="inc">+' + oo[s] + '</span>' : '') + '</td>';
          }).join('');
          const total = FX.sizeTotal(p.stock);
          return (
            '<tr class="row-link" data-pid="' + p.id + '"><td>' + ui.prod(p) + '</td>' + cells +
            '<td class="r num"><b>' + total + '</b></td>' +
            '<td class="r num">' + FX.rp(p.price) + '</td>' +
            '<td><span class="ch shopee" title="Listing Shopee = ' + total + '">' + total + '</span> <span class="ch tokopedia" title="Listing Tokopedia = ' + total + '">' + total + '</span></td></tr>'
          );
        })
        .join('');

      return (
        (!canAdjust && !canReceive ? ui.readonly('Anda bisa melihat dan mencocokkan stok fisik. Jika ada selisih, kirim laporan ke PIC Gudang.') : '') +
        '<div class="toolbar">' +
        '<input class="search" id="stok-q" placeholder="Cari model, warna, SKU…" value="' + esc(q) + '">' +
        '<div class="seg">' + ['semua', 'menipis', 'habis'].map((f) => '<button data-f="' + f + '" class="' + (filter === f ? 'on' : '') + '">' + f[0].toUpperCase() + f.slice(1) + '</button>').join('') + '</div>' +
        '<span class="note">' + zero.length + ' ukuran habis, ' + low.length + ' menipis (≤ ' + st.settings.lowStock + ')</span>' +
        '<span style="flex:1"></span>' +
        (S.can('report.add') ? '<button class="btn" data-act="report">Laporkan selisih ke PIC</button>' : '') +
        (canReceive ? '<a class="btn primary" href="#masuk" data-go="masuk">' + ui.icon('box', 15) + 'Catat barang masuk</a>' : '') +
        '</div>' +

        '<section class="panel scroll-x"><table class="t matrix"><thead><tr><th>Model</th>' + FX.SIZES.map((s) => '<th class="c">' + s + '</th>').join('') + '<th class="r">Total</th><th class="r">Harga</th><th>Listing di kanal</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="8" class="empty">Tidak ada model yang cocok.</td></tr>') +
        '</tbody><tfoot><tr><td>Semua model</td>' + FX.SIZES.map((s) => '<td class="r num" style="text-align:center">' + totals[s] + '</td>').join('') + '<td class="r num">' + FX.sizeTotal(totals) + '</td><td></td><td class="muted" style="font-weight:400;font-size:12.5px">angka listing = stok gudang</td></tr></tfoot></table></section>' +

        '<div class="grid g-2">' +
        '<section class="panel"><div class="panel-h"><h2>Cara membaca</h2></div><div class="panel-b" style="display:grid;gap:10px;font-size:13px">' +
        '<div style="display:flex;gap:12px;align-items:center"><table class="matrix"><tr><td class="cell zero" style="width:46px"><span class="q" style="padding:8px 0">0</span></td></tr></table> Listing di Shopee dan Tokopedia otomatis 0, jadi pembeli tidak bisa checkout ukuran ini.</div>' +
        '<div style="display:flex;gap:12px;align-items:center"><table class="matrix"><tr><td class="cell lo" style="width:46px"><span class="q" style="padding:8px 0">2</span></td></tr></table> Menipis: sama dengan atau di bawah batas di Pengaturan.</div>' +
        '<div style="display:flex;gap:12px;align-items:center"><table class="matrix"><tr><td class="cell" style="width:46px"><span class="q" style="padding:8px 0 12px">6</span><span class="inc">+14</span></td></tr></table> Angka kecil di bawah sel adalah jumlah yang sedang diproduksi maklon (PO terbuka).</div>' +
        '</div></section>' +
        '<section class="panel"><div class="panel-h"><h2>Laporan staf</h2><span class="meta">' + reports.length + ' terbuka</span></div><div class="list">' +
        (reports.length
          ? reports.map((r) => '<div class="li">' + ui.lvl('warning', 'Cek') + '<div><div class="ttl">' + esc(r.who) + ' <span class="muted" style="font-weight:400">' + FX.ago(r.at) + '</span></div><div class="body">' + esc(r.text) + '</div></div>' + (S.can('report.resolve') ? '<button class="btn sm" data-resolve="' + r.id + '">Selesai</button>' : '') + '</div>').join('')
          : '<div class="empty">Tidak ada laporan terbuka.</div>') +
        '</div></section></div>'
      );
    },
    mount(el, ref) {
      const input = el.querySelector('#stok-q');
      input.oninput = () => {
        q = input.value;
        FX.app.render();
      };
      el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => ((filter = b.dataset.f), FX.app.render())));
      el.querySelectorAll('[data-pid]').forEach((tr) => (tr.onclick = () => openProduct(tr.dataset.pid)));
      el.querySelectorAll('[data-resolve]').forEach((b) => (b.onclick = () => S.resolveReport(b.dataset.resolve)));
      const rep = el.querySelector('[data-act="report"]');
      if (rep) rep.onclick = openReport;
      if (ref && S.product(ref)) {
        FX.app.ref = null;
        openProduct(ref);
      }
    },
  };

  function openReport() {
    const d = ui.drawer({
      title: 'Laporkan selisih stok',
      sub: 'Masuk ke daftar perhatian PIC Gudang dan Owner',
      body:
        '<div class="form-grid"><label class="field"><span>Model</span><select id="rp-p">' + S.state.products.map((p) => '<option value="' + p.id + '">' + esc(p.name + ' — ' + p.color) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Ukuran</span><select id="rp-s">' + FX.SIZES.map((s) => '<option>' + s + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Hitungan fisik</span><input id="rp-n" type="number" min="0" inputmode="numeric"></label>' +
        '<label class="field"><span>Di sistem</span><input id="rp-sys" disabled></label>' +
        '<label class="field full"><span>Catatan</span><textarea id="rp-t" rows="3" placeholder="mis. 1 pcs cacat jahitan, dipisahkan"></textarea></label></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="rp-go">Kirim laporan</button>',
      onMount(d) {
        const sync = () => (d.querySelector('#rp-sys').value = S.product(d.querySelector('#rp-p').value).stock[d.querySelector('#rp-s').value]);
        d.querySelector('#rp-p').onchange = sync;
        d.querySelector('#rp-s').onchange = sync;
        sync();
        d.querySelector('#rp-go').onclick = () => {
          const p = S.product(d.querySelector('#rp-p').value);
          const s = d.querySelector('#rp-s').value;
          const n = d.querySelector('#rp-n').value;
          const t = d.querySelector('#rp-t').value.trim();
          if (n === '' && !t) return ui.toast('Isi hitungan fisik atau catatan.', 'bad');
          S.addReport(p.name + ' ' + p.color + ' ' + s + ': ' + (n !== '' ? 'fisik ' + n + ', sistem ' + p.stock[s] + '. ' : '') + t);
          ui.closeDrawer();
          ui.toast('Laporan terkirim ke PIC Gudang.', '', 'Laporan');
        };
      },
    });
  }

  function openProduct(pid) {
    const p = S.product(pid);
    const st = S.state;
    const canAdjust = S.can('stock.adjust');
    const moves = st.movements.filter((m) => m.pid === pid).slice(-14).reverse();
    const f = FX.forecast.one(pid);
    const R = { masuk: 'Barang masuk', pesanan: 'Pesanan', batal: 'Batal — kembali', koreksi: 'Koreksi opname' };
    const body =
      '<div style="display:flex;gap:18px">' + ui.thumb(p, 'lg') +
      '<dl class="dl" style="align-content:start"><dt>SKU</dt><dd class="mono">' + p.sku + '</dd><dt>Harga jual</dt><dd>' + FX.rp(p.price) + '</dd><dt>HPP terakhir</dt><dd>' + FX.rp(p.cost) + '</dd><dt>Margin kotor</dt><dd>' + Math.round((1 - p.cost / p.price) * 100) + '%</dd><dt>Laku / minggu</dt><dd>' + f.perWeek.toFixed(1) + ' pcs</dd><dt>Perkiraan habis</dt><dd>' + (f.stockoutDate ? FX.fmtDate(f.stockoutDate) : '—') + '</dd></dl></div>' +
      '<div><div class="lbl" style="margin-bottom:8px">Stok per ukuran ' + (canAdjust ? '(ubah jika hasil opname berbeda)' : '') + '</div>' +
      '<table class="t matrix"><thead><tr><th></th>' + FX.SIZES.map((s) => '<th class="c">' + s + '</th>').join('') + '</tr></thead><tbody>' +
      '<tr><td class="muted">Gudang</td>' + FX.SIZES.map((s) => '<td class="cell ' + cellClass(p.stock[s]) + '">' + (canAdjust ? '<input data-adj="' + s + '" type="number" min="0" value="' + p.stock[s] + '" aria-label="Hasil opname ' + s + '" class="q-input">' : '<span class="q">' + p.stock[s] + '</span>') + '</td>').join('') + '</tr>' +
      '<tr><td>' + ui.ch('shopee') + '</td>' + FX.SIZES.map((s) => '<td class="cell"><span class="q" style="font-size:var(--font-size-body);color:var(--color-text-secondary)">' + p.stock[s] + '</span></td>').join('') + '</tr>' +
      '<tr><td>' + ui.ch('tokopedia') + '</td>' + FX.SIZES.map((s) => '<td class="cell"><span class="q" style="font-size:var(--font-size-body);color:var(--color-text-secondary)">' + p.stock[s] + '</span></td>').join('') + '</tr>' +
      '</tbody></table>' +
      (canAdjust ? '<label class="field" style="margin-top:12px"><span>Alasan koreksi</span><input id="adj-note" placeholder="mis. opname 19 Nov, 1 pcs cacat"></label>' : '') +
      '</div>' +
      '<div><div class="lbl" style="margin-bottom:8px">Mutasi terakhir</div>' +
      (moves.length
        ? '<div class="panel"><table class="t"><tbody>' + moves.map((m) => '<tr><td class="mono muted nowrap">' + FX.fmtDateTime(m.at) + '</td><td>' + R[m.reason] + '</td><td class="mono">' + m.size + '</td><td class="r num" style="color:' + (m.delta > 0 ? 'var(--color-status-success)' : 'var(--color-text-primary)') + '">' + (m.delta > 0 ? '+' : '') + m.delta + '</td><td class="muted">' + esc(m.by) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="muted" style="font-size:13px">Belum ada mutasi sejak impor dari spreadsheet. Stok awal: ' + FX.SIZES.map((s) => s + ' ' + st.opening[pid][s]).join(', ') + '.</div>') +
      '</div>';
    ui.drawer({
      title: esc(p.name),
      sub: esc(p.color),
      body,
      foot: canAdjust ? '<button class="btn" data-close>Tutup</button><button class="btn primary" id="adj-go">Simpan hasil opname</button>' : '<button class="btn" data-close>Tutup</button>',
      onMount(d) {
        const go = d.querySelector('#adj-go');
        if (!go) return;
        go.onclick = () => {
          let changed = 0;
          const note = d.querySelector('#adj-note').value.trim();
          d.querySelectorAll('[data-adj]').forEach((inp) => {
            const v = Math.max(0, parseInt(inp.value, 10) || 0);
            if (v !== p.stock[inp.dataset.adj]) {
              S.adjustStock(pid, inp.dataset.adj, v, note);
              changed++;
            }
          });
          ui.closeDrawer();
          ui.toast(changed ? changed + ' ukuran dikoreksi. Shopee & Tokopedia sudah mengikuti angka baru.' : 'Tidak ada perubahan.', '', 'Opname');
        };
      },
    });
  }
  FX.views.stok.open = openProduct;
})();
