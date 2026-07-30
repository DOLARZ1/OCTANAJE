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
  let ringing = false;         // true mientras la alarma sigue sonando en bucle
  let ringHandle = null;       // interval que repite el sonido+vibración
  let ringMode = "work";       // fase que acaba de terminar (para el mensaje del banner)

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

  // ---------- Wake Lock: mantiene la pantalla ENCENDIDA mientras corre
  // una sesión, para que el navegador no congele el temporizador y la
  // alarma suene exactamente al terminar (evita el "apagado parcial").
  // Se libera solo al pausar/terminar, o si el propio sistema la quita.
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if (typeof navigator !== "undefined" && navigator.wakeLock && navigator.wakeLock.request) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (e) { wakeLock = null; } // no soportado o permiso denegado: seguimos sin bloquear pantalla
  }
  function releaseWakeLock() {
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }
  // si el sistema quitó el wake lock al ocultar la pestaña, lo recuperamos al volver
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (running && !document.hidden && !wakeLock) requestWakeLock();
    });
  }

  // ---------- Banner global de alarma (visible en cualquier pestaña) ----------
  // Se conecta una sola vez al cargar el módulo; funciona sin importar en
  // qué vista esté el usuario cuando la alarma empieza a sonar.
  function paintBanner() {
    if (typeof document === "undefined") return;
    const banner = document.getElementById("alarm-banner");
    if (!banner) return;
    banner.hidden = !ringing;
    if (ringing) {
      const title = document.getElementById("alarm-banner-title");
      if (title) title.textContent = ringMode === "work" ? "🎯 ¡Sesión de enfoque terminada!" : "☕ ¡Descanso terminado!";
    }
  }
  if (typeof document !== "undefined" && document.getElementById) {
    const stopBtn = document.getElementById("alarm-banner-stop");
    if (stopBtn) stopBtn.addEventListener("click", () => stopRinging());
  }

  // ---------- controles ----------
  function start() {
    if (ringing) return; // primero hay que apagar la alarma que está sonando
    ensureRemaining();
    if (running) return;
    running = true;
    endAt = Date.now() + remaining * 1000;
    Audio.play("toggleOn");
    requestWakeLock();
    startTicking();
    paint();
  }
  function pause() {
    if (!running) return;
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    running = false;
    stopTicking();
    releaseWakeLock();
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
    running = false; stopTicking(); releaseWakeLock();
    remaining = secondsFor(mode);
    Audio.play("tap");
    paint();
  }
  function skip() {
    running = false; stopTicking(); releaseWakeLock();
    Audio.play("tap");
    nextPhase(false);
  }
  // vibración corta como respaldo del sonido (útil si el volumen está bajo
  // o en silencio); no falla si el dispositivo/navegador no la soporta
  function buzz(pattern) {
    try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }
  function tick() {
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    if (remaining <= 0) { complete(); return; }
    paint();
  }

  function complete() {
    running = false; stopTicking(); releaseWakeLock();
    ringMode = mode; // recordamos qué fase terminó, para el mensaje del banner
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
      Gami.award(20, "Sesión de foco completada 🎯");
      Gami.burst();
      if (N.Notify) N.Notify.send("¡Sesión completada! 🎯", "Buen trabajo. Toca un descanso.", { tag: "nexus-focus" });
    } else {
      if (N.Notify) N.Notify.send("Descanso terminado ☕", "Hora de volver al enfoque.", { tag: "nexus-focus" });
    }
    startRinging(); // la alarma sigue sonando en bucle hasta apagarla manualmente
    N.App && N.App.refreshTop();
  }
  // sonido de alarma configurable (guardado en Ajustes del temporizador)
  function alarmSoundName() { return cfg().alarmSound || "alarmLoud"; }

  // ---------- Alarma en bucle: suena repetidamente + vibra hasta que el
  // usuario la apague a mano (botón "Detener alarma" en el banner) — ya
  // no se detiene sola tras un único sonido.
  function ringOnce() {
    Audio.play(alarmSoundName());
    buzz([300, 150, 300, 150, 300]);
  }
  function startRinging() {
    ringing = true;
    ringOnce();
    clearInterval(ringHandle);
    ringHandle = setInterval(ringOnce, 2600); // se repite cada ~2.6s hasta apagarla
    paintBanner();
    paint();
  }
  function stopRinging() {
    ringing = false;
    clearInterval(ringHandle); ringHandle = null;
    paintBanner();
    Audio.play("tap");
    nextPhase(false); // avanza a la siguiente fase (sin autoiniciar) al apagar la alarma
    paint();
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
    paintBanner();
    const info = modeInfo(mode);
    const t = document.getElementById("focus-time");
    if (!t) return; // la vista no está montada
    t.textContent = fmtTime(remaining);
    const ml = document.getElementById("focus-mode");
    if (ml) { ml.textContent = info.ico + "  " + info.label; ml.style.color = cssVar(info.color); }
    const btn = document.getElementById("focus-start");
    if (btn) {
      btn.innerHTML = ringing ? "🔇 Detén la alarma primero" : (running ? "⏸ Pausar" : (remaining < secondsFor(mode) ? "▶ Reanudar" : "▶ Iniciar"));
      btn.style.opacity = ringing ? ".55" : "";
    }
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
    if (ringing) {
      timerCard.appendChild(el("div", { class: "insight bad mt-8", style: "justify-content:center;text-align:center" }, [
        el("span", { class: "ico", text: "⏰" }),
        el("div", { class: "txt", html: "La alarma está sonando. Usa el botón rojo de arriba de la pantalla para detenerla." })
      ]));
    }
    grid.appendChild(timerCard);

    // ---- Tarjeta de configuración + progreso ----
    const side = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Ajustes del temporizador"])]),
      durField("Enfoque (min)", "work", c.work),
      durField("Descanso (min)", "break", c.break),
      durField("Descanso largo (min)", "longBreak", c.longBreak),
      durField("Largo cada N sesiones", "longEvery", c.longEvery, 1, 12),
      alarmField(c),
      el("p", { class: "fs-12 text-faint mt-8", text: "La pantalla se mantiene encendida durante una sesión activa para que la alarma suene puntual (se apaga sola al pausar/terminar)." }),
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

    // aclaración de funcionamiento (letras pequeñas, al final de la vista)
    // para evitar confundir estas limitaciones con un mal funcionamiento
    container.appendChild(el("p", {
      class: "fs-12 text-faint mt-16",
      style: "line-height:1.6",
      html:
        "ℹ️ <b>Cómo funciona la alarma:</b> mientras una sesión está activa, OCTANAJE mantiene la pantalla encendida (Wake Lock) para que la cuenta no se congele y la alarma suene puntual. " +
        "Esto solo aplica si la app permanece visible en la pantalla, aunque esté \"en reposo\"/atenuada. " +
        "Si bloqueas el teléfono manualmente, cambias a otra app, o el sistema cierra la pestaña en segundo plano para ahorrar batería, el temporizador puede pausarse y la alarma sonará hasta que vuelvas a abrir la app — esto lo controla el sistema operativo, no OCTANAJE. " +
        "La alarma <b>suena en bucle sin detenerse sola</b> hasta que la apagues con el botón rojo del banner que aparece arriba de la pantalla — así no se te pasa por alto. " +
        "Revisa también que el volumen del dispositivo no esté en silencio y que el sonido esté activado en Ajustes; hay varias alarmas para elegir (Timbre, Sirena, Campana, Despertador digital/clásico, Bocina, Xilófono) y una vibración de respaldo para que sea difícil pasarlas por alto. " +
        "Para recordatorios críticos que deban sonar con el teléfono bloqueado o la app cerrada, usa el botón \"Añadir a Google Calendar\" (Hábitos/Tareas/Metas) o \"Configurar horario\" en Ajustes: esos sí usan la alarma nativa de tu calendario/sistema."
    }));

    paint();
    const days = DateUtil.lastNDays(7);
    setTimeout(() => N.Charts.bars(spark, { labels: days.map((d) => DateUtil.weekday(d)), series: [{ values: days.map((d) => c.focusLog[d] || 0), color: "--accent" }] }, { height: 150 }), 30);
  }

  function segBtn(m, label) {
    const b = el("button", { id: "fmode-" + m, text: label, onclick: () => { setMode(m); Audio.play("tab"); } });
    if (m === mode) b.classList.add("on");
    return b;
  }
  const ALARM_SOUNDS = [
    { value: "alarmLoud", label: "🔔 Timbre fuerte (recomendado)" },
    { value: "sirenLoud", label: "🚨 Sirena" },
    { value: "bellLoud", label: "🛎️ Campana" },
    { value: "digitalLoud", label: "⏱️ Despertador digital" },
    { value: "classicLoud", label: "⏰ Despertador clásico" },
    { value: "hornLoud", label: "📢 Bocina" },
    { value: "xyloLoud", label: "🎶 Xilófono" },
    { value: "levelup", label: "🎵 Melodía suave (menos fuerte)" }
  ];
  function alarmField(c) {
    const sel = el("select", { class: "input" }, ALARM_SOUNDS.map((s) => {
      const o = el("option", { value: s.value, text: s.label });
      if ((c.alarmSound || "alarmLoud") === s.value) o.setAttribute("selected", "");
      return o;
    }));
    sel.addEventListener("change", () => { cfg().alarmSound = sel.value; Store.commit(true); Audio.play(sel.value); });
    const testBtn = el("button", { class: "btn sm", style: "margin-top:6px", html: "🔊 Probar sonido", onclick: () => Audio.play(cfg().alarmSound || "alarmLoud") });
    return el("div", { class: "field" }, [el("label", { text: "Sonido de alarma al terminar" }), sel, testBtn]);
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
