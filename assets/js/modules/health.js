/* =====================================================================
   OCTANAJE · Módulo Salud
   Datos biométricos que normalmente pide un preparador físico: peso,
   estatura, edad, sexo y nivel de actividad. Con eso se calcula:
     - IMC (Índice de Masa Corporal) con su clasificación
     - GEB (Gasto Energético Basal) — fórmula de Mifflin-St Jeor
     - GET (Gasto Energético Total) — GEB x factor de actividad
     - Plan nutricional (calorías y proteína recomendadas) según tu
       objetivo: bajar de peso, mantenerlo, o aumentar masa muscular
       — como lo armaría un nutriólogo deportivo — con opción de
       aplicarlo directo a tus metas de Alimentación.
   Incluye historial tipo calendario, con nombre, fecha, y guardado
   persistente (localStorage vía Store). Soporta registrar revisiones
   de días anteriores si se te pasó anotarlas a tiempo.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  function dayLabelFor(key) { return DateUtil.parse(key).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); }

  // Factores de actividad física para el GET (estándar de nutrición/PT)
  const ACTIVITY = [
    { value: "sedentary", label: "Sedentario (poco o nulo ejercicio)", factor: 1.2 },
    { value: "light", label: "Ligero (ejercicio 1-3 días/semana)", factor: 1.375 },
    { value: "moderate", label: "Moderado (ejercicio 3-5 días/semana)", factor: 1.55 },
    { value: "active", label: "Activo (ejercicio 6-7 días/semana)", factor: 1.725 },
    { value: "very_active", label: "Muy activo (2x al día / trabajo físico)", factor: 1.9 }
  ];
  function activityLabel(v) { return (ACTIVITY.find((a) => a.value === v) || ACTIVITY[2]).label; }
  function activityFactor(v) { return (ACTIVITY.find((a) => a.value === v) || ACTIVITY[2]).factor; }

  // Objetivos y ritmo de cambio (para el plan nutricional)
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

  // Clasificación oficial de IMC (OMS)
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
    return s.health;
  }
  function profile() {
    const pr = health().profile;
    if (pr.goal == null) pr.goal = "maintain";     // migración: usuarios previos sin objetivo guardado
    if (pr.pace == null) pr.pace = "moderate";
    return pr;
  }
  function history() { return health().history; }

  // ---------------- Cálculos ----------------
  // IMC = peso(kg) / estatura(m)^2
  function calcIMC(weightKg, heightCm) {
    const h = heightCm / 100;
    if (!weightKg || !h) return 0;
    return weightKg / (h * h);
  }
  // GEB — Fórmula de Mifflin-St Jeor (la más usada actualmente por
  // nutriólogos/entrenadores; más precisa que la antigua Harris-Benedict)
  //  Hombres: GEB = 10*peso + 6.25*estatura - 5*edad + 5
  //  Mujeres: GEB = 10*peso + 6.25*estatura - 5*edad - 161
  function calcGEB(weightKg, heightCm, age, sex) {
    if (!weightKg || !heightCm || !age) return 0;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === "M" ? base + 5 : base - 161;
  }
  // GET = GEB x factor de actividad física
  function calcGET(geb, activityKey) { return geb * activityFactor(activityKey); }

  function r1(x) { return Math.round(x * 10) / 10; }

  // Plan nutricional: calorías + proteína (y grasas/carbos) recomendadas
  // según el objetivo, tal como lo armaría un nutriólogo deportivo.
  //  - Calorías: GET ± ajuste según ritmo elegido (con piso de seguridad
  //    al bajar de peso, para no caer por debajo de tu GEB).
  //  - Proteína: gramos por kg de peso corporal (rango deportivo:
  //    1.8-2.2 g/kg, más alta al bajar de peso para proteger tu músculo).
  //  - Grasas: 25% de las calorías totales.
  //  - Carbohidratos: lo que sobra de las calorías.
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
    const rateKgWeek = goal === "maintain" ? 0 : r1((adj * 7) / 7700); // 1 kg ≈ 7700 kcal
    return { kcal: Math.round(kcal), prot: protG, protPerKg, fat: fatG, carb: carbG, rateKgWeek, clamped };
  }

  // ---------------- Historial ----------------
  // dateKey opcional: para registrar una revisión de un día anterior.
  // Al guardar, el "perfil actual" (usado en IMC/GEB/GET/plan) se
  // actualiza SIEMPRE a partir de la revisión más reciente por fecha,
  // así una revisión atrasada no pisa datos más nuevos que ya tenías.
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
    Gami.award(5, "Revisión de salud registrada 💙");
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

  // ---------------- Formulario de datos (biometría + objetivo) ----------------
  // presetDate opcional: para registrar la revisión de un día anterior.
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
      render(document.getElementById("view-health"));
    }, "💾 Guardar revisión");

    const banner = isBackdate ? el("div", { class: "insight warn", style: "margin-bottom:14px" }, [
      el("span", { class: "ico", text: "🕐" }),
      el("div", { class: "txt", html: "Esta revisión se guardará con fecha <b>" + dayLabelFor(dateKey) + "</b>, no hoy." })
    ]) : null;

    UI.openModal(isBackdate ? "📋 Revisión de otro día" : "📋 Nueva revisión de salud", el("div", {}, [banner, formNode]));
  }

  // ---------------- Registrar revisión de un día anterior ----------------
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

  // ---------------- Cambiar solo objetivo/ritmo (sin nueva revisión) ----------------
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
      render(document.getElementById("view-health"));
    }, "💾 Guardar objetivo");
    UI.openModal("🎯 Cambiar objetivo y ritmo", body);
  }

  // ---------------- Historial (modal) ----------------
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

  // ---------------- Calendario de revisiones ----------------
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

  // ---------------- Barra visual de clasificación de IMC ----------------
  function imcScale(imc) {
    // escala visual de 15 a 42 aprox., marcador según el valor actual
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

  // ---------------- Render principal ----------------
  function render(container) {
    container.innerHTML = "";
    const p = profile();
    const hasData = !!(p.weight && p.height && p.age);

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons.node("heart"), "Salud"]),
        el("p", { class: "view-desc", text: "Tus datos biométricos, IMC, gasto energético, tu plan nutricional y el historial de tus revisiones." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Historial" }),
        el("button", { class: "btn", onclick: openBackdatePicker, html: "🕐 Otro día" }),
        el("button", { class: "btn primary", onclick: () => openForm(), html: hasData ? "✏️ Actualizar mis datos" : "＋ Registrar mis datos" })
      ])
    ]));

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

    // ---- IMC ----
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
      el("p", { class: "fs-12 text-faint", text: "Clasificación OMS: <18.5 Bajo peso · 18.5-24.9 Normal · 25-29.9 Sobrepeso · 30-34.9 Obesidad I · 35-39.9 Obesidad II · ≥40 Obesidad III. El IMC no distingue masa muscular de grasa, así que en personas muy musculosas puede no ser representativo — úsalo como referencia general, no como diagnóstico." })
    ]);
    container.appendChild(imcCard);

    // ---- GEB y GET ----
    const engCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Gasto energético"])]),
      el("div", { class: "grid cols-2 mb-16" }, [
        macroCard("GEB · Basal", Math.round(geb), "kcal/día", "var(--accent)", "Lo que quemas en reposo total"),
        macroCard("GET · Total", Math.round(get), "kcal/día", "var(--warn)", "Lo que quemas con tu actividad diaria")
      ]),
      el("div", { class: "insight good" }, [
        el("span", { class: "ico", text: "🔥" }),
        el("div", { class: "txt", html: "<b>GEB (Gasto Energético Basal):</b> es la energía mínima que tu cuerpo necesita para funcionar en completo reposo (respirar, digerir, mantener la temperatura), sin contar ningún movimiento. Se calculó con la fórmula de Mifflin-St Jeor: " +
          (p.sex === "M" ? "10×peso + 6.25×estatura − 5×edad + 5" : "10×peso + 6.25×estatura − 5×edad − 161") + "." })
      ]),
      el("div", { class: "insight warn" }, [
        el("span", { class: "ico", text: "⚡" }),
        el("div", { class: "txt", html: "<b>GET (Gasto Energético Total):</b> es tu GEB multiplicado por tu nivel de actividad física (" + activityLabel(p.activity) + ", factor ×" + activityFactor(p.activity) + "). Representa las calorías que realmente quemas en un día normal, incluyendo ejercicio y movimiento." })
      ]),
      el("p", { class: "fs-12 text-faint mt-8", html: "<b>¿Para qué sirve?</b> El GET es tu punto de referencia: comer por debajo de él genera déficit calórico (bajar de peso), comer igual mantiene tu peso, y comer por encima genera superávit (subir de peso/masa muscular). El plan de abajo ya hace este ajuste automáticamente según tu objetivo." })
    ]);
    container.appendChild(engCard);

    // ---- Plan nutricional (calorías y proteína recomendadas) ----
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
        el("div", { class: "txt", html: "Ritmo estimado: <b>~" + Math.abs(plan.rateKgWeek) + " kg por semana</b> de " + (p.goal === "lose" ? "pérdida" : "ganancia") + ". Es un estimado matemático (1 kg ≈ 7,700 kcal); tu progreso real puede variar según tu cuerpo." })
      ]) : null,
      plan.clamped ? el("div", { class: "insight bad" }, [
        el("span", { class: "ico", text: "⚠️" }),
        el("div", { class: "txt", html: "Se ajustó tu meta calórica a un mínimo seguro (no por debajo de ~1.2× tu GEB) para no comprometer tu salud con un déficit demasiado agresivo." })
      ]) : null,
      el("div", { class: "insight info" }, [
        el("span", { class: "ico", text: "🧮" }),
        el("div", { class: "txt", html: "<b>¿Cómo se calculó?</b> Calorías = tu GET " +
          (p.goal === "lose" ? "menos un déficit" : p.goal === "gain" ? "más un superávit" : "(sin cambio, es mantenimiento)") +
          " según el ritmo elegido. Proteína = " + plan.protPerKg + " g por kg de tu peso corporal (rango deportivo recomendado, más alto al bajar de peso para proteger tu músculo). Grasas = 25% de tus calorías totales. Carbohidratos = las calorías que quedan." })
      ]),
      el("button", { class: "btn primary block mt-8", html: "📥 Aplicar estas metas a Alimentación", onclick: () => {
        if (N.Nutrition && N.Nutrition.setGoals) {
          N.Nutrition.setGoals({ kcal: plan.kcal, prot: plan.prot, carb: plan.carb, fat: plan.fat });
          Audio.play("levelup");
          toast({ icon: "🎯", title: "Metas actualizadas en Alimentación", msg: plan.kcal + " kcal · P " + plan.prot + "g · C " + plan.carb + "g · G " + plan.fat + "g" });
        } else {
          Audio.play("error"); toast({ icon: "⚠️", msg: "No se pudo conectar con Alimentación" });
        }
      } }),
      el("p", { class: "fs-12 text-faint mt-8", text: "Esto reemplaza tus metas actuales de Calorías, Proteínas, Carbohidratos y Grasas en la pestaña Alimentación. Este plan es una referencia general (no un plan médico/nutricional personalizado) — ante cualquier condición de salud, consulta a un nutriólogo o médico deportivo." })
    ]);
    container.appendChild(planCard);

    // ---- Calendario de revisiones ----
    container.appendChild(buildCalendar());
  }

  N.Health = { render };
})();
