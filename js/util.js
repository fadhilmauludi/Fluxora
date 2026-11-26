/* Fluxora — small shared helpers. Everything hangs off window.FX so the app
   runs straight from file:// without a build step or module loader. */
(function () {
  const FX = (window.FX = window.FX || {});

  FX.views = {};
  FX.SIZES = ['S', 'M', 'L', 'XL'];
  FX.CHANNELS = {
    shopee: { name: 'Shopee', short: 'SHP', color: '#d9532a' /* mirrors --color-channel-shopee */ },
    tokopedia: { name: 'Tokopedia', short: 'TKP', color: '#178f4f' /* mirrors --color-channel-tokopedia */ },
  };
  FX.DAY = 86400000;
  FX.HOUR = 3600000;

  // Deterministic PRNG so the seeded history is the same on every machine.
  FX.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Sequential ids kept in the state, so the same steps give the same ids everywhere.
  FX.uid = function (prefix) {
    const st = FX.store && FX.store.state;
    let n;
    if (FX._seedSeq != null) n = ++FX._seedSeq;
    else if (st) n = st.seq = (st.seq || 0) + 1;
    else n = Date.now();
    return prefix + '-' + n.toString(36).toUpperCase().padStart(4, '0');
  };

  // Simulation randomiser. Seeded from data/demo-data.js and stored in the state,
  // so a demo plays out identically in every browser for the same sequence of actions.
  FX.rand = function () {
    const st = FX.store && FX.store.state;
    let a = st && st.rng != null ? st.rng : (FX._rngFallback = FX._rngFallback || 0x2545f491);
    a = (a + 0x6d2b79f5) >>> 0;
    if (st && st.rng != null) st.rng = a;
    else FX._rngFallback = a;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const idr = new Intl.NumberFormat('id-ID');
  FX.rp = (n) => 'Rp' + idr.format(Math.round(n));
  FX.rpShort = function (n) {
    const a = Math.abs(n);
    const s = n < 0 ? '−' : '';
    if (a >= 1e9) return s + 'Rp' + (a / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (a >= 1e6) return s + 'Rp' + (a / 1e6).toFixed(1).replace('.', ',') + ' jt';
    if (a >= 1e3) return s + 'Rp' + Math.round(a / 1e3) + ' rb';
    return s + 'Rp' + Math.round(a);
  };
  FX.num = (n) => idr.format(Math.round(n));

  FX.dayKey = function (t) {
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  FX.startOfDay = function (t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  FX.fmtDate = function (t) {
    const d = new Date(t);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  };
  FX.fmtTime = function (t) {
    const d = new Date(t);
    return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
  };
  FX.fmtDateTime = (t) => FX.fmtDate(t) + ', ' + FX.fmtTime(t);
  FX.ago = function (t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return 'baru saja';
    if (s < 3600) return Math.round(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.round(s / 3600) + ' jam lalu';
    return Math.round(s / 86400) + ' hari lalu';
  };
  // "3j 20m" style countdown, negative = overdue.
  FX.countdown = function (ms) {
    const neg = ms < 0;
    const m = Math.floor(Math.abs(ms) / 60000);
    const h = Math.floor(m / 60);
    const out = h >= 24 ? Math.floor(h / 24) + 'hr ' + (h % 24) + 'j' : h ? h + 'j ' + (m % 60) + 'm' : (m % 60) + 'm';
    return neg ? 'telat ' + out : out;
  };

  FX.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  FX.sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
  FX.sizeTotal = (o) => FX.SIZES.reduce((a, s) => a + (o[s] || 0), 0);
  FX.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
})();
