/* Fluxora — single source of truth.
   Every business event (barang masuk, pesanan, kirim, batal, koreksi, PO) goes
   through one action here, and each action writes ALL of its consequences at
   once: stock, stock movement, both marketplace listings, cash book, activity.
   That is the whole idea of the product — one event, one write, no re-typing. */
(function () {
  const FX = window.FX;
  const KEY = 'fluxora.beckycoo.v4';

  const ROLES = {
    owner: { label: 'Founder / Owner', who: 'Owner', group: 'Founder / Owner', can: ['*'] },
    pic_gudang: { label: 'PIC Gudang', who: 'PIC Gudang', group: 'PIC', can: ['stock.receive', 'stock.adjust', 'order.pack', 'order.ship', 'report.resolve'] },
    pic_admin: { label: 'PIC Admin Toko', who: 'PIC Admin Toko', group: 'PIC', can: ['order.pack', 'order.cancel', 'product.edit', 'report.resolve'] },
    pic_keuangan: { label: 'PIC Keuangan', who: 'PIC Keuangan', group: 'PIC', can: ['ledger.add', 'po.pay', 'report.resolve'] },
    staf: { label: 'Staf Gudang', who: 'Staf Gudang', group: 'Staf', reportTo: 'pic_gudang', can: ['order.check', 'report.add'] },
    staf_admin: { label: 'Staf Admin Toko', who: 'Staf Admin Toko', group: 'Staf', reportTo: 'pic_admin', can: ['report.add'] },
    staf_keuangan: { label: 'Staf Keuangan', who: 'Staf Keuangan', group: 'Staf', reportTo: 'pic_keuangan', can: ['report.add'] },
  };
  // Which screens each role sees. Staff see their department's screens in view mode.
  const SCREENS = {
    owner: ['ringkasan', 'stok', 'pesanan', 'masuk', 'keuangan', 'forecast', 'aktivitas', 'pengaturan', 'panduan'],
    pic_gudang: ['stok', 'pesanan', 'masuk', 'forecast', 'aktivitas', 'panduan'],
    pic_admin: ['pesanan', 'stok', 'aktivitas', 'pengaturan', 'panduan'],
    pic_keuangan: ['keuangan', 'masuk', 'stok', 'aktivitas', 'panduan'],
    staf: ['pesanan', 'stok', 'forecast', 'panduan'],
    staf_admin: ['pesanan', 'stok', 'panduan'],
    staf_keuangan: ['keuangan', 'stok', 'panduan'],
  };
  // Where a staff report lands: topic -> PIC who follows it up, and the screen it belongs to.
  const REPORT_TOPICS = {
    stok: { to: 'pic_gudang', screen: 'stok', label: 'Selisih stok' },
    pesanan: { to: 'pic_admin', screen: 'pesanan', label: 'Pesanan dan listing' },
    kas: { to: 'pic_keuangan', screen: 'keuangan', label: 'Selisih kas' },
  };

  const S = (FX.store = {
    state: null,
    role: 'owner', // set from the signed-in account (js/auth.js)
    listeners: [],
    ROLES,
    SCREENS,
    REPORT_TOPICS,

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.state = JSON.parse(raw);
      } catch (e) {
        this.state = null;
      }
      if (!this.state || this.state.version !== 4 || this.state.dataVersion !== FX.DEMO.version) this.state = FX.seed();
      this.save();
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Fluxora: gagal menyimpan', e);
      }
    },
    reset() {
      this.state = FX.seed();
      this.commit();
    },
    on(fn) {
      this.listeners.push(fn);
    },
    commit() {
      if (this._quiet) return; // batched work commits once at the end
      this.save();
      this.listeners.forEach((fn) => fn());
    },
    setRole(r, silent) {
      this.role = r;
      if (!silent) this.listeners.forEach((fn) => fn('role'));
    },
    can(perm) {
      const c = ROLES[this.role].can;
      return c.includes('*') || c.includes(perm);
    },
    /** Clock used for writes. Overridden while replaying backdated events. */
    now() {
      return this._at || Date.now();
    },
    /** Run fn as if it happened at `ts`, attributed to `actor`, without re-rendering per event. */
    replay(ts, actor, fn) {
      const prev = [this._at, this._actor, this._quiet];
      this._at = ts;
      this._actor = actor;
      this._quiet = true;
      try {
        return fn();
      } finally {
        [this._at, this._actor, this._quiet] = prev;
      }
    },
    who() {
      if (this._actor) return this._actor;
      const acc = FX.auth && FX.auth.account();
      return acc ? acc.name : ROLES[this.role].who;
    },

    // ------------------------------------------------------------- lookups
    product(id) {
      return this.state.products.find((p) => p.id === id);
    },
    order(id) {
      return this.state.orders.find((o) => o.id === id);
    },

    // ------------------------------------------------------------ internals
    _log(text, kind) {
      this.state.activity.unshift({ id: FX.uid('AC'), at: this.now(), who: this.who(), role: this.role, text, kind: kind || 'info' });
      if (this.state.activity.length > 400) this.state.activity.length = 400;
    },
    _sync(channel, text, kind) {
      this.state.sync.unshift({ id: FX.uid('SY'), at: this.now(), channel, text, kind: kind || 'push' });
      if (this.state.sync.length > 300) this.state.sync.length = 300;
    },
    _ledger(type, category, amount, note, ref) {
      this.state.ledger.push({ id: FX.uid('JR'), at: this.now(), type, category, amount: Math.round(amount), note, ref: ref || null, auto: !!ref, by: this.who() });
    },
    // The one place stock ever changes. Writes the movement and pushes the new
    // number to both marketplaces in the same step.
    _move(pid, size, delta, reason, ref, sourceChannel) {
      const p = this.product(pid);
      const before = p.stock[size];
      p.stock[size] = before + delta;
      this.state.movements.push({ id: FX.uid('MV'), at: this.now(), pid, size, delta, reason, ref: ref || null, by: this.who() });
      const label = p.sku + ' ' + size + ': ' + before + ' → ' + p.stock[size];
      Object.keys(FX.CHANNELS).forEach((ch) => {
        if (ch === sourceChannel) return;
        this._sync(ch, FX.CHANNELS[ch].name + ' ← ' + label, 'push');
      });
    },
    _salesDay(items, channel, sign) {
      const key = FX.dayKey(this.now());
      const d = (this.state.salesDaily[key] = this.state.salesDaily[key] || { items: {}, rev: { shopee: 0, tokopedia: 0 }, units: { shopee: 0, tokopedia: 0 } });
      items.forEach((it) => {
        const b = (d.items[it.pid] = d.items[it.pid] || { S: 0, M: 0, L: 0, XL: 0 });
        b[it.size] = Math.max(0, b[it.size] + sign * it.qty);
        d.rev[channel] += sign * it.qty * it.price;
        d.units[channel] += sign * it.qty;
      });
    },

    // -------------------------------------------------------------- actions
    /** A marketplace sends an order. Returns {ok, order} or {ok:false, reason}. */
    placeOrder({ channel, items, buyer, courier, shipHours }) {
      const short = items.filter((it) => this.product(it.pid).stock[it.size] < it.qty);
      if (short.length) {
        const it = short[0];
        const p = this.product(it.pid);
        this.state.blocked += 1;
        this._sync(channel, FX.CHANNELS[channel].name + ' ✕ checkout ditolak — ' + p.sku + ' ' + it.size + ' stok 0 di semua kanal', 'block');
        this._log('Overselling dicegah: pembeli ' + FX.CHANNELS[channel].name + ' mencoba membeli ' + p.name + ' ' + it.size + ' yang sudah habis.', 'block');
        this.commit();
        return { ok: false, reason: p.name + ' ' + it.size + ' habis' };
      }
      const now = this.now();
      const o = {
        id: FX.uid('ORD'),
        channel,
        extId: channel === 'shopee' ? FX.dayKey(now).slice(2).replace(/-/g, '') + Math.floor(1e7 + FX.rand() * 8.9e7) + 'K' + String.fromCharCode(65 + Math.floor(FX.rand() * 26)) : 'INV/' + FX.dayKey(now).replace(/-/g, '') + '/MPL/' + Math.floor(3e9 + FX.rand() * 6e9),
        buyer,
        createdAt: now,
        shipBy: now + (shipHours || 24) * FX.HOUR,
        items,
        status: 'baru',
        courier,
        resi: null,
        checked: false,
        history: [{ at: now, text: 'Pesanan masuk dari ' + FX.CHANNELS[channel].name }],
      };
      this.state.orders.unshift(o);
      items.forEach((it) => this._move(it.pid, it.size, -it.qty, 'pesanan', o.id, channel));
      this._salesDay(items, channel, +1);
      this._log('Pesanan ' + FX.CHANNELS[channel].name + ' ' + o.extId + ' masuk. Stok otomatis dikurangi dan disinkronkan.', 'order');
      this.commit();
      return { ok: true, order: o };
    },

    packOrder(id) {
      const o = this.order(id);
      if (!o || o.status !== 'baru') return;
      o.status = 'dikemas';
      o.history.push({ at: Date.now(), text: 'Dikemas oleh ' + this.who() });
      this._log('Pesanan ' + o.extId + ' dikemas.', 'order');
      this.commit();
    },

    /** Hand over to the courier: books the sale and the platform fee. */
    shipOrder(id) {
      const o = this.order(id);
      if (!o || (o.status !== 'baru' && o.status !== 'dikemas')) return;
      o.status = 'dikirim';
      o.resi = (o.channel === 'shopee' ? 'SPXID0' : 'JP') + Math.floor(1e9 + FX.rand() * 8.9e9);
      o.checked = true;
      o.history.push({ at: Date.now(), text: 'Diserahkan ke ' + o.courier + ' · resi ' + o.resi });
      const gross = FX.sum(o.items, (x) => x.price * x.qty);
      const fee = gross * this.state.settings.fees[o.channel];
      this._ledger('in', 'penjualan', gross, 'Pesanan ' + o.extId, o.id);
      this._ledger('out', 'biaya_platform', fee, 'Biaya layanan ' + FX.CHANNELS[o.channel].name + ', ' + o.extId, o.id);
      this._sync(o.channel, FX.CHANNELS[o.channel].name + ' ← resi ' + o.resi + ' untuk ' + o.extId, 'push');
      this._log('Pesanan ' + o.extId + ' diserahkan ke kurir. Penjualan ' + FX.rp(gross) + ' dan biaya platform tercatat di buku kas.', 'money');
      this.commit();
    },

    completeOrder(id) {
      const o = this.order(id);
      if (!o || o.status !== 'dikirim') return;
      o.status = 'selesai';
      o.history.push({ at: Date.now(), text: 'Diterima pembeli' });
      this.commit();
    },

    cancelOrder(id, reason) {
      const o = this.order(id);
      if (!o || (o.status !== 'baru' && o.status !== 'dikemas')) return;
      o.status = 'batal';
      o.cancelReason = reason;
      o.history.push({ at: Date.now(), text: 'Dibatalkan: ' + reason });
      o.items.forEach((it) => this._move(it.pid, it.size, +it.qty, 'batal', o.id, null));
      this._salesDay(o.items, o.channel, -1);
      this._log('Pesanan ' + o.extId + ' dibatalkan (' + reason + '). Stok dikembalikan ke kedua marketplace.', 'warn');
      this.commit();
    },

    checkOrder(id) {
      const o = this.order(id);
      if (!o) return;
      o.checked = !o.checked;
      o.history.push({ at: Date.now(), text: (o.checked ? 'Dicek fisik oleh ' : 'Cek dibatalkan oleh ') + this.who() });
      this.commit();
    },

    /** Goods arrive from the vendor. Stock up + production cost in the cash book. */
    receiveStock({ pid, qty, unitCost, vendor, poId, note }) {
      const p = this.product(pid);
      const total = FX.sizeTotal(qty);
      if (!total) return;
      FX.SIZES.forEach((s) => qty[s] && this._move(pid, s, qty[s], 'masuk', poId || null, null));
      if (unitCost != null) p.cost = unitCost;
      const po = poId && this.state.pos.find((x) => x.id === poId);
      if (po) {
        po.status = 'diterima';
        po.receivedAt = Date.now();
        po.received = Object.assign({}, qty);
      }
      this._ledger('out', 'produksi', total * unitCost, 'Produksi ' + p.name + ' ' + p.color + ' — ' + total + ' pcs' + (vendor ? ', ' + vendor.split(' — ')[0] : ''), poId || 'GRN-' + Date.now().toString(36));
      this._log('Barang masuk ' + total + ' pcs ' + p.name + ' ' + p.color + (po ? ' (' + po.id + ')' : '') + '. Stok bertambah di Shopee & Tokopedia, biaya produksi ' + FX.rp(total * unitCost) + ' tercatat.' + (note ? ' Catatan: ' + note : ''), 'stock');
      this.commit();
    },

    /** Stock opname correction. Physical count wins; the difference is logged. */
    adjustStock(pid, size, counted, note) {
      const p = this.product(pid);
      const delta = counted - p.stock[size];
      if (!delta) return;
      this._move(pid, size, delta, 'koreksi', null, null);
      this._log('Koreksi opname ' + p.sku + ' ' + size + ': ' + (delta > 0 ? '+' : '') + delta + ' pcs. ' + (note || ''), 'warn');
      this.commit();
    },

    createPO({ pid, qty, unitCost, vendor, leadDays, note }) {
      const n = this.state.pos.filter((x) => x.id.startsWith('PO-' + FX.dayKey(Date.now()).slice(2, 7).replace('-', ''))).length;
      const po = {
        id: 'PO-' + FX.dayKey(Date.now()).slice(2, 7).replace('-', '') + '-' + String(n + 1).padStart(2, '0'),
        pid, vendor, qty, unitCost, status: 'dipesan', createdAt: Date.now(), eta: Date.now() + leadDays * FX.DAY,
        receivedAt: null, received: null, by: this.who(), note: note || '',
      };
      this.state.pos.unshift(po);
      const p = this.product(pid);
      this._log('PO ' + po.id + ' ke ' + vendor.split(' — ')[0] + ': ' + FX.sizeTotal(qty) + ' pcs ' + p.name + ' ' + p.color + ', estimasi tiba ' + FX.fmtDate(po.eta) + '.', 'po');
      this.commit();
      return po;
    },

    cancelPO(id) {
      const po = this.state.pos.find((x) => x.id === id);
      if (!po || po.status !== 'dipesan') return;
      po.status = 'batal';
      this._log('PO ' + po.id + ' dibatalkan.', 'warn');
      this.commit();
    },

    addLedger({ type, category, amount, note }) {
      this._ledger(type, category, amount, note, null);
      this.state.ledger[this.state.ledger.length - 1].auto = false;
      this._log('Entri kas manual: ' + (type === 'in' ? '+' : '−') + FX.rp(amount) + ' (' + note + ').', 'money');
      this.commit();
    },

    /** Staff report to a PIC. topic: 'stok' | 'pesanan' | 'kas'. */
    addReport(text, topic) {
      topic = REPORT_TOPICS[topic] ? topic : 'stok';
      const to = REPORT_TOPICS[topic].to;
      this.state.reports.unshift({ id: FX.uid('RP'), at: Date.now(), who: this.who(), role: this.role, to, topic, text, status: 'open' });
      this._log('Laporan untuk ' + ROLES[to].label + ': ' + text, 'warn');
      this.commit();
    },
    /** Reports this role should see: the owner sees all, a PIC sees the ones addressed to them, staff see their own. */
    reportsFor(topic) {
      const role = this.role;
      return this.state.reports.filter(
        (r) => r.status === 'open' && (!topic || (r.topic || 'stok') === topic) && (role === 'owner' || r.to === role || r.role === role || (!r.to && role === 'pic_gudang')),
      );
    },
    resolveReport(id) {
      const r = this.state.reports.find((x) => x.id === id);
      if (!r) return;
      r.status = 'done';
      r.doneBy = this.who();
      r.doneAt = Date.now();
      this._log('Laporan telah ditindaklanjuti: ' + r.text, 'info');
      this.commit();
    },

    setProductImage(pid, url) {
      this.product(pid).img = url.trim();
      this._log('Foto produk ' + this.product(pid).sku + ' diperbarui.', 'info');
      this.commit();
    },
    updateProduct(pid, patch) {
      const p = this.product(pid);
      Object.assign(p, patch);
      this._sync('all', 'Shopee & Tokopedia ← listing ' + p.sku + ' diperbarui (harga ' + FX.rp(p.price) + ')', 'push');
      this._log('Listing ' + p.sku + ' diperbarui.', 'info');
      this.commit();
    },
    updateSettings(patch) {
      Object.assign(this.state.settings, patch);
      this._log('Pengaturan diperbarui.', 'info');
      this.commit();
    },
    markRead(key) {
      this.state.readNotifs[key] = Date.now();
      this.commit();
    },

    // -------------------------------------------------------------- derived
    cash() {
      return FX.sum(this.state.ledger, (j) => (j.type === 'in' ? j.amount : -j.amount));
    },
    onOrder(pid) {
      const out = { S: 0, M: 0, L: 0, XL: 0 };
      this.state.pos.filter((po) => po.pid === pid && po.status === 'dipesan').forEach((po) => FX.SIZES.forEach((s) => (out[s] += po.qty[s] || 0)));
      return out;
    },
    stockValue() {
      return FX.sum(this.state.products, (p) => FX.sizeTotal(p.stock) * p.cost);
    },
    openOrders() {
      return this.state.orders.filter((o) => o.status === 'baru' || o.status === 'dikemas');
    },

    /** Three checks the old spreadsheet could never pass on its own. */
    reconcile() {
      const st = this.state;
      // 1. stock = opening + every movement, per model per size
      const stockIssues = [];
      st.products.forEach((p) => {
        FX.SIZES.forEach((s) => {
          const expected = st.opening[p.id][s] + FX.sum(st.movements.filter((m) => m.pid === p.id && m.size === s), (m) => m.delta);
          if (expected !== p.stock[s]) stockIssues.push(p.sku + ' ' + s + ': catatan ' + expected + ', sistem ' + p.stock[s]);
        });
      });
      // 2. every shipped order has exactly one sale + one fee entry
      const shipped = st.orders.filter((o) => o.status === 'dikirim' || o.status === 'selesai');
      const orderIssues = shipped.filter((o) => st.ledger.filter((j) => j.ref === o.id).length !== 2).map((o) => o.extId);
      // 3. every received PO has its production cost booked
      const poIssues = st.pos.filter((po) => po.status === 'diterima' && !st.ledger.some((j) => j.ref === po.id)).map((po) => po.id);
      return {
        cells: st.products.length * 4,
        movements: st.movements.length,
        shipped: shipped.length,
        received: st.pos.filter((po) => po.status === 'diterima').length,
        stockIssues,
        orderIssues,
        poIssues,
        ok: !stockIssues.length && !orderIssues.length && !poIssues.length,
      };
    },

    /** Everything that needs a human, newest/most urgent first. */
    notifications() {
      const st = this.state;
      const now = Date.now();
      const out = [];
      this.openOrders().forEach((o) => {
        const left = o.shipBy - now;
        if (left < 3 * FX.HOUR) {
          out.push({
            key: 'ship-' + o.id + (left < 0 ? '-late' : ''),
            level: left < 0 ? 'critical' : 'serious',
            kind: 'kurir',
            title: left < 0 ? 'Lewat batas serah kurir' : 'Batas serah kurir ' + FX.countdown(left),
            body: FX.CHANNELS[o.channel].name + ' ' + o.extId + ', ' + o.courier,
            go: 'pesanan',
            ref: o.id,
            at: o.shipBy,
          });
        }
      });
      st.products.forEach((p) => {
        FX.SIZES.forEach((s) => {
          const q = p.stock[s];
          if (q <= st.settings.lowStock) {
            out.push({
              key: 'low-' + p.id + s + '-' + q,
              level: q === 0 ? 'serious' : 'warning',
              kind: 'stok',
              title: q === 0 ? p.name + ' ' + s + ' habis' : p.name + ' ' + s + ' tinggal ' + q,
              body: p.color + ', listing di kedua kanal ' + (q === 0 ? 'otomatis 0' : 'ikut ' + q),
              go: 'stok',
              ref: p.id,
              at: now - 1,
            });
          }
        });
      });
      FX.forecast.all().forEach((f) => {
        if (f.recommend > 0 && f.position <= f.reorderPoint) {
          out.push({
            key: 'fc-' + f.pid + '-' + FX.dayKey(now),
            level: 'warning',
            kind: 'forecast',
            title: 'Saatnya pesan ke maklon: ' + f.product.name,
            body: 'Rekomendasi ' + f.recommend + ' pcs. Stok dan barang dalam perjalanan ' + f.position + ' di bawah titik pesan ' + f.reorderPoint,
            go: 'forecast',
            ref: f.pid,
            at: now - 2,
          });
        }
      });
      this.reportsFor().forEach((r) =>
        out.push({ key: 'rp-' + r.id, level: 'warning', kind: 'laporan', title: 'Laporan dari ' + r.who, body: r.text, go: (REPORT_TOPICS[r.topic] || REPORT_TOPICS.stok).screen, ref: r.id, at: r.at }),
      );
      const rank = { critical: 0, serious: 1, warning: 2 };
      return out.sort((a, b) => rank[a.level] - rank[b.level] || a.at - b.at);
    },
  });
})();
