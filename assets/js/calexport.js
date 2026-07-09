/* =====================================================================
   NEXUS · CalExport — añadir eventos a Google Calendar o descargar .ics
   Sin login ni configuración: crea el evento en el calendario del usuario
   y deja que Google/su app se encargue de los recordatorios/alertas.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { UI, Audio, Store } = N;
  const { el, toast } = UI;
  const DateUtil = Store.DateUtil;

  function ymd(key) { return key.replace(/-/g, ""); }               // "2026-07-09" -> "20260709"
  function nextDay(key) { return ymd(DateUtil.addDays(key, 1)); }   // fin exclusivo (evento de día completo)
  function stampUTC() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""); } // 20260709T101500Z

  // URL para crear el evento en Google Calendar (evento de día completo)
  function googleUrl(title, details, dateKey) {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: title || "Recordatorio",
      dates: ymd(dateKey) + "/" + nextDay(dateKey),
      details: (details || "") + "\n\nCreado desde NEXUS"
    });
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  function escICS(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

  // Genera y descarga un archivo .ics (Apple, Outlook, etc.) con alarma a las 9:00
  function downloadIcs(title, details, dateKey) {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEXUS//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Store.uid() + "@nexus",
      "DTSTAMP:" + stampUTC(),
      "DTSTART;VALUE=DATE:" + ymd(dateKey),
      "DTEND;VALUE=DATE:" + nextDay(dateKey),
      "SUMMARY:" + escICS(title),
      "DESCRIPTION:" + escICS((details || "") + " — NEXUS"),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escICS(title),
      "TRIGGER:PT9H",   // recordatorio a las 09:00 del día
      "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    try {
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: (title || "evento").replace(/[^\w\-]+/g, "_").slice(0, 40) + ".ics" });
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      toast({ icon: "📆", title: "Archivo .ics descargado", msg: "Ábrelo para añadirlo a tu calendario." });
    } catch (e) {
      toast({ icon: "⚠️", msg: "No se pudo generar el .ics" });
    }
  }

  // Modal con las dos opciones
  function open(item) {
    const title = item.title || "Recordatorio";
    const details = item.details || "";
    const dateKey = item.dateKey;
    if (!dateKey) { toast({ icon: "⚠️", msg: "Este elemento no tiene fecha." }); return; }
    const when = DateUtil.parse(dateKey).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "📅" }),
        el("div", { class: "txt", html: "<b>" + title + "</b><br>" + when + "<br><span style='color:var(--txt-faint)'>Se creará un recordatorio de día completo (alarma 09:00).</span>" })
      ]),
      el("button", {
        class: "btn primary block mb-16", html: "🗓️ Añadir a Google Calendar",
        onclick: () => {
          Audio.play("coin");
          window.open(googleUrl(title, details, dateKey), "_blank", "noopener");
          UI.closeModal();
        }
      }),
      el("button", {
        class: "btn block", html: "📆 Descargar .ics (Apple, Outlook, Samsung…)",
        onclick: () => { Audio.play("tap"); downloadIcs(title, details, dateKey); UI.closeModal(); }
      }),
      el("p", { class: "fs-12 text-faint mt-16", text: "Tu app de calendario se encargará de la alerta, incluso con NEXUS cerrado." })
    ]);
    UI.openModal("Añadir recordatorio", body);
  }

  // Fila para insertar dentro de un formulario: lee el título y la fecha en vivo
  function formRow(titleInput, dateInput, detailText) {
    const run = (fn) => {
      const t = (titleInput && titleInput.value || "").trim();
      const d = dateInput && dateInput.value;
      if (!d) { toast({ icon: "⚠️", msg: "Primero elige una fecha arriba." }); return; }
      fn(t || "Recordatorio", detailText || "", d);
    };
    return el("div", { style: "margin:2px 0 8px;padding:12px;border:1px dashed var(--border-strong);border-radius:12px" }, [
      el("div", { class: "fs-12 text-dim", style: "margin-bottom:8px", text: "📅 Añadir recordatorio a tu calendario (usa la fecha de arriba):" }),
      el("div", { class: "row" }, [
        el("button", { type: "button", class: "btn sm", html: "🗓️ Google", onclick: () => run((t, de, d) => { Audio.play("coin"); window.open(googleUrl(t, de, d), "_blank", "noopener"); }) }),
        el("button", { type: "button", class: "btn sm", html: "📆 .ics", onclick: () => run((t, de, d) => { Audio.play("tap"); downloadIcs(t, de, d); }) })
      ])
    ]);
  }

  N.CalExport = { open, googleUrl, downloadIcs, formRow };
})();
