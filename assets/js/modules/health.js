/* =====================================================================
   OCTANAJE · Módulo Salud Pro (Mira de Precisión & UI Optimizada)
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

  // ---------------- RANGOS DE GRASA Y COLOR DINÁMICO ----------------
  function getBfLevel(pct, gender) {
    if (gender === 'M') {
      if (pct >= 25) return { label: "Elevado", color: "#ff0055" };
      if (pct >= 18) return { label: "Aceptable", color: "#ffb020" };
      if (pct >= 14) return { label: "Saludable", color: "#00ff88" };
      if (pct >= 6)  return { label: "Fitness / Atleta", color: "#00f3ff" };
      return { label: "Esencial", color: "#bc84ee" };
    } else {
      if (pct >= 32) return { label: "Elevado", color: "#ff0055" };
      if (pct >= 25) return { label: "Aceptable", color: "#ffb020" };
      if (pct >= 21) return { label: "Saludable", color: "#00ff88" };
      if (pct >= 14) return { label: "Fitness / Atleta", color: "#00f3ff" };
      return { label: "Esencial", color: "#bc84ee" };
    }
  }

  // ---------------- ESTADO DEL CALENDARIO ----------------
  let currentCal = new Date();
  window.changeCalMonth = function(delta) {
    currentCal.setMonth(currentCal.getMonth() + delta);
    if (N.Health && N.Health.render) {
      N.Health.render(document.getElementById('view-health'), true);
    }
  };

  // ---------------- ACCIONES SUPERIORES ----------------
  window.scheduleWeighIn = function() {
    const title = encodeURIComponent("Revisión Antropométrica (OCTANAJE)");
    const details = encodeURIComponent("Es hora de registrar tu peso y medidas en la app OCTANAJE.");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(url, '_blank');
  };

  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if (guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  };

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
    if (!pr.sex) pr.sex = "M";
    return pr; 
  }
  function history() { return health().history || []; }
  function weights() { return health().weights || []; }
  function weightsSorted() { return weights().slice().sort((a, b) => a.date.localeCompare(b.date)); }

  // ---------------- ESCALAS CLÍNICAS (IMC) ----------------
  const IMC_RANGES = [
    { max: 18.5, label: "Bajo peso", color: "#00f3ff" },
    { max: 25.0, label: "Normal", color: "#00ff88" },
    { max: 30.0, label: "Sobrepeso", color: "#ffb020" },
    { max: 35.0, label: "Obesidad I", color: "#ff5470" },
    { max: 40.0, label: "Obesidad II", color: "#ff0055" },
    { max: Infinity, label: "Obesidad III", color: "#cc0000" }
  ];
  function getImcClass(imc) { return IMC_RANGES.find((r) => imc < r.max) || IMC_RANGES[IMC_RANGES.length - 1]; }

  // ---------------- INTERFACES AUXILIARES ----------------
  window.toggleBfTable = function() {
    const table = document.getElementById('bf-ranges-table');
    if (table) table.style.display = table.style.display === 'none' ? 'block' : 'none';
  };

  window.handleGenderChange = function() {
    const genderSelect = document.getElementById('calc-gender');
    const hipContainer = document.getElementById('calc-hip-container');
    if (genderSelect && hipContainer) {
      hipContainer.style.display = genderSelect.value === 'female' ? 'block' : 'none';
    }
  };

  // ---------------- PROCESAR DIAGNÓSTICO ----------------
  window.processHealthCalculations = function() {
    const p = profile();
    p.name = document.getElementById('calc-name').value || "Usuario";
    p.sex = document.getElementById('calc-gender').value === 'male' ? 'M' : 'F';
    p.age = parseFloat(document.getElementById('calc-age').value) || 0;
    p.weight = parseFloat(document.getElementById('calc-weight').value) || 0;
    p.height = parseFloat(document.getElementById('calc-height').value) || 0;
    p.neck = parseFloat(document.getElementById('calc-neck').value) || 0;
    p.waist = parseFloat(document.getElementById('calc-waist').value) || 0;
    p.hip = p.sex === 'F' ? (parseFloat(document.getElementById('calc-hip').value) || 0) : 0;
    p.activity = document.getElementById('calc-activity').value;
    p.goal = document.getElementById('calc-goal').value;
    p.pace = document.getElementById('calc-pace').value;

    if (!p.weight || !p.height || !p.age || !p.neck || !p.waist) {
      if (Audio) Audio.play("error"); toast({ icon: "⚠️", msg: "Completa los datos obligatorios." }); return;
    }

    const h_in = p.height / 2.54, n_in = p.neck / 2.54, w_in = p.waist / 2.54, hip_in = p.hip / 2.54;
    let bf = 0;
    if (p.sex === 'M') {
      const diff = w_in - n_in;
      if (diff > 0) bf = 86.010 * Math.log10(diff) - 70.041 * Math.log10(h_in) + 36.76;
    } else {
      const sum = w_in + hip_in - n_in;
      if (sum > 0) bf = 163.205 * Math.log10(sum) - 97.684 * Math.log10(h_in) - 78.387;
    }
    bf = Math.max(3, Math.min(60, isNaN(bf) ? 20 : bf));
    p.lastFat = bf.toFixed(1);

    const imc = p.weight / ((p.height / 100) * (p.height / 100));
    const tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + (p.sex === 'F' ? -161 : 5);
    const get = tmb * ({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[p.activity] || 1.2);

    const entry = {
      id: Store.uid(), date: today(), name: p.name, sex: p.sex, age: p.age, weight: p.weight, fatPct: p.lastFat,
      imc: Math.round(imc * 10) / 10, geb: Math.round(tmb), get: Math.round(get)
    };

    const arr = history();
    const existingIdx = arr.findIndex(x => x.date === today());
    if (existingIdx >= 0) arr.splice(existingIdx, 1);
    arr.unshift(entry);
    Store.commit();
    if (Audio) Audio.play("levelup");
    toast({ icon: "💾", title: "Guardado", msg: "Diagnóstico actualizado con éxito." });
    render(document.getElementById('view-health'), true);
  };

  // ---------------- APLICAR METAS ----------------
  window.syncWithNutrition = function(kcal, prot, fat, carbs) {
    if (N.Nutrition && N.Nutrition.setGoals) {
      N.Nutrition.setGoals({ kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carbs), fat: Math.round(fat) });
      if (Audio) Audio.play("levelup");
      toast({ icon: "🎯", msg: `${Math.round(kcal)} kcal sincronizadas.` });
    }
  };

  // ---------------- COMPONENTE GRÁFICO PRO ----------------
  function proCalculatorCard() {
    const p = profile();
    const selM = p.sex === 'M' ? 'selected' : '', selF = p.sex === 'F' ? 'selected' : '';
    const act = (v) => p.activity === v ? 'selected' : '';
    const gl = (v) => p.goal === v ? 'selected' : '';
    const pc = (v) => p.pace === v ? 'selected' : '';

    let resultsHTML = "", displayStyle = "none";

    if (p.weight && p.height && p.neck && p.waist) {
      const bfPct = parseFloat(p.lastFat) || 0, bfInfo = getBfLevel(bfPct, p.sex);
      const fatKg = ((p.weight * bfPct) / 100).toFixed(1), leanKg = (p.weight - fatKg).toFixed(1);
      const imc = p.weight / ((p.height / 100) * (p.height / 100)), cat = getImcClass(imc);
      const tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + (p.sex === 'F' ? -161 : 5);
      const get = tmb * ({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[p.activity] || 1.2);
      
      let planKcal = get, goalLabel = "Mantenimiento";
      if (p.goal === "lose") { planKcal = get - (p.pace === "slow" ? 250 : p.pace === "moderate" ? 500 : 750); goalLabel = "Déficit Calórico"; }
      else if (p.goal === "gain") { planKcal = get + (p.pace === "slow" ? 200 : p.pace === "moderate" ? 350 : 500); goalLabel = "Superávit Muscular"; }
      
      const protG = Math.round(p.weight * (p.goal === "lose" ? 2.2 : 2.0)), fatG = Math.round((planKcal * 0.25) / 9);
      const carbsG = Math.max(0, Math.round((planKcal - (protG * 4) - (fatG * 9)) / 4));
      const water = (p.weight * 35 / 1000).toFixed(1);
      const pctImc = Math.max(0, Math.min(100, ((imc - 15) / (42 - 15)) * 100));

      displayStyle = "block";
      resultsHTML = `
        <div style="border-top: 1px dashed rgba(0,243,255,0.3); margin-top: 20px; padding-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h4 style="color: #00f3ff; margin: 0; font-size: 15px; text-transform: uppercase;">📊 Resultados</h4>
            <button type="button" onclick="toggleBfTable()" style="font-size: 11px; background: rgba(0,243,255,0.1); border: 1px solid #00f3ff; color: #00f3ff; padding: 4px 8px; border-radius: 5px; cursor: pointer;">📈 Ver Niveles</button>
          </div>

          <div id="bf-ranges-table" style="display: none; background: #1a1f35; border: 1px solid #00f3ff; border-radius: 10px; padding: 12px; margin-bottom: 18px; font-size: 12px; color: #ccc;">
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
              <thead><tr style="color: #aaa; border-bottom: 1px solid #333;"><th style="padding:5px;text-align:left">Categoría</th><th>Hombres</th><th>Mujeres</th></tr></thead>
              <tbody>
                <tr><td style="text-align:left;color:#bc84ee">Esencial</td><td>2-5%</td><td>10-13%</td></tr>
                <tr><td style="text-align:left;color:#00f3ff">Atleta</td><td>6-13%</td><td>14-20%</td></tr>
                <tr style="background:rgba(0,255,136,0.1);color:#00ff88"><td>Saludable</td><td>14-17%</td><td>21-24%</td></tr>
                <tr><td style="text-align:left;color:#ffb020">Aceptable</td><td>18-24%</td><td>25-31%</td></tr>
                <tr><td style="text-align:left;color:#ff0055">Elevado</td><td>25%+</td><td>32%+</td></tr>
              </tbody>
            </table>
          </div>

          <div class="grid cols-2 gap-8 mb-16">
            <div style="background:rgba(255,255,255,0.02); border: 2px solid ${bfInfo.color}; border-radius: 10px; padding: 12px; text-align: center;">
              <span style="font-size:10px; color:#aaa; text-transform:uppercase; display:block;">Grasa Corporal</span>
              <span style="font-size:28px; font-weight:900; color:${bfInfo.color}; line-height:1;">${bfPct}%</span>
              <span style="font-size:10px; color:${bfInfo.color}; font-weight:bold; display:block; margin:4px 0;">${bfInfo.label}</span>
              <span style="font-size:10px; color:#666;">${fatKg} kg grasa</span>
            </div>
            <div style="background:rgba(0,243,255,0.05); border:1px solid #00f3ff; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:10px; color:#aaa; text-transform:uppercase; display:block;">Masa Magra</span>
              <span style="font-size:28px; font-weight:900; color:#00f3ff; line-height:1;">${leanKg}<small style="font-size:14px">kg</small></span>
              <span style="font-size:10px; color:#666; display:block; margin-top:4px;">Músculo + Hueso</span>
            </div>
            <div style="background:rgba(255,176,32,0.08); border:1px solid #ffb020; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:10px; color:#aaa; text-transform:uppercase; display:block;">${goalLabel}</span>
              <span style="font-size:28px; font-weight:900; color:#ffb020; line-height:1;">${Math.round(planKcal)}</span>
              <span style="font-size:10px; color:#666; display:block; margin-top:4px;">kcal/día meta</span>
            </div>
            <div style="background:rgba(0,136,255,0.08); border:1px solid #0088ff; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:10px; color:#aaa; text-transform:uppercase; display:block;">Agua Diaria</span>
              <span style="font-size:28px; font-weight:900; color:#0088ff; line-height:1;">${water}<small style="font-size:14px">L</small></span>
              <span style="font-size:10px; color:#666; display:block; margin-top:4px;">Mínimo sugerido</span>
            </div>
          </div>

          <div style="background:#15192b; border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid #2a314d;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size:11px; color:#aaa; text-transform:uppercase;">Gasto Mantenimiento (GET):</span>
              <strong style="color:#ffb020; font-size:18px;">${Math.round(get)} kcal</strong>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center;">
              <div style="background:rgba(0,243,255,0.05); padding:8px; border-radius:8px;">
                <span style="font-size:9px; color:#888; display:block;">PROTEÍNA</span>
                <span style="font-size:18px; font-weight:bold; color:#00f3ff;">${protG}g</span>
              </div>
              <div style="background:rgba(255,176,32,0.05); padding:8px; border-radius:8px;">
                <span style="font-size:9px; color:#888; display:block;">GRASAS</span>
                <span style="font-size:18px; font-weight:bold; color:#ffb020;">${fatG}g</span>
              </div>
              <div style="background:rgba(0,255,136,0.05); padding:8px; border-radius:8px;">
                <span style="font-size:9px; color:#888; display:block;">CARBOS</span>
                <span style="font-size:18px; font-weight:bold; color:#00ff88;">${carbsG}g</span>
              </div>
            </div>
          </div>

          <div style="background:#15192b; border-radius:10px; padding:12px; margin-bottom:15px; border:1px solid #2a314d;">
             <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-size:12px; color:#ccc;">Índice de Masa Corporal (IMC)</span>
                <strong style="color:${cat.color}">${imc.toFixed(1)} <small>(${cat.label})</small></strong>
             </div>
             <div style="position:relative; height:8px; background:linear-gradient(90deg, #00f3ff 0%, #00ff88 25%, #ffb020 50%, #ff0055 100%); border-radius:4px;">
                <div style="position:absolute; top:-12px; left:${pctImc}%; transform:translateX(-50%); color:#fff; font-size:12px;">▼</div>
             </div>
          </div>

          <button type="button" onclick="syncWithNutrition(${planKcal}, ${protG}, ${fatG}, ${carbsG})" 
                  style="width:100%; padding:14px; background:linear-gradient(135deg, #00f3ff, #0088ff); color:#000; border:none; border-radius:8px; font-weight:900; font-size:13px; cursor:pointer; text-transform:uppercase;">
            🚀 Aplicar metas a Alimentación
          </button>
        </div>
      `;
    }

    const hipDisplay = p.sex === 'F' ? 'block' : 'none';
    const div = document.createElement('div');
    div.id = "pro-calc-card"; 
    div.innerHTML = `
      <div class="card mb-16" style="padding:16px; border-radius:12px; border:1px solid #00f3ff; background:#111424;">
        <h3 style="color:#00f3ff; margin:0 0 15px 0; font-size:16px; text-align:center; display:flex; justify-content:center; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:1px;">
          <i class="fa-solid fa-crosshairs"></i> Evaluación Antropométrica Pro
        </h3>

        <div id="measure-guide" style="display:none; background:rgba(0,255,255,0.05); border-left:3px solid #00f3ff; padding:12px; margin-bottom:15px; font-size:12px; color:#ccc; line-height:1.5;">
          <strong>📍 Cuello:</strong> Bajo la nuez de Adán.<br><strong>📍 Cintura:</strong> Altura del ombligo (H) / Parte estrecha (M).<br><strong>📍 Cadera:</strong> Parte más ancha de glúteos.
        </div>
        
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
          <input type="text" id="calc-name" value="${p.name || ''}" placeholder="Tu Nombre" style="width:100%; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          <div style="display:flex; gap:10px;">
            <select id="calc-gender" onchange="handleGenderChange()" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;"><option value="male" ${p.sex==='M'?'selected':''}>Hombre</option><option value="female" ${p.sex==='F'?'selected':''}>Mujer</option></select>
            <input type="number" id="calc-age" value="${p.age || ''}" placeholder="Edad" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          </div>
          <div style="display:flex; gap:10px;">
            <input type="number" id="calc-weight" step="0.1" value="${p.weight || ''}" placeholder="Peso kg" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            <input type="number" id="calc-height" value="${p.height || ''}" placeholder="Estatura cm" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          </div>
          <div style="display:flex; gap:10px;">
            <input type="number" id="calc-neck" step="0.5" value="${p.neck || ''}" placeholder="Cuello cm" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            <input type="number" id="calc-waist" step="0.5" value="${p.waist || ''}" placeholder="Cintura cm" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          </div>
          <div id="calc-hip-container" style="display:${hipDisplay};"><input type="number" id="calc-hip" step="0.5" value="${p.hip || ''}" placeholder="Cadera cm (Solo Mujeres)" style="width:100%; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" /></div>
          <select id="calc-activity" style="width:100%; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;"><option value="sedentary" ${act('sedentary')}>Sedentario</option><option value="light" ${act('light')}>Ligero</option><option value="moderate" ${act('moderate')}>Moderado</option><option value="active" ${act('active')}>Activo</option><option value="very_active" ${act('very_active')}>Atleta</option></select>
          <div style="display:flex; gap:10px;">
            <select id="calc-goal" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;"><option value="lose" ${gl('lose')}>Bajar Grasa</option><option value="maintain" ${gl('maintain')}>Mantener</option><option value="gain" ${gl('gain')}>Subir Músculo</option></select>
            <select id="calc-pace" style="flex:1; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;"><option value="slow" ${pc('slow')}>Lento</option><option value="moderate" ${pc('moderate')}>Ideal</option><option value="aggressive" ${pc('aggressive')}>Rápido</option></select>
          </div>
        </div>
        <button type="button" onclick="processHealthCalculations()" style="width:100%; padding:14px; background:#00f3ff; color:#000; font-weight:900; border:none; border-radius:8px; cursor:pointer;">💾 CALCULAR Y GUARDAR</button>
        <div id="health-results" style="display:${displayStyle};">${resultsHTML}</div>
        <div style="margin-top:20px; padding:10px; background:rgba(255,255,255,0.03); border-radius:6px; border-left:2px solid #888; font-size:10px; color:#888; line-height:1.4;">
          ⚠️ <strong>Aviso Informativo:</strong> Los cálculos aquí mostrados son estimaciones basadas en fórmulas deportivas estándar (Mifflin-St Jeor / Marina de EE. UU.) para uso personal y educativo. No sustituyen un diagnóstico clínico o médico.
        </div>
      </div>
    `;
    return div.firstElementChild;
  }

  // ---------------- UI HISTORIAL Y CALENDARIO ----------------
  function historyRow(h) {
    const dLbl = dayLabelFor(h.date), bfInfo = getBfLevel(parseFloat(h.fatPct||0), h.sex);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: h.weight + " kg" }),
          h.fatPct ? el("span", { class: "chip", style: `background:${bfInfo.color};color:#000;font-weight:bold`, text: h.fatPct + "% (" + bfInfo.label + ")" }) : null
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", onclick: () => {
        UI.confirmBox("Eliminar", "¿Borrar registro del " + dLbl + "?", () => {
          const arr = history(), i = arr.indexOf(h); if (i >= 0) arr.splice(i, 1);
          Store.commit(); render(document.getElementById("view-health"), true);
        });
      } })
    ]);
  }

  function openDayDetail(key) {
    const items = history().filter(h => h.date === key);
    const body = el("div", {});
    if (!items.length) body.appendChild(el("div", { class: "empty", text: "Sin revisiones." }));
    else items.forEach(h => body.appendChild(historyRow(h)));
    UI.openModal("📅 " + key, body);
  }

  function buildCalendar() {
    const y = currentCal.getFullYear(), mo = currentCal.getMonth(), monthLabel = currentCal.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const grid = el("div", { class: "cal" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach(h => grid.appendChild(el("div", { class: "cal-h", text: h })));
    const startCol = (new Date(y, mo, 1).getDay() + 6) % 7;
    for (let i = 0; i < startCol; i++) grid.appendChild(el("div", { class: "cal-day empty" }));
    for (let d = 1; d <= new Date(y, mo+1, 0).getDate(); d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      let cls = "cal-day" + (key === today() ? " today" : "") + (history().some(h => h.date === key) ? " done" : "");
      grid.appendChild(el("div", { class: cls + " clickable", text: String(d), onclick: () => openDayDetail(key) }));
    }
    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "border-bottom: 1px solid var(--border); padding-bottom:10px; margin-bottom:10px;" }, [
        el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%;" }, [
          el("button", { html: "◀", class: "icon-btn", onclick: () => window.changeCalMonth(-1) }),
          el("span", { text: monthLabel, style: "text-transform:capitalize; font-weight:bold; color:var(--accent);" }),
          el("button", { html: "▶", class: "icon-btn", onclick: () => window.changeCalMonth(1) })
        ])
      ]),
      grid
    ]);
  }

  function render(container, forceRender = false) {
    if (!container || (!forceRender && container.querySelector('#pro-calc-card'))) return;
    container.innerHTML = "";
    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("heart") : "❤️", "Salud"]),
        el("p", { class: "view-desc", text: "Diagnóstico corporal y nutrición." })
      ]),
      el("div", { class: "flex gap-4", style: "flex-wrap:wrap; margin-top: 10px;" }, [
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px;", onclick: () => {
          const list = history().slice().sort((a,b)=>b.date.localeCompare(a.date));
          const body = el("div", {});
          if (!list.length) body.appendChild(el("div", { class: "empty", text: "Sin análisis." }));
          else list.forEach(h => body.appendChild(historyRow(h)));
          UI.openModal("📖 Historial", body);
        }, html: "📖 Historial" }),
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px; background:rgba(0,243,255,0.1); border:1px solid #00f3ff; color:#00f3ff;", onclick: scheduleWeighIn, html: "📅 Agendar" }),
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.05); border:1px solid #888; color:#ccc;", onclick: toggleInstructions, html: "📖 Guía" })
      ])
    ]));
    container.appendChild(proCalculatorCard());
    container.appendChild(buildCalendar());
    if (weightsSorted().length > 0) {
      const cv = el("canvas"), chartWrap = el("div", { class: "chart-box" }, [cv]), series = weightsSorted().slice(-30);
      setTimeout(() => { if (Charts) Charts.line(cv, { values: series.map(w => w.weight), labels: series.map(w => w.date.slice(-2)) }, { color: "--accent", height: 170 }); }, 30);
      container.appendChild(el("div", { class: "card mb-16" }, [el("div", { class: "card-head" }, [el("div", { class: "card-title", text: "⚖️ Tendencia" })]), chartWrap]));
    }
  }

  N.Health = { render };
})();
