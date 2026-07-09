/* =====================================================================
   NEXUS · Audio — sonidos sintetizados con Web Audio API (sin archivos)
   ===================================================================== */
(function () {
  "use strict";
  const Store = window.NEXUS.Store;

  let ctx = null;
  let master = null;
  let enabled = Store.get().settings.sound !== false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // Genera un tono con envolvente
  function tone(freq, start, dur, type, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 1 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function sweep(f1, f2, start, dur, type, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sawtooth";
    const t0 = ctx.currentTime + start;
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.8 : vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // Biblioteca de sonidos
  const sounds = {
    tap()      { tone(520, 0, 0.08, "sine", 0.5); },
    tab()      { tone(680, 0, 0.09, "triangle", 0.5); tone(880, 0.04, 0.09, "triangle", 0.35); },
    toggleOn() { tone(660, 0, 0.09, "square", 0.35); tone(990, 0.06, 0.12, "square", 0.3); },
    complete() { tone(587, 0, 0.1, "sine", 0.5); tone(784, 0.08, 0.12, "sine", 0.5); tone(1175, 0.16, 0.18, "sine", 0.4); },
    add()      { tone(440, 0, 0.09, "triangle", 0.45); tone(660, 0.06, 0.12, "triangle", 0.4); },
    coin()     { tone(988, 0, 0.06, "square", 0.3); tone(1319, 0.05, 0.14, "square", 0.28); },
    money()    { tone(784, 0, 0.08, "sine", 0.4); tone(1047, 0.07, 0.12, "sine", 0.4); tone(1319, 0.14, 0.16, "sine", 0.35); },
    delete()   { sweep(400, 120, 0, 0.22, "sawtooth", 0.35); },
    error()    { tone(200, 0, 0.16, "square", 0.4); tone(160, 0.1, 0.18, "square", 0.35); },
    levelup()  {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => tone(f, i * 0.09, 0.28, "triangle", 0.42));
      sweep(300, 1400, 0.1, 0.6, "sine", 0.2);
    },
    achieve()  { tone(784, 0, 0.12, "sine", 0.4); tone(1047, 0.1, 0.14, "sine", 0.4); tone(1568, 0.22, 0.24, "sine", 0.35); }
  };

  const Audio = {
    play(name) {
      if (!enabled) return;
      if (!ensure()) return;
      const fn = sounds[name];
      if (fn) { try { fn(); } catch (e) {} }
    },
    isEnabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      Store.get().settings.sound = enabled;
      Store.commit(true);
      if (enabled) { ensure(); this.play("toggleOn"); }
      return enabled;
    },
    // desbloquea el contexto tras el primer gesto del usuario
    unlock() { ensure(); }
  };

  window.NEXUS.Audio = Audio;
})();
