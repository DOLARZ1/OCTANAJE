/* =====================================================================
   OCTANAJE · Módulo Entrenamientos (Cambio Garantizado a Combos 🥋🥊)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();

  // ---------------- BASES DE DATOS INTELIGENTES ----------------
  const EXERCISE_DB = [
    "Press de Banca", "Press Inclinado", "Aperturas / Cristos", "Lagartijas / Push ups", 
    "Dominadas / Pull ups", "Remo con Barra", "Jalón al pecho", "Peso Muerto", 
    "Sentadilla Libre", "Sentadilla Frontal", "Prensa / Hack", "Extensiones de pierna", "Desplantes", 
    "Curl Femoral", "Hip Thrust", "Puente de Glúteo", "Peso Muerto Rumano", 
    "Press Militar", "Elevaciones Laterales", "Pájaros / Vuelos", 
    "Curl con Barra", "Curl Martillo", "Copa Tríceps", "Extensiones en Polea", "Fondos / Dips", 
    "Crunch Abdominal", "Plancha Isométrica", "Elevación de Talones"
  ].sort();

  const MARTIAL_DB = [
    // --- BOXEO ---
    "Jab", "Cross (Directo)", "Hook (Gancho)", "Uppercut", "Overhand",
    "Slip (Esquiva lateral)", "Roll (Esquiva U)", "Pull (Esquiva atrás)",
    "Step in (Paso frente)", "Step out (Paso atrás)", "Pivot", "Cambio de guardia",
    // --- TAEKWONDO ---
    "Ap chagi (Frontal)", "Dollyo chagi (Circular)", "Yop chagi (Lateral)", 
    "Dwit chagi (Trasera)", "Naeryo chagi (Hacha)", "Bandal chagi (Media luna)", 
    "Naranhi Seogi (Paralela)", "Ap Seogi (Paso corto)", "Ap Kubi (Paso largo)", "Dwit Kubi (Posición L)",
    "Momtong makki (Bloqueo medio)", "Olgul makki (Bloqueo alto)", "Arae makki (Bloqueo bajo)",
    "Desplazamiento lateral Izq", "Desplazamiento lateral Der", "Step (Paso rápido)",
    // --- OTROS COMBATE ---
    "Rodillazo", "Codo", "Sprawl (Defensa de derribo)"
  ].sort();

  // Ícono SVG a medida para Calistenia
  const CALISTENIA_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1-2.75.25 1.25-1 2.5-1 2.5S6.5 12 6.5 10.5c0-1.5 1-3.5 1.5-4C7.5 8 7 6 6 4c0 0 3.5 1 3.5 4.5V9c0 1.5 1.5 2.5 1.5 4.25S9.657 15 8 15Z"/></svg>';

  const TYPES = [
    { value: "fuerza", name: "Fuerza / Pesas", icon: "🏋️" },
    { value: "cardio", name: "Cardio", icon: "🏃" },
    { value: "hiit", name: "HIIT", icon: "⚡" },
    { value: "crossfit", name: "Crossfit", icon: "🔥" },
    { value: "calistenia", name: "Calistenia", icon: "🔥", svg: CALISTENIA_SVG },
    { value: "taekwondo", name: "Taekwondo", icon: "🥋" },
    { value: "boxeo", name: "Boxeo", icon: "🥊" },
    { value: "artesmarciales", name: "Artes Marciales", icon: "🥷" },
    { value: "yoga", name: "Yoga / Movilidad", icon: "🧘" },
    { value: "estiramiento", name: "Estiramiento", icon: "🤸" },
    { value: "caminata", name: "Caminata", icon: "🚶" },
    { value: "correr", name: "Running", icon: "🏃‍♂️" },
    { value: "ciclismo", name: "Ciclismo", icon: "🚴" },
    { value: "natacion", name: "Natación", icon: "🏊" },
    { value: "otro", name: "Otro (Personalizado)", icon: "💪" }
  ];

  function workouts() { return Store.get().workouts; }
  function getWorkoutName(w) { return (w.type === "otro" && w.customName) ? w.customName : (TYPES.find(x => x.value === w.type)?.name || w.type || "Otro"); }
  function getWorkoutIconNode(w) {
    if (w.type === "otro" && w.customIcon) return el("span", { style: "font-size:22px", text: w.customIcon });
    const t = TYPES.find(x => x.value === w.type);
    if (t && t.svg) return el("span", { class: "tico-svg", html: t.svg });
    return el("span", { style: "font-size:22px", text: (t && t.icon) || "💪" });
  }
  function getWorkoutEmoji(w) { return (w.type === "otro" && w.customIcon) ? w.customIcon : (TYPES.find(x => x.value === w.type)?.icon || "💪"); }

  // ---------------- CALENDARIO Y GOOGLE CALENDAR ----------------
  let currentCalWorkouts = new Date();
  window.changeWorkoutCalMonth = function(delta) {
    currentCalWorkouts.setMonth(currentCalWorkouts.getMonth() + delta);
    if (N.Workouts && N.Workouts.render) N.Workouts.render(document.getElementById('view-workouts'), true);
  };
  window.scheduleWorkout = function() {
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Entrenamiento (OCTANAJE)")}`, '_blank');
  };

  // ---------------- EXPORTAR A PDF ----------------
  function openPdfModal() {
    UI.openModal("📄 Descargar PDF de entrenamiento", el("div", {}, [
      el("button", { class: "btn primary block", style: "margin-bottom:10px", html: "📅 Diario (hoy)", onclick: () => { UI.closeModal(); exportPDF("daily"); } }),
      el("button", { class: "btn block", style: "margin-bottom:10px", html: "🗓️ Semanal (últimos 7 días)", onclick: () => { UI.closeModal(); exportPDF("weekly"); } }),
      el("button", { class: "btn block", html: "📆 Mensual (este mes)", onclick: () => { UI.closeModal(); exportPDF("monthly"); } })
    ]));
  }
  function rangeFor(period) {
    const to = DateUtil.todayKey();
    if (period === "daily") return { from: to, to: to, label: "Diario" };
    if (period === "weekly") return { from: DateUtil.addDays(to, -6), to: to, label: "Semanal" };
    const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to: to, label: "Mensual" };
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function exportPDF(period) {
    const r = rangeFor(period);
    const list = workouts().filter((w) => w.date >= r.from && w.date <= r.to).sort((a, b) => a.date.localeCompare(b.date));
    const totalMin = list.reduce((s, w) => s + (w.duration || 0), 0);
    const totalKcal = list.reduce((s, w) => s + (w.calories || 0), 0);
    
    let rows = "";
    if (!list.length) rows = '<tr><td colspan="6" style="text-align:center;padding:24px">Sin entrenamientos.</td></tr>';
    else {
      list.forEach((w) => {
        const exs = (w.exercises || []).map((e) => {
          let txt = e.isFav ? "⭐ " + esc(e.name) : esc(e.name);
          if (e.isCombo) {
            if (e.sequence) txt += `<br><small style='color:#666'>↳ ${esc(e.sequence)}</small>`;
            let meta = [];
            if (e.reps) meta.push(`${e.reps} reps`);
            if (e.duration) meta.push(`${e.duration} min`);
            if (meta.length) txt += ` <strong style='color:#0284c7'>(${meta.join(" | ")})</strong>`;
          } else {
            if (e.sets || e.reps) txt += ` ${e.sets||"?"}×${e.reps||"?"}`;
            if (e.weight) txt += ` @ ${e.weight}kg`;
          }
          return txt;
        }).join("<br><br>");

        rows += `<tr>
          <td>${DateUtil.parse(w.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</td>
          <td><b>${esc(w.name)}</b></td>
          <td>${getWorkoutEmoji(w)} ${esc(getWorkoutName(w))}</td>
          <td style='text-align:center'>${w.duration || 0} min</td>
          <td style='text-align:center'>${w.calories || 0}</td>
          <td>${exs || "—"}${w.volume ? `<div style='color:#00b3c4;font-size:10px;margin-top:4px;'>💪 Vol: ${esc(w.volume)}</div>` : ""}</td>
        </tr>`;
      });
    }

    const html = `<!doctype html><html lang='es'><head><meta charset='utf-8'><title>OCTANAJE · ${r.label}</title>
      <style>
      *{box-sizing:border-box;font-family:system-ui,sans-serif} body{margin:0;padding:32px;color:#0f172a;background:#fff}
      .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0284c7;padding-bottom:14px;margin-bottom:20px}
      .logo{font-size:22px;font-weight:900;color:#0f172a} .logo span{color:#0284c7}
      .kpis{display:flex;gap:12px;margin:18px 0} .kpi{flex:1;border:1px solid #cbd5e1;border-radius:12px;padding:12px;text-align:center;background:#f8fafc}
      .kpi .n{font-size:24px;font-weight:900;color:#0284c7}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:15px}
      th{background:#0284c7;color:#fff;text-align:left;padding:8px} td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
      </style></head><body>
      <div class='hd'><div><div class='logo'>⚡ OCTAN<span>AJE</span></div></div><div style='text-align:right'><h2>Resumen de Entrenamiento</h2><div>${r.label}</div></div></div>
      <div class='kpis'>
      <div class='kpi'><div class='n'>${list.length}</div><div class='l'>Sesiones</div></div>
      <div class='kpi'><div class='n'>${totalMin}</div><div class='l'>Minutos Totales</div></div>
      <div class='kpi'><div class='n'>${totalKcal}</div><div class='l'>Kcal Quemadas</div></div>
      </div>
      <table><thead><tr><th>Fecha</th><th>Sesión</th><th>Tipo</th><th>Min</th><th>Kcal</th><th>Ejercicios / Combos</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open(); iframe.contentWindow.document.write(html); iframe.contentWindow.document.close();
    Audio.play("tap");
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(() => iframe.remove(), 1500); }, 500);
  }

  // ---------------- SECCIÓN 1: FORMULARIO NORMAL (PESAS) ----------------
  function buildExerciseSection() {
    if (!document.getElementById("ex-datalist")) {
      const dlist = el("datalist", { id: "ex-datalist" });
      EXERCISE_DB.forEach(name => dlist.appendChild(el("option", { value: name })));
      document.body.appendChild(dlist);
    }
    const list = el("div", { style: "display:flex; flex-direction:column; gap:10px;" });
    function addRow(ex) {
      let isFav = ex ? (ex.isFav || false) : false;
      const favBtn = el("button", { type: "button", html: isFav ? "⭐" : "☆", style: "background:transparent; border:none; cursor:pointer; font-size:18px; padding:0 8px 0 0; outline:none;", onclick: () => { isFav = !isFav; favBtn.innerHTML = isFav ? "⭐" : "☆"; }});
      const nameI = el("input", { class: "input", placeholder: "Ejercicio (ej. Press)", style: "flex:1; min-width:0; background:transparent; border:none; padding:10px 8px; color:white; outline:none; box-sizing:border-box;" });
      nameI.setAttribute("list", "ex-datalist");
      const nameWrap = el("div", { style: "display:flex; align-items:center; margin-bottom:8px; background:#1a1f35; border:1px solid #2a314d; border-radius:6px; padding-left:10px;" }, [favBtn, nameI]);
      const setsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Series", style: "flex:1; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      const repsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Reps", style: "flex:1; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      const weightI = el("input", { class: "input", type: "number", step: "0.5", min: 0, placeholder: "Peso kg", style: "flex:1.5; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      if (ex) { nameI.value = ex.name || ""; setsI.value = ex.sets || ""; repsI.value = ex.reps || ""; weightI.value = ex.weight || ""; }
      
      const row = el("div", { style: "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 10px; border-radius: 8px;" }, [
        nameWrap, el("div", { style: "display:flex; gap:8px; align-items:center; width:100%; justify-content:space-between;" }, [
          setsI, el("span", { class: "text-faint", style:"font-weight:bold;", text: "×" }), repsI, el("span", { class: "text-faint", style:"font-weight:bold;", text: "@" }), weightI,
          el("button", { class: "icon-btn", type: "button", html: "🗑️", style:"margin:0; padding:8px;", onclick: () => { if (list.children.length > 1) row.remove(); else { nameI.value = ""; setsI.value = ""; repsI.value = ""; weightI.value = ""; isFav = false; favBtn.innerHTML = "☆"; } }})
        ])
      ]);
      row._get = () => ({ isCombo: false, name: nameI.value.trim(), sets: Number(setsI.value) || 0, reps: Number(repsI.value) || 0, weight: Number(weightI.value) || 0, isFav: isFav });
      list.appendChild(row);
    }
    addRow(null);
    return { 
      node: el("div", { id: "standard-section-wrap", class: "field" }, [el("label", { text: "🏋️ Ejercicios y Cargas" }), list, el("button", { class: "btn sm", type: "button", html: "＋ Añadir Ejercicio", style: "margin-top:10px; width:100%; border:1px dashed #00f3ff; color:#00f3ff; background:transparent; padding:10px;", onclick: () => addRow(null) })]), 
      getData: () => Array.from(list.children).map((r) => r._get()).filter((x) => x.name) 
    };
  }

  // ---------------- SECCIÓN 2: FORMULARIO DE COMBOS (ARTES MARCIALES) 🥋🥊 ----------------
  function buildComboSection() {
    const list = el("div", { style: "display:flex; flex-direction:column; gap:12px;" });
    function addRow(ex) {
      let isFav = ex ? (ex.isFav || false) : false;
      const favBtn = el("button", { type: "button", html: isFav ? "⭐" : "☆", style: "background:transparent; border:none; cursor:pointer; font-size:18px; padding:0 8px 0 0; outline:none;", onclick: () => { isFav = !isFav; favBtn.innerHTML = isFav ? "⭐" : "☆"; }});
      
      const nameI = el("input", { class: "input", placeholder: "Nombre del Combo (Ej. COMBO A)", style: "flex:1; min-width:0; background:transparent; border:none; padding:10px 8px; color:#bc84ee; font-weight:bold; outline:none;" });
      const nameWrap = el("div", { style: "display:flex; align-items:center; margin-bottom:8px; background:#1a1f35; border:1px solid #bc84ee; border-radius:6px; padding-left:10px;" }, [favBtn, nameI]);

      const seqI = el("textarea", { class: "input", placeholder: "Secuencia (Ej. Jab + Cross + Ap chagi)", rows: 2, style: "width:100%; box-sizing:border-box; margin-top:8px; padding:10px; border-radius:6px; background:#1a1f35; color:white; border:1px solid #2a314d; resize:vertical; outline:none;" });

      const selectMove = el("select", { style: "flex:1; min-width:0; padding:10px; background:#1a1f35; color:white; border:1px solid #2a314d; border-radius:6px; outline:none;" });
      selectMove.appendChild(el("option", { value: "", text: "Diccionario de Movimientos..." }));
      MARTIAL_DB.forEach(m => selectMove.appendChild(el("option", { value: m, text: m })));

      const addMoveBtn = el("button", { type: "button", html: "➕ Sumar", style: "padding:10px 12px; background:rgba(188,132,238,0.15); color:#bc84ee; border:1px solid #bc84ee; border-radius:6px; font-weight:bold; cursor:pointer; white-space:nowrap;" });
      addMoveBtn.onclick = () => {
        if(selectMove.value) {
          seqI.value = seqI.value ? seqI.value + " + " + selectMove.value : selectMove.value;
          selectMove.value = ""; 
        }
      };
      
      const dictRow = el("div", { style: "display:flex; gap:8px; align-items:center;" }, [selectMove, addMoveBtn]);

      const repsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Total Reps", style: "flex:1; min-width:0; text-align:center; padding:10px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      const timeI = el("input", { class: "input", type: "number", min: 0, placeholder: "Minutos", style: "flex:1; min-width:0; text-align:center; padding:10px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      
      if (ex) { nameI.value = ex.name || ""; seqI.value = ex.sequence || ""; repsI.value = ex.reps || ""; timeI.value = ex.duration || ""; }
      
      const row = el("div", { style: "background: rgba(188,132,238,0.05); border: 1px solid rgba(188,132,238,0.2); padding: 12px; border-radius: 8px;" }, [
        nameWrap,
        dictRow,
        seqI,
        el("div", { style: "display:flex; gap:8px; align-items:center; width:100%; justify-content:space-between; margin-top:10px;" }, [
          repsI, timeI,
          el("button", { class: "icon-btn", type: "button", html: "🗑️", style:"margin:0; padding:10px;", onclick: () => { 
            if (list.children.length > 1) row.remove(); 
            else { nameI.value = ""; seqI.value = ""; repsI.value = ""; timeI.value = ""; isFav = false; favBtn.innerHTML = "☆"; } 
          }})
        ])
      ]);
      row._get = () => ({ isCombo: true, name: nameI.value.trim() || "Combo", sequence: seqI.value.trim(), reps: Number(repsI.value) || 0, duration: Number(timeI.value) || 0, isFav: isFav });
      list.appendChild(row);
    }
    addRow(null);
    return { 
      node: el("div", { id: "combo-section-wrap", class: "field", style: "display:none;" }, [
        el("label", { text: "🥋 Creador de Combos y Movimientos" }), 
        list, 
        el("button", { class: "btn sm", type: "button", html: "＋ Añadir Nuevo Combo", style: "margin-top:10px; width:100%; border:1px dashed #bc84ee; color:#bc84ee; background:transparent; padding:10px;", onclick: () => addRow(null) })
      ]), 
      getData: () => Array.from(list.children).map((r) => r._get()).filter((x) => x.name || x.sequence) 
    };
  }

  // ---------------- LÓGICA DE GUARDADO ----------------
  function add() {
    const stdSec = buildExerciseSection();
    const cmbSec = buildComboSection();
    const dualWrap = el("div", {}, [stdSec.node, cmbSec.node]);

    const body = UI.form([
      { name: "name", label: "Nombre de la sesión", placeholder: "Ej. Día Pesado / Clase de Box", required: true },
      { name: "type", label: "Tipo principal", type: "select", value: "fuerza", options: TYPES.map((t) => ({ value: t.value, label: t.icon + " " + t.name })) },
      { type: "row", fields: [
        { name: "customName", label: "Actividad (Si elegiste 'Otro')", placeholder: "Ej. Parkour" },
        { name: "customIcon", label: "Icono (Emoji)", placeholder: "Ej. 🥷" }
      ]},
      { type: "row", fields: [
        { name: "date", label: "Fecha", type: "date", value: DateUtil.todayKey(), required: true },
        { name: "duration", label: "Duración (min)", type: "number", min: 0, placeholder: "45", required: true }
      ]},
      { type: "row", fields: [
        { name: "calories", label: "Calorías (aprox)", type: "number", min: 0, placeholder: "350" },
        { name: "volume", label: "Volumen extra", placeholder: "ej. 5 km" }
      ]},
      { name: "notes", label: "Notas o Récords (PRs)", type: "textarea", placeholder: "Sensaciones, PRs, fatiga..." }
    ], (data) => {
      const dur = Number(data.duration) || 0;
      if (dur <= 0) { Audio.play("error"); toast({ icon: "⚠️", msg: "Indica la duración" }); return; }
      
      const isMartialArts = ["boxeo", "taekwondo", "artesmarciales"].includes(data.type);
      const exData = isMartialArts ? cmbSec.getData() : stdSec.getData();
      
      let autoVolume = 0;
      if (!isMartialArts) {
        exData.forEach(e => { if (e.sets && e.reps && e.weight) autoVolume += (e.sets * e.reps * e.weight); });
      }
      
      let finalVolume = data.volume;
      if (!isMartialArts && !finalVolume && autoVolume > 0) finalVolume = autoVolume.toLocaleString() + " kg";
      else if (!isMartialArts && finalVolume && autoVolume > 0) finalVolume = autoVolume.toLocaleString() + " kg · " + finalVolume;

      const xp = Math.min(30, 10 + Math.round(dur / 5));
      workouts().push({ 
        id: Store.uid(), name: data.name, type: data.type, customName: data.customName, customIcon: data.customIcon, 
        date: data.date, duration: dur, calories: Number(data.calories) || 0, volume: finalVolume, notes: data.notes, exercises: exData, xpEarned: xp 
      });
      Store.commit(); Audio.play("complete"); Gami.award(xp, "Entrenamiento registrado 💪");
      UI.closeModal(); render(document.getElementById("view-workouts")); N.App && N.App.refreshTop();
    }, "Registrar entrenamiento", () => dualWrap);
    
    // DETECTOR EN TIEMPO REAL (Garantiza el cambio de menú)
    setTimeout(() => {
        const loop = setInterval(() => {
            const stdWrap = document.getElementById("standard-section-wrap");
            const comboWrap = document.getElementById("combo-section-wrap");
            if (!stdWrap || !comboWrap) {
                clearInterval(loop); // Modal cerrado, se destruye el escáner
                return;
            }
            
            const selects = document.querySelectorAll("select");
            let typeVal = null;
            selects.forEach(sel => {
                if (sel.innerHTML.includes("boxeo") || sel.innerHTML.includes("taekwondo")) typeVal = sel.value;
            });
            
            if (typeVal) {
                const isMartial = ["boxeo", "taekwondo", "artesmarciales"].includes(typeVal);
                if (isMartial && stdWrap.style.display !== "none") {
                    stdWrap.style.display = "none";
                    comboWrap.style.display = "block";
                } else if (!isMartial && stdWrap.style.display === "none") {
                    stdWrap.style.display = "block";
                    comboWrap.style.display = "none";
                }
            }
        }, 150); // Revisa 6 veces por segundo, sin consumir recursos notables
    }, 100);

    UI.openModal("Nuevo entrenamiento", body);
  }

  function remove(w) {
    UI.confirmBox("Eliminar", `¿Borrar "${w.name}"?`, () => {
      const arr = workouts(); arr.splice(arr.indexOf(w), 1);
      Audio.play("delete");
      const xp = w.xpEarned != null ? w.xpEarned : Math.min(30, 10 + Math.round((w.duration || 0) / 5));
      if (xp) Gami.remove(xp); else Store.commit();
      render(document.getElementById("view-workouts")); N.App && N.App.refreshTop();
    }, "Eliminar");
  }

  // ---------------- ESTADÍSTICAS Y RENDER ----------------
  function streak() {
    const dates = new Set(workouts().map((w) => w.date));
    let s = 0, day = DateUtil.todayKey();
    if (!dates.has(day)) day = DateUtil.addDays(day, -1);
    while (dates.has(day)) { s++; day = DateUtil.addDays(day, -1); }
    return s;
  }
  function weekMinutes() {
    const days = DateUtil.lastNDays(7);
    return { labels: days.map(d => DateUtil.weekday(d)), values: days.map(d => workouts().filter(w => w.date === d).reduce((s, w) => s + w.duration, 0)) };
  }
  function stats() {
    const arr = workouts(), mk = DateUtil.monthKey(), monthSessions = arr.filter(w => w.date.slice(0, 7) === mk);
    return { total: arr.length, monthCount: monthSessions.length, monthMinutes: monthSessions.reduce((s, w) => s + w.duration, 0), monthCalories: monthSessions.reduce((s, w) => s + w.calories, 0), streak: streak() };
  }

  function createWorkoutItem(w) {
    const item = el("div", { class: "item", style: "flex-direction:column;align-items:stretch" });
    item.appendChild(el("div", { class: "flex items-center gap-12" }, [
      getWorkoutIconNode(w),
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: w.name }),
        el("div", { class: "item-meta" }, [
          el("span", { text: DateUtil.label(w.date) }),
          el("span", { class: "chip accent", style:"background:#00f3ff; color:#000; font-weight:bold;", text: w.duration + " min" }),
          w.calories ? el("span", { class: "chip", style:"background:#00ff88; color:#000; font-weight:bold;", text: w.calories + " kcal" }) : null,
          w.volume ? el("span", { class: "text-faint fs-12", style: "color:#bc84ee; font-weight:bold;", text: "💪 Vol: " + w.volume }) : null
        ])
      ]),
      el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => remove(w) })
    ]));
    
    if (w.exercises && w.exercises.length) {
      const exWrap = el("div", { style: "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px" });
      w.exercises.forEach((e) => {
        
        if (e.isCombo) {
           let txt = e.isFav ? "⭐ " + e.name : e.name;
           if (e.sequence) txt += `<br><span style="color:#aaa; font-size:10px; font-weight:normal;">↳ ${e.sequence}</span>`;
           let meta = [];
           if (e.reps) meta.push(`${e.reps} reps`);
           if (e.duration) meta.push(`${e.duration} min`);
           if (meta.length > 0) txt += ` <span style="color:#bc84ee; font-size:10px; margin-left:4px;">(${meta.join(" | ")})</span>`;
           
           exWrap.appendChild(el("span", { class: "chip", style: "display:block; width:100%; text-align:left; line-height:1.4;", html: txt }));
        } else {
           let txt = e.isFav ? "⭐ " + e.name : e.name;
           if (e.sets || e.reps) txt += `  ${e.sets||0}×${e.reps||0}`;
           if (e.weight) txt += ` @ ${e.weight}kg`;
           if (e.sets && e.reps && e.weight) {
               const vol = e.sets * e.reps * e.weight;
               exWrap.appendChild(el("span", { class: "chip", html: `<b>${txt}</b> <span style="opacity:0.6;font-size:10px;margin-left:4px;">(${vol}kg)</span>` }));
           } else {
               exWrap.appendChild(el("span", { class: "chip", text: txt }));
           }
        }
      });
      item.appendChild(exWrap);
    }
    if (w.notes) item.appendChild(el("div", { class: "fs-12 text-dim", style: "margin-top:8px", text: "📝 " + w.notes }));
    return item;
  }

  function openWorkoutDayDetail(key) {
    const items = workouts().filter(h => h.date === key);
    const body = el("div", {});
    if (!items.length) body.appendChild(el("div", { class: "empty", text: "Sin entrenamientos este día." }));
    else items.forEach(w => body.appendChild(createWorkoutItem(w)));
    UI.openModal("📅 " + key, body);
  }

  function buildCalendar() {
    const y = currentCalWorkouts.getFullYear(), mo = currentCalWorkouts.getMonth(), monthLabel = currentCalWorkouts.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const grid = el("div", { class: "cal", style: "display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; text-align:center;" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach(h => grid.appendChild(el("div", { class: "cal-h", style: "font-size:12px; color:#aaa; font-weight:bold; padding:4px 0;", text: h })));
    
    const startCol = (new Date(y, mo, 1).getDay() + 6) % 7;
    for (let i = 0; i < startCol; i++) grid.appendChild(el("div", { class: "cal-day empty" }));
    
    const todayStr = today();
    for (let d = 1; d <= new Date(y, mo+1, 0).getDate(); d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      const hasWorkout = workouts().some(h => h.date === key);
      let dayStyle = "display:flex; align-items:center; justify-content:center; height:38px; border-radius:8px; font-size:13px; font-weight:bold; cursor:pointer; transition:all 0.2s;";
      
      if (hasWorkout) dayStyle += " background:rgba(0, 255, 136, 0.2); border:1px solid #00ff88; color:#00ff88;";
      else if (key < todayStr) dayStyle += " background:rgba(255, 0, 85, 0.15); border:1px solid #ff0055; color:#ff0055;";
      else if (key === todayStr) dayStyle += " background:rgba(0, 243, 255, 0.1); border:2px solid #00f3ff; color:#ffffff;";
      else dayStyle += " background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); color:#888888;";

      grid.appendChild(el("div", { class: "cal-day clickable", style: dayStyle, text: String(d), onclick: () => openWorkoutDayDetail(key) }));
    }

    return el("div", { class: "card mb-16", style: "border:1px solid rgba(0, 243, 255, 0.2); margin-top:20px;" }, [
      el("div", { class: "card-head", style: "border-bottom: 1px solid var(--border); padding-bottom:10px; margin-bottom:12px;" }, [
        el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%;" }, [
          el("button", { html: "◀", class: "icon-btn", onclick: () => window.changeWorkoutCalMonth(-1) }),
          el("span", { text: "📅 Calendario de Disciplina: " + monthLabel, style: "text-transform:capitalize; font-weight:bold; color:#00f3ff; font-size:14px;" }),
          el("button", { html: "▶", class: "icon-btn", onclick: () => window.changeWorkoutCalMonth(1) })
        ])
      ]),
      grid,
      el("div", { style: "display:flex; justify-content:center; gap:16px; margin-top:12px; font-size:11px; color:#aaa;" }, [
        el("span", { html: "<span style='color:#00ff88;'>●</span> Entrenado" }),
        el("span", { html: "<span style='color:#ff0055;'>●</span> Sin entrenar" }),
        el("span", { html: "<span style='color:#00f3ff;'>●</span> Hoy" })
      ])
    ]);
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = "";
    const st = stats();

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("dumbbell") : "🏋️", "Entrenamientos"]),
        el("p", { class: "view-desc", text: "Registra tus series, pesos y observa tu hipertrofia." })
      ]),
      el("div", { class: "flex gap-4", style: "flex-wrap:wrap; margin-top: 10px;" }, [
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px;", onclick: () => {
          const list = workouts().slice().sort((a,b)=>b.date.localeCompare(a.date));
          const body = el("div", {});
          if (!list.length) body.appendChild(el("div", { class: "empty", text: "Sin entrenamientos." }));
          else list.forEach(w => body.appendChild(createWorkoutItem(w)));
          UI.openModal("📖 Historial", body);
        }, html: "📖 Historial" }),
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px; background:rgba(0,243,255,0.1); border:1px solid #00f3ff; color:#00f3ff;", onclick: scheduleWorkout, html: "📅 Agendar" }),
        el("button", { class: "btn", style: "font-size:12px; padding:6px 10px; background:rgba(255,0,85,0.15); border:1px solid #ff0055; color:#ff0055; font-weight:bold;", onclick: openPdfModal, html: "📄 PDF" }),
        el("button", { class: "btn primary", style: "font-size:12px; padding:6px 10px;", onclick: add, html: "＋ Registrar" })
      ])
    ]));

    const kpiHtml = document.createElement('div');
    kpiHtml.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div style="background:rgba(255,0,85,0.05); border:1px solid rgba(255,0,85,0.3); border-radius:12px; padding:14px; text-align:center;">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:4px;">🔥 Racha</span>
          <span style="font-size:32px; font-weight:900; color:#ff0055; line-height:1;">${st.streak}</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:6px;">Días seguidos</span>
        </div>
        <div style="background:rgba(0,243,255,0.05); border:1px solid rgba(0,243,255,0.3); border-radius:12px; padding:14px; text-align:center;">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:4px;">📅 Este mes</span>
          <span style="font-size:32px; font-weight:900; color:#00f3ff; line-height:1;">${st.monthCount}</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:6px;">Sesiones</span>
        </div>
        <div style="background:rgba(188,132,238,0.08); border:1px solid rgba(188,132,238,0.3); border-radius:12px; padding:14px; text-align:center;">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:4px;">⏳ Minutos</span>
          <span style="font-size:32px; font-weight:900; color:#bc84ee; line-height:1;">${fmt.num(st.monthMinutes)}</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:6px;">Entrenados (Mes)</span>
        </div>
        <div style="background:rgba(0,255,136,0.05); border:1px solid rgba(0,255,136,0.3); border-radius:12px; padding:14px; text-align:center;">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:4px;">⚡ Calorías</span>
          <span style="font-size:32px; font-weight:900; color:#00ff88; line-height:1;">${fmt.num(st.monthCalories)}</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:6px;">Quemadas (Mes)</span>
        </div>
      </div>
    `;
    container.appendChild(kpiHtml);

    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "display:flex; align-items:center; gap:6px;" }, [
        el("span", { class: "dot", style: "background:#00f3ff;" }),
        el("span", { style: "color:#00f3ff; font-weight:bold; font-size:14px;", text: "📈 Evolución: Minutos últimos 7 días" })
      ])
    ]);
    const cv = el("canvas");
    chartCard.appendChild(el("div", { class: "chart-box" }, [cv]));
    container.appendChild(chartCard);
    
    setTimeout(() => { if (Charts) Charts.line(cv, { labels: weekMinutes().labels, values: weekMinutes().values }, { color: "#00f3ff", height: 170 }); }, 30);

    const arr = workouts().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Historial de Cargas y Combos"])])
    ]);
    if (!arr.length) listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "⚡" }), el("div", { text: "Sin entrenamientos. ¡Registra el primero!" })]));
    else arr.slice(0, 20).forEach((w) => listCard.appendChild(createWorkoutItem(w)));
    
    container.appendChild(listCard);
    container.appendChild(buildCalendar());
  }

  N.Workouts = { render, stats, weekMinutes, streak };
})();
