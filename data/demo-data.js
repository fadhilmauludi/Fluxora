/* =============================================================================
   FLUXORA — SUMBER DATA SIMULASI TERPUSAT
   -----------------------------------------------------------------------------
   Inilah satu-satunya berkas data demo. Seluruh halaman (Ringkasan, Stok,
   Pesanan, Barang masuk, Keuangan, Forecast, Aktivitas) membaca kondisi awalnya
   dari sini, sehingga setiap browser dan setiap perangkat memulai demo dengan
   angka yang sama persis.

   Cara kerjanya:
   1. Saat pertama dibuka (atau setelah "Atur ulang data demo"), js/seed.js
      menyusun kondisi awal dari berkas ini: katalog, stok pembukaan, riwayat
      penjualan 12 minggu, buku kas, pesanan terbuka, dan PO yang sedang jalan.
   2. Semua angka acak dalam simulasi memakai pengacak berbenih (rngSeed),
      bukan Math.random. Urutan tindakan yang sama menghasilkan angka yang sama
      di browser mana pun.
   3. Waktu disimpan relatif terhadap saat demo dibuka (misalnya "26 jam lalu"),
      jadi data selalu terlihat terkini.

   Mengubah data demo: ubah nilai di bawah, lalu naikkan `version`. Browser yang
   menyimpan versi lama akan otomatis memuat ulang data dari berkas ini.

   PENTING: semua nama produk, harga, pembeli, dan transaksi di sini adalah
   data contoh untuk simulasi, bukan data toko Beckycoo yang sebenarnya.
   ========================================================================== */
