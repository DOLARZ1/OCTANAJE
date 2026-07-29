/* =====================================================================
   OCTANAJE · Audio & Haptics — Sonidos sintetizados y Vibración
   ===================================================================== */
(function () {
  "use strict";
  const Store = window.NEXUS.Store;

  let ctx = null;
  let master = null;
  let loud = null; // bus separado y más alto para alarmas críticas
  let enabled = Store.get().settings.sound !== false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      loud = ctx.createGain();
      loud.gain.value = 0.6; // ~3x más fuerte que los sonidos normales
      loud.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // Genera un tono con envolvente. bus: "master" (normal) | "loud" (alarmas)
  function tone(freq, start, dur, type, vol, bus) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 1 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g); g.connect(bus === "loud" ? loud : master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function sweep(f1, f2, start, dur, type, vol, bus) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sawtooth";
    const t0 = ctx.currentTime + start;
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.8 : vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g); g.connect(bus === "loud" ? loud : master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // =====================================================================
  // 📳 MOTOR HÁPTICO (VIBRACIÓN)
  // =====================================================================
  function vibrate(pattern) {
    const s = Store.get().settings;
    // Verifica si la vibración está permitida en ajustes y si el dispositivo la soporta
    if (s.haptics !== false && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  const Haptic = {
    tap: () => vibrate(12),                      // Clic sutil en pestañas / botones
    success: () => vibrate([35, 40, 60]),        // Completar tarea o hábito
    unlock: () => vibrate([20, 30, 20, 30, 50]), // Desbloqueo por huella
    delete: () => vibrate([45, 30, 45]),         // Eliminar ítem o nota
    error: () => vibrate([60, 40, 60, 40, 60])   // Error de huella o PIN
  };

  // Exportar en el namespace global NEXUS
  window.NEXUS = window.NEXUS || {};
  window.NEXUS.Audio = window.NEXUS.Audio || {};
  window.NEXUS.Haptic = Haptic;
})();
