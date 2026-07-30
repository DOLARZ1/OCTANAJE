/* =====================================================================
   OCTANAJE · Módulo Salud (Original + Antropometría Pro Integrada)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  function dayLabelFor(key) { return DateUtil.parse(key).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); }

  // ---------------- DATOS ORIGINALES DE OCTANAJE ----------------
  const ACTIVITY = [
    { value: "sedentary", label: "Sedentario (poco o nulo ejercicio)", factor: 1.2 },
    { value: "light", label: "Ligero (ejercicio 1-3 días/semana)", factor: 1.375 },
    { value: "moderate", label: "Moderado (ejercicio 3-5 días/semana)", factor: 1.55 },
    { value: "active", label: "Activo (ejercicio 6-7 días/semana)", factor: 1.725 },
    { value: "very_active", label: "Muy activo (2x al día / trabajo físico)", factor: 1.9 }
  ];
  function activityLabel(v) { return (ACTIVITY.find((a) => a.value === v) || ACTIVITY[2]).label; }
  function activityFactor(v) { return (ACTIVITY.find((a) => a.value === v) || ACTIVITY[2]).factor; }

  const GOALS = [
    { value: "lose", label: "📉 Bajar de peso" },
    { value: "maintain", label: "⚖️ Mantener mi peso" },
    { value: "gain", label: "📈 Aumentar masa muscular" }
  ];
  function goalLabel(v) { return (GOALS.find((g) => g.value === v) || GOALS[1]).label; }
  const PACE_GENERIC = [
    { value: "slow", label: "🐢 Lento y sostenible" },
    { value: "moderate", label: "🚶 Moderado (recomendado)" },
    { value: "aggressive", label: "🏃 Agresivo" }
  ];
  const PACE_LOSE = [{ value: "slow", kcal: 250 }, { value: "moderate", kcal: 500 }, { value: "aggressive", kcal: 750 }];
  const PACE_GAIN = [{ value: "slow", kcal: 200 }, { value: "moderate", kcal: 350 }, { value: "aggressive", kcal: 500 }];
  function paceKcal(goal, pace) {
    const table = goal === "lose" ? PACE_LOSE : goal === "gain" ? PACE_GAIN : null;
    if (!table) return 0;
    return (table.find((p) => p.value === pace) || table[1]).kcal;
  }

  const IMC_RANGES = [
    { max: 18.5, label: "Bajo peso", cls: "warn", desc: "Por debajo del rango saludable. Considera aumentar tu ingesta calórica de forma controlada." },
    { max: 25, label: "Peso normal", cls: "good", desc: "Dentro del rango saludable. ¡Vas muy bien, sigue así!" },
    { max: 30, label: "Sobrepeso", cls: "warn", desc: "Por encima del rango saludable. Un plan de alimentación y ejercicio puede ayudarte a corregirlo." },
    { max: 35, label: "Obesidad grado I", cls: "bad", desc: "Se recomienda acompañamiento profesional (médico/nutriólogo) además de actividad física." },
    { max: 40, label: "Obesidad grado II", cls: "bad", desc: "Riesgo elevado para la salud. Es importante buscar valoración médica." },
    { max: Infinity, label: "Obesidad grado III", cls: "bad", desc: "Riesgo muy alto para la salud. Se recomienda valoración médica cuanto antes." }
  ];
  function imcClass(imc) { return IMC_RANGES.find((r) => imc < r.max) || IMC_RANGES[IMC_RANGES.length - 1]; }

  function health() {
    const s = Store.get();
    if (!s.health || typeof s.health !== "object") s.health = {};
    if (!s.health.profile || typeof s.health.profile !== "object") {
      s.health.profile = { name: "", sex: "F", age: null, weight: null, height: null, activity: "moderate", goal: "maintain", pace: "moderate", lastCheck: "" };
    }
    if (!Array.isArray(s.health.history)) s.health.history = [];
    if (!Array.isArray(s.health.weights)) s.health.weights = [];
    return s.health;
  }
  function profile() {
    const pr = health().profile;
    if (pr.goal == null) pr.goal = "maintain";
    if (pr.pace == null) pr.pace = "moderate";
    return pr;
  }
  function history() { return health().history; }
  function weights() { return health().weights; }

  function calcIMC(weightKg, heightCm) {
    const h = heightCm / 100;
    if (!weightKg || !h) return 0;
    return weightKg / (h * h);
  }
  function calcGEB(weightKg, heightCm, age, sex) {
    if (!weightKg || !heightCm || !age) return 0;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === "M" ? base + 5 : base - 161;
  }
  function calcGET(geb, activityKey) { return geb * activityFactor(activityKey); }
  function r1(x) { return Math.round(x * 10) / 10; }

  function calcPlan(weightKg, get, geb, goal, pace) {
    goal = goal || "maintain"; pace = pace || "moderate";
    let kcal = get, clamped = false;
    if (goal === "lose") {
      const adj = paceKcal("lose", pace);
      kcal = get - adj;
      const floor = Math.round(geb * 1.2);
      if (kcal < floor) { kcal = floor; clamped = true; }
    } else if (goal === "gain") {
      kcal = get + paceKcal("gain", pace);
    }
    const protPerKg = goal === "lose" ? 2.2 : goal === "gain" ? 2.0 : 1.8;
    const protG = Math.round((weightKg || 0) * protPerKg);
    const protKcal = protG * 4;
    const fatKcal = kcal * 0.25;
    const fatG = Math.round(fatKcal / 9);
    const carbKcal = Math.max(0, kcal - protKcal - fatKcal);
    const carbG = Math.round(carbKcal / 4);
    const adj = goal === "maintain" ? 0 : paceKcal(goal, pace);
    const rateKgWeek = goal === "maintain" ? 0 : r1((adj * 7) / 7700);
    return { kcal: Math.round(kcal), prot: protG, protPerKg, fat: fatG, carb: carbG, rateKgWeek, clamped };
  }

  // ---------------- FUNCIONES DE HISTORIAL ORIGINALES ----------------
  function saveCheck(p, dateKey) {
    const key = dateKey || today();
    const imc = calcIMC(p.weight, p.height);
    const geb = calcGEB(p.weight, p.height, p.age, p.sex);
    const get = calcGET(geb, p.activity);
    const plan = calcPlan(p.weight, get, geb, p.goal, p.pace);
    const entry = {
      id: Store.uid(), date: key,
      name: p.name, weight: p.weight, height: p.height, age: p.age, sex: p.sex, activity: p.activity,
      goal: p.goal, pace: p.pace,
      imc: r1(imc), geb: Math.round(geb), get: Math.round(get),
      planKcal: plan.kcal, planProt: plan.prot, planFat: plan.fat, planCarb: plan.carb
    };
    history().unshift(entry);
    refreshProfileFromLatest();
    Store.commit();
    if(Gami) Gami.award(5, "Revisión de salud registrada 💙");
    return entry;
  }
  function refreshProfileFromLatest() {
    const list = history();
    if (!list.length) return;
    const latest = list.reduce((a, b) => (b.date > a.date ? b : a));
    const prof = profile();
    prof.name = latest.name; prof.sex = latest.sex; prof.age = latest.age;
    prof.weight = latest.weight; prof.height = latest.height; prof.activity = latest.activity;
    prof.goal = latest.goal; prof.pace = latest.pace; prof.lastCheck = latest.date;
  }
  function removeCheck(entry) {
    const arr = history(); const i = arr.indexOf(entry);
    if (i >= 0) arr.splice(i, 1);
    refreshProfileFromLatest();
    Store.commit();
  }
  function hasCheck(key) { return history().some((h) => h.date === key); }
  function checksOnDay(key) { return history().filter((h) => h.date === key); }

  function weightOnDay(key) { return weights().find((w) => w.date === key); }
  function weightsSorted() { return weights().slice().sort((a, b) => a.date.localeCompare(b.date)); }
  function saveWeight(val, dateKey, note) {
    const key = dateKey || today();
    let w = weightOnDay(key);
    if (w) { w.weight = val; w.note = note || ""; }
    else { w = { id: Store.uid(), date: key, weight: val, note: note || "" }; weights().push(w); }
    Store.commit();
    if(Gami) Gami.award(3, "Peso de báscula registrado ⚖️");
    return w;
  }
  function removeWeight(w) {
    const arr = weights(); const i = arr.indexOf(w);
    if (i >= 0) arr.splice(i, 1);
    Store.commit();
  }
  function weightStats() {
    const list = weightsSorted();
    if (!list.length) return null;
    const last = list[list.length - 1];
    const first = list[0];
    const prev = list.length > 1 ? list[list.length - 2] : null;
    let min = list[0], max = list[0];
    list.forEach((w) => { if (w.weight < min.weight) min = w; if (w.weight > max.weight) max = w; });
    return { last, first, prev, min, max, diffFromFirst: r1(last.weight - first.weight), diffFromPrev: prev ? r1(last.weight - prev.weight) : 0 };
  }

  // ---------------- UI ORIGINAL: FORMULARIOS Y MODALES ----------------
  function openWeightForm(presetDate) {
    const dateKey = presetDate || today();
    const isBackdate = dateKey !== today();
    const existing = weightOnDay(dateKey);

    const dateI = el("input", { class: "input", type: "date", value: dateKey, max: today() });
    const weightI = el("input", { class: "input", type: "number", min: 1, step: 0.1, value: existing ? existing.weight : "", placeholder: "Ej. 78.4" });
    const noteI = el("textarea", { class: "textarea", placeholder: "Ej. En ayunas, después de entrenar…", text: existing ? existing.note : "" });

    const submitBtn = el("button", {
      class: "btn primary block mt-8", html: existing ? "💾 Actualizar peso" : "⚖️ Guardar peso",
      onclick: () => {
        const val = Number(weightI.value) || 0;
        if (!val || val <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Escribe un peso válido" }); return; }
        if (!dateI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige una fecha" }); return; }
        const already = weightOnDay(dateI.value);
        saveWeight(val, dateI.value, noteI.value);
        Audio.play(already ? "tap" : "levelup");
        toast({ icon: "⚖️", title: already ? "Peso actualizado" : "Peso guardado", msg: val + " kg · " + dayLabelFor(dateI.value) });
        UI.closeModal();
        // Forzamos que se redibuje la vista ignorando el escudo (pasando un parámetro)
        render(document.getElementById("view-health"), true);
      }
    });

    const banner = isBackdate ? el("div", { class: "insight warn", style: "margin-bottom:14px" }, [
      el("span", { class: "ico", text: "🕐" }),
      el("div", { class: "txt", text: "Este peso se guardará con la fecha que elijas abajo, no forzosamente hoy." })
    ]) : null;

    const body = el("div", {}, [
      banner,
      existing ? el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "ℹ️" }),
        el("div", { class: "txt", text: "Ya registraste un peso ese día (" + existing.weight + " kg). Si guardas, se actualizará." })
      ]) : null,
      el("div", { class: "field" }, [el("label", { text: "Fecha" }), dateI]),
      el("div", { class: "field" }, [el("label", { text: "Peso (kg)" }), weightI]),
      el("div", { class: "field" }, [el("label", { text: "Nota (opcional)" }), noteI]),
      submitBtn
    ]);
    UI.openModal("⚖️ Registrar peso de báscula", body);
  }

  function openWeightHistory() {
    const list = weights().slice().sort((a, b) => b.date.localeCompare(a.date));
    const body = el("div", {});
    if (!list.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "⚖️" }), el("div", { text: "Aún no tienes pesos registrados." })]));
    } else {
      list.forEach((w) => body.appendChild(weightRow(w)));
    }
    UI.openModal("📖 Historial de peso (" + list.length + ")", body);
  }

  function weightRow(w) {
    const dLbl = dayLabelFor(w.date);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: w.weight + " kg · " + dLbl }),
        w.note ? el("div", { class: "item-meta" }, [el("span", { class: "text-faint fs-12", text: "📝 " + w.note })]) : null
      ]),
      el("button", { class: "icon-btn", html: "✏️", title: "Editar", onclick: () => { UI.closeModal(); openWeightForm(w.date); } }),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar peso", "¿Eliminar el peso registrado el " + dLbl + "?", () => {
          removeWeight(w); Audio.play("delete"); toast({ icon: "🗑️", msg: "Peso eliminado" }); openWeightHistory();
        }, "Eliminar");
      } })
    ]);
  }

  function weightCard() {
    const stats = weightStats();
    const head = el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
      el("div", {}, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "⚖️ Peso de báscula"]),
        el("div", { class: "card-sub", text: stats ? weights().length + " registro(s) · último: " + dayLabelFor(stats.last.date) : "Sin registros aún" })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn sm", onclick: openWeightHistory, html: "📖 Historial" }),
        el("button", { class: "btn sm primary", onclick: () => openWeightForm(), html: "⚖️ Registrar peso" })
      ])
    ]);

    if (!stats) {
      return el("div", { class: "card mb-16" }, [
        head,
        el("div", { class: "empty" }, [
          el("span", { class: "big", text: "⚖️" }),
          el("div", { text: "Aún no has registrado pesos de báscula." }),
          el("p", { class: "fs-12 text-faint mt-8", text: "Pésate y guarda tu peso aquí seguido — sin llenar todo el formulario de revisión — para ver tu progreso a lo largo del tiempo." })
        ])
      ]);
    }

    const kpis = el("div", { class: "grid cols-3 mb-16" }, [
      macroCard("Peso actual", stats.last.weight, "kg", "var(--accent)"),
      macroCard("Desde el inicio", (stats.diffFromFirst > 0 ? "+" : "") + stats.diffFromFirst, "kg", stats.diffFromFirst > 0 ? "var(--bad)" : stats.diffFromFirst < 0 ? "var(--good)" : "var(--txt-dim)", "vs. " + stats.first.weight + " kg (" + dayLabelFor(stats.first.date) + ")"),
      macroCard("Último cambio", stats.prev ? ((stats.diffFromPrev > 0 ? "+" : "") + stats.diffFromPrev) : "—", stats.prev ? "kg" : "", stats.diffFromPrev > 0 ? "var(--bad)" : stats.diffFromPrev < 0 ? "var(--good)" : "var(--txt-dim)", stats.prev ? "vs. " + dayLabelFor(stats.prev.date) : "Aún solo hay 1 registro")
    ]);

    const cv = el("canvas");
    const chartWrap = el("div", { class: "chart-box" }, [cv]);
    const series = weightsSorted().slice(-30);
    setTimeout(() => {
      if(Charts) Charts.line(cv, {
        values: series.map((w) => w.weight),
        labels: series.map((w) => DateUtil.parse(w.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }))
      }, { color: "--accent", height: 170 });
    }, 30);

    return el("div", { class: "card mb-16" }, [
      head, kpis,
      el("div", { class: "fs-12 text-faint mb-8", text: "Tendencia de peso (últimos " + series.length + " registros)" }),
      chartWrap,
      el("div", { class: "flex gap-8 mt-8", style: "flex-wrap:wrap" }, [
        el("span", { class: "chip good", text: "Mín: " + stats.min.weight + " kg (" + dayLabelFor(stats.min.date) + ")" }),
        el("span", { class: "chip warn", text: "Máx: " + stats.max.weight + " kg (" + dayLabelFor(stats.max.date) + ")" })
      ])
    ]);
  }

  function openForm(presetDate) {
    const p = profile();
    const dateKey = presetDate || today();
    const isBackdate = dateKey !== today();

    const formNode = UI.form([
      { name: "name", label: "Nombre", value: p.name || "", placeholder: "Tu nombre", required: true },
      { type: "row", fields: [
        { name: "sex", label: "Sexo biológico", type: "select", value: p.sex || "F", options: [
          { value: "F", label: "Femenino" }, { value: "M", label: "Masculino" }
        ]},
        { name: "age", label: "Edad (años)", type: "number", min: 1, max: 120, value: p.age || "", required: true }
      ]},
      { type: "row", fields: [
        { name: "weight", label: "Peso (kg)", type: "number", min: 1, step: 0.1, value: p.weight || "", required: true },
        { name: "height", label: "Estatura (cm)", type: "number", min: 1, step: 0.1, value: p.height || "", required: true }
      ]},
      { name: "activity", label: "Nivel de actividad física", type: "select", value: p.activity || "moderate", options: ACTIVITY.map((a) => ({ value: a.value, label: a.label })) },
      { type: "row", fields: [
        { name: "goal", label: "🎯 Objetivo", type: "select", value: p.goal || "maintain", options: GOALS.map((g) => ({ value: g.value, label: g.label })) },
        { name: "pace", label: "Ritmo (si bajas/subes de peso)", type: "select", value: p.pace || "moderate", options: PACE_GENERIC.map((x) => ({ value: x.value, label: x.label })) }
      ]}
    ], (data) => {
      const payload = {
        name: data.name, sex: data.sex, age: Number(data.age) || 0,
        weight: Number(data.weight) || 0, height: Number(data.height) || 0, activity: data.activity,
        goal: data.goal, pace: data.pace
      };
      if (!payload.weight || !payload.height || !payload.age) {
        Audio.play("error"); toast({ icon: "⚠️", msg: "Completa peso, estatura y edad." }); return;
      }
      saveCheck(payload, dateKey);
      Audio.play("levelup");
      toast({ icon: "💙", title: isBackdate ? "Revisión guardada (" + dayLabelFor(dateKey) + ")" : "Revisión guardada", msg: "IMC: " + r1(calcIMC(payload.weight, payload.height)) });
      UI.closeModal();
      render(document.getElementById("view-health"), true);
    }, "💾 Guardar revisión");

    const banner = isBackdate ? el("div", { class: "insight warn", style: "margin-bottom:14px" }, [
      el("span", { class: "ico", text: "🕐" }),
      el("div", { class: "txt", html: "Esta revisión se guardará con fecha <b>" + dayLabelFor(dateKey) + "</b>, no hoy." })
    ]) : null;

    UI.openModal(isBackdate ? "📋 Revisión de otro día" : "📋 Nueva revisión de salud", el("div", {}, [banner, formNode]));
  }

  function openBackdatePicker() {
    const dateI = el("input", { class: "input", type: "date", value: DateUtil.addDays(today(), -1), max: today() });
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:10px", text: "Elige la fecha de la revisión que quieres registrar (por ejemplo si se te olvidó anotarla a tiempo):" }),
      el("div", { class: "field" }, [el("label", { text: "Fecha" }), dateI]),
      el("button", { class: "btn primary block mt-8", html: "📋 Continuar", onclick: () => {
        if (!dateI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige una fecha" }); return; }
        UI.closeModal();
        openForm(dateI.value);
      } })
    ]);
    UI.openModal("🕐 Revisión de otro día", body);
  }

  function openGoalOnly() {
    const p = profile();
    const body = UI.form([
      { name: "goal", label: "🎯 Objetivo", type: "select", value: p.goal || "maintain", options: GOALS.map((g) => ({ value: g.value, label: g.label })) },
      { name: "pace", label: "Ritmo (si bajas/subes de peso)", type: "select", value: p.pace || "moderate", options: PACE_GENERIC.map((x) => ({ value: x.value, label: x.label })) }
    ], (data) => {
      p.goal = data.goal; p.pace = data.pace;
      Store.commit();
      Audio.play("tap");
      toast({ icon: "🎯", title: "Objetivo actualizado", msg: goalLabel(data.goal) });
      UI.closeModal();
      render(document.getElementById("view-health"), true);
    }, "💾 Guardar objetivo");
    UI.openModal("🎯 Cambiar objetivo y ritmo", body);
  }

  function historyRow(h) {
    const c = imcClass(h.imc);
    const dLbl = dayLabelFor(h.date);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: (h.name || "Sin nombre") + " · " + dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: h.weight + " kg · " + h.height + " cm" }),
          el("span", { class: "chip " + c.cls, text: "IMC " + h.imc + " (" + c.label + ")" }),
          el("span", { class: "chip accent", text: goalLabel(h.goal) }),
          el("span", { class: "text-faint fs-12", text: "Plan: " + (h.planKcal || 0) + " kcal · " + (h.planProt || 0) + "g prot" })
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar revisión", "¿Eliminar el registro del " + dLbl + "?", () => {
          removeCheck(h); Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); openHistory();
        }, "Eliminar");
      } })
    ]);
  }
  
  function openHistory() {
    const list = history().slice().sort((a, b) => b.date.localeCompare(a.date));
    const body = el("div", {});
    if (!list.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📖" }), el("div", { text: "Aún no tienes revisiones guardadas." })]));
    } else {
      list.forEach((h) => body.appendChild(historyRow(h)));
    }
    UI.openModal("📖 Historial de revisiones (" + list.length + ")", body);
  }

  function openDayDetail(key) {
    const items = checksOnDay(key);
    const dLbl = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    const body = el("div", {});
    if (!items.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📋" }), el("div", { text: "Sin revisiones este día." })]));
    } else {
      items.forEach((h) => body.appendChild(historyRow(h)));
    }
    body.appendChild(el("button", { class: "btn primary block mt-16", html: "＋ Registrar revisión de este día", onclick: () => { UI.closeModal(); openForm(key); } }));
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
      else if (hasCheck(key)) { cls += " done"; tip += " · con revisión"; }
      else { cls += " miss"; tip += " · sin revisión"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls + " clickable", title: tip + " · toca para ver/agregar", text: String(d), onclick: () => openDayDetail(key) }));
    }
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px;text-transform:capitalize" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Calendario de revisiones · " + monthLabel]),
        el("div", { class: "flex gap-8 fs-12" }, [
          el("span", { class: "chip good", text: "● Con revisión" }),
          el("span", { class: "chip bad", text: "● Sin revisión" })
        ])
      ]),
      grid
    ]);
  }

  function imcScale(imc) {
    const min = 15, max = 42;
    const pct = Math.max(0, Math.min(100, ((imc - min) / (max - min)) * 100));
    const stops = [
      { at: ((18.5 - min) / (max - min)) * 100, label: "18.5" },
      { at: ((25 - min) / (max - min)) * 100, label: "25" },
      { at: ((30 - min) / (max - min)) * 100, label: "30" },
      { at: ((35 - min) / (max - min)) * 100, label: "35" }
    ];
    const track = el("div", { style: "position:relative;height:14px;border-radius:8px;margin:18px 0 26px;background:linear-gradient(90deg,#ffb020 0%,#ffb020 " +
      ((18.5 - min) / (max - min) * 100) + "%,#21e6a4 " + ((18.5 - min) / (max - min) * 100) + "%,#21e6a4 " + ((25 - min) / (max - min) * 100) +
      "%,#ffb020 " + ((25 - min) / (max - min) * 100) + "%,#ffb020 " + ((30 - min) / (max - min) * 100) +
      "%,#ff5470 " + ((30 - min) / (max - min) * 100) + "%,#ff5470 100%)" });
    stops.forEach((s) => {
      track.appendChild(el("div", { style: "position:absolute;top:0;bottom:0;left:" + s.at + "%;width:1px;background:rgba(0,0,0,.35)" }));
      track.appendChild(el("div", { class: "fs-12 text-faint", style: "position:absolute;top:18px;left:" + s.at + "%;transform:translateX(-50%)", text: s.label }));
    });
    track.appendChild(el("div", {
      title: "Tu IMC: " + r1(imc),
      style: "position:absolute;top:-6px;left:" + pct + "%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid var(--txt)"
    }));
    return track;
  }

  function macroCard(label, val, unit, color, sub) {
    return el("div", { class: "card", style: "padding:14px;text-align:center" }, [
      el("div", { class: "kpi-val", style: "font-size:26px;color:" + color, text: fmt.num(val) }),
      el("div", { class: "kpi-lbl", text: label + (unit ? " (" + unit + ")" : "") }),
      sub ? el("div", { class: "kpi-sub mt-8", text: sub }) : null
    ]);
  }

  // ---------------- FUNCIONES DE PDF ORIGINALES ----------------
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function rangeFor(period, dayKey) {
    const to = today();
    let from, label;
    if (period === "day") { from = dayKey || to; return { from: from, to: from, label: "Día específico" }; }
    if (period === "daily") { from = to; label = "Diario"; }
    else if (period === "weekly") { from = DateUtil.addDays(to, -6); label = "Semanal"; }
    else {
      const d = new Date(); from = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; label = "Mensual";
    }
    return { from: from, to: to, label: label };
  }

  function openPdfModal() {
    const dateI = el("input", { class: "input", type: "date", value: today(), max: today() });
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:16px", text: "Elige el periodo del resumen de salud a descargar en PDF (incluye tu perfil, IMC, GEB/GET, plan nutricional y tus registros de peso/revisiones del periodo):" }),
      el("button", { class: "btn primary block", style: "margin-bottom:10px", html: "📅 Diario (hoy)", onclick: () => { UI.closeModal(); exportPDF("daily"); } }),
      el("button", { class: "btn block", style: "margin-bottom:10px", html: "🗓️ Semanal (últimos 7 días)", onclick: () => { UI.closeModal(); exportPDF("weekly"); } }),
      el("button", { class: "btn block", style: "margin-bottom:16px", html: "📆 Mensual (este mes)", onclick: () => { UI.closeModal(); exportPDF("monthly"); } }),
      el("div", { class: "card", style: "padding:12px" }, [
        el("div", { class: "fs-12 fw-700 mb-8", text: "🔎 Elegir un día específico (de hace tiempo)" }),
        dateI,
        el("button", { class: "btn primary block mt-8", html: "📄 PDF de ese día", onclick: () => {
          if (!dateI.value) { Audio.play("error"); toast({ icon: "⚠️", msg: "Elige una fecha" }); return; }
          UI.closeModal(); exportPDF("day", dateI.value);
        } })
      ]),
      el("p", { class: "fs-12 text-faint", style: "margin-top:16px", html: "Se abrirá la ventana de impresión: elige <b>\"Guardar como PDF\"</b> como destino." })
    ]);
    UI.openModal("📄 Descargar PDF de salud", body);
  }

  function exportPDF(period, dayKey) {
    const r = rangeFor(period, dayKey);
    const isSingleDay = r.from === r.to;
    const p = profile();
    const hasData = !!(p.weight && p.height && p.age);

    const weightList = weightsSorted().filter((w) => w.date >= r.from && w.date <= r.to);
    const checkList = history().slice().filter((h) => h.date >= r.from && h.date <= r.to).sort((a, b) => a.date.localeCompare(b.date));

    const fromLbl = DateUtil.parse(r.from).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const toLbl = DateUtil.parse(r.to).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    let imc = 0, geb = 0, get = 0, plan = null, c = null;
    if (hasData) {
      imc = calcIMC(p.weight, p.height);
      geb = calcGEB(p.weight, p.height, p.age, p.sex);
      get = calcGET(geb, p.activity);
      plan = calcPlan(p.weight, get, geb, p.goal, p.pace);
      c = imcClass(imc);
    }

    let weightRows = "";
    if (!weightList.length) {
      weightRows = '<tr><td colspan="3" style="text-align:center;color:#888;padding:18px">Sin pesos registrados en este periodo.</td></tr>';
    } else {
      weightList.forEach((w) => {
        const dLbl = DateUtil.parse(w.date).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
        weightRows += "<tr><td>" + esc(dLbl) + "</td><td style='text-align:center'><b>" + w.weight + " kg</b></td><td>" + esc(w.note || "") + "</td></tr>";
      });
    }
    let wStats = null;
    if (weightList.length) {
      const sorted = weightList.slice().sort((a, b) => a.date.localeCompare(b.date));
      wStats = { first: sorted[0], last: sorted[sorted.length - 1], diff: r1(sorted[sorted.length - 1].weight - sorted[0].weight) };
    }

    let checkRows = "";
    if (!checkList.length) {
      checkRows = '<tr><td colspan="5" style="text-align:center;color:#888;padding:18px">Sin revisiones biométricas en este periodo.</td></tr>';
    } else {
      checkList.forEach((h) => {
        const dLbl = DateUtil.parse(h.date).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
        checkRows += "<tr><td>" + esc(dLbl) + "</td><td style='text-align:center'>" + h.weight + " kg</td><td style='text-align:center'>" + h.imc + "</td><td style='text-align:center'>" + h.geb + "</td><td style='text-align:center'>" + h.get + "</td></tr>";
      });
    }

    const html = "<!doctype html><html lang='es'><head><meta charset='utf-8'><title>OCTANAJE · Salud " + r.label + "</title>" +
      "<style>" +
      "*{box-sizing:border-box;font-family:'Segoe UI',system-ui,Arial,sans-serif}" +
      "body{margin:0;padding:32px;color:#1a1a2e;background:#fff}" +
      ".hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #6a5cff;padding-bottom:14px;margin-bottom:20px}" +
      ".logo{font-size:22px;font-weight:800;letter-spacing:2px;color:#6a5cff}" +
      ".logo span{color:#00b3c4}" +
      ".sub{color:#666;font-size:13px}" +
      "h1{font-size:20px;margin:0 0 4px}" +
      "h2{font-size:15px;margin:22px 0 8px;color:#4a3fd0;border-bottom:1px solid #e3e3ee;padding-bottom:6px}" +
      ".kpis{display:flex;gap:12px;margin:14px 0;flex-wrap:wrap}" +
      ".kpi{flex:1;min-width:110px;border:1px solid #e3e3ee;border-radius:12px;padding:12px 14px}" +
      ".kpi .n{font-size:22px;font-weight:800;color:#6a5cff}" +
      ".kpi .l{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:1px}" +
      ".types{background:#f4f4fb;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:8px}" +
      "table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:6px}" +
      "th{background:#6a5cff;color:#fff;text-align:left;padding:8px 10px;font-size:12px}" +
      "th.c{text-align:center}" +
      "td{padding:7px 10px;border-bottom:1px solid #ececf4;vertical-align:top}" +
      ".ft{margin-top:24px;color:#999;font-size:11px;text-align:center;border-top:1px solid #eee;padding-top:12px}" +
      "@media print{body{padding:0}}" +
      "</style></head><body>" +
      "<div class='hd'><div><div class='logo'>▲ OCTAN<span>AJE</span></div><div class='sub'>Salud y Disciplina</div></div>" +
      "<div style='text-align:right'><h1>Resumen de salud</h1><div class='sub'>" + (isSingleDay ? fromLbl : r.label + " · " + fromLbl + " → " + toLbl) + "</div></div></div>" +

      (hasData ? (
        "<h2>Perfil actual</h2>" +
        "<div class='types'><b>" + esc(p.name || "—") + "</b> · " + (p.sex === "M" ? "Hombre" : "Mujer") + " · " + p.age + " años · " + p.weight + " kg · " + p.height + " cm · " + esc(activityLabel(p.activity)) + " · Objetivo: " + esc(goalLabel(p.goal)) + "</div>" +
        "<div class='kpis'>" +
        "<div class='kpi'><div class='n'>" + r1(imc) + "</div><div class='l'>IMC (" + esc(c.label) + ")</div></div>" +
        "<div class='kpi'><div class='n'>" + Math.round(geb) + "</div><div class='l'>GEB kcal/día</div></div>" +
        "<div class='kpi'><div class='n'>" + Math.round(get) + "</div><div class='l'>GET kcal/día</div></div>" +
        "<div class='kpi'><div class='n'>" + plan.kcal + "</div><div class='l'>Plan · kcal/día</div></div>" +
        "</div>" +
        "<div class='types'><b>Plan nutricional recomendado:</b> " + plan.kcal + " kcal · P " + plan.prot + "g · C " + plan.carb + "g · G " + plan.fat + "g por día.</div>"
      ) : "<div class='types'>Aún no has completado tu perfil de salud (peso, estatura, edad).</div>") +

      "<h2>⚖️ Peso de báscula" + (isSingleDay ? "" : " del periodo") + "</h2>" +
      (wStats ? "<div class='types'>Primer peso: <b>" + wStats.first.weight + " kg</b> (" + DateUtil.parse(wStats.first.date).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) + ") &nbsp;·&nbsp; Último: <b>" + wStats.last.weight + " kg</b> &nbsp;·&nbsp; Cambio: <b>" + (wStats.diff > 0 ? "+" : "") + wStats.diff + " kg</b></div>" : "") +
      "<table><thead><tr><th>Fecha</th><th class='c'>Peso</th><th>Nota</th></tr></thead><tbody>" + weightRows + "</tbody></table>" +

      "<h2>📋 Revisiones biométricas" + (isSingleDay ? "" : " del periodo") + "</h2>" +
      "<table><thead><tr><th>Fecha</th><th class='c'>Peso</th><th class='c'>IMC</th><th class='c'>GEB</th><th class='c'>GET</th></tr></thead><tbody>" + checkRows + "</tbody></table>" +

      "<div class='ft'>Generado por OCTANAJE · " + new Date().toLocaleString("es-MX") + " · Este resumen es una referencia general, no un diagnóstico médico.</div>" +
      "</body></html>";

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    Audio.play("tap");
    toast({ icon: "📄", title: "Generando PDF…", msg: "Elige \"Guardar como PDF\"." });
    setTimeout(function () {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
      setTimeout(function () { iframe.remove(); }, 1500);
    }, 500);
  }

  // ---------------- NUEVAS FUNCIONES DE CALCULADORA PRO ----------------
  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if (guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  };

  window.processHealthCalculations = function() {
    const data = {
      gender: document.getElementById('calc-gender').value,
      ageYears: parseFloat(document.getElementById('calc-age').value),
      weightKg: parseFloat(document.getElementById('calc-weight').value),
      heightCm: parseFloat(document.getElementById('calc-height').value),
      neckCm: parseFloat(document.getElementById('calc-neck').value),
      waistCm: parseFloat(document.getElementById('calc-waist').value),
      hipCm: parseFloat(document.getElementById('calc-hip').value) || 0,
      activityLevel: document.getElementById('calc-activity').value
    };

    if (!data.weightKg || !data.heightCm || !data.ageYears || !data.neckCm || !data.waistCm || !data.hipCm) {
      alert("Por favor completa todos los campos requeridos (incluyendo cadera).");
      return;
    }

    let tmb = (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.ageYears);
    tmb = data.gender === 'female' ? tmb - 161 : tmb + 5;
    const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const get = tmb * (actFactors[data.activityLevel] || 1.2);

    let bf = 0;
    if (data.gender === 'male') {
      const diff = data.waistCm - data.neckCm;
      if (diff > 0) {
        const den = 1.0324 - (0.19077 * Math.log10(diff)) + (0.15456 * Math.log10(data.heightCm));
        bf = (495 / den) - 450;
      }
    } else {
      const sum = data.waistCm + data.hipCm - data.neckCm;
      if (sum > 0) {
        const den = 1.29579 - (0.35004 * Math.log10(sum)) + (0.22100 * Math.log10(data.heightCm));
        bf = (495 / den) - 450;
      }
    }
    bf = Math.max(3, Math.min(60, bf));
    const fatKg = data.weightKg * (bf / 100);

    const protG = Math.round(data.weightKg * 2); 
    const fatG = Math.round(data.weightKg * 1);
    const carbsG = Math.max(0, Math.round((get - (protG * 4) - (fatG * 9)) / 4));
    const icc = (data.waistCm / data.hipCm).toFixed(2);
    let risk = "Riesgo Alto";
    if ((data.gender === 'male' && icc <= 0.90) || (data.gender === 'female' && icc <= 0.85)) risk = "Riesgo Bajo";
    const water = (data.weightKg * 35 / 1000).toFixed(1);

    document.getElementById('res-tmb').innerText = `${Math.round(tmb)} kcal`;
    document.getElementById('res-get').innerText = `${Math.round(get)} kcal`;
    document.getElementById('res-fat').innerText = `${bf.toFixed(1)}% Grasa`;
    document.getElementById('res-mass').innerText = `${(data.weightKg - fatKg).toFixed(1)}kg magra / ${fatKg.toFixed(1)}kg grasa`;
    document.getElementById('res-macros').innerText = `🥩 ${protG}g Prot | 🥑 ${fatG}g Grasa | 🍚 ${carbsG}g Carbos`;
    document.getElementById('res-icc').innerText = `${icc} (${risk})`;
    document.getElementById('res-water').innerText = `💧 ${water} Litros al día`;

    if (N.Audio) N.Audio.play("tap");
    document.getElementById('health-results').style.display = 'grid';
  };

  function proCalculatorCard() {
    const div = document.createElement('div');
    div.id = "pro-calc-card"; // <-- ID añadido para el escudo anti-borrado
    div.innerHTML = `
      <div class="card mb-16" style="padding: 15px; border-radius: 10px; border: 1px solid var(--accent);">
        <h3 style="color: var(--accent); margin-top: 0;">🔬 Calculadora Antropométrica Pro</h3>
        <button type="button" onclick="toggleInstructions()" class="btn sm" style="margin-bottom: 15px;">📖 ¿Cómo medirme?</button>

        <div id="measure-guide" style="display: none; background: rgba(0,0,0,0.2); border-left: 3px solid var(--accent); padding: 10px; margin-bottom: 15px; font-size: 13px;">
          <strong>📍 Cuello:</strong> Bajo la nuez de Adán.<br>
          <strong>📍 Cintura (H):</strong> Altura del ombligo. <strong>(M):</strong> Parte más estrecha.<br>
          <strong>📍 Cadera:</strong> Talones juntos, parte más ancha de glúteos.<br>
        </div>
        
        <div class="grid cols-2 gap-8 mb-16">
          <label class="fs-12">Sexo: <select class="input" id="calc-gender"><option value="male">Hombre</option><option value="female">Mujer</option></select></label>
          <label class="fs-12">Edad: <input class="input" type="number" id="calc-age" placeholder="25" /></label>
          <label class="fs-12">Peso (kg): <input class="input" type="number" id="calc-weight" step="0.1" placeholder="75" /></label>
          <label class="fs-12">Altura (cm): <input class="input" type="number" id="calc-height" placeholder="175" /></label>
          <label class="fs-12">Cuello (cm): <input class="input" type="number" id="calc-neck" step="0.5" /></label>
          <label class="fs-12">Cintura (cm): <input class="input" type="number" id="calc-waist" step="0.5" /></label>
          <label class="fs-12" style="grid-column: span 2;">Cadera (cm): <input class="input" type="number" id="calc-hip" step="0.5" /></label>
          <label class="fs-12" style="grid-column: span 2;">Actividad: 
            <select class="input" id="calc-activity">
              <option value="sedentary">Sedentario</option>
              <option value="light">Ligero</option>
              <option value="moderate" selected>Moderado</option>
              <option value="active">Activo</option>
              <option value="very_active">Atleta</option>
            </select>
          </label>
        </div>

        <button type="button" onclick="processHealthCalculations()" class="btn primary block mb-16">Calcular Diagnóstico</button>

        <div id="health-results" class="grid gap-12" style="display:none; border-top: 1px solid var(--border); padding-top: 15px;">
          <div><span class="fs-12 text-faint block">1. TMB y Mantenimiento:</span><span id="res-tmb" style="color:var(--accent);font-weight:bold;margin-right:10px;"></span><span id="res-get" style="color:var(--accent);font-weight:bold;"></span></div>
          <div><span class="fs-12 text-faint block">2. Composición Corporal:</span><span id="res-fat" style="color:var(--bad);font-weight:bold;"></span><div id="res-mass" class="fs-11 text-dim"></div></div>
          <div><span class="fs-12 text-faint block">3. Macros (Mantenimiento):</span><span id="res-macros" style="font-size:14px;"></span></div>
          <div><span class="fs-12 text-faint block">4. Índice Cintura-Cadera:</span><span id="res-icc" style="color:var(--good);font-weight:bold;"></span></div>
          <div><span class="fs-12 text-faint block">5. Hidratación Diaria:</span><span id="res-water" style="color:#0088ff;font-weight:bold;"></span></div>
        </div>
      </div>
    `;
    return div.firstElementChild;
  }


  // ---------------- RENDER PRINCIPAL ----------------
  function render(container, forceRender = false) {
    if (!container) return;
    
    // 🛡️ ESCUDO ANTI-BORRADO: Evita que el teclado virtual borre la calculadora.
    // Solo se salta el escudo si "forceRender" es true (cuando guardas un peso).
    if (!forceRender && container.querySelector('#pro-calc-card')) {
      return; 
    }

    container.innerHTML = "";
    const p = profile();
    const hasData = !!(p.weight && p.height && p.age);

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("heart") : "❤️", "Salud"]),
        el("p", { class: "view-desc", text: "Tus datos biométricos, IMC, gasto energético, tu plan nutricional y el historial de tus revisiones." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Historial" }),
        el("button", { class: "btn", onclick: openBackdatePicker, html: "🕐 Otro día" }),
        el("button", { class: "btn", onclick: openPdfModal, html: "📄 PDF" }),
        el("button", { class: "btn primary", onclick: () => openForm(), html: hasData ? "✏️ Actualizar mis datos" : "＋ Registrar mis datos" })
      ])
    ]));

    // Nueva Calculadora Pro inyectada
    container.appendChild(proCalculatorCard());

    // Tarjeta original de pesos de báscula
    container.appendChild(weightCard());

    if (!hasData) {
      container.appendChild(el("div", { class: "card" }, [
        el("div", { class: "empty" }, [
          el("span", { class: "big", text: "💙" }),
          el("div", { text: "Aún no has registrado tus datos de salud." }),
          el("p", { class: "fs-12 text-faint mt-8", text: "Captura tu peso, estatura, edad, sexo, nivel de actividad y tu objetivo — los mismos datos que te pediría un nutriólogo deportivo — para calcular tu IMC, tu Gasto Energético Basal (GEB), tu Gasto Energético Total (GET), y un plan de calorías y proteína recomendadas según si quieres bajar de peso, mantenerlo, o aumentar masa muscular." }),
          el("button", { class: "btn primary mt-16", onclick: () => openForm(), html: "＋ Registrar mis datos" })
        ])
      ]));
      return;
    }

    const imc = calcIMC(p.weight, p.height);
    const geb = calcGEB(p.weight, p.height, p.age, p.sex);
    const get = calcGET(geb, p.activity);
    const c = imcClass(imc);
    const lastLbl = p.lastCheck ? dayLabelFor(p.lastCheck) : "—";

    // Resumen del perfil
    container.appendChild(el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [
        el("div", {}, [
          el("div", { class: "card-title" }, [el("span", { class: "dot" }), p.name || "Tu perfil"]),
          el("div", { class: "card-sub", text: "Última revisión: " + lastLbl })
        ])
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("span", { class: "chip", text: (p.sex === "M" ? "Hombre" : "Mujer") + " · " + p.age + " años" }),
        el("span", { class: "chip", text: p.weight + " kg" }),
        el("span", { class: "chip", text: p.height + " cm" }),
        el("span", { class: "chip accent", text: activityLabel(p.activity) }),
        el("span", { class: "chip warn", text: goalLabel(p.goal) })
      ])
    ]));

    // Tarjeta IMC
    const imcCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Índice de Masa Corporal (IMC)"])]),
      el("div", { class: "flex items-center gap-12", style: "flex-wrap:wrap" }, [
        el("div", { class: "kpi-val", style: "font-size:38px", text: r1(imc) + "" }),
        el("span", { class: "chip " + c.cls, style: "font-size:13px;padding:7px 14px", text: c.label })
      ]),
      el("p", { class: "fs-12 text-faint mt-8", text: c.desc }),
      imcScale(imc),
      el("div", { class: "insight info" }, [
        el("span", { class: "ico", text: "📐" }),
        el("div", { class: "txt", html: "<b>Fórmula:</b> IMC = peso (kg) ÷ [estatura (m)]². &nbsp; Ej: " + p.weight + " kg ÷ (" + (p.height / 100).toFixed(2) + " m)² = <b>" + r1(imc) + "</b>." })
      ]),
      el("p", { class: "fs-12 text-faint", text: "Clasificación OMS: <18.5 Bajo peso · 18.5-24.9 Normal · 25-29.9 Sobrepeso · 30-34.9 Obesidad I · 35-39.9 Obesidad II · ≥40 Obesidad III." })
    ]);
    container.appendChild(imcCard);

    // Tarjeta Gasto Energético
    const engCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Gasto energético"])]),
      el("div", { class: "grid cols-2 mb-16" }, [
        macroCard("GEB · Basal", Math.round(geb), "kcal/día", "var(--accent)", "Lo que quemas en reposo total"),
        macroCard("GET · Total", Math.round(get), "kcal/día", "var(--warn)", "Lo que quemas con tu actividad diaria")
      ]),
      el("div", { class: "insight good" }, [
        el("span", { class: "ico", text: "🔥" }),
        el("div", { class: "txt", html: "<b>GEB (Gasto Energético Basal):</b> calculado con Mifflin-St Jeor." })
      ]),
      el("div", { class: "insight warn" }, [
        el("span", { class: "ico", text: "⚡" }),
        el("div", { class: "txt", html: "<b>GET (Gasto Energético Total):</b> tu GEB multiplicado por tu nivel de actividad física (" + activityLabel(p.activity) + ")." })
      ])
    ]);
    container.appendChild(engCard);

    // Tarjeta Plan Nutricional
    const plan = calcPlan(p.weight, get, geb, p.goal, p.pace);
    const planCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", {}, [
          el("div", { class: "card-title" }, [el("span", { class: "dot" }), "🍽️ Plan nutricional recomendado"]),
          el("div", { class: "card-sub", text: "Objetivo: " + goalLabel(p.goal) })
        ]),
        el("button", { class: "btn sm", onclick: openGoalOnly, html: "🎯 Cambiar objetivo" })
      ]),
      el("div", { class: "grid cols-4 mb-16" }, [
        macroCard("Calorías", plan.kcal, "kcal/día", "var(--warn)"),
        macroCard("Proteína", plan.prot, "g/día", "var(--good)", plan.protPerKg + " g por kg de peso"),
        macroCard("Grasas", plan.fat, "g/día", "var(--bad)"),
        macroCard("Carbohidratos", plan.carb, "g/día", "var(--accent)")
      ]),
      plan.rateKgWeek ? el("div", { class: "insight " + (p.goal === "lose" ? "warn" : "good") }, [
        el("span", { class: "ico", text: p.goal === "lose" ? "📉" : "📈" }),
        el("div", { class: "txt", html: "Ritmo estimado: <b>~" + Math.abs(plan.rateKgWeek) + " kg por semana</b>." })
      ]) : null,
      el("button", { class: "btn primary block mt-8", html: "📥 Aplicar estas metas a Alimentación", onclick: () => {
        if (N.Nutrition && N.Nutrition.setGoals) {
          N.Nutrition.setGoals({ kcal: plan.kcal, prot: plan.prot, carb: plan.carb, fat: plan.fat });
          Audio.play("levelup");
          toast({ icon: "🎯", title: "Metas actualizadas en Alimentación", msg: plan.kcal + " kcal · P " + plan.prot + "g" });
        } else {
          Audio.play("error"); toast({ icon: "⚠️", msg: "No se pudo conectar con Alimentación" });
        }
      } })
    ]);
    container.appendChild(planCard);

    // Calendario
    container.appendChild(buildCalendar());
  }

  N.Health = { render, exportPDF, saveWeight };
})();
