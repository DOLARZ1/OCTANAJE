/* =====================================================================
   OCTANAJE · Notifications — Notification API + recordatorios de pendientes
   Con degradación elegante a toasts si no hay permiso/soporte.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI } = N;
  const DateUtil = Store.DateUtil;

  function supported() { return typeof window !== "undefined" && "Notification" in window; }
  function permission() { return supported() ? Notification.permission : "unsupported"; }
  function enabled() { return !!Store.get().settings.notifications; }

  // Pide permiso y activa las notificaciones
  function enable() {
    const fileProto = typeof location !== "undefined" && location.protocol === "file:";
    if (!supported()) {
      Store.get().settings.notifications = true; Store.commit(true);
      UI.toast({ icon: "🔔", title: "No disponible", msg: "Tu navegador no soporta notificaciones del sistema. Usaré avisos dentro de la app." });
      return Promise.resolve("in-app");
    }
    // ya bloqueadas antes: el navegador no volverá a preguntar
    if (Notification.permission === "denied") {
      Store.get().settings.notifications = true; Store.commit(true);
      UI.toast({ icon: "🔕", title: "Notificaciones bloqueadas", msg: "Reactívalas: toca el 🔒 junto a la dirección → Permisos → Notificaciones → Permitir, y recarga. (Solo en la versión web).", duration: 8000 });
      return Promise.resolve("denied");
    }
    if (fileProto) {
      UI.toast({ icon: "🌐", title: "Usa la versión web", msg: "Las notificaciones del sistema solo funcionan en https://dolarz1.github.io/OCTANAJE/, no abriendo el archivo local. Mientras, activo avisos dentro de la app.", duration: 8000 });
    }
    return Notification.requestPermission().then((perm) => {
      Store.get().settings.notifications = true; Store.commit(true);
      if (perm === "granted") {
        send("OCTANAJE activado 🔔", "Te avisaré de tus pendientes y sesiones de foco.");
        UI.toast({ icon: "🔔", title: "Notificaciones activadas", msg: "Recibirás recordatorios." });
      } else if (perm === "denied") {
        UI.toast({ icon: "🔕", title: "Permiso denegado", msg: "Puedes permitirlo desde el 🔒 junto a la dirección. Mientras, usaré avisos dentro de la app.", duration: 8000 });
      } else {
        UI.toast({ icon: "🔔", title: "Pendiente", msg: "Usaré avisos dentro de la app." });
      }
      return perm;
    }).catch(() => "error");
  }

  function disable() {
    Store.get().settings.notifications = false;
    Store.commit(true);
    UI.toast({ icon: "🔕", msg: "Notificaciones desactivadas" });
  }

  // Envía una notificación del sistema; si no se puede, cae a toast
  function send(title, body, opts) {
    opts = opts || {};
    if (enabled() && supported() && Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body: body || "",
          icon: opts.icon,
          tag: opts.tag || "octanaje",
          silent: false
        });
        if (opts.onClick) n.onclick = () => { window.focus(); opts.onClick(); n.close(); };
        setTimeout(() => { try { n.close(); } catch (e) {} }, opts.timeout || 8000);
        return true;
      } catch (e) { /* cae a toast */ }
    }
    // fallback visual
    UI.toast({ icon: opts.emoji || "🔔", title: title, msg: body || "" });
    return false;
  }

  // Revisa pendientes del día y avisa una vez al día
  function checkReminders(force) {
    if (!enabled()) return;
    const s = Store.get();
    const today = DateUtil.todayKey();
    if (!force && s.notifyMeta.lastReminder === today) return;

    const hp = N.Habits ? N.Habits.todayProgress() : { done: 0, total: 0 };
    const ts = N.Tasks ? N.Tasks.stats() : { pending: 0, overdue: 0 };
    const pendingHabits = hp.total - hp.done;
    const parts = [];
    if (pendingHabits > 0) parts.push(`${pendingHabits} hábito${pendingHabits === 1 ? "" : "s"} por completar`);
    if (ts.overdue > 0) parts.push(`${ts.overdue} tarea${ts.overdue === 1 ? "" : "s"} vencida${ts.overdue === 1 ? "" : "s"}`);
    else if (ts.pending > 0) parts.push(`${ts.pending} tarea${ts.pending === 1 ? "" : "s"} pendiente${ts.pending === 1 ? "" : "s"}`);

    if (!parts.length) return;
    s.notifyMeta.lastReminder = today;
    Store.commit(true);
    send("Tu día en OCTANAJE 📋", "Tienes " + parts.join(" y ") + ".", { tag: "octanaje-daily" });
  }

  let interval = null;

  // ---------------------------------------------------------------
  //  RECORDATORIOS PERSONALIZADOS — hora + días + sonido de alarma
  //  {id, title, message, time:"HH:MM", days:[0..6] o [] = todos, sound, enabled, lastFired}
  // ---------------------------------------------------------------
  function reminders() { return Store.get().reminders; }

  function addReminder(data) {
    reminders().push({
      id: Store.uid(),
      title: data.title || "Recordatorio",
      message: data.message || "",
      time: data.time || "08:00",
      days: Array.isArray(data.days) && data.days.length ? data.days : [],
      sound: data.sound !== false,
      enabled: true,
      lastFired: ""
    });
    Store.commit();
  }
  function updateReminder(r, data) {
    r.title = data.title || r.title;
    r.message = data.message != null ? data.message : r.message;
    r.time = data.time || r.time;
    r.days = Array.isArray(data.days) ? data.days : r.days;
    r.sound = data.sound !== false;
    Store.commit();
  }
  function removeReminder(r) {
    const arr = reminders();
    const i = arr.indexOf(r);
    if (i >= 0) arr.splice(i, 1);
    Store.commit();
  }
  function toggleReminder(r) {
    r.enabled = !r.enabled;
    Store.commit();
  }

  // etiqueta legible de los días de un recordatorio
  function reminderDaysLabel(r) {
    const days = r.days || [];
    if (!days.length) return "Todos los días";
    const set = new Set(days);
    const isAll = [0, 1, 2, 3, 4, 5, 6].every((d) => set.has(d));
    if (isAll) return "Todos los días";
    const isWeekdays = [1, 2, 3, 4, 5].every((d) => set.has(d)) && !set.has(0) && !set.has(6);
    if (isWeekdays) return "Lunes a viernes";
    const isWeekend = set.has(0) && set.has(6) && days.length === 2;
    if (isWeekend) return "Fin de semana";
    const names = ["D", "L", "M", "M", "J", "V", "S"];
    return Array.from(set).sort().map((d) => names[d]).join(", ");
  }

  // revisa cada minuto si algún recordatorio personalizado coincide con
  // la hora actual y el día de la semana; dispara notificación + alarma
  function checkCustomReminders() {
    if (!enabled()) return; // el interruptor general manda
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const todayKey = DateUtil.todayKey();
    const dow = now.getDay();
    reminders().forEach((r) => {
      if (!r.enabled) return;
      if (r.lastFired === todayKey + "_" + r.time) return; // ya disparado hoy a esa hora
      if (r.time !== hhmm) return;
      if (r.days && r.days.length && !r.days.includes(dow)) return;
      r.lastFired = todayKey + "_" + r.time;
      Store.commit(true);
      if (r.sound && N.Audio) N.Audio.preview("alarm");
      send("⏰ " + r.title, r.message || "Es hora de tu recordatorio.", { tag: "octanaje-reminder-" + r.id, emoji: "⏰" });
    });
  }

  function init() {
    // primer chequeo al abrir (poco después del arranque)
    setTimeout(() => checkReminders(), 4000);
    // y luego periódicamente
    if (interval) clearInterval(interval);
    interval = setInterval(() => checkReminders(), 30 * 60 * 1000); // cada 30 min

    // recordatorios personalizados: revisar cada minuto la hora exacta
    setTimeout(checkCustomReminders, 2000);
    setInterval(checkCustomReminders, 30 * 1000);
  }

  N.Notify = {
    supported, permission, enabled, enable, disable, send, checkReminders, init,
    reminders, addReminder, updateReminder, removeReminder, toggleReminder, reminderDaysLabel
  };
})();
