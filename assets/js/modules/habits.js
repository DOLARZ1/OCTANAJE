/* =====================================================================
   OCTANAJE · Módulo Hábitos
   Soporta hábitos simples (1 check) y hábitos con META DIARIA de N veces
   (se rellenan N cuadritos; el hábito se completa solo al llenarlos todos).
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const ICONS = [
    // generales
    "✦", "✅", "⭐", "🌟", "🔥", "⚡", "❤️", "☀️", "🌙", "⏰",
    // salud / ejercicio
    "💪", "🏃", "🚴", "🏋️", "🧘", "🚶", "🥗", "💧", "😴", "💊", "🩺", "🦷", "🚿", "🚭",
    // mente / estudio
    "📚", "🧠", "📝", "🎓", "💡", "✍️", "🙏",
    // trading / dinero
    "📈", "📉", "📊", "💹", "🕯️", "💲", "💰", "💵", "💸", "🪙", "🏦", "💳", "🤑", "💱",
    // metas
    "🎯", "🏆", "🥇", "🏁", "🚀",
    // vacaciones / viajes
    "🏖️", "🏝️", "🌴", "✈️", "⛱️", "🧳", "🗺️", "🏔️", "🏕️", "🚗",
    // calaveras
    "💀", "☠️",
    // hobbies / vida
    "🎨", "🎮", "📷", "🍳", "☕", "🧹", "🌱", "🌍", "🛌", "🧴",
    // comida
    "🍎", "🍌", "🫐", "🥑", "🥦", "🥕", "🍗", "🍚", "🍞", "🍳", "🥗", "🍕", "🍔", "🍫", "🍩", "🥤", "🥛", "🍺",
    // mascotas
    "🐶", "🐱", "🐰", "🐹", "🐦", "🐠", "🐢", "🐾",
    // trabajo / oficina
    "💼", "💻", "🖥️", "⌨️", "🖱️", "📅", "📎", "🖊️", "📞", "📧", "🗂️", "📌", "📁",
    // música / instrumentos
    "🎵", "🎧", "🎸", "🎹", "🥁", "🎺", "🎷", "🎻", "🎤", "🎼"
  ];
  const MAX_BOXES = 50;

  function habits() { return Store.get().habits; }
  const today = () => DateUtil.todayKey();

  // meta diaria (nº de veces). 1 = hábito simple
  function tgt(h) { return Math.max(1, Math.min(MAX_BOXES, parseInt(h.count, 10) || 1)); }
  // cantidad hecha en un día (compatible con formato antiguo: true = completo)
  function dayVal(h, key) {
    const v = h.history[key];
    if (v === true) return tgt(h);
    if (typeof v === "number") return v;
    return 0;
  }
  function doneOn(h, key) { return dayVal(h, key) >= tgt(h); }
  function doneToday(h) { return doneOn(h, today()); }
  function pctToday(h) { return Math.round((dayVal(h, today()) / tgt(h)) * 100); }

  // ---------- programación de días activos (0=Dom..6=Sáb) ----------
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  function activeDays(h) { return (Array.isArray(h.days) && h.days.length) ? h.days : ALL_DAYS; }
  function activeSet(h) { return new Set(activeDays(h)); }
  function activeOn(h, key) { return activeSet(h).has(DateUtil.parse(key).getDay()); }
  function activeToday(h) { return activeOn(h, today()); }
  function daysLabel(h) {
    const s = activeSet(h);
    if (s.size >= 7) return "Todos los días";
    if (s.size === 5 && [1, 2, 3, 4, 5].every((d) => s.has(d))) return "Lun a Vie";
    if (s.size === 2 && s.has(0) && s.has(6)) return "Fin de semana";
    return [[1, "L"], [2, "M"], [3, "M"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]].filter((x) => s.has(x[0])).map((x) => x[1]).join(" ");
  }

  // racha (días activos consecutivos completados; se saltan los días de descanso)
  function streak(h) {
    const set = activeSet(h);
    let s = 0, day = today();
    if (set.has(DateUtil.parse(day).getDay()) && !doneOn(h, day)) day = DateUtil.addDays(day, -1);
    for (let i = 0; i < 400; i++) {
      const wd = DateUtil.parse(day).getDay();
      if (set.has(wd)) { if (doneOn(h, day)) s++; else break; }
      day = DateUtil.addDays(day, -1);
    }
    return s;
  }
  function bestStreak(h) {
    const set = activeSet(h);
    const done = Object.keys(h.history).filter((k) => doneOn(h, k)).sort();
    if (!done.length) return 0;
    let day = done[0]; const end = today(); let cur = 0, best = 0;
    for (let i = 0; i < 4000 && day <= end; i++) {
      const wd = DateUtil.parse(day).getDay();
      if (set.has(wd)) { if (doneOn(h, day)) { cur++; if (cur > best) best = cur; } else cur = 0; }
      day = DateUtil.addDays(day, 1);
    }
    return best;
  }
  function completion30(h) {
    const set = activeSet(h);
    const active = DateUtil.lastNDays(30).filter((d) => set.has(DateUtil.parse(d).getDay()));
    if (!active.length) return 0;
    const done = active.filter((d) => doneOn(h, d)).length;
    return Math.round((done / active.length) * 100);
  }

  // fija la cantidad de hoy y gestiona XP según se complete o no el día
  function applyDay(h, n) {
    const key = today();
    const target = tgt(h);
    n = Math.max(0, Math.min(target, n));
    const was = doneToday(h);
    if (target === 1) { if (n >= 1) h.history[key] = true; else delete h.history[key]; }
    else { if (n > 0) h.history[key] = n; else delete h.history[key]; }
    const now = doneToday(h);

    if (now && !was) {
      Audio.play("complete");
      const bonus = streak(h) >= 7 ? 6 : 0;
      const gain = 12 + bonus;
      h.xpEarned = (h.xpEarned || 0) + gain;
      Gami.award(gain, bonus ? "Hábito + racha 🔥" : "Hábito completado");
    } else if (!now && was) {
      Audio.play("tap");
      h.xpEarned = Math.max(0, (h.xpEarned || 0) - 12);
      Gami.remove(12);
      Store.commit();
    } else {
      Audio.play(n > 0 ? "coin" : "tap");
      Store.commit();
    }
    render(document.getElementById("view-habits"));
    N.App && N.App.refreshTop();
  }

  function toggleCheck(h) { applyDay(h, doneToday(h) ? 0 : tgt(h)); }
  function setBox(h, i) {
    const cur = dayVal(h, today());
    applyDay(h, (i + 1 <= cur) ? i : i + 1); // clic en lleno = quitar desde ahí; en vacío = llenar hasta ahí
  }

  function addOrEdit(existing) {
    const formEl = UI.form([
      { name: "name", label: "Nombre del hábito", value: existing ? existing.name : "", placeholder: "Beber agua", required: true },
      { name: "icon", label: "Ícono", type: "select", value: existing ? existing.icon : "✦", options: ICONS },
      { type: "row", fields: [
        { name: "count", label: "Meta diaria (nº de veces)", type: "number", min: 1, step: 1, value: existing ? tgt(existing) : 1 },
        { name: "unit", label: "Unidad (opcional)", value: existing ? existing.unit || "" : "", placeholder: "vasos, páginas…" }
      ]},
      { name: "days", label: "Días activos", type: "weekdays", value: existing ? activeDays(existing) : ALL_DAYS }
    ], (data) => {
      const cnt = Math.max(1, Math.min(MAX_BOXES, parseInt(data.count, 10) || 1));
      let days = typeof data.days === "string" ? data.days.split(",").filter((x) => x !== "").map(Number) : (Array.isArray(data.days) ? data.days : []);
      if (!days.length) days = ALL_DAYS.slice();
      if (existing) {
        existing.name = data.name; existing.icon = data.icon; existing.count = cnt; existing.unit = data.unit; existing.days = days;
        delete existing.target;
        toast({ icon: "✏️", msg: "Hábito actualizado" });
      } else {
        habits().push({ id: Store.uid(), name: data.name, icon: data.icon, count: cnt, unit: data.unit, days: days, history: {}, created: today(), xpEarned: 5 });
        Audio.play("add");
        toast({ icon: "✦", title: "Nuevo hábito", msg: data.name });
        Gami.award(5, "Nuevo hábito creado");
      }
      Store.commit();
      UI.closeModal();
      render(document.getElementById("view-habits"));
      N.App && N.App.refreshTop();
    }, existing ? "Guardar cambios" : "Crear hábito");

    const wrap = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "🔢" }),
        el("div", { class: "txt", html: "Si la <b>meta diaria</b> es mayor que 1, aparecerán esos cuadritos para rellenar durante el día (p. ej. 8 vasos = 8 cuadritos). El hábito solo se completa al llenarlos <b>todos</b>." })
      ]),
      formEl
    ]);
    UI.openModal(existing ? "Editar hábito" : "Nuevo hábito", wrap);
  }

  function remove(h) {
    UI.confirmBox("Eliminar hábito", `¿Eliminar "${h.name}"? Se perderá su historial.`, () => {
      const arr = habits();
      arr.splice(arr.indexOf(h), 1);
      Audio.play("delete");
      if (h.xpEarned) Gami.remove(h.xpEarned); else Store.commit(); // devolver la XP ganada
      render(document.getElementById("view-habits"));
      N.App && N.App.refreshTop();
    }, "Eliminar");
  }

  function addToCalendar(h) {
    N.CalExport.open({
      title: h.name,
      details: "Hábito diario en OCTANAJE" + (tgt(h) > 1 ? " · meta " + tgt(h) + " " + (h.unit || "veces") : ""),
      dateKey: today(),
      recur: "RRULE:FREQ=DAILY"
    });
  }

  // ---------- stats para dashboard ----------
  function todayProgress() {
    const arr = habits().filter(activeToday); // solo los programados para hoy
    if (!arr.length) return { done: 0, total: 0, pct: 0 };
    const done = arr.filter(doneToday).length;
    return { done, total: arr.length, pct: Math.round((done / arr.length) * 100) };
  }
  function weeklySeries() {
    const days = DateUtil.lastNDays(7);
    return {
      labels: days.map((d) => DateUtil.weekday(d)),
      values: days.map((d) => habits().filter((h) => doneOn(h, d)).length)
    };
  }

  function render(container) {
    const arr = habits();
    const prog = todayProgress();
    container.innerHTML = "";

    const head = el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("clock"), "Hábitos"]),
        el("p", { class: "view-desc", text: "Marca tus cuadritos, mantén tu racha y suma XP cada día." })
      ]),
      el("button", { class: "btn primary", onclick: () => addOrEdit(null) }, [el("span", { text: "＋" }), "Nuevo hábito"])
    ]);
    container.appendChild(head);

    const summary = el("div", { class: "grid cols-3 mb-16" }, [
      statCard("Hoy", `${prog.done}/${prog.total}`, "completados", "accent"),
      statCard("Cumplimiento", fmt.pct(prog.pct), "del día", prog.pct >= 100 ? "good" : "warn"),
      statCard("Hábitos activos", arr.length + "", "en seguimiento", "accent")
    ]);
    container.appendChild(summary);

    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Hábitos completados · últimos 7 días"])])
    ]);
    const cv = el("canvas");
    chartCard.appendChild(el("div", { class: "chart-box" }, [cv]));
    container.appendChild(chartCard);
    setTimeout(() => Charts.bars(cv, { labels: weeklySeries().labels, series: [{ values: weeklySeries().values, color: "--accent" }] }, { height: 170 }), 30);

    if (!arr.length) {
      container.appendChild(el("div", { class: "card" }, [
        el("div", { class: "empty" }, [el("span", { class: "big", text: "✦" }), el("div", { text: "Aún no tienes hábitos. ¡Crea el primero!" })])
      ]));
      return;
    }

    const list = el("div", { class: "grid cols-2" });
    arr.forEach((h) => list.appendChild(habitCard(h)));
    container.appendChild(list);
  }

  function statCard(label, val, sub, cls) {
    return el("div", { class: "card" }, [
      el("div", { class: "kpi" }, [
        el("div", { class: "kpi-lbl", text: label }),
        el("div", { class: "kpi-val " + (cls || ""), text: val }),
        el("div", { class: "kpi-sub", text: sub })
      ])
    ]);
  }

  function habitCard(h) {
    const st = streak(h);
    const done = doneToday(h);
    const comp = completion30(h);
    const target = tgt(h);
    const cur = dayVal(h, today());
    const active = activeToday(h);

    // heatmap 35 días (completo = brillante, parcial = tenue)
    const heat = el("div", { class: "heat mt-8" });
    DateUtil.lastNDays(35).forEach((d) => {
      const cell = el("i", { title: DateUtil.label(d) });
      if (doneOn(h, d)) cell.classList.add("l3");
      else if (dayVal(h, d) > 0) cell.classList.add("l1");
      heat.appendChild(cell);
    });

    const card = el("div", { class: "card" + (active ? "" : " habit-off") }, [
      el("div", { class: "flex items-center gap-12" }, [
        el("button", {
          class: "check" + (done ? " on" : "") + (active ? "" : " check-off"),
          title: !active ? "Hoy descansa" : (done ? "Marcar como no hecho" : "Completar hoy"),
          onclick: () => { if (!active) { Audio.play("tap"); toast({ icon: "💤", msg: "Hoy este hábito descansa (" + daysLabel(h) + ")" }); return; } toggleCheck(h); },
          html: !active ? "💤" : (done ? "✓" : (target > 1 ? String(cur) : ""))
        }),
        el("div", { class: "item-main" }, [
          el("div", { class: "item-title" }, [el("span", { text: h.icon + " " }), h.name]),
          el("div", { class: "item-meta" }, [
            el("span", { class: "chip warn", html: "🔥 " + st + " día" + (st === 1 ? "" : "s") }),
            el("span", { class: "chip", html: "📆 " + daysLabel(h) }),
            !active ? el("span", { class: "chip", text: "💤 hoy descansa" }) : null,
            target > 1 ? el("span", { class: "chip accent", text: "🎯 " + target + " " + (h.unit || "/día") }) : null
          ])
        ]),
        el("div", { class: "flex gap-8" }, [
          el("button", { class: "icon-btn", title: "Recordatorio diario en Google Calendar", onclick: () => addToCalendar(h), html: "📅" }),
          el("button", { class: "icon-btn", title: "Editar", onclick: () => addOrEdit(h), html: "✏️" }),
          el("button", { class: "icon-btn", title: "Eliminar", onclick: () => remove(h), html: "🗑️" })
        ])
      ])
    ]);

    // cuadritos de meta diaria (solo si hoy está activo)
    if (target > 1 && active) {
      const boxes = el("div", { class: "hboxes mt-16" });
      for (let i = 0; i < target; i++) {
        boxes.appendChild(el("button", {
          class: "hbox" + (i < cur ? " on" : ""),
          title: (i + 1) + " de " + target,
          onclick: () => setBox(h, i)
        }));
      }
      card.appendChild(boxes);
      card.appendChild(el("div", { class: "flex items-center justify-between fs-12 mt-8" }, [
        el("span", { class: "text-dim", text: `${cur}/${target} ${h.unit || ""}`.trim() }),
        el("span", { class: "fw-700 " + (cur >= target ? "text-good" : "text-warn"), text: pctToday(h) + "%" })
      ]));
    }

    // cumplimiento 30 días
    card.appendChild(el("div", { class: "flex items-center justify-between mt-16", style: "margin-bottom:6px" }, [
      el("span", { class: "fs-12 text-dim", text: "Cumplimiento 30 días" }),
      el("span", { class: "fs-12 fw-700 text-accent", text: fmt.pct(comp) })
    ]));
    card.appendChild(el("div", { class: "progress" + (comp >= 70 ? " good" : "") }, [el("span", { style: `width:${comp}%` })]));
    card.appendChild(heat);

    return card;
  }

  N.Habits = { render, todayProgress, weeklySeries, streak, activeOn, daysLabel };
})();
