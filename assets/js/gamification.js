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
  //  colors: [brillo, base]. shield: forma de escudo (Diamante/Heroico/GM)
  //  hasWings: rayos eléctricos dorados a los costados (Heroico/Gran Maestro)
  // ---------------------------------------------------------------
  const MEDALS = [
    { id: "bronze", name: "Bronce", cls: "bronze", minStreak: 0, colors: ["#f0b076", "#5c3418"] },
    { id: "silver", name: "Plata", cls: "silver", minStreak: 5, colors: ["#f5f9ff", "#8b97ab"] },
    { id: "gold", name: "Oro", cls: "gold", minStreak: 15, colors: ["#ffe680", "#a8760a"] },
    { id: "titanium", name: "Titanio", cls: "titanium", minStreak: 30, colors: ["#eef4f8", "#4a5568"] },
    { id: "diamond", name: "Diamante", cls: "diamond", minStreak: 50, colors: ["#d5f6ff", "#1c6aa8"], shield: true },
    { id: "heroic", name: "Heroico", cls: "heroic", minStreak: 75, colors: ["#ff8a8a", "#7a0018"], shield: true, hasWings: true, wingScale: 1, blurStd: 2.6 },
    { id: "grandmaster", name: "Gran Maestro", cls: "grandmaster", minStreak: 100, colors: ["#fff6c8", "#a8760a"], shield: true, hasWings: true, wingScale: 1.55, blurStd: 3.6, hasCrown: true }
  ];

  // ---- contorno de escudo heráldico (Diamante / Heroico / Gran Maestro) ----
  function shieldPath(cx, cy, R) {
    const x0 = (cx - R).toFixed(1), x1 = (cx + R).toFixed(1);
    const yTop = (cy - R * 1.05).toFixed(1), ySh = (cy - R * 0.7).toFixed(1);
    const yWaist = (cy + R * 0.15).toFixed(1), yTip = (cy + R * 1.35).toFixed(1);
    const cxS = cx.toFixed(1);
    return "M" + x0 + "," + ySh +
      " Q" + (cx - R * 1.05).toFixed(1) + "," + yTop + " " + cxS + "," + yTop +
      " Q" + (cx + R * 1.05).toFixed(1) + "," + yTop + " " + x1 + "," + ySh +
      " C" + x1 + "," + yWaist + " " + (cx + R * 0.85).toFixed(1) + "," + (cy + R * 0.85).toFixed(1) + " " + cxS + "," + yTip +
      " C" + (cx - R * 0.85).toFixed(1) + "," + (cy + R * 0.85).toFixed(1) + " " + x0 + "," + yWaist + " " + x0 + "," + ySh + " Z";
  }

  // ---- un solo rayo eléctrico (lightning bolt), en abanico a lo largo del ángulo dado ----
  function boltPath(bx, by, angleDeg, len, halfW) {
    const rad = angleDeg * Math.PI / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);   // eje de longitud (hacia fuera)
    const px = -dy, py = dx;                        // eje perpendicular (ancho)
    // silueta local normalizada de un rayo: x=ancho[-1..1], y=longitud[0..1]
    const pts = [
      [0.30, 0.00], [0.85, 0.32], [0.20, 0.40], [0.65, 0.68],
      [-0.05, 1.00], [0.10, 0.58], [-0.50, 0.48], [0.10, 0.20], [-0.35, 0.06]
    ];
    const toWorld = (lx, ly) => {
      const wx = bx + px * lx * halfW + dx * ly * len;
      const wy = by + py * lx * halfW + dy * ly * len;
      return wx.toFixed(1) + "," + wy.toFixed(1);
    };
    let d = "M" + toWorld(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) d += " L" + toWorld(pts[i][0], pts[i][1]);
    return d + " Z";
  }
  // abanico de rayos dorados a un costado del escudo (mirror=true → lado izquierdo)
  // tres capas: dos borrosas (glow dorado intenso, más ancho) + una nítida encima con núcleo blanco.
  function boltWingSvg(cx, cy, mirror, gradId, blurId, scale) {
    scale = scale || 1;
    const angles = [-8, -30, -52, -74];
    const lens = [31 * scale, 35 * scale, 31 * scale, 23 * scale];
    const halfWs = [4.4 * scale, 4.8 * scale, 4.2 * scale, 3.3 * scale];
    let d = "";
    for (let i = 0; i < angles.length; i++) {
      const ang = mirror ? (180 - angles[i]) : angles[i];
      const bx = cx + (mirror ? -1 : 1) * (3 + i * 1.6 * scale);
      const by = cy - 3 + i * 0.8;
      d += boltPath(bx, by, ang, lens[i], halfWs[i]) + " ";
    }
    return '<path d="' + d + '" fill="#ffb300" filter="url(#' + blurId + ')" opacity=".95"/>' +
           '<path d="' + d + '" fill="#ffd23d" filter="url(#' + blurId + ')" opacity=".8"/>' +
           '<path d="' + d + '" fill="#fff6c8" filter="url(#' + blurId + ')" opacity=".5"/>' +
           '<path d="' + d + '" fill="url(#' + gradId + ')" stroke="#fffbe0" stroke-width=".8"/>';
  }

  // corona real (5 picos con perlas) para Gran Maestro, sobre el escudo
  function crownSvg(cx, topY, halfW, gradId) {
    const h = halfW * 1.05;
    const baseY = topY + h * 0.62;
    const pts = [
      [-halfW, baseY], [-halfW, topY + h * 0.18],
      [-halfW * 0.62, topY + h * 0.5], [-halfW * 0.34, topY],
      [0, topY + h * 0.38], [halfW * 0.34, topY],
      [halfW * 0.62, topY + h * 0.5], [halfW, topY + h * 0.18],
      [halfW, baseY]
    ];
    let d = "M" + (cx + pts[0][0]).toFixed(1) + "," + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) d += " L" + (cx + pts[i][0]).toFixed(1) + "," + pts[i][1].toFixed(1);
    d += " Z";
    const band = '<rect x="' + (cx - halfW).toFixed(1) + '" y="' + (baseY - h * 0.14).toFixed(1) + '" width="' + (halfW * 2).toFixed(1) + '" height="' + (h * 0.2).toFixed(1) + '" rx="' + (h * 0.06).toFixed(1) + '" fill="url(#' + gradId + ')" stroke="#fffbe0" stroke-width=".6"/>';
    const body = '<path d="' + d + '" fill="url(#' + gradId + ')" stroke="#fffbe0" stroke-width=".8"/>';
    const jewels = [-halfW * 0.34, 0, halfW * 0.34].map((jx) =>
      '<circle cx="' + (cx + jx).toFixed(1) + '" cy="' + (topY + h * 0.42).toFixed(1) + '" r="' + (h * 0.11).toFixed(1) + '" fill="#ff3b6e"/>'
    ).join("");
    const tips = [-halfW, -halfW * 0.34, 0, halfW * 0.34, halfW].map((jx, i) =>
      '<circle cx="' + (cx + jx).toFixed(1) + '" cy="' + (i % 2 === 0 ? baseY - h * 0.05 : topY).toFixed(1) + '" r="' + (h * 0.09).toFixed(1) + '" fill="#fffbe0"/>'
    ).join("");
    return body + band + jewels + tips;
  }

  // construye el SVG completo de la medalla: escudo/medallón + gema central + brillo (+ rayos si aplica)
  function medalBadgeSvg(medal) {
    const gid = "mg-" + medal.id;     // gradiente principal (metal/escudo)
    const bgid = "bg-" + medal.id;    // gradiente dorado de los rayos
    const hid = "hl-" + medal.id;     // brillo especular
    const rid = "rb-" + medal.id;     // listón inferior (solo medallón circular)
    const flid = "fl-" + medal.id;    // filtro de desenfoque (glow de los rayos)
    const light = medal.colors[0], deep = medal.colors[1];
    const isShield = !!medal.shield;
    const wings = !!medal.hasWings;
    const crown = !!medal.hasCrown;
    const wingScale = medal.wingScale || 1;
    const blurStd = medal.blurStd || 2.6;
    const topPad = (crown ? 22 : 0) + (wings ? 12 : 0);
    const vbW = wings ? Math.round(152 * Math.max(1, wingScale * 0.86)) : 56;
    const vbH = (isShield ? (wings ? 84 : 76) : 66) + topPad;
    const cx = wings ? vbW / 2 : 28, cy = (isShield ? 34 : 30) + topPad, R = 20;

    const defs = '<defs>' +
      '<radialGradient id="' + gid + '" cx="36%" cy="26%" r="80%">' +
        '<stop offset="0%" stop-color="' + light + '"/>' +
        '<stop offset="55%" stop-color="' + deep + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + bgid + '" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0%" stop-color="#ff9d00"/>' +
        '<stop offset="55%" stop-color="#ffe066"/>' +
        '<stop offset="100%" stop-color="#fffbe0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + hid + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity=".9"/>' +
        '<stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + rid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + light + '"/>' +
        '<stop offset="100%" stop-color="' + deep + '"/>' +
      '</linearGradient>' +
      '<filter id="' + flid + '" x="-120%" y="-120%" width="340%" height="340%">' +
        '<feGaussianBlur stdDeviation="' + blurStd + '"/>' +
      '</filter>' +
    '</defs>';

    let wingsMk = "";
    if (wings) { wingsMk = boltWingSvg(cx, cy, false, bgid, flid, wingScale) + boltWingSvg(cx, cy, true, bgid, flid, wingScale); }

    // listón/cinta inferior (solo medallón circular, look "medalla de pecho")
    let ribbon = "";
    if (!isShield) {
      ribbon = '<path d="M' + (cx - 8) + ',' + (cy + R - 4) + ' L' + (cx - 6) + ',' + (cy + R + 13) + ' L' + cx + ',' + (cy + R + 7) + ' L' + (cx + 6) + ',' + (cy + R + 13) + ' L' + (cx + 8) + ',' + (cy + R - 4) + ' Z" fill="url(#' + rid + ')" opacity=".92"/>';
    }

    let outerRing, body, innerRing;
    if (isShield) {
      outerRing = '<path d="' + shieldPath(cx, cy, R + 2.4) + '" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/>';
      body = '<path d="' + shieldPath(cx, cy, R) + '" fill="url(#' + gid + ')" stroke="rgba(0,0,0,.3)" stroke-width="1"/>';
      innerRing = '<path d="' + shieldPath(cx, cy, R - 4) + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>';
    } else {
      outerRing = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 2.4) + '" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.4"/>';
      body = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#' + gid + ')" stroke="rgba(0,0,0,.25)" stroke-width="1"/>';
      innerRing = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 4) + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>';
    }
    // gema/estrella central (la "esfera") — misma pieza en medallón o escudo
    const gemCy = isShield ? cy - R * 0.12 : cy;
    const star = starPath(cx, gemCy, R - 8, R - 15, 5);
    const gem = '<path d="' + star + '" fill="rgba(255,255,255,.95)"/>';
    // brillo especular ovalado
    const glossCy = isShield ? cy - R * 0.5 : cy - R * 0.4;
    const gloss = '<ellipse cx="' + (cx - R * 0.32) + '" cy="' + glossCy + '" rx="' + (R * 0.55) + '" ry="' + (R * 0.34) + '" fill="url(#' + hid + ')" transform="rotate(-28 ' + (cx - R * 0.32) + ' ' + glossCy + ')"/>';
    // destellos (sparkles) — más notorios junto a los rayos
    let sparkles = "";
    if (wings) {
      const spScale = 1 + (wingScale - 1) * 0.6;
      sparkles = sparkle(cx - (R + 10) * spScale, cy - (R + 6) * spScale, 3.8 * spScale) +
        sparkle(cx + (R + 10) * spScale, cy - (R + 6) * spScale, 3.8 * spScale) +
        sparkle(cx, cy - (R + 15) * spScale, 3 * spScale);
    }
    // corona real sobre el escudo (Gran Maestro)
    let crownMk = "";
    if (crown) { crownMk = crownSvg(cx, cy - R * 1.28, R * 0.62, gid); }

    return '<svg viewBox="0 0 ' + vbW + ' ' + vbH + '">' + defs + wingsMk + ribbon + outerRing + body + innerRing + gem + gloss + sparkles + crownMk + '</svg>';
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
