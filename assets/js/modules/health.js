/* =====================================================================
   OCTANAJE · Módulo Salud (Antropometría Pro + Historial Integrado)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  function dayLabelFor(key) { return DateUtil.parse(key).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); }

  // ---------------- DATOS Y PERFIL ----------------
  const ACTIVITY = [{ value: "sedentary", label: "Sedentario" }, { value: "light", label: "Ligero" }, { value: "moderate", label: "Moderado" }, { value: "active", label: "Activo" }, { value: "very_active", label: "Atleta" }];
  const GOALS = [{ value: "lose", label: "📉 Bajar de peso" }, { value: "maintain", label: "⚖️ Mantener peso" }, { value: "gain", label: "📈 Aumentar masa" }];
  function goalLabel(v) { return (GOALS.find((g) => g.value === v) || GOALS[1]).label; }
  
  function health() {
    const s = Store.get();
    if (!s.health) s.health = { profile: {}, history: [], weights: [] };
    return s.health;
  }
  function profile() { 
    const pr = health().profile; 
    if (!pr.goal) pr.goal = "maintain"; 
    return pr; 
  }
  function history() { return health().history || []; }
  function weights() { return health().weights || []; }
  function weightsSorted() { return weights().slice().sort((a, b) => a.date.localeCompare(b.date)); }

  function r1(x) { return Math.round(x * 10) / 10; }

  // ---------------- LÓGICA DE LA CALCULADORA PRO ----------------
  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if (guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  };

  window.processHealthCalculations = function() {
    const p = profile();
    
    // 1. Recoger datos del DOM y guardarlos en el Perfil
    p.sex = document.getElementById('calc-gender').value === 'male' ? 'M' : 'F';
    p.age = parseFloat(document.getElementById('calc-age').value) || 0;
    p.weight = parseFloat(document.getElementById('calc-weight').value) || 0;
    p.height = parseFloat(document.getElementById('calc-height').value) || 0;
    p.neck = parseFloat(document.getElementById('calc-neck').value) || 0;
    p.waist = parseFloat(document.getElementById('calc-waist').value) || 0;
    p.hip = parseFloat(document.getElementById('calc-hip').value) || 0;
    p.activity = document.getElementById('calc-activity').value;

    if (!p.weight || !p.height || !p.age || !p.neck || !p.waist) {
      Audio.play("error"); toast({ icon: "⚠️", msg: "Completa peso, estatura, edad, cuello y cintura." });
      return;
    }

    // 2. Cálculos Matemáticos
    let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
    const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const get = tmb * (actFactors[p.activity] || 1.2);

    let bf = 0;
    if (p.sex === 'M') {
      const diff = p.waist - p.neck;
      if (diff > 0) bf = (495 / (1.0324 - (0.19077 * Math.log10(diff)) + (0.15456 * Math.log10(p.height)))) - 450;
    } else {
      if(!p.hip) { Audio.play("error"); toast({ icon: "⚠️", msg: "Mujeres requieren medida de cadera." }); return; }
      const sum = p.waist + p.hip - p.neck;
      if (sum > 0) bf = (495 / (1.29579 - (0.35004 * Math.log10(sum)) + (0.22100 * Math.log10(p.height)))) - 450;
    }
    bf = Math.max(3, Math.min(60, bf));

    const icc = p.hip > 0 ? (p.waist / p.hip).toFixed(2) : "0.00";
    const imc = p.weight / ((p.height/100) * (p.height/100));

    p.lastFat = bf.toFixed(1); // Guardar grasa calculada en perfil

    // 3. Crear registro para el Historial (Calendario/PDF)
    const entry = {
      id: Store.uid(), date: today(), name: p.name || "Usuario",
      sex: p.sex, age: p.age, weight: p.weight, height: p.height, activity: p.activity, goal: p.goal,
      neck: p.neck, waist: p.waist, hip: p.hip, fatPct: p.lastFat, icc: icc,
      imc: r1(imc), geb: Math.round(tmb), get: Math.round(get)
    };

    // Actualizar historial (si ya hay uno hoy, se reemplaza para no duplicar)
    const arr = history();
    const existingIdx = arr.findIndex(x => x.date === today());
    if (existingIdx >= 0) arr.splice(existingIdx, 1);
    arr.unshift(entry);
    
    Store.commit(); // 💾 SE GUARDA EN BASE DE DATOS

    if (N.Audio) N.Audio.play("levelup");
    if (N.Gami) N.Gami.award(5, "Diagnóstico Pro guardado 🔬");
    toast({ icon: "💾", title: "Análisis Guardado", msg: "Tus medidas y % de grasa están en el historial." });

    // 4. Forzar el redibujado de la pantalla con los nuevos datos
    render(document.getElementById('view-health'), true);
  };

  function proCalculatorCard() {
    const p = profile();
    
    // Variables para pre-llenar selectores
    const selM = p.sex === 'M' ? 'selected' : '';
    const selF = p.sex === 'F' ? 'selected' : '';
    const act = (val) => p.activity === val ? 'selected' : '';

    // Generar resultados en tiempo real si existen los datos
    let resultsHTML = "";
    let displayStyle = "none";

    if (p.weight && p.height && p.neck && p.waist && p.age) {
      let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
      tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
      const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      const get = tmb * (actFactors[p.activity] || 1.2);
      const fatKg = p.weight * ((parseFloat(p.lastFat) || 0) / 100);
      const leanKg = p.weight - fatKg;
      const protG = Math.round(p.weight * 2);
      const fatG = Math.round(p.weight * 1);
      const carbsG = Math.max(0, Math.round((get - (protG * 4) - (fatG * 9)) / 4));
      const icc = p.hip > 0 ? (p.waist / p.hip).toFixed(2) : "0.00";
      let risk = "Alto"; if ((p.sex === 'M' && icc <= 0.90) || (p.sex === 'F' && icc <= 0.85)) risk = "Bajo";
      const water = (p.weight * 35 / 1000).toFixed(1);

      displayStyle = "grid";
      resultsHTML = `
        <div><span class="fs-12 text-faint block">1. TMB y Calorías (Mantenimiento):</span><span style="color:#00f3ff;font-weight:bold;margin-right:10px;">${Math.round(tmb)} kcal</span><span style="color:#00f3ff;font-weight:bold;">${Math.round(get)} kcal/día</span></div>
        <div><span class="fs-12 text-faint block">2. Composición Corporal:</span><span style="color:#ff0055;font-weight:bold;font-size:16px;">${p.lastFat || 0}% Grasa</span><div class="fs-11 text-dim">${leanKg.toFixed(1)}kg magra / ${fatKg.toFixed(1)}kg grasa</div></div>
        <div><span class="fs-12 text-faint block">3. Macros Sugeridos:</span><span style="font-size:14px;color:#fff;">🥩 ${protG}g Prot | 🥑 ${fatG}g Grasa | 🍚 ${carbsG}g Carbos</span></div>
        <div><span class="fs-12 text-faint block">4. Índice Cintura-Cadera (Salud):</span><span style="color:#00ff88;font-weight:bold;">${icc} (${risk})</span></div>
        <div><span class="fs-12 text-faint block">5. Hidratación Diaria:</span><span style="color:#0088ff;font-weight:bold;">💧 ${water} Litros</span></div>
      `;
    }

    const div = document.createElement('div');
    div.id = "pro-calc-card"; 
    div.innerHTML = `
      <div class="card mb-16" style="padding: 15px; border-radius: 10px; border: 1px solid #00f3ff; background: #111424;">
        <h3 style="color: #00f3ff; margin-top: 0;">🔬 Evaluación Antropométrica Pro</h3>
        <button type="button" onclick="toggleInstructions()" class="btn-secondary" style="margin-bottom: 15px; font-size: 14px; background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 5px 10px; border-radius: 5px;">📖 ¿Cómo medirme?</button>

        <div id="measure-guide" style="display: none; background: rgba(0,255,255,0.05); border-left: 3px solid #00f3ff; padding: 15px; margin-bottom: 15px; font-size: 13px; color: #ccc;">
          <strong>📍 Cuello:</strong> Por debajo de la nuez de Adán. Cinta horizontal.<br>
          <strong>📍 Cintura (Hombres):</strong> Exactamente altura del ombligo.<br>
          <strong>📍 Cintura (Mujeres):</strong> Parte más estrecha del torso (arriba del ombligo).<br>
          <strong>📍 Cadera:</strong> Talones juntos, parte más ancha de los glúteos.<br>
        </div>
        
        <div class="grid cols-2 gap-8 mb-16">
          <label class="fs-12 text-faint">Sexo: <select class="input mt-4" id="calc-gender"><option value="male" ${selM}>Hombre</option><option value="female" ${selF}>Mujer</option></select></label>
          <label class="fs-12 text-faint">Edad: <input class="input mt-4" type="number" id="calc-age" placeholder="25" value="${p.age || ''}" /></label>
          <label class="fs-12 text-faint">Peso (kg): <input class="input mt-4" type="number" id="calc-weight" step="0.1" placeholder="75" value="${p.weight || ''}" /></label>
          <label class="fs-12 text-faint">Altura (cm): <input class="input mt-4" type="number" id="calc-height" placeholder="175" value="${p.height || ''}" /></label>
          <label class="fs-12 text-faint">Cuello (cm): <input class="input mt-4" type="number" id="calc-neck" step="0.5" value="${p.neck || ''}" /></label>
          <label class="fs-12 text-faint">Cintura (cm): <input class="input mt-4" type="number" id="calc-waist" step="0.5" value="${p.waist || ''}" /></label>
          <label class="fs-12 text-faint" style="grid-column: span 2;">Cadera (cm) <span style="font-size:10px">(Obligatorio en mujeres)</span>: <input class="input mt-4" type="number" id="calc-hip" step="0.5" value="${p.hip || ''}" /></label>
          <label class="fs-12 text-faint" style="grid-column: span 2;">Actividad: 
            <select class="input mt-4" id="calc-activity">
              <option value="sedentary" ${act('sedentary')}>Sedentario (Nada)</option>
              <option value="light" ${act('light')}>Ligero (1-3 días)</option>
              <option value="moderate" ${act('moderate')}>Moderado (3-5 días)</option>
              <option value="active" ${act('active')}>Activo (6-7 días)</option>
              <option value="very_active" ${act('very_active')}>Atleta / Muy Activo</option>
            </select>
          </label>
        </div>

        <button type="button" onclick="processHealthCalculations()" class="btn primary block mb-16" style="background:#00f3ff; color:#000; font-weight:bold;">💾 Calcular y Guardar Diagnóstico</button>

        <div id="health-results" class="grid gap-12" style="display:${displayStyle}; border-top: 1px solid #333; padding-top: 15px;">
          ${resultsHTML}
        </div>
      </div>
    `;
    return div.firstElementChild;
  }

  // ---------------- UI ORIGINAL: HISTORIAL Y PESOS ----------------
  function historyRow(h) {
    const dLbl = dayLabelFor(h.date);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: h.weight + " kg" }),
          el("span", { class: "chip", text: "IMC " + h.imc }),
          h.fatPct ? el("span", { class: "chip bad", text: "Grasa: " + h.fatPct + "%" }) : null,
          el("span", { class: "text-faint fs-12", text: "GET: " + (h.get || 0) + " kcal" })
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar revisión", "¿Eliminar el registro del " + dLbl + "?", () => {
          const arr = history(); const i = arr.indexOf(h); if (i >= 0) arr.splice(i, 1);
          Store.commit(); Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); openHistory();
          render(document.getElementById("view-health"), true);
        }, "Eliminar");
      } })
    ]);
  }
  
  window.openHistory = function() {
    const list = history().slice().sort((a, b) => b.date.localeCompare(a.date));
    const body = el("div", {});
    if (!list.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📖" }), el("div", { text: "Aún no tienes análisis guardados." })]));
    } else {
      list.forEach((h) => body.appendChild(historyRow(h)));
    }
    UI.openModal("📖 Historial de Diagnósticos (" + list.length + ")", body);
  }

  function openDayDetail(key) {
    const items = history().filter(h => h.date === key);
    const dLbl = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    const body = el("div", {});
    if (!items.length) body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📋" }), el("div", { text: "Sin revisiones este día." })]));
    else items.forEach((h) => body.appendChild(historyRow(h)));
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
      else if (history().some(h => h.date === key)) { cls += " done"; tip += " · con revisión"; }
      else { cls += " miss"; tip += " · sin revisión"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls + " clickable", title: tip, text: String(d), onclick: () => openDayDetail(key) }));
    }
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px;text-transform:capitalize" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Calendario de revisiones · " + monthLabel])
      ]),
      grid
    ]);
  }

  function weightCard() {
    const list = weightsSorted();
    const cv = el("canvas");
    const chartWrap = el("div", { class: "chart-box" }, [cv]);
    const series = list.slice(-30);
    setTimeout(() => {
      if(Charts && series.length) Charts.line(cv, {
        values: series.map((w) => w.weight),
        labels: series.map((w) => DateUtil.parse(w.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }))
      }, { color: "--accent", height: 170 });
    }, 30);

    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head" }, [ el("div", { class: "card-title" }, [el("span", { class: "dot" }), "⚖️ Tendencia de Peso de Báscula"]) ]),
      el("div", { class: "fs-12 text-faint mb-8", text: "Últimos " + series.length + " registros diarios" }),
      chartWrap
    ]);
  }

  // ---------------- RENDER PRINCIPAL ----------------
  function render(container, forceRender = false) {
    if (!container) return;
    
    // Escudo: Si ya está dibujada y no forzamos actualización, detenemos
    if (!forceRender && container.querySelector('#pro-calc-card')) return;

    container.innerHTML = "";
    
    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("heart") : "❤️", "Salud y Avance"]),
        el("p", { class: "view-desc", text: "Mide tu porcentaje de grasa, calcula tus macros y observa tu progreso real." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Ver Historial" })
      ])
    ]));

    // 1. Calculadora Pro (Conectada a la Base de Datos)
    container.appendChild(proCalculatorCard());

    // 2. Calendario de Revisiones
    container.appendChild(buildCalendar());

    // 3. Gráfica de Tendencia
    if (weightsSorted().length > 0) {
      container.appendChild(weightCard());
    }
  }

  N.Health = { render };
})();
