/* =====================================================================
   OCTANAJE · Módulo Hábitos (Paletas Neón + Reseteo Mensual Exacto)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS = window.NEXUS || {};
  const { Store, UI, Audio, Gami } = N;
  const { el, toast } = UI;
  const DateUtil = Store.DateUtil;

  const today = () => DateUtil.todayKey();

  // Inicializar base de datos de hábitos si no existe
  function habits() {
    const s = Store.get();
    if (!s.habits) s.habits = [];
    return s.habits;
  }

  // ---------------- ESTADÍSTICAS NEÓN ----------------
  function stats() {
    const list = habits();
    const tKey = today();
    const mKey = DateUtil.monthKey(); // ej: "2026-08"

    let todayTotal = 0;
    let todayCompleted = 0;
    let monthTotalActions = 0;
    let monthCompletedActions = 0;

    list.forEach(h => {
      // Activos hoy
      todayTotal++;
      if (h.history && h.history.includes(tKey)) {
        todayCompleted++;
      }

      // Cálculo de cumplimiento del mes actual
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      monthTotalActions += daysInMonth; // Lo que debería cumplir en el mes
      
      const doneThisMonth = (h.history || []).filter(d => d.startsWith(mKey)).length;
      monthCompletedActions += doneThisMonth;
    });

    const compliancePct = monthTotalActions === 0 ? 0 : Math.round((monthCompletedActions / monthTotalActions) * 100);

    return {
      todayTotal,
      todayCompleted,
      activeHabits: list.length,
      compliancePct
    };
  }

  // ---------------- LÓGICA DE INTERACCIÓN ----------------
  function toggleHabit(h) {
    const tKey = today();
    if (!h.history) h.history = [];
    
    const idx = h.history.indexOf(tKey);
    if (idx >= 0) {
      h.history.splice(idx, 1);
      Audio.play("tap");
    } else {
      h.history.push(tKey);
      Audio.play("levelup");
      Gami.award(5, `Hábito cumplido: ${h.name}`);
    }
    Store.commit();
    render(document.getElementById("view-habits"));
    if (N.App && N.App.refreshTop) N.App.refreshTop();
  }

  function add() {
    const body = UI.form([
      { name: "name", label: "Nombre del Hábito", placeholder: "Ej. Leer 10 páginas, Tomar 2L de agua", required: true },
      { name: "icon", label: "Icono (Emoji)", placeholder: "Ej. 💧, 📖, 🧘‍♂️", required: true }
    ], (data) => {
      habits().push({
        id: Store.uid(),
        name: data.name,
        icon: data.icon || "⚡",
        history: [],
        created: today()
      });
      Store.commit();
      Audio.play("complete");
      UI.closeModal();
      render(document.getElementById("view-habits"));
    }, "Crear Hábito");
    UI.openModal("Nuevo Hábito", body);
  }

  function remove(h) {
    UI.confirmBox("Eliminar Hábito", `¿Estás seguro de eliminar "${h.name}" y todo su progreso?`, () => {
      const arr = habits();
      arr.splice(arr.indexOf(h), 1);
      Store.commit();
      Audio.play("delete");
      render(document.getElementById("view-habits"));
    }, "Eliminar");
  }

  // ---------------- UI DE CADA HÁBITO ----------------
  function createHabitCard(h) {
    const tKey = today();
    const isDone = (h.history || []).includes(tKey);

    const card = el("div", { class: `card mb-16 ${isDone ? "habit-done" : ""}`, style: "padding: 16px; border-radius: 16px; border: 1px solid var(--border-strong); background: var(--panel);" });
    
    // Cabecera del hábito
    const header = el("div", { class: "flex items-center justify-between gap-12", style: "margin-bottom: 12px;" });
    
    const info = el("div", { class: "flex items-center gap-12", style: "flex: 1; min-width: 0;" });
    info.appendChild(el("span", { style: "font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));", text: h.icon || "⚡" }));
    info.appendChild(el("div", { class: "item-title", style: `font-size: 16px; font-weight: 800; ${isDone ? 'color: #00ff88;' : 'color: var(--txt);'}`, text: h.name }));
    
    const actions = el("div", { class: "flex items-center gap-8" });
    const checkBtn = el("button", { 
      class: `check ${isDone ? "on" : ""}`, 
      html: isDone ? "✔" : "",
      style: isDone ? "background: linear-gradient(135deg, #00ff9d, #00cc7a); color: #000; border: none; box-shadow: 0 0 15px rgba(0,255,136,0.4);" : "border: 2px solid var(--border-strong); background: rgba(0,0,0,0.2);",
      onclick: () => toggleHabit(h) 
    });
    
    const delBtn = el("button", { class: "icon-btn", html: "🗑️", style: "width:34px; height:34px; font-size:14px;", onclick: () => remove(h) });

    actions.appendChild(delBtn);
    actions.appendChild(checkBtn);
    
    header.appendChild(info);
    header.appendChild(actions);
    card.appendChild(header);

    // ---------------- HEATMAP MENSUAL (Reseteo Exacto) ----------------
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleDateString("es-MX", { month: "long" });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthPrefix = DateUtil.monthKey(); // Ej: "2026-08"

    const heatmapSection = el("div", { style: "border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px;" });
    
    const heatHeader = el("div", { class: "flex justify-between", style: "font-size: 11px; color: #aaa; text-transform: uppercase; margin-bottom: 8px; font-weight: bold;" });
    heatHeader.appendChild(el("span", { text: `Cumplimiento de ${monthName}` }));
    
    const doneThisMonth = (h.history || []).filter(d => d.startsWith(monthPrefix)).length;
    heatHeader.appendChild(el("span", { style: "color: #00f3ff;", text: `${doneThisMonth} / ${daysInMonth} DÍAS` }));
    
    heatmapSection.appendChild(heatHeader);

    // Dibuja la cuadrícula estricta del mes actual
    const heatGrid = el("div", { style: "display: grid; grid-template-columns: repeat(auto-fill, minmax(18px, 1fr)); gap: 6px;" });
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${monthPrefix}-${dayStr}`;
      
      const box = el("div", { 
        style: "aspect-ratio: 1/1; border-radius: 4px; display: grid; place-items: center; font-size: 9px; font-weight: bold; transition: all 0.3s ease;",
        text: d
      });

      if ((h.history || []).includes(fullDateStr)) {
        // Cumplido: Cian Neón
        box.style.background = "rgba(0, 243, 255, 0.2)";
        box.style.color = "#00f3ff";
        box.style.border = "1px solid #00f3ff";
        box.style.boxShadow = "0 0 8px rgba(0, 243, 255, 0.4)";
      } else if (fullDateStr > tKey) {
        // Futuro: Gris tenue
        box.style.background = "rgba(255, 255, 255, 0.03)";
        box.style.color = "#444";
        box.style.border = "1px solid rgba(255, 255, 255, 0.05)";
      } else {
        // Pasado no cumplido: Rojizo sutil
        box.style.background = "rgba(255, 0, 85, 0.05)";
        box.style.color = "rgba(255, 0, 85, 0.5)";
        box.style.border = "1px dashed rgba(255, 0, 85, 0.3)";
      }

      heatGrid.appendChild(box);
    }

    heatmapSection.appendChild(heatGrid);
    card.appendChild(heatmapSection);

    return card;
  }

  // ---------------- RENDER PRINCIPAL ----------------
  function render(container) {
    if (!container) return;
    container.innerHTML = "";
    
    const st = stats();

    // 1. Cabecera y Botón
    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [N.Icons ? N.Icons.node("check") : "✓", "Hábitos"]),
        el("p", { class: "view-desc", text: "Mantén tu disciplina intacta cada mes." })
      ]),
      el("div", { class: "flex gap-4", style: "margin-top: 10px;" }, [
        el("button", { class: "btn primary", style: "font-size:12px; padding:8px 14px;", onclick: add, html: "＋ Añadir Hábito" })
      ])
    ]));

    // 2. Paletas Neón Superiores
    const kpiHtml = document.createElement('div');
    kpiHtml.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; margin-bottom: 20px;">
        
        <div style="background:rgba(0,255,136,0.05); border:1px solid rgba(0,255,136,0.3); border-radius:14px; padding:16px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:6px; letter-spacing: 0.5px;">🟢 HOY</span>
          <span style="font-size:36px; font-weight:900; color:#00ff88; line-height:1; text-shadow: 0 0 15px rgba(0,255,136,0.4);">${st.todayCompleted}<span style="font-size:18px; color:#555;">/${st.todayTotal}</span></span>
          <span style="font-size:11px; color:#888; display:block; margin-top:8px;">Realizados</span>
        </div>

        <div style="background:rgba(188,132,238,0.08); border:1px solid rgba(188,132,238,0.3); border-radius:14px; padding:16px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:6px; letter-spacing: 0.5px;">📈 CUMPLIMIENTO</span>
          <span style="font-size:36px; font-weight:900; color:#bc84ee; line-height:1; text-shadow: 0 0 15px rgba(188,132,238,0.4);">${st.compliancePct}%</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:8px;">Mes Actual</span>
        </div>

        <div style="background:rgba(0,243,255,0.05); border:1px solid rgba(0,243,255,0.3); border-radius:14px; padding:16px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <span style="font-size:11px; color:#aaa; text-transform:uppercase; display:block; margin-bottom:6px; letter-spacing: 0.5px;">⚡ ACTIVOS</span>
          <span style="font-size:36px; font-weight:900; color:#00f3ff; line-height:1; text-shadow: 0 0 15px rgba(0,243,255,0.4);">${st.activeHabits}</span>
          <span style="font-size:11px; color:#888; display:block; margin-top:8px;">Rutinas fijas</span>
        </div>

      </div>
    `;
    container.appendChild(kpiHtml);

    // 3. Lista de Hábitos
    const arr = habits();
    if (!arr.length) {
      container.appendChild(el("div", { class: "empty", style: "border: 1px dashed var(--border-strong); border-radius: 16px; padding: 40px 20px;" }, [
        el("span", { class: "big", text: "🧘" }), 
        el("div", { text: "No tienes hábitos activos. ¡Inicia con una rutina simple!" })
      ]));
    } else {
      // Ordenar: primero los no cumplidos hoy
      const sorted = arr.slice().sort((a, b) => {
        const aDone = (a.history || []).includes(today()) ? 1 : 0;
        const bDone = (b.history || []).includes(today()) ? 1 : 0;
        return aDone - bDone;
      });
      sorted.forEach(h => container.appendChild(createHabitCard(h)));
    }
  }

  N.Habits = { render, stats };
})();
