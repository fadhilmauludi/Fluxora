/* Builds the starting state from the central demo file (data/demo-data.js):
   the opening stock snapshot, 12 weeks of sales history, the cash book, open
   orders and the PO in production. Deterministic: the same file gives the same
   numbers in every browser. */
(function () {
  const FX = window.FX;

  // All demo values live in data/demo-data.js (FX.DEMO). This file only turns them
  // into a starting state; it holds no data of its own.
  const D = () => FX.DEMO;

  function isTwinDate(d) {
    return d.getDate() === d.getMonth() + 1;
  }
  function isPayday(d) {
    return d.getDate() >= 25 || d.getDate() <= 1;
  }

  FX.seed = function () {
    const demo = D();
    const H = demo.history;
    const r = FX.rng(demo.rngSeed);
    FX._seedSeq = 0; // deterministic ids while the state is being built
    const now = Date.now();
    const today = FX.startOfDay(now);
    const PRODUCTS = demo.products;
    const products = PRODUCTS.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, color: p.color, hex: p.hex, trim: p.trim || null, cat: p.cat,
      price: p.price, cost: p.cost, img: '', stock: Object.assign({}, demo.opening[p.id]),
    }));
    const channelName = (ch) => FX.CHANNELS[ch].name;

    // ---- Sales history (aggregated per day) --------------------------------
    const salesDaily = {};
    const weekly = []; // for the ledger: [{start, rev:{shopee,tokopedia}}]
    for (let back = H.days; back >= 1; back--) {
      const t = today - back * FX.DAY + 12 * FX.HOUR;
      const d = new Date(t);
      const key = FX.dayKey(t);
      const day = { items: {}, rev: { shopee: 0, tokopedia: 0 }, units: { shopee: 0, tokopedia: 0 } };
      const dow = d.getDay();
      let mult = dow === 0 || dow === 6 ? H.weekendLift : dow === 3 ? H.midweekDip : 1;
      if (isPayday(d)) mult *= H.paydayLift;
      if (isTwinDate(d)) mult *= H.twinDateLift;
      PRODUCTS.forEach((p) => {
        const lambda = p.base * mult * (1 + p.trend * (H.days - back));
        // Poisson draw
        let n = 0;
        const L = Math.exp(-lambda);
        let k = 1;
        do { k *= r(); n++; } while (k > L && n < 60);
        n = Math.max(0, n - 1);
        if (!n) return;
        const bucket = { S: 0, M: 0, L: 0, XL: 0 };
        for (let i = 0; i < n; i++) {
          const x = r();
          let acc = 0;
          for (let s = 0; s < 4; s++) { acc += p.mix[s]; if (x <= acc || s === 3) { bucket[FX.SIZES[s]]++; break; } }
          const ch = r() < H.shopeeShare ? 'shopee' : 'tokopedia';
          day.rev[ch] += p.price;
          day.units[ch] += 1;
        }
        day.items[p.id] = bucket;
      });
      salesDaily[key] = day;
      const wi = Math.floor((H.days - back) / 7);
      if (!weekly[wi]) weekly[wi] = { start: t, rev: { shopee: 0, tokopedia: 0 } };
      weekly[wi].rev.shopee += day.rev.shopee;
      weekly[wi].rev.tokopedia += day.rev.tokopedia;
    }

    // ---- Cash book ---------------------------------------------------------
    const fees = Object.assign({}, demo.settings.fees);
    const ledger = [];
    const L = (at, type, category, amount, note, ref) =>
      ledger.push({ id: FX.uid('JR'), at, type, category, amount: Math.round(amount), note, ref: ref || 'IMPORT', auto: false, by: 'import' });
    L(today - (H.days + 1) * FX.DAY, 'in', 'modal', demo.cashbook.openingBalance, 'Saldo awal kas (impor dari spreadsheet)');
    weekly.forEach((w, i) => {
      const end = w.start + 6 * FX.DAY;
      ['shopee', 'tokopedia'].forEach((ch) => {
        if (!w.rev[ch]) return;
        L(end, 'in', 'penjualan', w.rev[ch], 'Rekap penjualan ' + channelName(ch) + ' minggu ke-' + (i + 1), 'IMPORT');
        L(end, 'out', 'biaya_platform', w.rev[ch] * fees[ch], 'Biaya layanan ' + channelName(ch) + ' minggu ke-' + (i + 1), 'IMPORT');
      });
      if (i % 4 === 1) demo.cashbook.monthlyCosts.forEach((c) => L(w.start + c.dayInWeek * FX.DAY, 'out', 'operasional', c.amount, c.note));
    });
    demo.cashbook.productionRuns.forEach(([back, pid, qty]) => {
      const p = PRODUCTS.find((x) => x.id === pid);
      L(today - back * FX.DAY + 10 * FX.HOUR, 'out', 'produksi', qty * p.cost, 'Produksi ' + p.name + ' ' + p.color + ' — ' + qty + ' pcs', 'IMPORT');
    });

    // ---- Orders in progress ------------------------------------------------
    // Their stock is already out of the opening snapshot.
    const orders = demo.openOrders.map((spec, i) => {
      const ch = spec.channel;
      const items = spec.items.map(([pid, size]) => ({ pid, size, qty: 1, price: PRODUCTS.find((p) => p.id === pid).price }));
      const created = now - spec.minsAgo * 60000;
      const dk = FX.dayKey(created).replace(/-/g, '');
      const o = {
        id: FX.uid('ORD'),
        channel: ch,
        extId: ch === 'shopee' ? dk.slice(2) + String(Math.floor(1e7 + r() * 8.9e7)) + 'K' + String.fromCharCode(65 + Math.floor(r() * 26)) : 'INV/' + dk + '/MPL/' + Math.floor(3e9 + r() * 6e9),
        buyer: spec.buyer,
        createdAt: created,
        shipBy: now + spec.shipByHours * FX.HOUR,
        items,
        status: spec.status,
        courier: spec.courier,
        resi: spec.status === 'dikirim' || spec.status === 'selesai' ? (ch === 'shopee' ? 'SPXID0' : 'JP') + Math.floor(1e9 + r() * 8e9) : null,
        checked: spec.status !== 'baru',
        history: [{ at: created, text: 'Pesanan masuk dari ' + channelName(ch) }],
      };
      if (o.status === 'dikirim' || o.status === 'selesai') {
        const gross = FX.sum(items, (x) => x.price * x.qty);
        L(created + 3 * FX.HOUR, 'in', 'penjualan', gross, 'Pesanan ' + o.extId, o.id);
        L(created + 3 * FX.HOUR, 'out', 'biaya_platform', gross * fees[ch], 'Biaya layanan ' + channelName(ch) + ', ' + o.extId, o.id);
        ledger[ledger.length - 1].auto = ledger[ledger.length - 2].auto = true;
      }
      return o;
    });

    // ---- Purchase orders in production -------------------------------------
    const pos = demo.purchaseOrders.map((x) => ({
      id: x.id, pid: x.pid, vendor: demo.vendors[x.vendorIndex], qty: Object.assign({}, x.qty), unitCost: x.unitCost,
      status: x.status, createdAt: now - x.daysAgo * FX.DAY, eta: now + x.etaDays * FX.DAY, receivedAt: null, received: null, by: 'Owner', note: x.note,
    }));

    const stock0 = {};
    products.forEach((p) => (stock0[p.id] = Object.assign({}, p.stock)));

    const state = {
      version: 4,
      dataVersion: demo.version,
      seededAt: now,
      rng: (demo.rngSeed ^ 0x9e3779b9) >>> 0, // state of the simulation randomiser (FX.rand)
      settings: JSON.parse(JSON.stringify(demo.settings)),
      products,
      opening: stock0, // reconciliation baseline (the spreadsheet import)
      salesDaily,
      orders,
      pos,
      movements: [],
      ledger: ledger.sort((a, b) => a.at - b.at),
      sync: [{ id: FX.uid('SY'), at: now - 5 * 60000, channel: 'all', text: 'Impor awal dari spreadsheet: ' + products.length + ' model × 4 ukuran dipublikasikan ke Shopee dan Tokopedia', kind: 'push' }],
      activity: [{ id: FX.uid('AC'), at: now - 5 * 60000, who: 'Sistem', role: 'system', text: 'Data stok, riwayat penjualan 12 minggu, dan buku kas dimuat dari berkas data simulasi.' }],
      reports: demo.reports.map((x) => ({ id: FX.uid('RP'), at: now - x.minsAgo * 60000, who: x.who, role: x.role, to: x.to, topic: x.topic, text: x.text, status: 'open' })),
      blocked: 0,
      vendors: demo.vendors.slice(),
      buyers: demo.buyers.slice(),
      couriers: JSON.parse(JSON.stringify(demo.couriers)),
      readNotifs: {},
    };
    state.seq = FX._seedSeq;
    FX._seedSeq = null;
    return state;
  };
})();
