/* =====================================================================
   OCTANAJE · Audio & Haptic — Sonidos sintetizados y Vibración Háptica
   ===================================================================== */
(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let loud = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      loud = ctx.createGain();
      loud.gain.value = 0.6;
      loud.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function unlock() {
    ensure();
  }

  function tone(freq, start, dur, type, vol, bus) {
    if (!ensure()) return;
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
    if (!ensure()) return;
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

  // Reproductor seguro de efectos de sonido
  function play(type) {
    try {
      const N = window.NEXUS;
      if (N && N.Store) {
        const s = N.Store.get();
        if (s && s.settings && s.settings.sound === false) return;
      }
    } catch (e) {}

    switch (type) {
      case "tap": tone(600, 0, 0.04, "sine", 0.15); break;
      case "tab": sweep(400, 800, 0, 0.06, "sine", 0.2); break;
      case "add": sweep(300, 900, 0, 0.12, "triangle", 0.4); break;
      case "delete": sweep(600, 150, 0, 0.15, "sawtooth", 0.3); break;
      case "unlock": 
        tone(523.25, 0, 0.08, "sine", 0.3);
        tone(659.25, 0.08, 0.08, "sine", 0.3);
        tone(783.99, 0.16, 0.15, "sine", 0.4);
        break;
      case "alarm":
        sweep(800, 1200, 0, 0.2, "square", 0.5, "loud");
        sweep(1200, 800, 0.2, 0.2, "square", 0.5, "loud");
        break;
    }
  }

  // =====================================================================
  // 📳 MOTOR HÁPTICO SEGURO (VIBRACIÓN)
  // =====================================================================
  function vibrate(pattern) {
    try {
      const N = window.NEXUS;
      if (N && N.Store) {
        const s = N.Store.get();
        if (s && s.settings && s.settings.haptics === false) return;
      }
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  const Haptic = {
    tap: () => vibrate(40),
    success: () => vibrate([50, 40, 80]),
    unlock: () => vibrate([30, 40, 30, 40, 60]),
    delete: () => vibrate([60, 40, 60]),
    error: () => vibrate([80, 40, 80, 40, 80])
  };

  // Asignación ultra segura en el objeto global
  window.NEXUS = window.NEXUS || {};
  window.NEXUS.Audio = { unlock, play, tone, sweep };
  window.NEXUS.Haptic = Haptic;
})();
