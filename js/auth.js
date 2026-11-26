/* Login. A prototype: accounts live in the browser and the password is shared.
   In production this is replaced by the real auth provider; the contract the
   rest of the app relies on is only FX.auth.session() -> {email, name, role}. */
(function () {
  const FX = window.FX;
  const KEY = 'fluxora.beckycoo.session';
  const PASSWORD = 'beckycoo';

  // Simulation accounts, one per role. Grouped as on the "Kelompok pengguna" slide.
  const ACCOUNTS = [
    { email: 'owner@beckycoo.id', name: 'Owner Beckycoo', role: 'owner', initials: 'OW', scope: 'Seluruh menu dan keputusan PO' },
    { email: 'gudang@beckycoo.id', name: 'PIC Gudang', role: 'pic_gudang', initials: 'PG', scope: 'Barang masuk, opname, pengiriman' },
    { email: 'admin@beckycoo.id', name: 'PIC Admin Toko', role: 'pic_admin', initials: 'PA', scope: 'Pesanan dan listing produk' },
    { email: 'keuangan@beckycoo.id', name: 'PIC Keuangan', role: 'pic_keuangan', initials: 'PK', scope: 'Buku kas dan rekonsiliasi' },
    { email: 'stafgudang@beckycoo.id', name: 'Staf Gudang', role: 'staf', initials: 'SG', scope: 'Lihat stok, cek fisik, lapor' },
    { email: 'stafadmin@beckycoo.id', name: 'Staf Admin Toko', role: 'staf_admin', initials: 'SA', scope: 'Lihat pesanan dan stok, lapor' },
    { email: 'stafkeuangan@beckycoo.id', name: 'Staf Keuangan', role: 'staf_keuangan', initials: 'SK', scope: 'Lihat buku kas, lapor' },
  ];
  // Earlier address for Staf Gudang, still accepted so saved sessions keep working.
  const ALIASES = { 'staf@beckycoo.id': 'stafgudang@beckycoo.id' };
  const findAccount = (email) => ACCOUNTS.find((a) => a.email === (ALIASES[email] || email));

  let memory = null; // fallback when storage is unavailable (sandboxed viewers)

  const auth = (FX.auth = {
    ACCOUNTS,
    session() {
      if (memory) return memory;
      try {
        const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
        if (raw) memory = JSON.parse(raw);
      } catch (e) {}
      return memory;
    },
    account() {
      const s = auth.session();
      return s && findAccount(s.email);
    },
    /** Returns null on success, or an error message written for the user. */
    login(email, password, remember) {
      email = (email || '').trim().toLowerCase();
      if (!email || !password) return 'Silakan isi email dan kata sandi.';
      const acc = findAccount(email);
      if (!acc) return 'Email ini belum terdaftar sebagai anggota tim Beckycoo. Periksa kembali penulisannya, atau pilih salah satu akun simulasi di bawah.';
      if (password !== PASSWORD) return 'Kata sandi tidak sesuai. Untuk versi simulasi ini, semua akun memakai kata sandi beckycoo.';
      memory = { email: acc.email, at: Date.now() };
      try {
        (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(memory));
      } catch (e) {}
      FX.store.setRole(acc.role, true);
      return null;
    },
    logout() {
      memory = null;
      try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
      } catch (e) {}
    },
  });

  // The logo lives in js/intro.js (FX.logo, FX.MARK) so the intro and the mark share one geometry.

  // ------------------------------------------------------------- the page
  auth.mount = function (onSuccess) {
    document.querySelectorAll('[data-logo]').forEach((el) => (el.innerHTML = FX.logo(36)));
    const form = document.getElementById('login-form');
    const email = document.getElementById('login-email');
    const pass = document.getElementById('login-pass');
    const err = document.getElementById('login-error');
    const go = document.getElementById('login-go');
    const toggle = document.getElementById('pw-toggle');

    const groups = [
      ['Founder / Owner', ACCOUNTS.filter((a) => a.role === 'owner'), true],
      ['PIC tiap bagian', ACCOUNTS.filter((a) => a.role.startsWith('pic_'))],
      ['Staf', ACCOUNTS.filter((a) => a.role.startsWith('staf'))],
    ];
    const card = (a) =>
      '<button type="button" class="demo-acc" data-email="' + a.email + '" title="' + a.email + '"><span class="avatar">' + a.initials + '</span>' +
      '<span style="min-width:0"><span class="nm" style="display:block">' + a.name + '</span><span class="em" style="display:block">' + a.email + '</span><span class="scope">' + a.scope + '</span></span></button>';
    document.getElementById('demo-list').innerHTML = groups
      .map(([label, list, one]) => '<div class="demo-group"><div class="demo-group-h">' + label + '</div><div class="demo-grid' + (one ? ' one' : '') + '">' + list.map(card).join('') + '</div></div>')
      .join('');
    document.querySelectorAll('.demo-acc').forEach(
      (b) =>
        (b.onclick = () => {
          email.value = b.dataset.email;
          pass.value = PASSWORD;
          document.querySelectorAll('.demo-acc').forEach((x) => x.classList.toggle('is-picked', x === b));
          clearError();
          go.focus();
        }),
    );

    toggle.onclick = () => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Sembunyikan' : 'Lihat';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    };

    function clearError() {
      err.hidden = true;
      document.getElementById('f-email').classList.remove('is-error');
      document.getElementById('f-pass').classList.remove('is-error');
      email.removeAttribute('aria-invalid');
      pass.removeAttribute('aria-invalid');
    }
    email.oninput = pass.oninput = clearError;

    form.onsubmit = (e) => {
      e.preventDefault();
      clearError();
      go.classList.add('is-loading');
      go.setAttribute('aria-busy', 'true');
      // A short, honest delay so the button visibly answers the press.
      setTimeout(() => {
        const msg = auth.login(email.value, pass.value, document.getElementById('login-remember').checked);
        go.classList.remove('is-loading');
        go.removeAttribute('aria-busy');
        if (msg) {
          err.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg><span>' + msg + '</span>';
          err.hidden = false;
          const bad = /kata sandi salah/i.test(msg) ? 'f-pass' : 'f-email';
          document.getElementById(bad).classList.add('is-error');
          (bad === 'f-pass' ? pass : email).setAttribute('aria-invalid', 'true');
          form.classList.remove('shake');
          void form.offsetWidth;
          form.classList.add('shake');
          (bad === 'f-pass' ? pass : email).focus();
          return;
        }
        form.reset();
        onSuccess();
      }, 450);
    };

    playScene();
  };

  auth.show = function () {
    document.body.classList.add('is-auth');
    document.title = 'Masuk — Fluxora';
    setTimeout(() => document.getElementById('login-email').focus(), 30);
    playScene();
  };

  // The one orchestrated loop on the page. An order lands on one marketplace, a
  // pulse travels the thread to the warehouse tag (size M drops), then on to the
  // other marketplace, which shows the same number. When stock runs low, goods
  // arrive from the maklon and the number goes back up on all three.
  let sceneOn = false;
  // Threads are drawn from the real positions of the tag and the two listings,
  // so they always meet the cards whatever the panel size.
  function layoutThreads(root) {
    // The stage is drawn at 600×330 and scaled to the panel, so text never overflows.
    const stage = root.querySelector('.sync-stage');
    const w = root.getBoundingClientRect().width;
    if (!w) return;
    const k = w / 600;
    stage.style.setProperty('--k', k);
    const svg = root.querySelector('.sync-threads');
    svg.setAttribute('viewBox', '0 0 600 330');
    const R = stage.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { l: (r.left - R.left) / k, r: (r.right - R.left) / k, t: (r.top - R.top) / k, b: (r.bottom - R.top) / k, h: r.height / k, w: r.width / k };
    };
    const tag = rel(root.querySelector('.hangtag'));
    const hole = rel(root.querySelector('.hangtag-hole'));
    const curve = (x1, y1, x2, y2) => { const m = (x1 + x2) / 2; return 'M' + x1 + ' ' + y1 + ' C ' + m + ' ' + y1 + ', ' + m + ' ' + y2 + ', ' + x2 + ' ' + y2; };
    [['th-shp', '.listing.shp', 0.3], ['th-tkp', '.listing.tkp', 0.72]].forEach(([id, sel, f]) => {
      const c = rel(root.querySelector(sel));
      document.getElementById(id).setAttribute('d', curve(tag.r, tag.t + tag.h * f, c.l, c.t + c.h / 2));
    });
    const hx = hole.l + hole.w / 2, hy = hole.t + hole.h / 2;
    document.getElementById('th-hang').setAttribute('d', 'M' + hx + ' ' + hy + ' C ' + hx + ' ' + (hy - 30) + ', ' + (hx - 60) + ' ' + (hy - 20) + ', ' + (hx - 70) + ' ' + (-8));
  }
  function playScene() {
    if (sceneOn) return;
    const root = document.getElementById('sync-scene');
    if (!root) return;
    sceneOn = true;
    layoutThreads(root);
    window.addEventListener('resize', () => layoutThreads(root));
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // static, readable state
    const pulse = document.getElementById('sync-pulse');
    const pulse2 = document.getElementById('sync-pulse2');
    const cap = document.getElementById('sync-cap');
    const path = { shopee: document.getElementById('th-shp'), tokopedia: document.getElementById('th-tkp') };
    const card = { shopee: root.querySelector('.listing.shp'), tokopedia: root.querySelector('.listing.tkp') };
    const ev = { shopee: root.querySelector('[data-ev="shopee"]'), tokopedia: root.querySelector('[data-ev="tokopedia"]') };
    const num = (k) => root.querySelector('[data-n="' + k + '"]');
    const cell = root.querySelector('.hangtag-sizes .is-live');
    let stock = 14;
    let turn = 'shopee';
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const running = () => document.body.classList.contains('is-auth') && !document.hidden;

    function setNum(k, v) {
      const el = num(k);
      el.textContent = v;
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
    }
    function say(text) {
      cap.classList.add('swap');
      setTimeout(() => ((cap.textContent = text), cap.classList.remove('swap')), 200);
    }
    function travel(p, reverse, ms, dot) {
      dot = dot || pulse;
      return new Promise((done) => {
        const len = p.getTotalLength();
        p.classList.add('is-hot');
        const t0 = performance.now();
        (function step(t) {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const pt = p.getPointAtLength((reverse ? 1 - e : e) * len);
          dot.setAttribute('cx', pt.x);
          dot.setAttribute('cy', pt.y);
          dot.style.opacity = 1;
          if (k < 1) requestAnimationFrame(step);
          else {
            p.classList.remove('is-hot');
            dot.style.opacity = 0;
            done();
          }
        })(t0);
      });
    }
    function hit() {
      cell.classList.remove('flash');
      void cell.offsetWidth;
      cell.classList.add('flash');
    }

    async function sale(from) {
      const to = from === 'shopee' ? 'tokopedia' : 'shopee';
      const name = { shopee: 'Shopee', tokopedia: 'Tokopedia' };
      card[from].classList.add('is-hot');
      ev[from].textContent = 'Pesanan baru';
      ev[from].classList.add('on');
      stock -= 1;
      setNum(from, stock);
      say('Pesanan masuk dari ' + name[from] + ' untuk ukuran M.');
      await wait(700);
      await travel(path[from], true, 750);
      hit();
      setNum('tag', stock);
      say('Stok gudang langsung berkurang menjadi ' + stock + '.');
      card[from].classList.remove('is-hot');
      ev[from].classList.remove('on');
      await wait(650);
      await travel(path[to], false, 750);
      card[to].classList.add('is-hot');
      setNum(to, stock);
      say(name[to] + ' ikut menampilkan ' + stock + '. Tidak ada yang dicatat ulang.');
      await wait(900);
      card[to].classList.remove('is-hot');
    }
    async function restock() {
      const add = 14 - stock;
      stock = 14;
      hit();
      setNum('tag', stock);
      say('Barang dari maklon diterima: +' + add + ' pcs ukuran M.');
      await wait(700);
      await Promise.all([travel(path.shopee, false, 750), travel(path.tokopedia, false, 750, pulse2)]);
      setNum('shopee', stock);
      setNum('tokopedia', stock);
      say('Kedua marketplace kembali menampilkan ' + stock + '.');
    }

    (async function loop() {
      await wait(1400);
      for (;;) {
        if (!running()) {
          await wait(800);
          continue;
        }
        if (stock <= 11) await restock();
        else {
          await sale(turn);
          turn = turn === 'shopee' ? 'tokopedia' : 'shopee';
        }
        await wait(2600);
      }
    })();
  }
})();
