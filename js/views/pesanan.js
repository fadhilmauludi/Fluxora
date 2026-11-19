/* Orders — Shopee and Tokopedia in one queue, sorted by courier deadline. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;
  let tab = 'baru';
  let channel = 'semua';

  const TABS = [
    ['baru', 'Perlu dikemas'],
    ['dikemas', 'Siap kirim'],
    ['dikirim', 'Di kurir'],
    ['selesai', 'Selesai'],
    ['batal', 'Dibatalkan'],
  ];

  function actions(o) {
    const b = [];
    if (o.status === 'baru' && S.can('order.pack')) b.push('<button class="btn sm" data-a="pack" data-id="' + o.id + '">Kemas</button>');
    if ((o.status === 'baru' || o.status === 'dikemas') && S.can('order.ship')) b.push('<button class="btn sm ' + (o.status === 'dikemas' ? 'primary' : '') + '" data-a="ship" data-id="' + o.id + '">' + ui.icon('truck', 14) + 'Serahkan kurir</button>');
    if (o.status === 'dikirim' && S.can('order.ship')) b.push('<button class="btn sm ghost" data-a="done" data-id="' + o.id + '">Tandai diterima</button>');
    if ((o.status === 'baru' || o.status === 'dikemas') && S.role === 'staf') b.push('<button class="btn sm ' + (o.checked ? '' : 'primary') + '" data-a="check" data-id="' + o.id + '">' + (o.checked ? ui.icon('check', 14) + 'Sudah dicek' : 'Cek fisik') + '</button>');
    return b.join(' ');
  }

  FX.views.pesanan = {
    render() {
      const st = S.state;
      let list = st.orders.filter((o) => channel === 'semua' || o.channel === channel);
      const counts = {};
      TABS.forEach(([k]) => (counts[k] = list.filter((o) => o.status === k).length));
      list = list.filter((o) => o.status === tab);
      if (tab === 'baru' || tab === 'dikemas') list.sort((a, b) => a.shipBy - b.shipBy);
      else list.sort((a, b) => b.createdAt - a.createdAt);
      const readOnly = !S.can('order.pack') && !S.can('order.ship');
      const late = S.openOrders().filter((o) => o.shipBy < Date.now());
      const checkedReady = list.filter((o) => o.checked && (o.status === 'dikemas' || o.status === 'baru'));

      const rows = list
        .map(
          (o) =>
            '<tr class="row-link" data-open="' + o.id + '">' +
            '<td>' + ui.ch(o.channel) + '<div class="mono muted" style="font-size:11px;margin-top:5px">' + esc(o.extId) + '</div></td>' +
            '<td>' + ui.itemsLine(o) + '</td>' +
            '<td class="ink2">' + esc(o.buyer) + '<div class="muted" style="font-size:12px">' + esc(o.courier) + '</div></td>' +
            '<td class="mono muted nowrap">' + FX.fmtDateTime(o.createdAt) + '</td>' +
            '<td>' + (o.status === 'baru' || o.status === 'dikemas' ? ui.deadline(o) : o.resi ? '<span class="mono" style="font-size:12px">' + o.resi + '</span>' : '<span class="muted">' + esc(o.cancelReason || '—') + '</span>') + '</td>' +
            '<td>' + (o.checked && (o.status === 'baru' || o.status === 'dikemas') ? '<span class="st selesai">Sudah dicek</span>' : ui.status(o.status)) + '</td>' +
            '<td class="r nowrap" data-stop>' + actions(o) + '</td></tr>',
        )
        .join('');

      return (
        (readOnly ? ui.readonly('Staf melihat antrean pesanan dan menandai yang sudah dicek fisik. Status kirim diubah oleh PIC.') : '') +
        (late.length ? '<div class="callout critical" role="alert"><b>' + late.length + ' pesanan lewat batas serah kurir.</b> Marketplace bisa membatalkan otomatis dengan alasan “penjual tidak mengatur pengiriman tepat waktu”. Serahkan sekarang atau hubungi pembeli.</div>' : '') +
        '<div class="tabs">' + TABS.map(([k, l]) => '<button data-tab="' + k + '" class="' + (tab === k ? 'on' : '') + '">' + l + ' <span class="n">' + counts[k] + '</span></button>').join('') + '</div>' +
        '<div class="toolbar"><div class="seg">' + [['semua', 'Semua kanal'], ['shopee', 'Shopee'], ['tokopedia', 'Tokopedia']].map(([k, l]) => '<button data-ch="' + k + '" class="' + (channel === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
        '<span class="muted" style="font-size:12.5px">' + (tab === 'baru' || tab === 'dikemas' ? 'Diurutkan dari batas serah kurir paling dekat' : 'Terbaru di atas') + '</span><span style="flex:1"></span>' +
        (S.can('order.ship') && checkedReady.length > 1 ? '<button class="btn primary" data-a="ship-all">' + ui.icon('truck', 15) + 'Serahkan ' + checkedReady.length + ' yang sudah dicek</button>' : '') +
        '</div>' +
        '<section class="panel scroll-x"><table class="t"><thead><tr><th>Kanal</th><th>Barang</th><th>Pembeli dan kurir</th><th>Masuk</th><th>' + (tab === 'baru' || tab === 'dikemas' ? 'Batas serah' : tab === 'batal' ? 'Alasan' : 'Resi') + '</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="empty">Kosong. Coba tombol <b>Pesanan Shopee</b> atau <b>Pesanan Tokopedia</b> di atas untuk mensimulasikan pesanan masuk.</td></tr>') +
        '</tbody></table></section>'
      );
    },
    mount(el, ref) {
      el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), FX.app.render())));
      el.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => ((channel = b.dataset.ch), FX.app.render())));
      el.querySelectorAll('[data-open]').forEach((tr) =>
        tr.addEventListener('click', (e) => {
          if (e.target.closest('[data-a]')) return;
          openOrder(tr.dataset.open);
        }),
      );
      el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = (e) => (e.stopPropagation(), act(b.dataset.a, b.dataset.id))));
      if (ref && S.order(ref)) {
        const o = S.order(ref);
        FX.app.ref = null;
        if (o.status !== tab) {
          tab = o.status;
          FX.app.render();
        }
        openOrder(ref);
      }
    },
  };

  function act(a, id) {
    if (a === 'pack') S.packOrder(id);
    if (a === 'check') S.checkOrder(id);
    if (a === 'done') S.completeOrder(id);
    if (a === 'ship') {
      S.shipOrder(id);
      const o = S.order(id);
      ui.toast('Resi <span class="mono">' + o.resi + '</span> dikirim ke ' + FX.CHANNELS[o.channel].name + '. Penjualan masuk buku kas.', '', 'Diserahkan');
    }
    if (a === 'ship-all') {
      const ids = S.state.orders.filter((o) => o.checked && o.status === tab && (channel === 'semua' || o.channel === channel)).map((o) => o.id);
      ids.forEach((x) => S.shipOrder(x));
      ui.toast(ids.length + ' pesanan diserahkan ke kurir. Resi dan kas diperbarui.', '', 'Diserahkan');
    }
    if (a === 'cancel') {
      const reason = document.getElementById('cancel-reason');
      S.cancelOrder(id, (reason && reason.value) || 'Permintaan pembeli');
      ui.closeDrawer();
      ui.toast('Pesanan dibatalkan. Stok dikembalikan dan disinkronkan.', '', 'Batal');
    }
  }

  function openOrder(id) {
    const o = S.order(id);
    const gross = FX.sum(o.items, (x) => x.price * x.qty);
    const fee = gross * S.state.settings.fees[o.channel];
    const cogs = FX.sum(o.items, (x) => S.product(x.pid).cost * x.qty);
    const canCancel = S.can('order.cancel') && (o.status === 'baru' || o.status === 'dikemas');
    const body =
      '<div style="display:flex;gap:10px;align-items:center">' + ui.ch(o.channel) + ui.status(o.status) + '<span style="flex:1"></span>' + ui.deadline(o) + '</div>' +
      '<div class="panel"><table class="t"><tbody>' +
      o.items.map((it) => { const p = S.product(it.pid); return '<tr><td>' + ui.prod(p) + '</td><td class="mono">' + it.size + '</td><td class="r num">×' + it.qty + '</td><td class="r num">' + FX.rp(it.price * it.qty) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<dl class="dl"><dt>No. pesanan</dt><dd class="mono">' + esc(o.extId) + '</dd><dt>Pembeli</dt><dd>' + esc(o.buyer) + '</dd><dt>Kurir</dt><dd>' + esc(o.courier) + '</dd><dt>Batas serah</dt><dd>' + FX.fmtDateTime(o.shipBy) + '</dd>' + (o.resi ? '<dt>Resi</dt><dd class="mono">' + o.resi + '</dd>' : '') + '</dl>' +
      '<div><div class="lbl" style="margin-bottom:8px">Dampak ke buku kas saat diserahkan</div><div class="panel"><table class="t"><tbody>' +
      '<tr><td>Penjualan</td><td class="r num">' + FX.rp(gross) + '</td></tr>' +
      '<tr><td>Biaya layanan ' + FX.CHANNELS[o.channel].name + ' (' + (S.state.settings.fees[o.channel] * 100).toFixed(1).replace('.', ',') + '%)</td><td class="r num">−' + FX.rp(fee) + '</td></tr>' +
      '<tr><td class="muted">HPP barang</td><td class="r num muted">−' + FX.rp(cogs) + '</td></tr>' +
      '</tbody><tfoot><tr><td>Laba kotor</td><td class="r num">' + FX.rp(gross - fee - cogs) + '</td></tr></tfoot></table></div></div>' +
      '<div><div class="lbl" style="margin-bottom:8px">Riwayat</div><div class="feed panel">' + o.history.slice().reverse().map((h) => '<div class="feed-i"><span class="tm">' + FX.fmtTime(h.at) + '</span><span>' + esc(h.text) + '</span></div>').join('') + '</div></div>' +
      (canCancel ? '<label class="field"><span>Alasan jika dibatalkan</span><select id="cancel-reason"><option>Permintaan pembeli</option><option>Alamat tidak dapat dijangkau kurir</option><option>Barang cacat saat pengecekan</option></select><span class="hint">Stok dikembalikan ke semua kanal secara otomatis.</span></label>' : '');
    const foot = [];
    if (canCancel) foot.push('<button class="btn danger" data-da="cancel">Batalkan pesanan</button>');
    foot.push('<span style="flex:1"></span>');
    if (o.status === 'baru' && S.can('order.pack')) foot.push('<button class="btn" data-da="pack">Kemas</button>');
    if ((o.status === 'baru' || o.status === 'dikemas') && S.can('order.ship')) foot.push('<button class="btn primary" data-da="ship">Serahkan ke kurir</button>');
    if ((o.status === 'baru' || o.status === 'dikemas') && S.role === 'staf') foot.push('<button class="btn primary" data-da="check">' + (o.checked ? 'Batalkan tanda cek' : 'Tandai sudah dicek fisik') + '</button>');
    ui.drawer({
      title: 'Pesanan ' + FX.CHANNELS[o.channel].name,
      sub: 'Masuk ' + FX.fmtDateTime(o.createdAt) + ' (' + FX.ago(o.createdAt) + ')',
      body,
      foot: foot.join('') || '<button class="btn" data-close>Tutup</button>',
      onMount(d) {
        d.querySelectorAll('[data-da]').forEach((b) =>
          (b.onclick = () => {
            act(b.dataset.da, id);
            if (b.dataset.da !== 'cancel') ui.closeDrawer();
          }),
        );
      },
    });
  }
})();
