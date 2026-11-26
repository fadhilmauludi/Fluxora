/* Staff reports. Staff work in view mode; when what they see does not match
   reality (stock on the shelf, an order or listing, the cash book) they send a
   short report to their PIC instead of editing the data themselves.
   One form and one list, used by the Stok, Pesanan and Keuangan screens. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const esc = FX.esc;

  const COPY = {
    stok: {
      button: 'Laporkan selisih stok',
      title: 'Laporkan selisih stok',
      sub: 'Laporan diteruskan ke PIC Gudang dan Owner',
      done: 'Laporan terkirim ke PIC Gudang.',
      panel: 'Laporan selisih stok',
    },
    pesanan: {
      button: 'Laporkan kendala pesanan',
      title: 'Laporkan kendala pesanan atau listing',
      sub: 'Laporan diteruskan ke PIC Admin Toko dan Owner',
      done: 'Laporan terkirim ke PIC Admin Toko.',
      panel: 'Laporan kendala pesanan',
    },
    kas: {
      button: 'Laporkan selisih kas',
      title: 'Laporkan selisih kas',
      sub: 'Laporan diteruskan ke PIC Keuangan dan Owner',
      done: 'Laporan terkirim ke PIC Keuangan.',
      panel: 'Laporan selisih kas',
    },
  };

  const reports = (FX.reports = { COPY });

  /** Toolbar button, shown only to roles that may send reports. */
  reports.button = function (topic) {
    return S.can('report.add') ? '<button class="btn" data-report="' + topic + '">' + FX.ui.icon('flag', 15) + COPY[topic].button + '</button>' : '';
  };

  /** Panel listing open reports for this topic that the current role should see. */
  reports.panel = function (topic, opts) {
    const list = S.reportsFor(topic);
    if (!list.length && opts && opts.hideEmpty) return '';
    return (
      '<section class="panel"><div class="panel-h"><h2>' + COPY[topic].panel + '</h2><span class="meta">' + list.length + ' belum ditindaklanjuti</span></div><div class="list">' +
      (list.length
        ? list
            .map(
              (r) =>
                '<div class="li">' + FX.ui.lvl('warning', 'Cek') + '<div><div class="ttl">' + esc(r.who) + ' <span class="muted" style="font-weight:400">' + FX.ago(r.at) + '</span></div><div class="body">' + esc(r.text) + '</div></div>' +
                (S.can('report.resolve') && (S.role === 'owner' || r.to === S.role || !r.to) ? '<button class="btn sm" data-resolve="' + r.id + '">Tandai selesai</button>' : '') +
                '</div>',
            )
            .join('')
        : '<div class="empty">Tidak ada laporan yang menunggu tindak lanjut.</div>') +
      '</div></section>'
    );
  };

  /** Wire buttons rendered by button() and panel(). */
  reports.mount = function (el) {
    el.querySelectorAll('[data-report]').forEach((b) => (b.onclick = () => reports.open(b.dataset.report)));
    el.querySelectorAll('[data-resolve]').forEach(
      (b) =>
        (b.onclick = () => {
          S.resolveReport(b.dataset.resolve);
          FX.ui.toast('Laporan ditandai selesai dan tercatat di Aktivitas.', '', 'Laporan');
        }),
    );
  };

  reports.open = function (topic) {
    const c = COPY[topic];
    const st = S.state;
    let fields = '';
    if (topic === 'stok') {
      fields =
        '<label class="field"><span>Model</span><select id="rp-p">' + st.products.map((p) => '<option value="' + p.id + '">' + esc(p.name + ' — ' + p.color) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Ukuran</span><select id="rp-s">' + FX.SIZES.map((s) => '<option>' + s + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Hasil hitung fisik</span><input id="rp-n" type="number" min="0" inputmode="numeric"></label>' +
        '<label class="field"><span>Tercatat di sistem</span><input id="rp-sys" disabled></label>' +
        '<label class="field full"><span>Keterangan</span><textarea id="rp-t" rows="3" placeholder="Contoh: 1 pcs jahitannya rusak, sudah dipisahkan dari rak."></textarea></label>';
    } else if (topic === 'pesanan') {
      const open = st.orders.filter((o) => o.status !== 'batal').slice(0, 40);
      fields =
        '<label class="field full"><span>Pesanan terkait (opsional)</span><select id="rp-o"><option value="">Tidak terkait pesanan tertentu</option>' +
        open.map((o) => '<option value="' + o.id + '">' + esc(FX.CHANNELS[o.channel].name + ' ' + o.extId + ' — ' + o.buyer) + '</option>').join('') + '</select></label>' +
        '<label class="field full"><span>Jenis kendala</span><select id="rp-k"><option>Pembeli menanyakan status pengiriman</option><option>Pembeli meminta perubahan atau pembatalan</option><option>Stok di listing tidak sesuai dengan stok gudang</option><option>Foto, harga, atau deskripsi listing perlu diperbaiki</option><option>Lainnya</option></select></label>' +
        '<label class="field full"><span>Keterangan</span><textarea id="rp-t" rows="3" placeholder="Contoh: Pembeli menanyakan apakah ukuran L masih bisa ditukar ke XL."></textarea></label>';
    } else {
      fields =
        '<label class="field full"><span>Jenis selisih</span><select id="rp-k"><option>Saldo kas berbeda dengan rekening</option><option>Pencairan dana marketplace belum tercatat</option><option>Biaya tercatat ganda atau keliru</option><option>Lainnya</option></select></label>' +
        '<label class="field full"><span>Perkiraan nominal selisih (Rp, opsional)</span><input id="rp-a" type="number" min="0" step="1000" inputmode="numeric"></label>' +
        '<label class="field full"><span>Keterangan</span><textarea id="rp-t" rows="3" placeholder="Contoh: Pencairan Shopee tanggal 24 belum terlihat di buku kas."></textarea></label>';
    }
    FX.ui.drawer({
      title: c.title,
      sub: c.sub,
      body: '<div class="form-grid">' + fields + '</div><div class="callout">Laporan tidak mengubah data. PIC terkait akan memeriksa dan menindaklanjutinya, lalu menandainya selesai.</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="rp-go">Kirim laporan</button>',
      onMount(d) {
        const val = (id) => {
          const n = d.querySelector('#' + id);
          return n ? n.value.trim() : '';
        };
        if (topic === 'stok') {
          const sync = () => (d.querySelector('#rp-sys').value = S.product(val('rp-p')).stock[val('rp-s')]);
          d.querySelector('#rp-p').onchange = sync;
          d.querySelector('#rp-s').onchange = sync;
          sync();
        }
        d.querySelector('#rp-go').onclick = () => {
          const t = val('rp-t');
          let text;
          if (topic === 'stok') {
            const p = S.product(val('rp-p'));
            const s = val('rp-s');
            const n = val('rp-n');
            if (n === '' && !t) return FX.ui.toast('Isi hasil hitung fisik atau keterangan terlebih dahulu.', 'bad');
            text = p.name + ' ' + p.color + ' ' + s + ': ' + (n !== '' ? 'fisik ' + n + ', sistem ' + p.stock[s] + '. ' : '') + t;
          } else if (topic === 'pesanan') {
            const o = val('rp-o') && S.order(val('rp-o'));
            if (!t && val('rp-k') === 'Lainnya') return FX.ui.toast('Tuliskan keterangan kendalanya terlebih dahulu.', 'bad');
            text = val('rp-k') + (o ? ' (' + FX.CHANNELS[o.channel].name + ' ' + o.extId + ')' : '') + (t ? '. ' + t : '.');
          } else {
            const a = parseFloat(val('rp-a'));
            if (!t && !a) return FX.ui.toast('Isi nominal atau keterangan selisihnya terlebih dahulu.', 'bad');
            text = val('rp-k') + (a ? ', sekitar ' + FX.rp(a) : '') + (t ? '. ' + t : '.');
          }
          S.addReport(text, topic);
          FX.ui.closeDrawer();
          FX.ui.toast(c.done, '', 'Laporan');
        };
      },
    });
  };
})();
