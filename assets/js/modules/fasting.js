/* =====================================================================
   OCTANAJE · Módulo Ayuno intermitente
   Planes preconfigurados (16:8, 18:6, 20:4, OMAD, 5:2 o personalizado),
   horario de tu ventana para comer, recordatorios reales en tu
   calendario (Google Calendar / .ics) para el inicio y fin de tu
   ventana, calendario con palomita de cumplimiento, racha, gráfica de
   progreso, interruptor para activar/desactivar el seguimiento, y XP
   por cada día cumplido.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  const XP_PER_DAY = 4;
  const DOW_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // ---------------- Planes disponibles ----------------
  const PLANS = [
    { value: "16:8", label: "16:8", tag: "Popular para empezar", fastH: 16, icon: "🕐",
      desc: "Ayunas 16 horas (contando el sueño) y comes en una ventana de 8 horas. El plan más recomendado para iniciarse en el ayuno intermitente." },
    { value: "18:6", label: "18:6", tag: "Intermedio", fastH: 18, icon: "🕜",
      desc: "Un paso más estricto que el 16:8: tu ventana para comer se reduce a solo 6 horas." },
    { value: "20:4", label: "20:4", tag: "Avanzado · Warrior", fastH: 20, icon: "🕝",
      desc: "Estilo \"Warrior\": una sola ventana corta de 4 horas para hacer tus comidas del día." },
    { value: "omad", label: "OMAD", tag: "Una comida al día", fastH: 23, icon: "🍽️",
      desc: "\"One Meal A Day\": haces una sola comida principal, dentro de una ventana de ~1 hora." },
    { value: "5:2", label: "5:2", tag: "Por días, no por horario", fastH: null, icon: "📅",
      desc: "Comes con normalidad 5 días de la semana, y en 2 días (no consecutivos) reduces tu ingesta a ~500-600 kcal." },
    { value: "custom", label: "Personalizado", tag: "Tú decides", fastH: null, icon: "⚙️",
      desc: "Define tú mismo cuántas horas quieres ayunar; el resto del día será tu ventana para comer." }
  ];
  function planInfo(v) { return PLANS.find((p) => p.value === v) || PLANS[0]; }

  // ---------------- Estado ----------------
  function fasting() {
    const s = Store.get();
    if (!s.fasting || typeof s.fasting !== "object") {
      s.fasting = { enabled: false, plan: "16:8", customFastH: 16, eatStart: "13:00", fiveTwoDays: [1, 4], log: {} };
    }
    if (!s.fasting.log || typeof s.fasting.log !== "object") s.fasting.log = {};
    if (!Array.isArray(s.fasting.fiveTwoDays)) s.fasting.fiveTwoDays = [1, 4];
    if (s.fasting.customFastH == null) s.fasting.customFastH = 16;
    if (!s.fasting.eatStart) s.fasting.eatStart = "13:00";
    if (!s.fasting.plan) s.fasting.plan = "16:8";
    return s.fasting;
  }
  function log() { return fasting().log; }

  function clampHours(h) { h = Number(h) || 16; return Math.max(1, Math.min(23, h)); }

  // suma horas (puede tener .5) a una hora "HH:MM" y devuelve "HH:MM" (cruza medianoche)
  function addHoursToTime(time, hours) {
    const [hh, mm] = (time || "08:00").split(":").map(Number);
    let total = hh * 60 + mm + Math.round(hours * 60);
    total = ((total % 1440) + 1440) % 1440;
    const H = Math.floor(total / 60), M = total % 60;
    return String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0");
  }

  // ventana de comer/ayuno según el plan actual (o info especial para 5:2)
  function windowInfo() {
    const st = fasting();
    if (st.plan === "5:2") return { type: "5:2", days: st.fiveTwoDays || [] };
    const plan = planInfo(st.plan);
    const fastH = st.plan === "custom" ? clampHours(st.customFastH) : plan.fastH;
    const eatH = Math.max(1, 24 - fastH);
    const eatStart = st.eatStart || "13:00";
    const eatEnd = addHoursToTime(eatStart, eatH);
    return { type: "window", fastH, eatH, eatStart, eatEnd, fastStart: eatEnd, fastEnd: eatStart };
  }

  // ¿este día importa para marcar cumplimiento según el plan? (en 5:2 solo los 2 días elegidos)
  function isRelevantDay(key) {
    const st = fasting();
    if (st.plan !== "5:2") return true;
    return (st.fiveTwoDays || []).includes(DateUtil.parse(key).getDay());
  }

  // ---------------- Guardar / consultar cumplimiento ----------------
  function entryOn(key) { return log()[key] || null; }
  function setStatus(key, status, note) {
    const l = log();
    const prev = l[key];
    const wasDone = prev && prev.status === "done";
    l[key] = { status, note: note || "", plan: fasting().plan };
    Store.commit();
    if (status === "done" && !wasDone) Gami.award(XP_PER_DAY, "Ayuno cumplido 🕐");
    else if (status !== "done" && wasDone) Gami.remove(XP_PER_DAY);
    else Store.commit();
  }
  function clearDay(key) {
    const l = log();
    const prev = l[key];
    if (prev && prev.status === "done") Gami.remove(XP_PER_DAY);
    delete l[key];
    Store.commit();
  }

  function complianceStreak() {
    const st = fasting();
    let streak = 0;
    let day = today();
    const todEntry = st.log[day];
    if (!todEntry || todEntry.status !== "done") day = DateUtil.addDays(day, -1);
    let guard = 0;
    while (guard < 400) {
      guard++;
      if (isRelevantDay(day)) {
        const e = st.log[day];
        if (e && e.status === "done") { streak++; day = DateUtil.addDays(day, -1); continue; }
        break;
      }
      day = DateUtil.addDays(day, -1);
    }
    return streak;
  }

  function compliancePct(nDays) {
    const days = DateUtil.lastNDays(nDays).filter(isRelevantDay);
    if (!days.length) return 0;
    const doneCount = days.filter((d) => { const e = fasting().log[d]; return e && e.status === "done"; }).length;
    return Math.round((doneCount / days.length) * 100);
  }

  function totalDone() { return Object.values(log()).filter((e) => e.status === "done").length; }

  function rangeSeries(mode) {
    let days;
    if (mode === "monthly") days = DateUtil.lastNDays(30);
    else if (mode === "weekly") days = DateUtil.lastNDays(7);
    else days = DateUtil.lastNDays(7);
    return {
      labels: days.map((d) => mode === "monthly" ? DateUtil.parse(d).getDate() + "" : DateUtil.weekday(d)),
      values: days.map((d) => { const e = log()[d]; return e && e.status === "done" ? 1 : 0; })
    };
  }

  // ---------------- Cronómetro en vivo ----------------
  // Muestra cuánto llevas en tu fase actual (ayunando o comiendo) y
  // cuánto falta para que cambie, actualizándose cada segundo mientras
  // la pestaña de Ayuno esté visible (se detiene si sales de la vista
  // o la app pasa a segundo plano, para no gastar batería de más).
  let tickHandle = null;
  let liveEls = null; // {phase, elapsed, remaining, bar}

  function msUntil(hhmm) {
    const now = new Date();
    const [hh, mm] = hhmm.split(":").map(Number);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    let diff = target - now;
    if (diff < 0) diff += 24 * 3600 * 1000;
    return diff;
  }
  function fmtHM(ms) {
    const totalMin = Math.max(0, Math.floor(ms / 60000));
    const h = Math.floor(totalMin / 60), m = totalMin % 60, s = Math.floor((ms % 60000) / 1000);
    return h + "h " + String(m).padStart(2, "0") + "m " + String(s).padStart(2, "0") + "s";
  }

  function liveStatus() {
    const w = windowInfo();
    if (w.type === "5:2") return null; // el plan 5:2 no tiene ventana horaria fija
    const untilFastStart = msUntil(w.fastStart);
    const untilEatStart = msUntil(w.eatStart);
    // si falta menos para que empiece el ayuno que para que empiece a comer, estamos en ventana de comer
    const inEatWindow = untilFastStart < untilEatStart;
    const totalMs = (inEatWindow ? w.eatH : w.fastH) * 3600 * 1000;
    const remainingMs = inEatWindow ? untilFastStart : untilEatStart;
    const elapsedMs = Math.max(0, totalMs - remainingMs);
    const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
    return { inEatWindow, remainingMs, elapsedMs, pct };
  }

  function liveCard() {
    const st = liveStatus();
    if (!st) return null;
    const phaseLbl = st.inEatWindow ? "🍽️ Estás en tu ventana para comer" : "🕐 Estás ayunando";
    const nextLbl = st.inEatWindow ? "Tu ayuno empieza en" : "Tu ventana para comer empieza en";

    const bar = el("div", { class: "xp-bar", style: "height:10px;margin-top:10px" }, [el("div", { class: "xp-fill", style: "width:" + st.pct.toFixed(1) + "%" })]);
    const remainNode = el("div", { class: "kpi-val", style: "font-size:26px;color:var(--accent)", text: fmtHM(st.remainingMs) });
    const card = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), phaseLbl])]),
      el("div", { class: "fs-12 text-faint", text: "Llevas " + fmtHM(st.elapsedMs) }),
      bar,
      el("div", { class: "mt-16" }, [
        el("div", { class: "fs-12 text-faint", text: nextLbl }),
        remainNode
      ])
    ]);
    liveEls = { bar: bar.children[0], remain: remainNode, elapsed: card.children[1] };
    return card;
  }

  function viewIsActive() {
    const v = document.getElementById("view-fasting");
    return !!(v && v.classList && v.classList.contains("is-active"));
  }
  function liveTick() {
    if (!liveEls) return;
    // si el usuario cambió de pestaña sin volver a renderizar Ayuno, o la
    // app pasó a segundo plano, detenemos el cronómetro (ahorro de batería)
    if (!viewIsActive() || (typeof document !== "undefined" && document.hidden)) { stopLiveTicking(); return; }
    const st = liveStatus();
    if (!st) return;
    liveEls.bar.style.width = st.pct.toFixed(1) + "%";
    liveEls.remain.textContent = fmtHM(st.remainingMs);
    liveEls.elapsed.textContent = "Llevas " + fmtHM(st.elapsedMs);
  }

  // Solo detiene el intervalo, SIN borrar liveEls — se usa justo antes de
  // volver a arrancarlo, para no perder la referencia a los nodos que
  // liveCard() ya llenó (ese era el bug: llamar aquí a stopLiveTicking()
  // ponía liveEls en null, y liveTick() salía de inmediato cada segundo
  // sin actualizar nada hasta el siguiente render completo).
  function pauseLiveTicking() {
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  }
  function startLiveTicking() {
    pauseLiveTicking();
    if (typeof document !== "undefined" && document.hidden) return;
    tickHandle = setInterval(liveTick, 1000);
  }
  function stopLiveTicking() {
    pauseLiveTicking();
    liveEls = null;
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } }
      else if (viewIsActive() && liveEls) { liveTick(); startLiveTicking(); }
    });
  }

  // ---------------- Activar / desactivar ----------------
  function toggleEnabled() {
    fasting().enabled = !fasting().enabled;
    Store.commit();
    Audio.play("tap");
    toast({ icon: "🕐", msg: fasting().enabled ? "Ayuno intermitente activado" : "Ayuno intermitente desactivado" });
    render(document.getElementById("view-fasting"));
  }

  // ---------------- Selección / configuración de plan ----------------
  function openPlanForm() {
    const st = fasting();
    let sel = st.plan;
    let customH = st.customFastH;
    let eatStart = st.eatStart;
    let fiveTwoDays = new Set(st.fiveTwoDays || [1, 4]);

    const wrap = el("div", {});

    function paint() {
      wrap.innerHTML = "";

      const grid = el("div", { class: "iconpick" });
      PLANS.forEach((p) => {
        const btn = el("button", { type: "button", class: "iconpick-btn" + (p.value === sel ? " on" : ""), title: p.label });
        btn.innerHTML = "<span class='ip-ic ip-emoji'>" + p.icon + "</span><span class='ip-lbl'>" + p.label + "</span>";
        btn.addEventListener("click", () => { sel = p.value; paint(); });
        grid.appendChild(btn);
      });
      wrap.appendChild(grid);

      const info = planInfo(sel);
      wrap.appendChild(el("div", { class: "insight info mt-16" }, [
        el("span", { class: "ico", text: info.icon }),
        el("div", { class: "txt", text: info.desc })
      ]));

      if (sel === "custom") {
        const hoursI = el("input", { class: "input", type: "number", min: 1, max: 23, step: 0.5, value: customH });
        hoursI.addEventListener("input", () => { customH = Number(hoursI.value) || 16; });
        wrap.appendChild(el("div", { class: "field mt-16" }, [el("label", { text: "¿Cuántas horas quieres ayunar?" }), hoursI]));
      }

      if (sel === "5:2") {
        const grid2 = el("div", { class: "wdays mt-16" });
        DOW_NAMES.forEach((_, i) => {
          const shortLbl = ["D", "L", "M", "M", "J", "V", "S"][i];
          const b = el("button", { type: "button", class: "wday" + (fiveTwoDays.has(i) ? " on" : ""), text: shortLbl });
          b.addEventListener("click", () => {
            if (fiveTwoDays.has(i)) fiveTwoDays.delete(i); else fiveTwoDays.add(i);
            b.classList.toggle("on");
          });
          grid2.appendChild(b);
        });
        wrap.appendChild(el("div", { class: "field mt-16" }, [el("label", { text: "¿Qué 2 días de la semana restringes tu ingesta a ~500-600 kcal?" }), grid2]));
      } else {
        const eatI = el("input", { class: "input", type: "time", value: eatStart });
        eatI.addEventListener("input", () => { eatStart = eatI.value; });
        wrap.appendChild(el("div", { class: "field mt-16" }, [el("label", { text: "¿A qué hora empieza tu ventana para comer?" }), eatI]));
        const preview = el("div", { class: "fs-12 text-faint" });
        function paintPreview() {
          const fastH = sel === "custom" ? clampHours(customH) : info.fastH;
          const eatH = Math.max(1, 24 - fastH);
          const end = addHoursToTime(eatStart, eatH);
          preview.textContent = "🍽️ Comes de " + eatStart + " a " + end + " · 🕐 Ayunas de " + end + " a " + eatStart + " del día siguiente (" + fastH + " h).";
        }
        paintPreview();
        eatI.addEventListener("input", paintPreview);
        wrap.appendChild(preview);
      }

      wrap.appendChild(el("button", {
        class: "btn primary block mt-16", html: "💾 Guardar plan",
        onclick: () => {
          if (sel === "5:2" && fiveTwoDays.size !== 2) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige exactamente 2 días para el plan 5:2" }); return; }
          st.plan = sel;
          st.customFastH = clampHours(customH);
          st.eatStart = eatStart;
          st.fiveTwoDays = Array.from(fiveTwoDays).sort();
          st.enabled = true;
          Store.commit();
          Audio.play("levelup");
          toast({ icon: "🕐", title: "Plan guardado", msg: planInfo(sel).label + (sel === "5:2" ? "" : " · ventana " + windowInfo().eatStart + "-" + windowInfo().eatEnd) });
          UI.closeModal();
          render(document.getElementById("view-fasting"));
        }
      }));
    }
    paint();
    UI.openModal("🕐 Elige tu plan de ayuno", wrap);
  }

  // ---------------- Recordatorios en Google Calendar / .ics ----------------
  function openRemindersModal() {
    const w = windowInfo();
    const body = el("div", {});
    body.appendChild(el("p", { class: "text-dim fs-13 mb-16", text: "Se crearán recordatorios reales en tu calendario del sistema (funcionan aunque cierres OCTANAJE):" }));

    if (w.type === "5:2") {
      body.appendChild(el("button", {
        class: "btn primary block mb-8", html: "📅 Recordatorio: día de restricción (500-600 kcal)",
        onclick: () => {
          UI.closeModal();
          N.CalExport.openTimed({
            title: "🕐 Hoy es día de ayuno 5:2", details: "Restringe tu ingesta a 500-600 kcal aproximadamente.",
            time: "08:00", days: w.days, dateKey: today()
          });
        }
      }));
    } else {
      body.appendChild(el("button", {
        class: "btn primary block mb-8", html: "🍽️ Recordatorio: empieza tu ventana para comer (" + w.eatStart + ")",
        onclick: () => {
          UI.closeModal();
          N.CalExport.openTimed({
            title: "🍽️ Se abre tu ventana para comer", details: "Plan " + planInfo(fasting().plan).label + ".",
            time: w.eatStart, days: [0, 1, 2, 3, 4, 5, 6], dateKey: today()
          });
        }
      }));
      body.appendChild(el("button", {
        class: "btn block mb-16", html: "🕐 Recordatorio: empieza tu ayuno (" + w.fastStart + ")",
        onclick: () => {
          UI.closeModal();
          N.CalExport.openTimed({
            title: "🕐 Empieza tu ayuno", details: "Plan " + planInfo(fasting().plan).label + " · dura " + w.fastH + " horas.",
            time: w.fastStart, days: [0, 1, 2, 3, 4, 5, 6], dateKey: today()
          });
        }
      }));
    }
    body.appendChild(el("p", { class: "fs-12 text-faint", text: "Cada botón te llevará a elegir entre añadirlo a Google Calendar o descargar un archivo .ics (Apple, Outlook, Samsung…)." }));
    UI.openModal("⏰ Recordatorios de ayuno", body);
  }

  // ---------------- Marcar el día (modal) ----------------
  function openDayForm(key) {
    const relevant = isRelevantDay(key);
    const existing = entryOn(key);
    const dLbl = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    const noteI = el("textarea", { class: "textarea", placeholder: "Ej. Se me hizo fácil, tuve hambre en la tarde…" });
    noteI.value = existing ? (existing.note || "") : "";

    const body = el("div", {});
    if (!relevant) {
      body.appendChild(el("div", { class: "insight info mb-16" }, [
        el("span", { class: "ico", text: "ℹ️" }),
        el("div", { class: "txt", text: "Con tu plan 5:2, este día no es uno de tus días de restricción, así que no es necesario marcarlo." })
      ]));
    }
    body.appendChild(el("div", { class: "row mb-16" }, [
      el("button", { class: "btn" + (existing && existing.status === "done" ? " primary" : ""), html: "✅ Cumplí", onclick: () => { setStatus(key, "done", noteI.value); Audio.play("levelup"); toast({ icon: "✅", title: "¡Bien hecho!", msg: dLbl }); UI.closeModal(); render(document.getElementById("view-fasting")); } }),
      el("button", { class: "btn" + (existing && existing.status === "failed" ? " danger" : ""), html: "❌ No cumplí", onclick: () => { setStatus(key, "failed", noteI.value); Audio.play("tap"); toast({ icon: "❌", msg: "Registrado, sin problema — mañana será otro día" }); UI.closeModal(); render(document.getElementById("view-fasting")); } })
    ]));
    body.appendChild(el("div", { class: "field" }, [el("label", { text: "📝 Nota (opcional)" }), noteI]));
    if (existing) {
      body.appendChild(el("button", { class: "btn ghost block mt-8", html: "🗑️ Quitar marca de este día", onclick: () => { clearDay(key); Audio.play("delete"); toast({ icon: "🗑️", msg: "Marca eliminada" }); UI.closeModal(); render(document.getElementById("view-fasting")); } }));
    }
    UI.openModal("📅 " + dLbl, body);
  }

  // ---------------- Historial ----------------
  function historyRow(key, e) {
    const dLbl = DateUtil.parse(key).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    const done = e.status === "done";
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip " + (done ? "good" : "bad"), text: done ? "✅ Cumplido" : "❌ No cumplido" }),
          el("span", { class: "chip", text: planInfo(e.plan).label }),
          e.note ? el("span", { class: "text-faint fs-12", text: "📝 " + e.note }) : null
        ])
      ]),
      el("button", { class: "icon-btn", html: "✏️", title: "Editar", onclick: () => { UI.closeModal(); openDayForm(key); } }),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar registro", "¿Eliminar el registro del " + dLbl + "?", () => {
          clearDay(key); Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); openHistory();
        }, "Eliminar");
      } })
    ]);
  }
  function openHistory() {
    const entries = Object.keys(log()).sort((a, b) => b.localeCompare(a));
    const body = el("div", {});
    if (!entries.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🕐" }), el("div", { text: "Aún no tienes días marcados." })]));
    } else {
      entries.forEach((key) => body.appendChild(historyRow(key, log()[key])));
    }
    UI.openModal("📖 Historial de ayuno (" + entries.length + ")", body);
  }

  // ---------------- Calendario ----------------
  function buildCalendar() {
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    const monthLabel = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startCol = (new Date(y, mo, 1).getDay() + 6) % 7;
    const todayKey = today();

    const grid = el("div", { class: "cal" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach((h) => grid.appendChild(el("div", { class: "cal-h", text: h })));
    for (let i = 0; i < startCol; i++) grid.appendChild(el("div", { class: "cal-day empty" }));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      const e = entryOn(key);
      const relevant = isRelevantDay(key);
      let cls = "cal-day";
      const label = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
      let tip = label;
      if (key > todayKey) cls += " future";
      else if (e && e.status === "done") { cls += " done"; tip += " · cumplido ✅"; }
      else if (e && e.status === "failed") { cls += " miss"; tip += " · no cumplido ❌"; }
      else if (!relevant) { cls += " unmarked"; tip += " · no aplica (5:2)"; }
      else { cls += " unmarked"; tip += " · sin marcar"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls + " clickable", title: tip + " · toca para marcar", text: String(d), onclick: () => openDayForm(key) }));
    }
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px;text-transform:capitalize" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Calendario de ayuno · " + monthLabel]),
        el("div", { class: "flex gap-8 fs-12", style: "flex-wrap:wrap" }, [
          el("span", { class: "chip good", text: "✅ Cumplido" }),
          el("span", { class: "chip bad", text: "❌ No cumplido" }),
          el("span", { class: "chip", text: "○ Sin marcar" })
        ])
      ]),
      grid
    ]);
  }

  // ---------------- Gráfica ----------------
  let chartMode = "weekly";
  function buildChartCard(container) {
    function segBtn(mode, label) {
      const b = el("button", { text: label, onclick: () => { chartMode = mode; Audio.play("tab"); render(container); } });
      if (chartMode === mode) b.classList.add("on");
      return b;
    }
    const data = rangeSeries(chartMode);
    const cv = el("canvas");
    const card = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Cumplimiento"]),
        el("div", { class: "seg" }, [segBtn("weekly", "Semanal"), segBtn("monthly", "Mensual")])
      ]),
      el("div", { class: "chart-box" }, [cv])
    ]);
    setTimeout(() => Charts.bars(cv, { labels: data.labels, series: [{ values: data.values, color: "--good" }] }, { height: 150 }), 30);
    const doneCount = data.values.reduce((a, b) => a + b, 0);
    card.appendChild(el("div", { class: "fs-12 text-faint mt-8", text: "Cumpliste " + doneCount + " de " + data.values.length + " días mostrados (1 = cumplido, 0 = no)." }));
    return card;
  }

  // ---------------- Consejos generales ----------------
  function tipsCard() {
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "💡 Recomendaciones generales"])]),
      el("div", { class: "insight good" }, [el("span", { class: "ico", text: "💧" }), el("div", { class: "txt", html: "<b>Hidrátate bien</b> durante el ayuno: agua, café o té sin azúcar y electrolitos (sodio/potasio/magnesio) ayudan a evitar dolores de cabeza y fatiga." })]),
      el("div", { class: "insight info" }, [el("span", { class: "ico", text: "🍽️" }), el("div", { class: "txt", html: "<b>Rompe el ayuno gradualmente</b>: evita comidas muy pesadas o azucaradas de golpe; empieza con algo ligero y de fácil digestión." })]),
      el("div", { class: "insight warn" }, [el("span", { class: "ico", text: "⚠️" }), el("div", { class: "txt", html: "El ayuno intermitente <b>no se recomienda</b> si estás embarazada o en lactancia, tienes antecedentes de trastornos alimentarios, diabetes tipo 1, o estás bajo tratamiento médico — consulta a tu médico antes de empezar." })]),
      el("div", { class: "insight" }, [el("span", { class: "ico", text: "🍎" }), el("div", { class: "txt", html: "Aprovecha la pestaña <b>Alimentación</b> para que tu ventana de comer sea nutritiva (no solo calórica), y <b>Salud</b> para llevar tu peso y tu plan de calorías/proteína en paralelo." })])
    ]);
  }

  // ---------------- Render principal ----------------
  function render(container) {
    container.innerHTML = "";
    const st = fasting();

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("hourglass"), "Ayuno"]),
        el("p", { class: "view-desc", text: "Elige tu plan de ayuno intermitente, configura recordatorios y lleva tu historial de cumplimiento." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Historial" })
      ])
    ]));

    // ---- Interruptor activar/desactivar ----
    const toggle = el("button", { class: "switch" + (st.enabled ? " on" : ""), role: "switch", "aria-checked": st.enabled ? "true" : "false" }, [el("span", { class: "knob" })]);
    toggle.addEventListener("click", toggleEnabled);
    container.appendChild(el("div", { class: "card mb-16" }, [
      el("div", { class: "set-row", style: "padding:0" }, [
        el("div", {}, [
          el("div", { class: "set-title", text: "🕐 Ayuno intermitente" }),
          el("div", { class: "set-desc", text: st.enabled ? "Activado · plan " + planInfo(st.plan).label : "Desactivado" })
        ]),
        toggle
      ])
    ]));

    if (!st.enabled) {
      stopLiveTicking();
      container.appendChild(el("div", { class: "card mb-16" }, [
        el("div", { class: "empty" }, [
          el("span", { class: "big", text: "🕐" }),
          el("div", { text: "El seguimiento de ayuno está desactivado." }),
          el("p", { class: "fs-12 text-faint mt-8", text: "Actívalo con el interruptor de arriba para elegir un plan, configurar tu horario y empezar a marcar tu cumplimiento diario." }),
          el("button", { class: "btn primary mt-16", onclick: openPlanForm, html: "🕐 Elegir mi plan y activar" })
        ])
      ]));
      container.appendChild(buildCalendar());
      return;
    }

    const w = windowInfo();
    const streak = complianceStreak();
    const pct7 = compliancePct(7);

    // ---- Plan actual ----
    const planCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", {}, [
          el("div", { class: "card-title" }, [el("span", { class: "dot" }), planInfo(st.plan).icon + " Plan " + planInfo(st.plan).label]),
          el("div", { class: "card-sub", text: planInfo(st.plan).tag })
        ]),
        el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
          el("button", { class: "btn sm", onclick: openRemindersModal, html: "⏰ Recordatorios" }),
          el("button", { class: "btn sm primary", onclick: openPlanForm, html: "⚙️ Cambiar plan" })
        ])
      ]),
      w.type === "5:2"
        ? el("div", { class: "insight info" }, [
            el("span", { class: "ico", text: "📅" }),
            el("div", { class: "txt", html: "Tus días de restricción (~500-600 kcal): <b>" + (w.days.map((d) => DOW_NAMES[d]).join(", ") || "sin elegir") + "</b>. El resto de la semana comes con normalidad." })
          ])
        : el("div", { class: "insight info" }, [
            el("span", { class: "ico", text: "🍽️" }),
            el("div", { class: "txt", html: "Ventana para comer: <b>" + w.eatStart + " – " + w.eatEnd + "</b> (" + w.eatH + " h) &nbsp;·&nbsp; Ayuno: <b>" + w.fastStart + " – " + w.fastEnd + "</b> (" + w.fastH + " h)." })
          ])
    ]);
    container.appendChild(planCard);

    // ---- Cronómetro en vivo (solo si el plan tiene horario fijo) ----
    const lc = liveCard();
    if (lc) { container.appendChild(lc); startLiveTicking(); }
    else stopLiveTicking();

    // ---- Marcar hoy ----
    const todEntry = entryOn(today());
    const todRelevant = isRelevantDay(today());
    const todayCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Hoy"])])
    ]);
    if (!todRelevant) {
      todayCard.appendChild(el("div", { class: "insight" }, [el("span", { class: "ico", text: "ℹ️" }), el("div", { class: "txt", text: "Hoy no es uno de tus días de restricción del plan 5:2. ¡Disfruta tu día normal!" })]));
    } else {
      todayCard.appendChild(el("div", { class: "row" }, [
        el("button", { class: "btn" + (todEntry && todEntry.status === "done" ? " primary" : ""), html: "✅ Cumplí mi ayuno hoy", onclick: () => { setStatus(today(), "done"); Audio.play("levelup"); toast({ icon: "✅", title: "¡Racha +1!", msg: "Sigue así" }); render(container); } }),
        el("button", { class: "btn" + (todEntry && todEntry.status === "failed" ? " danger" : ""), html: "❌ No lo cumplí", onclick: () => { setStatus(today(), "failed"); Audio.play("tap"); toast({ icon: "❌", msg: "Sin problema, mañana lo retomas" }); render(container); } })
      ]));
      todayCard.appendChild(el("button", { class: "btn ghost sm mt-8", onclick: () => openDayForm(today()), html: "📝 Agregar nota" }));
    }
    container.appendChild(todayCard);

    // ---- KPIs ----
    container.appendChild(el("div", { class: "grid cols-3 mb-16" }, [
      kpi("Racha actual", streak + "", streak === 1 ? "día cumplido" : "días cumplidos", "accent"),
      kpi("Cumplimiento 7 días", pct7 + "%", "de los días que aplican", pct7 >= 70 ? "good" : pct7 >= 40 ? "warn" : "bad"),
      kpi("Total cumplidos", totalDone() + "", "acumulados", "warn")
    ]));

    container.appendChild(buildChartCard(container));
    container.appendChild(buildCalendar());
    container.appendChild(tipsCard());
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  // ---------------- Notificación automática al abrir/cerrar tu ventana ----------------
  // Revisa cada minuto si es exactamente la hora de empezar a comer o de
  // empezar a ayunar (o el día de restricción del plan 5:2), y avisa una
  // sola vez por ocurrencia usando el sistema de notificaciones/toasts
  // que ya existe en la app (respeta el interruptor general de Ajustes).
  function checkAutoNotify() {
    const st = fasting();
    if (!st.enabled || !N.Notify) return;
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const todayKey = today();

    if (st.plan === "5:2") {
      if (isRelevantDay(todayKey) && hhmm === "08:00") {
        const stamp = todayKey + "_5:2";
        if (st.lastFastNotif !== stamp) {
          st.lastFastNotif = stamp; Store.commit(true);
          N.Notify.send("🕐 Hoy es día de ayuno 5:2", "Restringe tu ingesta a ~500-600 kcal.", { emoji: "🕐", tag: "octanaje-fasting" });
        }
      }
      return;
    }
    const w = windowInfo();
    if (hhmm === w.eatStart) {
      const stamp = todayKey + "_" + w.eatStart;
      if (st.lastEatNotif !== stamp) {
        st.lastEatNotif = stamp; Store.commit(true);
        N.Notify.send("🍽️ Se abrió tu ventana para comer", "Plan " + planInfo(st.plan).label + " · dura " + w.eatH + " horas.", { emoji: "🍽️", tag: "octanaje-fasting" });
      }
    }
    if (hhmm === w.fastStart) {
      const stamp = todayKey + "_" + w.fastStart;
      if (st.lastFastNotif !== stamp) {
        st.lastFastNotif = stamp; Store.commit(true);
        N.Notify.send("🕐 Empezó tu ayuno", "Plan " + planInfo(st.plan).label + " · dura " + w.fastH + " horas.", { emoji: "🕐", tag: "octanaje-fasting" });
      }
    }
  }

  let autoNotifyHandle = null;
  function init() {
    setTimeout(checkAutoNotify, 5000);
    if (autoNotifyHandle) clearInterval(autoNotifyHandle);
    autoNotifyHandle = setInterval(checkAutoNotify, 30 * 1000);
  }

  N.Fasting = { render, complianceStreak, init };
})();