(function () {
  const FX = (window.FX = window.FX || {});

  FX.DEMO = {
    version: 4,
    label: 'Data simulasi Fluxora v4',
    rngSeed: 20261119, // benih pengacak: sama untuk semua browser

    // Parameter awal Pengaturan
    settings: {
      leadTimeDays: 21, // waktu produksi maklon
      reviewDays: 14, // siklus tinjau PO
      serviceZ: 1.65, // ≈ 95% peluang tidak kehabisan stok
      lowStock: 3, // batas stok menipis per ukuran
      moq: 24, // minimum pesanan maklon per model
      fees: { shopee: 0.085, tokopedia: 0.07 }, // biaya layanan marketplace
      twinUplift: true, // antisipasi lonjakan tanggal kembar
      loginOrders: true, // pesanan contoh bertambah setiap kali masuk
      loginOrdersMax: 12,
    },

    // Katalog. base = rata-rata terjual per hari; mix = porsi S/M/L/XL; trend = pertumbuhan harian.
    products: [
      { id: 'p1', sku: 'BC-TS01-BLK', name: 'Kaos Oversize Sunday', color: 'Hitam', hex: '#232220', cat: 'kaos', price: 99000, cost: 46000, base: 1.45, mix: [0.16, 0.34, 0.32, 0.18], trend: 0.004 },
      { id: 'p2', sku: 'BC-TS01-WHT', name: 'Kaos Oversize Sunday', color: 'Broken White', hex: '#ECE7DA', cat: 'kaos', price: 99000, cost: 46000, base: 1.1, mix: [0.2, 0.36, 0.28, 0.16], trend: 0.002 },
      { id: 'p3', sku: 'BC-KM02-SGE', name: 'Kemeja Linen Pagi', color: 'Sage', hex: '#9AA58A', cat: 'kemeja', price: 189000, cost: 92000, base: 0.55, mix: [0.18, 0.33, 0.31, 0.18], trend: 0.006 },
      { id: 'p4', sku: 'BC-HD03-GRY', name: 'Hoodie Boxy Senja', color: 'Abu Misty', hex: '#9C9C98', cat: 'hoodie', price: 229000, cost: 118000, base: 0.5, mix: [0.12, 0.3, 0.34, 0.24], trend: 0.011 },
      { id: 'p5', sku: 'BC-CR04-NVY', name: 'Crewneck Rumah', color: 'Navy', hex: '#2B3550', cat: 'crewneck', price: 179000, cost: 86000, base: 0.6, mix: [0.15, 0.33, 0.33, 0.19], trend: 0.007 },
      { id: 'p6', sku: 'BC-CG05-KHK', name: 'Celana Kargo Jalan', color: 'Khaki', hex: '#B49F7A', cat: 'celana', price: 209000, cost: 104000, base: 0.38, mix: [0.17, 0.35, 0.31, 0.17], trend: -0.003 },
      { id: 'p7', sku: 'BC-TS06-CRM', name: 'Kaos Ringer Kota', color: 'Cream / Merah', hex: '#E8DCC2', trim: '#A8352A', cat: 'kaos', price: 89000, cost: 41000, base: 0.62, mix: [0.22, 0.37, 0.27, 0.14], trend: -0.006 },
      { id: 'p8', sku: 'BC-KM07-FLN', name: 'Kemeja Flanel Hujan', color: 'Kotak Hijau', hex: '#3E5A44', trim: '#1E2B22', cat: 'kemeja', price: 199000, cost: 97000, base: 0.32, mix: [0.14, 0.32, 0.34, 0.2], trend: 0.009 },
    ],

    // Stok gudang saat data diimpor dari spreadsheet lama (sudah dikurangi pesanan terbuka).
    opening: {
      p1: { S: 9, M: 14, L: 11, XL: 6 },
      p2: { S: 14, M: 3, L: 22, XL: 13 },
      p3: { S: 9, M: 14, L: 2, XL: 11 },
      p4: { S: 3, M: 5, L: 1, XL: 4 },
      p5: { S: 6, M: 9, L: 8, XL: 0 },
      p6: { S: 5, M: 8, L: 7, XL: 6 },
      p7: { S: 12, M: 18, L: 14, XL: 9 },
      p8: { S: 2, M: 4, L: 3, XL: 1 },
    },

    vendors: ['Konveksi Sinar Jaya — Bandung', 'CV Rajut Mandiri — Solo', 'Maklon Garmen Prima — Bogor'],
    buyers: ['rizky.ap', 'nadiaputri_', 'b4gas', 'sekar.ayu', 'dimasw', 'tiaraaa', 'farhan.id', 'kezia.n', 'yogi_pr', 'ainunn', 'raka.s', 'cindyy.m', 'ilhambs', 'putriwln', 'adit.k', 'sarahmhd', 'galihr', 'nabila.z', 'arya_w', 'vina.oct'],
    couriers: {
      shopee: ['SPX Standard', 'SPX Hemat', 'J&T Express', 'SPX Instant'],
      tokopedia: ['GoSend Same Day', 'JNE Reguler', 'SiCepat REG', 'AnterAja'],
    },

    // Riwayat penjualan yang disusun ulang setiap kali data dimuat.
    history: {
      days: 84, // 12 minggu
      shopeeShare: 0.69, // porsi pesanan dari Shopee
      weekendLift: 1.18,
      midweekDip: 0.9, // Rabu
      paydayLift: 1.25, // tanggal 25 sampai 1
      twinDateLift: 3.4, // 11.11, 12.12, dan seterusnya
    },

    // Buku kas dari spreadsheet lama
    cashbook: {
      openingBalance: 42000000,
      monthlyCosts: [
        { dayInWeek: 2, amount: 6500000, note: 'Gaji staf gudang dan admin' },
        { dayInWeek: 3, amount: 1150000, note: 'Polymailer, label, dan lakban' },
      ],
      // [hari lalu, produk, jumlah pcs] produksi yang sudah dibayar ke maklon
      productionRuns: [[80, 'p1', 120], [74, 'p7', 96], [66, 'p3', 48], [58, 'p4', 48], [51, 'p2', 96], [44, 'p5', 60], [37, 'p1', 96], [30, 'p6', 48], [23, 'p8', 36], [16, 'p7', 72], [9, 'p2', 60]],
    },

    // Pesanan yang sedang berjalan saat demo dibuka.
    // minsAgo = menit sejak pesanan masuk; shipByHours = sisa jam ke batas serah kurir (negatif = sudah lewat).
    openOrders: [
      { channel: 'shopee', minsAgo: 1560, shipByHours: -0.6, status: 'baru', buyer: 'rizky.ap', courier: 'SPX Standard', items: [['p1', 'M']] },
      { channel: 'tokopedia', minsAgo: 1200, shipByHours: 1.4, status: 'dikemas', buyer: 'galihr', courier: 'JNE Reguler', items: [['p3', 'L']] },
      { channel: 'shopee', minsAgo: 1080, shipByHours: 2.2, status: 'baru', buyer: 'kezia.n', courier: 'J&T Express', items: [['p2', 'S'], ['p7', 'M']] },
      { channel: 'shopee', minsAgo: 540, shipByHours: 5.5, status: 'baru', buyer: 'sarahmhd', courier: 'SPX Hemat', items: [['p4', 'XL']] },
      { channel: 'tokopedia', minsAgo: 420, shipByHours: 2.6, status: 'baru', buyer: 'ilhambs', courier: 'SiCepat REG', items: [['p5', 'M']] },
      { channel: 'shopee', minsAgo: 300, shipByHours: 19, status: 'dikemas', buyer: 'tiaraaa', courier: 'SPX Standard', items: [['p1', 'L']] },
      { channel: 'shopee', minsAgo: 180, shipByHours: 21, status: 'baru', buyer: 'arya_w', courier: 'SPX Standard', items: [['p6', 'M']] },
      { channel: 'tokopedia', minsAgo: 100, shipByHours: 26, status: 'baru', buyer: 'sekar.ayu', courier: 'AnterAja', items: [['p2', 'L']] },
      { channel: 'shopee', minsAgo: 55, shipByHours: 30, status: 'baru', buyer: 'dimasw', courier: 'J&T Express', items: [['p7', 'S']] },
      { channel: 'shopee', minsAgo: 1800, shipByHours: -8, status: 'dikirim', buyer: 'nabila.z', courier: 'SPX Standard', items: [['p8', 'M']] },
      { channel: 'tokopedia', minsAgo: 1680, shipByHours: -6, status: 'dikirim', buyer: 'putriwln', courier: 'GoSend Same Day', items: [['p1', 'XL'], ['p2', 'M']] },
      { channel: 'shopee', minsAgo: 2760, shipByHours: -26, status: 'selesai', buyer: 'raka.s', courier: 'SPX Hemat', items: [['p3', 'M']] },
    ],

    // PO yang sedang diproduksi maklon
    purchaseOrders: [
      { id: 'PO-2611-01', pid: 'p4', vendorIndex: 1, qty: { S: 6, M: 14, L: 16, XL: 12 }, unitCost: 118000, status: 'dipesan', daysAgo: 12, etaDays: 4, note: 'Persiapan 12.12' },
    ],

    // Laporan staf yang belum ditindaklanjuti
    reports: [
      { minsAgo: 70, who: 'Staf Gudang', role: 'staf', to: 'pic_gudang', topic: 'stok', text: 'Kemeja Flanel Hujan XL: di rak tercatat 1 pcs, tetapi labelnya rusak. Mohon dicek ulang saat opname.' },
    ],
  };
})();
