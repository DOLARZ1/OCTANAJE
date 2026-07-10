/* =====================================================================
   NEXUS · Módulo Entrenamientos
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  // Ícono SVG a medida: misil estallando para Calistenia
  const CALISTENIA_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="14,4 15.3,7.75 19.2,7 16.6,10 19.2,13 15.3,12.25 14,16 12.7,12.25 8.8,13 11.4,10 8.8,7 12.7,7.75" fill="currentColor" stroke="none"/>' + /* explosión */
    '<path d="M3 19 L8.6 13.4" stroke-width="2.4"/>' +   /* cuerpo del misil */
    '<path d="M2.2 20.4 L4.6 18"/>' +                    /* estela 1 */
    '<path d="M4 21.2 L6.2 19"/>' +                      /* estela 2 */
    '</svg>';

  const TYPES = [
    { value: "fuerza", name: "Fuerza", icon: "🏋️" },
    { value: "cardio", name: "Cardio", icon: "🏃" },
    { value: "hiit", name: "HIIT", icon: "⚡" },
    { value: "crossfit", name: "Crossfit", icon: "🔥" },
    { value: "calistenia", name: "Calistenia", icon: "🧗", svg: CALISTENIA_SVG },
    { value: "yoga", name: "Yoga", icon: "🧘" },
    { value: "deporte", name: "Deporte", icon: "⚽" },
    { value: "otro", name: "Otro", icon: "💪" }
  ];
  const TYPE_ICON = {};
  TYPES.forEach((t) => { TYPE_ICON[t.value] = t.icon; });

  // devuelve un nodo con el ícono del tipo (SVG a medida o emoji)
  function typeIconNode(type) {
    const t = TYPES.find((x) => x.value === type);
    if (t && t.svg) return el("span", { class: "tico-svg", html: t.svg });
    return el("span", { style: "font-size:22px", text: (t && t.icon) || "💪" });
  }

  function workouts() { return Store.get().workouts; }

  function add() {
    const body = UI.form([
      { name: "name", label: "Nombre de la sesión", placeholder: "Pecho y tríceps", required: true },
      { name: "type", label: "Tipo", type: "iconpick", value: "fuerza", options: TYPES.map((t) => ({ value: t.value, label: t.name, icon: t.icon, svg: t.svg })) },
      { type: "row", fields: [
        { name: "date", label: "Fecha", type: "date", value: DateUtil.todayKey(), required: true },
        { name: "duration", label: "Duración (min)", type: "number", min: 0, placeholder: "45", required: true }
      ]},
      { type: "row", fields: [
        { name: "calories", label: "Calorías (aprox)", type: "number", min: 0, placeholder: "350" },
        { name: "volume", label: "Volumen / distancia", placeholder: "5000 kg · 5 km" }
      ]},
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
          typeIconNode(w.type),
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
