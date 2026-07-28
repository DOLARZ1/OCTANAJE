/* =====================================================================
   OCTANAJE · Notes — Gestión de notas rápidas con colores y recordatorios
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio } = N;
  const { el, toast } = UI;

  // Paleta de colores para las tarjetas de notas
  const NOTE_COLORS = [
    { id: "purple", label: "🟣 Morado", border: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
    { id: "blue", label: "🔵 Azul", border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    { id: "green", label: "🟢 Verde", border: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
    { id: "gold", label: "🟡 Dorado", border: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
    { id: "neon", label: "🔴 Rojo Neón", border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" }
  ];

  function getNotes() {
    const s = Store.get();
    if (!s.notes) s.notes = [];
    return s.notes;
  }

  // ---------- Formulario para Nueva / Editar Nota ----------
  function openNoteForm(existing) {
    const body = UI.form([
      { name: "title", label: "Título de la nota", value: existing ? existing.title : "", placeholder: "Ej. Idea de proyecto...", required: true },
      { name: "content", label: "Contenido", type: "textarea", value: existing ? existing.content : "", placeholder: "Escribe tus detalles aquí...", required: true },
      { 
        name: "color", 
        label: "Color de la nota", 
        type: "select", 
        value: existing ? existing.color : "purple",
        options: NOTE_COLORS.map(c => ({ value: c.id, label: c.label }))
      }
    ], (data) => {
      const list = getNotes();
      if (existing) {
        existing.title = data.title;
        existing.content = data.content;
        existing.color = data.color;
        existing.updatedAt = Date.now();
        toast({ icon: "✏️", msg: "Nota actualizada" });
      } else {
        list.push({
          id: "note_" + Date.now(),
          title: data.title,
          content: data.content,
          color: data.color || "purple",
          createdAt: Date.now()
        });
        Audio.play("add");
        toast({ icon: "📝", title: "Nota creada", msg: data.title });
      }
      Store.commit(true);
      render();
    }, existing ? "Guardar cambios" : "Crear nota");

    UI.openModal(existing ? "✏️ Editar Nota" : "📝 Nueva Nota", body);
  }

  // ---------- Recordatorio en Calendario ----------
  function openReminder(note) {
    if (!N.CalExport) {
      toast({ icon: "⚠️", msg: "Módulo de calendario no disponible" });
      return;
    }
    const body = UI.form([
      { name: "time", label: "Hora del recordatorio", type: "time", value: "09:00", required: true },
      { name: "days", label: "¿Qué días?", type: "weekdays", value: [0, 1, 2, 3, 4, 5, 6] }
    ], (data) => {
      const days = typeof data.days === "string" ? data.days.split(",").filter(x => x !== "").map(Number) : (data.days || []);
      N.CalExport.openTimed({
        title: "📌 " + note.title,
        details: note.content,
        time: data.time,
        days: days,
        dateKey: Store.DateUtil ? Store.DateUtil.todayKey() : ""
      });
    }, "Agregar a Calendario");

    UI.openModal("🗓️ Agendar Recordatorio", body);
  }

  // ---------- Renderizar Tarjeta de Nota ----------
  function renderCard(note) {
    const colorTheme = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];

    const cardStyle = `
      border-left: 4px solid ${colorTheme.border};
      background: var(--card-bg, ${colorTheme.bg});
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    return el("div", { style: cardStyle, class: "note-card" }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:flex-start;" }, [
        el("h3", { style: "margin:0; font-size:1.1rem; color:var(--fg); font-weight:700;", text: note.title }),
        el("div", { style: "display:flex; gap:6px;" }, [
          el("button", { class: "icon-btn", title: "Recordatorio", html: "🗓️", onclick: () => openReminder(note) }),
          el("button", { class: "icon-btn", title: "Editar", html: "✏️", onclick: () => openNoteForm(note) }),
          el("button", { class: "icon-btn", title: "Eliminar", html: "🗑️", onclick: () => {
            UI.confirmBox("Eliminar Nota", `¿Borrar "${note.title}"?`, () => {
              const list = getNotes();
              const idx = list.findIndex(n => n.id === note.id);
              if (idx !== -1) list.splice(idx, 1);
              Store.commit(true);
              Audio.play("delete");
              toast({ icon: "🗑️", msg: "Nota eliminada" });
              render();
            }, "Eliminar");
          }})
        ])
      ]),
      el("p", { 
        style: "margin:0; font-size:0.95rem; line-height:1.5; color:var(--fg-subtle, #e2e8f0); white-space:pre-wrap;", 
        text: note.content 
      })
    ]);
  }

  // ---------- Render Principal del Módulo ----------
  function render() {
    const container = document.getElementById("view-notes");
    if (!container) return;
    container.innerHTML = "";

    const list = getNotes();

    // Encabezado con Botón +
    const header = el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;" }, [
      el("div", {}, [
        el("h2", { style: "margin:0; font-size:1.4rem; font-family:'Orbitron', sans-serif;", text: "📝 Mis Notas" }),
        el("p", { style: "margin:4px 0 0 0; font-size:0.85rem; opacity:0.7;", text: "Apuntes rápidos, listas y recordatorios" })
      ]),
      el("button", { class: "btn primary", style: "border-radius:50%; width:44px; height:44px; font-size:1.4rem; padding:0; display:flex; align-items:center; justify-content:center;", html: "＋", onclick: () => openNoteForm() })
    ]);

    // Lista o Estado Vacío
    const content = list.length
      ? el("div", { class: "notes-grid" }, list.map(renderCard))
      : el("div", { class: "empty", style: "text-align:center; padding:40px 20px;" }, [
          el("span", { class: "big", style: "font-size:3rem;", text: "📝" }),
          el("div", { style: "margin-top:10px; opacity:0.7;", text: "No tienes notas creadas. Presiona '+' para agregar una." })
        ]);

    container.appendChild(header);
    container.appendChild(content);
  }

  N.Notes = { render, openNoteForm };
})();
