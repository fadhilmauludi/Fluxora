/* Demand forecast per model.
   Holt's linear exponential smoothing on weekly sales (twin-date spikes are
   taken out first so one 11.11 does not inflate every normal week), then a
   classic reorder policy:
     demand over (lead time + review period)
   + safety stock  = z · σ_weekly · √(lead time in weeks)
   − (on hand + already on order from the vendor)
   rounded up to the vendor MOQ and split across sizes by the observed mix.
   The old rule ("last month + 5%") is computed alongside for comparison. */
(function () {
  const FX = window.FX;

  function weeklySeries(pid, weeks) {
    const st = FX.store.state;
    const today = FX.startOfDay(Date.now());
    const series = [];
    const twin = [];
    const sizes = { S: 0, M: 0, L: 0, XL: 0 };
    for (let w = weeks; w >= 1; w--) {
      let total = 0;
      let spike = 0;
      for (let d = 0; d < 7; d++) {
        const t = today - (w * 7 - d) * FX.DAY + 12 * FX.HOUR;
        const day = st.salesDaily[FX.dayKey(t)];
        const b = day && day.items[pid];
        if (!b) continue;
        const n = FX.sizeTotal(b);
        FX.SIZES.forEach((s) => (sizes[s] += b[s] || 0));
        const dt = new Date(t);
        if (dt.getDate() === dt.getMonth() + 1) spike += n;
        else total += n;
      }
      series.push({ start: today - w * 7 * FX.DAY, units: total + spike, base: total + spike * 0.3 });
      twin.push(spike);
    }
    return { series, sizes, twin };
  }

  function holt(values, alpha, beta) {
    let level = values[0];
    let trend = values.length > 1 ? values[1] - values[0] : 0;
    const fitted = [level];
    for (let i = 1; i < values.length; i++) {
      const prev = level;
      fitted.push(level + trend);
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prev) + (1 - beta) * trend;
    }
    return { level, trend, fitted };
  }

  FX.forecast = {
    one(pid) {
      const st = FX.store.state;
      const set = st.settings;
      const product = FX.store.product(pid);
      const { series, sizes, twin } = weeklySeries(pid, 12);
      const base = series.map((x) => x.base);
      const h = holt(base, 0.35, 0.15);
      const resid = base.map((v, i) => v - h.fitted[i]).slice(2);
      const sigma = Math.sqrt(FX.sum(resid, (r) => r * r) / Math.max(1, resid.length - 1));
      const perWeek = Math.max(0, h.level + h.trend);
      const next = [1, 2, 3, 4, 5, 6].map((k) => Math.max(0, h.level + h.trend * k));

      const L = set.leadTimeDays / 7;
      const R = set.reviewDays / 7;
      // Twin-date uplift: if the cover window contains 12.12, add the average
      // extra units the last twin dates produced.
      const now = new Date();
      const horizonEnd = Date.now() + (set.leadTimeDays + set.reviewDays) * FX.DAY;
      const m = now.getMonth();
      const nextTwin = now.getDate() < m + 1 ? new Date(now.getFullYear(), m, m + 1) : new Date(now.getFullYear(), m + 1, m + 2 > 12 ? 1 : m + 2);
      const twins = twin.filter((x) => x > 0);
      const twinAvg = twins.length ? FX.sum(twins) / twins.length : 0;
      const twinExtra = set.twinUplift && nextTwin.getTime() <= horizonEnd ? Math.round(twinAvg * 0.7) : 0;
      const nextTwinLabel = nextTwin.getDate() + '.' + (nextTwin.getMonth() + 1);

      const demandCover = perWeek * (L + R) + twinExtra;
      const safety = Math.ceil(set.serviceZ * sigma * Math.sqrt(L));
      const onHand = FX.sizeTotal(product.stock);
      const onOrderObj = FX.store.onOrder(pid);
      const onOrder = FX.sizeTotal(onOrderObj);
      const position = onHand + onOrder;
      const reorderPoint = Math.ceil(perWeek * L + safety);
      const target = Math.ceil(demandCover + safety);
      const raw = Math.max(0, target - position);
      const moq = set.moq;
      // Only order when the position has crossed the reorder point; otherwise wait
      // for the next review so capital is not tied up early.
      const recommend = raw > 0 && position <= reorderPoint ? Math.max(moq, Math.ceil(raw / 6) * 6) : 0;

      // Split across sizes by the 12-week mix, then fix rounding on M.
      const mixTotal = FX.sizeTotal(sizes) || 1;
      const mix = {};
      FX.SIZES.forEach((s) => (mix[s] = sizes[s] / mixTotal));
      const split = {};
      FX.SIZES.forEach((s) => (split[s] = Math.round(recommend * mix[s])));
      split.M += recommend - FX.sizeTotal(split);
      // Sizes already at zero get at least a few so the listing comes back.
      const sizeCover = {};
      FX.SIZES.forEach((s) => {
        const perWeekSize = perWeek * mix[s];
        sizeCover[s] = perWeekSize > 0 ? (product.stock[s] + onOrderObj[s]) / perWeekSize : 99;
      });

      const last4 = FX.sum(series.slice(-4), (x) => x.units);
      const oldRule = Math.max(0, Math.ceil(last4 * 1.05) - onHand);
      const weeksCover = perWeek > 0 ? onHand / perWeek : 99;
      const stockoutDate = perWeek > 0 ? Date.now() + (onHand / perWeek) * 7 * FX.DAY : null;

      return {
        pid, product, series, next, perWeek, sigma, safety, demandCover, twinExtra, nextTwinLabel, twinAvg,
        onHand, onOrder, onOrderObj, position, reorderPoint, target, recommend, split, mix, sizeCover,
        oldRule, weeksCover, stockoutDate, last4,
        status: recommend > 0 ? 'pesan' : weeksCover < L + R ? 'pantau' : 'aman',
        capital: recommend * product.cost,
      };
    },
    all() {
      return FX.store.state.products.map((p) => this.one(p.id));
    },
  };
})();
