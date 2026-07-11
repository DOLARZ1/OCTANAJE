/* =====================================================================
   NEXUS · Gamification — XP, niveles, rachas y logros
   ===================================================================== */
(function () {
  "use strict";
  const Store = window.NEXUS.Store;
  const Audio = window.NEXUS.Audio;
  const UI = window.NEXUS.UI;
  const DateUtil = Store.DateUtil;

  // XP necesaria para alcanzar el nivel L (curva progresiva)
  function xpForLevel(L) { return Math.round(100 * Math.pow(L, 1.45)); }

  const RANKS = [
    { min: 1, name: "Iniciado" },
    { min: 4, name: "Aprendiz" },
    { min: 8, name: "Constante" },
    { min: 13, name: "Disciplinado" },
    { min: 20, name: "Élite" },
    { min: 30, name: "Maestro" },
    { min: 45, name: "Leyenda" }
  ];

  // tier → intensidad visual del logro (común, raro, épico, legendario)
  const ACHIEVEMENTS = [
    { id: "first_step", name: "Primer paso", icon: "👣", desc: "Registra tu primera acción", tier: "common", test: (s) => totalActions(s) >= 1 },
    { id: "streak_3", name: "En marcha", icon: "🔥", desc: "Racha de 3 días", tier: "common", test: (s) => Gami.globalStreak() >= 3 },
    { id: "streak_7", name: "Semana perfecta", icon: "🗓️", desc: "Racha de 7 días", tier: "rare", test: (s) => Gami.globalStreak() >= 7 },
    { id: "streak_30", name: "Imparable", icon: "⚡", desc: "Racha de 30 días", tier: "epic", test: (s) => Gami.globalStreak() >= 30 },
    { id: "streak_60", name: "Racha volcánica", icon: "🌋", desc: "Racha de 60 días", tier: "epic", test: (s) => Gami.globalStreak() >= 60 },
    { id: "streak_100", name: "Centenario", icon: "👑", desc: "Racha de 100 días", tier: "legendary", test: (s) => Gami.globalStreak() >= 100 },
    { id: "level_5", name: "Nivel 5", icon: "⭐", desc: "Alcanza el nivel 5", tier: "common", test: (s) => s.profile.level >= 5 },
    { id: "level_10", name: "Nivel 10", icon: "🌟", desc: "Alcanza el nivel 10", tier: "rare", test: (s) => s.profile.level >= 10 },
    { id: "level_20", name: "Nivel 20", icon: "💠", desc: "Alcanza el nivel 20", tier: "epic", test: (s) => s.profile.level >= 20 },
    { id: "level_30", name: "Nivel 30", icon: "🏵️", desc: "Alcanza el nivel 30", tier: "legendary", test: (s) => s.profile.level >= 30 },
    { id: "habit_master", name: "Maestro del hábito", icon: "✦", desc: "5 hábitos activos", tier: "rare", test: (s) => s.habits.length >= 5 },
    { id: "saver", name: "Ahorrador", icon: "💰", desc: "Balance mensual positivo", tier: "rare", test: (s) => window.NEXUS.Finance && window.NEXUS.Finance.monthBalance() > 0 },
    { id: "saver_5k", name: "Gran ahorrador", icon: "🏦", desc: "Acumula $5,000 en tu alcancía", tier: "epic", test: (s) => (s.finance.savings || []).reduce((a, e) => a + e.amount, 0) >= 5000 },
    { id: "task_crusher", name: "Productivo", icon: "✓", desc: "Completa 10 tareas", tier: "rare", test: (s) => s.tasks.filter((t) => t.done).length >= 10 },
    { id: "task_100", name: "Cien tareas", icon: "✅", desc: "Completa 100 tareas", tier: "epic", test: (s) => s.tasks.filter((t) => t.done).length >= 100 },
    { id: "athlete", name: "Atleta", icon: "🏆", desc: "Registra 10 entrenamientos", tier: "rare", test: (s) => s.workouts.length >= 10 },
    { id: "athlete_50", name: "Atleta de élite", icon: "🥇", desc: "Registra 50 entrenamientos", tier: "epic", test: (s) => s.workouts.length >= 50 },
    { id: "achiever", name: "Cumplidor", icon: "◉", desc: "Completa una meta al 100%", tier: "rare", test: (s) => s.goals.some((g) => g.current >= g.target && g.target > 0) },
    { id: "nutrition_30", name: "Nutrición constante", icon: "🍽️", desc: "Registra 30 alimentos", tier: "rare", test: (s) => ((s.nutrition && s.nutrition.log) || []).length >= 30 },
    { id: "diamond_rank", name: "Rango Diamante", icon: "💎", desc: "Alcanza el rango Diamante por racha", tier: "epic", test: (s) => Gami.medalForStreak(Gami.globalStreak()).cls === "diamond" },
    { id: "heroic_rank", name: "Rango Heroico", icon: "⚔️", desc: "Alcanza el rango Heroico por racha", tier: "legendary", test: (s) => Gami.medalForStreak(Gami.globalStreak()).cls === "heroic" },
    { id: "grandmaster_rank", name: "Gran Maestro", icon: "🎖️", desc: "Alcanza el rango máximo: Gran Maestro", tier: "legendary", test: (s) => Gami.medalForStreak(Gami.globalStreak()).id === "grandmaster" },
    { id: "all_rounder", name: "Multidisciplinario", icon: "🌐", desc: "Registra actividad en 6 módulos distintos el mismo día", tier: "legendary", test: (s) => {
      const k = DateUtil.todayKey();
      const habitsOk = s.habits.some((h) => h.history && h.history[k]);
      const finOk = s.finance.transactions.some((t) => t.date === k);
      const tasksOk = s.tasks.some((t) => t.doneAt === k);
      const workOk = s.workouts.some((w) => w.date === k);
      const focusOk = (s.focus.sessionsLog && s.focus.sessionsLog[k]) > 0;
      const nutOk = ((s.nutrition && s.nutrition.log) || []).some((n) => n.date === k);
      return [habitsOk, finOk, tasksOk, workOk, focusOk, nutOk].filter(Boolean).length >= 6;
    } }
  ];

  function totalActions(s) {
    return Object.keys(s.xpLog).length + s.tasks.length + s.workouts.length + s.finance.transactions.length;
  }

  // ---------------------------------------------------------------
  //  MEDALLAS POR RACHA — escalera estilo "battle pass" (Free Fire)
  //  Bronce → Plata → Oro → Titanio → Diamante → Heroico → Gran Maestro
  //  colors: [brillo, base]. hasWings: alas de águila (Heroico/Gran Maestro)
  // ---------------------------------------------------------------
  const MEDALS = [
    { id: "bronze", name: "Bronce", cls: "bronze", minStreak: 0, colors: ["#f0b076", "#5c3418"] },
    { id: "silver", name: "Plata", cls: "silver", minStreak: 5, colors: ["#ffffff", "#7c8798"] },
    { id: "gold", name: "Oro", cls: "gold", minStreak: 15, colors: ["#ffe680", "#a8760a"] },
    { id: "titanium", name: "Titanio", cls: "titanium", minStreak: 30, colors: ["#eef4f8", "#4a5568"] },
    { id: "diamond", name: "Diamante", cls: "diamond", minStreak: 50, colors: ["#d5f6ff", "#1c6aa8"] },
    { id: "heroic", name: "Heroico", cls: "heroic", minStreak: 75, colors: ["#ff8a8a", "#7a0018"], hasWings: true },
    { id: "grandmaster", name: "Gran Maestro", cls: "grandmaster", minStreak: 100, colors: ["#fff6c8", "#a8760a"], hasWings: true }
  ];

  // ---- generador de una pluma (feather) tipo ala de águila ----
  function featherPath(bx, by, angleDeg, len, halfW, curve) {
    const rad = angleDeg * Math.PI / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const px = -dy, py = dx;
    const tipX = bx + dx * len, tipY = by + dy * len;
    const b1x = bx + px * halfW, b1y = by + py * halfW;
    const b2x = bx - px * halfW, b2y = by - py * halfW;
    const mx = bx + dx * len * 0.55, my = by + dy * len * 0.55;
    const c1x = mx + px * halfW * curve, c1y = my + py * halfW * curve;
    const c2x = mx - px * halfW * curve, c2y = my - py * halfW * curve;
    return "M" + b1x.toFixed(1) + "," + b1y.toFixed(1) +
      " Q" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + tipX.toFixed(1) + "," + tipY.toFixed(1) +
      " Q" + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + b2x.toFixed(1) + "," + b2y.toFixed(1) + " Z";
  }
  // construye un ala completa (abanico de plumas) — mirror=true para el ala izquierda
  function wingSvg(cx, cy, mirror, fillId) {
    const angles = [4, -14, -32, -50, -66, -80];   // abanico de la más baja/larga a la más alta/corta
    const lens = [30, 33, 30, 25, 19, 13];
    const halfWs = [3.6, 3.9, 3.6, 3, 2.4, 1.8];
    let d = "";
    for (let i = 0; i < angles.length; i++) {
      const ang = mirror ? (180 - angles[i]) : angles[i];
      const bx = cx + (mirror ? -1 : 1) * (2 + i * 1.4);
      const by = cy - 1 + i * 0.6;
      d += featherPath(bx, by, ang, lens[i], halfWs[i], 0.55);
    }
    return '<path d="' + d + '" fill="url(#' + fillId + ')" stroke="rgba(255,255,255,.35)" stroke-width=".5" fill-rule="evenodd"/>';
  }

  // construye el SVG completo de la medalla: alas (si aplica) + medallón metálico con relieve, gema y brillo
  function medalBadgeSvg(medal) {
    const gid = "mg-" + medal.id;     // gradiente principal (metal)
    const wid = "wg-" + medal.id;     // gradiente de las alas
    const hid = "hl-" + medal.id;     // brillo especular
    const rid = "rb-" + medal.id;     // listón inferior
    const light = medal.colors[0], deep = medal.colors[1];
    const wings = !!medal.hasWings;
    const vbW = wings ? 148 : 56, vbH = 66;
    const cx = wings ? 74 : 28, cy = 30, R = 20;

    const defs = '<defs>' +
      '<radialGradient id="' + gid + '" cx="34%" cy="28%" r="78%">' +
        '<stop offset="0%" stop-color="' + light + '"/>' +
        '<stop offset="52%" stop-color="' + deep + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + wid + '" x1="0" y1="1" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="' + deep + '"/>' +
        '<stop offset="100%" stop-color="' + light + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + hid + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity=".9"/>' +
        '<stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + rid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + light + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</linearGradient>' +
    '</defs>';

    let wingsMk = "";
    if (wings) { wingsMk = wingSvg(cx, cy, false, wid) + wingSvg(cx, cy, true, wid); }

    // listón/cinta inferior (solo medallas sin alas, look "medalla de pecho")
    let ribbon = "";
    if (!wings) {
      ribbon = '<path d="M' + (cx - 8) + ',' + (cy + R - 4) + ' L' + (cx - 6) + ',' + (cy + R + 13) + ' L' + cx + ',' + (cy + R + 7) + ' L' + (cx + 6) + ',' + (cy + R + 13) + ' L' + (cx + 8) + ',' + (cy + R - 4) + ' Z" fill="url(#' + rid + ')" opacity=".92"/>';
    }

    // anillo biselado exterior + cuerpo del medallón
    const outerRing = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 2.4) + '" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.4"/>';
    const body = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#' + gid + ')" stroke="rgba(0,0,0,.25)" stroke-width="1"/>';
    const innerRing = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 4) + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>';
    // gema/estrella central
    const star = starPath(cx, cy, R - 8, R - 15, 5);
    const gem = '<path d="' + star + '" fill="rgba(255,255,255,.95)"/>';
    // brillo especular ovalado
    const gloss = '<ellipse cx="' + (cx - R * 0.32) + '" cy="' + (cy - R * 0.4) + '" rx="' + (R * 0.55) + '" ry="' + (R * 0.34) + '" fill="url(#' + hid + ')" transform="rotate(-28 ' + (cx - R * 0.32) + ' ' + (cy - R * 0.4) + ')"/>';
    // destellos (sparkles) — más notorios en alas
    let sparkles = "";
    if (wings) {
      sparkles = sparkle(cx - R - 6, cy - R - 2, 3.4) + sparkle(cx + R + 6, cy - R - 2, 3.4) + sparkle(cx, cy - R - 10, 2.6);
    }

    return '<svg viewBox="0 0 ' + vbW + ' ' + vbH + '">' + defs + wingsMk + ribbon + outerRing + body + innerRing + gem + gloss + sparkles + '</svg>';
  }
  function starPath(cx, cy, rOuter, rInner, points) {
    let d = "";
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
    return d + "Z";
  }
  function sparkle(x, y, s) {
    return '<path d="M' + x + ',' + (y - s * 2.2) + ' L' + (x + s * 0.5) + ',' + (y - s * 0.5) + ' L' + (x + s * 2.2) + ',' + y +
      ' L' + (x + s * 0.5) + ',' + (y + s * 0.5) + ' L' + x + ',' + (y + s * 2.2) + ' L' + (x - s * 0.5) + ',' + (y + s * 0.5) +
      ' L' + (x - s * 2.2) + ',' + y + ' L' + (x - s * 0.5) + ',' + (y - s * 0.5) + ' Z" fill="#fff" opacity=".9"/>';
  }

  function medalForStreak(streak) {
    let m = MEDALS[0];
    for (let i = 0; i < MEDALS.length; i++) { if (streak >= MEDALS[i].minStreak) m = MEDALS[i]; else break; }
    return m;
  }
  function nextMedal(streak) {
    for (let i = 0; i < MEDALS.length; i++) { if (streak < MEDALS[i].minStreak) return MEDALS[i]; }
    return null; // ya está en Gran Maestro
  }

  const Gami = {
    xpForLevel,
    allMedals() { return MEDALS; },
    medalForStreak,
    nextMedal,
    medalBadgeSvg,

    rankName(level) {
      let name = RANKS[0].name;
      RANKS.forEach((r) => { if (level >= r.min) name = r.name; });
      return name;
    },

    // progreso dentro del nivel actual
    levelProgress() {
      const s = Store.get();
      const L = s.profile.level;
      const prev = L <= 1 ? 0 : xpForLevel(L - 1);
      const next = xpForLevel(L);
      const into = s.profile.xp - prev;
      const span = next - prev;
      return { level: L, into: Math.max(0, into), span, next: next - prev, total: s.profile.xp, pct: Math.max(0, Math.min(100, (into / span) * 100)) };
    },

    // otorga XP + registra actividad + revisa nivel/logros
    award(amount, reason) {
      const s = Store.get();
      s.profile.xp += amount;
      const today = DateUtil.todayKey();
      s.xpLog[today] = (s.xpLog[today] || 0) + amount;
      Store.markActive();

      // subir de nivel (puede subir varios)
      let leveledTo = null;
      while (s.profile.xp >= xpForLevel(s.profile.level)) {
        s.profile.level++;
        leveledTo = s.profile.level;
      }
      Store.commit();

      if (leveledTo) {
        Audio.play("levelup");
        UI.toast({ level: true, icon: "🎉", title: "¡Nivel " + leveledTo + "!", msg: "Ahora eres " + this.rankName(leveledTo) + ". +" + amount + " XP" });
        this.burst();
      } else if (amount > 0) {
        UI.toast({ icon: "✦", title: "+" + amount + " XP", msg: reason || "¡Buen trabajo!" });
      }
      this.checkAchievements();
      return leveledTo;
    },

    // quitar XP (al deshacer acciones) sin bajar de nivel bruscamente
    remove(amount) {
      const s = Store.get();
      s.profile.xp = Math.max(0, s.profile.xp - amount);
      const today = DateUtil.todayKey();
      if (s.xpLog[today]) s.xpLog[today] = Math.max(0, s.xpLog[today] - amount);
      // recalcular nivel
      let L = 1;
      while (s.profile.xp >= xpForLevel(L)) L++;
      s.profile.level = L;
      Store.commit();
    },

    checkAchievements() {
      const s = Store.get();
      ACHIEVEMENTS.forEach((a) => {
        if (!s.achievements.includes(a.id)) {
          try {
            if (a.test(s)) {
              s.achievements.push(a.id);
              Store.commit(true);
              Audio.play("achieve");
              UI.toast({ icon: a.icon, title: "Logro: " + a.name, msg: a.desc });
            }
          } catch (e) {}
        }
      });
    },

    allAchievements() { return ACHIEVEMENTS; },

    // racha global de días con actividad
    globalStreak() {
      const s = Store.get();
      let streak = 0;
      let day = DateUtil.todayKey();
      // si hoy no hay actividad, empezamos desde ayer para no romper visualmente
      if (!s.activity[day]) day = DateUtil.addDays(day, -1);
      while (s.activity[day]) { streak++; day = DateUtil.addDays(day, -1); }
      return streak;
    },

    // efecto visual de partículas al subir de nivel
    burst() {
      const n = 26;
      const colors = ["#00e5ff", "#7c5cff", "#ff2fb0", "#21e6a4", "#ffb020"];
      for (let i = 0; i < n; i++) {
        const p = document.createElement("div");
        p.style.cssText = "position:fixed;left:50%;top:22%;width:9px;height:9px;border-radius:2px;z-index:300;pointer-events:none;";
        p.style.background = colors[i % colors.length];
        document.body.appendChild(p);
        const ang = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 180;
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist + 120;
        p.animate([
          { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 720}deg) scale(0)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => p.remove();
      }
    }
  };

  window.NEXUS.Gami = Gami;
})();
