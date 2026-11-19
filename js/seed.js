/* Demo data. Framed as the first import from Beckycoo's old spreadsheet:
   the opening stock snapshot, 12 weeks of sales history, and the cash book.
   Product names / prices are placeholders — swap in the real catalogue. */
(function () {
  const FX = window.FX;

  const PRODUCTS = [
    { id: 'p1', sku: 'BC-TS01-BLK', name: 'Kaos Oversize Sunday', color: 'Hitam', hex: '#232220', cat: 'kaos', price: 99000, cost: 46000, base: 1.45, mix: [0.16, 0.34, 0.32, 0.18], trend: 0.004 },
    { id: 'p2', sku: 'BC-TS01-WHT', name: 'Kaos Oversize Sunday', color: 'Broken White', hex: '#ECE7DA', cat: 'kaos', price: 99000, cost: 46000, base: 1.1, mix: [0.2, 0.36, 0.28, 0.16], trend: 0.002 },
    { id: 'p3', sku: 'BC-KM02-SGE', name: 'Kemeja Linen Pagi', color: 'Sage', hex: '#9AA58A', cat: 'kemeja', price: 189000, cost: 92000, base: 0.55, mix: [0.18, 0.33, 0.31, 0.18], trend: 0.006 },
    { id: 'p4', sku: 'BC-HD03-GRY', name: 'Hoodie Boxy Senja', color: 'Abu Misty', hex: '#9C9C98', cat: 'hoodie', price: 229000, cost: 118000, base: 0.5, mix: [0.12, 0.3, 0.34, 0.24], trend: 0.011 },
    { id: 'p5', sku: 'BC-CR04-NVY', name: 'Crewneck Rumah', color: 'Navy', hex: '#2B3550', cat: 'crewneck', price: 179000, cost: 86000, base: 0.6, mix: [0.15, 0.33, 0.33, 0.19], trend: 0.007 },
    { id: 'p6', sku: 'BC-CG05-KHK', name: 'Celana Kargo Jalan', color: 'Khaki', hex: '#B49F7A', cat: 'celana', price: 209000, cost: 104000, base: 0.38, mix: [0.17, 0.35, 0.31, 0.17], trend: -0.003 },
    { id: 'p7', sku: 'BC-TS06-CRM', name: 'Kaos Ringer Kota', color: 'Cream / Merah', hex: '#E8DCC2', trim: '#A8352A', cat: 'kaos', price: 89000, cost: 41000, base: 0.62, mix: [0.22, 0.37, 0.27, 0.14], trend: -0.006 },
    { id: 'p8', sku: 'BC-KM07-FLN', name: 'Kemeja Flanel Hujan', color: 'Kotak Hijau', hex: '#3E5A44', trim: '#1E2B22', cat: 'kemeja', price: 199000, cost: 97000, base: 0.32, mix: [0.14, 0.32, 0.34, 0.2], trend: 0.009 },
  ];

  // Stock at import time, deliberately uneven — that is the point of the tool.
  const OPENING = {
    p1: { S: 9, M: 14, L: 11, XL: 6 },
    p2: { S: 14, M: 3, L: 22, XL: 13 },
    p3: { S: 9, M: 14, L: 2, XL: 11 },
    p4: { S: 3, M: 5, L: 1, XL: 4 },
    p5: { S: 6, M: 9, L: 8, XL: 0 },
    p6: { S: 5, M: 8, L: 7, XL: 6 },
    p7: { S: 12, M: 18, L: 14, XL: 9 },
    p8: { S: 2, M: 4, L: 3, XL: 1 },
  };

  const VENDORS = ['Konveksi Sinar Jaya — Bandung', 'CV Rajut Mandiri — Solo', 'Maklon Garmen Prima — Bogor'];
  const BUYERS = ['rizky.ap', 'nadiaputri_', 'b4gas', 'sekar.ayu', 'dimasw', 'tiaraaa', 'farhan.id', 'kezia.n', 'yogi_pr', 'ainunn', 'raka.s', 'cindyy.m', 'ilhambs', 'putriwln', 'adit.k', 'sarahmhd', 'galihr', 'nabila.z', 'arya_w', 'vina.oct'];
  const COURIERS = { shopee: ['SPX Standard', 'SPX Hemat', 'J&T Express', 'SPX Instant'], tokopedia: ['GoSend Same Day', 'JNE Reguler', 'SiCepat REG', 'AnterAja'] };

  function isTwinDate(d) {
    return d.getDate() === d.getMonth() + 1;
  }
  function isPayday(d) {
    return d.getDate() >= 25 || d.getDate() <= 1;
  }

  FX.seed = function () {
    const r = FX.rng(20261119);
    const now = Date.now();
    const today = FX.startOfDay(now);
    const products = PRODUCTS.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, color: p.color, hex: p.hex, trim: p.trim || null, cat: p.cat,
      price: p.price, cost: p.cost, img: '', stock: Object.assign({}, OPENING[p.id]),
    }));

    // ---- 84 days of sales history (aggregated per day) --------------------
    const salesDaily = {};
    const weekly = []; // for the ledger: [{start, rev:{shopee,tokopedia}}]
    for (let back = 84; back >= 1; back--) {
      const t = today - back * FX.DAY + 12 * FX.HOUR;
      const d = new Date(t);
      const key = FX.dayKey(t);
      const day = { items: {}, rev: { shopee: 0, tokopedia: 0 }, units: { shopee: 0, tokopedia: 0 } };
      const dow = d.getDay();
      let mult = dow === 0 || dow === 6 ? 1.18 : dow === 3 ? 0.9 : 1;
      if (isPayday(d)) mult *= 1.25;
      if (isTwinDate(d)) mult *= 3.4;
      PRODUCTS.forEach((p) => {
        const lambda = p.base * mult * (1 + p.trend * (84 - back));
        // Poisson-ish draw
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
          const ch = r() < 0.69 ? 'shopee' : 'tokopedia';
          day.rev[ch] += p.price;
          day.units[ch] += 1;
        }
        day.items[p.id] = bucket;
      });
      salesDaily[key] = day;
      const wi = Math.floor((84 - back) / 7);
      if (!weekly[wi]) weekly[wi] = { start: t, rev: { shopee: 0, tokopedia: 0 } };
      weekly[wi].rev.shopee += day.rev.shopee;
      weekly[wi].rev.tokopedia += day.rev.tokopedia;
    }

    // ---- Cash book ---------------------------------------------------------
    const fees = { shopee: 0.085, tokopedia: 0.07 };
    const ledger = [];
    const L = (at, type, category, amount, note, ref) =>
      ledger.push({ id: FX.uid('JR'), at, type, category, amount: Math.round(amount), note, ref: ref || 'IMPORT', auto: false, by: 'import' });
    L(today - 85 * FX.DAY, 'in', 'modal', 42000000, 'Saldo awal kas (impor spreadsheet)');
    weekly.forEach((w, i) => {
      const end = w.start + 6 * FX.DAY;
      ['shopee', 'tokopedia'].forEach((ch) => {
        if (!w.rev[ch]) return;
        L(end, 'in', 'penjualan', w.rev[ch], 'Rekap penjualan ' + FX.CHANNELS[ch].name + ' minggu ke-' + (i + 1), 'IMPORT');
        L(end, 'out', 'biaya_platform', w.rev[ch] * fees[ch], 'Biaya layanan ' + FX.CHANNELS[ch].name + ' minggu ke-' + (i + 1), 'IMPORT');
      });
      if (i % 4 === 1) {
        L(w.start + 2 * FX.DAY, 'out', 'operasional', 6500000, 'Gaji staf gudang & admin');
        L(w.start + 3 * FX.DAY, 'out', 'operasional', 1150000, 'Polymailer, label & lakban');
      }
    });
    // Production runs in the past (paid to vendors)
    [[80, 'p1', 120], [74, 'p7', 96], [66, 'p3', 48], [58, 'p4', 48], [51, 'p2', 96], [44, 'p5', 60], [37, 'p1', 96], [30, 'p6', 48], [23, 'p8', 36], [16, 'p7', 72], [9, 'p2', 60]].forEach(([back, pid, qty]) => {
      const p = PRODUCTS.find((x) => x.id === pid);
      L(today - back * FX.DAY + 10 * FX.HOUR, 'out', 'produksi', qty * p.cost, 'Produksi ' + p.name + ' ' + p.color + ' — ' + qty + ' pcs', 'IMPORT');
    });

    // ---- Open orders waiting to be packed / shipped -------------------------
    // Their stock is already out of OPENING (it was taken when they came in).
    const orders = [];
    const openSpec = [
      // [channel, minutesAgoCreated, hoursUntilShipBy, status]
      ['shopee', 26 * 60, -0.6, 'baru'],
      ['tokopedia', 20 * 60, 1.4, 'dikemas'],
      ['shopee', 18 * 60, 2.2, 'baru'],
      ['shopee', 9 * 60, 5.5, 'baru'],
      ['tokopedia', 7 * 60, 2.6, 'baru'],
      ['shopee', 5 * 60, 19, 'dikemas'],
      ['shopee', 3 * 60, 21, 'baru'],
      ['tokopedia', 100, 26, 'baru'],
      ['shopee', 55, 30, 'baru'],
      ['shopee', 30 * 60, -8, 'dikirim'],
      ['tokopedia', 28 * 60, -6, 'dikirim'],
      ['shopee', 46 * 60, -26, 'selesai'],
    ];
    openSpec.forEach(([ch, minsAgo, hrs, status], i) => {
      const nItems = r() < 0.75 ? 1 : 2;
      const items = [];
      for (let k = 0; k < nItems; k++) {
        const p = FX.pick(r, PRODUCTS);
        const size = FX.SIZES[Math.min(3, Math.floor(r() * 4))];
        if (items.some((x) => x.pid === p.id && x.size === size)) continue;
        items.push({ pid: p.id, size, qty: 1, price: p.price });
      }
      const created = now - minsAgo * 60000;
      const o = {
        id: FX.uid('ORD'),
        channel: ch,
        extId: ch === 'shopee' ? '2611' + (18 + (i % 2)) + String(Math.floor(1e7 + r() * 8.9e7)) + 'K' + String.fromCharCode(65 + Math.floor(r() * 26)) : 'INV/2026111' + (8 + (i % 2)) + '/MPL/' + Math.floor(3e9 + r() * 6e9),
        buyer: BUYERS[(i * 7) % BUYERS.length],
        createdAt: created,
        shipBy: now + hrs * FX.HOUR,
        items,
        status,
        courier: FX.pick(r, COURIERS[ch]),
        resi: status === 'dikirim' || status === 'selesai' ? (ch === 'shopee' ? 'SPXID0' : 'JP') + Math.floor(1e9 + r() * 8e9) : null,
        checked: status !== 'baru',
        history: [{ at: created, text: 'Pesanan masuk dari ' + FX.CHANNELS[ch].name }],
      };
      orders.push(o);
      if (status === 'dikirim' || status === 'selesai') {
        const gross = FX.sum(items, (x) => x.price * x.qty);
        L(created + 3 * FX.HOUR, 'in', 'penjualan', gross, 'Pesanan ' + o.extId, o.id);
        L(created + 3 * FX.HOUR, 'out', 'biaya_platform', gross * fees[ch], 'Biaya layanan ' + FX.CHANNELS[ch].name + ', ' + o.extId, o.id);
        ledger[ledger.length - 1].auto = ledger[ledger.length - 2].auto = true;
      }
    });

    // ---- A purchase order already on its way from the vendor ----------------
    const pos = [
      {
        id: 'PO-2611-01', pid: 'p4', vendor: VENDORS[1], qty: { S: 6, M: 14, L: 16, XL: 12 }, unitCost: 118000,
        status: 'dipesan', createdAt: now - 12 * FX.DAY, eta: now + 4 * FX.DAY, receivedAt: null, received: null, by: 'Owner', note: 'Persiapan 12.12',
      },
    ];

    const stock0 = {};
    products.forEach((p) => (stock0[p.id] = Object.assign({}, p.stock)));

    return {
      version: 3,
      seededAt: now,
      settings: { leadTimeDays: 21, reviewDays: 14, serviceZ: 1.65, lowStock: 3, moq: 24, fees, twinUplift: true },
      products,
      opening: stock0, // reconciliation baseline (the spreadsheet import)
      salesDaily,
      orders,
      pos,
      movements: [],
      ledger: ledger.sort((a, b) => a.at - b.at),
      sync: [{ id: FX.uid('SY'), at: now - 5 * 60000, channel: 'all', text: 'Impor awal dari spreadsheet: 8 model × 4 ukuran dipublikasikan ke Shopee & Tokopedia', kind: 'push' }],
      activity: [{ id: FX.uid('AC'), at: now - 5 * 60000, who: 'Sistem', role: 'system', text: 'Data stok, riwayat penjualan 12 minggu, dan buku kas diimpor dari spreadsheet lama.' }],
      reports: [
        { id: FX.uid('RP'), at: now - 70 * 60000, who: 'Staf Gudang', text: 'Kemeja Flanel Hujan XL: rak menunjukkan 1 pcs, label lusuh. Mohon cek ulang saat opname.', status: 'open' },
      ],
      blocked: 0,
      vendors: VENDORS,
      buyers: BUYERS,
      couriers: COURIERS,
      readNotifs: {},
    };
  };
})();
