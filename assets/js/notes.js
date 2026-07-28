/* =====================================================================
   OCTANAJE · Notes — Notas con colores, fuentes personalizadas y recordatorios
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio } = N;
  const { el, toast } = UI;

  // Paleta de colores para las tarjetas
  const NOTE_COLORS = [
    { id: "purple", label: "🟣 Morado Neón", border: "#a855f7", bg: "rgba(168, 85, 247, 0.12)" },
    { id: "blue", label: "🔵 Azul Neón", border: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
    { id: "green", label: "🟢 Verde Neón", border: "#22c55e", bg: "rgba(34, 197, 94, 0.12)" },
    { id: "gold", label: "🟡 Dorado", border: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
    { id: "neon", label: "🔴 Rojo Neón", border: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" }
  ];

  // Fuentes disponibles para el texto de la nota
  const NOTE_FONTS = [
    { id: "orbitron", label: "🚀 Futurista (Orbitron)", family: "'Orbitron', sans-serif" },
    { id: "bruno", label: "⚡ Avatar / Tech (Bruno Ace)", family: "'Bruno Ace', cursive" },
    { id: "cursive", label: "✍️ Caligrafía / Cursiva", family: "'Dancing Script', 'Brush Script MT', cursive" },
    { id: "default", label: "📄 Estándar (Por defecto)", family: "var(--font-sans, system-ui, sans-serif)" }
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
        label: "Color de la tarjeta", 
        type: "select", 
        value: existing ? existing.color : "purple",
        options: NOTE_COLORS.map(c => ({ value: c.id, label: c.label }))
      },
      { 
        name: "font", 
        label: "Estilo de letra (Tipografía)", 
        type: "select", 
        value: existing ? (existing.font || "default") : "default",
        options: NOTE_FONTS.map(f => ({ value: f.id, label: f.label }))
      }
    ], (data) => {
      const list = getNotes();
      if (existing) {
        existing.title = data.title;
        existing.content = data.content;
        existing.color = data.color;
        existing.font = data.font;
        existing.updatedAt = Date.now();
        toast({ icon: "✏️", msg: "Nota actualizada" });
      } else {
        list.push({
          id: "note_" + Date.now(),
          title: data.title,
          content: data.content,
          color: data.color || "purple",
          font: data.font || "default",
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
    const fontTheme = NOTE_FONTS.find(f => f.id === note.font) || NOTE_FONTS[3];

    const cardStyle = `
      border-left: 4px solid ${colorTheme.border};
      background: ${colorTheme.bg};
      padding: 18px;
      border-radius: 12px;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: ${fontTheme.family};
    `;

    return el("div", { style: cardStyle, class: "note-card" }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:flex-start; gap:8px;" }, [
        el("h3", { 
          style: `margin:0; font-size:1.15rem; color:var(--fg, #ffffff); font-weight:700; font-family:${fontTheme.family};`, 
          text: note.title 
        }),
        el("div", { style: "display:flex; gap:6px; flex-shrink:0;" }, [
          el("button", { class: "icon-btn", title: "Recordatorio en calendario", html: "🗓️", onclick: () => openReminder(note) }),
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
        style: `margin:0; font-size:1.05rem; line-height:1.6; color:var(--fg-subtle, #e2e8f0); white-space:pre-wrap; font-family:${fontTheme.family};`, 
        text: note.content 
      })
    ]);
  }

  // ---------- Render Principal ----------
  function render() {
    const container = document.getElementById("view-notes");
    if (!container) return;
    container.innerHTML = "";

    const list = getNotes();

    const header = el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;" }, [
      el("div", {}, [
        el("h2", { style: "margin:0; font-size:1.4rem; font-family:'Orbitron', sans-serif;", text: "📝 Mis Notas" }),
        el("p", { style: "margin:4px 0 0 0; font-size:0.85rem; opacity:0.75;", text: "Apuntes rápidos con estilo y recordatorios" })
      ]),
      el("button", { class: "btn primary", style: "border-radius:50%; width:44px; height:44px; font-size:1.4rem; padding:0; display:flex; align-items:center; justify-content:center;", html: "＋", onclick: () => openNoteForm() })
    ]);

    const content = list.length
      ? el("div", { class: "notes-grid" }, list.map(renderCard))
      : el("div", { class: "empty", style: "text-align:center; padding:40px 20px;" }, [
          el("span", { class: "big", style: "font-size:3rem;", text: "📝" }),
          el("div", { style: "margin-top:10px; opacity:0.75;", text: "No tienes notas creadas. Presiona '+' para agregar tu primera nota." })
        ]);

    container.appendChild(header);
    container.appendChild(content);
  }

  N.Notes = { render, openNoteForm };
})();
