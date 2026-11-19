/* Fluxora intro: "flux".
   Particles stream along 3D magnetic-dipole field lines (r = L·sin²θ, rotated
   around the axis) while the camera orbits. Then every particle flows into its
   place on the three strokes of the Fluxora mark, bottom of the bundle first,
   and the crisp SVG logo takes over. Plain 2D canvas with a hand-rolled
   perspective projection: no libraries, works offline.
   Plays once per browser session. Skippable (click, Esc, Enter, Space).
   Skipped entirely with prefers-reduced-motion. */
(function () {
  const FX = window.FX;
  const KEY = 'fluxora.intro.seen';

  // The mark, in its 64-unit design box. Single source for logo + intro.
  const MARK = [
    { d: 'M16 52 V27 C16 17.5 22.5 11 32 11 H48', tone: 'line' },
    { d: 'M22 52 V28 C22 21.5 26 17 32.5 17 H48', tone: 'line' },
    { d: 'M28 52 V37 C28 32 31 29 36 29 H42', tone: 'branch' },
  ];
  FX.MARK = MARK;

  /** Inline mark. `tile` adds the denim app-icon square. Colours come from tokens. */
  FX.logo = function (size, opts) {
    opts = opts || {};
    const s = size || 32;
    const line = opts.line || 'var(--color-text-on-inverse)';
    const branch = opts.branch || 'var(--color-accent)';
    const tile = opts.tile !== false;
    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 64 64" aria-hidden="true" class="logo-mark">' +
      (tile ? '<rect width="64" height="64" rx="15" style="fill:var(--color-surface-inverse-raised)"/>' : '') +
      '<g fill="none" stroke-linecap="round" stroke-width="3.6">' +
      MARK.map((m) => '<path d="' + m.d + '" style="stroke:' + (m.tone === 'line' ? line : branch) + '"/>').join('') +
      '</g></svg>'
    );
  };

  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = () => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  };
  const markSeen = () => {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  };

  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  FX.intro = {
    shouldPlay() {
      return !seen() && !reduce();
    },
    play(onDone) {
      markSeen();
      const el = document.createElement('div');
      el.className = 'intro';
      el.setAttribute('role', 'presentation');
      el.innerHTML =
        '<canvas class="intro-canvas" aria-hidden="true"></canvas>' +
        '<div class="intro-logo" aria-hidden="true">' + FX.logo(64, { tile: false }) + '</div>' +
        '<div class="intro-word"><div class="intro-name">fluxora</div><div class="intro-tag">Satu angka stok, semua kanal.</div></div>' +
        '<button class="intro-skip" type="button">Lewati intro</button>' +
        '<span class="sr-only" aria-live="polite">Fluxora sedang dibuka.</span>';
      document.body.appendChild(el);
      const canvas = el.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const logoEl = el.querySelector('.intro-logo');
      const word = el.querySelector('.intro-word');
      let raf = 0;
      let done = false;

      // ---- geometry ----------------------------------------------------
      let W, H, DPR, M, ox, oy;
      function layout() {
        DPR = Math.min(2, window.devicePixelRatio || 1);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        M = Math.round(Math.min(W, H) * 0.34);            // mark box size in px
        ox = W / 2 - M / 2;                                 // mark box top-left
        oy = H / 2 - M / 2 - Math.min(60, H * 0.07);
        logoEl.style.cssText = 'left:' + ox + 'px;top:' + oy + 'px;width:' + M + 'px;height:' + M + 'px';
        logoEl.firstChild.setAttribute('width', M);
        logoEl.firstChild.setAttribute('height', M);
        word.style.top = oy + M * 0.9 + 16 + 'px';
      }
      layout();

      // Targets: points along each stroke, jittered inside the stroke width.
      const N = clamp(Math.round((W * H) / 1100), 700, 1500);
      const svgNS = 'http://www.w3.org/2000/svg';
      const probe = document.createElementNS(svgNS, 'svg');
      probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(probe);
      const paths = MARK.map((m) => {
        const p = document.createElementNS(svgNS, 'path');
        p.setAttribute('d', m.d);
        probe.appendChild(p);
        return { el: p, len: p.getTotalLength(), tone: m.tone };
      });
      const total = paths.reduce((a, p) => a + p.len, 0);
      const targets = [];
      paths.forEach((p, pi) => {
        const n = Math.round((N * p.len) / total);
        for (let i = 0; i < n; i++) {
          const u = (i + Math.random() * 0.6) / n;          // along the stroke, 0 = bottom of the bundle
          const pt = p.el.getPointAtLength(u * p.len);
          const j = 1.6;                                    // half stroke width (3.6 / 2), slightly under
          targets.push({ x: pt.x + (Math.random() - 0.5) * 2 * j, y: pt.y + (Math.random() - 0.5) * 2 * j, u, tone: p.tone, path: pi });
        }
      });
      probe.remove();

      // Particles on dipole field lines.
      const parts = targets.map((t) => ({
        t,
        L: 0.45 + Math.pow(Math.random(), 0.8) * 0.75,      // field-line shell
        phi: Math.random() * Math.PI * 2,                    // azimuth of the line
        th: 0.45 + Math.random() * (Math.PI - 0.9),          // position along the line
        sp: 0.5 + Math.random() * 0.7,                       // flow speed
        delay: t.u * 0.55 + t.path * 0.12 + Math.random() * 0.08,
        size: 0.9 + Math.random() * 1.1,
      }));

      const C_FIELD = [174, 184, 214];   // --ref-denim-300
      const C_LINE = [255, 255, 255];
      const C_BRANCH = [242, 193, 78];   // --ref-thread-400

      const T_MORPH = 1.55, T_LOGO = 2.75, T_WORD = 2.95, T_END = 4.3;
      const start = performance.now();
      ctx.fillStyle = 'rgb(16 23 42)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      function frame(now) {
        if (done) return;
        const t = (now - start) / 1000;
        const R = Math.min(W, H) * 0.42;                     // field radius in px
        const yaw = t * 0.75;
        const pitch = 0.42 - Math.min(t, T_LOGO) * 0.12;
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const cx0 = W / 2, cy0 = oy + M / 2;

        // trails
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = t < T_MORPH ? 'rgba(16,23,42,0.22)' : 'rgba(16,23,42,0.34)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';

        const fade = 1 - clamp((t - T_LOGO - 0.1) / 0.6, 0, 1);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.th += 0.012 * p.sp;
          if (p.th > Math.PI - 0.4) p.th = 0.4; // skip the singular centre of the dipole
          // dipole field line in its meridian plane, then rotated by phi
          const s = Math.sin(p.th);
          const r = p.L * s * s * R;
          const lx = r * s, ly = r * Math.cos(p.th);
          let x = lx * Math.cos(p.phi), y = ly, z = lx * Math.sin(p.phi);
          // camera: yaw around Y, pitch around X
          let x2 = x * cy - z * sy, z2 = x * sy + z * cy;
          let y2 = y * cp - z2 * sp, z3 = y * sp + z2 * cp;
          const f = 700 / (700 + z3);
          let X = cx0 + x2 * f, Y = cy0 + y2 * f;
          const depth = clamp(0.35 + (1 - (z3 + R) / (2 * R)) * 0.9, 0.25, 1);

          // morph into the mark
          const k = ease(clamp((t - T_MORPH - p.delay) / 0.75, 0, 1));
          const TX = ox + (p.t.x / 64) * M, TY = oy + (p.t.y / 64) * M;
          X = X + (TX - X) * k;
          Y = Y + (TY - Y) * k;
          const target = p.t.tone === 'branch' ? C_BRANCH : C_LINE;
          const col = [0, 1, 2].map((c) => Math.round(C_FIELD[c] + (target[c] - C_FIELD[c]) * k));
          const a = (depth * (1 - k) + k) * fade * (p.t.tone === 'branch' ? 0.95 : 0.8);
          const sz = (p.size * (0.6 + f * 0.6) * (1 - k) + 1.5 * k) * DPR;
          ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a.toFixed(3) + ')';
          ctx.fillRect(X * DPR - sz / 2, Y * DPR - sz / 2, sz, sz);
        }

        if (t > T_LOGO && !logoEl.classList.contains('on')) logoEl.classList.add('on');
        if (t > T_WORD && !word.classList.contains('on')) word.classList.add('on');
        if (t > T_END) return finish();
        raf = requestAnimationFrame(frame);
      }

      function finish() {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', layout);
        document.removeEventListener('keydown', onKey, true);
        el.classList.add('out');
        setTimeout(() => {
          el.remove();
          if (onDone) onDone();
        }, 420);
      }
      function onKey(e) {
        if (['Escape', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          finish();
        }
      }
      el.addEventListener('click', finish);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', layout);
      el.querySelector('.intro-skip').focus({ preventScroll: true });
      raf = requestAnimationFrame(frame);
      FX.intro._finish = finish;
    },
  };
})();
