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

  // The single orchestrated motion on the page: one sale, three tags change.
  let played = false;
  function playScene() {
    if (played) return;
    played = true;
    const swap = (a, b) => {
      document.getElementById(a).classList.add('tick-out');
      const el = document.getElementById(b);
      el.setAttribute('opacity', '1');
      el.classList.add('tick-in');
    };
    setTimeout(() => {
      swap('sp-a', 'sp-b');
      document.getElementById('sp-note').textContent = 'terjual 1';
      setTimeout(() => swap('ms-a', 'ms-b'), 260);
      setTimeout(() => swap('tk-a', 'tk-b'), 520);
    }, 1300);
  }
})();
