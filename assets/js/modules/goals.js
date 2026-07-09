/* =====================================================================
   NEXUS · Módulo Metas
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS;
  const { Store, UI, Audio, Gami, Charts } = N;
  const { el, fmt, toast } = UI;
  const DateUtil = Store.DateUtil;

  function goals() { return Store.get().goals; }

  function pct(g) { return g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0; }

  function addOrEdit(existing) {
    const body = UI.form([
      { name: "title", label: "Meta", value: existing ? existing.title : "", placeholder: "Leer 12 libros", required: true },
      { type: "row", fields: [
        { name: "current", label: "Progreso actual", type: "number", min: 0, value: existing ? existing.current : 0 },
        { name: "target", label: "Objetivo", type: "number", min: 0, value: existing ? existing.target : "", placeholder: "12", required: true }
      ]},
      { type: "row", fields: [
        { name: "unit", label: "Unidad", value: existing ? existing.unit || "" : "", placeholder: "libros" },
        { name: "deadline", label: "Fecha límite", type: "date", value: existing ? existing.deadline || "" : "" }
      ]},
      { name: "milestones", label: "Hitos (uno por línea)", type: "textarea", value: existing ? existing.milestones.map((m) => m.t).join("\n") : "", placeholder: "Elegir libros\nLeer 3\nLeer 6" }
    ], (data) => {
      const ms = (data.milestones || "").split("\n").map((s) => s.trim()).filter(Boolean).map((t) => ({ t, done: false }));
      if (existing) {
        existing.title = data.title; existing.current = Number(data.current) || 0; existing.target = Number(data.target) || 0;
        existing.unit = data.unit; existing.deadline = data.deadline;
        existing.milestones = ms.map((nm) => existing.milestones.find((om) => om.t === nm.t) || nm);
        toast({ icon: "✏️", msg: "Meta actualizada" });
      } else {
        goals().push({ id: Store.uid(), title: data.title, current: Number(data.current) || 0, target: Number(data.target) || 0, unit: data.unit, deadline: data.deadline, milestones: ms, created: DateUtil.todayKey() });
        Audio.play("add");
        toast({ icon: "◉", title: "Nueva meta", msg: data.title });
        Gami.award(6, "Meta creada");
      }
      Store.commit();
      UI.closeModal();
      render(document.getElementById("view-goals"));
      N.App && N.App.refreshTop();
    }, existing ? "Guardar" : "Crear meta");
    UI.openModal(existing ? "Editar meta" : "Nueva meta", body);
  }

  function adjust(g, delta) {
    const before = pct(g);
    g.current = Math.max(0, g.current + delta);
    if (g.target && g.current > g.target) g.current = g.target;
    const after = pct(g);
    if (delta > 0) {
      Audio.play("coin");
      Gami.award(4, "Avance en meta");
      if (after >= 100 && before < 100) {
        Audio.play("achieve");
        Gami.award(40, "🎉 ¡Meta completada!");
        Gami.burst();
        toast({ level: true, icon: "🏆", title: "¡Meta lograda!", msg: g.title });
      }
    } else {
      Store.commit();
    }
    render(document.getElementById("view-goals"));
    N.App && N.App.refreshTop();
  }

  function toggleMs(g, m) {
    m.done = !m.done;
    Audio.play(m.done ? "coin" : "tap");
    Store.commit();
    render(document.getElementById("view-goals"));
  }

  function remove(g) {
    UI.confirmBox("Eliminar meta", `¿Eliminar "${g.title}"?`, () => {
      const arr = goals(); arr.splice(arr.indexOf(g), 1);
      Store.commit(); Audio.play("delete");
      render(document.getElementById("view-goals"));
    }, "Eliminar");
  }

  // ---------- stats ----------
  function stats() {
    const arr = goals();
    const completed = arr.filter((g) => pct(g) >= 100).length;
    const avg = arr.length ? Math.round(arr.reduce((s, g) => s + pct(g), 0) / arr.length) : 0;
    return { total: arr.length, completed, active: arr.length - completed, avg };
  }

  function deadlineInfo(g) {
    if (!g.deadline) return null;
    const diff = DateUtil.diffDays(g.deadline, DateUtil.todayKey());
    if (diff < 0) return { text: "Plazo vencido", cls: "bad" };
    if (diff === 0) return { text: "Vence hoy", cls: "warn" };
    return { text: `${diff} día${diff === 1 ? "" : "s"} restantes`, cls: diff <= 7 ? "warn" : "" };
  }

  function render(container) {
    container.innerHTML = "";
    const st = stats();

    container.appendChild(el("div", { class: "view-head" }, [
      el("div", {}, [
        el("h1", { class: "view-title" }, [el("span", { class: "ico", text: "◉" }), "Metas"]),
        el("p", { class: "view-desc", text: "Define objetivos, sigue tu progreso y celebra cada logro." })
      ]),
      el("button", { class: "btn primary", onclick: () => addOrEdit(null), html: "＋ Nueva meta" })
    ]));

    container.appendChild(el("div", { class: "grid cols-3 mb-16" }, [
      kpi("Activas", st.active + "", "en progreso", "accent"),
      kpi("Completadas", st.completed + "", "logradas", "good"),
      kpi("Progreso medio", fmt.pct(st.avg), "global", st.avg >= 60 ? "good" : "warn")
    ]));

    const arr = goals();
    if (!arr.length) {
      container.appendChild(el("div", { class: "card" }, [el("div", { class: "empty" }, [el("span", { class: "big", text: "◉" }), el("div", { text: "Sin metas todavía. ¡Define la primera!" })])]));
      return;
    }

    const grid = el("div", { class: "grid cols-2" });
    arr.forEach((g) => grid.appendChild(goalCard(g)));
    container.appendChild(grid);
  }

  function goalCard(g) {
    const p = pct(g);
    const done = p >= 100;
    const dl = deadlineInfo(g);
    const msDone = g.milestones.filter((m) => m.done).length;

    const ring = el("canvas");
    const ringWrap = el("div", { class: "ring-wrap" }, [ring, el("div", { class: "ring-val", text: p + "%" })]);
    setTimeout(() => Charts.ring(ring, p, { size: 84, color: done ? "--good" : "--accent" }), 30);

    const card = el("div", { class: "card" }, [
      el("div", { class: "flex items-center gap-12" }, [
        ringWrap,
        el("div", { class: "item-main" }, [
          el("div", { class: "item-title", text: (done ? "🏆 " : "") + g.title }),
          el("div", { class: "item-meta" }, [
            el("span", { class: "chip accent", text: `${fmt.num(g.current)} / ${fmt.num(g.target)} ${g.unit || ""}`.trim() }),
            dl ? el("span", { class: "chip " + dl.cls, text: "⏳ " + dl.text }) : null
          ])
        ]),
        el("button", { class: "icon-btn", html: "✏️", title: "Editar", onclick: () => addOrEdit(g) }),
        el("button", { class: "icon-btn", html: "🗑️", title: "Eliminar", onclick: () => remove(g) })
      ]),
      el("div", { class: "flex gap-8 mt-16" }, [
        el("button", { class: "btn sm ghost", html: "－1", onclick: () => adjust(g, -1) }),
        el("button", { class: "btn sm primary", html: "＋1", onclick: () => adjust(g, 1) }),
        el("button", { class: "btn sm", html: "＋5", onclick: () => adjust(g, 5) })
      ])
    ]);

    if (g.milestones.length) {
      const wrap = el("div", { class: "mt-16" });
      wrap.appendChild(el("div", { class: "fs-12 text-dim", style: "margin-bottom:6px", text: `Hitos ${msDone}/${g.milestones.length}` }));
      g.milestones.forEach((m) => {
        wrap.appendChild(el("div", { class: "flex items-center gap-8", style: "cursor:pointer;padding:2px 0", onclick: () => toggleMs(g, m) }, [
          el("span", { style: "font-size:14px;color:" + (m.done ? "var(--good)" : "var(--txt-faint)"), text: m.done ? "☑" : "☐" }),
          el("span", { class: "fs-13", style: m.done ? "text-decoration:line-through;color:var(--txt-faint)" : "", text: m.t })
        ]));
      });
      card.appendChild(wrap);
    }
    return card;
  }

  function kpi(label, val, sub, cls) {
    return el("div", { class: "card" }, [el("div", { class: "kpi" }, [
      el("div", { class: "kpi-lbl", text: label }), el("div", { class: "kpi-val " + (cls || ""), text: val }), el("div", { class: "kpi-sub", text: sub })
    ])]);
  }

  N.Goals = { render, stats, pct };
})();
