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
  //  Bronce → Plata → Oro → Platino → Diamante I-V → Heroico (+5★) → Gran Maestro
  // ---------------------------------------------------------------
  const MEDALS = [
    { id: "bronze", name: "Bronce", cls: "bronze", minStreak: 0, colors: ["#8a5a3c", "#c98a55"] },
    { id: "silver", name: "Plata", cls: "silver", minStreak: 3, colors: ["#9aa4b2", "#e6ecf5"] },
    { id: "gold", name: "Oro", cls: "gold", minStreak: 7, colors: ["#d9a521", "#ffe98a"] },
    { id: "platinum", name: "Platino", cls: "platinum", minStreak: 12, colors: ["#5fd3c4", "#c8fff2"] },
    { id: "diamond1", name: "Diamante I", cls: "diamond", minStreak: 18, colors: ["#3fa3ff", "#b6e2ff"] },
    { id: "diamond2", name: "Diamante II", cls: "diamond", minStreak: 24, colors: ["#3fa3ff", "#b6e2ff"] },
    { id: "diamond3", name: "Diamante III", cls: "diamond", minStreak: 30, colors: ["#3fa3ff", "#b6e2ff"] },
    { id: "diamond4", name: "Diamante IV", cls: "diamond", minStreak: 36, colors: ["#3fa3ff", "#b6e2ff"] },
    { id: "diamond5", name: "Diamante V", cls: "diamond", minStreak: 42, colors: ["#3fa3ff", "#b6e2ff"] },
    { id: "heroic", name: "Heroico", cls: "heroic", minStreak: 50, stars: 0, colors: ["#ff2fb0", "#ffe600"] },
    { id: "heroic1", name: "Heroico · 1★", cls: "heroic", minStreak: 58, stars: 1, colors: ["#ff2fb0", "#ffe600"] },
    { id: "heroic2", name: "Heroico · 2★", cls: "heroic", minStreak: 66, stars: 2, colors: ["#ff2fb0", "#ffe600"] },
    { id: "heroic3", name: "Heroico · 3★", cls: "heroic", minStreak: 74, stars: 3, colors: ["#ff2fb0", "#ffe600"] },
    { id: "heroic4", name: "Heroico · 4★", cls: "heroic", minStreak: 82, stars: 4, colors: ["#ff2fb0", "#ffe600"] },
    { id: "heroic5", name: "Heroico · 5★", cls: "heroic", minStreak: 90, stars: 5, colors: ["#ff2fb0", "#ffe600"] },
    { id: "grandmaster", name: "Gran Maestro", cls: "grandmaster", minStreak: 100, stars: 0, colors: ["#00e5ff", "#7c5cff", "#ff2fb0", "#ffe600"] }
  ];

  // construye el SVG de la medalla (escudo con gema) coloreado por rango
  function medalBadgeSvg(medal) {
    const gid = "mg-" + medal.id;
    const n = medal.colors.length;
    const stops = medal.colors.map((c, i) => '<stop offset="' + (n > 1 ? Math.round((i / (n - 1)) * 100) : 0) + '%" stop-color="' + c + '"/>').join("");
    let stars = "";
    if (medal.stars) {
      const w = 6, total = medal.stars * w;
      for (let i = 0; i < medal.stars; i++) {
        const x = 20 - total / 2 + i * w + w / 2;
        stars += '<circle cx="' + x + '" cy="41.5" r="1.6" fill="#fff5b8"/>';
      }
    }
    return '<svg viewBox="0 0 40 46" width="30" height="34"><defs><linearGradient id="' + gid + '" x1="2" y1="2" x2="38" y2="44">' + stops + '</linearGradient></defs>' +
      '<path d="M20 2 L36 9 V23.5 C36 33.5 29 40.5 20 44 C11 40.5 4 33.5 4 23.5 V9 Z" fill="url(#' + gid + ')" stroke="rgba(255,255,255,.55)" stroke-width="1.1"/>' +
      '<path d="M20 11 L26.5 15.5 L24.3 23 L15.7 23 L13.5 15.5 Z" fill="rgba(255,255,255,.9)"/>' +
      stars + '</svg>';
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
