/* =====================================================================
   NEXUS · Charts — motor de gráficas propio sobre Canvas (sin librerías)
   Soporta: line, area, bar, doughnut, sparkline, ring
   ===================================================================== */
(function () {
  "use strict";

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#00e5ff";
  }

  // Prepara el canvas para pantallas retina
  function setup(canvas, height) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
    const h = height || canvas.clientHeight || 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    let f;
    if (n <= 1) f = 1; else if (n <= 2) f = 2; else if (n <= 5) f = 5; else f = 10;
    return f * mag;
  }

  function animate(draw) {
    const start = performance.now();
    const dur = 650;
    function frame(now) {
      let t = Math.min(1, (now - start) / dur);
      t = 1 - Math.pow(1 - t, 3); // easeOutCubic
      draw(t);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const Charts = {
    // ---------- Línea / Área ----------
    line(canvas, data, opts) {
      opts = opts || {};
      const { ctx, w, h } = setup(canvas, opts.height || 180);
      const values = data.values || [];
      const labels = data.labels || [];
      const pad = { l: 34, r: 12, t: 14, b: 22 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      const maxV = niceMax(Math.max(1, ...values));
      const color = opts.color ? cssVar(opts.color) : cssVar("--accent");
      const color2 = cssVar("--accent-2");
      const grid = cssVar("--border");
      const dim = cssVar("--txt-faint");
      const n = values.length;
      const x = (i) => pad.l + (n <= 1 ? cw / 2 : (cw * i) / (n - 1));
      const y = (v) => pad.t + ch - (v / maxV) * ch;

      animate((prog) => {
        ctx.clearRect(0, 0, w, h);
        // grid + etiquetas Y
        ctx.strokeStyle = grid; ctx.fillStyle = dim; ctx.lineWidth = 1;
        ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (let g = 0; g <= 4; g++) {
          const gy = pad.t + (ch * g) / 4;
          ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
          ctx.fillText(Math.round(maxV - (maxV * g) / 4), pad.l - 6, gy);
        }
        // etiquetas X
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        const step = Math.ceil(n / 7);
        labels.forEach((lb, i) => { if (i % step === 0) ctx.fillText(lb, x(i), h - pad.b + 5); });

        if (n === 0) return;
        // área
        const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
        grad.addColorStop(0, color + "55"); grad.addColorStop(1, color + "00");
        ctx.beginPath(); ctx.moveTo(x(0), pad.t + ch);
        values.forEach((v, i) => ctx.lineTo(x(i), y(v * prog)));
        ctx.lineTo(x(n - 1), pad.t + ch); ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
        // línea
        const lg = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
        lg.addColorStop(0, color); lg.addColorStop(1, color2);
        ctx.beginPath();
        values.forEach((v, i) => { const px = x(i), py = y(v * prog); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
        ctx.strokeStyle = lg; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke();
        ctx.shadowBlur = 0;
        // puntos
        values.forEach((v, i) => {
          ctx.beginPath(); ctx.arc(x(i), y(v * prog), 2.8, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
        });
      });
    },

    // ---------- Barras (soporta apiladas ingreso/gasto) ----------
    bars(canvas, data, opts) {
      opts = opts || {};
      const { ctx, w, h } = setup(canvas, opts.height || 180);
      const labels = data.labels || [];
      const series = data.series || [{ values: data.values || [], color: "--accent" }];
      const pad = { l: 34, r: 12, t: 14, b: 22 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      let maxV = 1;
      series.forEach((s) => s.values.forEach((v) => { if (v > maxV) maxV = v; }));
      maxV = niceMax(maxV);
      const grid = cssVar("--border"); const dim = cssVar("--txt-faint");
      const n = labels.length;
      const groupW = cw / Math.max(1, n);
      const barW = Math.min(26, (groupW * 0.6) / series.length);

      animate((prog) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = grid; ctx.fillStyle = dim; ctx.lineWidth = 1;
        ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (let g = 0; g <= 4; g++) {
          const gy = pad.t + (ch * g) / 4;
          ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
          ctx.fillText(Math.round(maxV - (maxV * g) / 4), pad.l - 6, gy);
        }
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let i = 0; i < n; i++) {
          const gx = pad.l + groupW * i + groupW / 2;
          const totalW = barW * series.length + (series.length - 1) * 3;
          series.forEach((s, si) => {
            const v = (s.values[i] || 0) * prog;
            const bh = (v / maxV) * ch;
            const bx = gx - totalW / 2 + si * (barW + 3);
            const by = pad.t + ch - bh;
            const col = cssVar(s.color || "--accent");
            const grad = ctx.createLinearGradient(0, by, 0, pad.t + ch);
            grad.addColorStop(0, col); grad.addColorStop(1, col + "66");
            ctx.fillStyle = grad;
            roundRect(ctx, bx, by, barW, bh, 4); ctx.fill();
          });
          if (i % Math.ceil(n / 8) === 0 || n <= 8) ctx.fillText(labels[i], gx, h - pad.b + 5);
        }
      });
    },

    // ---------- Doughnut ----------
    doughnut(canvas, data, opts) {
      opts = opts || {};
      const { ctx, w, h } = setup(canvas, opts.height || 190);
      const items = (data || []).filter((d) => d.value > 0);
      const total = items.reduce((s, d) => s + d.value, 0);
      const cx = w / 2, cy = h / 2;
      const r = Math.min(cx, cy) - 8, rin = r * 0.62;
      const palette = ["--accent", "--accent-2", "--accent-3", "--good", "--warn", "--bad"];

      animate((prog) => {
        ctx.clearRect(0, 0, w, h);
        if (total === 0) {
          ctx.strokeStyle = cssVar("--border"); ctx.lineWidth = r - rin;
          ctx.beginPath(); ctx.arc(cx, cy, (r + rin) / 2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = cssVar("--txt-faint"); ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("Sin datos", cx, cy);
          return;
        }
        let a = -Math.PI / 2;
        items.forEach((d, i) => {
          const slice = (d.value / total) * Math.PI * 2 * prog;
          const col = cssVar(d.color || palette[i % palette.length]);
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, a, a + slice); ctx.closePath();
          ctx.fillStyle = col; ctx.fill();
          a += slice;
        });
        // agujero central
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath(); ctx.arc(cx, cy, rin, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        // total al centro
        ctx.fillStyle = cssVar("--txt"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "700 18px system-ui";
        ctx.fillText(opts.centerLabel || items.length + "", cx, cy - 6);
        ctx.font = "10px system-ui"; ctx.fillStyle = cssVar("--txt-faint");
        ctx.fillText(opts.centerSub || "categorías", cx, cy + 12);
      });
    },

    // ---------- Sparkline (mini línea sin ejes) ----------
    sparkline(canvas, values, opts) {
      opts = opts || {};
      const { ctx, w, h } = setup(canvas, opts.height || 40);
      if (!values.length) return;
      const max = Math.max(...values, 1), min = Math.min(...values, 0);
      const range = max - min || 1;
      const x = (i) => (w * i) / (values.length - 1 || 1);
      const y = (v) => h - 4 - ((v - min) / range) * (h - 8);
      const color = cssVar(opts.color || "--accent");
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + "44"); grad.addColorStop(1, color + "00");
      ctx.beginPath(); ctx.moveTo(0, h);
      values.forEach((v, i) => ctx.lineTo(x(i), y(v)));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      values.forEach((v, i) => { i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)); });
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    },

    // ---------- Ring (anillo de progreso) ----------
    ring(canvas, pct, opts) {
      opts = opts || {};
      const size = opts.size || 90;
      canvas.style.width = size + "px";
      const { ctx, w, h } = setup(canvas, size);
      canvas.style.width = size + "px";
      const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 6;
      const color = cssVar(opts.color || "--accent");
      const color2 = cssVar("--accent-2");
      pct = Math.max(0, Math.min(100, pct));
      animate((prog) => {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = opts.thickness || 8; ctx.lineCap = "round";
        ctx.strokeStyle = cssVar("--border");
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, color); grad.addColorStop(1, color2);
        ctx.strokeStyle = grad; ctx.shadowColor = color; ctx.shadowBlur = 10;
        const end = -Math.PI / 2 + (Math.PI * 2 * pct / 100) * prog;
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, end); ctx.stroke();
        ctx.shadowBlur = 0;
      });
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.NEXUS.Charts = Charts;
})();
