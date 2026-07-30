/* =====================================================================
   OCTANAJE · Módulo Entrenamientos
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  // Ícono SVG a medida: llama estilo Crossfit para Calistenia
  // (misma familia visual que 🔥, pero como trazo propio para diferenciarla
  //  ligeramente del emoji de Crossfit)
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
  function typeName(v) { const t = TYPES.find((x) => x.value === v); return t ? t.name : (v || "Otro"); }
  function typeEmoji(v) { const t = TYPES.find((x) => x.value === v); return t ? t.icon : "💪"; }

  // ---------- Exportar resumen a PDF (vía impresión del navegador) ----------
  function openPdfModal() {
    const body = el("div", {}, [
      el("p", { class: "text-dim fs-13", style: "margin-bottom:16px", text: "Elige el periodo del resumen a descargar en PDF:" }),
      el("button", { class: "btn primary block", style: "margin-bottom:10px", html: "📅 Diario (hoy)", onclick: () => { UI.closeModal(); exportPDF("daily"); } }),
      el("button", { class: "btn block", style: "margin-bottom:10px", html: "🗓️ Semanal (últimos 7 días)", onclick: () => { UI.closeModal(); exportPDF("weekly"); } }),
      el("button", { class: "btn block", html: "📆 Mensual (este mes)", onclick: () => { UI.closeModal(); exportPDF("monthly"); } }),
      el("p", { class: "fs-12 text-faint", style: "margin-top:16px", html: "Se abrirá la ventana de impresión: elige <b>\"Guardar como PDF\"</b> como destino." })
    ]);
    UI.openModal("📄 Descargar PDF de entrenamiento", body);
  }

  function rangeFor(period) {
    const to = DateUtil.todayKey();
    let from, label;
    if (period === "daily") { from = to; label = "Diario"; }
    else if (period === "weekly") { from = DateUtil.addDays(to, -6); label = "Semanal"; }
    else {
      const d = new Date(); from = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"; label = "Mensual";
    }
    return { from: from, to: to, label: label };
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function exportPDF(period) {
    const r = rangeFor(period);
    const list = workouts().filter((w) => w.date >= r.from && w.date <= r.to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    const totalMin = list.reduce((s, w) => s + (w.duration || 0), 0);
    const totalKcal = list.reduce((s, w) => s + (w.calories || 0), 0);
    const byType = {};
    list.forEach((w) => { byType[w.type] = (byType[w.type] || 0) + 1; });

    const fromLbl = DateUtil.parse(r.from).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const toLbl = DateUtil.parse(r.to).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    let rows = "";
    if (!list.length) {
      rows = '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">Sin entrenamientos en este periodo.</td></tr>';
    } else {
      list.forEach((w) => {
        const exs = (w.exercises || []).map((e) => esc(e.name) + ((e.sets || e.reps) ? " " + (e.sets || "?") + "×" + (e.reps || "?") : "")).join("<br>");
        rows += "<tr>" +
          "<td>" + DateUtil.parse(w.date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) + "</td>" +
          "<td><b>" + esc(w.name) + "</b></td>" +
          "<td>" + typeEmoji(w.type) + " " + esc(typeName(w.type)) + "</td>" +
          "<td style='text-align:center'>" + (w.duration || 0) + " min</td>" +
          "<td style='text-align:center'>" + (w.calories || 0) + "</td>" +
          "<td>" + (exs || "—") + (w.notes ? "<div style='color:#666;font-size:11px;margin-top:4px'>📝 " + esc(w.notes) + "</div>" : "") + "</td>" +
          "</tr>";
      });
    }

    const typeChips = Object.keys(byType).map((k) => typeEmoji(k) + " " + esc(typeName(k)) + ": " + byType[k]).join(" &nbsp;·&nbsp; ") || "—";

    const html = "<!doctype html><html lang='es'><head><meta charset='utf-8'><title>OCTANAJE · Resumen " + r.label + "</title>" +
      "<style>" +
      "*{box-sizing:border-box;font-family:'Segoe UI',system-ui,Arial,sans-serif}" +
      "body{margin:0;padding:32px;color:#1a1a2e;background:#fff}" +
      ".hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #6a5cff;padding-bottom:14px;margin-bottom:20px}" +
      ".logo{font-size:22px;font-weight:800;letter-spacing:2px;color:#6a5cff}" +
      ".logo span{color:#00b3c4}" +
      ".sub{color:#666;font-size:13px}" +
      "h1{font-size:20px;margin:0 0 4px}" +
      ".kpis{display:flex;gap:12px;margin:18px 0}" +
      ".kpi{flex:1;border:1px solid #e3e3ee;border-radius:12px;padding:12px 14px}" +
      ".kpi .n{font-size:24px;font-weight:800;color:#6a5cff}" +
      ".kpi .l{font-size:12px;color:#777;text-transform:uppercase;letter-spacing:1px}" +
      ".types{background:#f4f4fb;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:18px}" +
      "table{width:100%;border-collapse:collapse;font-size:12.5px}" +
      "th{background:#6a5cff;color:#fff;text-align:left;padding:8px 10px;font-size:12px}" +
      "td{padding:8px 10px;border-bottom:1px solid #ececf4;vertical-align:top}" +
      "tr:nth-child(even) td{background:#fafaff}" +
      ".ft{margin-top:24px;color:#999;font-size:11px;text-align:center;border-top:1px solid #eee;padding-top:12px}" +
      "@media print{body{padding:0}}" +
      "</style></head><body>" +
      "<div class='hd'><div><div class='logo'>▲ OCTAN<span>AJE</span></div><div class='sub'>Salud y Disciplina</div></div>" +
      "<div style='text-align:right'><h1>Resumen de entrenamiento</h1><div class='sub'>" + r.label + " · " + (r.from === r.to ? fromLbl : fromLbl + " → " + toLbl) + "</div></div></div>" +
      "<div class='kpis'>" +
      "<div class='kpi'><div class='n'>" + list.length + "</div><div class='l'>Sesiones</div></div>" +
      "<div class='kpi'><div class='n'>" + totalMin + "</div><div class='l'>Minutos</div></div>" +
      "<div class='kpi'><div class='n'>" + totalKcal + "</div><div class='l'>Calorías</div></div>" +
      "</div>" +
      "<div class='types'><b>Por tipo:</b> " + typeChips + "</div>" +
      "<table><thead><tr><th>Fecha</th><th>Sesión</th><th>Tipo</th><th style='text-align:center'>Duración</th><th style='text-align:center'>Kcal</th><th>Ejercicios / Notas</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<div class='ft'>Generado por OCTANAJE · " + new Date().toLocaleString("es-MX") + "</div>" +
      "</body></html>";

    // Imprimir mediante un iframe oculto (no lo bloquean los popups)
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

  // Sección dinámica de ejercicios (nombre + series × reps, con botón ＋)
  function buildExerciseSection() {
    const list = el("div", { class: "ex-list" });
    function addRow(ex) {
      const nameI = el("input", { class: "input ex-name", placeholder: "Ejercicio (ej. Sentadilla)" });
      const setsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Series" });
      const repsI = el("input", { class: "input", type: "number", min: 0, placeholder: "Reps" });
      if (ex) { nameI.value = ex.name || ""; setsI.value = ex.sets || ""; repsI.value = ex.reps || ""; }
      const row = el("div", { class: "ex-row" }, [
        nameI,
        el("div", { class: "ex-sr" }, [setsI, el("span", { class: "ex-x", text: "×" }), repsI]),
        el("button", { class: "icon-btn", type: "button", title: "Quitar ejercicio", html: "✕", onclick: () => { if (list.children.length > 1) row.remove(); else { nameI.value = ""; setsI.value = ""; repsI.value = ""; } } })
      ]);
      row._get = () => ({ name: nameI.value.trim(), sets: Number(setsI.value) || 0, reps: Number(repsI.value) || 0 });
      list.appendChild(row);
    }
    addRow(null);
    const node = el("div", { class: "field" }, [
      el("label", { text: "Ejercicios (opcional)" }),
      list,
      el("button", { class: "btn sm", type: "button", html: "＋ Agregar ejercicio", onclick: () => addRow(null) })
    ]);
    return { node: node, getData: () => Array.from(list.children).map((r) => r._get()).filter((x) => x.name) };
  }

  function add() {
    const ex = buildExerciseSection();
    const body = UI.form([
      { name: "name", label: "Nombre de la sesión", placeholder: "Pecho y tríceps", required: true },
      { name: "type", label: "Tipo", type: "select", value: "fuerza", options: TYPES.map((t) => ({ value: t.value, label: t.icon + " " + t.name })) },
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
      const xp = Math.min(30, 10 + Math.round(dur / 5));
      workouts().push({ id: Store.uid(), name: data.name, type: data.type, date: data.date, duration: dur, calories: Number(data.calories) || 0, volume: data.volume, notes: data.notes, exercises: ex.getData(), xpEarned: xp });
      Store.commit();
      Audio.play("complete");
      Gami.award(xp, "Entrenamiento registrado 💪");
      UI.closeModal();
      render(document.getElementById("view-workouts"));
      N.App && N.App.refreshTop();
    }, "Registrar entrenamiento", () => ex.node);
    UI.openModal("Nuevo entrenamiento", body);
  }

  function remove(w) {
    UI.confirmBox("Eliminar entrenamiento", `¿Eliminar "${w.name}"?`, () => {
      const arr = workouts(); arr.splice(arr.indexOf(w), 1);
      Audio.play("delete");
      const xp = w.xpEarned != null ? w.xpEarned : Math.min(30, 10 + Math.round((w.duration || 0) / 5));
      if (xp) Gami.remove(xp); else Store.commit(); // devolver la XP ganada
      render(document.getElementById("view-workouts"));
      N.App && N.App.refreshTop();
    }, "Eliminar");
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
        el("h1", { class: "view-title" }, [N.Icons.node("dumbbell"), "Entrenamientos"]),
        el("p", { class: "view-desc", text: "Registra tus sesiones y observa tu progreso físico." })
      ]),
      el("div", { class: "flex gap-8" }, [
        el("button", { class: "btn", onclick: openPdfModal, html: "📄 PDF" }),
        el("button", { class: "btn primary", onclick: add, html: "＋ Registrar sesión" })
      ])
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
        const item = el("div", { class: "item", style: "flex-direction:column;align-items:stretch" });
        item.appendChild(el("div", { class: "flex items-center gap-12" }, [
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
        if (w.exercises && w.exercises.length) {
          const exWrap = el("div", { style: "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px" });
          w.exercises.forEach((e) => exWrap.appendChild(el("span", { class: "chip", text: e.name + ((e.sets || e.reps) ? "  " + (e.sets || "?") + "×" + (e.reps || "?") : "") })));
          item.appendChild(exWrap);
        }
        if (w.notes) item.appendChild(el("div", { class: "fs-12 text-dim", style: "margin-top:8px", text: "📝 " + w.notes }));
        listCard.appendChild(item);
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
