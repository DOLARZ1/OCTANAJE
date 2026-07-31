/* =====================================================================
   OCTANAJE · Módulo Entrenamientos (Diseño Neón + Calendario + Alinear)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();

  // SUPER BASE DE DATOS INTELIGENTE (Pesas + Calistenia + Crossfit + Parkour)
  const EXERCISE_DB = [
    // Pecho / Tracciones Horizontales
    "Press de Banca", "Press Inclinado", "Aperturas / Cristos", "Lagartijas / Push ups", 
    "Flexiones Diamante (Diamond Push ups)", "Flexiones Arquero (Archer Push ups)", "Typewriter Push ups",
    "Pseudo Planche Push-ups", "One Arm Push-up (OAPU)",
    // Espalda / Tracciones Verticales
    "Dominadas / Pull ups", "Chin ups (Dominadas Supinas)", "Remo con Barra", "Jalón al pecho", "Peso Muerto", 
    "Muscle Up (Barra)", "Muscle Up (Anillas)", "Front Lever", "Back Lever", "Archer Pull-ups",
    "One Arm Pull-up (OAP)", "Skin the Cat", "Hefesto", "Iron Cross (Cruz de Hierro)",
    // Cuádriceps / Pierna
    "Sentadilla Libre (Back Squat)", "Sentadilla Frontal (Front Squat)", "Prensa / Hack", 
    "Extensiones de pierna", "Desplantes / Lunges", "Pistol Squats (Sentadilla a 1 pierna)",
    // Glúteo / Isquio
    "Curl Femoral", "Hip Thrust", "Puente de Glúteo", "Peso Muerto Rumano", "Kettlebell Swing",
    // Hombro / Empuje Vertical / Isométricos
    "Press Militar", "Elevaciones Laterales", "Pájaros / Vuelos", "Encogimientos", 
    "Handstand Push up (HSPU)", "Parada de Manos (Handstand hold)", "Handstand Walk (Caminata de Manos)",
    "Tuck Planche", "Straddle Planche", "Full Planche",
    // Bíceps
    "Curl con Barra", "Curl Martillo", "Curl en Banco Predicador",
    // Tríceps
    "Copa Tríceps", "Extensiones en Polea", "Fondos / Dips", "Press Francés", "Fondos en Anillas (Ring Dips)",
    // Core / Abdomen
    "Crunch Abdominal", "Plancha Isométrica", "L-Sit", "V-Sit", "Toes to Bar (T2B)", "Knees to Elbows", "Chest to Bar (C2B)", 
    "Dragon Flag", "Human Flag (Bandera Humana)", "Sit-ups",
    // Halterofilia y Crossfit (Metcons)
    "Snatch (Arrancada)", "Clean & Jerk (Cargada y Envión)", "Power Clean", "Squat Clean", "Hang Clean",
    "Thruster", "Wall Balls (Balones a la pared)", "Box Jumps (Saltos al cajón)", 
    "Double Unders (Saltos Dobles)", "Single Unders", "Burpees", "Burpee Box Jump Over", 
    "Rope Climb (Escalada de Cuerda)", "Overhead Squat", "Turkish Get Up", "Farmer's Carry", 
    "Sled Push (Empuje de Trineo)", "Assault Bike (Calorías)", "Rowing (Remo en máquina)",
    // Parkour / Freerunning
    "Safety Vault (Salto de seguridad)", "Kong Vault (Salto de Gato)", "Speed Vault (Salto rápido)",
    "Dash Vault", "Kash Vault", "Lazy Vault", "Wall Run (Pasavallas de Pared)", 
    "Cat Leap (Salto de Brazo)", "Precision Jump (Salto de Precisión)", "Tic Tac", 
    "Parkour Roll (Rodada)", "Climb Up (Planche de Parkour)", "Laché (Balanceo)", "Underbar (Bajo valla)",
    // Otros
    "Elevación de Talones (Pantorrilla)"
  ].sort();

  // Ícono SVG a medida
  const CALISTENIA_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1-2.75.25 1.25-1 2.5-1 2.5S6.5 12 6.5 10.5c0-1.5 1-3.5 1.5-4C7.5 8 7 6 6 4c0 0 3.5 1 3.5 4.5V9c0 1.5 1.5 2.5 1.5 4.25S9.657 15 8 15Z"/>' +
    '</svg>';

  const TYPES = [
    { value: "fuerza", name: "Fuerza / Pesas", icon: "🏋️" },
    { value: "cardio", name: "Cardio", icon: "🏃" },
    { value: "hiit", name: "HIIT", icon: "⚡" },
    { value: "crossfit", name: "Crossfit", icon: "🔥" },
    { value: "calistenia", name: "Calistenia", icon: "🔥", svg: CALISTENIA_SVG },
    { value: "yoga", name: "Yoga / Movilidad", icon: "🧘" },
    { value: "estiramiento", name: "Estiramiento", icon: "🤸" },
    { value: "caminata", name: "Caminata", icon: "🚶" },
    { value: "correr", name: "Running", icon: "🏃‍♂️" },
    { value: "ciclismo", name: "Ciclismo", icon: "🚴" },
    { value: "natacion", name: "Natación", icon: "🏊" },
    { value: "remo", name: "Remo", icon: "🚣" },
    { value: "futbol", name: "Fútbol", icon: "⚽" },
    { value: "basquet", name: "Baloncesto", icon: "🏀" },
    { value: "tenis", name: "Tenis", icon: "🎾" },
    { value: "voleibol", name: "Voleibol", icon: "🏐" },
    { value: "beisbol", name: "Béisbol", icon: "⚾" },
    { value: "americano", name: "Fútbol americano", icon: "🏈" },
    { value: "rugby", name: "Rugby", icon: "🏉" },
    { value: "boxeo", name: "Boxeo", icon: "🥊" },
    { value: "artesmarciales", name: "Artes marciales", icon: "🥋" },
    { value: "escalada", name: "Escalada", icon: "🧗" },
    { value: "golf", name: "Golf", icon: "⛳" },
    { value: "pingpong", name: "Ping pong", icon: "🏓" },
    { value: "badminton", name: "Bádminton", icon: "🏸" },
    { value: "hockey", name: "Hockey", icon: "🏒" },
    { value: "patinaje", name: "Patinaje", icon: "⛸️" },
    { value: "esqui", name: "Esquí", icon: "🎿" },
    { value: "snowboard", name: "Snowboard", icon: "🏂" },
    { value: "surf", name: "Surf", icon: "🏄" },
    { value: "senderismo", name: "Senderismo", icon: "🥾" },
    { value: "baile", name: "Baile", icon: "💃" },
    { value: "deporte", name: "Otro deporte", icon: "🏅" },
    { value: "otro", name: "Otro (Personalizado)", icon: "💪" }
  ];

  function workouts() { return Store.get().workouts; }

  function getWorkoutName(w) {
    if (w.type === "otro" && w.customName) return w.customName;
    const t = TYPES.find((x) => x.value === w.type);
    return t ? t.name : (w.type || "Otro");
  }

  function getWorkoutIconNode(w) {
    if (w.type === "otro" && w.customIcon) return el("span", { style: "font-size:22px", text: w.customIcon });
    const t = TYPES.find((x) => x.value === w.type);
    if (t && t.svg) return el("span", { class: "tico-svg", html: t.svg });
    return el("span", { style: "font-size:22px", text: (t && t.icon) || "💪" });
  }

  function getWorkoutEmoji(w) {
    if (w.type === "otro" && w.customIcon) return w.customIcon;
    const t = TYPES.find((x) => x.value === w.type);
    return t ? t.icon : "💪";
  }

  // ---------------- CALENDARIO Y GOOGLE CALENDAR ----------------
  let currentCalWorkouts = new Date();
  window.changeWorkoutCalMonth = function(delta) {
    currentCalWorkouts.setMonth(currentCalWorkouts.getMonth() + delta);
    if (N.Workouts && N.Workouts.render) {
      N.Workouts.render(document.getElementById('view-workouts'), true);
    }
  };

  window.scheduleWorkout = function() {
    const title = encodeURIComponent("Sesión de Entrenamiento (OCTANAJE)");
    const details = encodeURIComponent("Es hora de entrenar y registrar tus marcas en la app OCTANAJE. ¡No rompas la racha!");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(url, '_blank');
  };

  // ---------------- EXPORTAR A PDF ----------------
  function openPdfModal() {
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:16px", text: "Elige el periodo del resumen a descargar en PDF:" }),
      el("button", { class: "btn primary block", style: "margin-bottom:10px", html: "📅 Diario (hoy)", onclick: () => { UI.closeModal(); exportPDF("daily"); } }),
      el("button", { class: "btn block", style: "margin-bottom:10px", html: "🗓️ Semanal (últimos 7 días)", onclick: () => { UI.closeModal(); exportPDF("weekly"); } }),
      el("button", { class: "btn block", html: "📆 Mensual (este mes)", onclick: () => { UI.closeModal(); exportPDF("monthly"); } }),
      el("p", { class: "fs-12 text-faint", style: "margin-top:16px", html: "Se abrirá la ventana de impresión: elige <b>\"Guardar como PDF\"</b>." })
    ]);
    UI.openModal("📄 Descargar PDF de entrenamiento", body);
  }

  function rangeFor(period) {
    const to = DateUtil.todayKey();
    let from, label;
    if (period === "daily") { from = to; label = "Diario"; }
    else if (period === "weekly") { from = DateUtil.addDays(to, -6); label = "Semanal"; }
    else { const d = new Date(); from = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; label = "Mensual"; }
    return { from: from, to: to, label: label };
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
          if (e.sets || e.reps) txt += " " + (e.sets || "?") + "×" + (e.reps || "?");
          if (e.weight) txt += " @ " + e.weight + "kg";
          return txt;
        }).join("<br>");

        rows += "<tr>" +
          "<td>" + DateUtil.parse(w.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) + "</td>" +
          "<td><b>" + esc(w.name) + "</b></td>" +
          "<td>" + getWorkoutEmoji(w) + " " + esc(getWorkoutName(w)) + "</td>" +
          "<td style='text-align:center'>" + (w.duration || 0) + " min</td>" +
          "<td style='text-align:center'>" + (w.calories || 0) + "</td>" +
          "<td>" + (exs || "—") + (w.volume ? "<div style='color:#00b3c4;font-size:10px;'>💪 Vol: " + esc(w.volume) + "</div>" : "") + "</td>" +
          "</tr>";
      });
    }

    const html = `<!doctype html><html lang='es'><head><meta charset='utf-8'><title>OCTANAJE · Resumen ${r.label}</title>
      <style>
      *{box-sizing:border-box;font-family:system-ui,sans-serif}
      body{margin:0;padding:32px;color:#0f172a;background:#fff}
      .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0284c7;padding-bottom:14px;margin-bottom:20px}
      .logo{font-size:22px;font-weight:900;color:#0f172a} .logo span{color:#0284c7}
      .kpis{display:flex;gap:12px;margin:18px 0}
      .kpi{flex:1;border:1px solid #cbd5e1;border-radius:12px;padding:12px;text-align:center;background:#f8fafc}
      .kpi .n{font-size:24px;font-weight:900;color:#0284c7}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:15px}
      th{background:#0284c7;color:#fff;text-align:left;padding:8px}
      td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
      </style></head><body>
      <div class='hd'><div><div class='logo'>⚡ OCTAN<span>AJE</span></div></div><div style='text-align:right'><h2>Resumen de Entrenamiento</h2><div>${r.label}</div></div></div>
      <div class='kpis'>
      <div class='kpi'><div class='n'>${list.length}</div><div class='l'>Sesiones</div></div>
      <div class='kpi'><div class='n'>${totalMin}</div><div class='l'>Minutos Totales</div></div>
      <div class='kpi'><div class='n'>${totalKcal}</div><div class='l'>Kcal Quemadas</div></div>
      </div>
      <table><thead><tr><th>Fecha</th><th>Sesión</th><th>Tipo</th><th>Min</th><th>Kcal</th><th>Ejercicios</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    Audio.play("tap");
    setTimeout(() => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(() => iframe.remove(), 1500); }, 500);
  }

  // ---------------- FORMULARIO DE EJERCICIOS CON ALINEACIÓN PERFECTA ⭐ ----------------
  function buildExerciseSection() {
    if (!document.getElementById("ex-datalist")) {
      const dlist = el("datalist", { id: "ex-datalist" });
      EXERCISE_DB.forEach(name => dlist.appendChild(el("option", { value: name })));
      document.body.appendChild(dlist);
    }

    const list = el("div", { style: "display:flex; flex-direction:column; gap:10px;" });
    
    function addRow(ex) {
      let isFav = ex ? (ex.isFav || false) : false;
      
      const favBtn = el("button", { 
        type: "button", 
        html: isFav ? "⭐" : "☆", 
        title: "Marcar como Favorito",
        style: "background:transparent; border:none; cursor:pointer; font-size:18px; padding:0 8px 0 0; outline:none; display:flex; align-items:center;", 
        onclick: () => { 
          isFav = !isFav; 
          favBtn.innerHTML = isFav ? "⭐" : "☆"; 
        }
      });

      const nameI = el("input", { class: "input", placeholder: "Ejercicio (ej. Press)", style: "flex:1; min-width:0; background:transparent; border:none; padding:10px 8px; color:white; outline:none; box-sizing:border-box;" });
      nameI.setAttribute("list", "ex-datalist");
      
      const nameWrap = el("div", { style: "display:flex; align-items:center; margin-bottom:8px; background:#1a1f35; border:1px solid #2a314d; border-radius:6px; padding-left:10px;" }, [
        favBtn, nameI
      ]);

      const setsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Series", style: "flex:1; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      const repsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Reps", style: "flex:1; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      const weightI = el("input", { class: "input", type: "number", step: "0.5", min: 0, placeholder: "Peso kg", style: "flex:1.5; min-width:0; text-align:center; padding:10px 4px; box-sizing:border-box; border:1px solid #2a314d; border-radius:6px; background:#1a1f35; color:white;" });
      
      if (ex) { nameI.value = ex.name || ""; setsI.value = ex.sets || ""; repsI.value = ex.reps || ""; weightI.value = ex.weight || ""; }
      
      const row = el("div", { style: "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 10px; border-radius: 8px;" }, [
        nameWrap,
        el("div", { style: "display:flex; gap:8px; align-items:center; width:100%; justify-content:space-between;" }, [
          setsI, el("span", { class: "text-faint", style:"font-weight:bold;", text: "×" }), 
          repsI, el("span", { class: "text-faint", style:"font-weight:bold;", text: "@" }), 
          weightI,
          el("button", { class: "icon-btn", type: "button", html: "🗑️", style:"margin:0; padding:8px; display:flex; align-items:center;", onclick: () => { 
            if (list.children.length > 1) row.remove(); 
            else { nameI.value = ""; setsI.value = ""; repsI.value = ""; weightI.value = ""; isFav = false; favBtn.innerHTML = "☆"; } 
          }})
        ])
      ]);
      row._get = () => ({ name: nameI.value.trim(), sets: Number(setsI.value) || 0, reps: Number(repsI.value) || 0, weight: Number(weightI.value) || 0, isFav: isFav });
      list.appendChild(row);
    }
    addRow(null);
    return { 
      node: el("div", { class: "field" }, [
        el("label", { text: "🏋️ Ejercicios y Cargas" }), 
        list, 
        el("button", { class: "btn sm", type: "button", html: "＋ Añadir Ejercicio", style: "margin-top:10px; width:100%; border:1px dashed #00f3ff; color:#00f3ff; background:transparent; padding:10px;", onclick: () => addRow(null) })
      ]), 
      getData: () => Array.from(list.children).map((r) => r._get()).filter((x) => x.name) 
    };
  }

  function add() {
    const ex = buildExerciseSection();
    const body = UI.form([
      { name: "name", label: "Nombre de la sesión", placeholder: "Ej. Pecho y tríceps pesados", required: true },
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
      
      const exData = ex.getData();
      let autoVolume = 0;
      exData.forEach(e => { if (e.sets && e.reps && e.weight) autoVolume += (e.sets * e.reps * e.weight); });
      
      let finalVolume = data.volume;
      if (!finalVolume && autoVolume > 0) finalVolume = autoVolume.toLocaleString() + " kg";
      else if (finalVolume && autoVolume > 0) finalVolume = autoVolume.toLocaleString() + " kg · " + finalVolume;

      const xp = Math.min(30, 10 + Math.round(dur / 5));
      workouts().push({ 
        id: Store.uid(), name: data.name, type: data.type, 
        customName: data.customName, customIcon: data.customIcon, 
        date: data.date, duration: dur, calories: Number(data.calories) || 0, 
        volume: finalVolume, notes: data.notes, exercises: exData, xpEarned: xp 
      });
      Store.commit(); Audio.play("complete"); Gami.award(xp, "Entrenamiento registrado 💪");
      UI.closeModal(); render(document.getElementById("view-workouts")); N.App && N.App.refreshTop();
    }, "Registrar entrenamiento", () => ex.node);
    UI.openModal("Nuevo entrenamiento", body);
  }

  function remove(w) {
    UI.confirmBox("Eliminar entrenamiento", `¿Eliminar "${w.name}"?`, () => {
      const arr = workouts(); arr.splice(arr.indexOf(w), 1);
      Audio.play("delete");
      const xp = w.xpEarned != null ? w.xpEarned : Math.min(30, 10 + Math.round((w.duration || 0) / 5));
      if (xp) Gami.remove(xp); else Store.commit();
      render(document.getElementById("view-workouts")); N.App && N.App.refreshTop();
    }, "Eliminar");
  }

  // ---------------- ESTADÍSTICAS ----------------
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

  // ---------------- RENDERIZAR ELEMENTO DE LISTA ----------------
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
        let txt = e.isFav ? "⭐ " + e.name : e.name;
        if (e.sets || e.reps) txt += `  ${e.sets||0}×${e.reps||0}`;
        if (e.weight) txt += ` @ ${e.weight}kg`;
        if (e.sets && e.reps && e.weight) {
            const vol = e.sets * e.reps * e.weight;
            exWrap.appendChild(el("span", { class: "chip", html: `<b>${txt}</b> <span style="opacity:0.6;font-size:10px;margin-left:4px;">(${vol}kg)</span>` }));
        } else {
            exWrap.appendChild(el("span", { class: "chip", text: txt }));
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

  // ---------------- CALENDARIO CON REGLAS DE COLOR (VERDE Y ROJO) ----------------
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
      
      if (hasWorkout) {
        // verde neón (entrenado)
        dayStyle += " background:rgba(0, 255, 136, 0.2); border:1px solid #00ff88; color:#00ff88;";
      } else if (key < todayStr) {
        // rojo neón (día pasado sin entrenar)
        dayStyle += " background:rgba(255, 0, 85, 0.15); border:1px solid #ff0055; color:#ff0055;";
      } else if (key === todayStr) {
        // cian (hoy aún no registrado)
        dayStyle += " background:rgba(0, 243, 255, 0.1); border:2px solid #00f3ff; color:#ffffff;";
      } else {
        // futuro
        dayStyle += " background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); color:#888888;";
      }

      grid.appendChild(el("div", { 
        class: "cal-day clickable", 
        style: dayStyle, 
        text: String(d), 
        onclick: () => openWorkoutDayDetail(key) 
      }));
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

    // 1. Cabecera y Botones de Acción
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

    // 2. Las 4 Paletas Neón de Estadísticas
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

    // 3. Gráfica Neón Dinámica (Línea)
    const chartCard = el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "display:flex; align-items:center; gap:6px;" }, [
        el("span", { class: "dot", style: "background:#00f3ff;" }),
        el("span", { style: "color:#00f3ff; font-weight:bold; font-size:14px;", text: "📈 Evolución: Minutos últimos 7 días" })
      ])
    ]);
    const cv = el("canvas");
    chartCard.appendChild(el("div", { class: "chart-box" }, [cv]));
    container.appendChild(chartCard);
    
    setTimeout(() => {
      if (Charts) Charts.line(cv, { 
        labels: weekMinutes().labels, 
        values: weekMinutes().values 
      }, { color: "#00f3ff", height: 170 });
    }, 30);

    // 4. Historial Completo
    const arr = workouts().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const listCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Historial de Cargas y Volumen"])])
    ]);
    if (!arr.length) {
      listCard.appendChild(el("div", { class: "empty" }, [el("span", { class: "big", text: "⚡" }), el("div", { text: "Sin entrenamientos. ¡Registra el primero!" })]));
    } else {
      arr.slice(0, 20).forEach((w) => listCard.appendChild(createWorkoutItem(w)));
    }
    container.appendChild(listCard);

    // 5. Calendario Mensual al Final
    container.appendChild(buildCalendar());
  }

  N.Workouts = { render, stats, weekMinutes, streak };
})();
