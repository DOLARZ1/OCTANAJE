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

  const ACHIEVEMENTS = [
    { id: "first_step", name: "Primer paso", icon: "👣", desc: "Registra tu primera acción", test: (s) => totalActions(s) >= 1 },
    { id: "streak_3", name: "En marcha", icon: "🔥", desc: "Racha de 3 días", test: (s) => Gami.globalStreak() >= 3 },
    { id: "streak_7", name: "Semana perfecta", icon: "🗓️", desc: "Racha de 7 días", test: (s) => Gami.globalStreak() >= 7 },
    { id: "streak_30", name: "Imparable", icon: "⚡", desc: "Racha de 30 días", test: (s) => Gami.globalStreak() >= 30 },
    { id: "level_5", name: "Nivel 5", icon: "⭐", desc: "Alcanza el nivel 5", test: (s) => s.profile.level >= 5 },
    { id: "level_10", name: "Nivel 10", icon: "🌟", desc: "Alcanza el nivel 10", test: (s) => s.profile.level >= 10 },
    { id: "habit_master", name: "Maestro del hábito", icon: "✦", desc: "5 hábitos activos", test: (s) => s.habits.length >= 5 },
    { id: "saver", name: "Ahorrador", icon: "💰", desc: "Balance mensual positivo", test: (s) => window.NEXUS.Finance && window.NEXUS.Finance.monthBalance() > 0 },
    { id: "task_crusher", name: "Productivo", icon: "✓", desc: "Completa 10 tareas", test: (s) => s.tasks.filter((t) => t.done).length >= 10 },
    { id: "athlete", name: "Atleta", icon: "🏆", desc: "Registra 10 entrenamientos", test: (s) => s.workouts.length >= 10 },
    { id: "achiever", name: "Cumplidor", icon: "◉", desc: "Completa una meta al 100%", test: (s) => s.goals.some((g) => g.current >= g.target && g.target > 0) }
  ];

  function totalActions(s) {
    return Object.keys(s.xpLog).length + s.tasks.length + s.workouts.length + s.finance.transactions.length;
  }

  const Gami = {
    xpForLevel,

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
