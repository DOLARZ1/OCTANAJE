/* =====================================================================
   OCTANAJE · Módulo Foco / Pomodoro
   Temporizador de trabajo/descanso configurable, con ciclos, anillo,
   XP, sonido y notificación al terminar cada fase.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami } = N;
  const { el, fmt } = UI;
  const DateUtil = Store.DateUtil;

  // ---------- estado del temporizador (vive entre renders) ----------
  let mode = "work";           // "work" | "break" | "long"
  let running = false;
  let remaining = null;        // segundos restantes
  let endAt = 0;               // timestamp objetivo cuando corre
  let cyclesDone = 0;          // sesiones de trabajo en el set actual
  let handle = null;
  let focusLabel = "";         // en qué te enfocas (no persistente)

  function cfg() { return Store.get().focus; }
  function secondsFor(m) {
    const c = cfg();
    return (m === "work" ? c.work : m === "long" ? c.longBreak : c.break) * 60;
  }
  function ensureRemaining() { if (remaining == null) remaining = secondsFor(mode); }
  function modeInfo(m) {
    return m === "work" ? { label: "Enfoque", color: "--accent", ico: "◷" }
      : m === "long" ? { label: "Descanso largo", color: "--good", ico: "☕" }
      : { label: "Descanso", color: "--good", ico: "🌿" };
  }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#00e5ff"; }

  // ---------- controles ----------
  function start() {
    ensureRemaining();
    if (running) return;
    running = true;
    endAt = Date.now() + remaining * 1000;
    Audio.play("toggleOn");
    startTicking();
    paint();
  }
  function pause() {
    if (!running) return;
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    running = false;
    stopTicking();
    Audio.play("tap");
    paint();
  }
  // el temporizador solo necesita actualizar la pantalla una vez por
  // segundo (no 4x/seg); además se pausa por completo mientras la app
  // está en segundo plano (pantalla apagada/otra app) para no gastar
  // batería redibujando un canvas con brillo sin que nadie lo vea. Al
  // volver, se resincroniza contra endAt (que no se ve afectado).
  function startTicking() {
    clearInterval(handle);
    if (typeof document !== "undefined" && document.hidden) return; // se activará al volver a estar visible
    handle = setInterval(tick, 1000);
  }
  function stopTicking() { clearInterval(handle); handle = null; }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (!running) return;
      if (document.hidden) { clearInterval(handle); handle = null; }
      else { tick(); startTicking(); } // resincroniza de inmediato al volver
    });
  }
  function reset() {
    running = false; stopTicking();
    remaining = secondsFor(mode);
    Audio.play("tap");
    paint();
  }
  function skip() {
    running = false; stopTicking();
    Audio.play("tap");
    nextPhase(false);
  }
  function tick() {
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    if (remaining <= 0) { complete(); return; }
    paint();
  }

  function complete() {
    running = false; stopTicking();
    if (mode === "work") {
      // registrar sesión
      const c = cfg();
      const today = DateUtil.todayKey();
      c.sessionsCompleted = (c.sessionsCompleted || 0) + 1;
      c.focusLog[today] = (c.focusLog[today] || 0) + c.work;
      c.sessionsLog[today] = (c.sessionsLog[today] || 0) + 1;
      Store.markActive();
      Store.commit(true);
      cyclesDone++;
      Audio.play("levelup");
      Gami.award(20, "Sesión de foco completada 🎯");
      Gami.burst();
      if (N.Notify) N.Notify.send("¡Sesión completada! 🎯", "Buen trabajo. Toca un descanso.", { tag: "nexus-focus" });
      nextPhase(true);
    } else {
      Audio.play("complete");
      if (N.Notify) N.Notify.send("Descanso terminado ☕", "Hora de volver al enfoque.", { tag: "nexus-focus" });
      nextPhase(true);
    }
    N.App && N.App.refreshTop();
  }

  // pasa a la siguiente fase; autostart=true la inicia automáticamente
  function nextPhase(autostart) {
    if (mode === "work") {
      const c = cfg();
      mode = (cyclesDone % (c.longEvery || 4) === 0) ? "long" : "break";
    } else {
      mode = "work";
    }
    remaining = secondsFor(mode);
    render(document.getElementById("view-focus"));
    if (autostart) start();
  }

  function setMode(m) {
    if (running) return;
    mode = m; remaining = secondsFor(m); paint();
  }

  // ---------- pintar estado en el DOM ----------
  function paint() {
    ensureRemaining();
    const info = modeInfo(mode);
    const t = document.getElementById("focus-time");
    if (!t) return; // la vista no está montada
    t.textContent = fmtTime(remaining);
    const ml = document.getElementById("focus-mode");
    if (ml) { ml.textContent = info.ico + "  " + info.label; ml.style.color = cssVar(info.color); }
    const btn = document.getElementById("focus-start");
    if (btn) btn.innerHTML = running ? "⏸ Pausar" : (remaining < secondsFor(mode) ? "▶ Reanudar" : "▶ Iniciar");
    const ring = document.getElementById("focus-ring");
    if (ring) drawRing(ring, remaining / secondsFor(mode), info.color);
    // pestañas de modo
    ["work", "break", "long"].forEach((m) => {
      const b = document.getElementById("fmode-" + m);
      if (b) b.classList.toggle("on", m === mode);
    });
  }

  function drawRing(cv, pct, color) {
    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2, cy = size / 2, r = size / 2 - 16;
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = 14; ctx.lineCap = "round";
    ctx.strokeStyle = cssVar("--border");
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    pct = Math.max(0, Math.min(1, pct));
    if (pct > 0) {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, cssVar(color)); g.addColorStop(1, cssVar("--accent-2"));
      ctx.strokeStyle = g; ctx.shadowColor = cssVar(color); ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ---------- stats ----------
  function todayStats() {
    const c = cfg();
    const today = DateUtil.todayKey();
    return { sessions: c.sessionsLog[today] || 0, minutes: c.focusLog[today] || 0, total: c.sessionsCompleted || 0 };
  }

  // ---------- render ----------
  function render(container) {
    if (!container) return;
    ensureRemaining();
    const c = cfg();
    const st = todayStats();
    container.innerHTML = "";

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("bulb"), "Enfoque"]),
        el("p", { class: "view-desc", text: "Técnica Pomodoro: concéntrate por bloques, descansa y gana XP." })
      ])
    ]));

    // KPIs
    container.appendChild(el("div", { class: "grid cols-3 mb-16" }, [
      kpi("Sesiones hoy", st.sessions + "", "completadas", "accent"),
      kpi("Minutos hoy", fmt.num(st.minutes), "enfocado", "good"),
      kpi("Total sesiones", fmt.num(st.total), "histórico", "accent")
    ]));

    const grid = el("div", { class: "grid cols-2 mb-16" });

    // ---- Tarjeta del temporizador ----
    const timerCard = el("div", { class: "card pomo" });
    // selector de modo
    const seg = el("div", { class: "seg", style: "align-self:center" }, [
      segBtn("work", "Enfoque"), segBtn("break", "Descanso"), segBtn("long", "Largo")
    ]);
    timerCard.appendChild(seg);

    const ring = el("canvas", { id: "focus-ring" });
    const timeWrap = el("div", { class: "pomo-ring" }, [
      ring,
      el("div", { class: "pomo-center" }, [
        el("div", { class: "pomo-mode", id: "focus-mode" }),
        el("div", { class: "pomo-time", id: "focus-time", text: fmtTime(remaining) })
      ])
    ]);
    timerCard.appendChild(timeWrap);

    const labelInput = el("input", { class: "input", id: "focus-label", placeholder: "¿En qué te enfocas? (opcional)", value: focusLabel, style: "text-align:center;max-width:320px;margin:0 auto" });
    labelInput.addEventListener("input", () => { focusLabel = labelInput.value; });
    timerCard.appendChild(el("div", { style: "margin:14px 0" }, [labelInput]));

    const controls = el("div", { class: "flex gap-8", style: "justify-content:center" }, [
      el("button", { class: "btn primary", id: "focus-start", onclick: () => (running ? pause() : start()) }),
      el("button", { class: "btn", id: "focus-reset", html: "↺ Reiniciar", onclick: reset }),
      el("button", { class: "btn ghost", id: "focus-skip", html: "⏭ Saltar", onclick: skip })
    ]);
    timerCard.appendChild(controls);
    grid.appendChild(timerCard);

    // ---- Tarjeta de configuración + progreso ----
    const side = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Ajustes del temporizador"])]),
      durField("Enfoque (min)", "work", c.work),
      durField("Descanso (min)", "break", c.break),
      durField("Descanso largo (min)", "longBreak", c.longBreak),
      durField("Largo cada N sesiones", "longEvery", c.longEvery, 1, 12),
      el("div", { class: "card-title mt-16", style: "margin-bottom:10px" }, [el("span", { class: "dot" }), "Foco · últimos 7 días"]),
    ]);
    const spark = el("canvas", { id: "focus-spark" });
    side.appendChild(el("div", { class: "chart-box" }, [spark]));
    grid.appendChild(side);

    container.appendChild(grid);

    // consejo
    container.appendChild(el("div", { class: "insight info" }, [
      el("span", { class: "ico", text: "💡" }),
      el("div", { class: "txt", html: "Consejo: elige una sola tarea, silencia distracciones y trabaja hasta que suene la alarma. Cada sesión completa suma <b>+20 XP</b>." })
    ]));

    paint();
    const days = DateUtil.lastNDays(7);
    setTimeout(() => N.Charts.bars(spark, { labels: days.map((d) => DateUtil.weekday(d)), series: [{ values: days.map((d) => c.focusLog[d] || 0), color: "--accent" }] }, { height: 150 }), 30);
  }

  function segBtn(m, label) {
    const b = el("button", { id: "fmode-" + m, text: label, onclick: () => { setMode(m); Audio.play("tab"); } });
    if (m === mode) b.classList.add("on");
    return b;
  }
  function durField(label, key, val, min, max) {
    const inp = el("input", { class: "input", type: "number", min: min || 1, max: max || 180, value: val });
    inp.addEventListener("change", () => {
      let v = parseInt(inp.value, 10);
      if (isNaN(v) || v < (min || 1)) v = min || 1;
      if (v > (max || 180)) v = max || 180;
      inp.value = v;
      cfg()[key] = v;
      Store.commit(true);
      if (!running) { remaining = secondsFor(mode); paint(); }
    });
    return el("div", { class: "field" }, [el("label", { text: label }), inp]);
  }
  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Focus = { render, todayStats };
})();
