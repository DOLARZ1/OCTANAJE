/* =====================================================================
   NEXUS · Módulo Entrenamientos
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const TYPES = [
    { value: "fuerza", label: "🏋️ Fuerza" },
    { value: "cardio", label: "🏃 Cardio" },
    { value: "hiit", label: "⚡ HIIT" },
    { value: "yoga", label: "🧘 Yoga / Movilidad" },
    { value: "deporte", label: "⚽ Deporte" },
    { value: "otro", label: "💪 Otro" }
  ];
  const TYPE_ICON = { fuerza: "🏋️", cardio: "🏃", hiit: "⚡", yoga: "🧘", deporte: "⚽", otro: "💪" };

  function workouts() { return Store.get().workouts; }

  function add() {
    const body = UI.form([
      { name: "name", label: "Nombre de la sesión", placeholder: "Pecho y tríceps", required: true },
      { type: "row", fields: [
        { name: "type", label: "Tipo", type: "select", options: TYPES, value: "fuerza" },
        { name: "date", label: "Fecha", type: "date", value: DateUtil.todayKey(), required: true }
      ]},
      { type: "row", fields: [
        { name: "duration", label: "Duración (min)", type: "number", min: 0, placeholder: "45", required: true },
        { name: "calories", label: "Calorías (aprox)", type: "number", min: 0, placeholder: "350" }
      ]},
      { name: "volume", label: "Volumen / distancia (opcional)", placeholder: "5200 kg · o · 5 km" },
      { name: "notes", label: "Notas", type: "textarea", placeholder: "Sensaciones, PRs, etc." }
    ], (data) => {
      const dur = Number(data.duration) || 0;
      if (dur <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Indica la duración" }); return; }
      workouts().push({ id: Store.uid(), name: data.name, type: data.type, date: data.date, duration: dur, calories: Number(data.calories) || 0, volume: data.volume, notes: data.notes });
      Store.commit();
      Audio.play("complete");
      const xp = Math.min(30, 10 + Math.round(dur / 5));
      Gami.award(xp, "Entrenamiento registrado 💪");
      UI.closeModal();
      render(document.getElementById("view-workouts"));
      N.App && N.App.refreshTop();
    }, "Registrar entrenamiento");
    UI.openModal("Nuevo entrenamiento", body);
  }

  function remove(w) {
    const arr = workouts(); arr.splice(arr.indexOf(w), 1);
    Store.commit(); Audio.play("delete");
    render(document.getElementById("view-workouts"));
    N.App && N.App.refreshTop();
  }

  // ---------- stats ----------
  function streak() {
    const dates = new Set(workouts().map((w) => w.date));
    let s = 0, day = DateUtil.todayKey();
    if (!dates.has(day)) day = DateUtil.addDays(day, -1);
    while (dates.has(day)) { s++; day = DateUtil.addDays(day, -1); }
    return s;
  }
  function weekMinutes() {
    const days = DateUtil.lastNDays(7);
    return { labels: days.map((d) => DateUtil.weekday(d)), values: days.map((d) => workouts().filter((w) => w.date === d).reduce((s, w) => s + w.duration, 0)) };
  }
  function stats() {
    const arr = workouts();
    const mk = DateUtil.monthKey();
    const monthSessions = arr.filter((w) => w.date.slice(0, 7) === mk);
    return {
      total: arr.length,
      monthCount: monthSessions.length,
      monthMinutes: monthSessions.reduce((s, w) => s + w.duration, 0),
      monthCalories: monthSessions.reduce((s, w) => s + w.calories, 0),
      streak: streak()
    };
  }

  function render(container) {
    container.innerHTML = "";
    const st = stats();

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "⚡" }), "Entrenamientos"]),
        el("p", { class: "view-desc", text: "Registra tus sesiones y observa tu progreso físico." })
      ]),
      el("button", { class: "btn primary", onclick: add, html: "＋ Registrar sesión" })
    ]));

    container.appendChild(el("div", { class: "grid cols-4 mb-16" }, [
      kpi("Racha", st.streak + (st.streak === 1 ? " día" : " días"), "🔥 constancia", "warn"),
      kpi("Este mes", st.monthCount + "", "sesiones", "accent"),
      kpi("Minutos", fmt.num(st.monthMinutes), "este mes", "accent"),
      kpi("Calorías", fmt.num(st.monthCalories), "quemadas", "good")
    ]));

    // gráfica minutos por día
    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Minutos entrenados · últimos 7 días"])])
    ]);
    const cv = el("canvas");
    chartCard.appendChild(el("div", { class: "chart-box" }, [cv]));
    container.appendChild(chartCard);
    setTimeout(() => Charts.bars(cv, { labels: weekMinutes().labels, series: [{ values: weekMinutes().values, color: "--accent-2" }] }, { height: 170 }), 30);

    // historial
    const arr = workouts().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Historial"])])
    ]);
    if (!arr.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "⚡" }), el("div", { text: "Sin entrenamientos. ¡Registra el primero!" })]));
    } else {
      arr.slice(0, 20).forEach((w) => {
        listCard.appendChild(el("div", { class: "item" }, [
          el("div", { style: "font-size:22px", text: TYPE_ICON[w.type] || "💪" }),
          el("div", { class: "item-main" }, [
            el("div", { class: "item-title", text: w.name }),
            el("div", { class: "item-meta" }, [
              el("span", { text: DateUtil.label(w.date) }),
              el("span", { class: "chip accent", text: w.duration + " min" }),
              w.calories ? el("span", { class: "chip", text: w.calories + " kcal" }) : null,
              w.volume ? el("span", { class: "text-faint fs-12", text: w.volume }) : null
            ])
          ]),
          el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => remove(w) })
        ]));
      });
    }
    container.appendChild(listCard);
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Workouts = { render, stats, weekMinutes, streak };
})();
