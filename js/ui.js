/* Shared UI pieces: thumbnails, tags, drawer, toasts, and the two hand-built
   SVG charts (stacked daily bars, forecast line). */
(function () {
  const FX = window.FX;
  const esc = FX.esc;
  const ui = (FX.ui = {});

  // ---------------------------------------------------------------- icons
  const I = {
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h5l3 3v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1z"/><path d="M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.2"/>',
    trend: '<path d="M4 18l6-6 4 3 6-8"/><path d="M15 7h5v5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    logout: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    stop: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16v.5"/>',
    ok: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    help: '<circle cx="12" cy="12" r="8"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17v.5"/>',
    info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8v.5"/>',
  };

  ui.icon = (name, size) =>
    '<svg width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[name] + '</svg>';

  // ------------------------------------------------- garment silhouettes
  // Shown until a real Beckycoo photo is set (Pengaturan → Foto produk,
  // with a URL or a file path under assets/products/).
  const SHAPES = {
    kaos: 'M30 14 L42 10 Q50 16 58 10 L70 14 L86 30 L76 40 L70 35 L70 90 L30 90 L30 35 L24 40 L14 30 Z',
    kemeja: 'M32 12 L44 9 L50 18 L56 9 L68 12 L84 26 L86 88 L76 88 L72 40 L72 92 L28 92 L28 40 L24 88 L14 88 L16 26 Z',
    hoodie: 'M30 16 Q34 4 50 4 Q66 4 70 16 L86 30 L88 86 L76 86 L72 44 L72 92 L28 92 L28 44 L24 86 L12 86 L14 30 Z',
    crewneck: 'M30 14 L42 10 Q50 17 58 10 L70 14 L86 28 L88 86 L76 86 L72 42 L72 90 L28 90 L28 42 L24 86 L12 86 L14 28 Z',
    celana: 'M30 8 L70 8 L74 92 L56 92 L50 34 L44 92 L26 92 Z',
  };
  ui.silhouette = function (p) {
    const d = SHAPES[p.cat] || SHAPES.kaos;
    const dark = isDark(p.hex);
    const line = dark ? 'rgba(255,255,255,.28)' : 'rgba(23,22,15,.35)';
    let extra = '';
    if (p.trim && p.cat === 'kaos') extra = '<path d="M42 10 Q50 16 58 10" stroke="' + p.trim + '" stroke-width="3" fill="none"/><path d="M14 30 L24 40 M86 30 L76 40" stroke="' + p.trim + '" stroke-width="3"/>';
    if (p.trim && p.cat === 'kemeja') extra = '<g stroke="' + p.trim + '" stroke-width="2" opacity=".55"><path d="M28 40 H72 M28 56 H72 M28 72 H72 M40 20 V92 M60 20 V92"/></g>';
    if (p.cat === 'kemeja') extra += '<path d="M50 18 V92" stroke="' + line + '" stroke-width="1"/><g fill="' + line + '"><circle cx="50" cy="34" r="1.3"/><circle cx="50" cy="50" r="1.3"/><circle cx="50" cy="66" r="1.3"/></g>';
    if (p.cat === 'hoodie') extra += '<path d="M40 40 L40 60 M60 40 L60 60" stroke="' + line + '"/><path d="M36 70 H64 V84 H36 Z" fill="none" stroke="' + line + '"/>';
    if (p.cat === 'celana') extra += '<path d="M30 16 H70" stroke="' + line + '"/><rect x="28" y="46" width="12" height="14" fill="none" stroke="' + line + '"/><rect x="60" y="46" width="12" height="14" fill="none" stroke="' + line + '"/>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="c' + p.id + '"><path d="' + d + '"/></clipPath></defs><path d="' + d + '" fill="' + p.hex + '" stroke="' + (dark ? p.hex : 'rgba(23,22,15,.3)') + '" stroke-width="1"/><g clip-path="url(#c' + p.id + ')">' + extra + '</g></svg>';
  };
  function isDark(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 120;
  }

  const missing = new Set();
  ui.miss = (img) => (missing.add(img.getAttribute('src')), img.remove());
  ui.thumb = function (p, size) {
    // Only request a photo that has been set (Pengaturan → Foto & listing produk),
    // either a URL or a project path such as assets/products/BC-TS01-BLK.jpg.
    const src = p.img || '';
    const tryImg = !!src && !missing.has(src);
    return (
      '<span class="thumb ' + (size || '') + '" title="' + esc(p.name + ' — ' + p.color) + '">' +
      (tryImg ? '<img src="' + esc(src) + '" alt="' + esc(p.name + ' ' + p.color) + '" loading="lazy" onerror="FX.ui.miss(this)">' : '') +
      '<span class="sil" style="position:absolute;inset:0;display:grid;place-items:center;z-index:-0">' + ui.silhouette(p) + '</span>' +
      '</span>'
    );
  };

  ui.prod = function (p, size) {
    return '<div class="prod">' + ui.thumb(p, size) + '<div><div class="nm">' + esc(p.name) + '</div><div class="sku">' + esc(p.color) + '<span class="sku-code">' + esc(p.sku) + '</span></div></div></div>';
  };

  ui.ch = (c) => '<span class="ch ' + c + '">' + FX.CHANNELS[c].name + '</span>';
  const ST = { baru: 'Perlu dikemas', dikemas: 'Siap kirim', dikirim: 'Di kurir', selesai: 'Selesai', batal: 'Dibatalkan' };
  ui.status = (s) => '<span class="st ' + s + '">' + ST[s] + '</span>';
  // Status never relies on colour alone: every level carries its own icon.
  const LVL_ICON = { critical: 'stop', serious: 'alert', warning: 'alert', good: 'ok', neutral: 'info', info: 'info' };
  ui.lvl = (level, text) => '<span class="lvl ' + level + '">' + ui.icon(LVL_ICON[level] || 'info', 13) + esc(text) + '</span>';
  const KIND = { kurir: 'Kurir', stok: 'Stok', forecast: 'Forecast', laporan: 'Laporan' };
  ui.kindLabel = (k) => KIND[k] || k;

  ui.deadline = function (o) {
    if (o.status !== 'baru' && o.status !== 'dikemas') return '<span class="muted mono">—</span>';
    const left = o.shipBy - Date.now();
    const cls = left < 0 ? 'late' : left < 3 * FX.HOUR ? 'soon' : '';
    return '<span class="deadline ' + cls + '" title="Batas serah kurir ' + FX.fmtDateTime(o.shipBy) + '">' + FX.countdown(left) + '</span>';
  };

  ui.itemsLine = function (o) {
    return o.items
      .map((it) => {
        const p = FX.store.product(it.pid);
        return esc(p.name) + ' <span class="muted">' + esc(p.color) + '</span> <b class="mono">' + it.size + '</b>' + (it.qty > 1 ? ' ×' + it.qty : '');
      })
      .join('<br>');
  };

  ui.readonly = function (what) {
    return '<div class="readonly-bar">' + ui.icon('eye') + '<span><b>Mode lihat.</b> ' + what + '</span></div>';
  };

  // ---------------------------------------------------------------- toast
  ui.toast = function (text, kind, tag) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = (tag ? '<span class="tk">' + esc(tag) + '</span>' : '') + '<span>' + text + '</span>';
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 200); }, 4200);
    while (wrap.children.length > 3) wrap.firstChild.remove();
  };

  // --------------------------------------------------------------- drawer
  ui.drawer = function ({ title, sub, body, foot, onMount, wide }) {
    ui.closeDrawer();
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const d = document.createElement('aside');
    d.className = 'drawer';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    if (wide) d.style.width = 'min(720px, 100vw)';
    d.innerHTML =
      '<div class="drawer-h"><div><h3>' + title + '</h3>' + (sub ? '<div class="muted" style="margin-top:4px;font-size:13px">' + sub + '</div>' : '') + '</div><div class="spacer"></div><button class="x" data-close aria-label="Tutup">' + ui.icon('x', 20) + '</button></div>' +
      '<div class="drawer-b">' + body + '</div>' + (foot ? '<div class="drawer-f">' + foot + '</div>' : '');
    document.body.append(scrim, d);
    scrim.onclick = ui.closeDrawer;
    d.querySelectorAll('[data-close]').forEach((b) => (b.onclick = ui.closeDrawer));
    const first = d.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 40);
    if (onMount) onMount(d);
    return d;
  };
  /** In-page confirm (window.confirm is blocked inside sandboxed viewers). */
  ui.confirm = function (title, text, yesLabel, onYes) {
    const d = ui.drawer({
      title: esc(title),
      body: '<p class="ink2" style="margin:0">' + text + '</p>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="cf-yes">' + esc(yesLabel) + '</button>',
    });
    d.querySelector('#cf-yes').onclick = () => {
      ui.closeDrawer();
      onYes();
    };
  };
  ui.closeDrawer = function () {
    document.querySelectorAll('.drawer, .scrim').forEach((n) => n.remove());
  };
  document.addEventListener('keydown', (e) => e.key === 'Escape' && ui.closeDrawer());

  // ---------------------------------------------------------------- charts
  /** Stacked daily bars, one stack per day, Shopee bottom / Tokopedia top. */
  ui.stackedBars = function (days, opts) {
    const W = 720, H = opts.height || 220, padL = 46, padB = 24, padT = 8;
    const max = Math.max(1, ...days.map((d) => d.shopee + d.tokopedia));
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const bw = (W - padL) / days.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    let g = '';
    for (let v = 0; v <= top; v += step) {
      g += '<line class="gridline" x1="' + padL + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
      g += '<text class="axis" x="' + (padL - 8) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + opts.fmtAxis(v) + '</text>';
    }
    let bars = '';
    days.forEach((d, i) => {
      const x = padL + i * bw + 2;
      const w = Math.max(2, bw - 4);
      const y0 = y(0);
      const ys = y(d.shopee);
      const yt = y(d.shopee + d.tokopedia);
      const hs = y0 - ys;
      const ht = ys - yt - (d.tokopedia && d.shopee ? 2 : 0);
      if (d.shopee) bars += '<path d="' + roundTop(x, ys, w, hs, d.tokopedia ? 0 : 3) + '" style="fill:var(--color-channel-shopee)"/>';
      if (d.tokopedia) bars += '<path d="' + roundTop(x, yt, w, Math.max(0, ht), 3) + '" style="fill:url(#tkp-hatch)"/>';
      if (d.twin) bars += '<text class="axis" x="' + (x + w / 2) + '" y="' + (yt - 5) + '" text-anchor="middle" class="axis axis-strong">' + d.twin + '</text>';
      if (i % opts.labelEvery === 0 || i === days.length - 1) bars += '<text class="axis" x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + d.label + '</text>';
      bars += '<rect class="hit" data-i="' + i + '" x="' + (padL + i * bw) + '" y="' + padT + '" width="' + bw + '" height="' + (H - padT - padB) + '" fill="transparent"/>';
    });
    const defs = '<defs><pattern id="tkp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" style="fill:var(--color-channel-tokopedia)"/><rect width="1.4" height="5" style="fill:var(--color-channel-tokopedia-text)"/></pattern></defs>';
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria) + '">' + defs + g + bars + '<line class="baseline" x1="' + padL + '" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    return { html: '<div class="chart" data-chart="bars">' + svg + '</div>', bind: (root) => bindTip(root, days, opts.tip, W) };
  };

  /** Weekly history (solid) + forecast (dashed) for one model. */
  ui.forecastLine = function (f, opts) {
    const W = opts.width || 520, H = opts.height || 150, padL = 30, padB = 20, padT = 10;
    const hist = f.series.map((s) => s.units);
    const fc = f.next.slice(0, 4);
    const all = hist.concat(fc);
    const max = Math.max(4, ...all);
    const step = niceStep(max, 3);
    const top = Math.ceil(max / step) * step;
    const n = all.length;
    const x = (i) => padL + (W - padL - 6) * (i / (n - 1));
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    let g = '';
    for (let v = 0; v <= top; v += step) g += '<line class="gridline" x1="' + padL + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (padL - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + v + '</text>';
    const hp = hist.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const fp = 'M' + x(hist.length - 1) + ' ' + y(hist[hist.length - 1]) + ' ' + fc.map((v, i) => 'L' + x(hist.length + i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const band = fc.map((v, i) => [x(hist.length + i), y(v + f.sigma * 1.2), y(Math.max(0, v - f.sigma * 1.2))]);
    const bandPath = 'M' + x(hist.length - 1) + ' ' + y(hist[hist.length - 1]) + ' ' + band.map((b) => 'L' + b[0] + ' ' + b[1]).join(' ') + ' ' + band.slice().reverse().map((b) => 'L' + b[0] + ' ' + b[2]).join(' ') + ' Z';
    const nowX = x(hist.length - 1);
    let dots = '';
    hist.forEach((v, i) => (dots += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" style="fill:var(--color-text-primary);stroke:var(--color-surface-raised)" stroke-width="2"/>'));
    let labels = '<text class="axis" x="' + x(0) + '" y="' + (H - 4) + '" text-anchor="start">' + FX.fmtDate(f.series[0].start) + '</text>' + '<text class="axis" x="' + nowX + '" y="' + (H - 4) + '" text-anchor="middle" class="axis axis-strong">minggu ini</text>' + '<text class="axis" x="' + x(n - 1) + '" y="' + (H - 4) + '" text-anchor="end">+4 mgg</text>';
    let hits = '';
    all.forEach((v, i) => (hits += '<rect class="hit" data-i="' + i + '" x="' + (x(i) - (W / n) / 2) + '" y="' + padT + '" width="' + W / n + '" height="' + (H - padT - padB) + '" fill="transparent"/>'));
    const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Penjualan mingguan dan perkiraan ' + esc(f.product.name) + '">' + g + '<path d="' + bandPath + '" style="fill:var(--color-action-primary)" opacity=".08"/><line x1="' + nowX + '" x2="' + nowX + '" y1="' + padT + '" y2="' + (H - padB) + '" style="stroke:var(--color-border-strong)" stroke-dasharray="2 3"/><path d="' + hp + '" fill="none" style="stroke:var(--color-text-primary)" stroke-width="2" stroke-linejoin="round"/><path d="' + fp + '" fill="none" style="stroke:var(--color-action-primary)" stroke-width="2" stroke-dasharray="5 4"/>' + dots + labels + '<line class="baseline" x1="' + padL + '" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '"/>' + hits + '</svg>';
    const pts = all.map((v, i) => ({ v, i, fc: i >= hist.length, start: i < hist.length ? f.series[i].start : f.series[hist.length - 1].start + (i - hist.length + 1) * 7 * FX.DAY }));
    return {
      html: '<div class="chart">' + svg + '</div>',
      bind: (root) =>
        bindTip(root, pts, (p) => '<b>' + (p.fc ? 'Perkiraan ' : 'Minggu ') + FX.fmtDate(p.start) + '</b><div class="row"><span>' + (p.fc ? 'perkiraan' : 'terjual') + '</span><span class="num">' + Math.round(p.v) + ' pcs</span></div>', W),
    };
  };

  function roundTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return 'M' + x + ' ' + (y + h) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' H' + (x + w - r) + ' Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + ' V' + (y + h) + ' Z';
  }
  function niceStep(max, ticks) {
    const raw = max / (ticks || 4);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  // Tooltip placement: beside the hovered mark (right side, flipping to the left
  // near the edge) and clamped inside the chart, so it is never clipped by the
  // panel's rounded overflow.
  function bindTip(root, data, fmt, W) {
    const chart = root.querySelector('.chart') || root;
    const svg = chart.querySelector('svg');
    let tip = chart.querySelector('.tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tip';
      tip.setAttribute('role', 'tooltip');
      tip.hidden = true;
      chart.appendChild(tip);
    }
    const GAP = 10;
    const show = (h) => {
      const d = data[+h.dataset.i];
      tip.innerHTML = fmt(d);
      tip.hidden = false;
      const bb = h.getBBox();
      const scale = svg.getBoundingClientRect().width / W;
      const cw = chart.clientWidth;
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const markL = bb.x * scale;
      const markR = (bb.x + bb.width) * scale;
      let left = markR + GAP;
      if (left + tw > cw) left = markL - GAP - tw;         // flip to the left side
      left = Math.max(0, Math.min(left, cw - tw));         // clamp inside the chart
      const top = Math.max(0, Math.min(8, chart.clientHeight - th));
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      chart.querySelectorAll('.hit').forEach((x) => x.setAttribute('fill', 'transparent'));
      h.setAttribute('fill', 'rgb(16 23 42 / .05)');
    };
    const hide = (h) => {
      tip.hidden = true;
      h.setAttribute('fill', 'transparent');
    };
    chart.querySelectorAll('.hit').forEach((h) => {
      h.addEventListener('mouseenter', () => show(h));
      h.addEventListener('mouseleave', () => hide(h));
      h.addEventListener('click', () => (tip.hidden ? show(h) : hide(h))); // touch: tap to toggle
    });
  }
})();
