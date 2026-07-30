/* =====================================================================
   OCTANAJE · Módulo Sueño
   Registro manual de horas de sueño: periodo (día/tarde/noche), hora
   exacta de inicio y fin (calcula las horas solas, incluso cruzando
   medianoche), notas, historial editable, gráfica diaria/semanal/mensual,
   calendario de actividad, y XP por cada registro.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  const XP_PER_LOG = 5;

  const PERIODS = [
    { value: "day", label: "☀️ Siesta de día", cls: "warn" },
    { value: "afternoon", label: "🌤️ Siesta de tarde", cls: "accent" },
    { value: "night", label: "🌙 Sueño de noche", cls: "good" }
  ];
  function periodInfo(v) { return PERIODS.find((p) => p.value === v) || PERIODS[2]; }

  function sleep() {
    const s = Store.get();
    if (!s.sleep || typeof s.sleep !== "object") s.sleep = {};
    if (!Array.isArray(s.sleep.log)) s.sleep.log = [];
    return s.sleep;
  }
  function log() { return sleep().log; }

  function r1(x) { return Math.round(x * 10) / 10; }

  // horas entre "HH:MM" de inicio y fin, soportando que el fin caiga al
  // día siguiente (ej. dormir 23:00 -> despertar 07:00 = 8 horas)
  function calcHours(start, end) {
    const [sh, sm] = (start || "0:0").split(":").map(Number);
    const [eh, em] = (end || "0:0").split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60; // cruzó la medianoche
    return r1(mins / 60);
  }

  // ---------------- Guardar / editar / eliminar ----------------
  function addEntry(data, existing) {
    const hours = calcHours(data.start, data.end);
    if (existing) {
      existing.date = data.date; existing.period = data.period;
      existing.start = data.start; existing.end = data.end;
      existing.hours = hours; existing.notes = data.notes || "";
      Store.commit();
      return existing;
    }
    const entry = {
      id: Store.uid(), date: data.date, period: data.period,
      start: data.start, end: data.end, hours,
      notes: data.notes || "", xpEarned: XP_PER_LOG
    };
    log().push(entry);
    Store.commit();
    Gami.award(XP_PER_LOG, "Sueño registrado 🌙");
    return entry;
  }
  function removeEntry(entry) {
    const arr = log(); const i = arr.indexOf(entry);
    if (i >= 0) arr.splice(i, 1);
    if (entry.xpEarned) Gami.remove(entry.xpEarned); else Store.commit();
  }

  // ---------------- Totales por día / rango ----------------
  function dayTotal(key) {
    return log().filter((e) => e.date === key).reduce((s, e) => s + e.hours, 0);
  }
  function hasLog(key) { return log().some((e) => e.date === key); }

  function rangeSeries(period) {
    // devuelve {labels, values} de horas de sueño totales por día
    let days;
    if (period === "weekly") days = DateUtil.lastNDays(7);
    else if (period === "monthly") days = DateUtil.lastNDays(30);
    else days = [today()]; // daily: solo hoy, se detalla por entrada
    return {
      labels: days.map((d) => period === "monthly" ? DateUtil.parse(d).getDate() + "" : DateUtil.weekday(d)),
      values: days.map((d) => r1(dayTotal(d)))
    };
  }

  // ---------------- Formulario de registro ----------------
  function openForm(existing, presetDate) {
    const dateI = el("input", { class: "input", type: "date", value: existing ? existing.date : (presetDate || today()), max: today() });
    const startI = el("input", { class: "input", type: "time", value: existing ? existing.start : "22:00" });
    const endI = el("input", { class: "input", type: "time", value: existing ? existing.end : "06:00" });
    const preview = el("div", { class: "fs-12 text-faint mt-8" });
    function paintPreview() {
      const h = calcHours(startI.value, endI.value);
      preview.textContent = "≈ " + h + " horas de sueño" + (h > 0 && (endI.value < startI.value) ? " (cruza a la madrugada)" : "");
    }
    [startI, endI].forEach((i) => i.addEventListener("input", paintPreview));

    const periodSel = el("select", { class: "select" }, PERIODS.map((p) => {
      const o = el("option", { value: p.value, text: p.label });
      if ((existing ? existing.period : "night") === p.value) o.setAttribute("selected", "");
      return o;
    }));
    const notesI = el("textarea", { class: "textarea", placeholder: "Ej. Me desperté varias veces, dormí con ruido, tomé café antes de dormir…" });
    notesI.value = existing ? (existing.notes || "") : "";

    const body = el("div", {}, [
      el("div", { class: "field" }, [el("label", { text: "Fecha" }), dateI]),
      el("div", { class: "field" }, [el("label", { text: "¿Cuándo dormiste?" }), periodSel]),
      el("div", { class: "row" }, [
        el("div", { class: "field" }, [el("label", { text: "Hora de inicio" }), startI]),
        el("div", { class: "field" }, [el("label", { text: "Hora de fin" }), endI])
      ]),
      preview,
      el("div", { class: "field mt-16" }, [el("label", { text: "📝 Notas (opcional)" }), notesI]),
      el("button", { class: "btn primary block mt-8", html: existing ? "💾 Guardar cambios" : "🌙 Registrar sueño", onclick: () => {
        if (!dateI.value || !startI.value || !endI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Completa fecha, inicio y fin." }); return; }
        const data = { date: dateI.value, period: periodSel.value, start: startI.value, end: endI.value, notes: notesI.value };
        const e = addEntry(data, existing);
        Audio.play(existing ? "tap" : "levelup");
        toast({ icon: "🌙", title: existing ? "Registro actualizado" : "Sueño registrado", msg: e.hours + " horas · +" + (existing ? 0 : XP_PER_LOG) + " XP" });
        UI.closeModal();
        render(document.getElementById("view-sleep"));
      } })
    ]);
    UI.openModal(existing ? "✏️ Editar registro de sueño" : "🌙 Nuevo registro de sueño", body);
    paintPreview();
  }

  // ---------------- Historial ----------------
  function entryRow(e, onChange) {
    const p = periodInfo(e.period);
    const dLbl = DateUtil.parse(e.date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl + " · " + e.start + " → " + e.end }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip " + p.cls, text: p.label }),
          el("span", { class: "chip warn", text: e.hours + " h" }),
          e.notes ? el("span", { class: "text-faint fs-12", text: "📝 " + e.notes }) : null
        ])
      ]),
      el("button", { class: "icon-btn", html: "✏️", title: "Editar", onclick: () => openForm(e) }),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar registro", "¿Eliminar el registro de sueño del " + dLbl + "?", () => {
          removeEntry(e); Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); onChange();
        }, "Eliminar");
      } })
    ]);
  }

  function openHistory() {
    const list = log().slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const body = el("div", {});
    if (!list.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🌙" }), el("div", { text: "Aún no tienes registros de sueño." })]));
    } else {
      list.forEach((e) => body.appendChild(entryRow(e, openHistory)));
    }
    UI.openModal("📖 Historial de sueño (" + list.length + ")", body);
  }

  // ---------------- Calendario del mes ----------------
  function openDayDetail(key) {
    const items = log().filter((e) => e.date === key).sort((a, b) => a.start.localeCompare(b.start));
    const total = r1(items.reduce((s, e) => s + e.hours, 0));
    const dLbl = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "🌙" }),
        el("div", { class: "txt", html: "Total dormido ese día: <b>" + total + " horas</b>." })
      ])
    ]);
    if (!items.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🌙" }), el("div", { text: "Sin registros este día." })]));
    } else {
      items.forEach((e) => body.appendChild(entryRow(e, () => { UI.closeModal(); openDayDetail(key); })));
    }
    body.appendChild(el("button", { class: "btn primary block mt-16", html: "＋ Registrar sueño de este día", onclick: () => { UI.closeModal(); openForm(null, key); } }));
    UI.openModal("📅 " + dLbl, body);
  }

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
      let cls = "cal-day";
      const label = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
      let tip = label;
      if (key > todayKey) cls += " future";
      else if (hasLog(key)) { cls += " done"; tip += " · " + r1(dayTotal(key)) + " h dormidas"; }
      else { cls += " miss"; tip += " · sin registro"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls + " clickable", title: tip + " · toca para ver/agregar", text: String(d), onclick: () => openDayDetail(key) }));
    }
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px;text-transform:capitalize" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Calendario · " + monthLabel]),
        el("div", { class: "flex gap-8 fs-12" }, [
          el("span", { class: "chip good", text: "● Con registro" }),
          el("span", { class: "chip bad", text: "● Sin registro" })
        ])
      ]),
      grid
    ]);
  }

  // ---------------- Gráfica con vista diaria/semanal/mensual ----------------
  let chartMode = "weekly"; // "daily" | "weekly" | "monthly"

  function buildChartCard(container) {
    function segBtn(mode, label) {
      const b = el("button", { text: label, onclick: () => { chartMode = mode; Audio.play("tab"); render(container); } });
      if (chartMode === mode) b.classList.add("on");
      return b;
    }
    const card = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Horas de sueño"]),
        el("div", { class: "seg" }, [segBtn("daily", "Diario"), segBtn("weekly", "Semanal"), segBtn("monthly", "Mensual")])
      ])
    ]);

    if (chartMode === "daily") {
      const items = log().filter((e) => e.date === today()).sort((a, b) => a.start.localeCompare(b.start));
      if (!items.length) {
        card.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🌙" }), el("div", { text: "Aún no registras sueño hoy." })]));
      } else {
        const cv = el("canvas");
        card.appendChild(el("div", { class: "chart-box" }, [cv]));
        setTimeout(() => Charts.bars(cv, {
          labels: items.map((e) => periodInfo(e.period).label.slice(0, 2)),
          series: [{ values: items.map((e) => e.hours), color: "--accent" }]
        }, { height: 170 }), 30);
        card.appendChild(el("div", { class: "fs-12 text-faint mt-8", text: "Total hoy: " + r1(items.reduce((s, e) => s + e.hours, 0)) + " horas en " + items.length + " registro(s)." }));
      }
    } else {
      const data = rangeSeries(chartMode);
      const cv = el("canvas");
      card.appendChild(el("div", { class: "chart-box" }, [cv]));
      setTimeout(() => Charts.bars(cv, { labels: data.labels, series: [{ values: data.values, color: "--good" }] }, { height: 170 }), 30);
      const avg = data.values.length ? r1(data.values.reduce((a, b) => a + b, 0) / data.values.length) : 0;
      card.appendChild(el("div", { class: "fs-12 text-faint mt-8", text: "Promedio " + (chartMode === "weekly" ? "de los últimos 7 días" : "de los últimos 30 días") + ": " + avg + " horas/noche." }));
    }
    return card;
  }

  // ---------------- Render principal ----------------
  function render(container) {
    container.innerHTML = "";
    const todayItems = log().filter((e) => e.date === today());
    const todayHours = r1(todayItems.reduce((s, e) => s + e.hours, 0));
    const last7 = rangeSeries("weekly").values;
    const avg7 = last7.length ? r1(last7.reduce((a, b) => a + b, 0) / last7.length) : 0;

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("moon"), "Sueño"]),
        el("p", { class: "view-desc", text: "Registra tus horas de sueño, revisa tu historial y tu progreso." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Historial" }),
        el("button", { class: "btn primary", onclick: () => openForm(), html: "🌙 Registrar sueño" })
      ])
    ]));

    container.appendChild(el("div", { class: "grid cols-3 mb-16" }, [
      kpi("Sueño hoy", todayHours + " h", todayItems.length + " registro(s)", "accent"),
      kpi("Promedio 7 días", avg7 + " h", "por noche", "good"),
      kpi("Total registros", log().length + "", "acumulados", "warn")
    ]));

    container.appendChild(buildChartCard(container));
    container.appendChild(buildCalendar());

    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Sueño de hoy"]),
        el("button", { class: "btn sm", html: "📖 Ver historial", onclick: openHistory })
      ])
    ]);
    if (!todayItems.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "🌙" }), el("div", { text: "Aún no registras sueño hoy." })]));
    } else {
      todayItems.slice().reverse().forEach((e) => listCard.appendChild(entryRow(e, () => render(container))));
    }
    container.appendChild(listCard);
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Sleep = { render, dayTotal };
})();
