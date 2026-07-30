/* =====================================================================
   OCTANAJE · CalExport — añadir eventos a Google Calendar o descargar .ics
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
  function pad2(n) { return String(n).padStart(2, "0"); }

  // Regla de repetición según los días elegidos (0=Dom..6=Sáb). Vacío o
  // los 7 días = se repite diario. Si son días específicos, semanal por día.
  const DOW_ICS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  function buildRecurRule(days) {
    if (!days || !days.length || days.length === 7) return "RRULE:FREQ=DAILY";
    const byday = days.slice().sort().map((d) => DOW_ICS[d]).join(",");
    return "RRULE:FREQ=WEEKLY;BYDAY=" + byday;
  }
  // "HH:MM" + minutos de duración -> [inicio "YYYYMMDDTHHMMSS", fin "…"] (hora local, sin Z)
  function timedRange(dateKey, time, durMin) {
    const parts = (time || "08:00").split(":");
    const hh = Number(parts[0]) || 0, mm = Number(parts[1]) || 0;
    const start = ymd(dateKey) + "T" + pad2(hh) + pad2(mm) + "00";
    let endMin = mm + (durMin || 15), endHH = hh;
    while (endMin >= 60) { endMin -= 60; endHH = (endHH + 1) % 24; }
    const end = ymd(dateKey) + "T" + pad2(endHH) + pad2(endMin) + "00";
    return [start, end];
  }

  // URL para crear el evento en Google Calendar (evento de día completo)
  function googleUrl(title, details, dateKey, recur) {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: title || "Recordatorio",
      dates: ymd(dateKey) + "/" + nextDay(dateKey),
      details: (details || "") + "\n\nCreado desde OCTANAJE"
    });
    if (recur) p.set("recur", recur); // p.ej. RRULE:FREQ=DAILY
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  function escICS(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

  // ---- URL de Google Calendar con hora exacta + repetición semanal/diaria ----
  function googleUrlTimed(title, details, dateKey, time, days) {
    const [start, end] = timedRange(dateKey, time, 15);
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: title || "Recordatorio",
      dates: start + "/" + end,
      details: (details || "") + "\n\nCreado desde OCTANAJE",
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City"
    });
    p.set("recur", buildRecurRule(days));
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  // ---- .ics con hora exacta + repetición (para Apple/Outlook/Samsung) ----
  function downloadIcsTimed(title, details, dateKey, time, days) {
    const [start, end] = timedRange(dateKey, time, 15);
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OCTANAJE//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Store.uid() + "@octanaje",
      "DTSTAMP:" + stampUTC(),
      "DTSTART:" + start,
      "DTEND:" + end,
      "SUMMARY:" + escICS(title),
      "DESCRIPTION:" + escICS((details || "") + " — OCTANAJE"),
      buildRecurRule(days),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escICS(title),
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ];
    const ics = lines.join("\r\n");
    try {
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: (title || "recordatorio").replace(/[^\w\-]+/g, "_").slice(0, 40) + ".ics" });
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
      toast({ icon: "📆", title: "Archivo .ics descargado", msg: "Ábrelo para añadirlo a tu calendario del sistema." });
    } catch (e) {
      toast({ icon: "⚠️", msg: "No se pudo generar el .ics" });
    }
  }

  // ---- Modal específico para "recordatorio de sistema" (hora + días, se
  // usa desde Ajustes; funciona con OCTANAJE cerrado porque lo maneja tu
  // calendario, no la app) ----
  function openTimed(item) {
    const title = item.title || "Recordatorio OCTANAJE";
    const details = item.details || "";
    const time = item.time || "08:00";
    const days = item.days || [];
    const dateKey = item.dateKey || DateUtil.todayKey();
    const daysLbl = (!days.length || days.length === 7) ? "Todos los días"
      : days.slice().sort().map((d) => ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d]).join(", ");

    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "📅" }),
        el("div", { class: "txt", html: "<b>" + title + "</b><br>⏰ " + time + " · " + daysLbl + "<br><span style='color:var(--txt-faint)'>Se repite y suena con la app cerrada: lo maneja tu calendario del sistema.</span>" })
      ]),
      el("button", {
        class: "btn primary block mb-16", html: "🗓️ Añadir a Google Calendar",
        onclick: () => {
          Audio.play("coin");
          window.open(googleUrlTimed(title, details, dateKey, time, days), "_blank", "noopener");
          UI.closeModal();
        }
      }),
      el("button", {
        class: "btn block", html: "📆 Descargar .ics (Apple, Outlook, Samsung…)",
        onclick: () => { Audio.play("tap"); downloadIcsTimed(title, details, dateKey, time, days); UI.closeModal(); }
      }),
      el("p", { class: "fs-12 text-faint mt-16", text: "Esto crea el evento en tu calendario real; la alarma sonará con el sistema operativo, incluso si cierras OCTANAJE." })
    ]);
    UI.openModal("Recordatorio en tu calendario", body);
  }

  // Genera y descarga un archivo .ics (Apple, Outlook, etc.) con alarma a las 9:00
  function downloadIcs(title, details, dateKey, recur) {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OCTANAJE//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Store.uid() + "@octanaje",
      "DTSTAMP:" + stampUTC(),
      "DTSTART;VALUE=DATE:" + ymd(dateKey),
      "DTEND;VALUE=DATE:" + nextDay(dateKey),
      "SUMMARY:" + escICS(title),
      "DESCRIPTION:" + escICS((details || "") + " — OCTANAJE")
    ];
    if (recur) lines.push(recur.replace(/^RRULE:/, "RRULE:")); // p.ej. "RRULE:FREQ=DAILY"
    lines.push(
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escICS(title),
      "TRIGGER:PT9H",   // recordatorio a las 09:00 del día
      "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    );
    const ics = lines.join("\r\n");
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

  // Modal con las dos opciones (item.recur opcional, p.ej. "RRULE:FREQ=DAILY")
  function open(item) {
    const title = item.title || "Recordatorio";
    const details = item.details || "";
    const dateKey = item.dateKey;
    const recur = item.recur || null;
    if (!dateKey) { toast({ icon: "⚠️", msg: "Este elemento no tiene fecha." }); return; }
    const dLabel = DateUtil.parse(dateKey).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const when = recur ? ("🔁 Cada día, desde el " + dLabel) : DateUtil.parse(dateKey).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const body = el("div", {}, [
      el("div", { class: "insight info", style: "margin-bottom:14px" }, [
        el("span", { class: "ico", text: "📅" }),
        el("div", { class: "txt", html: "<b>" + title + "</b><br>" + when + "<br><span style='color:var(--txt-faint)'>Recordatorio " + (recur ? "diario" : "de día completo") + " (alarma 09:00).</span>" })
      ]),
      el("button", {
        class: "btn primary block mb-16", html: "🗓️ Añadir a Google Calendar",
        onclick: () => {
          Audio.play("coin");
          window.open(googleUrl(title, details, dateKey, recur), "_blank", "noopener");
          UI.closeModal();
        }
      }),
      el("button", {
        class: "btn block", html: "📆 Descargar .ics (Apple, Outlook, Samsung…)",
        onclick: () => { Audio.play("tap"); downloadIcs(title, details, dateKey, recur); UI.closeModal(); }
      }),
      el("p", { class: "fs-12 text-faint mt-16", text: "Tu app de calendario se encargará de la alerta, incluso con OCTANAJE cerrado." })
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

  N.CalExport = { open, googleUrl, downloadIcs, formRow, openTimed, googleUrlTimed, downloadIcsTimed };
})();
