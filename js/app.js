/* App shell: login gate, navigation, user card, notifications, marketplace simulator. */
(function () {
  const FX = window.FX;
  const S = FX.store;
  const ui = FX.ui;
  const esc = FX.esc;

  // [route, label, subtitle, icon]
  const NAV = [
    ['ringkasan', 'Ringkasan', 'Kondisi bisnis hari ini dalam satu layar', 'home'],
    ['stok', 'Stok', 'Satu angka stok per model dan ukuran, dipakai Shopee dan Tokopedia sekaligus', 'grid'],
    ['pesanan', 'Pesanan', 'Pesanan dari dua marketplace dalam satu antrean', 'bag'],
    ['masuk', 'Barang masuk', 'PO ke maklon dan penerimaan barang', 'box'],
    ['keuangan', 'Keuangan', 'Buku kas yang terisi sendiri dari stok dan pesanan', 'wallet'],
    ['forecast', 'Forecast', 'Berapa yang perlu dipesan ke maklon, dan kapan', 'trend'],
    ['aktivitas', 'Aktivitas', 'Jejak setiap perubahan dan setiap sinkronisasi', 'clock'],
    ['pengaturan', 'Pengaturan', 'Parameter, foto produk, hak akses', 'gear'],
    ['panduan', 'Panduan', 'Cara memakai Fluxora: tur, langkah per tugas, istilah, dan tanya-jawab', 'help'],
  ];

  const app = (FX.app = { screen: null, live: null, lastSync: { shopee: Date.now(), tokopedia: Date.now() } });

  function allowed() {
    return S.SCREENS[S.role];
  }

  app.go = function (screen, ref) {
    if (!FX.auth.session()) return;
    if (!allowed().includes(screen)) screen = allowed()[0];
    const changed = app.screen !== screen;
    app.screen = screen;
    app.ref = ref || null;
    if (location.hash !== '#' + screen) history.replaceState(null, '', '#' + screen);
    render(changed ? 'nav' : null);
    if (changed) window.scrollTo(0, 0);
  };

  function renderRail() {
    const notifs = S.notifications();
    const open = S.openOrders();
    const late = open.filter((o) => o.shipBy < Date.now()).length;
    const counts = { pesanan: open.length ? '<span class="cnt ' + (late ? 'crit' : '') + '" aria-label="' + open.length + ' perlu dikirim">' + open.length + '</span>' : '' };
    const fcDue = FX.forecast.all().filter((f) => f.status === 'pesan').length;
    if (fcDue) counts.forecast = '<span class="cnt" aria-label="' + fcDue + ' model perlu dipesan">' + fcDue + '</span>';
    document.querySelector('.nav').innerHTML = NAV.filter(([k]) => allowed().includes(k))
      .map(([k, label, , icon]) => '<a href="#' + k + '" data-go="' + k + '" class="' + (app.screen === k ? 'on' : '') + '"' + (app.screen === k ? ' aria-current="page"' : '') + '>' + ui.icon(icon, 18) + '<span>' + label + '</span>' + (counts[k] || '') + '</a>')
      .join('') +
      '<a href="about.html" class="nav-ext">' + ui.icon('info', 18) + '<span>Tentang tim</span></a>';

    const acc = FX.auth.account();
    document.querySelector('.rail-foot').innerHTML =
      '<div class="sync-state"><div class="sync-title">Sinkronisasi kanal</div>' +
      Object.entries(FX.CHANNELS)
        .map(([k, c]) => '<div class="sync-row"><span class="dot ' + k + '" id="dot-' + k + '"></span><span>' + c.name + '</span><span class="t" id="sync-' + k + '">' + FX.ago(app.lastSync[k]) + '</span></div>')
        .join('') +
      '</div>' +
      '<div class="user-card"><span class="avatar">' + acc.initials + '</span><div style="min-width:0"><div class="nm">' + esc(acc.name) + '</div><div class="rl">' + esc(acc.email) + '</div></div>' +
      '<button class="icon-btn-inverse" id="logout" title="Keluar" aria-label="Keluar">' + ui.icon('logout', 18) + '</button></div>';
    document.getElementById('logout').onclick = logout;

    const badge = notifs.filter((n) => !S.state.readNotifs[n.key]).length;
    const b = document.querySelector('.bell .badge');
    b.textContent = badge;
    b.hidden = !badge;
    document.querySelector('.bell').setAttribute('aria-label', 'Perlu perhatian, ' + badge + ' belum dibaca');
  }

  function renderTop() {
    const meta = NAV.find((n) => n[0] === app.screen);
    document.querySelector('.top-title').innerHTML = '<h1>' + meta[1] + '</h1><div class="sub">' + meta[2] + '</div>';
    document.title = meta[1] + ' — Fluxora';
    const liveBtn = document.querySelector('[data-sim="live"]');
    liveBtn.classList.toggle('live-on', !!app.live);
    liveBtn.setAttribute('aria-pressed', String(!!app.live));
    liveBtn.innerHTML = ui.icon('bolt', 14) + (app.live ? 'Live aktif' : 'Live');
  }

  function render(reason) {
    if (!FX.auth.session()) return;
    if (!allowed().includes(app.screen)) app.screen = allowed()[0];
    renderRail();
    renderTop();
    const view = FX.views[app.screen];
    const el = document.querySelector('.view');
    const keepY = window.scrollY;
    const focusId = document.activeElement && document.activeElement.id;
    const focusPos = focusId && document.activeElement.selectionStart;
    el.innerHTML = view.render(app.ref);
    if (view.mount) view.mount(el, app.ref);
    if (reason === 'nav') {
      el.classList.remove('view-enter');
      void el.offsetWidth;
      el.classList.add('view-enter');
    }
    if (reason === 'bg') window.scrollTo(0, keepY);
    if (focusId) {
      const f = document.getElementById(focusId);
      if (f && el.contains(f)) {
        f.focus();
        if (focusPos != null && f.setSelectionRange) f.setSelectionRange(focusPos, focusPos);
      }
    }
  }
  app.render = render;

  // ----------------------------------------------------------- auth flow
  function enter() {
    const acc = FX.auth.account();
    if (!acc) return FX.auth.show();
    S.setRole(acc.role, true);
    document.body.classList.remove('is-auth');
    app.screen = null;
    app.go(location.hash.slice(1) || allowed()[0]);
  }
  function logout() {
    if (FX.tour.active) FX.tour.stop();
    if (app.live) {
      clearInterval(app.live);
      app.live = null;
    }
    ui.closeDrawer();
    FX.auth.logout();
    FX.auth.show();
  }

  // ----------------------------------------------------------- notifications
  function openNotifs() {
    const list = S.notifications();
    const body = list.length
      ? '<div class="panel"><div class="list">' +
        list
          .map(
            (n) =>
              '<div class="li click ' + (S.state.readNotifs[n.key] ? 'read' : '') + '" data-n="' + esc(n.key) + '" data-to="' + n.go + '" data-ref="' + esc(n.ref) + '" tabindex="0" role="button">' +
              ui.lvl(n.level, ui.kindLabel(n.kind)) +
              '<div><div class="ttl">' + esc(n.title) + '</div><div class="body">' + esc(n.body) + '</div></div>' +
              '<span class="chev">' + ui.icon('chev', 16) + '</span></div>',
          )
          .join('') +
        '</div></div>'
      : '<div class="empty">Tidak ada yang perlu ditindaklanjuti.</div>';
    const d = ui.drawer({
      title: 'Perlu perhatian',
      sub: list.length + ' hal: batas serah kurir, stok menipis, rekomendasi PO, dan laporan staf',
      body,
      foot: list.length ? '<button class="btn" data-readall>Tandai semua dibaca</button>' : '',
    });
    d.querySelectorAll('[data-n]').forEach((li) => {
      const open = () => {
        S.state.readNotifs[li.dataset.n] = Date.now();
        S.save();
        ui.closeDrawer();
        app.go(li.dataset.to, li.dataset.ref);
      };
      li.addEventListener('click', open);
      li.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()));
    });
    const ra = d.querySelector('[data-readall]');
    if (ra)
      ra.onclick = () => {
        list.forEach((n) => (S.state.readNotifs[n.key] = Date.now()));
        S.commit();
        ui.closeDrawer();
      };
  }

  // -------------------------------------------------------------- simulator
  // Stands in for Shopee Open Platform / Tokopedia webhooks: every simulated
  // order goes through the same store action a real webhook would call.
  function randomOrder(channel, forced) {
    const st = S.state;
    const r = Math.random;
    let items;
    if (forced) items = [forced];
    else {
      const p = weightedProduct();
      const sizes = FX.SIZES.filter((s) => p.stock[s] > 0);
      const size = sizes.length ? sizes[Math.floor(r() * sizes.length)] : FX.SIZES[Math.floor(r() * 4)];
      items = [{ pid: p.id, size, qty: 1, price: p.price }];
    }
    const couriers = st.couriers[channel];
    const courier = couriers[Math.floor(r() * couriers.length)];
    const instant = /Instant|Same Day/.test(courier);
    return S.placeOrder({ channel, items, buyer: st.buyers[Math.floor(r() * st.buyers.length)], courier, shipHours: instant ? 2.5 : 18 + Math.floor(r() * 18) });
  }
  function weightedProduct() {
    const ps = S.state.products;
    const w = ps.map((p) => 1 + FX.forecast.one(p.id).perWeek);
    let x = Math.random() * FX.sum(w);
    for (let i = 0; i < ps.length; i++) if ((x -= w[i]) <= 0) return ps[i];
    return ps[0];
  }
  function announce(res, channel) {
    pulse(channel);
    if (res.ok) {
      const it = res.order.items[0];
      const p = S.product(it.pid);
      const other = channel === 'shopee' ? 'tokopedia' : 'shopee';
      ui.toast(esc(p.name) + ' ' + it.size + ' terjual. Stok sekarang ' + p.stock[it.size] + ', listing ' + FX.CHANNELS[other].name + ' ikut diperbarui.', '', 'Pesanan ' + FX.CHANNELS[channel].name);
      pulse(other);
    } else {
      ui.toast('Checkout di ' + FX.CHANNELS[channel].name + ' ditahan karena ' + esc(res.reason) + ' di semua kanal. Tidak ada pesanan yang perlu dibatalkan.', 'bad', 'Overselling dicegah');
    }
  }
  function pulse(ch) {
    app.lastSync[ch] = Date.now();
    const dot = document.getElementById('dot-' + ch);
    if (dot) {
      dot.classList.remove('pulse');
      void dot.offsetWidth;
      dot.classList.add('pulse');
    }
  }
  /** Two buyers, two marketplaces, one last unit. */
  function race() {
    const candidates = [];
    S.state.products.forEach((p) => FX.SIZES.forEach((s) => p.stock[s] === 1 && candidates.push([p, s])));
    let p, s;
    if (candidates.length) [p, s] = candidates[Math.floor(Math.random() * candidates.length)];
    else {
      let best = null;
      S.state.products.forEach((pp) => FX.SIZES.forEach((ss) => pp.stock[ss] > 0 && (!best || pp.stock[ss] < best[0].stock[best[1]]) && (best = [pp, ss])));
      if (!best) return ui.toast('Semua stok habis. Catat barang masuk dulu.', 'bad');
      [p, s] = best;
      while (p.stock[s] > 1) randomOrder('shopee', { pid: p.id, size: s, qty: 1, price: p.price });
    }
    const item = { pid: p.id, size: s, qty: 1, price: p.price };
    const a = randomOrder('shopee', item);
    const b = randomOrder('tokopedia', Object.assign({}, item));
    pulse('shopee');
    pulse('tokopedia');
    ui.toast('Sisa 1 pcs ' + esc(p.name) + ' ' + s + '. Shopee: ' + (a.ok ? 'pesanan diterima' : 'ditahan') + '. Tokopedia: ' + (b.ok ? 'pesanan diterima' : 'checkout ditahan karena stok sudah 0') + '.', '', 'Rebutan stok');
  }

  function bindShell() {
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        e.preventDefault();
        app.go(go.dataset.go, go.dataset.ref);
        return;
      }
      const sim = e.target.closest('[data-sim]');
      if (!sim) return;
      const k = sim.dataset.sim;
      if (k === 'shopee' || k === 'tokopedia') announce(randomOrder(k), k);
      if (k === 'race') race();
      if (k === 'live') {
        if (app.live) {
          clearInterval(app.live);
          app.live = null;
        } else {
          app.live = setInterval(() => {
            const ch = Math.random() < 0.68 ? 'shopee' : 'tokopedia';
            announce(randomOrder(ch), ch);
          }, 5000);
        }
        renderTop();
      }
    });
    document.querySelector('.bell').onclick = openNotifs;
    window.addEventListener('hashchange', () => FX.auth.session() && app.go(location.hash.slice(1) || allowed()[0]));
    setInterval(() => {
      Object.keys(FX.CHANNELS).forEach((k) => {
        const el = document.getElementById('sync-' + k);
        if (el) el.textContent = FX.ago(app.lastSync[k]);
      });
      render('bg');
    }, 30000);
  }

  // ------------------------------------------------------------------ boot
  S.load();
  S.on((why) => (why === 'role' ? app.go(app.screen) : render('bg')));
  bindShell();
  FX.auth.mount(() => {
    enter();
    // Replay the marketplace orders that "arrived" since the previous sign-in.
    const r = FX.arrivals.onLogin(FX.auth.account().email);
    if (!FX.tour.maybeWelcome(r)) FX.arrivals.show(r);
  });
  enter();
  const welcome = () => FX.auth.session() && FX.tour.maybeWelcome();
  if (FX.intro.shouldPlay()) FX.intro.play(welcome);
  else welcome();
})();
