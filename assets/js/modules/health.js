/* =====================================================================
   OCTANAJE · Módulo Salud Pro (Fórmula Matemática Corregida - U.S. Navy)
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
      if (pct >= 25) return { label: "Obesidad", color: "#ff0055" };
      if (pct >= 18) return { label: "Promedio", color: "#ffb020" };
      if (pct >= 14) return { label: "Saludable", color: "#00ff88" };
      if (pct >= 6)  return { label: "Fitness / Atleta", color: "#00f3ff" };
      return { label: "Esencial", color: "#bc84ee" };
    } else {
      if (pct >= 32) return { label: "Obesidad", color: "#ff0055" };
      if (pct >= 25) return { label: "Promedio", color: "#ffb020" };
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

  // ---------------- INTERFACES Y BOTONES DESPLEGABLES ----------------
  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if (guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
  };

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

  // ---------------- PROCESAR DIAGNÓSTICO Y GUARDAR (FÓRMULAS CORREGIDAS) ----------------
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
      if (Audio) Audio.play("error"); toast({ icon: "⚠️", msg: "Completa peso, estatura, edad, cuello y cintura." }); return;
    }
    if (p.sex === 'F' && !p.hip) {
      if (Audio) Audio.play("error"); toast({ icon: "⚠️", msg: "Las mujeres requieren la medida de cadera." }); return;
    }

    // 1. TMB (Mifflin-St Jeor - Esta fórmula sí es en cm y kg)
    let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
    const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const get = tmb * (actFactors[p.activity] || 1.2);

    // 2. Porcentaje de Grasa (U.S. Navy Method)
    // ¡CORRECCIÓN CRÍTICA! Convertimos cm a pulgadas antes de usar los logaritmos
    const h_in = p.height / 2.54;
    const n_in = p.neck / 2.54;
    const w_in = p.waist / 2.54;
    const hip_in = p.hip / 2.54;

    let bf = 0;
    if (p.sex === 'M') {
      const diff = w_in - n_in;
      if (diff > 0) {
        bf = 86.010 * Math.log10(diff) - 70.041 * Math.log10(h_in) + 36.76;
      }
    } else {
      const sum = w_in + hip_in - n_in;
      if (sum > 0) {
        bf = 163.205 * Math.log10(sum) - 97.684 * Math.log10(h_in) - 78.387;
      }
    }
    // Aseguramos límites biológicos lógicos
    bf = Math.max(3, Math.min(60, isNaN(bf) ? 20 : bf));
    p.lastFat = bf.toFixed(1);

    const icc = p.sex === 'F' && p.hip > 0 ? (p.waist / p.hip).toFixed(2) : ((p.waist / p.height).toFixed(2));
    const imc = p.weight / ((p.height / 100) * (p.height / 100));

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
    toast({ icon: "💾", title: "Cálculo Exitoso", msg: "Tus métricas de grasa han sido ajustadas." });

    render(document.getElementById('view-health'), true);
  };

  // ---------------- APLICAR METAS DIRECTO A ALIMENTACIÓN ----------------
  window.syncWithNutrition = function(kcal, prot, fat, carbs) {
    if (N.Nutrition && N.Nutrition.setGoals) {
      N.Nutrition.setGoals({ kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carbs), fat: Math.round(fat) });
      if (Audio) Audio.play("levelup");
      toast({ 
        icon: "🎯", title: "¡Metas sincronizadas!", 
        msg: `${Math.round(kcal)} kcal aplicadas en tu plan de Alimentación.` 
      });
    } else {
      if (Audio) Audio.play("error"); toast({ icon: "⚠️", msg: "No se encontró el módulo de Alimentación." });
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
      let tmb = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
      tmb = p.sex === 'F' ? tmb - 161 : tmb + 5;
      const actFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
      const get = tmb * (actFactors[p.activity] || 1.2);
      
      const bfPct = parseFloat(p.lastFat) || 0;
      const bfInfo = getBfLevel(bfPct, p.sex);
      const fatKg = ((p.weight * bfPct) / 100).toFixed(1);
      const leanKg = (p.weight - fatKg).toFixed(1);

      let planKcal = get;
      let goalLabel = "Mantenimiento";
      if (p.goal === "lose") {
        const deficit = p.pace === "slow" ? 250 : p.pace === "moderate" ? 500 : 750;
        planKcal = Math.max(tmb * 1.2, get - deficit); 
        goalLabel = "Déficit Calórico";
      } else if (p.goal === "gain") {
        const surplus = p.pace === "slow" ? 200 : p.pace === "moderate" ? 350 : 500;
        planKcal = get + surplus;
        goalLabel = "Superávit Muscular";
      }
      
      const protPerKg = p.goal === "lose" ? 2.2 : p.goal === "gain" ? 2.0 : 1.8;
      const protG = Math.round(p.weight * protPerKg);
      const fatG = Math.round((planKcal * 0.25) / 9);
      const carbsG = Math.max(0, Math.round((planKcal - (protG * 4) - (fatG * 9)) / 4));
      
      let iccVal = p.sex === 'F' && p.hip > 0 ? (p.waist / p.hip).toFixed(2) : (p.waist / p.height).toFixed(2);
      let riskLabel = "Bajo"; let riskColor = "#00ff88";
      if (p.sex === 'F' && iccVal > 0.85) { riskLabel = "Elevado"; riskColor = "#ff0055"; }
      if (p.sex === 'M' && iccVal > 0.53) { riskLabel = "Elevado"; riskColor = "#ff0055"; } 

      const waterLiters = (p.weight * 35 / 1000).toFixed(1);
      const imc = p.weight / ((p.height / 100) * (p.height / 100));
      const cat = getImcClass(imc);
      const minImc = 15, maxImc = 42;
      const pctImc = Math.max(0, Math.min(100, ((imc - minImc) / (maxImc - minImc)) * 100));
      const gradient = `linear-gradient(90deg, #00f3ff 0%, #00f3ff 13%, #00ff88 13%, #00ff88 37%, #ffb020 37%, #ffb020 55%, #ff5470 55%, #ff5470 74%, #ff0055 74%, #ff0055 100%)`;

      displayStyle = "block";
      resultsHTML = `
        <div style="border-top: 1px dashed rgba(0,243,255,0.3); margin-top: 20px; padding-top: 20px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
            <h4 style="color: #00f3ff; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">📊 Resultados y Plan Pro</h4>
            <button type="button" onclick="toggleBfTable()" style="font-size: 11px; background: rgba(0,243,255,0.1); border: 1px solid #00f3ff; color: #00f3ff; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">
              📈 Ver Niveles
            </button>
          </div>

          <div id="bf-ranges-table" style="display: none; background: #1a1f35; border: 1px solid #00f3ff; border-radius: 10px; padding: 12px; margin-bottom: 18px; font-size: 12px; color: #ccc; box-shadow: 0 5px 15px rgba(0,0,0,0.4);">
            <div style="font-size: 12px; color: #00f3ff; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; text-align: center;">📈 Referencia: Rangos de Grasa Corporal</div>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; color: #ccc;">
              <thead>
                <tr style="border-bottom: 1px solid #333; color: #aaa;">
                  <th style="padding: 6px; text-align: left;">Categoría</th>
                  <th style="padding: 6px;">Hombres</th>
                  <th style="padding: 6px;">Mujeres</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);"><td style="padding: 6px; text-align: left; color: #bc84ee;">Grasa Esencial</td><td>2% - 5%</td><td>10% - 13%</td></tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);"><td style="padding: 6px; text-align: left; color: #00f3ff;">Atletas</td><td>6% - 13%</td><td>14% - 20%</td></tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(0,255,136,0.05);"><td style="padding: 6px; text-align: left; color: #00ff88; font-weight: bold;">Saludable</td><td style="padding: 6px; font-weight: bold; color: #00ff88;">14% - 17%</td><td style="padding: 6px; font-weight: bold; color: #00ff88;">21% - 24%</td></tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);"><td style="padding: 6px; text-align: left; color: #ffb020;">Promedio</td><td>18% - 24%</td><td>25% - 31%</td></tr>
                <tr><td style="padding: 6px; text-align: left; color: #ff0055;">Obesidad</td><td>25%+</td><td>32%+</td></tr>
              </tbody>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 15px;">
            <div style="background: rgba(255, 255, 255, 0.02); border: 2px solid ${bfInfo.color}; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">Grasa Corporal</span>
              <span style="font-size: 32px; font-weight: 900; color: ${bfInfo.color}; line-height: 1; text-shadow: 0 0 12px ${bfInfo.color}88;">${bfPct}%</span>
              <span style="font-size: 11px; color: ${bfInfo.color}; display: block; margin-top: 6px; font-weight: bold;">${bfInfo.label}</span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 3px;">${fatKg} kg de grasa</span>
            </div>
            <div style="background: rgba(0, 243, 255, 0.05); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">Masa Magra</span>
              <span style="font-size: 32px; font-weight: 900; color: #00f3ff; line-height: 1; text-shadow: 0 0 10px rgba(0,243,255,0.4);">${leanKg}<span style="font-size: 18px;">kg</span></span>
              <span style="font-size: 11px; color: #888; display: block; margin-top: 6px;">Músculo + Hueso</span>
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

          <div style="background: #15192b; border-radius: 14px; padding: 18px; margin-bottom: 15px; border: 1px solid rgba(0, 243, 255, 0.3); box-shadow: inset 0 0 15px rgba(0,243,255,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a314d; padding-bottom: 12px; margin-bottom: 14px;">
              <span style="font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Gasto Total (Mantenimiento):</span>
              <strong style="color: #ffb020; font-size: 20px; font-weight: 900; text-shadow: 0 0 10px rgba(255,176,32,0.4);">${Math.round(get)} kcal</strong>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
              <div style="background: rgba(0, 243, 255, 0.05); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 10px; padding: 12px 6px;">
                <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">🥩 Proteína</span>
                <span style="font-size: 26px; font-weight: 900; color: #00f3ff; text-shadow: 0 0 10px rgba(0,243,255,0.5);">${protG}<span style="font-size: 14px;">g</span></span>
              </div>
              <div style="background: rgba(255, 176, 32, 0.05); border: 1px solid rgba(255, 176, 32, 0.2); border-radius: 10px; padding: 12px 6px;">
                <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">🥑 Grasas</span>
                <span style="font-size: 26px; font-weight: 900; color: #ffb020; text-shadow: 0 0 10px rgba(255,176,32,0.5);">${fatG}<span style="font-size: 14px;">g</span></span>
              </div>
              <div style="background: rgba(0, 255, 136, 0.05); border: 1px solid rgba(0, 255, 136, 0.2); border-radius: 10px; padding: 12px 6px;">
                <span style="font-size: 11px; color: #aaa; text-transform: uppercase; display: block; margin-bottom: 4px;">🍚 Carbos</span>
                <span style="font-size: 26px; font-weight: 900; color: #00ff88; text-shadow: 0 0 10px rgba(0,255,136,0.5);">${carbsG}<span style="font-size: 14px;">g</span></span>
              </div>
            </div>
            <div style="font-size: 12px; color: #888; border-top: 1px solid #2a314d; padding-top: 10px; margin-top: 12px; display: flex; justify-content: space-between;">
              <span>Riesgo Cardiovascular (ICC / Ratio):</span>
              <strong style="color: ${riskColor};">${riskLabel} (${iccVal})</strong>
            </div>
          </div>

          <div style="background: #15192b; border-radius: 10px; padding: 16px; margin-bottom: 15px; border: 1px solid #2a314d;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px;">
              <span style="font-size: 13px; color: #ccc; font-weight: bold;">Tu Índice de Masa Corporal (IMC)</span>
              <span style="font-size: 20px; font-weight: 900; color: ${cat.color};">${imc.toFixed(1)} <span style="font-size: 11px; font-weight: normal; color: #888;">(${cat.label})</span></span>
            </div>
            <div style="position: relative; height: 12px; border-radius: 6px; background: ${gradient}; margin-bottom: 8px;">
              <div style="position: absolute; top: -14px; left: ${pctImc}%; transform: translateX(-50%); color: #fff; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">▼</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #777;">
              <span>15.0</span><span>18.5 (Normal)</span><span>25.0 (Sobrepeso)</span><span>30.0 (Obesidad)</span><span>42.0+</span>
            </div>
          </div>

          <button type="button" onclick="syncWithNutrition(${planKcal}, ${protG}, ${fatG}, ${carbsG})" 
                  style="width: 100%; padding: 14px; background: linear-gradient(135deg, #00f3ff, #0088ff); color: #000; border: none; border-radius: 8px; font-weight: 900; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 243, 255, 0.2);">
            📥 Aplicar metas de tu plan a Alimentación
          </button>
        </div>
      `;
    }

    const initialHipDisplay = p.sex === 'F' ? 'block' : 'none';

    const div = document.createElement('div');
    div.id = "pro-calc-card"; 
    div.innerHTML = `
      <div class="card mb-16" style="padding: 16px; border-radius: 12px; border: 1px solid #00f3ff; background: #111424; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="color: #00f3ff; margin: 0; font-size: 16px; display: flex; align-items: center; gap: 6px;">🔬 Evaluación Antropométrica Pro</h3>
          <button type="button" onclick="toggleInstructions()" class="btn-secondary" style="font-size: 12px; background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 4px 8px; border-radius: 5px; cursor: pointer;">📖 ¿Cómo medirse?</button>
        </div>

        <div id="measure-guide" style="display: none; background: rgba(0,255,255,0.05); border-left: 3px solid #00f3ff; padding: 12px; margin-bottom: 15px; font-size: 12px; color: #ccc; border-radius: 4px; line-height: 1.5;">
          <strong>📍 Cuello:</strong> Por debajo de la nuez de Adán. Cinta horizontal.<br>
          <strong>📍 Cintura (H):</strong> A la altura del ombligo.<br>
          <strong>📍 Cadera (Solo mujeres):</strong> Talones juntos, parte más ancha de los glúteos.
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          <div style="width: 100%;">
            <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Tu Nombre:</label>
            <input type="text" id="calc-name" value="${p.name || ''}" placeholder="Ej. Juan Pérez" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          </div>

          <div style="display: flex; gap: 10px; width: 100%;">
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Sexo:</label>
              <select id="calc-gender" onchange="handleGenderChange()" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;">
                <option value="male" ${p.sex === 'M' ? 'selected' : ''}>Hombre</option>
                <option value="female" ${p.sex === 'F' ? 'selected' : ''}>Mujer</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Edad (años):</label>
              <input type="number" id="calc-age" value="${p.age || ''}" placeholder="25" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            </div>
          </div>

          <div style="display: flex; gap: 10px; width: 100%;">
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Peso (kg):</label>
              <input type="number" id="calc-weight" step="0.1" value="${p.weight || ''}" placeholder="75.5" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Altura (cm):</label>
              <input type="number" id="calc-height" value="${p.height || ''}" placeholder="175" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            </div>
          </div>

          <div style="display: flex; gap: 10px; width: 100%;">
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Cuello (cm):</label>
              <input type="number" id="calc-neck" step="0.5" value="${p.neck || ''}" placeholder="38" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Cintura (cm):</label>
              <input type="number" id="calc-waist" step="0.5" value="${p.waist || ''}" placeholder="85" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
            </div>
          </div>

          <div id="calc-hip-container" style="width: 100%; display: ${initialHipDisplay};">
            <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Cadera (cm) <span style="font-size:10px; color:#ff0055;">(Obligatorio Mujeres)</span>:</label>
            <input type="number" id="calc-hip" step="0.5" value="${p.hip || ''}" placeholder="95" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;" />
          </div>

          <div style="width: 100%; border-top: 1px solid #2a314d; padding-top: 12px; margin-top: 4px;">
            <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Nivel de Actividad Física:</label>
            <select id="calc-activity" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;">
              <option value="sedentary" ${act('sedentary')}>Sedentario (Sin ejercicio)</option>
              <option value="light" ${act('light')}>Ligero (1-3 días/semana)</option>
              <option value="moderate" ${act('moderate')}>Moderado (3-5 días/semana)</option>
              <option value="active" ${act('active')}>Activo (6-7 días/semana)</option>
              <option value="very_active" ${act('very_active')}>Atleta / Trabajo muy físico</option>
            </select>
          </div>

          <div style="display: flex; gap: 10px; width: 100%;">
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">🎯 Objetivo:</label>
              <select id="calc-goal" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;">
                <option value="lose" ${gl('lose')}>📉 Bajar Grasa</option>
                <option value="maintain" ${gl('maintain')}>⚖️ Mantener</option>
                <option value="gain" ${gl('gain')}>📈 Subir Músculo</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">Ritmo:</label>
              <select id="calc-pace" style="width:100%; box-sizing:border-box; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px;">
                <option value="slow" ${pc('slow')}>Lento (Sano)</option>
                <option value="moderate" ${pc('moderate')}>Moderado (Ideal)</option>
                <option value="aggressive" ${pc('aggressive')}>Agresivo (Rápido)</option>
              </select>
            </div>
          </div>
        </div>

        <button type="button" onclick="processHealthCalculations()" class="btn primary block mb-16" style="width: 100%; padding: 14px; background: #00f3ff; color: #000; font-weight: 900; font-size: 14px; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase;">💾 Calcular y Guardar Diagnóstico</button>

        <div id="health-results" style="display:${displayStyle};">${resultsHTML}</div>

        <div style="margin-top: 20px; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border-left: 2px solid #888; font-size: 11px; color: #888; line-height: 1.4;">
          ⚠️ <strong>Aviso Informativo:</strong> Los cálculos aquí mostrados son estimaciones basadas en fórmulas deportivas estándar. No sustituyen un diagnóstico médico.
        </div>
      </div>
    `;
    return div.firstElementChild;
  }

  // ---------------- HISTORIAL Y CALENDARIO ----------------
  function historyRow(h) {
    const dLbl = dayLabelFor(h.date);
    const bfInfo = getBfLevel(parseFloat(h.fatPct || 0), h.sex);
    return el("div", { class: "item" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: dLbl }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip", text: h.weight + " kg" }),
          h.fatPct ? el("span", { class: "chip", style: `background:${bfInfo.color};color:#000;font-weight:bold`, text: "Grasa: " + h.fatPct + "% (" + bfInfo.label + ")" }) : null,
          el("span", { class: "text-faint fs-12", text: "GET: " + (h.get || 0) + " kcal" })
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar revisión", "¿Eliminar el registro del " + dLbl + "?", () => {
          const arr = history(); const i = arr.indexOf(h); if (i >= 0) arr.splice(i, 1);
          Store.commit(); if (Audio) Audio.play("delete"); toast({ icon: "🗑️", msg: "Registro eliminado" }); 
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
    if (!items.length) {
      body.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "📋" }), el("div", { text: "Sin revisiones este día." })]));
    } else {
      items.forEach((h) => body.appendChild(historyRow(h)));
    }
    UI.openModal("📅 " + dLbl, body);
  }

  function buildCalendar() {
    const y = currentCal.getFullYear(), mo = currentCal.getMonth();
    const monthLabel = currentCal.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startCol = (new Date(y, mo, 1).getDay() + 6) % 7;
    const todayKey = today();

    const grid = el("div", { class: "cal" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach((h) => grid.appendChild(el("div", { class: "cal-h", text: h })));
    for (let i = 0; i < startCol; i++) grid.appendChild(el("div", { class: "cal-day empty" }));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      let cls = "cal-day";
      if (key > todayKey) cls += " future";
      else if (history().some(h => h.date === key)) { cls += " done"; }
      else { cls += " miss"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls + " clickable", text: String(d), onclick: () => openDayDetail(key) }));
    }
    
    const navHeader = el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%; font-size:14px; color:#fff;" }, [
      el("button", { html: "◀", class: "icon-btn", onclick: () => window.changeCalMonth(-1), style: "padding:5px;" }),
      el("span", { text: monthLabel, style: "text-transform:capitalize; font-weight:bold; color:var(--accent);" }),
      el("button", { html: "▶", class: "icon-btn", onclick: () => window.changeCalMonth(1), style: "padding:5px;" })
    ]);

    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "border-bottom: 1px solid var(--border); padding-bottom:10px; margin-bottom:15px;" }, [navHeader]),
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
      el("div", { class: "card-head" }, [ el("div", { class: "card-title" }, [el("span", { class: "dot" }), "⚖️ Tendencia de Peso"]) ]),
      chartWrap
    ]);
  }

  function render(container, forceRender = false) {
    if (!container) return;
    if (!forceRender && container.querySelector('#pro-calc-card')) return;
    container.innerHTML = "";
    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("heart") : "❤️", "Salud"]),
        el("p", { class: "view-desc", text: "Diagnóstico corporal, gasto calórico y plan de nutrición." })
      ]),
      el("div", { class: "flex gap-8", style: "flex-wrap:wrap" }, [el("button", { class: "btn", onclick: openHistory, html: "📖 Ver Historial" })])
    ]));
    container.appendChild(proCalculatorCard());
    container.appendChild(buildCalendar());
    if (weightsSorted().length > 0) container.appendChild(weightCard());
  }

  N.Health = { render };
})();
