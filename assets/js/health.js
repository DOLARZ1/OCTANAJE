/* =====================================================================
   OCTANAJE · Módulo de Salud (Antropometría Pro)
   ===================================================================== */
(function () {
  "use strict";
  window.NEXUS = window.NEXUS || {};

  // =====================================================================
  // 🧮 FÓRMULAS MATEMÁTICAS
  // =====================================================================
  function calculateMetabolism({ gender, weightKg, heightCm, ageYears, activityLevel }) {
    let tmb = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
    tmb = gender === 'female' ? tmb - 161 : tmb + 5;
    const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const get = tmb * (activityFactors[activityLevel] || 1.2);
    return { tmb: Math.round(tmb), get: Math.round(get) };
  }

  function calculateBodyFat({ gender, heightCm, neckCm, waistCm, hipCm, weightKg }) {
    let bodyFatPercentage = 0;
    if (gender === 'male') {
      const diff = waistCm - neckCm;
      if (diff <= 0) return null;
      const density = 1.0324 - (0.19077 * Math.log10(diff)) + (0.15456 * Math.log10(heightCm));
      bodyFatPercentage = (495 / density) - 450;
    } else {
      if (!hipCm) return null;
      const sumDiff = waistCm + hipCm - neckCm;
      if (sumDiff <= 0) return null;
      const density = 1.29579 - (0.35004 * Math.log10(sumDiff)) + (0.22100 * Math.log10(heightCm));
      bodyFatPercentage = (495 / density) - 450;
    }
    bodyFatPercentage = Math.max(3, Math.min(60, bodyFatPercentage));
    const fatKg = (weightKg * (bodyFatPercentage / 100));
    return { 
        fatPercentage: parseFloat(bodyFatPercentage.toFixed(1)), 
        fatKg: parseFloat(fatKg.toFixed(1)), 
        leanKg: parseFloat((weightKg - fatKg).toFixed(1)) 
    };
  }

  // =====================================================================
  // 🧠 CONTROLADORES DE INTERFAZ (Globales para el onclick)
  // =====================================================================
  window.toggleInstructions = function() {
    const guide = document.getElementById('measure-guide');
    if(guide) guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
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

    const cals = calculateMetabolism(data);
    const bodyFat = calculateBodyFat(data);

    const proteinGrams = Math.round(data.weightKg * 2); 
    const fatGrams = Math.round(data.weightKg * 1);
    const carbsGrams = Math.max(0, Math.round((cals.get - (proteinGrams * 4) - (fatGrams * 9)) / 4));

    const icc = (data.waistCm / data.hipCm).toFixed(2);
    let risk = "Riesgo Alto";
    if ((data.gender === 'male' && icc <= 0.90) || (data.gender === 'female' && icc <= 0.85)) risk = "Riesgo Bajo";

    const waterLiters = (data.weightKg * 35 / 1000).toFixed(1);

    document.getElementById('res-tmb').innerText = `${cals.tmb} kcal`;
    document.getElementById('res-get').innerText = `${cals.get} kcal`;
    if (bodyFat) {
      document.getElementById('res-fat').innerText = `${bodyFat.fatPercentage}% Grasa`;
      document.getElementById('res-mass').innerText = `${bodyFat.leanKg}kg magra / ${bodyFat.fatKg}kg grasa`;
    }
    document.getElementById('res-macros').innerText = `🥩 ${proteinGrams}g Prot | 🥑 ${fatGrams}g Grasa | 🍚 ${carbsGrams}g Carbos`;
    document.getElementById('res-icc').innerText = `${icc} (${risk})`;
    document.getElementById('res-water').innerText = `💧 ${waterLiters} Litros al día`;

    if (window.NEXUS && window.NEXUS.Haptic) window.NEXUS.Haptic.success();
    
    document.getElementById('health-results').style.display = 'grid';
  };

  // =====================================================================
  // 🎨 DIBUJAR EN PANTALLA (Render)
  // =====================================================================
  function render(container) {
    container.innerHTML = `
      <div class="health-card" style="padding: 15px; background: #111424; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #00f3ff; margin-top: 0;">🔬 Evaluación Antropométrica Pro</h3>
        
        <button onclick="toggleInstructions()" class="btn-secondary" style="margin-bottom: 15px; font-size: 14px; background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 5px 10px; border-radius: 5px;">
          📖 ¿Cómo tomarme las medidas?
        </button>

        <div id="measure-guide" style="display: none; background: rgba(0,255,255,0.05); border-left: 3px solid #00f3ff; padding: 15px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; border-radius: 4px; color: #ccc;">
          <strong>🛠️ Necesitas:</strong> Cinta métrica flexible (de costura).<br><br>
          <strong>📍 Cuello:</strong> Por debajo de la nuez de Adán. Cinta horizontal, sin apretar.<br>
          <strong>📍 Cintura (Hombres):</strong> Exactamente a la altura del ombligo. No sumas el abdomen.<br>
          <strong>📍 Cintura (Mujeres):</strong> En la parte más estrecha del torso (arriba del ombligo).<br>
          <strong>📍 Cadera:</strong> Talones juntos, en la parte más ancha de los glúteos.<br><br>
          <em>Tip: Mídete por la mañana en ayunas para mayor precisión.</em>
        </div>
        
        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <label style="font-size: 12px; color: #888;">Sexo:
            <select id="calc-gender" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;">
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </label>
          <label style="font-size: 12px; color: #888;">Edad:
            <input type="number" id="calc-age" placeholder="25" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888;">Peso (kg):
            <input type="number" id="calc-weight" placeholder="75.5" step="0.1" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888;">Altura (cm):
            <input type="number" id="calc-height" placeholder="175" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888;">Cuello (cm):
            <input type="number" id="calc-neck" placeholder="38" step="0.5" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888;">Cintura (cm):
            <input type="number" id="calc-waist" placeholder="85" step="0.5" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888; grid-column: span 2;">Cadera (cm):
            <input type="number" id="calc-hip" placeholder="95" step="0.5" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;" />
          </label>
          <label style="font-size: 12px; color: #888; grid-column: span 2;">Actividad Física:
            <select id="calc-activity" style="width: 100%; padding: 8px; background: #1a1f35; color: white; border: none; border-radius: 5px; margin-top: 5px;">
              <option value="sedentary">Sedentario (Poco/Nada)</option>
              <option value="light">Ligero (1-3 días/sem)</option>
              <option value="moderate" selected>Moderado (3-5 días/sem)</option>
              <option value="active">Activo (6-7 días/sem)</option>
              <option value="very_active">Muy Activo / Atleta</option>
            </select>
          </label>
        </div>

        <button onclick="processHealthCalculations()" class="btn-primary" style="width: 100%; padding: 12px; background: #00f3ff; color: #000; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Calcular Mi Diagnóstico</button>

        <div id="health-results" class="results-panel" style="display:none; margin-top: 20px; grid-template-columns: 1fr; gap: 15px; border-top: 1px solid #333; padding-top: 15px;">
          <div>
            <span style="font-size: 12px; color: #888; display: block;">1. TMB y Calorías Diarias (Mantenimiento):</span>
            <span id="res-tmb" style="color: #00f3ff; font-weight: bold; margin-right: 10px;">0 kcal</span>
            <span id="res-get" style="color: #00f3ff; font-weight: bold;">0 kcal</span>
          </div>
          <div>
            <span style="font-size: 12px; color: #888; display: block;">2. Composición Corporal:</span>
            <span id="res-fat" style="color: #ff0055; font-weight: bold;">0% Grasa</span>
            <div id="res-mass" style="font-size: 11px; color: #aaa;">0kg magra / 0kg grasa</div>
          </div>
          <div>
            <span style="font-size: 12px; color: #888; display: block;">3. Macros Sugeridos:</span>
            <span id="res-macros" style="color: #fff; font-size: 14px;">0g Prot | 0g Grasa | 0g Carbos</span>
          </div>
          <div>
            <span style="font-size: 12px; color: #888; display: block;">4. Índice Cintura-Cadera (Salud):</span>
            <span id="res-icc" style="color: #00ff88; font-weight: bold;">0.00</span>
          </div>
          <div>
            <span style="font-size: 12px; color: #888; display: block;">5. Hidratación Diaria:</span>
            <span id="res-water" style="color: #0088ff; font-weight: bold;">0 Litros</span>
          </div>
        </div>
      </div>
    `;
  }

  // Exportar al orquestador
  window.NEXUS.Health = { render };
})();
