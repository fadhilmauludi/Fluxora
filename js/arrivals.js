/* Orders that "arrived while you were away".
   Every sign-in replays a batch of marketplace orders, backdated across the
   time since the previous sign-in. Each one goes through FX.store.placeOrder,
   exactly like a real Shopee/Tokopedia webhook: stock drops, both listings
   sync, sales are recorded for the right day, and checkouts for sizes that are
   already sold out are held (overselling prevented).
   The batch grows by 1–2 orders with every sign-in (up to a maximum), so the queue, the
   courier deadlines and the forecast keep moving during a demo. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const esc = FX.esc;

  const MIN_WINDOW = 90 * 60000;   // even an immediate re-login replays 1.5h of shop activity
  const MAX_WINDOW = 12 * FX.HOUR; // cap so overnight gaps don't empty the warehouse

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  function weightedProduct() {
    const ps = S.state.products;
    const w = ps.map((p) => 1 + FX.forecast.one(p.id).perWeek);
    let x = Math.random() * FX.sum(w);
    for (let i = 0; i < ps.length; i++) if ((x -= w[i]) <= 0) return ps[i];
    return ps[0];
  }

  function pickSize(p) {
    const inStock = FX.SIZES.filter((s) => p.stock[s] > 0);
    // Mostly buyers pick what is listed; sometimes they try a size that just sold out
    // (two buyers, one last unit). That attempt is held by the stock sync.
    if (inStock.length && Math.random() < 0.85) return inStock[Math.floor(Math.random() * inStock.length)];
    return FX.SIZES[Math.floor(Math.random() * 4)];
  }

  FX.arrivals = {
    /** Batch size: strictly grows by 1–2 orders on every sign-in, from 3 up to the maximum. */
    batchSize(lastBatch) {
      const max = S.state.settings.loginOrdersMax || 12;
      if (!lastBatch) return 3;
      return Math.min(max, lastBatch + 1 + (Math.random() < 0.4 ? 1 : 0));
    },

    onLogin(email) {
      const st = S.state;
      if (st.settings.loginOrders === false) return null;
      st.logins = st.logins || { count: 0, last: null, byAccount: {} };
      const now = Date.now();
      const awayMs = st.logins.last ? now - st.logins.last : 6 * FX.HOUR;
      const windowMs = Math.max(MIN_WINDOW, Math.min(MAX_WINDOW, awayMs));
      const loginNo = st.logins.count + 1;
      const n = this.batchSize(st.logins.lastBatch);

      // Spread arrival times across the window, oldest first.
      const times = Array.from({ length: n }, () => now - Math.random() * windowMs).sort((a, b) => a - b);
      const result = { n, loginNo, from: now - windowMs, placed: [], blocked: [], byChannel: { shopee: 0, tokopedia: 0 } };

      times.forEach((at) => {
        const channel = Math.random() < 0.68 ? 'shopee' : 'tokopedia';
        const items = [];
        const count = Math.random() < 0.18 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const p = weightedProduct();
          const size = pickSize(p);
          if (items.some((x) => x.pid === p.id && x.size === size)) continue;
          items.push({ pid: p.id, size, qty: 1, price: p.price });
        }
        const couriers = st.couriers[channel];
        const courier = couriers[Math.floor(Math.random() * couriers.length)];
        const instant = /Instant|Same Day/.test(courier);
        const res = S.replay(at, 'Marketplace', () =>
          S.placeOrder({ channel, items, buyer: st.buyers[Math.floor(Math.random() * st.buyers.length)], courier, shipHours: instant ? rnd(2, 3.5) : rnd(10, 30) }),
        );
        if (res.ok) {
          result.placed.push(res.order);
          result.byChannel[channel]++;
        } else result.blocked.push({ channel, reason: res.reason, at });
      });

      st.logins.count = loginNo;
      st.logins.lastBatch = n;
      st.logins.last = now;
      st.logins.byAccount[email] = (st.logins.byAccount[email] || 0) + 1;
      S._log('Sinkronisasi saat masuk: ' + result.placed.length + ' pesanan baru dari marketplace' + (result.blocked.length ? ', ' + result.blocked.length + ' checkout ditahan karena stok habis' : '') + '.', 'order');
      S.commit();
      return result;
    },

    /** Summary block used in the sign-in drawer. */
    summaryHtml(r) {
      if (!r) return '';
      const soon = r.placed.filter((o) => o.status === 'baru' && o.shipBy - Date.now() < 3 * FX.HOUR);
      const late = r.placed.filter((o) => o.status === 'baru' && o.shipBy < Date.now());
      const rows = r.placed
        .slice()
        .reverse()
        .slice(0, 6)
        .map((o) => {
          const it = o.items[0];
          const p = S.product(it.pid);
          return (
            '<tr><td>' + FX.ui.ch(o.channel) + '</td><td>' + esc(p.name) + ' <b>' + it.size + '</b>' + (o.items.length > 1 ? ' <span class="muted">+' + (o.items.length - 1) + '</span>' : '') +
            '</td><td class="muted nowrap">' + FX.fmtTime(o.createdAt) + '</td><td class="r">' + FX.ui.deadline(o) + '</td></tr>'
          );
        })
        .join('');
      return (
        '<div class="arrivals">' +
        '<div class="arrivals-stats">' +
        '<div><div class="big">' + r.placed.length + '</div><div class="lbl">pesanan baru</div></div>' +
        '<div><div class="big">' + r.byChannel.shopee + '<span class="arr-split">/</span>' + r.byChannel.tokopedia + '</div><div class="lbl">Shopee / Tokopedia</div></div>' +
        '<div><div class="big" style="' + (r.blocked.length ? 'color:var(--color-status-critical)' : '') + '">' + r.blocked.length + '</div><div class="lbl">checkout ditahan</div></div>' +
        '</div>' +
        '<p class="ink2" style="margin:0">Masuk sejak ' + FX.fmtTime(r.from) + '. Stok sudah dikurangi dan kedua kanal sudah disinkronkan. Ini masuk ke-' + r.loginNo + ' dengan ' + r.n + ' pesanan; berikutnya akan lebih banyak' + (r.n >= (S.state.settings.loginOrdersMax || 12) ? ' (sudah di batas maksimum)' : '') + '.</p>' +
        (late.length || soon.length ? '<div class="callout' + (late.length ? ' critical' : '') + '"><b>' + (late.length ? late.length + ' sudah lewat batas serah kurir' : soon.length + ' harus diserahkan dalam 3 jam') + '.</b> Kerjakan dari atas antrean Pesanan.</div>' : '') +
        (rows ? '<div class="panel"><table class="t"><thead><tr><th>Kanal</th><th>Barang</th><th>Masuk</th><th class="r">Batas serah</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
        (r.blocked.length ? '<p class="tok" style="margin:0">Checkout ditahan: ' + r.blocked.map((b) => esc(b.reason) + ' (' + FX.CHANNELS[b.channel].name + ')').join(', ') + '. Tanpa sinkronisasi, ini akan menjadi pesanan yang dibatalkan sepihak.</p>' : '') +
        '</div>'
      );
    },

    /** Drawer shown after sign-in (unless the first-time welcome takes its place). */
    show(r) {
      if (!r) return;
      const canOrders = S.SCREENS[S.role].includes('pesanan');
      const d = FX.ui.drawer({
        title: 'Selamat datang kembali',
        sub: 'Pesanan yang masuk selama Anda tidak membuka Fluxora',
        body: this.summaryHtml(r),
        foot: '<button class="btn" data-close>Tutup</button>' + (canOrders ? '<button class="btn primary" id="arr-go">Buka Pesanan</button>' : ''),
      });
      const go = d.querySelector('#arr-go');
      if (go)
        go.onclick = () => {
          FX.ui.closeDrawer();
          FX.app.go('pesanan');
        };
    },
  };
})();
