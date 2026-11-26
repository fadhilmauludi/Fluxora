/* Barang Masuk — purchase orders to the maklon and receiving goods.
   Owner decides the PO (usually straight from the forecast), PIC Gudang
   receives it, and receiving writes stock + listings + production cost. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;

  function sizeLine(q) {
    return FX.SIZES.map((s) => '<span class="mono"><span class="muted">' + s + '</span> ' + (q[s] || 0) + '</span>').join('&nbsp;&nbsp;');
  }

  FX.views.masuk = {
    render() {
      const st = S.state;
      const open = st.pos.filter((p) => p.status === 'dipesan').sort((a, b) => a.eta - b.eta);
      const done = st.pos.filter((p) => p.status !== 'dipesan').sort((a, b) => (b.receivedAt || b.createdAt) - (a.receivedAt || a.createdAt));
      const grn = st.movements.filter((m) => m.reason === 'masuk');
      const canPO = S.role === 'owner';
      const canRecv = S.can('stock.receive');
      const openValue = FX.sum(open, (po) => FX.sizeTotal(po.qty) * po.unitCost);

      return (
        (!canRecv && !canPO ? ui.readonly('PO dibuat oleh Owner dan barang diterima oleh PIC Gudang. Biaya produksi tercatat otomatis di buku kas saat barang diterima.') : '') +
        '<div class="toolbar"><span class="note">' + open.length + ' PO dalam produksi, nilai ' + FX.rp(openValue) + '</span><span style="flex:1"></span>' +
        (canPO ? '<button class="btn" data-act="po">' + ui.icon('plus', 15) + 'Buat PO ke maklon</button>' : '') +
        (canRecv ? '<button class="btn primary" data-act="free">' + ui.icon('box', 15) + 'Barang masuk tanpa PO</button>' : '') +
        '</div>' +

        '<section class="panel"><div class="panel-h"><h2>Dalam produksi</h2><span class="meta">PO terbuka ke maklon — sudah dihitung di forecast sebagai stok dalam perjalanan</span></div>' +
        (open.length
          ? '<div class="scroll-x"><table class="t"><thead><tr><th>PO</th><th>Model</th><th>Jumlah per ukuran</th><th>Maklon</th><th>Estimasi tiba</th><th class="r">Nilai</th><th></th></tr></thead><tbody>' +
            open
              .map((po) => {
                const p = S.product(po.pid);
                const left = po.eta - Date.now();
                return (
                  '<tr><td class="mono">' + po.id + '<div class="muted" style="font-size:11.5px">oleh ' + esc(po.by) + ', ' + FX.fmtDate(po.createdAt) + '</div></td><td>' + ui.prod(p) + '</td><td>' + sizeLine(po.qty) + ' <b class="mono">= ' + FX.sizeTotal(po.qty) + '</b></td>' +
                  '<td class="ink2">' + esc(po.vendor.split(' — ')[0]) + '<div class="muted" style="font-size:12px">' + esc(po.vendor.split(' — ')[1] || '') + '</div></td>' +
                  '<td class="nowrap">' + FX.fmtDate(po.eta) + '<div class="deadline ' + (left < 0 ? 'late' : '') + '" style="font-size:11.5px">' + (left < 0 ? 'telat ' + Math.ceil(-left / FX.DAY) + ' hari' : Math.ceil(left / FX.DAY) + ' hari lagi') + '</div></td>' +
                  '<td class="r num">' + FX.rp(FX.sizeTotal(po.qty) * po.unitCost) + '</td>' +
                  '<td class="r nowrap">' + (canRecv ? '<button class="btn sm primary" data-recv="' + po.id + '">Terima</button> ' : '') + (canPO ? '<button class="btn sm ghost" data-cancel="' + po.id + '">Batal</button>' : '') + '</td></tr>'
                );
              })
              .join('') +
            '</tbody></table></div>'
          : '<div class="empty">Tidak ada PO terbuka. ' + (canPO ? 'Buka <a href="#forecast" data-go="forecast">Forecast</a> untuk melihat rekomendasi.' : '') + '</div>') +
        '</section>' +

        '<section class="panel"><div class="panel-h"><h2>Riwayat</h2><span class="meta">' + grn.length + ' baris mutasi masuk sejak impor</span></div>' +
        (done.length
          ? '<div class="scroll-x"><table class="t"><thead><tr><th>PO</th><th>Model</th><th>Diterima</th><th>Status</th><th>Tanggal</th><th class="r">Biaya produksi</th></tr></thead><tbody>' +
            done
              .map((po) => {
                const p = S.product(po.pid);
                return '<tr><td class="mono">' + po.id + '</td><td>' + ui.prod(p) + '</td><td>' + (po.received ? sizeLine(po.received) : '—') + '</td><td>' + (po.status === 'diterima' ? ui.lvl('good', 'diterima') : ui.lvl('neutral', 'batal')) + '</td><td class="mono muted">' + FX.fmtDateTime(po.receivedAt || po.createdAt) + '</td><td class="r num">' + (po.received ? FX.rp(FX.sizeTotal(po.received) * po.unitCost) : '—') + '</td></tr>';
              })
              .join('') +
            '</tbody></table></div>'
          : '<div class="empty">Belum ada PO yang diterima sejak sistem dipakai.</div>') +
        '</section>'
      );
    },
    mount(el) {
      el.querySelectorAll('[data-recv]').forEach((b) => (b.onclick = () => openReceive(b.dataset.recv)));
      el.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = () => ui.confirm('Batalkan ' + b.dataset.cancel + '?', 'PO tidak lagi dihitung sebagai stok dalam perjalanan di forecast.', 'Batalkan PO', () => S.cancelPO(b.dataset.cancel))));
      const po = el.querySelector('[data-act="po"]');
      if (po) po.onclick = () => FX.views.masuk.openPO();
      const free = el.querySelector('[data-act="free"]');
      if (free) free.onclick = () => openReceive(null);
    },

    /** Create a PO. `prefill` comes from the forecast screen. */
    openPO(prefill) {
      const st = S.state;
      const pid = (prefill && prefill.pid) || st.products[0].id;
      ui.drawer({
        title: 'PO ke maklon',
        sub: prefill ? 'Terisi dari rekomendasi forecast dan dapat disesuaikan' : 'Pesanan produksi baru',
        body:
          '<div class="form-grid">' +
          '<label class="field full"><span>Model</span><select id="po-p">' + st.products.map((p) => '<option value="' + p.id + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name + ' — ' + p.color) + '</option>').join('') + '</select></label>' +
          '<div class="field full"><span>Jumlah per ukuran</span><div class="size-inputs">' + FX.SIZES.map((s) => '<label><b>' + s + '</b><input type="number" min="0" data-q="' + s + '" value="' + (prefill ? prefill.split[s] : 0) + '"></label>').join('') + '</div><span class="hint" id="po-tot"></span></div>' +
          '<label class="field"><span>Maklon</span><select id="po-v">' + st.vendors.map((v) => '<option>' + esc(v) + '</option>').join('') + '</select></label>' +
          '<label class="field"><span>HPP per pcs</span><input id="po-c" type="number" min="0" step="500" value="' + S.product(pid).cost + '"></label>' +
          '<label class="field"><span>Waktu produksi (hari)</span><input id="po-l" type="number" min="1" value="' + st.settings.leadTimeDays + '"></label>' +
          '<label class="field"><span>Catatan</span><input id="po-n" placeholder="mis. stok 12.12"></label>' +
          '</div>' +
          '<div class="callout" id="po-cash"></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="po-go">Kirim PO</button>',
        onMount(d) {
          const recalc = () => {
            const qty = {};
            d.querySelectorAll('[data-q]').forEach((i) => (qty[i.dataset.q] = Math.max(0, parseInt(i.value, 10) || 0)));
            const tot = FX.sizeTotal(qty);
            const cost = tot * (parseFloat(d.querySelector('#po-c').value) || 0);
            d.querySelector('#po-tot').textContent = tot + ' pcs' + (tot && tot < st.settings.moq ? ' — di bawah MOQ maklon (' + st.settings.moq + ' pcs)' : '');
            d.querySelector('#po-cash').innerHTML = 'Nilai PO <b>' + FX.rp(cost) + '</b>. Kas saat ini ' + FX.rp(S.cash()) + ' → <b>' + FX.rp(S.cash() - cost) + '</b> setelah barang diterima dan dibayar.';
            return { qty, tot };
          };
          d.querySelectorAll('input').forEach((i) => (i.oninput = recalc));
          d.querySelector('#po-p').onchange = (e) => {
            d.querySelector('#po-c').value = S.product(e.target.value).cost;
            recalc();
          };
          recalc();
          d.querySelector('#po-go').onclick = () => {
            const { qty, tot } = recalc();
            if (!tot) return ui.toast('Isi jumlah untuk minimal satu ukuran.', 'bad');
            const po = S.createPO({
              pid: d.querySelector('#po-p').value,
              qty,
              unitCost: parseFloat(d.querySelector('#po-c').value) || 0,
              vendor: d.querySelector('#po-v').value,
              leadDays: parseInt(d.querySelector('#po-l').value, 10) || st.settings.leadTimeDays,
              note: d.querySelector('#po-n').value,
            });
            ui.closeDrawer();
            ui.toast(po.id + ' terkirim. Forecast langsung menghitungnya sebagai stok dalam perjalanan.', '', 'PO');
          };
        },
      });
    },
  };

  function openReceive(poId) {
    const st = S.state;
    const po = poId && st.pos.find((x) => x.id === poId);
    const p0 = po ? S.product(po.pid) : st.products[0];
    ui.drawer({
      title: po ? 'Terima ' + po.id : 'Catat barang masuk',
      sub: po ? esc(p0.name + ' — ' + p0.color) + ' dari ' + esc(po.vendor.split(' — ')[0]) : 'Untuk barang yang datang tanpa PO, misalnya retur atau kiriman tambahan',
      body:
        '<div class="form-grid">' +
        (po ? '' : '<label class="field full"><span>Model</span><select id="rc-p">' + st.products.map((p) => '<option value="' + p.id + '">' + esc(p.name + ' — ' + p.color) + '</option>').join('') + '</select></label>') +
        '<div class="field full"><span>Jumlah diterima (hitung fisik)</span><div class="size-inputs">' +
        FX.SIZES.map((s) => '<label><b>' + s + '</b><input type="number" min="0" data-q="' + s + '" value="' + (po ? po.qty[s] || 0 : 0) + '"></label>').join('') +
        '</div>' + (po ? '<span class="hint">Dipesan: ' + FX.SIZES.map((s) => s + ' ' + (po.qty[s] || 0)) .join(', ') + '. Ubah jika jumlah datang berbeda.</span>' : '') + '</div>' +
        (po ? '' : '<label class="field"><span>Maklon</span><select id="rc-v">' + st.vendors.map((v) => '<option>' + esc(v) + '</option>').join('') + '</select></label>') +
        '<label class="field ' + (po ? 'full' : '') + '"><span>HPP per pcs</span><input id="rc-c" type="number" min="0" step="500" value="' + (po ? po.unitCost : p0.cost) + '"></label>' +
        '<label class="field full"><span>Catatan</span><input id="rc-n" placeholder="mis. 2 pcs L cacat dikembalikan ke maklon"></label>' +
        '</div>' +
        '<div><div class="lbl" style="margin-bottom:8px">Yang akan terjadi saat disimpan</div><div class="panel"><div class="list" id="rc-fx"></div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="rc-go">Simpan barang masuk</button>',
      onMount(d) {
        const pidOf = () => (po ? po.pid : d.querySelector('#rc-p').value);
        const recalc = () => {
          const qty = {};
          d.querySelectorAll('[data-q]').forEach((i) => (qty[i.dataset.q] = Math.max(0, parseInt(i.value, 10) || 0)));
          const p = S.product(pidOf());
          const tot = FX.sizeTotal(qty);
          const cost = tot * (parseFloat(d.querySelector('#rc-c').value) || 0);
          d.querySelector('#rc-fx').innerHTML =
            '<div class="li"><span class="muted">' + ui.icon('grid', 18) + '</span><div><div class="ttl">Stok gudang bertambah ' + tot + ' pcs</div><div class="body">' + FX.SIZES.map((s) => s + ' ' + p.stock[s] + ' → ' + (p.stock[s] + qty[s])).join(', ') + '</div></div><span></span></div>' +
            '<div class="li"><span class="muted">' + ui.icon('bag', 18) + '</span><div><div class="ttl">Listing Shopee & Tokopedia ikut berubah</div><div class="body">Ukuran yang tadinya habis langsung bisa dibeli lagi</div></div><span></span></div>' +
            '<div class="li"><span class="muted">' + ui.icon('wallet', 18) + '</span><div><div class="ttl">Biaya produksi ' + FX.rp(cost) + ' masuk buku kas</div><div class="body">Kategori produksi, terhubung ke ' + (po ? po.id : 'nomor penerimaan') + '</div></div><span></span></div>';
          return { qty, tot };
        };
        d.querySelectorAll('input, select').forEach((i) => (i.oninput = i.onchange = recalc));
        const sel = d.querySelector('#rc-p');
        if (sel) sel.onchange = () => ((d.querySelector('#rc-c').value = S.product(sel.value).cost), recalc());
        recalc();
        d.querySelector('#rc-go').onclick = () => {
          const { qty, tot } = recalc();
          if (!tot) return ui.toast('Isi jumlah untuk minimal satu ukuran.', 'bad');
          S.receiveStock({
            pid: pidOf(),
            qty,
            unitCost: parseFloat(d.querySelector('#rc-c').value) || 0,
            vendor: po ? po.vendor : d.querySelector('#rc-v').value,
            poId: po ? po.id : null,
            note: d.querySelector('#rc-n').value.trim(),
          });
          ui.closeDrawer();
          ui.toast(tot + ' pcs telah dicatat. Stok, listing di kedua marketplace, dan buku kas sudah diperbarui.', '', 'Barang masuk');
        };
      },
    });
  }
})();
