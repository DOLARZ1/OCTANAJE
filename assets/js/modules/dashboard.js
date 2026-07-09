/* =====================================================================
   NEXUS · Dashboard — resumen general con gráficas en tiempo real
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Charts, Gami } = N;
  const { el, fmt } = UI;
  const DateUtil = Store.DateUtil;

  function render(container) {
    const s = Store.get();
    container.innerHTML = "";

    const lp = Gami.levelProgress();
    const streak = Gami.globalStreak();
    const hp = N.Habits.todayProgress();
    const ts = N.Tasks.stats();
    const ws = N.Workouts.stats();
    const gs = N.Goals.stats();
    const bal = N.Finance.monthBalance();

    const hour = new Date().getHours();
    const greet = hour < 6 ? "Buenas noches" : hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "◎" }), greet]),
        el("p", { class: "view-desc", text: `Nivel ${lp.level} · ${Gami.rankName(lp.level)} · racha de ${streak} día${streak === 1 ? "" : "s"} 🔥` })
      ])
    ]));

    // KPIs principales
    container.appendChild(el("div", { class: "grid cols-4 mb-16" }, [
      kpi("Hábitos hoy", `${hp.done}/${hp.total}`, fmt.pct(hp.pct) + " completado", "accent"),
      kpi("Tareas", ts.pending + "", "pendientes", ts.overdue ? "bad" : "accent"),
      kpi("Balance mes", fmt.money(bal), bal >= 0 ? "ahorro" : "déficit", bal >= 0 ? "good" : "bad"),
      kpi("Metas", `${gs.completed}/${gs.total}`, "completadas", "good")
    ]));

    // Calendario de actividad del mes
    container.appendChild(buildCalendarCard(s));

    // Fila: XP semanal + progreso de nivel
    const row1 = el("div", { class: "grid cols-2 mb-16" });

    const xpCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "XP ganada · últimos 14 días"])])
    ]);
    const cvXp = el("canvas");
    xpCard.appendChild(el("div", { class: "chart-box" }, [cvXp]));
    row1.appendChild(xpCard);

    const lvlCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Progreso de nivel"])]),
      el("div", { class: "flex items-center gap-12" }, [
        (function () { const c = el("canvas"); setTimeout(() => Charts.ring(c, lp.pct, { size: 110, color: "--accent", thickness: 10 }), 30); return el("div", { class: "ring-wrap" }, [c, el("div", { class: "ring-val", text: "Lv " + lp.level })]); })(),
        el("div", {}, [
          el("div", { class: "kpi-val accent", text: fmt.num(s.profile.xp) + " XP" }),
          el("div", { class: "kpi-sub", text: `${fmt.num(lp.into)} / ${fmt.num(lp.span)} para nivel ${lp.level + 1}` }),
          el("div", { class: "chip warn mt-8", html: "🔥 Racha " + streak + " día" + (streak === 1 ? "" : "s") })
        ])
      ])
    ]);
    row1.appendChild(lvlCard);
    container.appendChild(row1);

    // Fila: actividad combinada + finanzas
    const row2 = el("div", { class: "grid cols-2 mb-16" });

    const actCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Actividad · hábitos y tareas (7 días)"])]),
    ]);
    const cvAct = el("canvas");
    actCard.appendChild(el("div", { class: "chart-box" }, [cvAct]));
    actCard.appendChild(el("div", { class: "flex gap-12 mt-8 fs-12" }, [
      el("span", { class: "chip accent", text: "● Hábitos" }), el("span", { class: "chip good", text: "● Tareas" })
    ]));
    row2.appendChild(actCard);

    const finCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Gasto por categoría (mes)"])]),
    ]);
    const cvFin = el("canvas");
    finCard.appendChild(el("div", { class: "chart-box" }, [cvFin]));
    row2.appendChild(finCard);
    container.appendChild(row2);

    // Logros
    const achCard = el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("div", { class: "card-title" }, [el("span", { class: "dot" }), "Logros"]),
        el("span", { class: "chip accent", text: s.achievements.length + "/" + Gami.allAchievements().length })
      ])
    ]);
    const achGrid = el("div", { class: "grid cols-4" });
    Gami.allAchievements().forEach((a) => {
      const un = s.achievements.includes(a.id);
      achGrid.appendChild(el("div", { class: "card", style: "padding:12px;text-align:center;opacity:" + (un ? "1" : ".38"), title: a.desc }, [
        el("div", { style: "font-size:26px;filter:" + (un ? "none" : "grayscale(1)"), text: a.icon }),
        el("div", { class: "fs-12 fw-700 mt-8", text: a.name }),
        el("div", { class: "fs-12 text-faint", text: un ? "Desbloqueado" : "Bloqueado" })
      ]));
    });
    achCard.appendChild(achGrid);
    container.appendChild(achCard);

    // dibujar gráficas
    setTimeout(() => {
      const days14 = DateUtil.lastNDays(14);
      Charts.line(cvXp, { labels: days14.map((d) => DateUtil.label(d)), values: days14.map((d) => s.xpLog[d] || 0) }, { height: 180, color: "--accent" });

      const h7 = N.Habits.weeklySeries();
      const t7 = N.Tasks.completed7();
      Charts.bars(cvAct, { labels: h7.labels, series: [{ values: h7.values, color: "--accent" }, { values: t7.values, color: "--good" }] }, { height: 180 });

      Charts.doughnut(cvFin, N.Finance.expenseByCategory(), { height: 190, centerLabel: fmt.money(N.Finance.monthExpense()), centerSub: "gasto mes" });
    }, 40);
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  // ---------- Calendario de actividad ----------
  function isActive(s, key) {
    return !!s.activity[key] || (s.xpLog[key] || 0) > 0;
  }

  function buildCalendarCard(s) {
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    const monthLabel = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startCol = (new Date(y, mo, 1).getDay() + 6) % 7; // lunes primero
    const todayKey = DateUtil.todayKey();

    // contar días activos del mes
    let activos = 0, transcurridos = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      if (key <= todayKey) { transcurridos++; if (isActive(s, key)) activos++; }
    }

    const grid = el("div", { class: "cal" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach((h) => grid.appendChild(el("div", { class: "cal-h", text: h })));
    for (let i = 0; i < startCol; i++) grid.appendChild(el("div", { class: "cal-day empty" }));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = DateUtil.key(new Date(y, mo, d));
      let cls = "cal-day";
      const label = DateUtil.parse(key).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
      let tip = label;
      if (key > todayKey) { cls += " future"; }
      else if (isActive(s, key)) { cls += " done"; tip += " · ✓ con actividad (+" + (s.xpLog[key] || 0) + " XP)"; }
      else { cls += " miss"; tip += " · sin actividad"; }
      if (key === todayKey) cls += " today";
      grid.appendChild(el("div", { class: cls, title: tip, text: String(d) }));
    }

    return el("div", { class: "card mb-16" }, [
      el("div", { class: "card-head", style: "flex-wrap:wrap;gap:8px" }, [
        el("div", { class: "card-title", style: "text-transform:capitalize" }, [el("span", { class: "dot" }), "Calendario · " + monthLabel]),
        el("div", { class: "flex gap-8 fs-12" }, [
          el("span", { class: "chip good", text: "● Activo" }),
          el("span", { class: "chip bad", text: "● Sin actividad" })
        ])
      ]),
      grid,
      el("div", { class: "fs-12 text-dim mt-8", text: `${activos} de ${transcurridos} días con actividad este mes` })
    ]);
  }

  N.Dashboard = { render };
})();
