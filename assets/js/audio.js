/* =====================================================================
   OCTANAJE · Audio — sonidos sintetizados con Web Audio API (sin archivos)
   ===================================================================== */
(function () {
  "use strict";
  const Store = window.NEXUS.Store;

  let ctx = null;
  let master = null;
  let loud = null; // bus separado y más alto para alarmas críticas (fin de temporizador, recordatorios)
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
      loud.gain.value = 0.6; // ~3x más fuerte que los sonidos normales de la interfaz
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
    achieve()  { tone(784, 0, 0.12, "sine", 0.4); tone(1047, 0.1, 0.14, "sine", 0.4); tone(1568, 0.22, 0.24, "sine", 0.35); },
    // alarma de recordatorio: patrón repetitivo tipo "beep-beep" para
    // distinguirse claramente de los demás sonidos de la interfaz
    alarm()    {
      for (let i = 0; i < 3; i++) {
        tone(880, i * 0.28, 0.14, "square", 0.5);
        tone(1108, i * 0.28 + 0.15, 0.12, "square", 0.42);
      }
    },
    // --- alarmas FUERTES (bus "loud", volumen alto) para eventos que no
    // se deben pasar por alto: fin de temporizador de Enfoque, recordatorios
    // críticos. Se pueden usar aunque tengas la pantalla apagada o el
    // celular guardado, siempre que el sistema no haya cerrado la app.
    alarmLoud() {
      for (let i = 0; i < 5; i++) {
        tone(1046, i * 0.32, 0.16, "square", 0.9, "loud");
        tone(1318, i * 0.32 + 0.16, 0.14, "square", 0.8, "loud");
      }
    },
    // sirena tipo campana de reloj (más grave y sostenida, buena para "se acabó el tiempo")
    bellLoud() {
      for (let i = 0; i < 4; i++) {
        tone(660, i * 0.55, 0.5, "sine", 0.85, "loud");
        tone(990, i * 0.55, 0.5, "sine", 0.5, "loud");
      }
    },
    // sirena ascendente/descendente estilo alarma de emergencia (la más notoria)
    sirenLoud() {
      for (let i = 0; i < 3; i++) {
        sweep(500, 1400, i * 0.7, 0.35, "sawtooth", 0.75, "loud");
        sweep(1400, 500, i * 0.7 + 0.35, 0.35, "sawtooth", 0.75, "loud");
      }
    },
    // despertador digital: pitidos cortos y rápidos, muy agudo
    digitalLoud() {
      for (let i = 0; i < 8; i++) tone(1200, i * 0.18, 0.09, "square", 0.85, "loud");
    },
    // despertador clásico de cuerda: timbre metálico alternando dos tonos rápido
    classicLoud() {
      for (let i = 0; i < 10; i++) tone(i % 2 === 0 ? 1500 : 1150, i * 0.11, 0.09, "square", 0.85, "loud");
    },
    // bocina/claxon grave y sostenido, de las más difíciles de ignorar
    hornLoud() {
      for (let i = 0; i < 2; i++) {
        tone(180, i * 0.85, 0.75, "sawtooth", 0.95, "loud");
        tone(185, i * 0.85, 0.75, "sawtooth", 0.5, "loud"); // ligero detune para textura de bocina
      }
    },
    // xilófono ascendente: más agradable al oído pero sigue sonando fuerte
    xyloLoud() {
      [784, 880, 988, 1175, 1319].forEach((f, i) => tone(f, i * 0.13, 0.35, "triangle", 0.8, "loud"));
    }
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
    unlock() { ensure(); },
    // reproduce un sonido aunque el interruptor general esté apagado
    // (para botones explícitos de "probar sonido")
    preview(name) {
      if (!ensure()) return;
      const fn = sounds[name];
      if (fn) { try { fn(); } catch (e) {} }
    }
  };

  window.NEXUS.Audio = Audio;
})();
