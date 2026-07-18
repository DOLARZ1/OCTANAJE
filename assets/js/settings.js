/* =====================================================================
   OCTANAJE · Settings — exportar/importar datos y notificaciones
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio } = N;
  const { el, toast } = UI;

  // monedas disponibles (código + locale para formato correcto)
  const CURRENCIES = [
    { code: "MXN", locale: "es-MX", label: "🇲🇽 Peso mexicano (MXN)" },
    { code: "USD", locale: "en-US", label: "🇺🇸 Dólar estadounidense (USD)" }
  ];

  // ---------- tema ----------
  function themeRow() {
    const cur = Store.get().settings.theme || "dark";
    const seg = el("div", { class: "seg", style: "flex-wrap:wrap" });
    [["light", "☀️ Claro"], ["gray", "◐ Gris"], ["dark", "🌙 Oscuro"], ["purple", "🟣 Morado"], ["neon", "🔴 Dark"], ["blackgold", "🖤 Dark Black"]].forEach(([val, label]) => {
      const b = el("button", { text: label, onclick: () => { if (N.App) N.App.applyTheme(val); Audio.play("tap"); open(); } });
      if (val === cur) b.classList.add("on");
      seg.appendChild(b);
    });
    return el("div", { class: "set-row", style: "flex-direction:column;align-items:stretch;gap:10px" }, [
      el("div", {}, [
        el("div", { class: "set-title", text: "🎨 Tema" }),
        el("div", { class: "set-desc", text: "Elige entre claro, gris, oscuro, morado, dark (rojo neón) o Dark Black (negro total con blanco/gris — pensado para descansar la vista)." })
      ]),
      seg
    ]);
  }

  // ---------- sonido ----------
  function soundRow() {
    const on = Audio.isEnabled();
    const toggle = el("button", { class: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": on ? "true" : "false" }, [el("span", { class: "knob" })]);
    toggle.addEventListener("click", () => { Audio.toggle(); open(); });
    return el("div", { class: "set-row" }, [
      el("div", {}, [
        el("div", { class: "set-title", text: "🔊 Sonidos" }),
        el("div", { class: "set-desc", text: on ? "Activados" : "Silenciados" })
      ]),
      toggle
    ]);
  }

  function currencyRow() {
    const s = Store.get().settings;
    const sel = el("select", { class: "select", style: "max-width:230px" });
    CURRENCIES.forEach((c) => {
      const o = el("option", { value: c.code, text: c.label });
      if (c.code === (s.currency || "MXN")) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      const c = CURRENCIES.find((x) => x.code === sel.value) || CURRENCIES[0];
      s.currency = c.code; s.locale = c.locale;
      Store.commit(true);
      Audio.play("coin");
      toast({ icon: "💱", title: "Moneda actualizada", msg: "Ahora en " + c.code });
      if (N.App) { N.App.refreshTop(); N.App.renderCurrent(); }
    });
    return el("div", { class: "set-row" }, [
      el("div", {}, [
        el("div", { class: "set-title", text: "💱 Moneda" }),
        el("div", { class: "set-desc", text: "Cambia y alterna la moneda de tus finanzas." })
      ]),
      sel
    ]);
  }

  // ---------- exportar ----------
  function exportData() {
    try {
      const data = Store.serialize();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: "octanaje-backup-" + Store.DateUtil.todayKey() + ".json" });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      Audio.play("money");
      toast({ icon: "💾", title: "Datos exportados", msg: "Se descargó tu copia de seguridad." });
    } catch (e) {
      Audio.play("error");
      toast({ icon: "⚠️", title: "Error al exportar", msg: String(e.message || e) });
    }
  }

  // ---------- importar ----------
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        Store.import(obj);
        Audio.play("complete");
        toast({ icon: "📥", title: "Datos importados", msg: "Tu información se restauró correctamente." });
        UI.closeModal();
        if (N.App) { N.App.refreshTop(); N.App.renderCurrent(); }
      } catch (e) {
        Audio.play("error");
        toast({ icon: "⚠️", title: "Archivo no válido", msg: "No se pudo leer el respaldo." });
      }
    };
    reader.onerror = () => { Audio.play("error"); toast({ icon: "⚠️", msg: "No se pudo abrir el archivo" }); };
    reader.readAsText(file);
  }

  // ---------- notificaciones ----------
  function notifRow() {
    const Notify = N.Notify;
    const on = Notify && Notify.enabled();
    const perm = Notify ? Notify.permission() : "unsupported";
    const status = !Notify || perm === "unsupported" ? "No soportadas por el navegador"
      : on && perm === "granted" ? "Activadas ✓"
      : on ? "Activadas (avisos dentro de la app)"
      : "Desactivadas";

    const toggle = el("button", { class: "switch" + (on ? " on" : "") , role: "switch", "aria-checked": on ? "true" : "false" }, [el("span", { class: "knob" })]);
    toggle.addEventListener("click", () => {
      if (Notify && Notify.enabled()) { Notify.disable(); }
      else if (Notify) { Notify.enable().then(() => open()); return; }
      open(); // re-render del modal
    });

    const rows = [
      el("div", { class: "set-row" }, [
        el("div", {}, [
          el("div", { class: "set-title", text: "🔔 Notificaciones y recordatorios" }),
          el("div", { class: "set-desc", text: status })
        ]),
        toggle
      ])
    ];
    if (on) {
      rows.push(el("div", { class: "set-row", style: "padding-top:0" }, [
        el("div", {}, [
          el("div", { class: "set-title fs-12", text: "Sonidos, horario y días" }),
          el("div", { class: "set-desc", text: (Notify.reminders().length) + " recordatorio(s) configurado(s)" })
        ]),
        el("button", { class: "btn sm", html: "⏰ Configurar recordatorios", onclick: openReminders })
      ]));
    }
    rows.push(el("div", { class: "set-row", style: "padding-top:0" }, [
      el("div", {}, [
        el("div", { class: "set-title fs-12", text: "🗓️ Recordatorio en tu calendario" }),
        el("div", { class: "set-desc", text: "Alarma real del sistema (Google Calendar/.ics), funciona con la app cerrada." })
      ]),
      el("button", { class: "btn sm", html: "🗓️ Configurar horario", onclick: openSystemReminder })
    ]));
    return el("div", {}, rows);
  }

  // ---------- recordatorio de calendario del sistema (Google Calendar / .ics) ----------
  function openSystemReminder() {
    const body = UI.form([
      { name: "title", label: "Título", value: "Recordatorio OCTANAJE", placeholder: "Ej. Revisar hábitos", required: true },
      { name: "message", label: "Mensaje (opcional)", type: "textarea", placeholder: "Detalle del recordatorio…" },
      { name: "time", label: "Hora de inicio", type: "time", value: "08:00", required: true },
      { name: "days", label: "¿Qué días se repite?", type: "weekdays", value: [0, 1, 2, 3, 4, 5, 6] }
    ], (data) => {
      const days = typeof data.days === "string" ? data.days.split(",").filter((x) => x !== "").map(Number) : (data.days || []);
      N.CalExport.openTimed({
        title: data.title, details: data.message, time: data.time, days,
        dateKey: Store.DateUtil.todayKey()
      });
    }, "Continuar");
    UI.openModal("🗓️ Configurar recordatorio de calendario", body);
  }

  // ---------- panel de recordatorios personalizados ----------
  function reminderRow(r) {
    const Notify = N.Notify;
    const toggle = el("button", { class: "switch sm" + (r.enabled ? " on" : ""), role: "switch", "aria-checked": r.enabled ? "true" : "false" }, [el("span", { class: "knob" })]);
    toggle.addEventListener("click", () => { Notify.toggleReminder(r); Audio.play("tap"); openReminders(); });

    return el("div", { class: "item", style: "padding:10px 12px" }, [
      el("div", { class: "item-main" }, [
        el("div", { class: "item-title", text: "⏰ " + r.title }),
        el("div", { class: "item-meta" }, [
          el("span", { class: "chip accent", text: r.time }),
          el("span", { class: "chip", text: Notify.reminderDaysLabel(r) }),
          r.sound ? el("span", { class: "chip warn", text: "🔊 alarma" }) : el("span", { class: "chip", text: "🔇 silencioso" })
        ])
      ]),
      toggle,
      el("button", { class: "icon-btn", title: "Editar", onclick: () => openReminderForm(r) , html: "✏️" }),
      el("button", { class: "icon-btn", title: "Eliminar", onclick: () => {
        UI.confirmBox("Eliminar recordatorio", "¿Eliminar \"" + r.title + "\"?", () => {
          Notify.removeReminder(r); Audio.play("delete"); toast({ icon: "🗑️", msg: "Recordatorio eliminado" }); openReminders();
        }, "Eliminar");
      }, html: "🗑️" })
    ]);
  }

  function openReminders() {
    const Notify = N.Notify;
    const list = Notify.reminders();
    const body = el("div", {}, [
      el("button", { class: "btn primary block mb-16", html: "＋ Nuevo recordatorio", onclick: () => openReminderForm() }),
      list.length
        ? el("div", {}, list.map(reminderRow))
        : el("div", { class: "empty" }, [el("span", { class: "big", text: "⏰" }), el("div", { text: "Aún no tienes recordatorios personalizados." })]),
      el("p", { class: "fs-12 text-faint mt-16", text: "Los recordatorios suenan mientras OCTANAJE esté abierto (en primer o segundo plano). Para alarmas que funcionen con la app cerrada, usa \"Añadir a Google Calendar\" en Hábitos/Tareas/Metas." })
    ]);
    UI.openModal("⏰ Recordatorios", body);
  }

  function openReminderForm(existing) {
    const Notify = N.Notify;
    const testBtn = el("button", { type: "button", class: "btn sm", html: "🔊 Probar sonido de alarma", onclick: () => Audio.preview("alarm") });
    const body = UI.form([
      { name: "title", label: "Título", value: existing ? existing.title : "", placeholder: "Ej. Revisar hábitos", required: true },
      { name: "message", label: "Mensaje (opcional)", type: "textarea", value: existing ? existing.message : "", placeholder: "Detalle del recordatorio…" },
      { name: "time", label: "Hora", type: "time", value: existing ? existing.time : "08:00", required: true },
      { name: "days", label: "¿Qué días?", type: "weekdays", value: (existing && existing.days && existing.days.length) ? existing.days : [0, 1, 2, 3, 4, 5, 6] },
      { name: "sound", label: "Sonido de alarma", type: "select", value: existing ? (existing.sound !== false ? "1" : "0") : "1", options: [
        { value: "1", label: "🔊 Con alarma" }, { value: "0", label: "🔇 Silencioso (solo notificación)" }
      ]}
    ], (data) => {
      const payload = {
        title: data.title, message: data.message, time: data.time,
        days: typeof data.days === "string" ? data.days.split(",").filter((x) => x !== "").map(Number) : (data.days || []),
        sound: data.sound === "1"
      };
      if (existing) { Notify.updateReminder(existing, payload); toast({ icon: "✏️", msg: "Recordatorio actualizado" }); }
      else { Notify.addReminder(payload); Audio.play("add"); toast({ icon: "⏰", title: "Recordatorio creado", msg: payload.title }); }
      openReminders();
    }, existing ? "Guardar cambios" : "Crear recordatorio", () => testBtn);
    UI.openModal(existing ? "Editar recordatorio" : "Nuevo recordatorio", body);
  }

  // ---------- modal principal ----------
  function open() {
    const body = el("div", {}, [
      // Apariencia
      themeRow(),
      // Sonido
      soundRow(),
      // Moneda
      currencyRow(),
      // Notificaciones
      notifRow(),

      // Exportar / importar
      el("div", { class: "set-row" }, [
        el("div", {}, [
          el("div", { class: "set-title", text: "💾 Copia de seguridad" }),
          el("div", { class: "set-desc", text: "Descarga o restaura todos tus datos (JSON)." })
        ])
      ]),
      el("div", { class: "row" }, [
        el("button", { class: "btn primary", html: "⬇ Exportar", onclick: exportData }),
        (function () {
          const label = el("label", { class: "btn", style: "cursor:pointer;justify-content:center", html: "⬆ Importar" });
          const inp = el("input", { type: "file", accept: "application/json,.json", style: "display:none" });
          inp.addEventListener("change", () => { if (inp.files && inp.files[0]) importData(inp.files[0]); });
          label.appendChild(inp);
          return label;
        })()
      ]),

      // Zona de peligro
      el("div", { class: "set-row", style: "margin-top:14px;border-top:1px solid var(--border);padding-top:16px" }, [
        el("div", {}, [
          el("div", { class: "set-title", text: "⚠️ Reiniciar datos" }),
          el("div", { class: "set-desc", text: "Borra todo de forma permanente." })
        ]),
        el("button", { class: "btn danger", html: "Borrar todo", onclick: () => {
          UI.confirmBox("Reiniciar datos", "Se borrarán TODOS tus datos. Esta acción no se puede deshacer.", () => {
            Store.reset(); Audio.play("delete");
            toast({ icon: "♻️", msg: "Datos reiniciados" });
            UI.closeModal();
            if (N.App) { N.App.refreshTop(); N.App.renderCurrent(); }
          }, "Borrar todo");
        } })
      ])
    ]);
    UI.openModal("Ajustes", body);
  }

  N.Settings = { open, exportData, importData };
})();
