/* =====================================================================
   OCTANAJE · Módulo Salud Pro & Diagnóstico Antropométrico Completo
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();
  function dayLabelFor(key) { 
    return DateUtil.parse(key).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); 
  }

  // ---------------- BASE DE DATOS Y PERFIL ----------------
  function health() {
    const s = Store.get();
    if (!s.health) s.health = { profile: {}, history: [], weights: [] };
    return s.health;
  }
  function profile() { 
    const pr = health().profile || {}; 
    if (!pr.goal) pr.goal = "maintain";
    if (!pr.pace) pr.pace = "moderate";
    return pr; 
  }
  function history() { return health().history || []; }
  function weights() { return health().weights || []; }
  function weightsSorted() { return weights().slice().sort((a, b) => a.date.localeCompare(b.date)); }

  // ---------------- MOSTRAR / OCULTAR INSTRUCCIONES ----------------
  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if (guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  };

  // ---------------- PROCESAR DIAGNÓSTICO Y GUARDAR ----------------
  window.processHealthCalculations = function() {
    const p = profile();
    
    // 1. Extraer entradas del formulario
    p.name = document.getElementById('calc-name').value || "Usuario";
    p.sex = document.getElementById('calc-gender').value === 'male' ? 'M' : 'F';
    p.age = parseFloat(document.getElementById('calc-age').value) || 0;
    p.weight = parseFloat(document.getElementById('calc-weight').value) || 0;
    p.height = parseFloat(document.getElementById('calc-height').value) || 0;
    p.neck = parseFloat(document.getElementById('calc-neck').value) || 0;
    p.waist = parseFloat(document.getElementById('calc-waist').value) || 0;
    p.hip = parseFloat(document.getElementById('calc-hip').value) || 0;
    p.activity = document.getElementById('calc-activity').value;
    p.goal = document.getElementById('calc-goal').value;
    p.pace = document.getElementById('calc-pace').value;

    // Validación
    if (!p.weight || !p.height || !p.age || !p.neck || !p.waist) {
      if (Audio) Audio.play("error");
      toast({ icon: "⚠️", msg: "Completa peso, estatura, edad, cuello y cintura." });
      return;
    }
    if (p.sex === 'F' && !p.hip) {
      if (Audio) Audio.play("error");
      toast({ icon: "⚠️", msg: "Las mujeres requieren la medida de cadera." });
      return;
    }

    // 2. Cálculos Nutricionales y Antropométricos
    // TMB (Mifflin-St Jeor)
    let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
    const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const get = tmb * (actFactors[p.activity] || 1.2);

    // Grasa US Navy
    let bf = 0;
    if (p.sex === 'M') {
      const diff = p.waist - p.neck;
      if (diff > 0) bf = (495 / (1.0324 - (0.19077 * Math.log10(diff)) + (0.15456 * Math.log10(p.height)))) - 450;
    } else {
      const sum = p.waist + p.hip - p.neck;
      if (sum > 0) bf = (495 / (1.29579 - (0.35004 * Math.log10(sum)) + (0.22100 * Math.log10(p.height)))) - 450;
    }
    bf = Math.max(3, Math.min(60, bf));
    p.lastFat = bf.toFixed(1);

    const icc = p.hip > 0 ? (p.waist / p.hip).toFixed(2) : "0.00";
    const imc = p.weight / ((p.height / 100) * (p.height / 100));

    // 3. Registrar en Historial
    const entry = {
      id: Store.uid(), date: today(), name: p.name,
      sex: p.sex, age: p.age, weight: p.weight, height: p.height, activity: p.activity, goal: p.goal, pace: p.pace,
      neck: p.neck, waist: p.waist, hip: p.hip, fatPct: p.lastFat, icc: icc,
      imc: Math.round(imc * 10) / 10, geb: Math.round(tmb), get: Math.round(get)
    };

    const arr = history();
    const existingIdx = arr.findIndex(x => x.date === today());
    if (existingIdx >= 0) arr.splice(existingIdx, 1);
    arr.unshift(entry);
    
    Store.commit();

    if (Audio) Audio.play("levelup");
    if (Gami) Gami.award(5, "Diagnóstico Pro Guardado 🔬");
    toast({ icon: "💾", title: "Diagnóstico Guardado", msg: "Revisa tu plan nutricional ajustado." });

    // Redibujar
    render(document.getElementById('view-health'), true);
  };

  // ---------------- APLICAR METAS DIRECTO A ALIMENTACIÓN ----------------
  window.syncWithNutrition = function(kcal, prot, fat, carbs) {
    if (N.Nutrition && N.Nutrition.setGoals) {
      N.Nutrition.setGoals({ kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carbs), fat: Math.round(fat) });
      if (Audio) Audio.play("levelup");
      toast({ 
        icon: "🎯", 
        title: "¡Metas sincronizadas!", 
        msg: `${Math.round(kcal)} kcal · ${Math.round(prot)}g Prot · ${Math.round(carbs)}g Carbos · ${Math.round(fat)}g Grasas configuradas en Alimentación.` 
      });
    } else {
      if (Audio) Audio.play("error");
      toast({ icon: "⚠️", msg: "No se encontró el módulo de Alimentación activo." });
    }
  };

  // ---------------- COMPONENTE GRÁFICO PRO ----------------
  function proCalculatorCard() {
    const p = profile();
    
    const selM = p.sex === 'M' ? 'selected' : '';
    const selF = p.sex === 'F' ? 'selected' : '';
    const act = (val) => p.activity === val ? 'selected' : '';
    const gl = (val) => p.goal === val ? 'selected' : '';
    const pc = (val) => p.pace === val ? 'selected' : '';

    let resultsHTML = "";
    let displayStyle = "none";

    if (p.weight && p.height && p.neck && p.waist && p.age) {
      // 1. Energía y Grasa
      let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
      tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
      const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      const get = tmb * (actFactors[p.activity] || 1.2);
      
      const bfPct = parseFloat(p.lastFat) || 0;
      const fatKg = p.weight * (bfPct / 100);
      const leanKg = p.weight - fatKg;

      // 2. Ajuste según el Objetivo (Déficit / Superávit)
      let planKcal = get;
      let goalLabel = "Mantenimiento";
      if (p.goal === "lose") {
        const deficit = p.pace === "slow" ? 250 : p.pace === "moderate" ? 500 : 750;
        planKcal = Math.max(tmb * 1.2, get - deficit); // No bajar de un límite seguro
        goalLabel = "Déficit Calórico";
      } else if (p.goal === "gain") {
        const surplus = p.pace === "slow" ? 200 : p.pace === "moderate" ? 350 : 500;
        planKcal = get + surplus;
        goalLabel = "Superávit Calórico";
      }
      
      // 3. Macros
      const protPerKg = p.goal === "lose" ? 2.2 : p.goal === "gain" ? 2.0 : 1.8;
      const protG = Math.round(p.weight * protPerKg);
      const fatG = Math.round((planKcal * 0.25) / 9);
      const carbsG = Math.max(0, Math.round((planKcal - (protG * 4) - (fatG * 9)) / 4));
      
      // 4. Salud
      const icc = p.hip > 0 ? (p.waist / p.hip).toFixed(2) : "0.00";
      let riskLabel = "Bajo"; 
      let riskColor = "#00ff88";
      if ((p.sex === 'M' && icc > 0.90) || (p.sex === 'F' && icc > 0.85)) {
        riskLabel = "Elevado";
        riskColor = "#ff0055";
      }
      const waterLiters = (p.weight * 35 / 1000).toFixed(1);

      displayStyle = "block";
      resultsHTML = `
        <div style="border-top: 1px dashed rgba(0,243,255,0.3); margin-top: 20px; padding-top: 20px;">
          <h4 style="color: #00f3ff; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
            📊 Diagnóstico y Plan Pro
          </h4>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 15px;">
            
            <div style="background: rgba(255, 0, 85, 0.08); border: 1px solid rgba(255, 0, 85, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">Grasa Corporal</span>
              <span style="font-size: 32px; font-weight: 800; color: #ff0055; line-height: 1;">${bfPct}%</span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 6px;">${fatKg.toFixed(1)} kg de grasa</span>
            </div>

            <div style="background: rgba(0, 255, 136, 0.08); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">Índice (ICC)</span>
              <span style="font-size: 32px; font-weight: 800; color: ${riskColor}; line-height: 1;">${icc}</span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 6px;">Riesgo: ${riskLabel}</span>
            </div>

            <div style="background: rgba(255, 176, 32, 0.08); border: 1px solid rgba(255, 176, 32, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">${goalLabel}</span>
              <span style="font-size: 32px; font-weight: 800; color: #ffb020; line-height: 1;">${Math.round(planKcal)}</span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 6px;">kcal/día sugeridas</span>
            </div>

            <div style="background: rgba(0, 136, 255, 0.08); border: 1px solid rgba(0, 136, 255, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">Agua Diaria</span>
              <span style="font-size: 32px; font-weight: 800; color: #0088ff; line-height: 1;">${waterLiters}<span style="font-size: 18px;">L</span></span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 6px;">Mínimo sugerido</span>
            </div>
          </div>

          <div style="background: #1a1f35; border-radius: 10px; padding: 14px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #aaa;">🥩 Proteínas: <strong style="color:#fff;">${protG}g</strong></span>
              <span style="font-size: 12px; color: #aaa;">🥑 Grasas: <strong style="color:#fff;">${fatG}g</strong></span>
              <span style="font-size: 12px; color: #aaa;">🍚 Carbos: <strong style="color:#fff;">${carbsG}g</strong></span>
            </div>
            <div style="font-size: 12px; color: #888; border-top: 1px solid #2a314d; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between;">
              <span>Gasto Total (GET) para mantener peso:</span>
              <strong style="color: #fff;">${Math.round(get)} kcal</strong>
            </div>
          </div>

          <button type="button" onclick="syncWithNutrition(${planKcal}, ${protG}, ${fatG}, ${carbsG})" 
                  style="width: 100%; padding: 12px; background: linear-gradient(135deg, #00f3ff, #0088ff); color: #000; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 243, 255, 0.2);">
            📥 Aplicar metas de tu plan a Alimentación
          </button>
        </div>
      `;
    }

    const div = document.createElement('div');
    div.id = "pro-calc-card"; 
    div.innerHTML = `
      <div class="card mb-16" style="padding: 16px; border-radius: 12px; border: 1px solid #00f3ff; background: #111424; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="color: #00f3ff; margin: 0; font-size: 16px; display: flex; align-items: center; gap: 6px;">
            🔬 Evaluación Antropométrica Pro
          </h3>
          <button type="button" onclick="toggleInstructions()" class="btn-secondary" style="font-size: 12px; background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 4px 8px; border-radius: 5px; cursor: pointer;">
            📖 ¿Cómo medirme?
          </button>
        </div>

        <div id="measure-guide" style="display: none; background: rgba(0,255,255,0.05); border-left: 3px solid #00f3ff; padding: 12px; margin-bottom: 15px; font-size: 12px; color: #ccc; border-radius: 4px; line-height: 1.5;">
          <strong>📍 Cuello:</strong> Por debajo de la nuez de Adán. Cinta horizontal.<br>
          <strong>📍 Cintura (Hombres):</strong> Exactamente a la altura del ombligo.<br>
          <strong>📍 Cintura (Mujeres):</strong> Parte más estrecha del torso (arriba del ombligo).<br>
          <strong>📍 Cadera:</strong> Talones juntos, parte más ancha de los glúteos.<br>
        </div>
        
        <div class="grid cols-2 gap-8 mb-16">
          <label class="fs-12 text-faint" style="grid-column: span 2;">Tu Nombre: 
            <input class="input mt-4" type="text" id="calc-name" placeholder="Ej. Juan Pérez" value="${p.name || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint">Sexo: 
            <select class="input mt-4" id="calc-gender" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;">
              <option value="male" ${selM}>Hombre</option>
              <option value="female" ${selF}>Mujer</option>
            </select>
          </label>
          <label class="fs-12 text-faint">Edad (años): 
            <input class="input mt-4" type="number" id="calc-age" placeholder="25" value="${p.age || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint">Peso (kg): 
            <input class="input mt-4" type="number" id="calc-weight" step="0.1" placeholder="75.5" value="${p.weight || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint">Altura (cm): 
            <input class="input mt-4" type="number" id="calc-height" placeholder="175" value="${p.height || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint">Cuello (cm): 
            <input class="input mt-4" type="number" id="calc-neck" step="0.5" placeholder="38" value="${p.neck || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint">Cintura (cm): 
            <input class="input mt-4" type="number" id="calc-waist" step="0.5" placeholder="85" value="${p.waist || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          <label class="fs-12 text-faint" style="grid-column: span 2;">Cadera (cm) <span style="font-size:10px; color:#ff0055;">(Obligatorio en Mujeres)</span>: 
            <input class="input mt-4" type="number" id="calc-hip" step="0.5" placeholder="95" value="${p.hip || ''}" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;" />
          </label>
          
          <label class="fs-12 text-faint" style="grid-column: span 2; border-top: 1px solid #333; padding-top: 15px; margin-top: 5px;">Nivel de Actividad Física: 
            <select class="input mt-4" id="calc-activity" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;">
              <option value="sedentary" ${act('sedentary')}>Sedentario (Poco o nulo ejercicio)</option>
              <option value="light" ${act('light')}>Ligero (1-3 días/semana)</option>
              <option value="moderate" ${act('moderate')}>Moderado (3-5 días/semana)</option>
              <option value="active" ${act('active')}>Activo (6-7 días/semana)</option>
              <option value="very_active" ${act('very_active')}>Atleta / Trabajo muy físico</option>
            </select>
          </label>
          <label class="fs-12 text-faint">🎯 Objetivo: 
            <select class="input mt-4" id="calc-goal" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;">
              <option value="lose" ${gl('lose')}>📉 Bajar de peso (Grasa)</option>
              <option value="maintain" ${gl('maintain')}>⚖️ Mantener peso</option>
              <option value="gain" ${gl('gain')}>📈 Subir masa muscular</option>
            </select>
          </label>
          <label class="fs-12 text-faint">Ritmo: 
            <select class="input mt-4" id="calc-pace" style="width:100%; padding:8px; background:#1a1f35; color:white; border:none; border-radius:6px;">
              <option value="slow" ${pc('slow')}>Lento y sostenible</option>
              <option value="moderate" ${pc('moderate')}>Moderado (Recomendado)</option>
              <option value="aggressive" ${pc('aggressive')}>Agresivo (Rápido)</option>
            </select>
          </label>
        </div>

        <button type="button" onclick="processHealthCalculations()" class="btn primary block mb-16" 
                style="width: 100%; padding: 12px; background: #00f3ff; color: #000; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">
          💾 Calcular y Guardar Diagnóstico
        </button>

        <div id="health-results" style="display:${displayStyle};">
          ${resultsHTML}
        </div>

        <div style="margin-top: 20px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border-left: 2px solid #888; font-size: 11px; color: #888; line-height: 1.4;">
          ⚠️ <strong>Aviso informativo:</strong> Los resultados calculados son estimaciones matemáticas basadas en fórmulas deportivas estándar para fines de seguimiento personal. No constituyen un diagnóstico clínico ni una prescripción médica. Ante cualquier condición de salud, por favor consulta a un médico o nutriólogo certificado.
        </div>

      </div>
    `;
    return div.firstElementChild;
  }

  // ---------------- UI ORIGINAL: HISTORIAL Y CALENDARIO ----------------
  function historyRow(h) {
    const dLbl = dayLabelFor(h.date);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: h.weight + " kg" }),
          h.fatPct ? el("span", { class: "chip bad", text: "Grasa: " + h.fatPct + "%" }) : null,
          el("span", { class: "text-faint fs-12", text: "GET: " + (h.get || 0) + " kcal" })
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar revisión", "¿Eliminar el registro del " + dLbl + "?", () => {
          const arr = history(); const i = arr.indexOf(h); if (i >= 0) arr.splice(i, 1);
          Store.commit(); if (Audio) Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); openHistory();
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
  };

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
      if (Charts && series.length) Charts.line(cv, {
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
    
    // Escudo: Evita que el teclado borre el formulario
    if (!forceRender && container.querySelector('#pro-calc-card')) return;

    container.innerHTML = "";
    
    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("heart") : "❤️", "Salud y Avance"]),
        el("p", { class: "view-desc", text: "Diagnóstico corporal avanzado, gasto calórico y plan de macros." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [
        el("button", { class: "btn", onclick: openHistory, html: "📖 Ver Historial" })
      ])
    ]));

    // 1. Calculadora Pro Gráfica
    container.appendChild(proCalculatorCard());

    // 2. Calendario
    container.appendChild(buildCalendar());

    // 3. Gráfica de Tendencia de Peso
    if (weightsSorted().length > 0) {
      container.appendChild(weightCard());
    }
  }

  N.Health = { render };
})();
