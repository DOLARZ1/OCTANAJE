/* =====================================================================
   NEXUS · Módulo Hábitos
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const ICONS = ["✦", "💧", "📚", "🏃", "🧘", "🥗", "😴", "💊", "🎯", "🎨", "🎸", "☀️", "🚭", "🧠"];

  function habits() { return Store.get().habits; }

  // racha de un hábito
  function streak(h) {
    let s = 0, day = DateUtil.todayKey();
    if (!h.history[day]) day = DateUtil.addDays(day, -1);
    while (h.history[day]) { s++; day = DateUtil.addDays(day, -1); }
    return s;
  }
  function bestStreak(h) {
    const dates = Object.keys(h.history).filter((k) => h.history[k]).sort();
    let best = 0, cur = 0, prev = null;
    dates.forEach((d) => {
      if (prev && DateUtil.diffDays(d, prev) === 1) cur++; else cur = 1;
      if (cur > best) best = cur;
      prev = d;
    });
    return best;
  }
  function doneToday(h) { return !!h.history[DateUtil.todayKey()]; }
  function completion30(h) {
    const days = DateUtil.lastNDays(30);
    const done = days.filter((d) => h.history[d]).length;
    return Math.round((done / 30) * 100);
  }

  function toggle(h) {
    const today = DateUtil.todayKey();
    if (h.history[today]) {
      delete h.history[today];
      Audio.play("tap");
      Gami.remove(12);
      Store.commit();
    } else {
      h.history[today] = true;
      Audio.play("complete");
      const bonus = streak(h) >= 7 ? 6 : 0;
      Gami.award(12 + bonus, bonus ? "Hábito + racha 🔥" : "Hábito completado");
    }
    render(document.getElementById("view-habits"));
    N.App && N.App.refreshTop();
  }

  function addOrEdit(existing) {
    const body = UI.form([
      { name: "name", label: "Nombre del hábito", value: existing ? existing.name : "", placeholder: "Beber 2L de agua", required: true },
      { name: "icon", label: "Ícono", type: "select", value: existing ? existing.icon : "✦", options: ICONS },
      { name: "target", label: "Meta diaria (opcional, texto)", value: existing ? existing.target || "" : "", placeholder: "Ej: 8 vasos" }
    ], (data) => {
      if (existing) {
        existing.name = data.name; existing.icon = data.icon; existing.target = data.target;
        toast({ icon: "✏️", msg: "Hábito actualizado" });
      } else {
        habits().push({ id: Store.uid(), name: data.name, icon: data.icon, target: data.target, history: {}, created: DateUtil.todayKey() });
        Audio.play("add");
        toast({ icon: "✦", title: "Nuevo hábito", msg: data.name });
        Gami.award(5, "Nuevo hábito creado");
      }
      Store.commit();
      UI.closeModal();
      render(document.getElementById("view-habits"));
      N.App && N.App.refreshTop();
    }, existing ? "Guardar cambios" : "Crear hábito");
    UI.openModal(existing ? "Editar hábito" : "Nuevo hábito", body);
  }

  function remove(h) {
    UI.confirmBox("Eliminar hábito", `¿Eliminar "${h.name}"? Se perderá su historial.`, () => {
      const arr = habits();
      arr.splice(arr.indexOf(h), 1);
      Store.commit();
      Audio.play("delete");
      render(document.getElementById("view-habits"));
    }, "Eliminar");
  }

  // ---------- stats para dashboard ----------
  function todayProgress() {
    const arr = habits();
    if (!arr.length) return { done: 0, total: 0, pct: 0 };
    const done = arr.filter(doneToday).length;
    return { done, total: arr.length, pct: Math.round((done / arr.length) * 100) };
  }
  function weeklySeries() {
    const days = DateUtil.lastNDays(7);
    return {
      labels: days.map((d) => DateUtil.weekday(d)),
      values: days.map((d) => habits().filter((h) => h.history[d]).length)
    };
  }

  function render(container) {
    const arr = habits();
    const prog = todayProgress();
    container.innerHTML = "";

    const head = el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "✦" }), "Hábitos"]),
        el("p", { class: "view-desc", text: "Construye rutinas, mantén tu racha y suma XP cada día." })
      ]),
      el("button", { class: "btn primary", onclick: () => addOrEdit(null) }, [el("span", { text: "＋" }), "Nuevo hábito"])
    ]);
    container.appendChild(head);

    // resumen del día
    const summary = el("div", { class: "grid cols-3 mb-16" }, [
      statCard("Hoy", `${prog.done}/${prog.total}`, "completados", "accent"),
      statCard("Cumplimiento", fmt.pct(prog.pct), "del día", prog.pct >= 100 ? "good" : "warn"),
      statCard("Hábitos activos", arr.length + "", "en seguimiento", "accent")
    ]);
    container.appendChild(summary);

    // gráfica semanal
    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Hábitos completados · últimos 7 días"])])
    ]);
    const cv = el("canvas");
    const box = el("div", { class: "chart-box" }, [cv]);
    chartCard.appendChild(box);
    container.appendChild(chartCard);
    setTimeout(() => Charts.bars(cv, { labels: weeklySeries().labels, series: [{ values: weeklySeries().values, color: "--accent" }] }, { height: 170 }), 30);

    // lista
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

    // heatmap 30 días
    const heat = el("div", { class: "heat mt-8" });
    DateUtil.lastNDays(35).forEach((d) => {
      const cell = el("i", { title: DateUtil.label(d) });
      if (h.history[d]) cell.classList.add("l3");
      heat.appendChild(cell);
    });

    const card = el("div", { class: "card" }, [
      el("div", { class: "flex items-center gap-12" }, [
        el("button", {
          class: "check" + (done ? " on" : ""),
          title: done ? "Marcar como no hecho" : "Marcar hecho hoy",
          onclick: () => toggle(h),
          html: done ? "✓" : ""
        }),
        el("div", { class: "item-main" }, [
          el("div", { class: "item-title" }, [el("span", { text: h.icon + " " }), h.name]),
          el("div", { class: "item-meta" }, [
            el("span", { class: "chip warn", html: "🔥 " + st + " día" + (st === 1 ? "" : "s") }),
            el("span", { class: "chip", text: "Récord " + bestStreak(h) }),
            h.target ? el("span", { class: "text-faint fs-12", text: h.target }) : null
          ])
        ]),
        el("div", { class: "flex gap-8" }, [
          el("button", { class: "icon-btn", title: "Editar", onclick: () => addOrEdit(h), html: "✏️" }),
          el("button", { class: "icon-btn", title: "Eliminar", onclick: () => remove(h), html: "🗑️" })
        ])
      ]),
      el("div", { class: "flex items-center justify-between mt-16", style: "margin-bottom:6px" }, [
        el("span", { class: "fs-12 text-dim", text: "Cumplimiento 30 días" }),
        el("span", { class: "fs-12 fw-700 text-accent", text: fmt.pct(comp) })
      ]),
      el("div", { class: "progress" + (comp >= 70 ? " good" : "") }, [el("span", { style: `width:${comp}%` })]),
      heat
    ]);
    return card;
  }

  N.Habits = { render, todayProgress, weeklySeries, streak };
})();
